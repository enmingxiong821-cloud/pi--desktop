// 配置共享：项目配置导入/导出、配置模板与本机 .env 导入。
// 导出与模板只包含可共享字段，环境变量值永远不会被序列化。
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readJsonFile } from './config.js';
import { t } from './i18n.js';
import {
  mergeProjectEnv,
  normalizeSharedConfig,
  readProjectConfig,
  writeSharedConfig,
  type ProjectConfigResult,
  type SharedConfigFields,
} from './project-config.js';

export interface ConfigTemplate extends SharedConfigFields {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResult {
  ok: boolean;
  templates?: ConfigTemplate[];
  path?: string;
  error?: string;
}

interface TemplateStore {
  version: 1;
  templates: ConfigTemplate[];
}

export const EXPORT_KIND = 'pi-workbench-project';
const MAX_TEMPLATES = 20;
const MAX_NAME = 40;
const MAX_CONFIG_FILE = 64 * 1024;
const MAX_ENV_FILE = 256 * 1024;

let userDataDir = '';

export function configureConfigShare(dir: string): void {
  userDataDir = path.resolve(dir);
}

function storePath(): string {
  if (!userDataDir) throw new Error(t('应用设置尚未初始化'));
  return path.join(userDataDir, 'config-templates.json');
}

function readStore(): TemplateStore {
  try {
    const data = readJsonFile(storePath()).data;
    if (!data || typeof data !== 'object') return { version: 1, templates: [] };
    const raw = (data as Record<string, unknown>).templates;
    if (!Array.isArray(raw)) return { version: 1, templates: [] };
    const templates: ConfigTemplate[] = [];
    for (const item of raw.slice(0, MAX_TEMPLATES)) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id.slice(0, 64) : '';
      const name = typeof record.name === 'string' ? record.name.trim().slice(0, MAX_NAME) : '';
      if (!id || !name) continue;
      const normalized = normalizeSharedConfig(record);
      if (!normalized.ok) continue;
      templates.push({
        id,
        name,
        ...normalized.config,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
      });
    }
    return { version: 1, templates };
  } catch {
    return { version: 1, templates: [] };
  }
}

function writeStore(store: TemplateStore): void {
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  writeFileSync(temp, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temp, file);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f]/g, ' ').trim();
  if (!name || name.length > MAX_NAME) return null;
  return name;
}

function generateId(): string {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listConfigTemplates(): TemplateListResult {
  try {
    return { ok: true, templates: readStore().templates, path: storePath() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function saveConfigTemplate(input: unknown): TemplateListResult & { template?: ConfigTemplate; replaced?: boolean } {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const name = cleanName(source.name);
  if (!name) return { ok: false, error: t('模板名称需为 1-{count} 个字符', { count: MAX_NAME }) };
  const normalized = normalizeSharedConfig(source);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  let store: TemplateStore;
  try {
    store = readStore();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const now = new Date().toISOString();
  const existing = store.templates.find((item) => item.name.toLowerCase() === name.toLowerCase());
  let replaced = false;
  let template: ConfigTemplate;
  if (existing) {
    template = { ...existing, ...normalized.config, name, updatedAt: now };
    store.templates = store.templates.map((item) => item.id === existing.id ? template : item);
    replaced = true;
  } else {
    if (store.templates.length >= MAX_TEMPLATES) {
      return { ok: false, error: t('模板最多 {count} 个', { count: MAX_TEMPLATES }) };
    }
    template = { id: generateId(), name, ...normalized.config, createdAt: now, updatedAt: now };
    store.templates = [template, ...store.templates];
  }
  try {
    writeStore(store);
  } catch (error) {
    return { ok: false, error: t('模板写入失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  return { ok: true, templates: store.templates, template, replaced, path: storePath() };
}

export function deleteConfigTemplate(id: unknown): TemplateListResult {
  const target = typeof id === 'string' ? id : '';
  if (!target) return { ok: false, error: t('模板不存在') };
  let store: TemplateStore;
  try {
    store = readStore();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!store.templates.some((item) => item.id === target)) return { ok: false, error: t('模板不存在') };
  store.templates = store.templates.filter((item) => item.id !== target);
  try {
    writeStore(store);
  } catch (error) {
    return { ok: false, error: t('模板写入失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  return { ok: true, templates: store.templates, path: storePath() };
}

export function applyConfigTemplate(cwd: unknown, id: unknown): ProjectConfigResult {
  const target = typeof id === 'string' ? id : '';
  let template: ConfigTemplate | undefined;
  try {
    template = readStore().templates.find((item) => item.id === target);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!template) return { ok: false, error: t('模板不存在') };
  return writeSharedConfig(cwd, {
    model: template.model,
    thinking: template.thinking,
    autoStart: template.autoStart,
  });
}

export function exportProjectConfig(cwd: unknown, file: unknown): { ok: boolean; path?: string; error?: string } {
  const target = typeof file === 'string' ? file : '';
  if (!target) return { ok: false, error: t('导出路径无效') };
  const current = readProjectConfig(cwd);
  if (!current.ok || !current.config) return { ok: false, error: current.error ?? t('项目目录不存在') };
  if (current.error) return { ok: false, error: current.error };
  const payload = {
    kind: EXPORT_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    model: current.config.model,
    thinking: current.config.thinking,
    autoStart: current.config.autoStart,
  };
  try {
    writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch (error) {
    return { ok: false, error: t('配置导出失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  return { ok: true, path: target };
}

export function importProjectConfig(cwd: unknown, file: unknown): ProjectConfigResult {
  const target = typeof file === 'string' ? file : '';
  if (!target) return { ok: false, error: t('配置文件无效') };
  let text: string;
  try {
    if (statSync(target).size > MAX_CONFIG_FILE) return { ok: false, error: t('配置文件过大') };
    text = readFileSync(target, 'utf8');
  } catch (error) {
    return { ok: false, error: t('配置文件读取失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: t('配置文件不是有效的 JSON') };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: t('配置文件格式无效') };
  const record = data as Record<string, unknown>;
  if (record.kind !== undefined && record.kind !== EXPORT_KIND) return { ok: false, error: t('配置文件格式无效') };
  const normalized = normalizeSharedConfig(record);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  return writeSharedConfig(cwd, normalized.config);
}

function expandDoubleQuoted(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function closingQuote(raw: string, quote: string): number {
  for (let index = 1; index < raw.length; index += 1) {
    if (raw[index] === '\\' && quote === '"') {
      index += 1;
      continue;
    }
    if (raw[index] === quote) return index;
  }
  return -1;
}

export function parseDotEnv(text: string): { ok: boolean; env?: Record<string, string>; error?: string } {
  const env: Record<string, string> = {};
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) return { ok: false, error: t('.env 第 {line} 行缺少等号', { line: index + 1 }) };
    const name = line.slice(0, separator).trim();
    if (!name) return { ok: false, error: t('.env 第 {line} 行变量名为空', { line: index + 1 }) };
    const raw = line.slice(separator + 1).trim();
    let value: string;
    if (raw.startsWith('"')) {
      const end = closingQuote(raw, '"');
      if (end < 0) return { ok: false, error: t('.env 第 {line} 行引号未闭合', { line: index + 1 }) };
      const rest = raw.slice(end + 1).trim();
      if (rest && !rest.startsWith('#')) return { ok: false, error: t('.env 第 {line} 行格式无效', { line: index + 1 }) };
      value = expandDoubleQuoted(raw.slice(1, end));
    } else if (raw.startsWith("'")) {
      const end = closingQuote(raw, "'");
      if (end < 0) return { ok: false, error: t('.env 第 {line} 行引号未闭合', { line: index + 1 }) };
      const rest = raw.slice(end + 1).trim();
      if (rest && !rest.startsWith('#')) return { ok: false, error: t('.env 第 {line} 行格式无效', { line: index + 1 }) };
      value = raw.slice(1, end);
    } else {
      const comment = raw.search(/\s#/);
      value = comment >= 0 ? raw.slice(0, comment).trim() : raw;
    }
    env[name] = value;
  }
  return { ok: true, env };
}

export function importDotEnvFile(cwd: unknown, file: unknown): {
  ok: boolean; env?: Record<string, string>; added?: number; envPath?: string; error?: string;
} {
  const target = typeof file === 'string' ? file : '';
  if (!target) return { ok: false, error: t('.env 文件无效') };
  let text: string;
  try {
    if (statSync(target).size > MAX_ENV_FILE) return { ok: false, error: t('.env 文件过大') };
    text = readFileSync(target, 'utf8');
  } catch (error) {
    return { ok: false, error: t('.env 文件读取失败：{error}', { error: error instanceof Error ? error.message : String(error) }) };
  }
  const parsed = parseDotEnv(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (!parsed.env || !Object.keys(parsed.env).length) return { ok: false, error: t('.env 文件中没有变量') };
  return mergeProjectEnv(cwd, parsed.env);
}
