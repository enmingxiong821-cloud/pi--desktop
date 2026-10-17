// 只读统计 Pi 会话的 token 与缓存用量：数据来自本机 session JSONL，不联网。
import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { backupAndWrite, readJsonFile, realAgentDir } from './config.js';
import { listSessions } from './inspect.js';

export interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

export interface ModelUsage extends UsageTotals {
  provider: string;
  model: string;
}

export interface SessionUsage {
  id: string;
  path: string;
  startedAt: string;
  updatedAt: string;
  size: number;
  cacheHitRate: number;
  totals: UsageTotals;
  models: ModelUsage[];
}

export interface UsageReport {
  ok: true;
  sessions: SessionUsage[];
  totals: UsageTotals;
  cacheHitRate: number;
  generatedAt: string;
}

const MAX_SESSIONS = 20;
const MAX_READ_BYTES = 16 * 1024 * 1024;

function emptyTotals(): UsageTotals {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: 0, requests: 0 };
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function rate(cacheRead: number, input: number): number {
  const totalInput = cacheRead + input;
  return totalInput > 0 ? cacheRead / totalInput : 0;
}

function objectOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

// 大文件只读尾部；截断处的半行会被 JSON.parse 丢弃，不影响统计
function readSessionText(file: string, size: number): string | null {
  if (size <= MAX_READ_BYTES) {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  }
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const buffer = Buffer.allocUnsafe(MAX_READ_BYTES);
    readSync(fd, buffer, 0, MAX_READ_BYTES, size - MAX_READ_BYTES);
    return buffer.toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // 读取失败时忽略关闭错误
      }
    }
  }
}

function addTo(target: UsageTotals, source: UsageTotals): void {
  target.input += source.input;
  target.output += source.output;
  target.cacheRead += source.cacheRead;
  target.cacheWrite += source.cacheWrite;
  target.totalTokens += source.totalTokens;
  target.cost += source.cost;
  target.requests += source.requests;
}

// 逐行解析 JSONL，只提取 message.usage，不读取消息正文
function parseSession(file: string, size: number): { totals: UsageTotals; models: ModelUsage[] } | null {
  const text = readSessionText(file, size);
  if (!text) return null;
  const totals = emptyTotals();
  const models = new Map<string, ModelUsage>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (record.type !== 'message') continue;
    const message = objectOf(record.message);
    const usage = objectOf(message.usage);
    const entry: UsageTotals = {
      input: num(usage.input),
      output: num(usage.output),
      cacheRead: num(usage.cacheRead),
      cacheWrite: num(usage.cacheWrite),
      totalTokens: num(usage.totalTokens),
      cost: num(objectOf(usage.cost).total),
      requests: 0,
    };
    if (!entry.totalTokens) {
      entry.totalTokens = entry.input + entry.output + entry.cacheRead + entry.cacheWrite;
    }
    if (!entry.totalTokens && !entry.cost) continue;
    entry.requests = 1;
    addTo(totals, entry);
    const provider = typeof message.provider === 'string' ? message.provider : 'unknown';
    const model = typeof message.model === 'string' ? message.model : 'unknown';
    const key = `${provider}/${model}`;
    const bucket = models.get(key) ?? { provider, model, ...emptyTotals() };
    addTo(bucket, entry);
    models.set(key, bucket);
  }
  return {
    totals,
    models: [...models.values()].sort((left, right) => right.totalTokens - left.totalTokens),
  };
}

export function usageReport(cwd: string, extraRoots: string[] = []): UsageReport {
  const entries = listSessions(cwd, extraRoots).slice(0, MAX_SESSIONS);
  const sessions: SessionUsage[] = [];
  const totals = emptyTotals();
  for (const entry of entries) {
    let size = entry.size;
    let updatedAt = entry.timestamp;
    try {
      const info = statSync(entry.path);
      size = info.size;
      updatedAt = info.mtime.toISOString();
    } catch {
      // 文件被移走时保留列表里的元数据
    }
    const parsed = parseSession(entry.path, size);
    if (!parsed) continue;
    addTo(totals, parsed.totals);
    sessions.push({
      id: entry.id,
      path: entry.path,
      startedAt: entry.timestamp,
      updatedAt,
      size,
      cacheHitRate: rate(parsed.totals.cacheRead, parsed.totals.input),
      totals: parsed.totals,
      models: parsed.models,
    });
  }
  // listSessions 已按会话时间倒序，保持最新会话在最前
  return {
    ok: true,
    sessions,
    totals,
    cacheHitRate: rate(totals.cacheRead, totals.input),
    generatedAt: new Date().toISOString(),
  };
}

export interface TokenSavingsResult {
  ok: boolean;
  path?: string;
  backup?: string;
  applied?: Record<string, unknown>;
  error?: string;
}

// 把省 token 配置合并进全局 Pi settings.json：保留其他键，写前自动备份
export function applyGlobalTokenSavings(): TokenSavingsResult {
  const file = path.join(realAgentDir(), 'settings.json');
  const parsed = readJsonFile(file, true);
  if (parsed.error) {
    return { ok: false, path: file, error: `settings.json 解析失败：${parsed.error}` };
  }
  const settings = objectOf(parsed.data);
  const applied = {
    compaction: {
      ...objectOf(settings.compaction),
      enabled: true,
      reserveTokens: 16384,
      keepRecentTokens: 16000,
    },
    cacheWarming: 'streaming',
    showCacheMissNotices: true,
  };
  try {
    const backup = backupAndWrite(file, `${JSON.stringify({ ...settings, ...applied }, null, 2)}\n`);
    return { ok: true, path: file, backup, applied };
  } catch (error) {
    return { ok: false, path: file, error: error instanceof Error ? error.message : String(error) };
  }
}
