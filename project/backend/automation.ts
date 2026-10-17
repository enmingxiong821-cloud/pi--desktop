import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { t } from './i18n.js';

export type ScheduleKind = 'interval' | 'daily' | 'weekly' | 'cron';

export interface Schedule {
  kind: ScheduleKind;
  minutes?: number;
  time?: string;
  days?: number[];
  cron?: string;
}

export type AutomationAction =
  | { type: 'pi-prompt'; prompt: string }
  | { type: 'shell'; command: string; argsText?: string }
  | { type: 'open-url'; url: string }
  | { type: 'open-path'; target: string }
  | { type: 'notify'; title: string; body: string }
  | { type: 'agent'; agentId: string; prompt: string };

export interface AutomationJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: Schedule;
  action: AutomationAction;
  cwd?: string;
  channelIds: string[];
  notifyOn: 'always' | 'failure' | 'never';
  createdAt: string;
  lastRunAt?: string;
  lastStatus?: 'ok' | 'error';
  lastMessage?: string;
  nextRunAt?: string;
}

export type ChannelType = 'webhook' | 'wecom' | 'feishu' | 'telegram';

export interface ChannelConfig {
  id: string;
  name: string;
  type: ChannelType;
  url: string;
  token?: string;
  chatId?: string;
  enabled: boolean;
}

export interface AutomationState {
  jobs: AutomationJob[];
  channels: ChannelConfig[];
}

export interface RunResult {
  ok: boolean;
  message: string;
}

export interface PublicChannel {
  id: string;
  name: string;
  type: ChannelType;
  url: string;
  chatId?: string;
  hasToken: boolean;
  enabled: boolean;
}

const MAX_JOBS = 100;
const MAX_CHANNELS = 20;
const MAX_MESSAGE = 1600;

const EMPTY: AutomationState = { jobs: [], channels: [] };

export function statePath(dataDir: string): string {
  return path.join(dataDir, 'automation.json');
}

function readState(dataDir: string): AutomationState {
  try {
    const file = statePath(dataDir);
    if (!existsSync(file)) return { jobs: [], channels: [] };
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { jobs: [], channels: [] };
    const source = raw as Record<string, unknown>;
    return {
      jobs: Array.isArray(source.jobs) ? source.jobs.filter(isJob) as AutomationJob[] : [],
      channels: Array.isArray(source.channels) ? source.channels.filter(isChannel) as ChannelConfig[] : [],
    };
  } catch {
    return { jobs: [], channels: [] };
  }
}

function isJob(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const job = value as Record<string, unknown>;
  return typeof job.id === 'string' && typeof job.name === 'string'
    && Boolean(job.schedule) && Boolean(job.action);
}

function isChannel(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const channel = value as Record<string, unknown>;
  return typeof channel.id === 'string' && typeof channel.url === 'string';
}

function writeState(dataDir: string, state: AutomationState): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(statePath(dataDir), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTime(value: unknown): { hour: number; minute: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function nextDaily(time: string, from: Date): Date {
  const parsed = parseTime(time) ?? { hour: 9, minute: 0 };
  const next = new Date(from);
  next.setHours(parsed.hour, parsed.minute, 0, 0);
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function nextWeekly(time: string, days: number[], from: Date): Date {
  const parsed = parseTime(time) ?? { hour: 9, minute: 0 };
  const allowed = [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  if (!allowed.length) allowed.push(1, 2, 3, 4, 5);
  const next = new Date(from);
  next.setHours(parsed.hour, parsed.minute, 0, 0);
  for (let offset = 0; offset < 14; offset++) {
    const candidate = new Date(next);
    candidate.setDate(next.getDate() + offset);
    if (candidate.getTime() <= from.getTime()) continue;
    if (allowed.includes(candidate.getDay())) return candidate;
  }
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

interface CronField {
  any: boolean;
  values: Set<number>;
}

function parseCronField(text: string, min: number, max: number): CronField | null {
  const values = new Set<number>();
  let any = false;
  for (const part of text.split(',')) {
    const token = part.trim();
    if (!token) return null;
    const stepMatch = /^(\*|\d+-\d+)\/(\d+)$/.exec(token);
    const single = /^\d+$/.exec(token);
    const range = /^(\d+)-(\d+)$/.exec(token);
    if (token === '*') {
      any = true;
      for (let value = min; value <= max; value++) values.add(value);
    } else if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (step <= 0) return null;
      let start = min;
      let end = max;
      if (stepMatch[1] !== '*') {
        const bounds = /^(\d+)-(\d+)$/.exec(stepMatch[1]);
        if (!bounds) return null;
        start = Number(bounds[1]);
        end = Number(bounds[2]);
      }
      if (start < min || end > max || start > end) return null;
      for (let value = start; value <= end; value += step) values.add(value);
    } else if (single) {
      const value = Number(single[0]);
      if (value < min || value > max) return null;
      values.add(value);
    } else if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < min || end > max || start > end) return null;
      for (let value = start; value <= end; value++) values.add(value);
    } else {
      return null;
    }
  }
  return values.size ? { any, values } : null;
}

function parseCron(expr: string): { minute: CronField; hour: CronField; day: CronField; month: CronField; weekday: CronField } | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const minute = parseCronField(parts[0], 0, 59);
  const hour = parseCronField(parts[1], 0, 23);
  const day = parseCronField(parts[2], 1, 31);
  const month = parseCronField(parts[3], 1, 12);
  const weekday = parseCronField(parts[4], 0, 6);
  if (!minute || !hour || !day || !month || !weekday) return null;
  return { minute, hour, day, month, weekday };
}

function nextCron(expr: string, from: Date): Date | null {
  const cron = parseCron(expr);
  if (!cron) return null;
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = from.getTime() + 366 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= limit) {
    const dom = cron.day.values.has(cursor.getDate());
    const dow = cron.weekday.values.has(cursor.getDay());
    const dayMatches = cron.day.any || cron.weekday.any ? dom && dow : dom || dow;
    if (
      cron.month.values.has(cursor.getMonth() + 1)
      && cron.hour.values.has(cursor.getHours())
      && cron.minute.values.has(cursor.getMinutes())
      && dayMatches
    ) {
      return new Date(cursor);
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return null;
}

export function nextRunAt(schedule: Schedule, from = new Date()): Date | null {
  if (schedule.kind === 'interval') {
    const minutes = clamp(Math.round(Number(schedule.minutes) || 0), 1, 7 * 24 * 60);
    return new Date(from.getTime() + minutes * 60_000);
  }
  if (schedule.kind === 'daily') return nextDaily(schedule.time ?? '09:00', from);
  if (schedule.kind === 'weekly') return nextWeekly(schedule.time ?? '09:00', schedule.days ?? [], from);
  if (schedule.kind === 'cron') return nextCron(schedule.cron ?? '', from);
  return null;
}

export function validateJob(input: unknown): { ok: true; job: Omit<AutomationJob, 'id' | 'createdAt'> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: t('任务配置无效') };
  const source = input as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (!name) return { ok: false, error: t('填写任务名称') };
  if (name.length > 80) return { ok: false, error: t('任务名称过长') };

  const scheduleSource = source.schedule && typeof source.schedule === 'object' ? source.schedule as Record<string, unknown> : {};
  const kind = scheduleSource.kind;
  if (kind !== 'interval' && kind !== 'daily' && kind !== 'weekly' && kind !== 'cron') {
    return { ok: false, error: t('选择执行周期') };
  }
  const schedule: Schedule = { kind };
  if (kind === 'interval') {
    const minutes = Number(scheduleSource.minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 7 * 24 * 60) {
      return { ok: false, error: t('间隔需在 1 分钟到 7 天之间') };
    }
    schedule.minutes = Math.round(minutes);
  } else if (kind === 'daily' || kind === 'weekly') {
    const time = typeof scheduleSource.time === 'string' ? scheduleSource.time : '';
    if (!parseTime(time)) return { ok: false, error: t('时间格式应为 HH:MM') };
    schedule.time = time;
    if (kind === 'weekly') {
      const days = Array.isArray(scheduleSource.days) ? scheduleSource.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [];
      if (!days.length) return { ok: false, error: t('至少选择一天') };
      schedule.days = [...new Set(days)];
    }
  } else {
    const cron = typeof scheduleSource.cron === 'string' ? scheduleSource.cron.trim() : '';
    if (!parseCron(cron)) return { ok: false, error: t('cron 表达式无效（5 段：分 时 日 月 周）') };
    schedule.cron = cron;
  }

  const actionSource = source.action && typeof source.action === 'object' ? source.action as Record<string, unknown> : {};
  const actionType = actionSource.type;
  let action: AutomationAction;
  if (actionType === 'pi-prompt') {
    const prompt = typeof actionSource.prompt === 'string' ? actionSource.prompt.trim() : '';
    if (!prompt) return { ok: false, error: t('填写提示词') };
    if (prompt.length > 8000) return { ok: false, error: t('提示词过长') };
    action = { type: 'pi-prompt', prompt };
  } else if (actionType === 'shell') {
    const command = typeof actionSource.command === 'string' ? actionSource.command.trim() : '';
    if (!command) return { ok: false, error: t('填写命令') };
    if (command.length > 1000) return { ok: false, error: t('命令过长') };
    const argsText = typeof actionSource.argsText === 'string' ? actionSource.argsText.slice(0, 4000) : '';
    action = { type: 'shell', command, argsText };
  } else if (actionType === 'open-url') {
    const url = typeof actionSource.url === 'string' ? actionSource.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: t('只支持 http / https 链接') };
    if (url.length > 2000) return { ok: false, error: t('链接过长') };
    action = { type: 'open-url', url };
  } else if (actionType === 'open-path') {
    const target = typeof actionSource.target === 'string' ? actionSource.target.trim() : '';
    if (!target) return { ok: false, error: t('填写路径') };
    action = { type: 'open-path', target };
  } else if (actionType === 'notify') {
    const title = typeof actionSource.title === 'string' ? actionSource.title.trim() : '';
    const body = typeof actionSource.body === 'string' ? actionSource.body.trim() : '';
    if (!title) return { ok: false, error: t('填写通知标题') };
    action = { type: 'notify', title: title.slice(0, 120), body: body.slice(0, 2000) };
  } else if (actionType === 'agent') {
    const agentId = typeof actionSource.agentId === 'string' ? actionSource.agentId.trim() : '';
    const prompt = typeof actionSource.prompt === 'string' ? actionSource.prompt.trim() : '';
    if (!agentId) return { ok: false, error: t('选择 Agent') };
    if (!prompt) return { ok: false, error: t('填写提示词') };
    action = { type: 'agent', agentId, prompt: prompt.slice(0, 8000) };
  } else {
    return { ok: false, error: t('选择动作类型') };
  }

  const channelIds = Array.isArray(source.channelIds)
    ? source.channelIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_CHANNELS)
    : [];
  const cwd = typeof source.cwd === 'string' && source.cwd.trim() ? path.resolve(source.cwd) : undefined;
  const notifyOn = source.notifyOn === 'always' || source.notifyOn === 'never' || source.notifyOn === 'failure'
    ? source.notifyOn
    : 'failure';

  return {
    ok: true,
    job: { name, enabled: source.enabled !== false, schedule, action, cwd, channelIds, notifyOn },
  };
}

export class AutomationStore {
  private state: AutomationState;
  private timer: NodeJS.Timeout | null = null;
  private executor: ((job: AutomationJob) => Promise<RunResult>) | null = null;
  private running = new Set<string>();

  constructor(private readonly dataDir: string) {
    this.state = readState(dataDir);
    for (const job of this.state.jobs) {
      if (job.enabled) {
        const next = nextRunAt(job.schedule);
        job.nextRunAt = next ? next.toISOString() : undefined;
      }
    }
  }

  setExecutor(executor: (job: AutomationJob) => Promise<RunResult>): void {
    this.executor = executor;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), 20_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  list(): { jobs: AutomationJob[]; channels: PublicChannel[] } {
    return {
      jobs: this.state.jobs,
      channels: this.state.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        url: channel.url,
        chatId: channel.chatId,
        hasToken: Boolean(channel.token),
        enabled: channel.enabled,
      })),
    };
  }

  saveJob(input: unknown, id?: string): { ok: boolean; job?: AutomationJob; error?: string } {
    const checked = validateJob(input);
    if (!checked.ok) return checked;
    const existingIndex = id ? this.state.jobs.findIndex((job) => job.id === id) : -1;
    if (existingIndex < 0 && this.state.jobs.length >= MAX_JOBS) {
      return { ok: false, error: t('任务数量已达上限') };
    }
    const base = checked.job;
    const next = nextRunAt(base.schedule);
    if (existingIndex >= 0) {
      const job: AutomationJob = {
        ...this.state.jobs[existingIndex],
        ...base,
        nextRunAt: base.enabled && next ? next.toISOString() : undefined,
      };
      this.state.jobs[existingIndex] = job;
      this.persist();
      return { ok: true, job };
    }
    const job: AutomationJob = {
      ...base,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      nextRunAt: base.enabled && next ? next.toISOString() : undefined,
    };
    this.state.jobs.unshift(job);
    this.persist();
    return { ok: true, job };
  }

  deleteJob(id: string): boolean {
    const before = this.state.jobs.length;
    this.state.jobs = this.state.jobs.filter((job) => job.id !== id);
    if (this.state.jobs.length !== before) this.persist();
    return this.state.jobs.length !== before;
  }

  toggleJob(id: string, enabled: boolean): boolean {
    const job = this.state.jobs.find((item) => item.id === id);
    if (!job) return false;
    job.enabled = enabled;
    const next = enabled ? nextRunAt(job.schedule) : null;
    job.nextRunAt = next ? next.toISOString() : undefined;
    this.persist();
    return true;
  }

  async runNow(id: string): Promise<RunResult> {
    const job = this.state.jobs.find((item) => item.id === id);
    if (!job) return { ok: false, message: t('任务不存在') };
    return this.execute(job, true);
  }

  saveChannel(input: unknown, id?: string): { ok: boolean; channel?: PublicChannel; error?: string } {
    if (!input || typeof input !== 'object') return { ok: false, error: t('通道配置无效') };
    const source = input as Record<string, unknown>;
    const name = typeof source.name === 'string' ? source.name.trim() : '';
    if (!name) return { ok: false, error: t('填写通道名称') };
    const type = source.type;
    if (type !== 'webhook' && type !== 'wecom' && type !== 'feishu' && type !== 'telegram') {
      return { ok: false, error: t('选择通道类型') };
    }
    let url = typeof source.url === 'string' ? source.url.trim() : '';
    const token = typeof source.token === 'string' ? source.token.trim() : '';
    if (type === 'telegram') {
      if (!token) return { ok: false, error: t('填写 Telegram Bot Token') };
      url = `https://api.telegram.org/bot${token}/sendMessage`;
    }
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: t('Webhook 需为 http / https 地址') };
    if (url.length > 2000) return { ok: false, error: t('地址过长') };
    const existingIndex = id ? this.state.channels.findIndex((channel) => channel.id === id) : -1;
    if (existingIndex < 0 && this.state.channels.length >= MAX_CHANNELS) {
      return { ok: false, error: t('通道数量已达上限') };
    }
    const stored: ChannelConfig = {
      id: existingIndex >= 0 ? this.state.channels[existingIndex].id : randomUUID(),
      name,
      type,
      url,
      token: token || (existingIndex >= 0 ? this.state.channels[existingIndex].token : undefined),
      chatId: typeof source.chatId === 'string' ? source.chatId.trim() : undefined,
      enabled: source.enabled !== false,
    };
    if (existingIndex >= 0) this.state.channels[existingIndex] = stored;
    else this.state.channels.push(stored);
    this.persist();
    return {
      ok: true,
      channel: {
        id: stored.id,
        name: stored.name,
        type: stored.type,
        url: stored.url,
        chatId: stored.chatId,
        hasToken: Boolean(stored.token),
        enabled: stored.enabled,
      },
    };
  }

  deleteChannel(id: string): boolean {
    const before = this.state.channels.length;
    this.state.channels = this.state.channels.filter((channel) => channel.id !== id);
    if (this.state.channels.length === before) return false;
    for (const job of this.state.jobs) {
      job.channelIds = job.channelIds.filter((channelId) => channelId !== id);
    }
    this.persist();
    return true;
  }

  async testChannel(id: string): Promise<RunResult> {
    const channel = this.state.channels.find((item) => item.id === id);
    if (!channel) return { ok: false, message: t('通道不存在') };
    return this.sendChannel(channel, t('Pi 工作台测试消息'));
  }

  private persist(): void {
    writeState(this.dataDir, this.state);
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const job of this.state.jobs) {
      if (!job.enabled || this.running.has(job.id)) continue;
      const due = job.nextRunAt ? Date.parse(job.nextRunAt) : NaN;
      if (!Number.isFinite(due)) {
        const next = nextRunAt(job.schedule);
        job.nextRunAt = next ? next.toISOString() : undefined;
        continue;
      }
      if (due > now) continue;
      await this.execute(job, false);
    }
    this.persist();
  }

  private async execute(job: AutomationJob, manual: boolean): Promise<RunResult> {
    if (this.running.has(job.id)) return { ok: false, message: t('任务正在执行') };
    this.running.add(job.id);
    const started = new Date();
    let result: RunResult;
    try {
      result = this.executor ? await this.executor(job) : { ok: false, message: t('执行器未就绪') };
    } catch (error) {
      result = { ok: false, message: error instanceof Error ? error.message : String(error) };
    } finally {
      this.running.delete(job.id);
    }
    job.lastRunAt = started.toISOString();
    job.lastStatus = result.ok ? 'ok' : 'error';
    job.lastMessage = result.message.slice(0, MAX_MESSAGE);
    if (!manual) {
      const next = nextRunAt(job.schedule);
      job.nextRunAt = next ? next.toISOString() : undefined;
    }
    this.persist();

    const shouldNotify = job.notifyOn === 'always' || (job.notifyOn === 'failure' && !result.ok);
    if (shouldNotify) {
      const text = `[${job.name}] ${result.ok ? t('执行成功') : t('执行失败')}\n${result.message}`;
      for (const channelId of job.channelIds) {
        const channel = this.state.channels.find((item) => item.id === channelId);
        if (channel?.enabled) void this.sendChannel(channel, text);
      }
    }
    return result;
  }

  private async sendChannel(channel: ChannelConfig, text: string): Promise<RunResult> {
    const body = channel.type === 'wecom'
      ? { msgtype: 'text', text: { content: text } }
      : channel.type === 'feishu'
        ? { msg_type: 'text', content: { text } }
        : channel.type === 'telegram'
          ? { chat_id: channel.chatId || '', text, disable_web_page_preview: true }
          : { text };
    try {
      const response = await fetch(channel.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const ok = response.ok;
      return { ok, message: ok ? t('消息已发送') : t('发送失败（HTTP {status}）', { status: response.status }) };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
}

export { EMPTY as EMPTY_AUTOMATION_STATE };
