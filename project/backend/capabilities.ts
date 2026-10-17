import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { backupAndWrite, readJsonFile, realAgentDir } from './config.js';
import { t } from './i18n.js';

export type CapabilityScope = 'user' | 'project';

export interface AddSkillInput {
  scope: CapabilityScope;
  cwd?: string;
  name: string;
  description?: string;
  body?: string;
  category?: string;
  tags?: string[];
  source?: string;
}

export interface AddMcpInput {
  scope: CapabilityScope;
  cwd?: string;
  name: string;
  command: string;
  argsText?: string;
  envText?: string;
  category?: string;
  tags?: string[];
  source?: string;
}

export interface InstalledMeta {
  kind: 'skill' | 'mcp' | 'extension';
  name: string;
  category?: string;
  tags: string[];
  source?: string;
  installedAt: string;
}

const META_FILE = 'workbench-catalog.json';

export interface CapabilityResult {
  ok: boolean;
  path?: string;
  error?: string;
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

function scopeDir(input: { scope: CapabilityScope; cwd?: string }): string {
  if (input.scope !== 'user' && input.scope !== 'project') throw new Error(t('作用域无效'));
  if (input.scope === 'user') return realAgentDir();
  if (typeof input.cwd !== 'string' || !input.cwd.trim()) throw new Error(t('缺少项目目录'));
  const cwd = path.resolve(input.cwd);
  if (!existsSync(cwd)) throw new Error(t('项目目录不存在'));
  return path.join(cwd, '.pi');
}

function cleanName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error(t('填写名称'));
  if (!NAME_RE.test(name) || RESERVED.has(name)) {
    throw new Error(t('名称只能包含字母、数字、点、下划线、短横线，最多 64 字符'));
  }
  return name;
}

// 分类元数据单独存放，Pi 读取 skills/mcp.json 时不会解析到它
function metadataPath(input: { scope: CapabilityScope; cwd?: string }): string {
  return path.join(scopeDir(input), META_FILE);
}

function isMeta(value: unknown): value is InstalledMeta {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (record.kind === 'skill' || record.kind === 'mcp' || record.kind === 'extension')
    && typeof record.name === 'string';
}

export function recordInstalledMeta(input: {
  scope: CapabilityScope;
  cwd?: string;
  kind: InstalledMeta['kind'];
  name: string;
  category?: string;
  tags?: string[];
  source?: string;
}): void {
  try {
    const file = metadataPath(input);
    const existing = readJsonFile(file, true);
    const source = existing.data !== null && typeof existing.data === 'object' && !Array.isArray(existing.data)
      ? existing.data as Record<string, unknown>
      : {};
    const list = Array.isArray(source.installed) ? source.installed.filter(isMeta) : [];
    const name = input.name.trim().slice(0, 120);
    if (!name) return;
    const category = input.category?.trim().slice(0, 20) || undefined;
    const tags = [...new Set((input.tags ?? []).map((item) => item.trim()).filter(Boolean))].slice(0, 8);
    const next = list.filter((item) => !(item.kind === input.kind && item.name === name));
    next.push({
      kind: input.kind,
      name,
      ...(category ? { category } : {}),
      tags,
      ...(input.source ? { source: input.source.slice(0, 200) } : {}),
      installedAt: new Date().toISOString(),
    });
    mkdirSync(path.dirname(file), { recursive: true });
    backupAndWrite(file, `${JSON.stringify({ ...source, installed: next }, null, 2)}\n`);
  } catch {
    // 元数据写入失败不影响安装本身
  }
}

export function readInstalledMeta(input: { scope: CapabilityScope; cwd?: string }): InstalledMeta[] {
  try {
    const parsed = readJsonFile(metadataPath(input), true);
    const source = parsed.data !== null && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? parsed.data as Record<string, unknown>
      : {};
    return Array.isArray(source.installed) ? source.installed.filter(isMeta) : [];
  } catch {
    return [];
  }
}

function singleLine(value: string, label: string, max: number): string {
  const text = value.trim();
  if (/[\r\n]/.test(text)) throw new Error(t('{label} 不能包含换行', { label }));
  if (text.length > max) throw new Error(t('{label} 过长', { label }));
  return text;
}

export function addSkill(input: AddSkillInput): CapabilityResult {
  try {
    const baseDir = scopeDir(input);
    const name = cleanName(input.name ?? '');
    const description = input.description ? singleLine(input.description, t('描述'), 400) : '';
    const body = typeof input.body === 'string' ? input.body.slice(0, 20000) : '';
    const dir = path.join(baseDir, 'skills', name);
    if (existsSync(dir)) throw new Error(t('同名 Skill 已存在：{name}', { name }));
    mkdirSync(dir, { recursive: true });
    const front = [
      '---',
      `name: ${name}`,
      ...(description ? [`description: ${description}`] : []),
      '---',
      '',
      body.trim() ? body.trim() : `# ${name}`,
      '',
    ].join('\n');
    const file = path.join(dir, 'SKILL.md');
    writeFileSync(file, front, 'utf8');
    recordInstalledMeta({
      scope: input.scope,
      cwd: input.cwd,
      kind: 'skill',
      name,
      category: input.category,
      tags: input.tags,
      source: input.source,
    });
    return { ok: true, path: file };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function removeSkill(input: AddSkillInput): CapabilityResult {
  try {
    const baseDir = scopeDir(input);
    const name = cleanName(input.name ?? '');
    const dir = path.join(baseDir, 'skills', name);
    const file = path.join(dir, 'SKILL.md');
    if (!existsSync(file)) return { ok: false, error: t('未找到 Skill：{name}', { name }) };
    rmSync(file);
    try {
      if (!readdirSync(dir).length) rmdirSync(dir);
    } catch {
      // 目录非空或已被删除，保留其余内容
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function parseArgs(text: string): string[] {  if (!text.trim()) return [];
  const args: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim();
    if (!value) continue;
    if (value.length > 500) throw new Error(t('参数过长'));
    args.push(value);
  }
  return args;
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const value = line.trim();
    if (!value) continue;
    const equal = value.indexOf('=');
    if (equal <= 0) throw new Error(t('第 {line} 行环境变量格式应为 KEY=VALUE', { line: index + 1 }));
    const key = value.slice(0, equal).trim();
    const val = value.slice(equal + 1);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(t('第 {line} 行环境变量名不合法：{name}', { line: index + 1, name: key }));
    }
    if (val.length > 2000) throw new Error(t('第 {line} 行环境变量值过长', { line: index + 1 }));
    env[key] = val;
  }
  return env;
}

export function addMcpServer(input: AddMcpInput): CapabilityResult {
  try {
    const baseDir = scopeDir(input);
    const name = cleanName(input.name ?? '');
    const command = singleLine(input.command ?? '', t('启动命令'), 500);
    if (!command) throw new Error(t('填写启动命令'));
    const args = parseArgs(input.argsText ?? '');
    const env = parseEnv(input.envText ?? '');

    const file = path.join(baseDir, 'mcp.json');
    const existing = readJsonFile(file, true);
    if (existing.error) throw new Error(t('MCP 配置解析失败：{error}', { error: existing.error }));
    const source = existing.data !== null && typeof existing.data === 'object' && !Array.isArray(existing.data)
      ? existing.data as Record<string, unknown>
      : {};
    const key = source.mcpServers && typeof source.mcpServers === 'object' ? 'mcpServers' : 'servers';
    const servers = source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
      ? { ...(source[key] as Record<string, unknown>) }
      : {};
    if (Object.prototype.hasOwnProperty.call(servers, name)) {
      throw new Error(t('同名 MCP 服务器已存在：{name}', { name }));
    }
    servers[name] = {
      command,
      ...(args.length ? { args } : {}),
      ...(Object.keys(env).length ? { env } : {}),
    };
    mkdirSync(baseDir, { recursive: true });
    backupAndWrite(file, `${JSON.stringify({ ...source, [key]: servers }, null, 2)}\n`);
    recordInstalledMeta({
      scope: input.scope,
      cwd: input.cwd,
      kind: 'mcp',
      name,
      category: input.category,
      tags: input.tags,
      source: input.source,
    });
    return { ok: true, path: file };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
