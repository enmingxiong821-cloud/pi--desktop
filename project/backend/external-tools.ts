// 外部安全 / 抓取工具的检测与安装。只使用固定来源和固定参数，不接受用户自定义 URL。
import { app, net } from 'electron';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
  renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ToolId = 'trafilatura' | 'radare2' | 'semgrep' | 'trivy' | 'gitleaks' | 'nuclei' | 'bandit' | 'gosec';
export type ToolSource = 'uv' | 'winget' | 'zip';

export interface ToolSpec {
  id: ToolId;
  label: string;
  source: ToolSource;
  sourceRef: string;
  versionArgs: string[];
  exeNames: string[];
  sizeHint: string;
  installable: boolean;
  manualHint: string;
  note: string;
  zip?: { url: string; sha256: string; fileName: string; targetDir: string; exeName: string };
}

export interface ToolStatus {
  id: ToolId;
  label: string;
  installed: boolean;
  version?: string;
  path?: string;
  installable: boolean;
  source: ToolSource;
  sizeHint: string;
  note: string;
  manualHint: string;
  error?: string;
}

export interface InstallResult {
  ok: boolean;
  id: ToolId;
  status?: ToolStatus;
  output?: string;
  error?: string;
}

interface ToolRecord {
  version: string;
  path: string;
  installedAt: string;
}

interface ToolRecordFile {
  tools: Partial<Record<ToolId, ToolRecord>>;
  updatedAt: string;
}

const IS_WIN = process.platform === 'win32';
const DETECT_TIMEOUT_MS = 12_000;
const INSTALL_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 120 * 1024 * 1024;
const CACHE_TTL_MS = 30_000;

const LOCAL_PROGRAMS = IS_WIN
  ? path.join(process.env.LOCALAPPDATA ?? app.getPath('userData'), 'Programs')
  : path.join(app.getPath('userData'), 'tools');

export const TOOL_SPECS: ToolSpec[] = [
  {
    id: 'trafilatura',
    label: 'trafilatura',
    source: 'uv',
    sourceRef: 'trafilatura',
    versionArgs: ['--version'],
    exeNames: ['trafilatura'],
    sizeHint: '约 20MB',
    installable: true,
    manualHint: 'uv tool install trafilatura',
    note: '正文抽取，比内置规则更干净',
  },
  {
    id: 'radare2',
    label: 'radare2',
    source: 'zip',
    sourceRef: '6.2.4',
    versionArgs: ['-v'],
    exeNames: ['radare2'],
    sizeHint: '约 14MB',
    installable: IS_WIN,
    manualHint: IS_WIN ? '下载官方 radare2-6.2.4-w64.zip 后解压，把 bin 目录加入 PATH' : 'brew install radare2 / 使用发行版包管理器',
    note: '二进制逆向 triage',
    zip: {
      url: 'https://github.com/radareorg/radare2/releases/download/6.2.4/radare2-6.2.4-w64.zip',
      sha256: 'aa3454fd89e8a4ead450caff35a1d3919065744e7091540d4913a9487241799d',
      fileName: 'radare2-6.2.4-w64.zip',
      targetDir: path.join(LOCAL_PROGRAMS, 'radare2'),
      exeName: 'radare2.exe',
    },
  },
  {
    id: 'semgrep',
    label: 'Semgrep',
    source: 'uv',
    sourceRef: 'semgrep',
    versionArgs: ['--version'],
    exeNames: ['semgrep'],
    sizeHint: '约 120MB',
    installable: true,
    manualHint: 'uv tool install semgrep（Windows 为 Beta）',
    note: '多语言静态代码审计',
  },
  {
    id: 'trivy',
    label: 'Trivy',
    source: 'winget',
    sourceRef: 'AquaSecurity.Trivy',
    versionArgs: ['--version'],
    exeNames: ['trivy'],
    sizeHint: '约 80MB',
    installable: IS_WIN,
    manualHint: IS_WIN ? 'winget install AquaSecurity.Trivy' : 'brew install trivy / 使用发行版包管理器',
    note: '依赖漏洞、密钥与配置检查',
  },
  {
    id: 'gitleaks',
    label: 'gitleaks',
    source: 'winget',
    sourceRef: 'Gitleaks.Gitleaks',
    versionArgs: ['version'],
    exeNames: ['gitleaks'],
    sizeHint: '约 15MB',
    installable: IS_WIN,
    manualHint: IS_WIN ? 'winget install Gitleaks.Gitleaks' : 'brew install gitleaks',
    note: '仓库与目录密钥泄露扫描',
  },
  {
    id: 'nuclei',
    label: 'Nuclei',
    source: 'zip',
    sourceRef: 'v3.11.1',
    versionArgs: ['-version'],
    exeNames: ['nuclei'],
    sizeHint: '约 46MB + 模板',
    installable: IS_WIN,
    manualHint: IS_WIN ? '下载官方 nuclei Windows amd64 zip 后解压并加入 PATH' : 'brew install nuclei',
    note: '授权主动扫描引擎',
    zip: {
      url: 'https://github.com/projectdiscovery/nuclei/releases/download/v3.11.1/nuclei_3.11.1_windows_amd64.zip',
      sha256: 'bb6cb9ff8939b753f6fcab06fd30a15f5bc61d8382a597871334c007a85ff9d2',
      fileName: 'nuclei_3.11.1_windows_amd64.zip',
      targetDir: path.join(LOCAL_PROGRAMS, 'nuclei'),
      exeName: 'nuclei.exe',
    },
  },
  {
    id: 'bandit',
    label: 'Bandit',
    source: 'uv',
    sourceRef: 'bandit',
    versionArgs: ['--version'],
    exeNames: ['bandit'],
    sizeHint: '约 6MB',
    installable: false,
    manualHint: 'uv tool install bandit',
    note: 'Python 专项审计（仅检测）',
  },
  {
    id: 'gosec',
    label: 'gosec',
    source: 'uv',
    sourceRef: 'gosec',
    versionArgs: ['-version'],
    exeNames: ['gosec'],
    sizeHint: '约 12MB',
    installable: false,
    manualHint: 'go install github.com/securego/gosec/v2/cmd/gosec@latest',
    note: 'Go 专项审计（仅检测）',
  },
];

const SPEC_BY_ID = new Map(TOOL_SPECS.map((spec) => [spec.id, spec]));
let detectCache: { at: number; tools: ToolStatus[] } | undefined;
const installLocks = new Map<ToolId, Promise<InstallResult>>();
let uvBinCache: string | undefined;

function executableNames(spec: ToolSpec): string[] {
  return IS_WIN ? spec.exeNames.map((name) => `${name}.exe`) : spec.exeNames;
}

function pathDirs(): string[] {
  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .map((item) => item.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

function uniqueExistingDirs(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      if (statSync(value).isDirectory()) out.push(value);
    } catch {
      // 目录不存在就跳过
    }
  }
  return out;
}

function knownToolDirs(): string[] {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  if (!IS_WIN) {
    return uniqueExistingDirs([
      '/usr/local/bin', '/usr/bin', '/opt/homebrew/bin', '/opt/local/bin',
      home ? path.join(home, '.local', 'bin') : undefined,
      home ? path.join(home, 'go', 'bin') : undefined,
    ]);
  }
  return uniqueExistingDirs([
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links') : undefined,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs') : undefined,
    path.join(LOCAL_PROGRAMS, 'radare2', 'bin'),
    path.join(LOCAL_PROGRAMS, 'nuclei'),
    home ? path.join(home, '.local', 'bin') : undefined,
    home ? path.join(home, 'go', 'bin') : undefined,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Trivy') : undefined,
  ]);
}

function findInWingetPackages(exeName: string): string | undefined {
  if (!IS_WIN) return undefined;
  const root = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages')
    : undefined;
  if (!root) return undefined;
  let visited = 0;
  const walk = (dir: string, depth: number): string | undefined => {
    if (depth > 4 || visited > 4000) return undefined;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return undefined;
    }
    for (const entry of entries) {
      visited += 1;
      if (entry.isFile() && entry.name.toLowerCase() === exeName.toLowerCase()) {
        return path.join(dir, entry.name);
      }
      if (entry.isDirectory()) {
        const found = walk(path.join(dir, entry.name), depth + 1);
        if (found) return found;
      }
    }
    return undefined;
  };
  try {
    return walk(root, 0);
  } catch {
    return undefined;
  }
}

async function uvBinDir(): Promise<string | undefined> {
  if (uvBinCache) return uvBinCache;
  const direct = IS_WIN
    ? path.join(process.env.USERPROFILE ?? '', '.local', 'bin')
    : path.join(process.env.HOME ?? '', '.local', 'bin');
  if (direct && existsSync(direct)) uvBinCache = direct;
  const uv = await resolveExecutable(['uv']);
  if (!uv) return uvBinCache;
  try {
    const { stdout } = await execFileAsync(uv, ['tool', 'dir', '--bin'], { timeout: 10_000, windowsHide: true });
    const dir = stdout.trim().split(/\r?\n/).pop()?.trim();
    if (dir && existsSync(dir)) uvBinCache = dir;
  } catch {
    // uv 版本过旧时忽略，继续用默认目录
  }
  return uvBinCache;
}

async function resolveExecutable(names: string[]): Promise<string | undefined> {
  const dirs = [...pathDirs(), ...knownToolDirs()];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // 继续找
      }
    }
  }
  if (IS_WIN) {
    for (const name of names) {
      const found = findInWingetPackages(name);
      if (found) return found;
    }
  }
  return undefined;
}

export async function resolveTool(id: ToolId): Promise<string | undefined> {
  const spec = SPEC_BY_ID.get(id);
  if (!spec) return undefined;
  const names = executableNames(spec);
  if (spec.source === 'uv') {
    const bin = await uvBinDir();
    for (const name of names) {
      if (!bin) break;
      const candidate = path.join(bin, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  if (spec.zip && existsSync(spec.zip.targetDir)) {
    const direct = findFile(spec.zip.targetDir, spec.zip.exeName, 4);
    if (direct) return direct;
  }
  return resolveExecutable(names);
}

function findFile(root: string, name: string, depth: number): string | undefined {
  if (depth < 0) return undefined;
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) {
      return path.join(root, entry.name);
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = findFile(path.join(root, entry.name), name, depth - 1);
    if (found) return found;
  }
  return undefined;
}

function versionLine(raw: string): string | undefined {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const picked = lines.find((line) => /\d+\.\d+/.test(line)) ?? lines[0];
  return picked ? picked.slice(0, 160) : undefined;
}

async function detectOne(spec: ToolSpec): Promise<ToolStatus> {
  const base: ToolStatus = {
    id: spec.id,
    label: spec.label,
    installed: false,
    installable: spec.installable,
    source: spec.source,
    sizeHint: spec.sizeHint,
    note: spec.note,
    manualHint: spec.manualHint,
  };
  const bin = await resolveTool(spec.id);
  if (!bin) return base;
  try {
    const { stdout, stderr } = await execFileAsync(bin, spec.versionArgs, {
      timeout: DETECT_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ...base, installed: true, path: bin, version: versionLine(`${stdout}\n${stderr}`) };
  } catch (error) {
    const payload = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${payload.stdout ?? ''}\n${payload.stderr ?? ''}`.trim();
    return { ...base, path: bin, error: (output || payload.message || '版本检测失败').slice(0, 300) };
  }
}

function readRecords(): ToolRecordFile {
  try {
    const file = path.join(app.getPath('userData'), 'external-tools.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as ToolRecordFile;
    if (parsed && typeof parsed === 'object' && parsed.tools) return parsed;
  } catch {
    // 无记录或损坏时从空开始
  }
  return { tools: {}, updatedAt: new Date().toISOString() };
}

function writeRecord(id: ToolId, status: ToolStatus): void {
  if (!status.path) return;
  const file = path.join(app.getPath('userData'), 'external-tools.json');
  const records = readRecords();
  records.tools[id] = {
    version: status.version ?? '',
    path: status.path,
    installedAt: new Date().toISOString(),
  };
  records.updatedAt = new Date().toISOString();
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  } catch {
    // 记录失败不影响安装结果
  }
}

export async function detectTools(force = false): Promise<ToolStatus[]> {
  if (!force && detectCache && Date.now() - detectCache.at < CACHE_TTL_MS) return detectCache.tools;
  const tools = await Promise.all(TOOL_SPECS.map((spec) => detectOne(spec)));
  detectCache = { at: Date.now(), tools };
  return tools;
}

async function downloadVerified(spec: ToolSpec, staging: string): Promise<string> {
  const zip = spec.zip;
  if (!zip) throw new Error('该工具没有可用的下载源');
  if (!/^[0-9a-f]{64}$/i.test(zip.sha256)) throw new Error('安装包校验值未配置');
  const response = await net.fetch(zip.url, { signal: AbortSignal.timeout(10 * 60 * 1000) });
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) throw new Error('安装包超过大小上限');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD_BYTES) throw new Error('安装包超过大小上限');
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== zip.sha256.toLowerCase()) {
    throw new Error(`校验失败：期望 ${zip.sha256.slice(0, 12)}…，实际 ${actual.slice(0, 12)}…`);
  }
  const archive = path.join(staging, zip.fileName);
  writeFileSync(archive, buffer);
  return archive;
}

async function extractZip(archive: string, destination: string): Promise<void> {
  mkdirSync(destination, { recursive: true });
  try {
    if (IS_WIN) {
      // 相对路径避免盘符被 bsdtar 当成远程主机；显式使用系统 bsdtar，避免 PATH 里的 GNU tar 读不了 zip
      const cwd = path.dirname(archive);
      const systemTar = process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar.exe';
      await execFileAsync(
        existsSync(systemTar) ? systemTar : 'tar.exe',
        ['-xf', path.basename(archive), '-C', path.relative(cwd, destination) || '.'],
        { cwd, timeout: 120_000, windowsHide: true },
      );
    } else {
      await execFileAsync('unzip', ['-q', archive, '-d', destination], { timeout: 120_000 });
    }
  } catch (error) {
    throw new Error(`解压失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function installZip(spec: ToolSpec): Promise<{ output: string; exe?: string }> {
  const zip = spec.zip;
  if (!zip) throw new Error('缺少安装包配置');
  const staging = mkdtempSync(path.join(path.dirname(LOCAL_PROGRAMS), 'pi-tool-'));
  const extractDir = path.join(staging, 'extract');
  try {
    const archive = await downloadVerified(spec, staging);
    await extractZip(archive, extractDir);
    const exe = findFile(extractDir, zip.exeName, 5);
    if (!exe) throw new Error(`安装包里没有找到 ${zip.exeName}`);
    mkdirSync(LOCAL_PROGRAMS, { recursive: true });
    const replaceTarget = (install: () => void) => {
      if (existsSync(zip.targetDir)) {
        const backup = `${zip.targetDir}.old-${Date.now()}`;
        renameSync(zip.targetDir, backup);
        try {
          install();
          rmSync(backup, { recursive: true, force: true });
        } catch (error) {
          if (!existsSync(zip.targetDir) && existsSync(backup)) renameSync(backup, zip.targetDir);
          throw error;
        }
        return;
      }
      install();
    };
    if (spec.id === 'nuclei') {
      replaceTarget(() => {
        mkdirSync(zip.targetDir, { recursive: true });
        copyFileSync(exe, path.join(zip.targetDir, zip.exeName));
      });
    } else {
      const parent = path.dirname(path.dirname(exe));
      const sourceRoot = parent.startsWith(extractDir + path.sep) || parent === extractDir ? parent : extractDir;
      replaceTarget(() => renameSync(sourceRoot, zip.targetDir));
    }
    if (spec.id === 'nuclei') {
      // 首次安装时同步官方模板；失败不阻塞安装，运行时再提示。
      try {
        const exePath = findFile(zip.targetDir, zip.exeName, 3);
        if (exePath) {
          await execFileAsync(exePath, ['-update-templates', '-duc'], { timeout: 5 * 60 * 1000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        }
      } catch {
        // 模板下载失败时保留手动更新提示
      }
    }
    return { output: `已解压到 ${zip.targetDir}` };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

async function installUv(spec: ToolSpec): Promise<{ output: string }> {
  const uv = await resolveExecutable(['uv.exe', 'uv']);
  if (!uv) throw new Error('未找到 uv。请先安装 uv，或按「手动安装」命令操作');
  try {
    const { stdout, stderr } = await execFileAsync(uv, ['tool', 'install', spec.sourceRef], {
      timeout: INSTALL_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    uvBinCache = undefined;
    return { output: `${stdout}\n${stderr}`.trim() };
  } catch (error) {
    const payload = error as { stdout?: string; stderr?: string; message?: string };
    const detail = `${payload.stdout ?? ''}\n${payload.stderr ?? ''}`.trim() || payload.message || 'uv 安装失败';
    throw new Error(detail.slice(-1500));
  }
}

async function installWinget(spec: ToolSpec): Promise<{ output: string }> {
  if (!IS_WIN) throw new Error('该工具在当前系统请使用手动安装');
  const winget = await resolveExecutable(['winget.exe']);
  if (!winget) throw new Error('未找到 winget。请先在 Microsoft Store 安装「应用安装程序」');
  try {
    const { stdout, stderr } = await execFileAsync(
      winget,
      ['install', '--id', spec.sourceRef, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'],
      { timeout: INSTALL_TIMEOUT_MS, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
    );
    return { output: `${stdout}\n${stderr}`.trim() };
  } catch (error) {
    const payload = error as { stdout?: string; stderr?: string; message?: string };
    const detail = `${payload.stdout ?? ''}\n${payload.stderr ?? ''}`.trim() || payload.message || 'winget 安装失败';
    throw new Error(detail.slice(-1500));
  }
}

function specOrThrow(id: ToolId): ToolSpec {
  const spec = SPEC_BY_ID.get(id);
  if (!spec) throw new Error('未知工具');
  return spec;
}

async function runInstall(id: ToolId): Promise<InstallResult> {
  let spec: ToolSpec;
  try {
    spec = specOrThrow(id);
  } catch (error) {
    return { ok: false, id, error: error instanceof Error ? error.message : String(error) };
  }
  if (!spec.installable) {
    return { ok: false, id, error: `该工具暂不支持一键安装：${spec.manualHint}` };
  }
  try {
    const result = spec.source === 'uv'
      ? await installUv(spec)
      : spec.source === 'winget'
        ? await installWinget(spec)
        : await installZip(spec);
    detectCache = undefined;
    const status = await detectOne(spec);
    if (status.installed) writeRecord(spec.id, status);
    return {
      ok: status.installed,
      id,
      status,
      output: result.output.slice(-4000),
      error: status.installed ? undefined : (status.error ?? '安装完成但未能检测到可执行文件，可能需要重启工作台或手动配置 PATH'),
    };
  } catch (error) {
    return { ok: false, id, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function installTool(id: ToolId): Promise<InstallResult> {
  const running = installLocks.get(id);
  if (running) return running;
  const task = runInstall(id).finally(() => installLocks.delete(id));
  installLocks.set(id, task);
  return task;
}

export function invalidateToolCache(): void {
  detectCache = undefined;
}
