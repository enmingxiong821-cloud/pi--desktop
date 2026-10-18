// 项目级启动配置：可共享的设置写入项目 .pi/workbench.json；环境变量只存本机 userData。
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { MODEL_PATTERN, THINKING_LEVELS, type ThinkingLevel } from './app-defaults.js';
import { readJsonFile } from './config.js';
import { t } from './i18n.js';

export interface ProjectWorkConfig {
  version: 1;
  project: string;
  updatedAt: string;
  model: string;
  thinking: ThinkingLevel | '';
  // null 表示跟随应用设置里的全局自动启动开关
  autoStart: boolean | null;
}

export interface ProjectConfigResult {
  ok: boolean;
  path?: string;
  envPath?: string;
  config?: ProjectWorkConfig;
  env?: Record<string, string>;
  error?: string;
}

export interface ProjectConfigInput {
  cwd: string;
  model?: string;
  thinking?: string;
  autoStart?: boolean | null | 'follow' | 'auto' | 'manual';
  env?: Record<string, string>;
}

interface EnvStore {
  version: 1;
  projects: Record<string, { updatedAt: string; env: Record<string, string> }>;
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const RESERVED_ENV = new Set([
  'PI_CODING_AGENT_DIR',
  'PI_MANAGED_INSTALL_ROOT',
  'PI_OFFLINE',
  'NODE_OPTIONS',
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE',
  'TERM',
  'COLORTERM',
]);
const MAX_ENV_ENTRIES = 32;
const MAX_ENV_VALUE = 8192;
const MAX_ENV_PROJECTS = 40;

let userDataDir = '';

export function configureProjectConfig(dir: string): void {
  userDataDir = path.resolve(dir);
}

export function projectConfigPath(cwd: string): string {
  return path.join(path.resolve(cwd), '.pi', 'workbench.json');
}

function envStorePath(): string {
  if (!userDataDir) throw new Error(t('应用设置尚未初始化'));
  return path.join(userDataDir, 'project-env.json');
}

function resolveProject(cwd: unknown): string | null {
  if (typeof cwd !== 'string' || !cwd.trim()) return null;
  const root = path.resolve(cwd);
  try {
    if (!statSync(root).isDirectory()) return null;
  } catch {
    return null;
  }
  return root;
}

function storeKey(root: string): string {
  return process.platform === 'win32' ? root.toLowerCase() : root;
}

function readEnvStore(): EnvStore {
  try {
    const data = readJsonFile(envStorePath()).data;
    if (!data || typeof data !== 'object') return { version: 1, projects: {} };
    const projects = (data as Record<string, unknown>).projects;
    if (!projects || typeof projects !== 'object') return { version: 1, projects: {} };
    const clean: EnvStore['projects'] = {};
    for (const [key, value] of Object.entries(projects as Record<string, unknown>)) {
      if (typeof key !== 'string' || typeof value !== 'object' || value === null) continue;
      const entry = value as Record<string, unknown>;
      const env = cleanEnv(entry.env);
      if (!env.ok) continue;
      clean[key] = {
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
        env: env.env,
      };
    }
    return { version: 1, projects: clean };
  } catch {
    return { version: 1, projects: {} };
  }
}

function writeEnvStore(store: EnvStore): void {
  const file = envStorePath();
  mkdirSync(path.dirname(file), { recursive: true });
  // 环境变量可能含密钥：只写本机 userData，POSIX 下收紧为仅当前用户可读。
  writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function cleanEnv(value: unknown): { ok: true; env: Record<string, string> } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, env: {} };
  if (typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: t('环境变量格式无效') };
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_ENV_ENTRIES) return { ok: false, error: t('环境变量最多 {count} 个', { count: MAX_ENV_ENTRIES }) };
  const env: Record<string, string> = {};
  for (const [rawName, rawValue] of entries) {
    const name = rawName.trim();
    if (!name) continue;
    if (!ENV_NAME.test(name) || RESERVED_ENV.has(name) || name === '__proto__' || name === 'constructor' || name === 'prototype') {
      return { ok: false, error: t('环境变量名无效：{name}', { name: name.slice(0, 64) }) };
    }
    if (typeof rawValue !== 'string' || rawValue.length > MAX_ENV_VALUE || rawValue.includes('\u0000')) {
      return { ok: false, error: t('环境变量值无效：{name}', { name }) };
    }
    env[name] = rawValue;
  }
  return { ok: true, env };
}

function projectEnv(root: string): Record<string, string> {
  const store = readEnvStore();
  return { ...(store.projects[storeKey(root)]?.env ?? {}) };
}

export function readProjectConfig(cwd: unknown): ProjectConfigResult {
  const root = resolveProject(cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  const file = projectConfigPath(root);
  const envPath = (() => {
    try {
      return envStorePath();
    } catch {
      return '';
    }
  })();
  const env = (() => {
    try {
      return projectEnv(root);
    } catch {
      return {};
    }
  })();
  const fallback: ProjectWorkConfig = {
    version: 1,
    project: root,
    updatedAt: '',
    model: '',
    thinking: '',
    autoStart: null,
  };
  if (!existsSync(file)) return { ok: true, path: file, envPath, config: fallback, env };
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const model = typeof data.model === 'string' ? data.model.trim() : '';
    const thinking = data.thinking;
    return {
      ok: true,
      path: file,
      envPath,
      config: {
        version: 1,
        project: root,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        model: MODEL_PATTERN.test(model) ? model : '',
        thinking: typeof thinking === 'string' && THINKING_LEVELS.includes(thinking as ThinkingLevel)
          ? thinking as ThinkingLevel
          : '',
        autoStart: typeof data.autoStart === 'boolean' ? data.autoStart : null,
      },
      env,
    };
  } catch (error) {
    return {
      ok: true,
      path: file,
      envPath,
      config: fallback,
      env,
      error: t('项目配置解析失败：{error}', { error: error instanceof Error ? error.message : String(error) }),
    };
  }
}

function parseAutoStart(value: unknown): boolean | null {
  if (value === true || value === 'auto') return true;
  if (value === false || value === 'manual') return false;
  return null;
}

export interface SharedConfigFields {
  model: string;
  thinking: ThinkingLevel | '';
  autoStart: boolean | null;
}

export function normalizeSharedConfig(source: unknown): { ok: true; config: SharedConfigFields } | { ok: false; error: string } {
  const record = source !== null && typeof source === 'object' ? source as Record<string, unknown> : {};
  const rawModel = typeof record.model === 'string' ? record.model.trim() : '';
  if (rawModel && !MODEL_PATTERN.test(rawModel)) return { ok: false, error: t('模型标识无效') };
  const rawThinking = typeof record.thinking === 'string' ? record.thinking.trim() : '';
  if (rawThinking && !THINKING_LEVELS.includes(rawThinking as ThinkingLevel)) {
    return { ok: false, error: t('推理度无效') };
  }
  return {
    ok: true,
    config: {
      model: rawModel,
      thinking: rawThinking as ThinkingLevel | '',
      autoStart: parseAutoStart(record.autoStart),
    },
  };
}

// 只写可共享字段，环境变量永远不会进入项目仓库。
export function writeSharedConfig(cwd: unknown, fields: SharedConfigFields): ProjectConfigResult {
  const root = resolveProject(cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  const config: ProjectWorkConfig = {
    version: 1,
    project: root,
    updatedAt: new Date().toISOString(),
    ...fields,
  };
  const file = projectConfigPath(root);
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  } catch (error) {
    return { ok: false, path: file, error: t('项目配置写入失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  return { ok: true, path: file, config };
}

function replaceProjectEnv(root: string, env: Record<string, string>, updatedAt: string): { ok: boolean; envPath?: string; error?: string } {
  let envPath = '';
  try {
    envPath = envStorePath();
    const store = readEnvStore();
    const key = storeKey(root);
    if (Object.keys(env).length) {
      store.projects[key] = { updatedAt, env };
    } else {
      delete store.projects[key];
    }
    const entries = Object.entries(store.projects);
    if (entries.length > MAX_ENV_PROJECTS) {
      entries.sort((a, b) => String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)));
      store.projects = Object.fromEntries(entries.slice(0, MAX_ENV_PROJECTS));
    }
    writeEnvStore(store);
    return { ok: true, envPath };
  } catch (error) {
    return { ok: false, envPath, error: t('环境变量写入失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
}

export function mergeProjectEnv(cwd: unknown, incoming: unknown): {
  ok: boolean; env?: Record<string, string>; added?: number; envPath?: string; error?: string;
} {
  const root = resolveProject(cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  const cleaned = cleanEnv(incoming);
  if (!cleaned.ok) return { ok: false, error: cleaned.error };
  const current = projectEnv(root);
  const merged = { ...current, ...cleaned.env };
  if (Object.keys(merged).length > MAX_ENV_ENTRIES) {
    return { ok: false, error: t('环境变量最多 {count} 个', { count: MAX_ENV_ENTRIES }) };
  }
  const added = Object.keys(cleaned.env).filter((name) => !Object.prototype.hasOwnProperty.call(current, name)).length;
  const written = replaceProjectEnv(root, merged, new Date().toISOString());
  if (!written.ok) return { ok: false, envPath: written.envPath, error: written.error };
  return { ok: true, env: merged, added, envPath: written.envPath };
}

export function clearProjectEnv(cwd: unknown): { ok: boolean; envPath?: string; error?: string } {
  const root = resolveProject(cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  return replaceProjectEnv(root, {}, new Date().toISOString());
}

export function resetProjectConfig(cwd: unknown): ProjectConfigResult {
  const root = resolveProject(cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  const file = projectConfigPath(root);
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch (error) {
    return { ok: false, path: file, error: t('项目配置删除失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  const cleared = clearProjectEnv(root);
  if (!cleared.ok) return { ok: false, path: file, envPath: cleared.envPath, error: cleared.error };
  return {
    ok: true,
    path: file,
    envPath: cleared.envPath,
    config: { version: 1, project: root, updatedAt: '', model: '', thinking: '', autoStart: null },
    env: {},
  };
}

export function saveProjectConfig(input: unknown): ProjectConfigResult {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const root = resolveProject(source.cwd);
  if (!root) return { ok: false, error: t('项目目录不存在') };
  const normalized = normalizeSharedConfig(source);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  const envResult = cleanEnv(source.env);
  if (!envResult.ok) return { ok: false, error: envResult.error };

  const written = writeSharedConfig(root, normalized.config);
  if (!written.ok) return written;
  const config = written.config as ProjectWorkConfig;
  const envWritten = replaceProjectEnv(root, envResult.env, config.updatedAt);
  if (!envWritten.ok) return { ok: false, path: written.path, envPath: envWritten.envPath, error: envWritten.error };
  return { ok: true, path: written.path, envPath: envWritten.envPath, config, env: envResult.env };
}
