// 项目权限策略：按项目保存到 .pi/workbench-permissions.json，供工作台与 Pi 启动时读取。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadAppDefaults, permissionPresetRules } from './app-defaults.js';
import { realAgentDir } from './config.js';
import { t } from './i18n.js';

export type PermissionLevel = 'allow' | 'ask' | 'deny';

export interface PermissionRules {
  fileRead: PermissionLevel;
  fileWrite: PermissionLevel;
  shell: PermissionLevel;
  network: PermissionLevel;
  gitWrite: PermissionLevel;
  packageInstall: PermissionLevel;
}

export interface ProjectPermissions {
  version: 1;
  project: string;
  updatedAt: string;
  rules: PermissionRules;
  // true：自动放行时写入限制在项目内；false：完全访问整台电脑
  workspaceOnly: boolean;
  // true：项目内低风险操作自动同意；敏感凭据、外传、破坏性命令与系统路径仍不受影响
  autoApprove: boolean;
  allowPaths: string[];
  denyPaths: string[];
}

export interface PermissionResult {
  ok: boolean;
  path?: string;
  permissions?: ProjectPermissions;
  error?: string;
}

const DEFAULTS: PermissionRules = {
  fileRead: 'allow',
  fileWrite: 'ask',
  shell: 'ask',
  network: 'ask',
  gitWrite: 'ask',
  packageInstall: 'deny',
};

const LEVELS: PermissionLevel[] = ['allow', 'ask', 'deny'];

function projectFile(cwd: string): string {
  return path.join(cwd, '.pi', 'workbench-permissions.json');
}

function cleanPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function cleanRules(value: unknown, base: PermissionRules = DEFAULTS): PermissionRules {
  const source = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rules = { ...base };
  for (const key of Object.keys(DEFAULTS) as (keyof PermissionRules)[]) {
    const level = source[key];
    if (typeof level === 'string' && LEVELS.includes(level as PermissionLevel)) {
      rules[key] = level as PermissionLevel;
    }
  }
  return rules;
}

export function readProjectPermissions(cwd: unknown): PermissionResult {
  if (typeof cwd !== 'string' || !cwd.trim()) return { ok: false, error: t('先选择项目目录') };
  const root = path.resolve(cwd);
  if (!existsSync(root)) return { ok: false, error: t('项目目录不存在') };
  const file = projectFile(root);
  // 没有项目权限文件时，新项目使用应用设置里的默认预设。
  const defaults = loadAppDefaults();
  const fallback: ProjectPermissions = {
    version: 1,
    project: root,
    updatedAt: '',
    rules: permissionPresetRules(defaults.permissionPreset),
    workspaceOnly: defaults.workspaceOnly,
    autoApprove: defaults.autoApprove,
    allowPaths: [],
    denyPaths: [],
  };
  if (!existsSync(file)) return { ok: true, path: file, permissions: fallback };
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    return {
      ok: true,
      path: file,
      permissions: {
        version: 1,
        project: root,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        rules: cleanRules(data.rules),
        workspaceOnly: data.workspaceOnly !== false,
        autoApprove: data.autoApprove === true,
        allowPaths: cleanPaths(data.allowPaths),
        denyPaths: cleanPaths(data.denyPaths),
      },
    };
  } catch (error) {
    return { ok: false, error: t('权限文件解析失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
}

export function saveProjectPermissions(input: unknown): PermissionResult {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const cwd = typeof source.cwd === 'string' ? source.cwd : '';
  if (!cwd.trim()) return { ok: false, error: t('先选择项目目录') };
  const root = path.resolve(cwd);
  if (!existsSync(root)) return { ok: false, error: t('项目目录不存在') };
  const defaults = loadAppDefaults();
  const permissions: ProjectPermissions = {
    version: 1,
    project: root,
    updatedAt: new Date().toISOString(),
    rules: cleanRules(source.rules, permissionPresetRules(defaults.permissionPreset)),
    workspaceOnly: source.workspaceOnly !== false,
    autoApprove: source.autoApprove === true,
    allowPaths: cleanPaths(source.allowPaths),
    denyPaths: cleanPaths(source.denyPaths),
  };
  const file = projectFile(root);
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(permissions, null, 2)}\n`, 'utf8');
    return { ok: true, path: file, permissions };
  } catch (error) {
    return { ok: false, path: file, error: error instanceof Error ? error.message : String(error) };
  }
}

// 工作台自身执行敏感操作前调用；Pi 工具调用仍由 Pi 的审批流程负责
export function permissionFor(cwd: string, action: keyof PermissionRules): PermissionLevel {
  const result = readProjectPermissions(cwd);
  return result.ok && result.permissions ? result.permissions.rules[action] : 'ask';
}

// 全局 Pi 扩展：在每次工具调用前读取当前项目的权限文件。
// 只读策略、只返回 block，不执行任何副作用；项目没有权限文件时完全不介入。
const GUARD_SOURCE = String.raw`// 由 Pi 工作台生成：按项目读取 .pi/workbench-permissions.json。
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Level = 'allow' | 'ask' | 'deny';

function readPolicy(cwd: string): any | null {
  try {
    return JSON.parse(readFileSync(path.join(cwd, '.pi', 'workbench-permissions.json'), 'utf8'));
  } catch {
    return null;
  }
}

function norm(cwd: string, value: string): string {
  const raw = String(value || '');
  const abs = /^([a-zA-Z]:[\\/]|\/)/.test(raw) ? path.resolve(raw) : path.resolve(cwd, raw);
  return abs.replace(/\\/g, '/');
}

function matchPath(cwd: string, list: unknown, target: string): boolean {
  if (!Array.isArray(list) || !target) return false;
  for (const item of list) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const pattern = norm(cwd, item.trim())
      .split('*')
      .map((part) => part.replace(/[.+?^\${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    if (new RegExp('^' + pattern + '(\\/.*)?$', 'i').test(target)) return true;
  }
  return false;
}

function levelsOf(rules: any, keys: string[]): Level[] {
  return keys
    .map((key) => rules && rules[key])
    .filter((level) => level === 'allow' || level === 'ask' || level === 'deny');
}

function isInside(root: string, target: string): boolean {
  const base = String(root || '').toLowerCase().replace(/\/+$/, '');
  const value = String(target || '').toLowerCase();
  if (!base) return false;
  return value === base || value.indexOf(base + '/') === 0;
}

const SYSTEM_ROOTS = [
  'c:/windows', 'c:/program files', 'c:/program files (x86)', 'c:/programdata',
  'c:/system volume information', 'c:/$recycle.bin',
  '/etc', '/usr', '/bin', '/sbin', '/boot', '/dev', '/proc', '/sys', '/system', '/library',
];

const SENSITIVE_FILES = [
  '.npmrc', '.pypirc', '.git-credentials', '.pgpass', '.netrc', '.htpasswd',
  'auth.json', 'credentials.json', 'credentials', 'secrets.json', 'secrets.yaml', 'secrets.yml',
  'login data', 'cookies', 'keychain', 'id_rsa', 'id_ed25519', 'id_ecdsa',
];
const SENSITIVE_EXTS = ['.pem', '.key', '.pfx', '.p12', '.keystore', '.jks'];
const SENSITIVE_DIRS = ['/.ssh', '/.aws', '/.gnupg', '/.kube', '/.docker'];

const SYSTEM_COMMANDS = [
  /(?:^|[\s;&|])diskpart(?:\.exe)?(?:\s|$)/i,
  /(?:^|[\s;&|])format(?:\.com)?\s+[a-z]:/i,
  /(?:^|[\s;&|])mkfs(?:\.[a-z0-9]+)?(?:\s|$)/i,
  /(?:^|[\s;&|])fdisk(?:\s|$)/i,
  /\bdd\b[^\n]*\bof\s*=\s*\/dev\//i,
  /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+\/(?:\s|$)/i,
  /\brm\s+-[a-z]*f[a-z]*r[a-z]*\s+\/(?:\s|$)/i,
  /\bdel\s+\/[fsq][^\n]*[a-z]:\\(?:\s|$)/i,
  /\b(?:rd|rmdir)\s+\/s[^\n]*[a-z]:\\(?:\s|$|["'])/i,
  /\breg(?:\.exe)?\s+delete\s+(?:hklm|hkey_local_machine)\b/i,
  /\bbcdedit(?:\.exe)?(?:\s|$)/i,
  /\bvssadmin(?:\.exe)?\s+delete\b/i,
  /\bwbadmin(?:\.exe)?\s+delete\b/i,
  /\bcipher(?:\.exe)?\s+\/w\b/i,
  /\b(?:takeown|icacls)(?:\.exe)?[^\n]*(?:[a-z]:\\windows|\\system32)\b/i,
  /\bchmod\s+-R\s+777\s+\//i,
  /:\s*\(\s*\)\s*\{[^\n]*:\s*\|\s*:\s*&/i,
];

const WRITE_TO_SYSTEM = [
  /(?:copy|cp|move|mv|xcopy|robocopy)[^\n]*(?:[a-z]:[\\/](?:windows|program files(?: \(x86\))?|programdata)\b|\/(?:etc|usr|bin|sbin|boot)\b)/i,
  /(?:del|erase|rmdir|rd|rm|Remove-Item)[^\n]*(?:[a-z]:\\windows\b|\/(?:etc|usr|bin|sbin|boot)\b)/i,
  />{1,2}\s*["']?[a-z]:[\\/](?:windows|program files(?: \(x86\))?|programdata)\b/i,
  />{1,2}\s*["']?\/(?:etc|usr|bin|sbin|boot)\//i,
];

const SENSITIVE_COMMAND = /(?:^|[\s"'=:;,(\[\\/])(?:[^\s"'&|;<>]*[\\/])?(?:\.env(?:\.[\w.-]+)?|\.npmrc|\.pypirc|\.git-credentials|\.pgpass|\.netrc|auth\.json|credentials(?:\.json)?|secrets\.(?:json|ya?ml)|login\s+data|cookies|id_rsa|id_ed25519|id_ecdsa|\.ssh|\.aws|\.gnupg|\.kube)(?=$|[\s"'&|;<>),:\]])/i;
const FILE_ACCESS = /(^|[\s;&|])(?:cat|type|more|less|head|tail|Get-Content|gc|copy|cp|scp|move|mv|del|erase|rm|Remove-Item|Set-Content|Add-Content|Out-File|notepad|code|vim|nano|curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod|irm|ssh|sftp|ftp|git)(\s|$)|>{1,2}/i;
const WRITE_VERB = /(^|[\s;&|])(?:copy|cp|scp|move|mv|del|erase|rm|rd|rmdir|mkdir|md|ren|rename|New-Item|Remove-Item|Set-Content|Add-Content|Out-File|tee|touch|install|add)(\s|$)|>{1,2}/i;
const NETWORK_COMMAND = /\b(curl|wget|invoke-webrequest|invoke-restmethod|iwr|irm|ssh|scp|sftp|ftp|telnet|nc|ncat)\b|\bnpm\s+publish\b/i;
const PACKAGE_COMMAND = /\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b|\bpip3?\s+install\b|\bwinget\s+install\b|\bchoco\s+install\b|\bscoop\s+install\b|\bcargo\s+install\b|\bgo\s+install\b|\buv\s+(pip\s+)?(add|install)\b/i;
const GIT_WRITE_COMMAND = /\bgit\s+(push|commit|merge|rebase|reset|checkout|switch|restore|clean|stash|tag|cherry-pick|revert)\b/i;
// 自动同意时仍需确认的 Git 操作：推送与可能改写/丢弃工作区的操作
const GIT_RISKY_COMMAND = /\bgit\s+(push|merge|rebase|checkout|switch|restore|clean|cherry-pick|revert)\b/i;
const DESTRUCTIVE_COMMANDS = [
  /\brm\s+-[a-z]*[rf][a-z]*\s+/i,
  /\b(?:del|erase)\s+\/[fsq]/i,
  /\b(?:rd|rmdir)\s+\/s/i,
  /\bgit\s+clean\s+-[a-z]*f|\bgit\s+reset\s+--hard\b/i,
  /\bRemove-Item\b[^\n]*-Recurse/i,
  /\b(?:shred|srm)\b/i,
];

function isSystemPath(target: string): boolean {
  const value = String(target || '').toLowerCase();
  for (const root of SYSTEM_ROOTS) {
    if (value === root || value.indexOf(root + '/') === 0) return true;
  }
  return false;
}

function isSensitivePath(target: string): boolean {
  const value = String(target || '').toLowerCase().replace(/\\/g, '/');
  const base = value.split('/').pop() || '';
  if (SENSITIVE_FILES.indexOf(base) >= 0) return true;
  if (base === '.env' || base.indexOf('.env.') === 0) return true;
  for (const ext of SENSITIVE_EXTS) {
    if (base.length > ext.length && base.slice(-ext.length) === ext) return true;
  }
  for (const dir of SENSITIVE_DIRS) {
    if (value === dir || value.indexOf(dir + '/') >= 0 || value.slice(-dir.length) === dir) return true;
  }
  return false;
}

function shellWritesOutside(cwd: string, allowPaths: unknown, command: string): boolean {
  if (!WRITE_VERB.test(command)) return false;
  const root = norm(cwd, '.');
  const matches = command.match(/[a-zA-Z]:[\\/][^\s"'<>|;&,)]*|\/(?:home|Users|tmp|var|opt|etc|usr|mnt)\/[^\s"'<>|;&,)]*/g) || [];
  for (const raw of matches) {
    const target = norm(cwd, raw.replace(/^["']|["']$/g, ''));
    if (!isInside(root, target) && !matchPath(cwd, allowPaths, target)) return true;
  }
  return false;
}

function shellTouchesSystem(command: string): boolean {
  for (const rule of WRITE_TO_SYSTEM) {
    if (rule.test(command)) return true;
  }
  return false;
}

function isShutdownCommand(command: string): boolean {
  const tokens = String(command || '').trim().split(/\s+/);
  let index = 0;
  while (index < tokens.length) {
    const name = (tokens[index].split(/[\\/]/).pop() || '').toLowerCase().replace(/^["']|["']$/g, '');
    if (name === 'sudo' || name === 'runas') {
      index += 1;
      continue;
    }
    if (name === 'cmd' || name === 'cmd.exe' || name === 'powershell' || name === 'powershell.exe' || name === 'pwsh' || name === 'start') {
      index += 1;
      const next = (tokens[index] || '').toLowerCase();
      if (next === '/c' || next === '-command' || next === '-c' || next === 'call') index += 1;
      continue;
    }
    return ['shutdown', 'shutdown.exe', 'reboot', 'poweroff', 'halt', 'halt.exe'].indexOf(name) >= 0;
  }
  return false;
}

async function gate(levels: Level[], reason: string, ctx: any, forceAsk?: boolean): Promise<{ block: true; reason: string } | undefined> {
  if (levels.includes('deny')) {
    return { block: true, reason: '工作台权限：' + reason + ' 已被项目策略禁止' };
  }
  if (!levels.includes('ask') && forceAsk !== true) return undefined;
  if (ctx && ctx.hasUI && ctx.ui && typeof ctx.ui.confirm === 'function') {
    let accepted = false;
    try {
      accepted = await ctx.ui.confirm('项目权限', reason + '？');
    } catch {
      accepted = false;
    }
    return accepted ? undefined : { block: true, reason: '工作台权限：用户拒绝了「' + reason + '」' };
  }
  return { block: true, reason: '工作台权限：「' + reason + '」需要确认，但当前没有交互界面，已阻止' };
}

export default function (pi: any) {
  pi.on('tool_call', async (event: any, ctx: any) => {
    const cwd = String((ctx && ctx.cwd) || process.cwd());
    const policy = readPolicy(cwd);
    if (!policy) return undefined;
    const rules = (policy && policy.rules) || {};
    const denyPaths = policy.denyPaths;
    const allowPaths = policy.allowPaths;
    const workspaceOnly = policy.workspaceOnly !== false;
    const autoApprove = policy.autoApprove === true;
    const root = norm(cwd, '.');
    const tool = String(event && event.toolName ? event.toolName : '');
    const input = (event && event.input) || {};

    if (tool === 'read' || tool === 'grep' || tool === 'find' || tool === 'ls') {
      const target = norm(cwd, String(input.path || input.file_path || input.filePath || '.'));
      if (matchPath(cwd, denyPaths, target)) {
        return { block: true, reason: '工作台权限：路径在禁止列表中 ' + target };
      }
      const levels = levelsOf(rules, ['fileRead']);
      if (levels.includes('deny')) return gate(levels, '读取 ' + target, ctx);
      if (isSensitivePath(target)) return gate(['ask'], '读取账号/密钥文件 ' + target, ctx);
      if (autoApprove && isInside(root, target) && levels.indexOf('ask') >= 0) return undefined;
      return gate(levels, '读取 ' + target, ctx);
    }

    if (tool === 'write' || tool === 'edit') {
      const target = norm(cwd, String(input.path || input.file_path || input.filePath || ''));
      const levels = levelsOf(rules, ['fileWrite']);
      if (!target) return gate(levels, '写入文件', ctx);
      if (matchPath(cwd, denyPaths, target)) {
        return { block: true, reason: '工作台权限：路径在禁止列表中 ' + target };
      }
      if (isSystemPath(target)) {
        return { block: true, reason: '工作台权限：系统目录受保护，禁止修改 ' + target };
      }
      if (isSensitivePath(target)) return gate(['ask'], '写入账号/密钥文件 ' + target, ctx);
      // 显式放行列表覆盖规则，但仍位于系统目录与敏感文件保护之后
      if (matchPath(cwd, allowPaths, target)) return undefined;
      if (levels.includes('deny')) return gate(levels, '写入 ' + target, ctx);
      if (workspaceOnly && levels.includes('allow') && !levels.includes('ask') && !isInside(root, target)) {
        return {
          block: true,
          reason: '工作台权限：当前为工作区自动模式，只能写入项目内；如需全机写入请选择「完全访问」。目标：' + target,
        };
      }
      // 自动同意仅覆盖项目内的写入询问；越界、凭据与系统路径已在上方拦截或强制询问
      if (autoApprove && isInside(root, target) && levels.indexOf('ask') >= 0 && !levels.includes('deny')) {
        return undefined;
      }
      return gate(levels, '写入 ' + target, ctx);
    }

    if (tool === 'bash' || tool === 'powershell') {
      const command = String(input.command || input.cmd || '');
      const shellLevels = levelsOf(rules, ['shell']);
      if (!command) return gate(shellLevels, '执行命令', ctx);
      if (shellLevels.includes('deny')) return gate(shellLevels, '执行命令', ctx);
      for (const rule of SYSTEM_COMMANDS) {
        if (rule.test(command)) {
          return { block: true, reason: '工作台权限：已阻止可能损坏系统的命令：' + command.slice(0, 160) };
        }
      }
      if (isShutdownCommand(command)) {
        return { block: true, reason: '工作台权限：已阻止关机/重启命令，避免托管任务中断：' + command.slice(0, 120) };
      }
      if (shellTouchesSystem(command)) {
        return { block: true, reason: '工作台权限：已阻止写入系统目录的命令：' + command.slice(0, 160) };
      }
      const packageInstall = PACKAGE_COMMAND.test(command);
      const gitWrite = GIT_WRITE_COMMAND.test(command);
      const gitRisky = GIT_RISKY_COMMAND.test(command);
      const network = NETWORK_COMMAND.test(command);
      const destructive = DESTRUCTIVE_COMMANDS.some((rule) => rule.test(command));
      const checks: Array<{ keys: string[]; matched: boolean; label: string }> = [
        { keys: ['packageInstall'], matched: packageInstall, label: '安装依赖' },
        { keys: ['gitWrite'], matched: gitWrite, label: 'Git 写操作' },
        { keys: ['network'], matched: network, label: '网络访问' },
      ];
      const levels: Level[] = [];
      const labels: string[] = ['执行命令'];
      for (const check of checks) {
        if (!check.matched) continue;
        for (const level of levelsOf(rules, check.keys)) levels.push(level);
        labels.push(check.label);
      }
      for (const level of shellLevels) levels.push(level);
      const sensitive = FILE_ACCESS.test(command) && SENSITIVE_COMMAND.test(command);
      const outside = workspaceOnly && shellWritesOutside(cwd, allowPaths, command);
      // 账号/密钥内容 + 联网直传：无条件阻止，避免私密信息外传
      if (sensitive && network) {
        return {
          block: true,
          reason: '工作台权限：已阻止疑似凭据外传的命令（账号/密钥文件 + 网络访问）：' + command.slice(0, 160),
        };
      }
      if (sensitive) labels.push('账号/密钥文件');
      if (outside) labels.push('工作区外的写入');
      if (destructive) labels.push('删除/重置操作');
      // 自动同意：项目内与完全访问下的普通命令（含装依赖、联网、本地提交）直接放行；
      // 账号/密钥、工作区外写入、删除/重置与 Git 改历史/推送仍强制询问
      const mustAsk = sensitive || outside || destructive || (autoApprove && gitRisky);
      if (autoApprove && !mustAsk && levels.indexOf('ask') >= 0 && !levels.includes('deny')) {
        return undefined;
      }
      return gate(levels, labels.join(' + ') + '：' + command.slice(0, 120), ctx, mustAsk);
    }

    return undefined;
  });
}
`;

export function permissionGuardPath(): string {
  return path.join(realAgentDir(), 'extensions', 'workbench-permissions.ts');
}

export function installPermissionGuard(): { ok: boolean; path?: string; error?: string } {
  const file = permissionGuardPath();
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, GUARD_SOURCE, 'utf8');
    return { ok: true, path: file };
  } catch (error) {
    return { ok: false, path: file, error: error instanceof Error ? error.message : String(error) };
  }
}

export function guardInstalled(): boolean {
  return existsSync(permissionGuardPath());
}
