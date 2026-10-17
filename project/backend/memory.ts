// 本地长期记忆：增量摄取 Pi 会话 JSONL，建立离线全文索引；不调用任何模型、不上传数据。
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { listSessions } from './inspect.js';
import { realAgentDir } from './config.js';
import { t } from './i18n.js';

export interface MemoryEntry {
  id: string;
  project: string;
  sessionId: string;
  role: 'user' | 'assistant';
  timestamp: string;
  text: string;
}

export interface MemoryHit extends MemoryEntry {
  score: number;
  snippet: string;
}

export interface MemoryStats {
  ok: true;
  entries: number;
  projects: number;
  projectEntries: number;
  updatedAt: string;
  bytes: number;
  path: string;
}

export interface MemorySearchResult {
  ok: boolean;
  hits?: MemoryHit[];
  scanned?: number;
  error?: string;
}

export interface MemoryWriteResult {
  ok: boolean;
  path?: string;
  added?: number;
  error?: string;
}

const MAX_ENTRY_CHARS = 8000;
const MAX_INDEX_BYTES = 48 * 1024 * 1024;
const MAX_SESSION_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 40000;

function memoryRoot(): string {
  return path.join(realAgentDir(), 'workbench-memory');
}

function entriesFile(): string {
  return path.join(memoryRoot(), 'entries.jsonl');
}

function stateFile(): string {
  return path.join(memoryRoot(), 'ingest.json');
}

function objectOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function messageText(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const item of content) {
    const part = objectOf(item);
    if (part.type === 'text' && typeof part.text === 'string') parts.push(part.text);
  }
  return parts.join('\n');
}

function entryId(sessionId: string, index: number, role: string): string {
  return createHash('sha1').update(`${sessionId}:${index}:${role}`).digest('hex').slice(0, 20);
}

function readState(): Record<string, { size: number; sessionId: string }> {
  try {
    const data = JSON.parse(readFileSync(stateFile(), 'utf8')) as Record<string, unknown>;
    const state: Record<string, { size: number; sessionId: string }> = {};
    for (const [file, value] of Object.entries(data)) {
      const item = objectOf(value);
      if (typeof item.size === 'number' && typeof item.sessionId === 'string') {
        state[file] = { size: item.size, sessionId: item.sessionId };
      }
    }
    return state;
  } catch {
    return {};
  }
}

function loadEntries(): Map<string, MemoryEntry> {
  const map = new Map<string, MemoryEntry>();
  const file = entriesFile();
  if (!existsSync(file)) return map;
  try {
    if (statSync(file).size > MAX_INDEX_BYTES) {
      // 索引过大时保留尾部，避免一次性读入过多内容
      const text = readFileSync(file, 'utf8');
      const tail = text.slice(-MAX_INDEX_BYTES);
      const start = tail.indexOf('\n');
      return parseEntries(start >= 0 ? tail.slice(start + 1) : tail);
    }
    return parseEntries(readFileSync(file, 'utf8'));
  } catch {
    return map;
  }
}

function parseEntries(text: string): Map<string, MemoryEntry> {
  const map = new Map<string, MemoryEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line) as MemoryEntry;
      if (data && typeof data.id === 'string' && typeof data.text === 'string') map.set(data.id, data);
    } catch {
      // 跳过损坏行
    }
  }
  return map;
}

function parseSession(file: string, project: string, sessionId: string): MemoryEntry[] {
  let text: string;
  try {
    const size = statSync(file).size;
    if (size <= MAX_SESSION_BYTES) {
      text = readFileSync(file, 'utf8');
    } else {
      const raw = readFileSync(file);
      text = raw.subarray(raw.length - MAX_SESSION_BYTES).toString('utf8');
    }
  } catch {
    return [];
  }
  const entries: MemoryEntry[] = [];
  let index = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (record.type !== 'message') continue;
    index += 1;
    const message = objectOf(record.message);
    const role = message.role === 'user' ? 'user' : message.role === 'assistant' ? 'assistant' : null;
    if (!role) continue;
    const body = messageText(message).trim();
    if (body.length < 2) continue;
    entries.push({
      id: entryId(sessionId, index, role),
      project,
      sessionId,
      role,
      timestamp: typeof record.timestamp === 'string' ? record.timestamp : '',
      text: body.slice(0, MAX_ENTRY_CHARS),
    });
  }
  return entries;
}

export function ingestMemory(cwd: unknown): MemoryWriteResult {
  if (typeof cwd !== 'string' || !cwd.trim()) return { ok: false, error: t('先选择项目目录') };
  const project = path.resolve(cwd);
  if (!existsSync(project)) return { ok: false, error: t('项目目录不存在') };
  const sessions = listSessions(project).slice(0, 30);
  const state = readState();
  const entries = loadEntries();
  let added = 0;
  for (const session of sessions) {
    let size = 0;
    try {
      size = statSync(session.path).size;
    } catch {
      continue;
    }
    const known = state[session.path];
    if (known && known.size === size && known.sessionId === session.id) continue;
    // 同一会话重新解析时先移除旧条目，保证内容最新
    for (const [id, entry] of entries) {
      if (entry.sessionId === session.id) entries.delete(id);
    }
    const fresh = parseSession(session.path, project, session.id);
    for (const entry of fresh) entries.set(entry.id, entry);
    added += fresh.length;
    state[session.path] = { size, sessionId: session.id };
  }

  if (added === 0) {
    return { ok: true, path: entriesFile(), added: 0 };
  }

  const sorted = [...entries.values()]
    .sort((left, right) => (left.timestamp || '').localeCompare(right.timestamp || ''))
    .slice(-MAX_ENTRIES);
  mkdirSync(memoryRoot(), { recursive: true });
  writeFileSync(entriesFile(), `${sorted.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
  writeFileSync(stateFile(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return { ok: true, path: entriesFile(), added };
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  for (const word of lower.match(/[a-z0-9][a-z0-9_$./-]{1,}/g) ?? []) {
    if (word.length <= 24) tokens.push(word);
  }
  for (const run of lower.match(/[一-鿿]+/g) ?? []) {
    if (run.length === 1) {
      tokens.push(run);
      continue;
    }
    for (let index = 0; index < run.length - 1; index += 1) tokens.push(run.slice(index, index + 2));
    if (run.length <= 4) tokens.push(run);
  }
  return tokens;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  while (count < 20) {
    const found = haystack.indexOf(needle, from);
    if (found < 0) break;
    count += 1;
    from = found + needle.length;
  }
  return count;
}

function snippetOf(text: string, query: string): string {
  const lower = text.toLowerCase();
  const needle = query.trim().toLowerCase();
  const at = needle ? lower.indexOf(needle) : -1;
  if (at < 0) return text.slice(0, 320).replace(/\s+/g, ' ');
  const start = Math.max(0, at - 120);
  const end = Math.min(text.length, at + needle.length + 200);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

export function searchMemory(input: {
  query?: unknown;
  cwd?: unknown;
  scope?: unknown;
  limit?: unknown;
}): MemorySearchResult {
  const query = typeof input.query === 'string' ? input.query.trim().slice(0, 200) : '';
  if (!query) return { ok: false, error: t('填写检索内容') };
  const scope = input.scope === 'all' ? 'all' : 'project';
  const cwd = typeof input.cwd === 'string' ? path.resolve(input.cwd) : '';
  const limit = Math.min(50, Math.max(1, typeof input.limit === 'number' ? input.limit : 20));
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return { ok: false, error: t('检索词过短') };
  const entries = loadEntries();
  const hits: MemoryHit[] = [];
  let scanned = 0;
  for (const entry of entries.values()) {
    if (scope === 'project' && cwd && entry.project.toLowerCase() !== cwd.toLowerCase()) continue;
    scanned += 1;
    const lower = entry.text.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      const tf = countOccurrences(lower, token);
      if (tf) score += tf * (token.length > 1 ? 1.5 : 1);
    }
    if (score === 0) {
      if (!lower.includes(query.toLowerCase())) continue;
      score = 1;
    }
    if (query.length >= 3 && lower.includes(query.toLowerCase())) score += 12;
    const ageDays = entry.timestamp ? Math.max(0, (Date.now() - Date.parse(entry.timestamp)) / 86_400_000) : 365;
    score += Math.max(0, 4 - ageDays / 30);
    hits.push({ ...entry, score, snippet: snippetOf(entry.text, query) });
  }
  hits.sort((left, right) => right.score - left.score || right.timestamp.localeCompare(left.timestamp));
  return { ok: true, hits: hits.slice(0, limit), scanned };
}

export function memoryStats(cwd?: unknown): MemoryStats {
  const project = typeof cwd === 'string' && cwd ? path.resolve(cwd) : '';
  const entries = loadEntries();
  const projects = new Set<string>();
  let projectEntries = 0;
  let updatedAt = '';
  for (const entry of entries.values()) {
    projects.add(entry.project);
    if (project && entry.project.toLowerCase() === project.toLowerCase()) projectEntries += 1;
    if (entry.timestamp > updatedAt) updatedAt = entry.timestamp;
  }
  let bytes = 0;
  try {
    bytes = statSync(entriesFile()).size;
  } catch {
    bytes = 0;
  }
  return {
    ok: true,
    entries: entries.size,
    projects: projects.size,
    projectEntries,
    updatedAt,
    bytes,
    path: entriesFile(),
  };
}

export function recentMemory(cwd: unknown, limit = 12): MemoryHit[] {
  const project = typeof cwd === 'string' && cwd ? path.resolve(cwd) : '';
  const entries = [...loadEntries().values()]
    .filter((entry) => !project || entry.project.toLowerCase() === project.toLowerCase())
    .sort((left, right) => (right.timestamp || '').localeCompare(left.timestamp || ''))
    .slice(0, Math.min(50, Math.max(1, limit)));
  return entries.map((entry) => ({
    ...entry,
    score: 0,
    snippet: entry.text.slice(0, 280).replace(/\s+/g, ' '),
  }));
}

const SKILL_MARKER = '<!-- workbench-managed: 3 -->';

const SKILL_BODY = `---
name: workbench-memory
description: 检索本机工作台保存的长期记忆（历史会话、项目决策、用户习惯与代码片段）。需要回忆过去上下文或按用户习惯工作时使用。
---
${SKILL_MARKER}

# 工作台长期记忆

本机离线记忆库由 Pi 工作台维护，数据只保存在本机，不联网。

## 用户偏好画像

工作台会把用户的操作习惯汇总到 \`__PROFILE__\`。在开始任务、选择模型或调整权限前先读一次，
按画像里的偏好给出默认方案；用户当前明确指令与画像冲突时，以当前指令为准。

## 何时使用

- 用户提到“之前说过 / 上次的决定 / 继续那个任务”，而当前上下文里没有细节。
- 需要查历史报错、命令、文件路径或设计决策。
- 需要判断用户习惯（常用模型、权限松紧、托管方式）以主动给出合适方案。

## 如何检索

运行下面的命令（把查询词替换为具体关键词）：

\`\`\`bash
node "__RECALL__" "查询词"
\`\`\`

- 默认只搜当前项目；加 \`--all\` 搜索全部项目。
- 输出是 JSON，按相关度排序，每条包含时间、角色、项目和文本片段。
- 只引用与当前任务相关的内容；不要把无关历史塞进回答。
- 记忆是历史快照，可能与当前代码不一致；以当前文件为准。

## 维护

- 工作会议台「长期记忆」栏的「摄取会话」增量更新，不会调用模型、不产生费用。
- 如需清除记忆，删除 \`~/.pi/agent/workbench-memory/entries.jsonl\`。
`;

const RECALL_SCRIPT = `#!/usr/bin/env node
// 工作台长期记忆检索脚本：离线读取 entries.jsonl，按词频与时间排序。
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = path.join(os.homedir(), '.pi', 'agent', 'workbench-memory', 'entries.jsonl');
const args = process.argv.slice(2);
const all = args.includes('--all');
const query = args.filter((item) => item !== '--all').join(' ').trim();
if (!query) {
  console.error('用法: node recall.mjs "查询词" [--all]');
  process.exit(2);
}

function tokens(text) {
  const lower = text.toLowerCase();
  const out = [];
  for (const word of lower.match(/[a-z0-9][a-z0-9_$./-]{1,}/g) || []) if (word.length <= 24) out.push(word);
  for (const run of lower.match(/[\\u4e00-\\u9fff]+/g) || []) {
    if (run.length === 1) out.push(run);
    else {
      for (let i = 0; i < run.length - 1; i += 1) out.push(run.slice(i, i + 2));
      if (run.length <= 4) out.push(run);
    }
  }
  return [...new Set(out)];
}

function count(text, needle) {
  let n = 0;
  let from = 0;
  while (n < 20) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    n += 1;
    from = at + needle.length;
  }
  return n;
}

let entries = [];
try {
  entries = readFileSync(file, 'utf8').split(/\\r?\\n/).filter(Boolean).map((line) => JSON.parse(line));
} catch {
  console.log(JSON.stringify({ ok: true, hits: [], note: '记忆库为空，先在 Pi 工作台摄取会话' }, null, 2));
  process.exit(0);
}
const cwd = process.cwd().toLowerCase();
const wanted = tokens(query);
const hits = [];
for (const entry of entries) {
  if (!all && entry.project && entry.project.toLowerCase() !== cwd) continue;
  const text = entry.text.toLowerCase();
  let score = 0;
  for (const token of wanted) {
    const n = count(text, token);
    if (n) score += n * (token.length > 1 ? 1.5 : 1);
  }
  if (text.includes(query.toLowerCase())) score += 12;
  if (!score) continue;
  hits.push({ timestamp: entry.timestamp, role: entry.role, project: entry.project, text: entry.text.slice(0, 700), score });
}
hits.sort((a, b) => b.score - a.score || String(b.timestamp).localeCompare(String(a.timestamp)));
console.log(JSON.stringify({ ok: true, query, hits: hits.slice(0, 12) }, null, 2));
`;

export function installMemorySkill(): MemoryWriteResult {
  const root = path.join(realAgentDir(), 'skills', 'workbench-memory');
  const recall = path.join(root, 'recall.mjs');
  const profile = path.join(realAgentDir(), 'workbench-memory', 'profile.md');
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(recall, RECALL_SCRIPT, 'utf8');
    writeFileSync(
      path.join(root, 'SKILL.md'),
      SKILL_BODY
        .replace('__RECALL__', recall)
        .replace('__PROFILE__', profile),
      'utf8',
    );
    return { ok: true, path: root };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 默认自动装配：缺失或由工作台生成时写入最新版；用户自建的同名 Skill 不覆盖。
export function ensureMemorySkill(): MemoryWriteResult {
  const file = memorySkillPath();
  try {
    if (existsSync(file)) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes('workbench-managed') && !text.includes('工作台长期记忆')) {
        return { ok: true, path: path.dirname(file) };
      }
    }
    return installMemorySkill();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function memorySkillPath(): string {
  return path.join(realAgentDir(), 'skills', 'workbench-memory', 'SKILL.md');
}
