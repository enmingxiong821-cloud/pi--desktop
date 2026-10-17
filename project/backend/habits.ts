// 本地使用习惯画像：只统计工作台内的操作偏好，不记录对话内容、不联网。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { realAgentDir } from './config.js';
import { t } from './i18n.js';

export type HabitType = 'model' | 'permission' | 'autopilot' | 'memory-scope' | 'language';

export interface HabitEvent {
  type: HabitType;
  value: string;
  task?: string;
}

export interface HabitSummary {
  ok: boolean;
  updatedAt?: string;
  top?: Array<{ type: HabitType; value: string; count: number; lastAt: string; task?: string }>;
  profilePath?: string;
  error?: string;
}

interface HabitCount {
  count: number;
  lastAt: string;
  task?: string;
}

interface HabitFile {
  version: 1;
  updatedAt: string;
  habits: Record<string, Record<string, HabitCount>>;
}

const HABIT_TYPES: HabitType[] = ['model', 'permission', 'autopilot', 'memory-scope', 'language'];
const MAX_VALUES_PER_TYPE = 40;
const MAX_VALUE_CHARS = 100;

function memoryRoot(): string {
  return path.join(realAgentDir(), 'workbench-memory');
}

function habitsFile(): string {
  return path.join(memoryRoot(), 'habits.json');
}

function profileFile(): string {
  return path.join(memoryRoot(), 'profile.md');
}

function emptyFile(): HabitFile {
  return { version: 1, updatedAt: '', habits: {} };
}

function readFile(): HabitFile {
  try {
    const raw = JSON.parse(readFileSync(habitsFile(), 'utf8')) as HabitFile;
    if (!raw || typeof raw !== 'object' || typeof raw.habits !== 'object' || !raw.habits) return emptyFile();
    return { version: 1, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '', habits: raw.habits };
  } catch {
    return emptyFile();
  }
}

function cleanValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_VALUE_CHARS);
}

function cleanTask(task: unknown): string | undefined {
  const value = cleanValue(task);
  return value ? value.slice(0, 40) : undefined;
}

function trimType(entries: Record<string, HabitCount>): Record<string, HabitCount> {
  const pairs = Object.entries(entries)
    .sort((left, right) => right[1].count - left[1].count || right[1].lastAt.localeCompare(left[1].lastAt))
    .slice(0, MAX_VALUES_PER_TYPE);
  return Object.fromEntries(pairs);
}

export function recordHabit(input: unknown): { ok: boolean; error?: string } {
  const data = (input ?? {}) as Record<string, unknown>;
  const type = HABIT_TYPES.includes(data.type as HabitType) ? data.type as HabitType : null;
  const value = cleanValue(data.value);
  if (!type || !value) return { ok: false, error: t('无效的习惯记录') };
  const file = readFile();
  const bucket = file.habits[type] ?? {};
  const previous = bucket[value];
  bucket[value] = {
    count: (previous?.count ?? 0) + 1,
    lastAt: new Date().toISOString(),
    ...(cleanTask(data.task) ? { task: cleanTask(data.task) } : previous?.task ? { task: previous.task } : {}),
  };
  file.habits[type] = trimType(bucket);
  file.updatedAt = new Date().toISOString();
  try {
    mkdirSync(memoryRoot(), { recursive: true });
    writeFileSync(habitsFile(), `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    writeProfile(file);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const TYPE_LABELS: Record<HabitType, string> = {
  model: '常用模型',
  permission: '权限习惯',
  autopilot: '托管习惯',
  'memory-scope': '记忆检索范围',
  language: '界面语言',
};

function writeProfile(file: HabitFile): void {
  const lines: string[] = [
    '# 用户偏好画像',
    '',
    '> 由 Pi 工作台在本机自动统计，只包含操作偏好，不含对话内容、账号或密钥。',
    `> 更新时间：${file.updatedAt || '—'}`,
    '',
    '使用方式：先按下面的习惯给出默认方案；用户当前明确指令与习惯冲突时，以当前指令为准。',
    '',
  ];
  let hasAny = false;
  for (const type of HABIT_TYPES) {
    const bucket = file.habits[type];
    if (!bucket || !Object.keys(bucket).length) continue;
    hasAny = true;
    lines.push(`## ${TYPE_LABELS[type]}`, '');
    const pairs = Object.entries(bucket)
      .sort((left, right) => right[1].count - left[1].count || right[1].lastAt.localeCompare(left[1].lastAt))
      .slice(0, 5);
    for (const [value, item] of pairs) {
      const task = item.task ? `（最近用于 ${item.task}）` : '';
      lines.push(`- ${value}：${item.count} 次${task}`);
    }
    lines.push('');
  }
  if (!hasAny) {
    lines.push('还没有足够的操作记录。随着使用会自动积累。', '');
  }
  writeFileSync(profileFile(), `${lines.join('\n')}\n`, 'utf8');
}

export function habitSummary(): HabitSummary {
  const file = readFile();
  const top: NonNullable<HabitSummary['top']> = [];
  for (const type of HABIT_TYPES) {
    const bucket = file.habits[type];
    if (!bucket) continue;
    for (const [value, item] of Object.entries(bucket)) {
      top.push({ type, value, count: item.count, lastAt: item.lastAt, ...(item.task ? { task: item.task } : {}) });
    }
  }
  top.sort((left, right) => right.count - left.count || right.lastAt.localeCompare(left.lastAt));
  try {
    if (!existsSync(profileFile())) writeProfile(file);
  } catch {
    // 画像文件失败不影响统计返回
  }
  return {
    ok: true,
    updatedAt: file.updatedAt,
    top: top.slice(0, 12),
    profilePath: profileFile(),
  };
}

export function habitProfilePath(): string {
  return profileFile();
}
