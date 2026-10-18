import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { t } from './i18n.js';

export type SearchProvider = 'duckduckgo' | 'searxng';

export interface ToolSettings {
  webSearch: boolean;
  crawl: boolean;
  reverse: boolean;
  security: boolean;
  searchProvider: SearchProvider;
  searxngUrl: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
}

const DEFAULTS: ToolSettings = {
  webSearch: true,
  crawl: false,
  reverse: false,
  security: false,
  searchProvider: 'duckduckgo',
  searxngUrl: '',
};

// 抓取工具使用可识别的 UA，便于站点管理员审计与联系，不做身份伪装
export const CRAWL_UA = 'PiWorkbench/1.3 (local research tool; respects robots.txt)';
const MAX_PAGE_CHARS = 120_000;
const MAX_DOWNLOAD_BYTES = 3_000_000;
// 同一主机的最小请求间隔，避免对目标站点造成瞬时压力
const HOST_INTERVAL_MS = 1_000;
// robots.txt 缓存时间，减少重复请求
const ROBOTS_TTL_MS = 10 * 60_000;

const hostLastAccess = new Map<string, number>();

export async function throttleHost(host: string): Promise<void> {
  const now = Date.now();
  const last = hostLastAccess.get(host) ?? 0;
  const wait = HOST_INTERVAL_MS - (now - last);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  hostLastAccess.set(host, Date.now());
}

interface RobotsRule {
  allow: boolean;
  pattern: string;
  matcher: RegExp;
}

const robotsCache = new Map<string, { at: number; rules: RobotsRule[] }>();

// robots.txt 只按通配组和本工具名解析，规则未声明时默认允许
function parseRobots(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let active = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      active = value === '*' || /piworkbench/i.test(value);
      continue;
    }
    if (!active) continue;
    if (key !== 'allow' && key !== 'disallow') continue;
    if (!value) continue;
    const escaped = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    try {
      rules.push({ allow: key === 'allow', pattern: value, matcher: new RegExp(`^${escaped}`) });
    } catch {
      // 个别站点的规则写法不规范，跳过即可
    }
  }
  return rules;
}

async function robotsRules(origin: string): Promise<RobotsRule[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.at < ROBOTS_TTL_MS) return cached.rules;
  let rules: RobotsRule[] = [];
  try {
    const response = await httpGet(`${origin}/robots.txt`, 8_000);
    if (response.ok) {
      const type = response.headers.get('content-type') ?? '';
      // 部分站点对未知路径返回 HTML，只有纯文本才按 robots 规则解析
      if (!type || /text\/plain|text\/html/i.test(type)) rules = parseRobots((await response.text()).slice(0, 200_000));
    }
  } catch {
    // robots.txt 不可达时按允许处理，符合常见抓取约定
  }
  robotsCache.set(origin, { at: Date.now(), rules });
  return rules;
}

function robotsAllows(rules: RobotsRule[], pathname: string): boolean {
  let allowed = true;
  let bestLength = -1;
  for (const rule of rules) {
    if (!rule.matcher.test(pathname)) continue;
    if (rule.pattern.length > bestLength) {
      bestLength = rule.pattern.length;
      allowed = rule.allow;
    }
  }
  return allowed;
}

export async function allowedByRobots(url: URL): Promise<boolean> {
  const rules = await robotsRules(url.origin);
  return robotsAllows(rules, `${url.pathname}${url.search}`);
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'advanced-tools.json');
}

export function getToolSettings(): ToolSettings {
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<ToolSettings>;
    return {
      webSearch: typeof raw.webSearch === 'boolean' ? raw.webSearch : DEFAULTS.webSearch,
      crawl: typeof raw.crawl === 'boolean' ? raw.crawl : DEFAULTS.crawl,
      reverse: typeof raw.reverse === 'boolean' ? raw.reverse : DEFAULTS.reverse,
      security: typeof raw.security === 'boolean' ? raw.security : DEFAULTS.security,
      searchProvider: raw.searchProvider === 'searxng' ? 'searxng' : 'duckduckgo',
      searxngUrl: typeof raw.searxngUrl === 'string' ? raw.searxngUrl.trim().slice(0, 300) : '',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveToolSettings(input: unknown): { ok: boolean; settings?: ToolSettings; error?: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const source = input as Record<string, unknown>;
  const next: ToolSettings = {
    webSearch: Boolean(source.webSearch),
    crawl: Boolean(source.crawl),
    reverse: Boolean(source.reverse),
    security: Boolean(source.security),
    searchProvider: source.searchProvider === 'searxng' ? 'searxng' : 'duckduckgo',
    searxngUrl: typeof source.searxngUrl === 'string' ? source.searxngUrl.trim().slice(0, 300) : '',
  };
  if (next.searchProvider === 'searxng' && next.searxngUrl) {
    try {
      const parsed = new URL(next.searxngUrl);
      if (!/^https?:$/.test(parsed.protocol)) return { ok: false, error: t('只支持 http / https 链接') };
    } catch {
      return { ok: false, error: t('Base URL 不是合法地址') };
    }
  }
  try {
    mkdirSync(path.dirname(configPath()), { recursive: true });
    writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf8');
    return { ok: true, settings: next };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export async function httpGet(url: string, timeoutMs = 15_000): Promise<Response> {  // 所有对外请求统一按主机限速，包含 robots.txt 自身
  try {
    await throttleHost(new URL(url).host);
  } catch {
    // 地址异常交给 fetch 报错
  }
  return fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': CRAWL_UA,
      'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
}

function unwrapDuckUrl(href: string): string {
  try {
    const parsed = new URL(href, 'https://duckduckgo.com');
    const target = parsed.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : parsed.toString();
  } catch {
    return href;
  }
}

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  const response = await httpGet(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(t('搜索服务返回 {status}', { status: response.status }));
  const html = await response.text();
  const links = [...html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippets = [...html.matchAll(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  return links.slice(0, limit).map((match, index) => ({
    title: stripTags(match[2]) || t('未命名结果'),
    url: unwrapDuckUrl(match[1]),
    snippet: snippets[index] ? stripTags(snippets[index][1]) : '',
  }));
}

async function searchSearxng(query: string, limit: number, base: string): Promise<SearchResult[]> {
  const endpoint = `${base.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query)}&format=json&language=auto`;
  const response = await httpGet(endpoint);
  if (!response.ok) throw new Error(t('搜索服务返回 {status}', { status: response.status }));
  const data = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (data.results ?? []).slice(0, limit).map((item) => ({
    title: item.title?.trim() || t('未命名结果'),
    url: item.url ?? '',
    snippet: (item.content ?? '').trim(),
  })).filter((item) => item.url);
}

export async function searchWeb(query: string, limit = 8): Promise<{ ok: boolean; results: SearchResult[]; error?: string }> {
  const settings = getToolSettings();
  if (!settings.webSearch) return { ok: false, results: [], error: t('联网搜索未开启') };
  const text = typeof query === 'string' ? query.trim().slice(0, 500) : '';
  if (!text) return { ok: false, results: [], error: t('填写搜索内容') };
  try {
    const results = settings.searchProvider === 'searxng' && settings.searxngUrl
      ? await searchSearxng(text, limit, settings.searxngUrl)
      : await searchDuckDuckGo(text, limit);
    if (!results.length) return { ok: false, results: [], error: t('没有找到相关结果') };
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export function extractPageText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : '';
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, '\n');
  const text = stripTags(body.replace(/\n+/g, '\n')).slice(0, MAX_PAGE_CHARS);
  return { title, text };
}

export async function fetchPage(rawUrl: string): Promise<{ ok: boolean; page?: PageContent; error?: string }> {
  const settings = getToolSettings();
  if (!settings.crawl) return { ok: false, error: t('网页抓取未开启') };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: t('Base URL 不是合法地址') };
  }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, error: t('只支持 http / https 链接') };
  // 抓取前读取 robots.txt，路径被禁止时直接拒绝
  if (!(await allowedByRobots(url))) return { ok: false, error: t('robots.txt 不允许抓取该路径') };
  try {
    const response = await httpGet(url.toString());
    if (!response.ok) return { ok: false, error: t('搜索服务返回 {status}', { status: response.status }) };
    const type = response.headers.get('content-type') ?? '';
    if (!/text\/|html|json|xml/i.test(type)) return { ok: false, error: t('该链接不是网页正文') };
    const raw = (await response.text()).slice(0, MAX_DOWNLOAD_BYTES);
    const parsed = extractPageText(raw);
    return { ok: true, page: { url: url.toString(), title: parsed.title || url.hostname, text: parsed.text } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function crawlPage(rawUrl: string, limit = 6): Promise<{
  ok: boolean;
  pages: PageContent[];
  links: string[];
  error?: string;
}> {
  const settings = getToolSettings();
  if (!settings.crawl) return { ok: false, pages: [], links: [], error: t('网页抓取未开启') };
  let base: URL;
  try {
    base = new URL(rawUrl);
  } catch {
    return { ok: false, pages: [], links: [], error: t('Base URL 不是合法地址') };
  }
  if (!/^https?:$/.test(base.protocol)) return { ok: false, pages: [], links: [], error: t('只支持 http / https 链接') };
  const first = await fetchPage(base.toString());
  if (!first.ok || !first.page) return { ok: false, pages: [], links: [], error: first.error };
  const pages: PageContent[] = [first.page];
  const links = new Set<string>();
  try {
    const html = await (await httpGet(base.toString())).text();
    for (const match of html.matchAll(/<a[^>]+href="([^"#]+)"/gi)) {
      try {
        const next = new URL(match[1], base);
        if (next.origin !== base.origin) continue;
        if (!/\.(html?|php|aspx?)$/i.test(next.pathname) && next.pathname !== '/') continue;
        links.add(next.toString());
      } catch {
        // 忽略无法解析的链接
      }
    }
  } catch {
    // 链接提取失败时仍返回首页正文
  }
  for (const link of [...links].slice(0, Math.max(0, limit - 1))) {
    const page = await fetchPage(link);
    if (page.ok && page.page) pages.push(page.page);
  }
  return { ok: true, pages, links: [...links].slice(0, limit * 4) };
}

export function searchForPrompt(query: string, limit = 5): Promise<string[]> {
  return searchWeb(query, limit).then((result) => result.results.map((item) =>
    `- ${item.title}${item.snippet ? `：${item.snippet.slice(0, 240)}` : ''}（${item.url}）`));
}

function magicType(header: Buffer): string {
  if (header.length >= 2 && header[0] === 0x4d && header[1] === 0x5a) return 'PE / Windows 可执行文件';
  if (header.length >= 4 && header.readUInt32BE(0) === 0x7f454c46) return 'ELF 可执行文件';
  if (header.length >= 4 && header.toString('ascii', 0, 4) === '%PDF') return 'PDF 文档';
  if (header.length >= 4 && header.toString('ascii', 0, 4) === 'PK\u0003\u0004') return 'ZIP / 压缩包';
  if (header.length >= 4 && header.readUInt32BE(0) === 0x504b0304) return 'ZIP / 压缩包';
  return '未知或纯文本';
}

function printableStrings(buffer: Buffer, limit = 120): string[] {
  const found = new Set<string>();
  let current = '';
  for (const byte of buffer) {
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 6) found.add(current);
      current = '';
      if (found.size >= limit) break;
    }
  }
  if (current.length >= 6 && found.size < limit) found.add(current);
  return [...found].slice(0, limit);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target', '.gradle', '.next', 'coverage']);

function walkSummary(root: string, maxDepth = 3): { files: number; extensions: Map<string, number>; manifests: string[]; dirs: string[] } {
  const extensions = new Map<string, number>();
  const manifests: string[] = [];
  const dirs: string[] = [];
  let files = 0;
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
        dirs.push(path.relative(root, full));
        walk(full, depth + 1);
        continue;
      }
      files += 1;
      const ext = path.extname(entry).toLowerCase() || '(无扩展名)';
      extensions.set(ext, (extensions.get(ext) ?? 0) + 1);
      if (/^(package\.json|pubspec\.yaml|Cargo\.toml|go\.mod|pom\.xml|build\.gradle|CMakeLists\.txt|requirements\.txt)$/.test(entry)) {
        manifests.push(path.relative(root, full));
      }
    }
  };
  walk(root, 0);
  return { files, extensions, manifests, dirs };
}

export function analyzePath(target: string): { ok: boolean; lines?: string[]; error?: string } {
  const settings = getToolSettings();
  if (!settings.reverse) return { ok: false, error: t('逆向分析未开启') };
  const resolved = typeof target === 'string' ? path.resolve(target.trim()) : '';
  if (!resolved || !existsSync(resolved)) return { ok: false, error: t('路径不存在') };
  try {
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      const summary = walkSummary(resolved);
      const top = [...summary.extensions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      return {
        ok: true,
        lines: [
          `${t('类型')}：${t('目录')}`,
          `${t('路径')}：${resolved}`,
          `${t('文件数')}：${summary.files}`,
          `${t('顶层目录')}：${summary.dirs.slice(0, 12).join('、') || t('无')}`,
          `${t('主要类型')}：${top.map(([ext, count]) => `${ext} × ${count}`).join('、') || t('无')}`,
          `${t('项目清单')}：${summary.manifests.join('、') || t('未发现')}`,
        ],
      };
    }
    const buffer = readFileSync(resolved);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const header = buffer.subarray(0, 64);
    const lines = [
      `${t('类型')}：${magicType(header)}`,
      `${t('路径')}：${resolved}`,
      `${t('大小')}：${stat.size} 字节`,
      `${t('SHA-256')}：${hash}`,
      `${t('文件头')}：${header.subarray(0, 16).toString('hex').replace(/(..)/g, '$1 ').trim()}`,
    ];
    if (buffer.length && buffer.length <= 32 * 1024 * 1024) {
      const strings = printableStrings(buffer);
      if (strings.length) lines.push('', `${t('可打印字符串')}：`, ...strings.map((item) => `  ${item}`));
    }
    return { ok: true, lines };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
