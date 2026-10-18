import { execFile, spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { clipboard } from 'electron';
import { t } from './i18n.js';
import { searchForPrompt } from './tools.js';

/** 异步执行探测命令，避免 where / PowerShell 阻塞主进程事件循环。 */
function runProbe(command: string, args: string[], timeout = 8000, shell = false): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: 'utf8', timeout, windowsHide: true, shell, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

export type AgentInstallKind = 'npm' | 'winget' | 'script' | 'pip' | 'uv' | 'manual';

export interface AgentInstallSpec {
  kind: AgentInstallKind;
  command?: string;
  args?: string[];
  url?: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  command: string;
  commands?: string[];
  /** 不在 PATH 时的常见安装路径，支持 %ENV% 与 * 版本目录。 */
  binPaths?: string[];
  /** 桌面应用可执行文件路径，用于打开项目或桌面交接。 */
  appPaths?: string[];
  appArgs?: string[];
  /** 开始菜单快捷方式名称，作为桌面应用的最后回退。 */
  shortcut?: string;
  /** 桌面应用同目录下自带的 CLI 文件名。 */
  cliSibling?: string;
  description: string;
  roles: string[];
  strengths: string[];
  weaknesses: string[];
  specialties: string[];
  limitations: string[];
  authHint: string;
  installHint: string;
  install?: AgentInstallSpec;
  env?: Record<string, string>;
  versionArgs: string[];
  custom?: boolean;
}

export interface CustomAgentInput {
  name: string;
  command: string;
  description?: string;
  roles?: string[];
  strengths?: string[];
  weaknesses?: string[];
  specialties?: string[];
  limitations?: string[];
  authHint?: string;
  args?: string[];
}

export interface AgentInfo extends AgentDefinition {
  installed: boolean;
  runnable: boolean;
  cliInstalled: boolean;
  desktopInstalled: boolean;
  desktopPath?: string;
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
  apps?: string[];
  webSearch?: boolean;
}

export interface TeamSuggestion {
  taskKind: string;
  members: string[];
  supervisorId: string;
  reason: string;
  scores?: Array<{ agentId: string; score: number }>;
}

export interface AgentInstallResult {
  ok: boolean;
  agentId: string;
  output: string;
  error?: string;
}

export interface TeamResult {
  ok: boolean;
  supervisorId?: string;
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
    strengths: ['跨文件重构稳定', '工具调用与长上下文成熟', '会主动检查边界条件'],
    weaknesses: ['成本偏高', '自动批准会直接修改文件'],
    specialties: ['复杂实现', '代码审查', '方案规划'],
    limitations: ['超大仓库全量分析容易触及上下文上限'],
    authHint: 'claude 登录或 ANTHROPIC_API_KEY',
    installHint: 'winget install Anthropic.ClaudeCode',
    install: { kind: 'winget', command: 'winget', args: ['install', '--id', 'Anthropic.ClaudeCode', '-e', '--accept-package-agreements', '--accept-source-agreements'] },
    versionArgs: ['--version'],
  },
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    binPaths: [
      '%LOCALAPPDATA%/OpenAI/Codex/bin/*/codex.exe',
      '~/.codex/.sandbox-bin/codex.exe',
    ],
    description: '全局架构与蓝图设计，代码实现与验证。',
    roles: ['蓝图', '实现', '审查'],
    strengths: ['架构与蓝图能力强', 'JSONL 输出易集成', '执行速度快'],
    weaknesses: ['Windows 沙箱有已知缺陷', '跳过审批风险高'],
    specialties: ['全局设计', '批量修改', '验证'],
    limitations: ['Windows 原生 workspace-write 实测可能近似只读'],
    authHint: 'codex login 或 OPENAI_API_KEY',
    installHint: 'npm i -g @openai/codex',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@openai/codex'] },
    versionArgs: ['--version'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    description: '资料检索、多模态理解、长文档归纳。',
    roles: ['调研', '审阅'],
    strengths: ['长文档与多模态', '检索归纳快', '有免费层'],
    weaknesses: ['免费层已被 Antigravity CLI 取代', '限额不透明', '工具调用弱于 Claude'],
    specialties: ['调研', '长文档', '图像理解'],
    limitations: ['2026-06-18 起免费层与 Google One 用户改用 Antigravity CLI'],
    authHint: 'GEMINI_API_KEY 或 Google 账号',
    installHint: 'npm i -g @google/gemini-cli',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@google/gemini-cli'] },
    versionArgs: ['--version'],
  },
  {
    id: 'grok',
    name: 'Grok Build',
    command: 'grok',
    binPaths: ['~/.grok/bin/grok.exe'],
    appPaths: ['%LOCALAPPDATA%/Grok/grok-app.exe'],
    appArgs: ['{cwd}'],
    shortcut: 'Grok',
    description: '开放问题探索、快速原型与代码生成。',
    roles: ['调研', '实现'],
    strengths: ['开放问题探索', '响应快'],
    weaknesses: ['自动批准参数未核实', '生态较新'],
    specialties: ['调研', '原型'],
    limitations: ['无 TTY 时可能停在交互确认'],
    authHint: 'grok login 或 XAI_API_KEY',
    installHint: 'irm https://x.ai/cli/install.ps1 | iex',
    install: {
      kind: 'script',
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://x.ai/cli/install.ps1 | iex'],
    },
    versionArgs: ['--version'],
  },
  {
    id: 'trae',
    name: 'TRAE',
    command: 'traecli',
    appPaths: [
      '%LOCALAPPDATA%/Programs/Trae CN/Trae CN.exe',
      '%LOCALAPPDATA%/Programs/Trae/Trae.exe',
    ],
    appArgs: ['{cwd}'],
    shortcut: 'TRAE CN',
    description: '中文项目理解与常规开发任务；桌面版可作为交接参与者。',
    roles: ['实现', '调研'],
    strengths: ['中文项目理解', '国内网络友好'],
    weaknesses: ['文档与参数变更快', '依赖账号登录'],
    specialties: ['中文项目', '常规实现'],
    limitations: ['一次性任务必须用 exec，-p 已改作 profile'],
    authHint: 'traecli 浏览器登录',
    installHint: 'irm https://trae.cn/trae-cli/install_v2.ps1 | iex',
    install: {
      kind: 'script',
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://trae.cn/trae-cli/install_v2.ps1 | iex'],
    },
    versionArgs: ['--version'],
  },
  {
    id: 'workbuddy',
    name: 'WorkBuddy',
    command: 'workbuddy',
    commands: ['wb'],
    appPaths: ['%LOCALAPPDATA%/Programs/WorkBuddy/WorkBuddy.exe'],
    appArgs: ['{cwd}'],
    shortcut: 'WorkBuddy',
    description: '中文办公与多端协作代理；桌面版可作为交接参与者。',
    roles: ['调研', '实现'],
    strengths: ['中文任务理解', '办公协作场景'],
    weaknesses: ['无头参数未获官方确认', '依赖登录'],
    specialties: ['中文任务', '办公协作'],
    limitations: ['官方文档展示的是 CodeBuddy 的 -p 用法，WorkBuddy 无头调用需自行验证'],
    authHint: 'workbuddy 登录',
    installHint: 'npm i -g @workbuddy/cli',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@workbuddy/cli'] },
    versionArgs: ['--version'],
  },
  {
    id: 'trae-agent',
    name: 'Trae Agent（开源）',
    command: 'trae-cli',
    description: '字节开源的研究型任务代理，与 Trae 官方 CLI 不同。',
    roles: ['调研', '实现'],
    strengths: ['开源可审计', '研究型任务'],
    weaknesses: ['未发布到 PyPI', '需 git clone + uv sync'],
    specialties: ['开源', '研究任务'],
    limitations: ['需从 bytedance/trae-agent 源码安装，命令为 trae-cli'],
    authHint: '按仓库 README 配置模型密钥',
    installHint: 'git clone https://github.com/bytedance/trae-agent 后 uv sync --all-extras',
    install: { kind: 'manual', url: 'https://github.com/bytedance/trae-agent' },
    versionArgs: ['--version'],
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    command: 'qwen',
    description: '中文问答与代码实现，兼容 Gemini 参数。',
    roles: ['调研', '实现'],
    strengths: ['中文表达', 'DashScope 接入方便'],
    weaknesses: ['输出稳定性一般', '依赖环境变量配置'],
    specialties: ['中文问答', '代码实现'],
    limitations: ['需要 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL'],
    authHint: 'OPENAI_API_KEY / DASHSCOPE_API_KEY',
    installHint: 'npm i -g @qwen-code/qwen-code',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@qwen-code/qwen-code'] },
    versionArgs: ['--version'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    description: '轻量终端编程代理，适合脚本化批量任务。',
    roles: ['实现', '批处理'],
    strengths: ['轻量', '多模型', '适合脚本化'],
    weaknesses: ['Windows 需要 Git Bash', '生态较小'],
    specialties: ['批处理', '脚本化'],
    limitations: ['原生 Windows 需设置 OPENCODE_GIT_BASH_PATH'],
    authHint: 'opencode auth login',
    installHint: 'npm i -g opencode-ai',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', 'opencode-ai'] },
    versionArgs: ['--version'],
  },
  {
    id: 'goose',
    name: 'Goose',
    command: 'goose',
    description: '可扩展的本地代理，适合工具链编排。',
    roles: ['自动化', '调研'],
    strengths: ['本地工具编排', '扩展块机制'],
    weaknesses: ['安装步骤多', '需要单独配置 provider'],
    specialties: ['自动化', '工具链'],
    limitations: ['headless 需 GOOSE_MODE=auto 与可用凭据'],
    authHint: 'goose configure；GOOSE_PROVIDER / GOOSE_MODEL',
    installHint: '见 Goose 官方安装文档',
    install: { kind: 'manual', url: 'https://goose-docs.ai/docs/getting-started/installation/' },
    env: { GOOSE_MODE: 'auto' },
    versionArgs: ['--version'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'agent',
    commands: ['agent', 'cursor-agent'],
    appPaths: ['%LOCALAPPDATA%/Programs/cursor/Cursor.exe'],
    appArgs: ['{cwd}'],
    shortcut: 'Cursor',
    description: '基于 Cursor 的代码理解与补丁生成；桌面版可作为交接参与者。',
    roles: ['实现', '审查'],
    strengths: ['与 Cursor 生态一致', '补丁生成稳定'],
    weaknesses: ['可执行名近期变更', '需要 API Key'],
    specialties: ['实现', '补丁'],
    limitations: ['旧命令 cursor-agent 仅作兼容；headless 需 CURSOR_API_KEY'],
    authHint: 'CURSOR_API_KEY 或 cursor agent login',
    installHint: "irm 'https://cursor.com/install?win32=true' | iex",
    install: {
      kind: 'script',
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "irm 'https://cursor.com/install?win32=true' | iex"],
    },
    versionArgs: ['--version'],
  },
  {
    id: 'aider',
    name: 'Aider',
    command: 'aider',
    description: '小步修改与提交友好型补丁。',
    roles: ['实现', '小修'],
    strengths: ['小步补丁', '提交信息友好', '支持模型多'],
    weaknesses: ['没有 JSON 输出', '大批量任务弱'],
    specialties: ['小修', '补丁'],
    limitations: ['只能解析 stdout，无结构化事件'],
    authHint: '配置对应模型 API Key',
    installHint: 'pip install aider-chat',
    install: { kind: 'pip', command: 'pip', args: ['install', 'aider-chat'] },
    versionArgs: ['--version'],
  },
  {
    id: 'cline',
    name: 'Cline CLI',
    command: 'cline',
    description: 'VS Code 生态的终端代理，支持 JSONL。',
    roles: ['实现', '审查'],
    strengths: ['VS Code 生态', 'JSONL 输出', '自动批准可配置'],
    weaknesses: ['自动批准默认值文档不一致', '账号依赖'],
    specialties: ['实现', '审查'],
    limitations: ['接入时需显式传 --auto-approve'],
    authHint: 'cline auth',
    installHint: 'npm i -g cline',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', 'cline'] },
    versionArgs: ['--version'],
  },
  {
    id: 'crush',
    name: 'Crush',
    command: 'crush',
    description: 'Charm 出品的终端代理，交互体验好。',
    roles: ['实现', '重构'],
    strengths: ['终端体验好', '多模型'],
    weaknesses: ['无 JSON 输出', 'run 子命令文档滞后'],
    specialties: ['实现', '交互式重构'],
    limitations: ['输出为纯文本'],
    authHint: '设置厂商 API Key，如 ANTHROPIC_API_KEY',
    installHint: 'winget install charmbracelet.crush',
    install: { kind: 'winget', command: 'winget', args: ['install', '--id', 'charmbracelet.crush', '-e', '--accept-package-agreements', '--accept-source-agreements'] },
    versionArgs: ['--version'],
  },
  {
    id: 'kiro',
    name: 'Kiro CLI',
    command: 'kiro-cli',
    description: 'AWS 生态代理，支持 stream-json。',
    roles: ['实现', '审查'],
    strengths: ['AWS 生态', '结构化输出'],
    weaknesses: ['需要手动安装包', '账号依赖'],
    specialties: ['实现', '审查'],
    limitations: ['CLI 2.0 起才支持 Windows 11 / PowerShell'],
    authHint: 'KIRO_API_KEY 或浏览器登录',
    installHint: '从 kiro.dev 下载 Windows 安装包',
    install: { kind: 'manual', url: 'https://kiro.dev/docs/getting-started/installation/' },
    versionArgs: ['--version'],
  },
  {
    id: 'continue',
    name: 'Continue CLI',
    command: 'cn',
    description: 'Continue 的命令行代理，适合 CI 与批处理。',
    roles: ['审查', '批处理'],
    strengths: ['可接本地模型', '适合 CI'],
    weaknesses: ['输出格式未文档化', 'Windows 仅 npm'],
    specialties: ['批处理', '审查'],
    limitations: ['无公开 JSON 输出约定'],
    authHint: 'CONTINUE_API_KEY 或 cn login',
    installHint: 'npm i -g @continuedev/cli',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@continuedev/cli'] },
    versionArgs: ['--version'],
  },
  {
    id: 'droid',
    name: 'Droid',
    command: 'droid',
    description: 'Factory 的执行型代理，支持自动批准分级。',
    roles: ['实现', '自动化'],
    strengths: ['执行模式强', 'JSON 输出'],
    weaknesses: ['需要 FACTORY_API_KEY', '自动批准需分级'],
    specialties: ['实现', '自动化'],
    limitations: ['账号与密钥必需'],
    authHint: 'FACTORY_API_KEY',
    installHint: 'npm i -g @factory/cli',
    install: { kind: 'npm', command: 'npm', args: ['i', '-g', '@factory/cli'] },
    versionArgs: ['--version'],
  },
  {
    id: 'crow-cli',
    name: 'Crow CLI',
    command: 'crow-cli',
    description: '开源 Crow 代理，JSONL 事件流与 ACP/MCP。',
    roles: ['实现', '脚本化'],
    strengths: ['JSONL 事件流', 'ACP/MCP 齐全', '支持续会话'],
    weaknesses: ['需手写 provider 配置', '项目较新'],
    specialties: ['实现', '脚本化'],
    limitations: ['密钥放 ~/.agents/crow/.env；与 Crow5 桌面端无关'],
    authHint: '在 ~/.agents/crow/config.yaml 配置 provider',
    installHint: 'uv tool install crow-cli --python 3.13',
    install: { kind: 'uv', command: 'uv', args: ['tool', 'install', 'crow-cli', '--python', '3.13'] },
    versionArgs: ['--version'],
  },
  {
    id: 'crow5',
    name: 'Crow5',
    command: 'crow5-cli',
    cliSibling: 'crow5-cli.exe',
    appArgs: ['{cwd}'],
    shortcut: 'Crow5',
    description: 'Crow5 桌面端与自带 CLI，支持本地项目任务与 JSON 事件输出。',
    roles: ['实现', '调研'],
    strengths: ['桌面端自带 CLI', '中文界面', '支持 JSON 事件流'],
    weaknesses: ['安装路径可能不在 PATH', '账号与模型由客户端管理'],
    specialties: ['中文任务', '本地项目'],
    limitations: ['需先安装 Crow5 桌面版'],
    authHint: '沿用 Crow5 客户端内的模型与登录配置',
    installHint: '安装 Crow5 桌面版后，工作台会自动识别同目录的 crow5-cli.exe',
    versionArgs: ['--version'],
  },
  {
    id: 'amp',
    name: 'Amp',
    command: 'amp',
    description: 'Sourcegraph Amp 执行模式，Windows 仅 WSL。',
    roles: ['实现', '原型'],
    strengths: ['执行模式直接', '速度快'],
    weaknesses: ['Windows 仅 WSL', '需要 AMP_API_KEY'],
    specialties: ['实现', '原型'],
    limitations: ['Windows 原生不可用'],
    authHint: 'AMP_API_KEY（非交互必需）',
    installHint: 'WSL 中执行 curl -fsSL https://ampcode.com/install.sh | bash',
    install: { kind: 'manual', url: 'https://ampcode.com/install.sh' },
    versionArgs: ['--version'],
  },
  {
    id: 'openhands',
    name: 'OpenHands',
    command: 'openhands',
    description: '自主任务代理，headless 输出 JSONL；仅 WSL。',
    roles: ['自动化', '调研'],
    strengths: ['自主任务', 'headless JSONL'],
    weaknesses: ['仅 WSL', '资源占用高'],
    specialties: ['自动化', '调研'],
    limitations: ['无原生 Windows 安装'],
    authHint: 'LLM_API_KEY，配合 --override-with-envs',
    installHint: 'uv tool install openhands --python 3.12（WSL）',
    install: { kind: 'uv', command: 'uv', args: ['tool', 'install', 'openhands', '--python', '3.12'] },
    versionArgs: ['--version'],
  },
];

const CUSTOM_AGENT_LIMIT = 30;

interface CustomAgentRecord {
  id: string;
  name: string;
  command: string;
  description: string;
  roles: string[];
  strengths: string[];
  weaknesses: string[];
  specialties: string[];
  limitations: string[];
  authHint: string;
  args: string[];
}

let customAgents: AgentDefinition[] = [];
const customArgs = new Map<string, string[]>();
let customStorePath: string | null = null;

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

function cleanList(value: unknown, fallback: string[]): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，、\n]/)
      : [];
  const items = source.map((item) => cleanText(item, 60)).filter(Boolean).slice(0, 8);
  return items.length ? items : fallback;
}

function defFromRecord(record: CustomAgentRecord): AgentDefinition {
  return {
    id: record.id,
    name: record.name,
    command: record.command,
    description: record.description || '用户自定义接入的 Agent CLI。',
    roles: record.roles.length ? record.roles : ['实现'],
    strengths: record.strengths,
    weaknesses: record.weaknesses,
    specialties: record.specialties.length ? record.specialties : ['自定义'],
    limitations: record.limitations,
    authHint: record.authHint || '沿用命令自身的登录或环境变量',
    installHint: '自定义接入，请先在本机安装该 CLI',
    versionArgs: ['--version'],
    custom: true,
  };
}

function normalizeRecord(value: unknown): CustomAgentRecord | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const id = cleanText(source.id, 60);
  const name = cleanText(source.name, 60);
  const command = cleanText(source.command, 240);
  const args = Array.isArray(source.args)
    ? source.args.map((arg) => cleanText(arg, 2000)).filter(Boolean).slice(0, 40)
    : [];
  if (!/^custom-[a-z0-9-]+$/.test(id) || !name || !command) return null;
  if (!args.some((arg) => arg.includes('{prompt}'))) return null;
  return {
    id,
    name,
    command,
    description: cleanText(source.description, 200),
    roles: cleanList(source.roles, ['实现']),
    strengths: cleanList(source.strengths, []),
    weaknesses: cleanList(source.weaknesses, []),
    specialties: cleanList(source.specialties, ['自定义']),
    limitations: cleanList(source.limitations, []),
    authHint: cleanText(source.authHint, 160),
    args,
  };
}

function loadCustomAgents(): void {
  customAgents = [];
  customArgs.clear();
  if (!customStorePath || !existsSync(customStorePath)) return;
  try {
    const parsed = JSON.parse(readFileSync(customStorePath, 'utf8')) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const item of parsed.slice(0, CUSTOM_AGENT_LIMIT)) {
      const record = normalizeRecord(item);
      if (!record) continue;
      customAgents.push(defFromRecord(record));
      customArgs.set(record.id, record.args);
    }
  } catch {
    // 配置损坏时保持空列表，避免影响内置 Agent
  }
}

function persistCustomAgents(): void {
  if (!customStorePath) return;
  const payload = customAgents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    command: agent.command,
    description: agent.description,
    roles: agent.roles,
    strengths: agent.strengths,
    weaknesses: agent.weaknesses,
    specialties: agent.specialties,
    limitations: agent.limitations,
    authHint: agent.authHint,
    args: customArgs.get(agent.id) ?? [],
  }));
  mkdirSync(path.dirname(customStorePath), { recursive: true });
  writeFileSync(customStorePath, JSON.stringify(payload, null, 2), 'utf8');
}

export function configureCustomAgents(storePath: string): void {
  customStorePath = storePath;
  loadCustomAgents();
  detectionCache = null;
}

export async function saveCustomAgent(input: unknown): Promise<{ ok: boolean; agent?: AgentInfo; error?: string }> {
  if (!customStorePath) return { ok: false, error: t('自定义 Agent 存储尚未初始化') };
  if (customAgents.length >= CUSTOM_AGENT_LIMIT) {
    return { ok: false, error: t('自定义 Agent 数量已达上限（{count}）', { count: CUSTOM_AGENT_LIMIT }) };
  }
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const source = input as Record<string, unknown>;
  const name = cleanText(source.name, 60);
  const command = cleanText(source.command, 240);
  if (!name || !command) return { ok: false, error: t('填写名称与可执行命令') };
  if (/["'&|<>^]/.test(command)) return { ok: false, error: t('命令只填写可执行文件或路径，不要包含 shell 符号') };
  const args = Array.isArray(source.args)
    ? source.args.map((arg) => cleanText(arg, 2000)).filter(Boolean).slice(0, 40)
    : [];
  if (!args.some((arg) => arg.includes('{prompt}'))) {
    return { ok: false, error: t('运行参数至少需要一处 {prompt} 占位') };
  }
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  const slug = base || `x${Date.now().toString(36)}`;
  let id = `custom-${slug}`;
  let suffix = 2;
  while ([...AGENTS, ...customAgents].some((agent) => agent.id === id)) {
    id = `custom-${slug}-${suffix}`;
    suffix += 1;
    if (suffix > 99) return { ok: false, error: t('同名自定义 Agent 过多') };
  }
  const record: CustomAgentRecord = {
    id,
    name,
    command,
    description: cleanText(source.description, 200),
    roles: cleanList(source.roles, ['实现']),
    strengths: cleanList(source.strengths, []),
    weaknesses: cleanList(source.weaknesses, []),
    specialties: cleanList(source.specialties, ['自定义']),
    limitations: cleanList(source.limitations, []),
    authHint: cleanText(source.authHint, 160),
    args,
  };
  customAgents.push(defFromRecord(record));
  customArgs.set(record.id, record.args);
  persistCustomAgents();
  detectionCache = null;
  return { ok: true, agent: (await detectAgents(true)).find((agent) => agent.id === id) };
}

export function removeCustomAgent(id: unknown): { ok: boolean; error?: string } {
  const target = typeof id === 'string' ? id : '';
  const agent = customAgents.find((item) => item.id === target);
  if (!agent) return { ok: false, error: t('未找到自定义 Agent') };
  customAgents = customAgents.filter((item) => item.id !== target);
  customArgs.delete(target);
  persistCustomAgents();
  detectionCache = null;
  return { ok: true };
}

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
const installing = new Set<string>();
let detectionCache: { at: number; agents: AgentInfo[] } | null = null;
let shortcutCache: { at: number; targets: Map<string, string> } | null = null;

function expandPath(value: string): string {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return value
    .replace(/^~(?=$|[\\/])/, home)
    .replace(/%([^%]+)%/g, (_match, key: string) => process.env[key] ?? '');
}

function isFile(candidate: string): boolean {
  try {
    return existsSync(candidate) && statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/** 解析含 * 的路径模板；* 匹配一层目录，优先取最近修改的版本目录。 */
function resolvePattern(value: string): string | null {
  const expanded = path.resolve(expandPath(value));
  const marker = expanded.indexOf('*');
  if (marker < 0) return isFile(expanded) ? expanded : null;
  const parts = expanded.split(path.sep);
  const index = parts.indexOf('*');
  if (index < 0) return null;
  const base = parts.slice(0, index).join(path.sep) || path.sep;
  const tail = parts.slice(index + 1);
  try {
    const entries = readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const full = path.join(base, entry.name);
        let mtime = 0;
        try {
          mtime = statSync(full).mtimeMs;
        } catch {
          // 无法读取时间时保持最低优先级
        }
        return { full, mtime };
      })
      .sort((left, right) => right.mtime - left.mtime);
    for (const entry of entries) {
      const candidate = path.join(entry.full, ...tail);
      if (isFile(candidate)) return candidate;
    }
  } catch {
    // 目录不存在时视为未安装
  }
  return null;
}

/** 从开始菜单解析快捷方式目标，覆盖装在任意盘符的桌面应用。 */
function resolveShortcut(name: string): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null);
  if (!shortcutCache || Date.now() - shortcutCache.at > 300_000) {
    if (!shortcutLoading) {
      shortcutLoading = loadShortcuts().finally(() => {
        shortcutLoading = null;
      });
    }
    return shortcutLoading.then(() => shortcutCache?.targets.get(name) ?? null);
  }
  return Promise.resolve(shortcutCache.targets.get(name) ?? null);
}

let shortcutLoading: Promise<void> | null = null;

/** 一次性解析全部 Agent 的开始菜单快捷方式，结果缓存五分钟。 */
async function loadShortcuts(): Promise<void> {
  const names = [...new Set(AGENTS.map((agent) => agent.shortcut).filter((item): item is string => Boolean(item)))];
  const list = names.map((item) => `'${item.replace(/'/g, "''")}'`).join(',');
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    '$shell=New-Object -ComObject WScript.Shell',
    '$roots=@("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs","$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs")',
    `foreach($n in @(${list})){`,
    '  foreach($r in $roots){',
    '    $f=Get-ChildItem -LiteralPath $r -Filter ($n+".lnk") -Recurse -File | Select-Object -First 1',
    '    if($f){ Write-Output ($n+"|"+$shell.CreateShortcut($f.FullName).TargetPath); break }',
    '  }',
    '}',
  ].join('\n');
  const targets = new Map<string, string>();
  const result = await runProbe('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], 8000);
  for (const line of result.stdout.split(/\r?\n/)) {
    const split = line.indexOf('|');
    if (split <= 0) continue;
    const key = line.slice(0, split).trim();
    const target = line.slice(split + 1).trim();
    if (key && isFile(target)) targets.set(key, target);
  }
  shortcutCache = { at: Date.now(), targets };
}

async function resolveDesktopPath(agent: AgentDefinition): Promise<string | null> {
  for (const pattern of agent.appPaths ?? []) {
    const found = resolvePattern(pattern);
    if (found) return found;
  }
  return agent.shortcut ? resolveShortcut(agent.shortcut) : null;
}

async function resolveAgentCliPath(agent: AgentDefinition): Promise<string | null> {
  for (const candidate of [agent.command, ...(agent.commands ?? [])]) {
    const resolved = await resolveCommand(candidate);
    if (resolved) return resolved;
  }
  for (const pattern of agent.binPaths ?? []) {
    const resolved = resolvePattern(pattern);
    if (resolved) return resolved;
  }
  if (agent.cliSibling) {
    const desktop = await resolveDesktopPath(agent);
    if (desktop) {
      const sibling = path.join(path.dirname(desktop), agent.cliSibling);
      if (isFile(sibling)) return sibling;
    }
  }
  return null;
}

function isBatchFile(file: string): boolean {
  return /\.(cmd|bat)$/i.test(file);
}

async function resolveCommand(command: string): Promise<string | null> {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const result = await runProbe(finder, [command], 4000);
  if (!result.ok || !result.stdout) return null;
  const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return first && existsSync(first) ? first : null;
}

async function readVersion(command: string, args: string[]): Promise<string | undefined> {
  const result = await runProbe(command, args, 8000, isBatchFile(command));
  const text = `${result.stdout}${result.stderr}`.trim();
  if (!result.ok || !text) return undefined;
  return text.split(/\r?\n/)[0].slice(0, 120);
}

let detectionInFlight: Promise<AgentInfo[]> | null = null;

export async function detectAgents(refresh = false): Promise<AgentInfo[]> {
  if (!refresh && detectionCache && Date.now() - detectionCache.at < 60_000) return detectionCache.agents;
  if (detectionInFlight) return detectionInFlight;
  const task = (async () => {
    const agents = await Promise.all([...AGENTS, ...customAgents].map(async (agent) => {
      const resolved = await resolveAgentCliPath(agent);
      const desktopPath = await resolveDesktopPath(agent);
      const cliInstalled = Boolean(resolved);
      const desktopInstalled = Boolean(desktopPath);
      return {
        ...agent,
        installed: cliInstalled || desktopInstalled,
        runnable: cliInstalled && Boolean(buildArgs(agent.id, 'ping', process.cwd())),
        cliInstalled,
        desktopInstalled,
        desktopPath: desktopPath ?? undefined,
        path: resolved ?? undefined,
        version: resolved ? await readVersion(resolved, agent.versionArgs) : undefined,
      };
    }));
    detectionCache = { at: Date.now(), agents };
    return agents;
  })();
  detectionInFlight = task;
  try {
    return await task;
  } finally {
    if (detectionInFlight === task) detectionInFlight = null;
  }
}


/** 打开 Agent 的桌面版，并把当前项目目录作为参数传入。 */
export async function openAgentApp(agentId: string, cwd?: string): Promise<{ ok: boolean; error?: string }> {
  const agent = (await detectAgents()).find((item) => item.id === agentId);
  if (!agent) return { ok: false, error: t('未知 Agent') };
  if (!agent.desktopPath) return { ok: false, error: t('未检测到 {name} 桌面版', { name: agent.name }) };
  const target = typeof cwd === 'string' && cwd.trim() && existsSync(cwd) ? path.resolve(cwd) : '';
  const args = (agent.appArgs ?? ['{cwd}'])
    .map((arg) => arg.split('{cwd}').join(target))
    .filter(Boolean);
  try {
    const child = spawn(agent.desktopPath, args, {
      cwd: target || path.dirname(agent.desktopPath),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.on('error', () => undefined);
    child.unref();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 每个 agent 的参数在调研中逐项核对过；版本升级导致参数变化时按 id 单独调整。
function buildArgs(agentId: string, prompt: string, cwd: string): string[] | null {
  const customTemplate = customArgs.get(agentId);
  if (customTemplate) {
    return customTemplate.map((arg) => arg.split('{prompt}').join(prompt).split('{cwd}').join(cwd));
  }
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
    case 'workbuddy':
      return ['-p', prompt];
    case 'trae-agent':
      return ['run', prompt];
    case 'qwen':
      return ['-p', prompt, '-o', 'json', '--approval-mode', 'auto_edit'];
    case 'opencode':
      return ['run', prompt, '--format', 'json'];
    case 'goose':
      return ['run', '-t', prompt];
    case 'cursor':
      return ['-p', prompt, '--output-format', 'json', '--force'];
    case 'aider':
      return ['--message', prompt, '--yes', '--no-auto-commits', '--no-check-update', '--no-stream'];
    case 'cline':
      return ['prompt', prompt, '--json', '--auto-approve', 'true'];
    case 'crush':
      return ['run', prompt, '--yolo'];
    case 'kiro':
      return ['chat', '--no-interactive', prompt, '--trust-all-tools', '--output-format', 'stream-json'];
    case 'continue':
      return ['-p', prompt, '--auto'];
    case 'droid':
      return ['exec', prompt, '--auto', 'low', '--output-format', 'json'];
    case 'crow-cli':
      return ['run', prompt, '-j'];
    case 'crow5':
      return ['run', prompt, '--format', 'json', '--dir', cwd];
    case 'amp':
      return ['-x', prompt, '--no-ide'];
    case 'openhands':
      return ['--headless', '-t', prompt, '--json'];
    default:
      return null;
  }
}

function quoteWindowsArg(value: string): string {
  // 经 cmd.exe 传递时 % 会被展开，%% 还原为字面量。
  const escaped = value.replace(/%/g, '%%').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function spawnAgent(
  commandPath: string,
  args: string[],
  cwd: string,
  extraEnv?: Record<string, string>,
): ChildProcessWithoutNullStreams {
  const env = { ...process.env, ...(extraEnv ?? {}) };
  if (process.platform === 'win32' && isBatchFile(commandPath)) {
    const line = [quoteWindowsArg(commandPath), ...args.map(quoteWindowsArg)].join(' ');
    return spawn(line, { cwd, shell: true, windowsHide: true, env });
  }
  return spawn(commandPath, args, { cwd, windowsHide: true, env });
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

export async function runAgent(
  request: AgentRunRequest,
  onEvent: (event: AgentEvent) => void,
): Promise<{ ok: boolean; runId: string; summary: string; error?: string }> {
  const prompt = typeof request.prompt === 'string' ? request.prompt.slice(0, MAX_PROMPT) : '';
  if (!prompt.trim()) return Promise.resolve({ ok: false, runId: '', summary: '', error: t('提示词为空') });
  const agent = (await detectAgents()).find((item) => item.id === request.agentId);
  if (!agent) return Promise.resolve({ ok: false, runId: '', summary: '', error: t('未知 Agent') });
  if (!agent.runnable || !agent.path) {
    if (agent.desktopInstalled) {
      return Promise.resolve({ ok: false, runId: '', summary: '', error: t('{name} 仅支持桌面应用，无法自动执行', { name: agent.name }) });
    }
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
    child = spawnAgent(agent.path, args, cwd, agent.env);
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

export async function installAgent(
  agentId: string,
  onEvent?: (line: string) => void,
): Promise<AgentInstallResult> {
  const agent = AGENTS.find((item) => item.id === agentId);
  if (!agent) return { ok: false, agentId, output: '', error: t('未知 Agent') };
  if (await resolveAgentCliPath(agent)) {
    return { ok: true, agentId, output: t('{name} 已安装', { name: agent.name }) };
  }
  const spec = agent.install;
  if (!spec) return { ok: false, agentId, output: '', error: t('该 Agent 没有可用的自动安装方式') };
  if (spec.kind === 'manual') {
    return { ok: false, agentId, output: agent.installHint, error: t('需要手动安装：{hint}', { hint: agent.installHint }) };
  }
  if (!spec.command) return { ok: false, agentId, output: '', error: t('安装命令缺失') };
  if (installing.has(agentId)) return { ok: false, agentId, output: '', error: t('正在安装，请稍候') };
  installing.add(agentId);

  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    const append = (chunk: string): void => {
      if (settled || !chunk) return;
      output = (output + chunk).slice(-20_000);
      onEvent?.(chunk.slice(0, 2000));
    };
    let child: ReturnType<typeof spawn>;
    try {
      // npm/pip/uv/winget 在 Windows 上是 .cmd，需要 shell；PowerShell 脚本直接执行，避免参数被 shell 拆分。
      child = spawn(spec.command!, spec.args ?? [], {
        windowsHide: true,
        shell: spec.kind !== 'script',
        env: process.env,
      });
    } catch (error) {
      installing.delete(agentId);
      resolve({ ok: false, agentId, output: '', error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const finish = (ok: boolean, error?: string): void => {
      if (settled) return;
      settled = true;
      installing.delete(agentId);
      detectionCache = null;
      resolve({ ok, agentId, output: output.trim(), error });
    };
    const timer = setTimeout(() => {
      try {
        if (process.platform === 'win32' && child.pid) {
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 });
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        // 已退出
      }
      finish(false, t('安装超时'));
    }, 10 * 60_000);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    child.on('error', (error) => {
      clearTimeout(timer);
      finish(false, error.message);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        void (async () => {
          let installed = false;
          for (const candidate of [agent.command, ...(agent.commands ?? [])]) {
            if (await resolveCommand(candidate)) {
              installed = true;
              break;
            }
          }
          finish(installed, installed ? undefined : t('安装命令已结束，但仍未检测到可执行文件，请重开终端或检查 PATH'));
        })();
        return;
      }
      finish(false, t('安装失败，退出码 {code}', { code: String(code) }));
    });
  });
}

const TEAM_TASKS: Array<{ key: string; label: string; keywords: RegExp; priority: string[] }> = [
  {
    key: 'coding',
    label: '写代码 / 修 Bug',
    keywords: /代码|编程|开发|重构|修复|bug|实现|接口|测试|code|coding|refactor|implement|debug/i,
    priority: ['codex', 'claude', 'cursor', 'droid', 'cline', 'crush', 'aider', 'opencode', 'qwen', 'trae'],
  },
  {
    key: 'research',
    label: '调研 / 查资料',
    keywords: /调研|查资料|搜索|检索|对比|方案|研究|research|search|compare/i,
    priority: ['gemini', 'grok', 'claude', 'codex'],
  },
  {
    key: 'writing',
    label: '写作 / 文档',
    keywords: /写作|文档|文案|总结|改写|readme|文档说明|writing|document/i,
    priority: ['claude', 'qwen', 'gemini'],
  },
  {
    key: 'data',
    label: '数据 / 表格',
    keywords: /数据|表格|excel|csv|统计|分析|sql|dataset/i,
    priority: ['codex', 'claude', 'gemini'],
  },
  {
    key: 'design',
    label: '设计 / 视觉',
    keywords: /设计|视觉|ui|ux|配色|海报|figma|design/i,
    priority: ['claude', 'gemini'],
  },
  {
    key: 'general',
    label: '通用任务',
    keywords: /.*/,
    priority: ['claude', 'codex', 'gemini', 'qwen'],
  },
];

function projectSignals(cwd: string): string {
  if (!cwd) return '';
  const parts: string[] = [];
  try {
    const entries = readdirSync(cwd, { withFileTypes: true }).slice(0, 200);
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      parts.push(entry.name);
    }
    if (entries.some((entry) => /\.(blend|fbx|obj|stl|prproj|aep|drp|veg|ma|mb|max|c4d)$/i.test(entry.name))) {
      parts.push('视频 剪辑 3d 建模 渲染 动画');
    }
    if (entries.some((entry) => /\.(psd|ai|fig|sketch|xd)$/i.test(entry.name))) parts.push('设计 视觉 ui');
    if (entries.some((entry) => /\.(csv|xlsx|xls|parquet|sql)$/i.test(entry.name))) parts.push('数据 表格 统计 分析');
    if (existsSync(path.join(cwd, 'package.json'))) {
      parts.push('代码 编程 开发');
      try {
        const text = readFileSync(path.join(cwd, 'package.json'), 'utf8').slice(0, 8000);
        if (/"(react|vue|svelte|electron|vite)"/.test(text)) parts.push('前端 ui 界面');
        if (/"(express|fastify|koa|hono)"/.test(text)) parts.push('接口 后端');
      } catch {
        // 文件不可读时只保留目录信号
      }
    }
    if (existsSync(path.join(cwd, 'pyproject.toml')) || existsSync(path.join(cwd, 'requirements.txt'))) {
      parts.push('python 代码 数据');
    }
    if (existsSync(path.join(cwd, 'Cargo.toml'))) parts.push('rust 代码');
    if (existsSync(path.join(cwd, 'go.mod'))) parts.push('go 代码');
  } catch {
    // 项目目录不可读时只用任务文本分类
  }
  return parts.join(' ');
}

function classifyTeamTask(task: string, cwd: string): { key: string; label: string; priority: string[] } {
  const haystack = `${task} ${projectSignals(cwd)}`;
  for (const item of TEAM_TASKS) {
    if (item.keywords.test(haystack)) return item;
  }
  return TEAM_TASKS[TEAM_TASKS.length - 1];
}

function scoreSupervisor(agent: AgentInfo, kind: { key: string; priority: string[] }): number {
  const priorityIndex = kind.priority.indexOf(agent.id);
  let score = priorityIndex >= 0 ? 100 - priorityIndex * 10 : 40;
  const roleText = agent.roles.join(' ');
  if (/规划|蓝图|主管|架构|调度/.test(roleText)) score += 20;
  if (/审查/.test(roleText)) score += 6;
  if (agent.specialties.some((item) => /规划|架构|蓝图|设计/.test(item))) score += 10;
  if (agent.specialties.some((item) => /审查|验证/.test(item))) score += 4;
  return score;
}

function rankAgents(
  agents: AgentInfo[],
  kind: { key: string; priority: string[] },
): Array<{ agent: AgentInfo; score: number }> {
  return agents
    .map((agent) => ({ agent, score: scoreSupervisor(agent, kind) }))
    .sort((left, right) => right.score - left.score || left.agent.name.localeCompare(right.agent.name));
}

export async function suggestTeam(task: string, cwd = ''): Promise<TeamSuggestion> {
  const kind = classifyTeamTask(typeof task === 'string' ? task : '', cwd);
  const installed = (await detectAgents()).filter((agent) => agent.installed);
  const scored = rankAgents(installed, kind);
  const members = scored.slice(0, 3).map((item) => item.agent.id);
  const supervisor = scored.find((item) => item.agent.runnable)?.agent.id ?? '';
  if (supervisor && !members.includes(supervisor)) members.push(supervisor);
  const names = members.map((id) => installed.find((agent) => agent.id === id)?.name ?? id);
  return {
    taskKind: kind.label,
    members,
    supervisorId: supervisor,
    reason: members.length
      ? t('按“{kind}”与项目类型评分：{names}；{supervisor} 任主管', {
        kind: kind.label,
        names: names.join('、'),
        supervisor: installed.find((agent) => agent.id === supervisor)?.name ?? t('暂无可自动执行的主管'),
      })
      : t('未检测到已安装的 Agent'),
    scores: scored.map((item) => ({ agentId: item.agent.id, score: item.score })),
  };
}

/** 桌面版参与者无法无头执行：打开应用并把任务放进剪贴板，由用户粘贴。 */
async function desktopHandoff(
  agent: AgentInfo,
  prompt: string,
  cwd: string,
  onEvent: (event: AgentEvent) => void,
): Promise<{ ok: boolean; summary: string }> {
  const opened = await openAgentApp(agent.id, cwd);
  if (opened.ok) clipboard.writeText(prompt);
  const text = opened.ok
    ? t('已打开 {name}，任务已复制到剪贴板，请在应用中粘贴执行。', { name: agent.name })
    : (opened.error ?? t('未检测到 {name} 桌面版', { name: agent.name }));
  onEvent({ runId: `desktop-${agent.id}-${Date.now()}`, agentId: agent.id, phase: opened.ok ? 'done' : 'error', text });
  return { ok: opened.ok, summary: text };
}

export async function runTeam(
  request: TeamRequest,
  onEvent: (event: AgentEvent) => void,
): Promise<TeamResult> {
  const task = typeof request.task === 'string' ? request.task.trim().slice(0, MAX_PROMPT) : '';
  if (!task) return { ok: false, summaries: [], error: t('填写协作任务') };
  const installed = (await detectAgents()).filter((agent) => agent.installed);
  if (!installed.length) return { ok: false, summaries: [], error: t('未检测到任何可用 Agent') };

  const requested = new Set(Array.isArray(request.agentIds) ? request.agentIds.filter((id) => typeof id === 'string') : []);
  const cwd = typeof request.cwd === 'string' && request.cwd.trim() ? path.resolve(request.cwd) : process.cwd();
  const kind = classifyTeamTask(task, cwd);
  const roomApps = (Array.isArray(request.apps) ? request.apps : [])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 80))
    .slice(0, 12);
  const roomLine = roomApps.length
    ? `会议室中已加入的软件：${roomApps.join('、')}。涉及这些软件的子任务要说明打开方式与操作步骤。`
    : '';
  const webLines = request.webSearch ? await searchForPrompt(task, 5) : [];
  const webBlock = webLines.length
    ? ['以下是刚检索到的实时网络结果（可能含噪音，引用时注明来源）：', ...webLines].join('\n')
    : '';
  const suggested = requested.size ? null : await suggestTeam(task, cwd);
  const members = requested.size
    ? installed.filter((agent) => requested.has(agent.id))
    : (suggested?.members.length
      ? suggested.members.map((id) => installed.find((agent) => agent.id === id)).filter(Boolean) as AgentInfo[]
      : installed.slice(0, 3));
  if (!members.length) return { ok: false, summaries: [], error: t('所选 Agent 不可用') };

  const summaries: Array<{ agentId: string; ok: boolean; text: string }> = [];

  // 协作必须有主管：默认在成员中按任务与项目评分，用户指定优先。
  if (request.mode === 'supervisor') {
    const explicit = typeof request.supervisorId === 'string' ? request.supervisorId.trim() : '';
    let supervisor = explicit
      ? members.find((agent) => agent.id === explicit) ?? installed.find((agent) => agent.id === explicit)
      : undefined;
    if (explicit && !supervisor) return { ok: false, summaries: [], error: t('所选 Agent 不可用') };
    if (supervisor && !supervisor.runnable) {
      return { ok: false, summaries: [], error: t('主管必须支持命令行执行，请先安装该 Agent 的 CLI') };
    }
    if (supervisor && !members.some((agent) => agent.id === supervisor!.id)) members.push(supervisor);
    supervisor ??= rankAgents(members.filter((agent) => agent.runnable), kind)[0]?.agent;
    if (!supervisor) return { ok: false, summaries: [], error: t('没有可自动执行的主管；请安装 CLI 或选择其他 Agent') };
    const workers = members.filter((agent) => agent.id !== supervisor.id);
    const planPrompt = [
      '你是本次协作的主管。只输出可执行计划，不要写代码，不要调用工具。',
      '计划需包含：任务拆解、每个子任务交给谁、产出格式、验收标准、风险。',
      '',
      `项目目录：${cwd}`,
      `任务：${task}`,
      roomLine,
      webBlock,
      `可用执行成员：${workers.map((agent) => `${agent.name}（${agent.roles.join('/')}）`).join('、')}`,
    ].filter((line) => line !== '').join('\n');
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
        roomLine,
        webBlock,
        `你的角色：${agent.roles.join(' / ')}。完成后输出：做了什么、证据（命令/文件）、结论、未解决问题。`,
      ].filter((line) => line !== '').join('\n');
      const result = agent.runnable
        ? await runAgent({ agentId: agent.id, prompt: workerPrompt, cwd }, onEvent)
        : await desktopHandoff(agent, workerPrompt, cwd, onEvent);
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
    return { ok: summaries.some((item) => item.ok), supervisorId: supervisor.id, summaries, error: final.error };
  }

  await pool(members, MAX_CONCURRENCY, async (agent) => {
    const prompt = [
      `请独立完成以下任务，输出结论与证据（命令、文件:行号、引用链接）。`,
      `项目目录：${cwd}`,
      roomLine,
      webBlock,
      '',
      task,
    ].filter((line) => line !== '').join('\n');
    const result = agent.runnable
      ? await runAgent({ agentId: agent.id, prompt, cwd }, onEvent)
      : await desktopHandoff(agent, prompt, cwd, onEvent);
    summaries.push({ agentId: agent.id, ok: result.ok, text: result.summary });
  });
  return { ok: summaries.some((item) => item.ok), summaries };
}

export async function agentCatalog(): Promise<AgentInfo[]> {
  return detectAgents();
}
