import { app, clipboard, dialog, nativeImage, protocol, shell } from 'electron';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { t } from './i18n.js';

export interface MediaItem {
  path: string;
  name: string;
  kind: 'image' | 'video' | 'file';
  size: number;
  url: string;
}

export interface MediaResult {
  ok: boolean;
  item?: MediaItem;
  items?: MediaItem[];
  error?: string;
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif', '.svg']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.mkv']);
const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
};
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

let projectDir = '';
const allowedPaths = new Set<string>();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'pi-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function normalize(file: string): string {
  return path.resolve(file);
}

function samePath(a: string, b: string): boolean {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function inside(root: string, target: string): boolean {
  if (!root) return false;
  const rel = path.relative(root, target);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function isAllowed(file: string): boolean {
  if (allowedPaths.size) {
    for (const entry of allowedPaths) {
      if (samePath(entry, file)) return true;
    }
  }
  const attachments = attachmentsDir();
  return inside(attachments, file) || inside(projectDir, file);
}

function attachmentsDir(): string {
  const dir = path.join(app.getPath('userData'), 'attachments');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function mediaUrl(file: string): string {
  return `pi-media://local/?p=${encodeURIComponent(file)}`;
}

function describe(file: string): MediaItem | null {
  const resolved = normalize(file);
  const ext = path.extname(resolved).toLowerCase();
  const kind: MediaItem['kind'] = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : 'file';
  const stat = statSync(resolved);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
  return {
    path: resolved,
    name: path.basename(resolved),
    kind,
    size: stat.size,
    url: mediaUrl(resolved),
  };
}

/** Files dropped or picked by the user may live outside the project; whitelist them explicitly. */
export function allowMediaPath(filePath: unknown): MediaResult {
  if (typeof filePath !== 'string' || !filePath) return { ok: false, error: t('缺少文件路径') };
  try {
    const resolved = normalize(filePath);
    const item = describe(resolved);
    if (!item) return { ok: false, error: t('不支持的文件类型') };
    allowedPaths.add(resolved);
    return { ok: true, item };
  } catch {
    return { ok: false, error: t('无法读取该文件') };
  }
}

export function setProjectDir(cwd: string): void {
  projectDir = cwd ? normalize(cwd) : '';
}

export async function pickMedia(): Promise<MediaResult> {
  const result = await dialog.showOpenDialog({
    title: t('选择文件或媒体'),
    defaultPath: projectDir || undefined,
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: t('图片与视频'), extensions: [...IMAGE_EXT, ...VIDEO_EXT].map((ext) => ext.slice(1)) },
      { name: t('所有文件'), extensions: ['*'] },
    ],
  });
  if (result.canceled) return { ok: false };
  const items: MediaItem[] = [];
  for (const file of result.filePaths) {
    const item = describe(file);
    if (item) {
      allowedPaths.add(item.path);
      items.push(item);
    }
  }
  if (!items.length) return { ok: false, error: t('所选文件都不可用') };
  return { ok: true, items };
}

export async function clipboardImage(): Promise<MediaResult> {
  try {
    const items = await clipboard.read();
    for (const item of items) {
      const type = item.types.find((entry) => entry.startsWith('image/'));
      if (!type) continue;
      const payload = await item.getType(type);
      if (!(payload instanceof Blob)) continue;
      const bytes = Buffer.from(await payload.arrayBuffer());
      if (!bytes.length) continue;

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const suffix = randomBytes(3).toString('hex');
      // Re-encode to PNG when Chromium can decode the clipboard payload; otherwise keep the raw bytes.
      const decoded = nativeImage.createFromBuffer(bytes);
      let file: string;
      let item2: MediaItem | null;
      if (!decoded.isEmpty()) {
        file = path.join(attachmentsDir(), `clipboard-${stamp}-${suffix}.png`);
        writeFileSync(file, decoded.toPNG());
        item2 = describe(file);
      } else {
        const ext = type === 'image/jpeg' ? '.jpg' : type === 'image/bmp' ? '.bmp' : type === 'image/webp' ? '.webp' : '.png';
        file = path.join(attachmentsDir(), `clipboard-${stamp}-${suffix}${ext}`);
        writeFileSync(file, bytes);
        item2 = describe(file);
      }
      if (item2) return { ok: true, item: item2 };
    }
    return { ok: false, error: t('剪贴板里没有图片') };
  } catch {
    return { ok: false, error: t('读取剪贴板图片失败') };
  }
}

export function openMediaExternally(filePath: unknown): { ok: boolean; error?: string } {
  if (typeof filePath !== 'string' || !filePath) return { ok: false, error: t('缺少文件路径') };
  const resolved = normalize(filePath);
  if (!isAllowed(resolved)) return { ok: false, error: t('文件不在允许预览的范围内') };
  if (!existsSync(resolved)) return { ok: false, error: t('文件不存在') };
  void shell.openPath(resolved);
  return { ok: true };
}

function mimeOf(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function streamResponse(file: string, start: number, end: number, total: number): Response {
  const stream = createReadStream(file, { start, end });
  const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: start === 0 && end === total - 1 ? 200 : 206,
    headers: {
      'content-type': mimeOf(file),
      'content-length': String(end - start + 1),
      'accept-ranges': 'bytes',
      'cache-control': 'no-cache',
      ...(start === 0 && end === total - 1
        ? {}
        : { 'content-range': `bytes ${start}-${end}/${total}` }),
    },
  });
}

function handleRequest(request: Request): Response {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('p');
    if (!raw) return new Response('missing path', { status: 400 });
    const file = normalize(raw);
    if (!isAllowed(file) || !existsSync(file)) return new Response('forbidden', { status: 403 });
    const stat = statSync(file);
    if (!stat.isFile()) return new Response('not a file', { status: 404 });
    const total = stat.size;
    if (!total) return new Response('empty file', { status: 204 });

    const header = request.headers.get('range');
    const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
    if (match && (match[1] || match[2])) {
      let start: number;
      let end: number;
      if (!match[1]) {
        const suffix = Math.min(Number(match[2]), total);
        start = total - suffix;
        end = total - 1;
      } else {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
        return new Response('range not satisfiable', {
          status: 416,
          headers: { 'content-range': `bytes */${total}` },
        });
      }
      return streamResponse(file, start, end, total);
    }
    return streamResponse(file, 0, total - 1, total);
  } catch {
    return new Response('not found', { status: 404 });
  }
}

export function installMediaProtocol(): void {
  protocol.handle('pi-media', handleRequest);
}
