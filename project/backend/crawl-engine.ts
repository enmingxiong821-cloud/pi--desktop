// 双模式抓取：搜索结果自动爬取 / 用户指定单页或同站深爬。
// 所有请求经安全守卫（公网地址校验、逐跳重定向复验），并遵循 robots 与主机限速。
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { allowedByRobots, CRAWL_UA, extractPageText, getToolSettings, searchWeb, throttleHost } from './tools.js';
import { fetchPublicUrl, normalizeTarget, resolveTargetHost, isForbiddenIp } from './security-guard.js';
import { resolveTool } from './external-tools.js';
import { t } from './i18n.js';

export type CrawlMode = 'search' | 'page' | 'site';
export type CrawlEngine = 'trafilatura' | 'builtin' | 'browser';

export interface CrawlOptions {
  mode: CrawlMode;
  query?: string;
  url?: string;
  maxPages?: number;
  maxDepth?: number;
  js?: boolean;
}

export interface CrawlPage {
  url: string;
  title: string;
  text: string;
  engine: CrawlEngine;
  depth: number;
  bytes: number;
  links: number;
}

export interface CrawlProgress {
  runId: string;
  phase: 'searching' | 'fetching' | 'done' | 'error' | 'canceled';
  visited: number;
  queued: number;
  currentUrl?: string;
  page?: CrawlPage;
  pages?: CrawlPage[];
  links?: string[];
  message?: string;
}

type Emit = (event: CrawlProgress) => void;

interface RunState {
  id: string;
  canceled: boolean;
  visited: Set<string>;
  pages: CrawlPage[];
  children: Set<ChildProcess>;
}

const runs = new Map<string, RunState>();
const MAX_PAGES = 20;
const MAX_DEPTH = 2;
const PAGE_CHARS = 120_000;
const PAGE_BYTES = 10 * 1024 * 1024;
const MAX_LINKS_PER_PAGE = 60;
const ASSET_RE = /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf|zip|gz|tar|7z|rar|exe|dmg|apk|iso)$/i;
const SIDE_EFFECT_RE = /\/(?:logout|log-out|signout|sign-out|delete|remove|unsubscribe|退订|注销)(?:[/?#]|$)/i;

function emitSafe(emit: Emit, event: CrawlProgress): void {
  try {
    emit(event);
  } catch {
    // 窗口已关闭时忽略进度推送
  }
}

function normalizeUrl(raw: string, base?: string): string | undefined {
  try {
    const url = new URL(raw, base);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractLinks(html: string, base: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const baseUrl = new URL(base);
  for (const match of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    const next = normalizeUrl(match[1], base);
    if (!next) continue;
    const parsed = new URL(next);
    if (parsed.origin !== baseUrl.origin) continue;
    if (ASSET_RE.test(parsed.pathname) || SIDE_EFFECT_RE.test(parsed.pathname)) continue;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    if (out.length >= MAX_LINKS_PER_PAGE) break;
  }
  return out;
}

function browserCandidates(): string[] {
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA ?? '';
    return [
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(local, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
  }
  return ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

function firstExisting(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function runBrowser(run: RunState, url: string): Promise<string | undefined> {
  const browser = firstExisting(browserCandidates());
  if (!browser) return Promise.resolve(undefined);
  const profile = mkdtempSync(path.join(os.tmpdir(), 'pi-crawl-browser-'));
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(browser, [
        '--headless=new',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio',
        '--virtual-time-budget=5000',
        `--user-data-dir=${profile}`,
        '--dump-dom',
        url,
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      rmSync(profile, { recursive: true, force: true });
      return resolve(undefined);
    }
    run.children.add(child);
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => {
      child.kill();
      resolve(undefined);
    }, 45_000);
    child.stdout?.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= PAGE_BYTES * 2) chunks.push(chunk);
    });
    child.on('error', () => {
      clearTimeout(timer);
      run.children.delete(child);
      rmSync(profile, { recursive: true, force: true });
      resolve(undefined);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      run.children.delete(child);
      rmSync(profile, { recursive: true, force: true });
      resolve(code === 0 && chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined);
    });
  });
}

function trafilaturaExtract(binary: string | undefined, html: string): Promise<{ title: string; text: string } | undefined> {
  if (!binary) return Promise.resolve(undefined);
  return spawnTrafilatura(binary, html).catch(() => undefined);
}

function spawnTrafilatura(binary: string, html: string): Promise<{ title: string; text: string } | undefined> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pi-crawl-traf-'));
  const inputDir = path.join(dir, 'in');
  const outputDir = path.join(dir, 'out');
  mkdirSync(inputDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(inputDir, 'page.html'), html, 'utf8');
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      // trafilatura 的 -i 把文件当 URL 列表；整页 HTML 走 --input-dir 批处理
      child = spawn(binary, ['--input-dir', inputDir, '-o', outputDir, '--json', '--with-metadata', '--no-comments'], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      rmSync(dir, { recursive: true, force: true });
      return resolve(undefined);
    }
    const timer = setTimeout(() => child.kill(), 30_000);
    child.on('error', () => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true });
      resolve(undefined);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        if (code !== 0) return resolve(undefined);
        const files = readdirSync(outputDir).filter((name) => name.endsWith('.json'));
        if (!files.length) return resolve(undefined);
        const raw = readFileSync(path.join(outputDir, files[0]), 'utf8').trim();
        const parsed = JSON.parse(raw) as { title?: string; text?: string };
        const text = String(parsed.text ?? '').trim();
        if (text.length < 40) return resolve(undefined);
        return resolve({ title: String(parsed.title ?? '').trim(), text });
      } catch {
        return resolve(undefined);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
}

async function fetchOne(
  run: RunState,
  rawUrl: string,
  depth: number,
  useJs: boolean,
  trafilaturaBinary: string | undefined,
): Promise<{ page?: CrawlPage; links: string[]; error?: string }> {
  const normalized = normalizeTarget(rawUrl, { allowLocal: false });
  if (!normalized.ok || !normalized.target) return { links: [], error: normalized.error };
  const url = normalized.target.url;

  // robots 由 tools.ts 的缓存逻辑处理，但先确认主机解析到公网地址，避免通过域名绕过保留段拦截。
  const resolved = await resolveTargetHost(normalized.target.host);
  if (!resolved.ok || !resolved.ips) return { links: [], error: resolved.error };
  if (resolved.ips.some((ip) => isForbiddenIp(ip, false))) {
    return { links: [], error: t('目标属于内网或保留地址，抓取已跳过') };
  }
  if (!(await allowedByRobots(new URL(url)))) {
    return { links: [], error: t('robots.txt 不允许抓取该路径') };
  }
  await throttleHost(normalized.target.host);

  let response = await fetchPublicUrl(url, { allowLocal: false, maxBytes: PAGE_BYTES, timeoutMs: 20_000, headers: { 'User-Agent': CRAWL_UA } });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    response = await fetchPublicUrl(url, { allowLocal: false, maxBytes: PAGE_BYTES, timeoutMs: 20_000, headers: { 'User-Agent': CRAWL_UA } });
  }
  if (!response.ok) return { links: [], error: response.error ?? `HTTP ${response.status ?? 0}` };
  if (response.status === 403) return { links: [], error: t('目标拒绝访问（403）') };
  if (response.status && response.status >= 400) return { links: [], error: `HTTP ${response.status}` };
  const contentType = String(response.headers?.['content-type'] ?? '');
  if (contentType && !/text\/|html|json|xml/i.test(contentType)) {
    return { links: [], error: t('该链接不是网页正文') };
  }
  const html = response.body ?? '';
  if (!html.trim()) return { links: [], error: t('页面为空') };

  let engine: CrawlEngine = 'builtin';
  let parsed = extractPageText(html);
  const trafilatura = await trafilaturaExtract(trafilaturaBinary, html);
  if (trafilatura && trafilatura.text.length >= 40) {
    engine = 'trafilatura';
    parsed = { title: trafilatura.title || parsed.title, text: trafilatura.text };
  }

  if (run.canceled) return { links: [] };
  if (useJs && parsed.text.trim().length < 400) {
    const dom = await runBrowser(run, url);
    if (dom) {
      const fromBrowser = extractPageText(dom);
      if (fromBrowser.text.trim().length > parsed.text.trim().length) {
        engine = 'browser';
        parsed = fromBrowser;
      }
    }
  }

  const links = extractLinks(html, url);
  const page: CrawlPage = {
    url,
    title: parsed.title || normalized.target.host,
    text: parsed.text.slice(0, PAGE_CHARS),
    engine,
    depth,
    bytes: Buffer.byteLength(html, 'utf8'),
    links: links.length,
  };
  return { page, links };
}

async function execute(run: RunState, options: CrawlOptions, emit: Emit): Promise<void> {
  const maxPages = Math.min(MAX_PAGES, Math.max(1, Number(options.maxPages) || 6));
  const maxDepth = Math.min(MAX_DEPTH, Math.max(0, Number(options.maxDepth) || 0));
  const seeds: Array<{ url: string; depth: number }> = [];
  const seen = run.visited;

  try {
    if (options.mode === 'search') {
      emitSafe(emit, { runId: run.id, phase: 'searching', visited: 0, queued: 0, message: t('正在检索种子页面') });
      const query = String(options.query ?? '').trim().slice(0, 300);
      if (!query) throw new Error(t('填写搜索内容'));
      const result = await searchWeb(query, 5);
      if (!result.ok) throw new Error(result.error || t('没有找到相关结果'));
      for (const item of result.results) {
        const url = normalizeUrl(item.url);
        if (url) seeds.push({ url, depth: 0 });
      }
    } else {
      const input = String(options.url ?? '').trim();
      const seeded = normalizeUrl(input);
      if (!seeded) throw new Error(t('Base URL 不是合法地址'));
      seeds.push({ url: seeded, depth: 0 });
    }
    if (!seeds.length) throw new Error(t('没有可抓取的链接'));

    const queue = [...seeds];
    const links = new Set<string>();
    const useJs = Boolean(options.js);
    const trafilaturaBinary = await resolveTool('trafilatura');

    // 每批最多 2 个并发；同主机由 throttleHost 串行限速。
    const workers = Array.from({ length: 2 }, async () => {
      while (!run.canceled) {
        const item = queue.shift();
        if (!item) return;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        emitSafe(emit, {
          runId: run.id,
          phase: 'fetching',
          visited: run.pages.length,
          queued: queue.length,
          currentUrl: item.url,
        });
        const result = await fetchOne(run, item.url, item.depth, useJs, trafilaturaBinary);
        if (run.canceled) return;
        if (result.error) {
          emitSafe(emit, {
            runId: run.id,
            phase: 'fetching',
            visited: run.pages.length,
            queued: queue.length,
            currentUrl: item.url,
            message: `${item.url}：${result.error}`,
          });
          continue;
        }
        if (!result.page) continue;
        if (run.pages.length >= maxPages) break;
        run.pages.push(result.page);
        for (const link of result.links) links.add(link);
        emitSafe(emit, {
          runId: run.id,
          phase: 'fetching',
          visited: run.pages.length,
          queued: queue.length,
          currentUrl: item.url,
          page: result.page,
        });
        if (options.mode !== 'page' && item.depth < maxDepth) {
          for (const link of result.links) {
            if (seen.has(link) || queue.some((entry) => entry.url === link)) continue;
            queue.push({ url: link, depth: item.depth + 1 });
            if (seen.size + queue.length >= maxPages) break;
          }
        }
        if (run.pages.length >= maxPages) {
          run.canceled = true;
          break;
        }
      }
    });
    await Promise.all(workers);

    if (run.canceled && run.pages.length < maxPages) {
      emitSafe(emit, {
        runId: run.id,
        phase: 'canceled',
        visited: run.pages.length,
        queued: 0,
        pages: run.pages,
        links: [...links],
        message: t('抓取已停止'),
      });
      return;
    }
    emitSafe(emit, {
      runId: run.id,
      phase: 'done',
      visited: run.pages.length,
      queued: 0,
      pages: run.pages,
      links: [...links],
      message: t('抓取完成'),
    });
  } catch (error) {
    emitSafe(emit, {
      runId: run.id,
      phase: 'error',
      visited: run.pages.length,
      queued: 0,
      pages: run.pages,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    for (const child of run.children) {
      try {
        child.kill();
      } catch {
        // 已退出
      }
    }
    run.children.clear();
    runs.delete(run.id);
  }
}

export function startCrawl(options: CrawlOptions, emit: Emit): { ok: boolean; runId?: string; error?: string } {
  if (!getToolSettings().crawl) return { ok: false, error: t('网页抓取未开启') };
  if (runs.size > 0) return { ok: false, error: t('已有抓取任务在运行，请先停止') };
  if (!options || !['search', 'page', 'site'].includes(options.mode)) {
    return { ok: false, error: t('抓取模式无效') };
  }
  if (options.mode === 'search' && options.url) {
    // 允许前端只传一个字段，按模式取对应输入
    options.query = options.query || options.url;
  }
  const run: RunState = { id: randomUUID(), canceled: false, visited: new Set(), pages: [], children: new Set() };
  runs.set(run.id, run);
  void execute(run, options, emit);
  return { ok: true, runId: run.id };
}

export function cancelCrawl(runId: string): { ok: boolean; error?: string } {
  const run = runs.get(runId);
  if (!run) return { ok: false, error: t('没有正在运行的抓取任务') };
  run.canceled = true;
  return { ok: true };
}
