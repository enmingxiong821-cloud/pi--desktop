import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * 从其他编辑器/IDE 的本地配置里读取「最近打开的项目」。
 *
 * 只读：
 * - 不修改这些软件的配置；
 * - 不读取代码内容，只取目录路径；
 * - 结果必须仍然存在且是目录，避免把已删除的盘符带进列表。
 */
export interface ImportedProject {
  /** 来源软件名，例如 VS Code、Cursor、IntelliJ IDEA */
  source: string;
  /** 项目目录名 */
  name: string;
  /** 绝对路径 */
  path: string;
  /** 最近使用时间（毫秒）；来源不提供时为 0 */
  lastUsed: number;
}

interface EditorSource {
  label: string;
  /** %APPDATA% 下的目录名 */
  dir: string;
  kind: 'vscode' | 'jetbrains';
}

/** 基于 VS Code 内核的编辑器，目录结构一致。 */
const VSCODE_LIKE: EditorSource[] = [
  { label: 'VS Code', dir: 'Code', kind: 'vscode' },
  { label: 'VS Code Insiders', dir: 'Code - Insiders', kind: 'vscode' },
  { label: 'Cursor', dir: 'Cursor', kind: 'vscode' },
  { label: 'Windsurf', dir: 'Windsurf', kind: 'vscode' },
  { label: 'TRAE', dir: 'Trae', kind: 'vscode' },
  { label: 'TRAE CN', dir: 'Trae CN', kind: 'vscode' },
  { label: 'VSCodium', dir: 'VSCodium', kind: 'vscode' },
];

/** JetBrains 产品目录名，用于生成显示名和定位配置。 */
const JETBRAINS_PRODUCTS: Record<string, string> = {
  'IntelliJIdea': 'IntelliJ IDEA',
  'IntelliJIDEA': 'IntelliJ IDEA',
  'PyCharm': 'PyCharm',
  'WebStorm': 'WebStorm',
  'GoLand': 'GoLand',
  'Rider': 'Rider',
  'CLion': 'CLion',
  'DataGrip': 'DataGrip',
  'PhpStorm': 'PhpStorm',
  'RubyMine': 'RubyMine',
  'AppCode': 'AppCode',
};

const MAX_RESULTS = 200;

function appDataDir(): string {
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

function readJsonFile(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 把 `file:///c%3A/Users/...` 转成 Windows 路径。
 * 非 file:// 或无法解码时返回 undefined。
 */
function fileUriToPath(value: string): string | undefined {
  if (!value.startsWith('file://')) return undefined;
  let raw = value.slice('file://'.length);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  // file:///c:/x → /c:/x → c:/x
  raw = raw.replace(/^\/([A-Za-z]:)/, '$1');
  return raw.split('/').join(path.sep);
}

/** 判断某个候选路径是否可以导入：存在、是目录、且不在软件自己的配置目录里。 */
function isImportable(candidate: string): boolean {
  if (!candidate || candidate.includes('\u0000')) return false;
  const resolved = path.resolve(candidate);
  const lower = resolved.toLowerCase();
  const blocked = [appDataDir().toLowerCase(), path.join(os.homedir(), 'AppData', 'Local').toLowerCase()];
  if (blocked.some((root) => lower === root || lower.startsWith(root + path.sep))) return false;
  try {
    return existsSync(resolved) && statSync(resolved).isDirectory();
  } catch {
    return false;
  }
}

/** 递归收集 JSON 中所有 file:// 字符串；编辑器不同版本存放键名差异较大。 */
function collectFileUris(value: unknown, out: Set<string>, depth = 0): void {
  if (depth > 8 || out.size > 5000) return;
  if (typeof value === 'string') {
    if (value.startsWith('file://')) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectFileUris(item, out, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectFileUris(item, out, depth + 1);
    }
  }
}

/** 读取 workspaceStorage 下每个工作区的 workspace.json。 */
function scanWorkspaceStorage(root: string, source: string, push: (project: ImportedProject) => void): void {
  const storageRoot = path.join(root, 'User', 'workspaceStorage');
  if (!existsSync(storageRoot)) return;
  let children: string[];
  try {
    children = readdirSync(storageRoot);
  } catch {
    return;
  }
  for (const child of children) {
    const meta = readJsonFile(path.join(storageRoot, child, 'workspace.json'));
    if (!meta || typeof meta !== 'object') continue;
    const record = meta as Record<string, unknown>;
    for (const key of ['folder', 'workspace']) {
      const uri = record[key];
      if (typeof uri !== 'string') continue;
      const folder = fileUriToPath(uri) ?? (path.isAbsolute(uri) ? uri : undefined);
      if (folder) push({ source, name: path.basename(folder) || folder, path: folder, lastUsed: 0 });
    }
  }
}

/** 读取 globalStorage/storage.json 里的窗口状态与配置关联记录。 */
function scanStorageJson(root: string, source: string, push: (project: ImportedProject) => void): void {
  const file = path.join(root, 'User', 'globalStorage', 'storage.json');
  if (!existsSync(file)) return;
  const uris = new Set<string>();
  collectFileUris(readJsonFile(file), uris);
  for (const uri of uris) {
    const folder = fileUriToPath(uri);
    if (folder) push({ source, name: path.basename(folder) || folder, path: folder, lastUsed: 0 });
  }
}

/** JetBrains 的 recentProjects.xml：<option value="$USER_HOME$/..." />。 */
function scanJetBrains(productDir: string, source: string, push: (project: ImportedProject) => void): void {
  const file = path.join(productDir, 'options', 'recentProjects.xml');
  if (!existsSync(file)) return;
  let xml = '';
  try {
    xml = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const block = /<component[^>]*name="RecentProjectsManager"[\s\S]*?<\/component>/i.exec(xml)?.[0] ?? xml;
  for (const match of block.matchAll(/<option\s+value="([^"]+)"\s*\/>/g)) {
    const raw = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\$USER_HOME\$/g, os.homedir());
    if (!path.isAbsolute(raw)) continue;
    push({ source, name: path.basename(raw), path: raw, lastUsed: 0 });
  }
}

export function listImportedProjects(): ImportedProject[] {
  const appData = appDataDir();
  const found: ImportedProject[] = [];
  const seen = new Set<string>();

  const push = (project: ImportedProject): void => {
    if (found.length >= MAX_RESULTS) return;
    if (!isImportable(project.path)) return;
    const resolved = path.resolve(project.path).replace(/[\\/]+$/, '');
    const key = resolved.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ ...project, path: resolved });
  };

  for (const source of VSCODE_LIKE) {
    const root = path.join(appData, source.dir);
    if (!existsSync(root)) continue;
    scanWorkspaceStorage(root, source.label, push);
    scanStorageJson(root, source.label, push);
  }

  // JetBrains 产品目录带版本号，如 GoLand2024.2，统一识别为 GoLand。
  const jetbrainsRoot = path.join(appData, 'JetBrains');
  if (existsSync(jetbrainsRoot)) {
    let entries: string[];
    try {
      entries = readdirSync(jetbrainsRoot);
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      const product = Object.keys(JETBRAINS_PRODUCTS).find((key) => entry.startsWith(key));
      if (!product) continue;
      scanJetBrains(path.join(jetbrainsRoot, entry), JETBRAINS_PRODUCTS[product], push);
    }
  }

  found.sort((left, right) => left.source.localeCompare(right.source) || left.name.localeCompare(right.name));
  return found;
}
