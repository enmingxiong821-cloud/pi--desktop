// 更新检查：工作台走 GitHub Releases，Pi 走 npm registry；只读检查与手动下载，不静默安装。
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { realAgentDir } from './config.js';
import { t } from './i18n.js';

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface AppUpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  url: string;
  notes: string;
  publishedAt: string;
  asset?: ReleaseAsset;
}

export interface PiUpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoDownload: boolean;
}

export interface UpdateCheckResult {
  ok: boolean;
  app?: AppUpdateInfo;
  pi?: PiUpdateInfo;
  settings?: UpdateSettings;
  checkedAt?: string;
  error?: string;
}

const REPO = 'enmingxiong821-cloud/pi--desktop';
const PI_PACKAGE = '@earendil-works/pi-coding-agent';
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
const UA = 'PiWorkbench/1.0 (local desktop client)';

function settingsFile(): string {
  return path.join(realAgentDir(), 'workbench-update.json');
}

export function getUpdateSettings(): UpdateSettings {
  try {
    const data = JSON.parse(readFileSync(settingsFile(), 'utf8')) as Record<string, unknown>;
    return {
      autoCheck: data.autoCheck !== false,
      autoDownload: data.autoDownload === true,
    };
  } catch {
    return { autoCheck: true, autoDownload: false };
  }
}

export function saveUpdateSettings(input: unknown): UpdateSettings {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const settings: UpdateSettings = {
    autoCheck: source.autoCheck !== false,
    autoDownload: source.autoDownload === true,
  };
  try {
    mkdirSync(path.dirname(settingsFile()), { recursive: true });
    writeFileSync(settingsFile(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  } catch {
    // 设置写入失败时仍返回期望值，界面会显示未持久化
  }
  return settings;
}

function numeric(version: string): number[] {
  return version.replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((part) => {
    const value = Number.parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
  });
}

export function compareVersions(left: string, right: string): number {
  const a = numeric(left);
  const b = numeric(right);
  for (let index = 0; index < 3; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/vnd.github+json', ...headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(t('请求失败：HTTP {status}', { status: response.status }));
  }
  return await response.json() as Record<string, unknown>;
}

function platformScore(name: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  if (process.platform === 'win32') {
    if (!lower.includes('win')) return -1;
    if (!lower.endsWith('.exe')) score -= 1;
    if (lower.includes('setup')) score += 2;
  } else if (process.platform === 'darwin') {
    if (!/(mac|darwin|dmg|zip)/.test(lower)) return -1;
    if (lower.endsWith('.dmg')) score += 2;
  } else {
    if (!/(linux|appimage|deb)/.test(lower)) return -1;
    if (lower.endsWith('.appimage')) score += 2;
  }
  const arch = process.arch;
  if ((arch === 'x64' && /(x64|amd64)/.test(lower)) || (arch === 'arm64' && /(arm64|aarch64)/.test(lower))) score += 3;
  if (lower.includes('blockmap') || lower.endsWith('.yml') || lower.endsWith('.json')) score -= 10;
  return score;
}

function pickAsset(assets: unknown): ReleaseAsset | undefined {
  if (!Array.isArray(assets)) return undefined;
  const candidates = assets
    .map((item) => {
      const asset = item !== null && typeof item === 'object' ? item as Record<string, unknown> : {};
      const name = typeof asset.name === 'string' ? asset.name : '';
      return {
        name,
        url: typeof asset.browser_download_url === 'string' ? asset.browser_download_url : '',
        size: typeof asset.size === 'number' ? asset.size : 0,
        score: name ? platformScore(name) : -1,
      };
    })
    .filter((item) => item.url && item.score >= 0)
    .sort((left, right) => right.score - left.score);
  const best = candidates[0];
  return best ? { name: best.name, url: best.url, size: best.size } : undefined;
}

export async function checkUpdates(currentVersion: string, piCurrent: string): Promise<UpdateCheckResult> {
  const settings = getUpdateSettings();
  const checkedAt = new Date().toISOString();
  const headers: Record<string, string> = {};
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;

  let app: AppUpdateInfo | undefined;
  let pi: PiUpdateInfo | undefined;
  const problems: string[] = [];

  try {
    const release = await getJson(`https://api.github.com/repos/${REPO}/releases/latest`, headers);
    const latest = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/i, '') : '';
    app = {
      current: currentVersion,
      latest: latest || currentVersion,
      hasUpdate: Boolean(latest) && compareVersions(latest, currentVersion) > 0,
      url: typeof release.html_url === 'string' ? release.html_url : `https://github.com/${REPO}/releases`,
      notes: typeof release.body === 'string' ? release.body.slice(0, 4000) : '',
      publishedAt: typeof release.published_at === 'string' ? release.published_at : '',
      asset: pickAsset(release.assets),
    };
  } catch (error) {
    problems.push(t('工作台更新检查失败：{error}', { error: error instanceof Error ? error.message : String(error) }));
  }

  try {
    const data = await getJson(`https://registry.npmjs.org/${encodeURIComponent(PI_PACKAGE)}/latest`);
    const latest = typeof data.version === 'string' ? data.version : piCurrent;
    pi = { current: piCurrent, latest, hasUpdate: compareVersions(latest, piCurrent) > 0 };
  } catch (error) {
    problems.push(t('Pi 版本检查失败：{error}', { error: error instanceof Error ? error.message : String(error) }));
  }

  return {
    ok: Boolean(app || pi),
    app,
    pi,
    settings,
    checkedAt,
    error: problems.length ? problems.join('；') : undefined,
  };
}

function downloadsDir(): string {
  const home = os.homedir();
  const downloads = path.join(home, 'Downloads');
  return path.join(existsSync(downloads) ? downloads : home, 'Pi-Workbench-updates');
}

export async function downloadUpdate(input: {
  url?: unknown;
  name?: unknown;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  let name = typeof input.name === 'string' ? path.basename(input.name.trim()) : '';
  if (!/^https:\/\//i.test(url)) return { ok: false, error: t('只支持 https 下载地址') };
  if (!name || name === '.' || name === '..') name = `Pi-Workbench-update-${Date.now()}.exe`;
  if (!/^[A-Za-z0-9._ -]{1,160}$/.test(name)) return { ok: false, error: t('文件名无效') };

  const dir = downloadsDir();
  const target = path.join(dir, name);
  mkdirSync(dir, { recursive: true });
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(10 * 60 * 1000),
      redirect: 'follow',
    });
    if (!response.ok) return { ok: false, error: t('下载失败：HTTP {status}', { status: response.status }) };
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_DOWNLOAD_BYTES) return { ok: false, error: t('安装包超过体积上限，请从 Release 页面手动下载') };
    if (!response.body) return { ok: false, error: t('下载失败：响应为空') };
    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(target));
    if (statSync(target).size > MAX_DOWNLOAD_BYTES) {
      return { ok: false, error: t('安装包超过体积上限，请从 Release 页面手动下载') };
    }
    return { ok: true, path: target };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
