// 应用级「项目默认值」：新项目未保存自己的配置时使用；环境变量等密钥不进入这里。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PermissionRules } from './permissions.js';
import { t } from './i18n.js';

export type PermissionPresetId = 'readonly' | 'standard' | 'auto-edit' | 'full-auto' | 'full-access';
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const THINKING_LEVELS: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
export const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,120}$/;

const PRESET_RULES: Record<PermissionPresetId, PermissionRules> = {
  readonly: { fileRead: 'allow', fileWrite: 'deny', shell: 'ask', network: 'ask', gitWrite: 'deny', packageInstall: 'deny' },
  standard: { fileRead: 'allow', fileWrite: 'ask', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' },
  'auto-edit': { fileRead: 'allow', fileWrite: 'allow', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' },
  'full-auto': { fileRead: 'allow', fileWrite: 'allow', shell: 'allow', network: 'allow', gitWrite: 'allow', packageInstall: 'allow' },
  'full-access': { fileRead: 'allow', fileWrite: 'allow', shell: 'allow', network: 'allow', gitWrite: 'allow', packageInstall: 'allow' },
};

export interface AppDefaults {
  version: 1;
  permissionPreset: PermissionPresetId;
  autoApprove: boolean;
  workspaceOnly: boolean;
  model: string;
  thinking: ThinkingLevel | '';
  memorySkill: boolean;
}

export interface AppDefaultsResult {
  ok: boolean;
  defaults?: AppDefaults;
  error?: string;
}

const DEFAULTS: AppDefaults = {
  version: 1,
  permissionPreset: 'standard',
  autoApprove: false,
  workspaceOnly: true,
  model: '',
  thinking: '',
  memorySkill: true,
};

let defaultsFile = '';

export function configureAppDefaults(userDataDir: string): void {
  defaultsFile = path.join(path.resolve(userDataDir), 'app-defaults.json');
}

function filePath(): string {
  if (!defaultsFile) throw new Error(t('应用设置尚未初始化'));
  return defaultsFile;
}

export function permissionPresetRules(id: PermissionPresetId): PermissionRules {
  return { ...PRESET_RULES[id] };
}

function cleanPreset(value: unknown): PermissionPresetId {
  return typeof value === 'string' && value in PRESET_RULES ? value as PermissionPresetId : DEFAULTS.permissionPreset;
}

function cleanModel(value: unknown): string {
  if (typeof value !== 'string') return '';
  const model = value.trim();
  return MODEL_PATTERN.test(model) ? model : '';
}

function cleanThinking(value: unknown): ThinkingLevel | '' {
  return typeof value === 'string' && THINKING_LEVELS.includes(value as ThinkingLevel) ? value as ThinkingLevel : '';
}

function sanitize(value: unknown): AppDefaults {
  const source = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    version: 1,
    permissionPreset: cleanPreset(source.permissionPreset),
    autoApprove: source.autoApprove === true,
    workspaceOnly: source.workspaceOnly !== false,
    model: cleanModel(source.model),
    thinking: cleanThinking(source.thinking),
    memorySkill: source.memorySkill !== false,
  };
}

export function loadAppDefaults(): AppDefaults {
  let file = '';
  try {
    file = filePath();
  } catch {
    return { ...DEFAULTS };
  }
  if (!existsSync(file)) return { ...DEFAULTS };
  try {
    return sanitize(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppDefaults(input: unknown): AppDefaultsResult {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const preset = cleanPreset(source.permissionPreset);
  const defaults: AppDefaults = {
    version: 1,
    permissionPreset: preset,
    autoApprove: source.autoApprove === true,
    workspaceOnly: typeof source.workspaceOnly === 'boolean'
      ? source.workspaceOnly
      : preset !== 'full-access',
    model: cleanModel(source.model),
    thinking: cleanThinking(source.thinking),
    memorySkill: source.memorySkill !== false,
  };
  if (typeof source.model === 'string' && source.model.trim() && !defaults.model) {
    return { ok: false, error: t('模型标识无效') };
  }
  try {
    const file = filePath();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(defaults, null, 2)}\n`, 'utf8');
    return { ok: true, defaults };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
