import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { t } from './i18n.js';

export interface AgentDefinition {
  id: string;
  name: string;
  command: string;
  description: string;
  roles: string[];
  authHint: string;
  installHint: string;
  versionArgs: string[];
}

export interface AgentInfo extends AgentDefinition {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface AgentRunRequest {
  agentId: string;
  prompt: string;
  cwd?: string;
  timeoutMinutes?: number;
}

export type AgentEventPhase = 'start' | 'chunk' | 'stderr' | 'done' | 'error';

export interface AgentEvent {
  runId: string;
  agentId: string;
  phase: AgentEventPhase;
  text?: string;
  code?: number | null;
  summary?: string;
}

export type TeamMode = 'parallel' | 'supervisor';

export interface TeamRequest {
  task: string;
  agentIds: string[];
  mode: TeamMode;
  supervisorId?: string;
  cwd?: string;
}

export interface TeamResult {
  ok: boolean;
  summaries: Array<{ agentId: string; ok: boolean; text: string }>;
  error?: string;
}

const AGENTS: AgentDefinition[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    description: '复杂实现、跨文件重构、长上下文分析。',
    roles: ['实现', '审查', '规划'],
    authHint: 'claude 登录或 ANTHROPIC_API_KEY',
    installHint: 'winget install Anthropic.ClaudeCode',
    versionArgs: ['--version'],
  },
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    description: '全局架构与蓝图设计，代码实现与验证。',
    roles: ['蓝图', '实现', '审查'],
    authHint: 'codex login 或 OPENAI_API_KEY',
    installHint: 'npm i -g @openai/codex',
    versionArgs: ['--version'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    description: '资料检索、多模态理解、长文档归纳。',
    roles: ['调研', '审阅'],
    authHint: 'GEMINI_API_KEY 或 Google 账号',
    installHint: 'npm i -g @google/gemini-cli',
    versionArgs: ['--version'],
  },
  {
    id: 'grok',
    name: 'Grok Build',
    command: 'grok',
    description: '开放问题探索、快速原型与代码生成。',
    roles: ['调研', '实现'],
    authHint: 'grok login 或 XAI_API_KEY',
    installHint: 'npm i -g @xai-official/grok',
    versionArgs: ['--version'],
  },
  {
    id: 'trae',
    name: 'Trae CLI',
    command: 'traecli',
    description: '中文项目理解与常规开发任务。',
    roles: ['实现', '调研'],
    authHint: 'traecli login',
    installHint: '见 Trae CLI 官方安装脚本',
    versionArgs: ['--version'],
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    command: 'qwen',
    description: '中文问答与代码实现，兼容 Gemini 参数。',
    roles: ['调研', '实现'],
    authHint: 'OPENAI_API_KEY / DASHSCOPE_API_KEY',
    installHint: 'npm i -g @qwen-code/qwen-code',
    versionArgs: ['--version'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    description: '轻量终端编程代理，适合脚本化批量任务。',
    roles: ['实现', '批处理'],
    authHint: 'opencode auth login',
    installHint: 'npm i -g opencode-ai',
    versionArgs: ['--version'],
  },
  {
    id: 'goose',
    name: 'Goose',
    command: 'goose',
    description: '可扩展的本地代理，适合工具链编排。',
    roles: ['自动化', '调研'],
    authHint: 'goose configure',
    installHint: '见 Goose 官方安装文档',
    versionArgs: ['--version'],
  },
  {
    id: 'cursor',
    name: 'Cursor Agent',
    command: 'cursor-agent',
    description: '基于 Cursor 的代码理解与补丁生成。',
    roles: ['实现', '审查'],
    authHint: 'cursor-agent login',
    installHint: '见 Cursor CLI 官方文档',
    versionArgs: ['--version'],
  },
  {
    id: 'aider',
    name: 'Aider',
    command: 'aider',
    description: '小步修改与提交友好型补丁。',
    roles: ['实现', '小修'],
    authHint: '配置对应模型 API Key',
    installHint: 'pip install aider-chat',
    versionArgs: ['--version'],
  },
];

const MAX_PROMPT = 12000;
const MAX_LOG = 200_000;
const MAX_CONCURRENCY = 3;

interface RunRecord {
  child: ChildProcessWithoutNullStreams;
  startedAt: number;
  output: string;
  timer: NodeJS.Timeout;
  agentId: string;
}

const runs = new Map<string, RunRecord>();
let detectionCache: { at: number; agents: AgentInfo[] } | null = null;

function isBatchFile(file: string): boolean {
  return /\.(cmd|bat)$/i.test(file);
}

function resolveCommand(command: string): string | null {
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(finder, [command], { encoding: 'utf8', timeout: 4000, windowsHide: true });
    if (result.status !== 0 || !result.stdout) return null;
    const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return first && existsSync(first) ? first : null;
  } catch {
    return null;
  }
}

function readVersion(command: string, args: string[]): string | undefined {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true,
      shell: isBatchFile(command),
    });
    const text = `${result.stdout || ''}${result.stderr || ''}`.trim();
    if (result.error || !text) return undefined;
    return text.split(/\r?\n/)[0].slice(0, 120);
  } catch {
    return undefined;
  }
}

export function detectAgents(refresh = false): AgentInfo[] {
  if (!refresh && detectionCache && Date.now() - detectionCache.at < 60_000) return detectionCache.agents;
  const agents = AGENTS.map((agent) => {
    const resolved = resolveCommand(agent.command);
    return {
      ...agent,
      installed: Boolean(resolved),
      path: resolved ?? undefined,
      version: resolved ? readVersion(resolved, agent.versionArgs) : undefined,
    };
  });
  detectionCache = { at: Date.now(), agents };
  return agents;
}

// 每个 agent 的参数在调研中逐项核对过；版本升级导致参数变化时按 id 单独调整。
function buildArgs(agentId: string, prompt: string, cwd: string): string[] | null {
  switch (agentId) {
    case 'claude':
      return ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
    case 'codex':
      return ['exec', prompt, '--json', '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '--cd', cwd];
    case 'gemini':
      return ['-p', prompt, '-o', 'json', '--approval-mode', 'auto_edit'];
    case 'grok':
      return ['-p', prompt, '--output-format', 'streaming-json', '--always-approve', '--cwd', cwd];
    case 'trae':
      return ['exec', prompt, '--json'];
    case 'qwen':
      return ['-p', prompt, '-o', 'json', '--approval-mode', 'auto_edit'];
    case 'opencode':
      return ['run', prompt];
    case 'goose':
      return ['run', '-t', prompt];
    case 'cursor':
      return ['-p', prompt, '--output-format', 'json'];
    case 'aider':
      return ['--message', prompt, '--yes', '--no-auto-commits', '--no-check-update'];
    default:
      return null;
  }
}

function quoteWindowsArg(value: string): string {
  // 经 cmd.exe 传递时 % 会被展开，%% 还原为字面量。
  const escaped = value.replace(/%/g, '%%').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function spawnAgent(commandPath: string, args: string[], cwd: string): ChildProcessWithoutNullStreams {
  if (process.platform === 'win32' && isBatchFile(commandPath)) {
    const line = [quoteWindowsArg(commandPath), ...args.map(quoteWindowsArg)].join(' ');
    return spawn(line, { cwd, shell: true, windowsHide: true, env: process.env });
  }
  return spawn(commandPath, args, { cwd, windowsHide: true, env: process.env });
}

export function stopRun(runId: string): boolean {
  const record = runs.get(runId);
  if (!record) return false;
  try {
    if (process.platform === 'win32' && record.child.pid) {
      spawnSync('taskkill', ['/pid', String(record.child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 });
    } else {
      record.child.kill('SIGTERM');
    }
  } catch {
    // 子进程可能已退出
  }
  return true;
}

export function stopAllRuns(): void {
  for (const id of runs.keys()) stopRun(id);
}

function extractSummary(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  const pieces: string[] = [];
  for (const line of lines) {
    if (!line.trim().startsWith('{')) {
      pieces.push(line);
      continue;
    }
    try {
      const payload = JSON.parse(line) as Record<string, unknown>;
      const candidate = payload.result ?? payload.response ?? payload.text
        ?? (payload.msg && typeof payload.msg === 'object' ? (payload.msg as Record<string, unknown>).message : undefined)
        ?? (payload.message && typeof payload.message === 'object'
          ? ((payload.message as Record<string, unknown>).content as Array<Record<string, unknown>> | undefined)
            ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
            .join('')
          : undefined)
        ?? (payload.item && typeof payload.item === 'object' ? (payload.item as Record<string, unknown>).text : undefined);
      if (typeof candidate === 'string' && candidate.trim()) pieces.push(candidate);
    } catch {
      pieces.push(line);
    }
  }
  const text = pieces.join('\n').trim() || raw.trim();
  return text.slice(-4000);
}

export function runAgent(
  request: AgentRunRequest,
  onEvent: (event: AgentEvent) => void,
): Promise<{ ok: boolean; runId: string; summary: string; error?: string }> {
  const prompt = typeof request.prompt === 'string' ? request.prompt.slice(0, MAX_PROMPT) : '';
  if (!prompt.trim()) return Promise.resolve({ ok: false, runId: '', summary: '', error: t('提示词为空') });
  const agent = detectAgents().find((item) => item.id === request.agentId);
  if (!agent) return Promise.resolve({ ok: false, runId: '', summary: '', error: t('未知 Agent') });
  if (!agent.installed || !agent.path) {
    return Promise.resolve({ ok: false, runId: '', summary: '', error: t('未检测到 {name}，请先安装', { name: agent.name }) });
  }
  if (runs.size >= MAX_CONCURRENCY) {
    return Promise.resolve({ ok: false, runId: '', summary: '', error: t('同时运行的任务过多，请稍后再试') });
  }
  const cwd = typeof request.cwd === 'string' && request.cwd.trim() ? path.resolve(request.cwd) : process.cwd();
  const args = buildArgs(agent.id, prompt, cwd);
  if (!args) return Promise.resolve({ ok: false, runId: '', summary: '', error: t('该 Agent 暂不支持命令行调用') });

  const runId = `${agent.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const timeoutMs = Math.min(60, Math.max(1, Number(request.timeoutMinutes) || 20)) * 60_000;
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawnAgent(agent.path, args, cwd);
  } catch (error) {
    return Promise.resolve({
      ok: false,
      runId: '',
      summary: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  onEvent({ runId, agentId: agent.id, phase: 'start', text: `${agent.name} · ${cwd}` });

  return new Promise((resolve) => {
    let output = '';
    const timer = setTimeout(() => {
      onEvent({ runId, agentId: agent.id, phase: 'stderr', text: t('执行超时，已终止') });
      stopRun(runId);
    }, timeoutMs);
    const record: RunRecord = { child, startedAt: Date.now(), output, timer, agentId: agent.id };
    runs.set(runId, record);

    const append = (chunk: string): void => {
      if (!chunk) return;
      output += chunk;
      if (output.length > MAX_LOG) output = output.slice(-MAX_LOG);
      record.output = output;
      onEvent({ runId, agentId: agent.id, phase: 'chunk', text: chunk });
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', append);
    child.stderr.on('data', (chunk: string) => onEvent({ runId, agentId: agent.id, phase: 'stderr', text: chunk.slice(0, 8000) }));

    const finish = (code: number | null, error?: Error): void => {
      clearTimeout(timer);
      runs.delete(runId);
      const summary = extractSummary(output);
      if (error) {
        onEvent({ runId, agentId: agent.id, phase: 'error', text: error.message, code });
        resolve({ ok: false, runId, summary, error: error.message });
        return;
      }
      onEvent({ runId, agentId: agent.id, phase: 'done', code, summary });
      resolve({ ok: code === 0, runId, summary, error: code === 0 ? undefined : t('进程退出码 {code}', { code: String(code) }) });
    };

    child.on('error', (error) => finish(null, error));
    child.on('close', (code) => finish(code));
  });
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export async function runTeam(
  request: TeamRequest,
  onEvent: (event: AgentEvent) => void,
): Promise<TeamResult> {
  const task = typeof request.task === 'string' ? request.task.trim().slice(0, MAX_PROMPT) : '';
  if (!task) return { ok: false, summaries: [], error: t('填写协作任务') };
  const installed = detectAgents().filter((agent) => agent.installed);
  if (!installed.length) return { ok: false, summaries: [], error: t('未检测到任何可用 Agent') };

  const requested = new Set(Array.isArray(request.agentIds) ? request.agentIds.filter((id) => typeof id === 'string') : []);
  const members = requested.size ? installed.filter((agent) => requested.has(agent.id)) : installed.slice(0, 3);
  if (!members.length) return { ok: false, summaries: [], error: t('所选 Agent 不可用') };

  const cwd = typeof request.cwd === 'string' && request.cwd.trim() ? path.resolve(request.cwd) : process.cwd();
  const summaries: Array<{ agentId: string; ok: boolean; text: string }> = [];

  if (request.mode === 'supervisor' && members.length > 1) {
    const supervisor = members.find((agent) => agent.id === request.supervisorId)
      ?? members.find((agent) => agent.id === 'codex')
      ?? members[0];
    const workers = members.filter((agent) => agent.id !== supervisor.id);
    const planPrompt = [
      '你是本次协作的主管。只输出可执行计划，不要写代码，不要调用工具。',
      '计划需包含：任务拆解、每个子任务交给谁、产出格式、验收标准、风险。',
      '',
      `项目目录：${cwd}`,
      `任务：${task}`,
      `可用执行成员：${workers.map((agent) => `${agent.name}（${agent.roles.join('/')}）`).join('、')}`,
    ].join('\n');
    const planned = await runAgent({ agentId: supervisor.id, prompt: planPrompt, cwd }, onEvent);
    summaries.push({ agentId: supervisor.id, ok: planned.ok, text: planned.summary });
    if (!planned.ok) return { ok: false, summaries, error: planned.error };

    await pool(workers, MAX_CONCURRENCY, async (agent) => {
      const workerPrompt = [
        '你在一个多 Agent 协作任务中执行其中一个子任务。',
        `总目标：${task}`,
        '主管计划如下：',
        planned.summary,
        '',
        `你的角色：${agent.roles.join(' / ')}。完成后输出：做了什么、证据（命令/文件）、结论、未解决问题。`,
      ].join('\n');
      const result = await runAgent({ agentId: agent.id, prompt: workerPrompt, cwd }, onEvent);
      summaries.push({ agentId: agent.id, ok: result.ok, text: result.summary });
    });

    const synthPrompt = [
      '你是本次协作的主管。基于各成员的回报，输出最终结果：',
      '1. 已完成与证据；2. 冲突与差异；3. 未解决项；4. 建议下一步。',
      '不要编造未出现在回报中的结果。',
      '',
      `总目标：${task}`,
      '',
      ...summaries.map((item) => `## ${item.agentId}\n${item.text}\n`),
    ].join('\n');
    const final = await runAgent({ agentId: supervisor.id, prompt: synthPrompt, cwd }, onEvent);
    summaries.push({ agentId: supervisor.id, ok: final.ok, text: final.summary });
    return { ok: summaries.some((item) => item.ok), summaries, error: final.error };
  }

  await pool(members, MAX_CONCURRENCY, async (agent) => {
    const prompt = [
      `请独立完成以下任务，输出结论与证据（命令、文件:行号、引用链接）。`,
      `项目目录：${cwd}`,
      '',
      task,
    ].join('\n');
    const result = await runAgent({ agentId: agent.id, prompt, cwd }, onEvent);
    summaries.push({ agentId: agent.id, ok: result.ok, text: result.summary });
  });
  return { ok: summaries.some((item) => item.ok), summaries };
}

export function agentCatalog(): AgentInfo[] {
  return detectAgents();
}
