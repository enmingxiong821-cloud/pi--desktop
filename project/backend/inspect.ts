import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson, readJsonFile, realAgentDir } from './config.js';
import { t } from './i18n.js';

export interface ModelEntry {
  provider: string;
  id: string;
  name?: string;
  reasoning: boolean;
  contextWindow?: number;
  relay: boolean;
  current: boolean;
}

export interface ModelReport {
  defaultProvider: string;
  defaultModel: string;
  relayProviders: string[];
  models: ModelEntry[];
  warnings: string[];
}

export interface CapabilityEntry {
  kind: 'extension' | 'skill' | 'mcp' | 'package';
  name: string;
  detail?: string;
  scope: 'user' | 'project';
}

export interface SessionEntry {
  id: string;
  path: string;
  timestamp: string;
  cwd: string;
  size: number;
}

function objectOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function modelEntries(provider: string, value: unknown): Array<{ id: string; name?: string; reasoning?: boolean; contextWindow?: number }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ id: string; name?: string; reasoning?: boolean; contextWindow?: number }> = [];
  for (const item of value) {
    if (typeof item === 'string') {
      out.push({ id: item });
      continue;
    }
    const model = objectOf(item);
    if (typeof model.id !== 'string' || !model.id) continue;
    out.push({
      id: model.id,
      name: typeof model.name === 'string' ? model.name : undefined,
      reasoning: Boolean(model.reasoning),
      contextWindow: typeof model.contextWindow === 'number' ? model.contextWindow : undefined,
    });
  }
  return out;
}

export function inspectModels(): ModelReport {
  const agentDir = realAgentDir();
  const settings = objectOf(readJson(path.join(agentDir, 'settings.json')));
  const store = objectOf(readJson(path.join(agentDir, 'models-store.json')));
  const relayConfig = objectOf(readJsonFile(path.join(agentDir, 'models.json'), true).data);
  const relayProviders = Object.keys(objectOf(relayConfig.providers));
  const defaultProvider = typeof settings.defaultProvider === 'string' ? settings.defaultProvider : '';
  const defaultModel = typeof settings.defaultModel === 'string' ? settings.defaultModel : '';

  const entries: ModelEntry[] = [];
  const seen = new Set<string>();
  const push = (provider: string, model: { id: string; name?: string; reasoning?: boolean; contextWindow?: number }): void => {
    const key = `${provider}\u0000${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      provider,
      id: model.id,
      name: model.name,
      reasoning: Boolean(model.reasoning),
      contextWindow: model.contextWindow,
      relay: relayProviders.includes(provider),
      current: provider === defaultProvider && model.id === defaultModel,
    });
  };

  for (const [provider, bucket] of Object.entries(store)) {
    for (const model of modelEntries(provider, objectOf(bucket).models)) push(provider, model);
  }
  for (const [provider, bucket] of Object.entries(objectOf(relayConfig.providers))) {
    for (const model of modelEntries(provider, objectOf(bucket).models)) push(provider, model);
  }

  entries.sort((a, b) => {
    const group = (m: ModelEntry): number => (m.relay ? 0 : m.current ? 1 : 2);
    const delta = group(a) - group(b);
    if (delta !== 0) return delta;
    const byProvider = a.provider.localeCompare(b.provider);
    return byProvider !== 0 ? byProvider : a.id.localeCompare(b.id);
  });

  const warnings: string[] = [];
  if (!entries.length) {
    warnings.push(t('未发现 models-store.json 或 models.json 中的模型。'));
  }
  if (relayProviders.length) {
    warnings.push(t('已发现 {count} 个中转站 provider；密钥不会被读取或显示。', { count: relayProviders.length }));
  }

  return {
    defaultProvider,
    defaultModel,
    relayProviders,
    models: entries.slice(0, 600),
    warnings,
  };
}

function parseSkill(file: string): { name: string; description?: string } {
  let text = '';
  try {
    text = readFileSync(file, 'utf8').slice(0, 8192);
  } catch {
    return { name: path.basename(path.dirname(file)) };
  }
  const name = /^name:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim();
  return {
    name: name || path.basename(path.dirname(file)),
    description: description ? description.replace(/^["']|["']$/g, '') : undefined,
  };
}

function scanSkills(dir: string, scope: 'user' | 'project', out: CapabilityEntry[]): void {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skillFile = path.join(full, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const skill = parseSkill(skillFile);
      out.push({ kind: 'skill', name: skill.name, detail: skill.description, scope });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      const skill = parseSkill(full);
      out.push({ kind: 'skill', name: skill.name, detail: skill.description, scope });
    }
  }
}

function scanExtensions(dir: string, scope: 'user' | 'project', out: CapabilityEntry[]): void {
  if (!existsSync(dir)) return;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(?:c|m)?[jt]s$/i.test(entry.name)) continue;
      out.push({ kind: 'extension', name: entry.name.replace(/\.(?:c|m)?[jt]s$/i, ''), detail: entry.name, scope });
    }
  } catch {
    // unreadable directories are reported by absence, not an exception
  }
}

function scanMcp(file: string, scope: 'user' | 'project', out: CapabilityEntry[]): void {
  if (!existsSync(file)) return;
  const config = objectOf(readJson(file));
  const servers = objectOf(config.mcpServers ?? config.servers);
  for (const name of Object.keys(servers)) {
    out.push({ kind: 'mcp', name, detail: path.basename(file), scope });
  }
}

export function inspectCapabilities(cwd: string): { capabilities: CapabilityEntry[]; warnings: string[] } {
  const agentDir = realAgentDir();
  const settings = objectOf(readJson(path.join(agentDir, 'settings.json')));
  const capabilities: CapabilityEntry[] = [];

  for (const entry of Array.isArray(settings.packages) ? settings.packages : []) {
    if (typeof entry === 'string') capabilities.push({ kind: 'package', name: entry, scope: 'user' });
  }

  scanExtensions(path.join(agentDir, 'extensions'), 'user', capabilities);
  scanSkills(path.join(agentDir, 'skills'), 'user', capabilities);
  scanSkills(path.join(os.homedir(), '.agents', 'skills'), 'user', capabilities);

  const projectPi = path.join(cwd, '.pi');
  scanExtensions(path.join(projectPi, 'extensions'), 'project', capabilities);
  scanSkills(path.join(projectPi, 'skills'), 'project', capabilities);
  scanSkills(path.join(cwd, '.agents', 'skills'), 'project', capabilities);

  scanMcp(path.join(agentDir, 'mcp.json'), 'user', capabilities);
  scanMcp(path.join(agentDir, 'mcp-servers.json'), 'user', capabilities);
  scanMcp(path.join(projectPi, 'mcp.json'), 'project', capabilities);
  scanMcp(path.join(cwd, '.mcp.json'), 'project', capabilities);

  const warnings: string[] = [];
  if (!capabilities.some((item) => item.kind === 'extension')) warnings.push(t('未发现用户扩展。'));
  if (!capabilities.some((item) => item.kind === 'skill')) warnings.push(t('未发现 Skills。'));
  if (!capabilities.some((item) => item.kind === 'mcp')) warnings.push(t('未发现 MCP 配置。'));

  return { capabilities, warnings };
}

export function sessionsRoots(extra: string[] = []): string[] {
  return [path.join(realAgentDir(), 'sessions'), ...extra]
    .map((item) => path.resolve(item))
    .filter((item) => existsSync(item));
}

function readFirstLine(file: string): string {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const buffer = Buffer.alloc(8192);
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read).toString('utf8').split(/\r?\n/)[0] ?? '';
  } catch {
    return '';
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function listSessions(cwd: string, extraRoots: string[] = []): SessionEntry[] {
  const target = path.resolve(cwd).toLowerCase();
  const sessions: SessionEntry[] = [];
  for (const root of sessionsRoots(extraRoots)) {
    let buckets;
    try {
      buckets = readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const bucket of buckets) {
      if (!bucket.isDirectory()) continue;
      const dir = path.join(root, bucket.name);
      let files;
      try {
        files = readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of files) {
        if (!name.toLowerCase().endsWith('.jsonl')) continue;
        const file = path.join(dir, name);
        const line = readFirstLine(file);
        if (!line) continue;
        let meta: Record<string, unknown>;
        try {
          meta = objectOf(JSON.parse(line));
        } catch {
          continue;
        }
        if (meta.type !== 'session' || typeof meta.cwd !== 'string') continue;
        if (path.resolve(meta.cwd).toLowerCase() !== target) continue;
        let size = 0;
        try {
          size = statSync(file).size;
        } catch {
          // keep the entry even if stat fails
        }
        sessions.push({
          id: typeof meta.id === 'string' ? meta.id : name,
          path: file,
          timestamp: typeof meta.timestamp === 'string' ? meta.timestamp : '',
          cwd: meta.cwd,
          size,
        });
      }
    }
  }
  sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return sessions.slice(0, 30);
}

export function isSafeSessionPath(candidate: string, extraRoots: string[] = []): boolean {
  if (typeof candidate !== 'string' || !candidate.toLowerCase().endsWith('.jsonl')) return false;
  const resolved = path.resolve(candidate).toLowerCase();
  return sessionsRoots(extraRoots).some((root) => resolved.startsWith(path.resolve(root).toLowerCase() + path.sep));
}
