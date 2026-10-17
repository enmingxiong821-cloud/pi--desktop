import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import './style.css';
import { applyStaticI18n, getLocale, initLocale, setLocale, t } from './i18n.js';

interface InstallInfo {
  version: string;
  cliPath: string;
  nodePath: string;
  agentDir?: string;
}

interface ProjectRecord {
  path: string;
  name: string;
  lastUsed: number;
}

interface ModelEntry {
  provider: string;
  id: string;
  name?: string;
  reasoning: boolean;
  contextWindow?: number;
  relay: boolean;
  current: boolean;
}

interface ModelReport {
  defaultProvider: string;
  defaultModel: string;
  relayProviders: string[];
  models: ModelEntry[];
  warnings: string[];
}

interface ModelModule {
  id: string;
  name: string;
  provider: string;
  model: string;
  auto?: boolean;
}

interface ProviderInfo {
  id: string;
  name?: string;
  baseUrl?: string;
  api?: string;
  custom: boolean;
  modelCount: number;
  modelsText?: string;
  headerNames?: string[];
  hasStoredKey: boolean;
  credentialType?: string;
  keySource: 'stored' | 'config' | 'environment' | 'command' | 'none';
}

interface ProviderReport {
  providers: ProviderInfo[];
  modelsPath: string;
  authPath: string;
  settingsPath: string;
  warnings: string[];
}

interface SaveProviderResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

interface FetchModelsResult {
  ok: boolean;
  reachable?: boolean;
  status?: number;
  models?: string[];
  note?: string;
  error?: string;
  latencyMs?: number;
}

interface CapabilityEntry {
  kind: 'extension' | 'skill' | 'mcp' | 'package';
  name: string;
  detail?: string;
  scope: 'user' | 'project';
}

interface SessionEntry {
  id: string;
  path: string;
  timestamp: string;
  cwd: string;
  size: number;
}

interface MediaItem {
  path: string;
  name: string;
  kind: 'image' | 'video' | 'file';
  size: number;
  url: string;
}

interface CapabilityResult {
  ok: boolean;
  path?: string;
  error?: string;
}

interface GitChange {
  code: string;
  path: string;
}

interface GitStatusResult {
  ok: boolean;
  repo: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  changes?: GitChange[];
  error?: string;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface ToolInfo {
  ok: boolean;
  path?: string;
  version?: string;
  error?: string;
}

interface EnvironmentReport {
  platform: string;
  node: ToolInfo;
  npm: ToolInfo;
  pi: ToolInfo & { cliPath?: string; source?: string };
}

interface SetupResult {
  ok: boolean;
  installed?: boolean;
  version?: string;
  output?: string;
  error?: string;
}

interface MediaResult {
  ok: boolean;
  item?: MediaItem;
  items?: MediaItem[];
  error?: string;
}

interface PiDesktopApi {
  locate(): Promise<{ ok: boolean; install?: InstallInfo; error?: string }>;
  setLocale(locale: string): Promise<{ ok: boolean; locale: string }>;
  pickProject(): Promise<{ ok: boolean; path?: string }>;
  projects(): Promise<{ ok: boolean; projects: ProjectRecord[] }>;
  inspectModels(): Promise<{ ok: boolean; report?: ModelReport; error?: string }>;
  providers(): Promise<{ ok: boolean; report?: ProviderReport; error?: string }>;
  saveProvider(input: {
    id: string;
    name?: string;
    baseUrl: string;
    api: string;
    apiKey?: string;
    headersText?: string;
    keepHeaders?: boolean;
    modelsText: string;
  }): Promise<SaveProviderResult>;
  deleteProvider(id: string): Promise<SaveProviderResult>;
  saveProviderKey(id: string, key: string): Promise<SaveProviderResult>;
  fetchProviderModels(input: {
    providerId?: string;
    baseUrl?: string;
    api?: string;
    apiKey?: string;
    headersText?: string;
  }): Promise<FetchModelsResult>;
  setDefaultModel(provider: string, model: string): Promise<SaveProviderResult>;
  pickMedia(): Promise<MediaResult>;
  clipboardImage(): Promise<MediaResult>;
  allowMediaPath(filePath: string): Promise<MediaResult>;
  openMediaExternally(filePath: string): Promise<{ ok: boolean; error?: string }>;
  filePath(file: File): string;
  inspectCapabilities(cwd: string): Promise<{ ok: boolean; report?: { capabilities: CapabilityEntry[]; warnings: string[] }; error?: string }>;
  addSkill(input: {
    scope: 'user' | 'project';
    cwd?: string;
    name: string;
    description?: string;
    body?: string;
  }): Promise<CapabilityResult>;
  addMcp(input: {
    scope: 'user' | 'project';
    cwd?: string;
    name: string;
    command: string;
    argsText?: string;
    envText?: string;
  }): Promise<CapabilityResult>;
  gitStatus(cwd: string): Promise<GitStatusResult>;
  openPath(target: string): Promise<{ ok: boolean; error?: string }>;
  openVSCode(target: string): Promise<{ ok: boolean; error?: string }>;
  probeEnvironment(): Promise<EnvironmentReport>;
  installPi(): Promise<SetupResult>;
  createShortcut(target?: string): Promise<{ ok: boolean; path?: string; error?: string }>;
  sessions(cwd: string): Promise<{ ok: boolean; sessions?: SessionEntry[]; error?: string }>;
  startPi(options: { cwd: string; cols: number; rows: number; sessionPath?: string; isolated?: boolean; model?: string }): Promise<{
    ok: boolean;
    isolatedDir?: string;
    isolated?: boolean;
    install?: InstallInfo;
    error?: string;
  }>;
  stopPi(): Promise<{ ok: boolean }>;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  ack(bytes: number): void;
  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<void>;
  openExternal(url: string): Promise<{ ok: boolean }>;
  onData(callback: (data: string) => void): () => void;
  onState(callback: (state: { status: string; exitCode?: number; cwd?: string }) => void): () => void;
  onOpenProject(callback: (projectPath: string) => void): () => void;
}

declare global {
  interface Window {
    piDesktop: PiDesktopApi;
  }
}

const api = window.piDesktop;
initLocale();
const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(t('缺少元素 #{id}', { id }));
  return element as T;
};

const terminalElement = $<HTMLDivElement>('terminal');
const terminal = new Terminal({
  cursorBlink: true,
  fontFamily: '"Cascadia Mono", "Consolas", "Microsoft YaHei", monospace',
  fontSize: 15,
  lineHeight: 1.2,
  scrollback: 10000,
  allowProposedApi: true,
  scrollOnUserInput: true,
  linkHandler: {
    // OSC 8 links (Pi prints them for files/URLs); media files open in the in-app preview.
    activate: (_event, uri) => {
      void maybePreviewLocalFile(uri).then((opened) => {
        if (opened) return;
        void api.openExternal(uri).then((result) => {
          if (!result.ok) toast('无法打开链接：{uri}', { uri });
        });
      });
    },
  },
  theme: {
    background: '#111517',
    foreground: '#e9efed',
    cursor: '#a4e6cc',
    selectionBackground: '#2b4a44',
    black: '#111517',
    brightBlack: '#5b6b69',
    green: '#a4e6cc',
    brightGreen: '#c8f5e5',
    cyan: '#8fd8c4',
    brightCyan: '#b5f0e2',
  },
});

const fit = new FitAddon();
const searchAddon = new SearchAddon();
terminal.loadAddon(fit);
terminal.loadAddon(searchAddon);
terminal.loadAddon(new Unicode11Addon());
terminal.loadAddon(new WebLinksAddon((_event, uri) => {
  void api.openExternal(uri).then((result) => {
    if (!result.ok) toast('无法打开链接：{uri}', { uri });
  });
}));
terminal.unicode.activeVersion = '11';
terminal.open(terminalElement);

const imeTextarea = terminalElement.querySelector<HTMLTextAreaElement>('.xterm-helper-textarea');
const terminalScreen = terminalElement.querySelector<HTMLElement>('.xterm-screen');

// xterm only moves its hidden textarea on compositionupdate. Some Windows IMEs query
// the caret at compositionstart, so anchor it before the candidate window opens.
function pointImeAtCursor(): void {
  if (!imeTextarea || !terminalScreen) return;
  const screenRect = terminalScreen.getBoundingClientRect();
  if (!screenRect.width || !screenRect.height) return;
  const parentRect = (imeTextarea.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? screenRect;
  const cellWidth = Math.max(screenRect.width / terminal.cols, 1);
  const cellHeight = Math.max(screenRect.height / terminal.rows, 1);
  const buffer = terminal.buffer.active;
  imeTextarea.style.left = `${screenRect.left - parentRect.left + buffer.cursorX * cellWidth}px`;
  imeTextarea.style.top = `${screenRect.top - parentRect.top + buffer.cursorY * cellHeight}px`;
  imeTextarea.style.width = `${cellWidth}px`;
  imeTextarea.style.height = `${cellHeight}px`;
  imeTextarea.style.lineHeight = `${cellHeight}px`;
}

imeTextarea?.addEventListener('compositionstart', () => {
  pointImeAtCursor();
  audit('IME 组合开始');
});
imeTextarea?.addEventListener('compositionupdate', (event) => {
  pointImeAtCursor();
  const data = (event as CompositionEvent).data ?? '';
  audit('IME 组合中 · {count} 字', { count: data.length });
});
imeTextarea?.addEventListener('compositionend', (event) => {
  const data = (event as CompositionEvent).data ?? '';
  audit('IME 上屏 · {count} 字', { count: data.length });
});
// Windows IMEs read the caret on the first IME key (keyCode 229), before compositionstart.
terminalElement.addEventListener('keydown', (event) => {
  if (event.isComposing || event.keyCode === 229) pointImeAtCursor();
}, true);
terminal.onScroll(() => {
  const buffer = terminal.buffer.active;
  scrollBottomButton.hidden = buffer.viewportY >= buffer.baseY;
});

let currentCwd = '';
let running = false;
let startPending = false;
let fontSize = 15;
let detectedVersion = '';
let versionMissing = false;
let isolatedDir = '';
let selectedModel: ModelEntry | null = null;
let models: ModelEntry[] = [];
let providers: ProviderInfo[] = [];
let providerMode: 'new' | 'edit' | 'builtin' = 'new';
let providerEditingId = '';
let providerBusy = false;
let modelModules: ModelModule[] = [];
let projectModelBindings: Record<string, string> = {};
let moduleEditingId = '';

const versionElement = $('pi-version');
const activeModelElement = $('active-model');
const stateElement = $('process-state');
const projectPathElement = $('project-path');
const recentElement = $('recent-projects');
const nodePathElement = $('node-path');
const npmVersionElement = $('npm-version');
const piEnvElement = $('pi-env');
const setupEnvButton = $<HTMLButtonElement>('setup-env');
const createShortcutButton = $<HTMLButtonElement>('create-shortcut');
const autoStartCheckbox = $<HTMLInputElement>('auto-start');
const isolatedElement = $('isolated-path');
const cwdElement = $('cwd-label');
const sizeElement = $('cols-rows');
const startButton = $<HTMLButtonElement>('start-pi');
const stopButton = $<HTMLButtonElement>('stop-pi');
const openFolderButton = $<HTMLButtonElement>('open-folder');
const openVSCodeButton = $<HTMLButtonElement>('open-vscode');
const auditElement = $<HTMLOListElement>('audit-log');
const modelListElement = $('model-list');
const modelSummaryElement = $('model-summary');
const modelSearchElement = $<HTMLInputElement>('model-search');
const previewElement = $('command-preview');
const copyButton = $<HTMLButtonElement>('copy-command');
const capabilitySummaryElement = $('capability-summary');
const capabilityListElement = $('capability-list');
const capabilityFormElement = $<HTMLFormElement>('capability-form');
const capabilityKindSelect = $<HTMLSelectElement>('capability-kind');
const capabilityScopeSelect = $<HTMLSelectElement>('capability-scope');
const capabilityNameInput = $<HTMLInputElement>('capability-name');
const capabilityDescriptionInput = $<HTMLInputElement>('capability-description');
const capabilityBodyInput = $<HTMLTextAreaElement>('capability-body');
const capabilityCommandInput = $<HTMLInputElement>('capability-command');
const capabilityArgsInput = $<HTMLTextAreaElement>('capability-args');
const capabilityEnvInput = $<HTMLTextAreaElement>('capability-env');
const capabilityFormNote = $('capability-form-note');
const sessionSummaryElement = $('session-summary');
const sessionListElement = $('session-list');
const searchBar = $('search-bar');
const searchInput = $<HTMLInputElement>('search-input');
const scrollBottomButton = $<HTMLButtonElement>('scroll-bottom');
const hintElement = $('terminal-hint');
const isolatedCheckbox = $<HTMLInputElement>('isolated-mode');
const sendButton = $<HTMLButtonElement>('send-command');
const alertBar = $('terminal-alert');
const alertText = $('terminal-alert-text');
const modelProviderElement = $<HTMLSelectElement>('model-provider');
const moduleListElement = $('module-list');
const moduleFormElement = $<HTMLFormElement>('module-form');
const moduleNameInput = $<HTMLInputElement>('module-name');
const moduleModelSelect = $<HTMLSelectElement>('module-model');
const moduleModelCustomInput = $<HTMLInputElement>('module-model-custom');
const moduleAutoCheckbox = $<HTMLInputElement>('module-auto');
const projectModuleSelect = $<HTMLSelectElement>('project-module');
const setDefaultButton = $<HTMLButtonElement>('set-default');
const providerSummaryElement = $('provider-summary');
const providerListElement = $('provider-list');
const providerFormElement = $<HTMLFormElement>('provider-form');
const providerIdInput = $<HTMLInputElement>('provider-id');
const providerDisplayInput = $<HTMLInputElement>('provider-display');
const providerBaseUrlInput = $<HTMLInputElement>('provider-baseurl');
const providerApiSelect = $<HTMLSelectElement>('provider-api');
const providerKeyInput = $<HTMLInputElement>('provider-key');
const providerHeadersInput = $<HTMLTextAreaElement>('provider-headers');
const providerHeadersReplace = $<HTMLInputElement>('provider-headers-replace');
const providerModelsInput = $<HTMLTextAreaElement>('provider-models');
const providerFormNote = $('provider-form-note');
const clearProviderKeyButton = $<HTMLButtonElement>('clear-provider-key');
const composerElement = $('composer');
const composerInput = $<HTMLTextAreaElement>('composer-input');
const attachmentBar = $('attachment-bar');
const sendMessageButton = $<HTMLButtonElement>('send-message');
const stopRunButton = $<HTMLButtonElement>('stop-run');
const commandPalette = $('command-palette');
const commandSearch = $<HTMLInputElement>('command-search');
const commandListElement = $('command-list');
const mediaPreview = $('media-preview');
const mediaPreviewName = $('media-preview-name');
const mediaPreviewBody = $('media-preview-body');
const mediaPreviewExternalButton = $<HTMLButtonElement>('media-preview-external');
const mediaPreviewCloseButton = $<HTMLButtonElement>('media-preview-close');

let attachments: MediaItem[] = [];
let previewItem: MediaItem | null = null;
let previewScale = 1;
let previewX = 0;
let previewY = 0;
let previewPan: { x: number; y: number; left: number; top: number } | null = null;

function timestamp(): string {
  return new Date().toLocaleTimeString(getLocale() === 'en' ? 'en-US' : 'zh-CN', { hour12: false });
}

function audit(source: string, vars?: Record<string, string | number>): void {
  const item = document.createElement('li');
  item.textContent = `${timestamp()} · ${t(source, vars)}`;
  auditElement.prepend(item);
  while (auditElement.children.length > 60) auditElement.lastElementChild?.remove();
}

let toastTimer: number | undefined;
function toast(source: string, vars?: Record<string, string | number>): void {
  const element = $('toast');
  element.textContent = t(source, vars);
  element.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('visible'), 4000);
}

type ProcessStatus = 'idle' | 'starting' | 'running' | 'exited' | 'error';
let stateStatus: ProcessStatus = 'idle';
let stateSource = '未启动';
let stateVars: Record<string, string | number> | undefined;

function setState(status: ProcessStatus, source: string, vars?: Record<string, string | number>): void {
  stateStatus = status;
  stateSource = source;
  stateVars = vars;
  stateElement.textContent = t(source, vars);
  stateElement.className = `state ${status}`;
}

let hintSource = '';
let hintVars: Record<string, string | number> | undefined;

function setTerminalHint(source?: string, vars?: Record<string, string | number>): void {
  hintSource = source ?? '';
  hintVars = vars;
  if (source) {
    hintElement.textContent = t(source, vars);
    hintElement.hidden = false;
  } else {
    hintElement.hidden = true;
  }
}

let modelProbe = '';
let modelProbeTimer: number | undefined;
let shownModel = '';
let failedModel = '';
let lastDiagnosisKey = '';
let dismissedDiagnosis = '';

interface Diagnosis {
  key: string;
  source: string;
  vars?: Record<string, string | number>;
}

let activeDiagnosis: Diagnosis | null = null;

function diagnosisMessage(found: Diagnosis): string {
  const vars = { ...found.vars };
  if ('model' in vars) vars.model = String(vars.model || t('当前模型'));
  return t(found.source, vars);
}

// Turn Pi's raw provider errors into a next step. The raw text is never echoed
// here because it can contain an API key prefix.
function diagnose(clean: string): Diagnosis | null {
  const provider = shownModel.split('/')[0] ?? '';
  if (/Incorrect API key provided|invalid_api_key|API error \(401\)|No API key|not logged in/i.test(clean)) {
    return { key: `auth:${provider}`, source: '{model} 的凭据被拒绝（401）。在右侧模型面板换一个 provider，或在 Pi 里执行 /login 重新登录。', vars: { model: shownModel } };
  }
  if (/insufficient_quota|exceeded your current quota/i.test(clean)) {
    return { key: `quota:${provider}`, source: '{model} 额度不足。换用其他 provider 或检查账户余额。', vars: { model: shownModel } };
  }
  if (/rate limit|API error \(429\)/i.test(clean)) {
    return { key: `rate:${provider}`, source: '{model} 被限流（429）。稍后重试，或切换到其他模型。', vars: { model: shownModel } };
  }
  if (/model_not_found|API error \(404\)/i.test(clean)) {
    return { key: `missing:${shownModel}`, source: '提供方找不到模型 {model}，可能已下线。请在模型面板换一个。', vars: { model: shownModel } };
  }
  if (/context (window|length)|too many tokens|maximum context/i.test(clean)) {
    return { key: 'context', source: '上下文超出模型上限。用 /compact 压缩，或新建会话。' };
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network error/i.test(clean)) {
    return { key: 'network', source: '连接模型服务失败。检查网络、代理或中转站地址后重试。' };
  }
  return null;
}

function applyDiagnosis(clean: string): void {
  const found = diagnose(clean);
  if (!found || found.key === lastDiagnosisKey) return;
  lastDiagnosisKey = found.key;
  activeDiagnosis = found;
  // Drop the tail so the same error is not re-diagnosed on every frame.
  modelProbe = '';
  if (found.key.startsWith('auth:') && shownModel && failedModel !== shownModel) {
    failedModel = shownModel;
    renderModels();
  }
  if (found.key === dismissedDiagnosis) return;
  const message = diagnosisMessage(found);
  if (!alertBar.hidden && alertText.textContent === message) return;
  alertText.textContent = message;
  alertBar.hidden = false;
}

// Pi draws "0.0%/272k  (auto) ... (openai) gpt-5.5 • medium" on every frame;
// the last match in the tail is the live model.
function trackActiveModel(data: string): void {
  modelProbe = (modelProbe + data).slice(-8192);
  if (modelProbeTimer !== undefined) return;
  modelProbeTimer = window.setTimeout(() => {
    modelProbeTimer = undefined;
    const clean = modelProbe
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
      .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
    const matches = [...clean.matchAll(/\(([\w.-]+)\)\s+([\w./:+-]+)\s+•/g)];
    const last = matches[matches.length - 1];
    if (last) {
      const label = `${last[1]}/${last[2]}`;
      if (label !== shownModel) {
        shownModel = label;
        dismissedDiagnosis = '';
        lastDiagnosisKey = '';
        alertBar.hidden = true;
        activeModelElement.textContent = t('模型 {model}', { model: label });
      }
    }
    applyDiagnosis(clean);
  }, 250);
}

function updateSize(): void {
  sizeElement.textContent = `${terminal.cols} × ${terminal.rows}`;
}

function doFit(): void {
  try {
    fit.fit();
  } catch {
    return;
  }
  updateSize();
  if (running) api.resize(terminal.cols, terminal.rows);
}

function activateTab(id: string): void {
  document.querySelectorAll<HTMLButtonElement>('.panel-tabs [role=tab]').forEach((tab) => {
    const selected = tab.id === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const pane = document.getElementById(tab.getAttribute('aria-controls') ?? '');
    if (pane) pane.hidden = !selected;
  });
  if (id === 'tab-provider') void refreshProviders();
  if (id === 'tab-task') {
    refreshTaskPane();
    void refreshTaskGit();
  }
}

document.querySelectorAll<HTMLButtonElement>('.panel-tabs [role=tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => activateTab(tab.id));
  tab.addEventListener('keydown', (event) => {
    let next: HTMLButtonElement | undefined;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      event.preventDefault();
      activateTab(next.id);
      next.focus();
    }
  });
});

function setProject(cwd: string): void {
  currentCwd = cwd;
  rememberLastProject(cwd);
  projectPathElement.textContent = cwd;
  cwdElement.textContent = cwd;
  startButton.disabled = running;
  openFolderButton.disabled = false;
  openVSCodeButton.disabled = false;
  if (!running) setTerminalHint('点击「新会话」启动 Pi');
  audit('选择项目 {cwd}', { cwd });
  renderModules();
  todoItems = loadTodos();
  gitReport = null;
  refreshTaskPane();
  void refreshTaskGit();
  void refreshCapabilities();
  void refreshSessions();
}

let lastProjects: ProjectRecord[] = [];

function renderProjects(projects: ProjectRecord[]): void {
  lastProjects = projects;
  recentElement.replaceChildren();
  for (const project of projects) {
    if (project.path === currentCwd) continue;
    const button = document.createElement('button');
    const name = document.createElement('strong');
    name.textContent = project.name;
    const detail = document.createElement('small');
    detail.textContent = project.path;
    button.append(name, detail);
    button.title = project.path;
    button.addEventListener('click', () => setProject(project.path));
    recentElement.append(button);
  }
  if (!recentElement.children.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('还没有最近项目。');
    recentElement.append(empty);
  }
}

async function refreshProjects(): Promise<void> {
  try {
    const result = await api.projects();
    if (result.ok) renderProjects(result.projects);
  } catch {
    renderProjects([]);
  }
}

const LAST_PROJECT_KEY = 'pi-last-project';
const AUTO_START_KEY = 'pi-autostart';
let environmentBusy = false;
let externalProjectPending = false;

function renderEnvironment(report: EnvironmentReport): void {
  nodePathElement.textContent = report.node.ok
    ? `${report.node.path ?? '—'}${report.node.version ? ` · v${report.node.version}` : ''}`
    : t('未找到');
  nodePathElement.title = report.node.error ?? report.node.path ?? '';
  npmVersionElement.textContent = report.npm.ok
    ? (report.npm.version ? `v${report.npm.version}` : t('已安装'))
    : t('未找到');
  npmVersionElement.title = report.npm.path ?? report.npm.error ?? '';
  piEnvElement.textContent = report.pi.ok ? `Pi ${report.pi.version ?? '?'}` : t('未安装');
  piEnvElement.title = report.pi.ok
    ? `${report.pi.source === 'managed' ? t('受管安装') : t('npm 全局安装')}：${report.pi.cliPath ?? ''}`
    : report.pi.error ?? '';
  setupEnvButton.textContent = report.node.ok && report.pi.ok ? t('重新检查环境') : t('一键配置环境');
}

function syncVersionFromEnvironment(report: EnvironmentReport): void {
  if (report.pi.ok) {
    detectedVersion = report.pi.version ?? '';
    versionMissing = false;
    versionElement.textContent = `Pi ${detectedVersion}`;
    if (stateStatus === 'error') setState('idle', '未启动');
  } else {
    versionMissing = true;
    versionElement.textContent = t('Pi 未找到');
    if (!running) setState('error', '环境异常');
  }
}

async function refreshEnvironment(): Promise<EnvironmentReport | null> {
  try {
    const report = await api.probeEnvironment();
    renderEnvironment(report);
    return report;
  } catch (error) {
    nodePathElement.textContent = '—';
    npmVersionElement.textContent = '—';
    piEnvElement.textContent = t('检测失败');
    piEnvElement.title = error instanceof Error ? error.message : String(error);
    return null;
  }
}

async function runEnvironmentSetup(): Promise<void> {
  if (environmentBusy) return;
  environmentBusy = true;
  setupEnvButton.disabled = true;
  setupEnvButton.textContent = t('配置中…');
  let report: EnvironmentReport | null = null;
  try {
    report = await api.probeEnvironment();
    if (!report.node.ok) {
      toast('未找到 Node.js，已打开下载页；安装后再次点击一键配置');
      audit('环境异常：未找到 Node.js');
      void api.openExternal('https://nodejs.org/zh-cn/download');
      return;
    }
    if (!report.pi.ok) {
      audit('开始安装 Pi');
      const result = await api.installPi();
      if (!result.ok) {
        toast('Pi 安装失败：{error}', { error: result.error ?? t('未知错误') });
        audit('Pi 安装失败：{error}', { error: result.error ?? t('未知错误') });
        return;
      }
      audit(result.installed ? '已安装 Pi {version}' : 'Pi 已就绪 {version}', {
        version: result.version ?? '',
      });
      toast('Pi 已就绪，正在重新检测环境');
    } else {
      audit('环境检查通过');
    }
    report = await api.probeEnvironment();
    renderEnvironment(report);
    syncVersionFromEnvironment(report);
    if (report.pi.ok) {
      versionMissing = false;
      if (!running) setState('idle', '未启动');
    }
  } catch (error) {
    toast('环境配置失败：{error}', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    environmentBusy = false;
    setupEnvButton.disabled = false;
    setupEnvButton.textContent = report?.node.ok && report.pi.ok ? t('重新检查环境') : t('一键配置环境');
  }
}

async function createDesktopShortcut(): Promise<void> {
  createShortcutButton.disabled = true;
  try {
    const result = await api.createShortcut(currentCwd || undefined);
    if (result.ok) {
      toast('已创建快捷方式：{path}', { path: result.path ?? '' });
      audit('创建桌面快捷方式 {path}', { path: result.path ?? '' });
    } else {
      toast('创建快捷方式失败：{error}', { error: result.error ?? t('未知错误') });
    }
  } catch (error) {
    toast('创建快捷方式失败：{error}', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    createShortcutButton.disabled = false;
  }
}

function autoStartEnabled(): boolean {
  return autoStartCheckbox.checked;
}

function rememberLastProject(cwd: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, cwd);
  } catch {
    // storage is optional
  }
}

async function openExternalProject(projectPath: string): Promise<void> {
  if (running || startPending) {
    await api.stopPi();
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
  setProject(projectPath);
  void refreshProjects();
  if (autoStartEnabled() && !versionMissing) void startSession();
}

function contextLabel(value?: number): string {
  if (!value) return '';
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : `${Math.round(value / 1000)}K`;
}

function renderModels(): void {
  modelListElement.replaceChildren();
  const query = modelSearchElement.value.trim().toLowerCase();
  const providerFilter = modelProviderElement.value;
  const filtered = models.filter((model) => {
    if (providerFilter && model.provider !== providerFilter) return false;
    return query ? `${model.provider}/${model.id} ${model.name ?? ''}`.toLowerCase().includes(query) : true;
  });

  for (const model of filtered) {
    const button = document.createElement('button');
    button.className = 'item';
    button.setAttribute('aria-pressed', String(Boolean(selectedModel
      && selectedModel.provider === model.provider
      && selectedModel.id === model.id)));

    const main = document.createElement('span');
    main.className = 'item-main';
    const name = document.createElement('strong');
    name.textContent = `${model.provider}/${model.id}`;
    const meta = document.createElement('small');
    meta.textContent = [
      contextLabel(model.contextWindow),
      model.reasoning ? t('思考') : '',
      model.name && model.name !== model.id ? model.name : '',
    ].filter(Boolean).join(' · ') || t('模型');
    main.append(name, meta);

    const tags = document.createElement('span');
    tags.className = 'item-tags';
    if (model.relay) {
      const tag = document.createElement('span');
      tag.className = 'tag relay';
      tag.textContent = t('中转');
      tags.append(tag);
    }
    if (model.current) {
      const tag = document.createElement('span');
      tag.className = 'tag current';
      tag.textContent = t('默认');
      tags.append(tag);
    }
    if (failedModel && `${model.provider}/${model.id}` === failedModel) {
      const tag = document.createElement('span');
      tag.className = 'tag failed';
      tag.textContent = t('密钥无效');
      tags.append(tag);
    }

    button.append(main, tags);
    button.addEventListener('click', () => stageModel(model));
    modelListElement.append(button);
  }

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = models.length ? t('没有匹配的模型。') : t('未读取到模型配置。');
    modelListElement.append(empty);
  }
}

function renderProviderFilter(): void {
  const current = modelProviderElement.value;
  const ids = [...new Set(models.map((model) => model.provider))].sort((a, b) => a.localeCompare(b));
  modelProviderElement.replaceChildren();
  const all = document.createElement('option');
  all.value = '';
  all.textContent = t('全部 provider（{count}）', { count: ids.length });
  modelProviderElement.append(all);
  for (const id of ids) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = id;
    modelProviderElement.append(option);
  }
  modelProviderElement.value = ids.includes(current) ? current : '';
}

function stageModel(model: ModelEntry): void {
  selectedModel = model;
  const command = `/model ${model.provider}/${model.id}`;
  previewElement.textContent = command;
  copyButton.disabled = false;
  sendButton.disabled = !running;
  setDefaultButton.disabled = false;
  renderModels();
  toast('已暂存命令，未写入终端');
  audit('暂存 {command}', { command });
}

const MODULES_KEY = 'pi-model-modules';
const BINDINGS_KEY = 'pi-project-models';
modelModules = loadModelModules();
projectModelBindings = loadProjectModelBindings();

function loadModelModules(): ModelModule[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MODULES_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const item = value as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.name !== 'string'
        || typeof item.provider !== 'string' || typeof item.model !== 'string') return [];
      if (!item.id || !item.name.trim() || !item.provider || !item.model) return [];
      return [{
        id: item.id.slice(0, 80),
        name: item.name.slice(0, 60),
        provider: item.provider.slice(0, 120),
        model: item.model.slice(0, 120),
        auto: item.auto === true,
      }];
    });
  } catch {
    return [];
  }
}

function loadProjectModelBindings(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(BINDINGS_KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Record<string, string> = {};
    for (const [cwd, id] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof id === 'string' && id) result[cwd] = id;
    }
    return result;
  } catch {
    return {};
  }
}

function saveModelModules(): void {
  try {
    localStorage.setItem(MODULES_KEY, JSON.stringify(modelModules));
  } catch {
    // storage is optional
  }
}

function saveProjectModelBindings(): void {
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(projectModelBindings));
  } catch {
    // storage is optional
  }
}

function createModuleId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function boundModule(): ModelModule | undefined {
  const id = currentCwd ? projectModelBindings[currentCwd] : '';
  return id ? modelModules.find((module) => module.id === id) : undefined;
}

function autoModule(): ModelModule | undefined {
  return modelModules.find((module) => module.auto);
}

function setModuleAuto(module: ModelModule): void {
  const next = !module.auto;
  for (const item of modelModules) {
    item.auto = next ? item.id === module.id : (item.id === module.id ? false : item.auto);
  }
  saveModelModules();
  renderModules();
  toast(next ? t('启动 Pi 时自动使用 {name}', { name: module.name }) : t('已关闭 {name} 的自动使用', { name: module.name }));
  audit(next ? '启用模块自动使用 {name}' : '关闭模块自动使用 {name}', { name: module.name });
}

const CUSTOM_MODEL = '__custom__';

function moduleLabel(module: ModelModule): string {
  return `${module.name} · ${module.provider}/${module.model}`;
}

function renderModules(): void {
  moduleListElement.replaceChildren();
  for (const module of modelModules) {
    const row = document.createElement('div');
    row.className = 'module-item';
    const main = document.createElement('span');
    main.className = 'item-main';
    const name = document.createElement('strong');
    name.textContent = module.name;
    if (module.auto) {
      const tag = document.createElement('span');
      tag.className = 'tag auto';
      tag.textContent = t('自动');
      name.append(' ', tag);
    }
    const detail = document.createElement('small');
    detail.textContent = `${module.provider}/${module.model}`;
    main.append(name, detail);

    const actions = document.createElement('span');
    actions.className = 'item-actions';
    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = module.auto ? 'ghost active' : 'ghost';
    auto.textContent = t('自动');
    auto.title = t(module.auto ? '启动时自动使用，点击关闭' : '设为启动 Pi 时自动使用的模块');
    auto.addEventListener('click', () => setModuleAuto(module));
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'ghost';
    apply.textContent = t('应用');
    apply.addEventListener('click', () => applyModule(module));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ghost';
    edit.textContent = t('编辑');
    edit.addEventListener('click', () => openModuleForm(module));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ghost danger';
    remove.textContent = '×';
    remove.title = t('删除模块 {name}', { name: module.name });
    remove.addEventListener('click', () => deleteModule(module));
    actions.append(auto, apply, edit, remove);
    row.append(main, actions);
    moduleListElement.append(row);
  }

  const previous = moduleModelSelect.value;
  moduleModelSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('选择模型');
  moduleModelSelect.append(placeholder);
  for (const model of models) {
    const option = document.createElement('option');
    option.value = `${model.provider}/${model.id}`;
    option.textContent = `${model.provider}/${model.id}${model.name && model.name !== model.id ? ` · ${model.name}` : ''}`;
    moduleModelSelect.append(option);
  }
  const custom = document.createElement('option');
  custom.value = CUSTOM_MODEL;
  custom.textContent = t('自定义 provider/model…');
  moduleModelSelect.append(custom);
  moduleModelSelect.value = [...moduleModelSelect.options]
    .some((option) => option.value === previous) ? previous : '';

  const boundId = currentCwd ? projectModelBindings[currentCwd] : '';
  projectModuleSelect.replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = t('Pi 默认');
  projectModuleSelect.append(none);
  for (const module of modelModules) {
    const option = document.createElement('option');
    option.value = module.id;
    option.textContent = moduleLabel(module);
    projectModuleSelect.append(option);
  }
  projectModuleSelect.value = modelModules.some((module) => module.id === boundId) ? boundId : '';
  projectModuleSelect.disabled = !currentCwd;
}

function openModuleForm(module?: ModelModule): void {
  moduleEditingId = module?.id ?? '';
  moduleNameInput.value = module?.name ?? '';
  renderModules();
  const value = module ? `${module.provider}/${module.model}` : '';
  const known = [...moduleModelSelect.options].some((option) => option.value === value);
  moduleModelSelect.value = known ? value : module ? CUSTOM_MODEL : '';
  moduleModelCustomInput.value = module && !known ? value : '';
  moduleModelCustomInput.hidden = moduleModelSelect.value !== CUSTOM_MODEL;
  moduleAutoCheckbox.checked = module?.auto === true;
  moduleFormElement.hidden = false;
  moduleNameInput.focus();
}

function closeModuleForm(): void {
  moduleEditingId = '';
  moduleFormElement.hidden = true;
  moduleNameInput.value = '';
  moduleModelCustomInput.value = '';
  moduleModelCustomInput.hidden = true;
  moduleAutoCheckbox.checked = false;
  renderModules();
}

function saveModuleFromForm(event: Event): void {
  event.preventDefault();
  const name = moduleNameInput.value.trim();
  if (!name) {
    toast('填写模块名称');
    moduleNameInput.focus();
    return;
  }
  let value = moduleModelSelect.value;
  if (value === CUSTOM_MODEL) value = moduleModelCustomInput.value.trim();
  if (!value) {
    toast('填写或选择模块使用的模型');
    (moduleModelSelect.value === CUSTOM_MODEL ? moduleModelCustomInput : moduleModelSelect).focus();
    return;
  }
  const slash = value.indexOf('/');
  if (slash <= 0 || slash === value.length - 1 || /\s/.test(value)) {
    toast('模型格式应为 provider/model');
    moduleModelCustomInput.focus();
    return;
  }
  const provider = value.slice(0, slash);
  const modelId = value.slice(slash + 1);
  const existing = modelModules.find((module) => module.id === moduleEditingId);
  const auto = moduleAutoCheckbox.checked;
  if (auto) {
    for (const module of modelModules) {
      if (module.id !== existing?.id) module.auto = false;
    }
  }
  if (existing) {
    existing.name = name;
    existing.provider = provider;
    existing.model = modelId;
    existing.auto = auto;
  } else {
    modelModules.push({ id: createModuleId(), name, provider, model: modelId, auto });
  }
  saveModelModules();
  moduleEditingId = '';
  moduleFormElement.hidden = true;
  moduleNameInput.value = '';
  moduleModelCustomInput.value = '';
  moduleModelCustomInput.hidden = true;
  moduleAutoCheckbox.checked = false;
  renderModules();
  toast('模块已保存');
  audit('保存模块 {name}', { name });
}

function deleteModule(module: ModelModule): void {
  if (!window.confirm(t('删除模块 {name}？', { name: module.name }))) return;
  modelModules = modelModules.filter((item) => item.id !== module.id);
  for (const [cwd, id] of Object.entries(projectModelBindings)) {
    if (id === module.id) delete projectModelBindings[cwd];
  }
  if (moduleEditingId === module.id) {
    moduleEditingId = '';
    moduleFormElement.hidden = true;
    moduleNameInput.value = '';
  }
  saveModelModules();
  saveProjectModelBindings();
  renderModules();
  toast('模块已删除');
  audit('删除模块 {name}', { name: module.name });
}

function applyModule(module: ModelModule): void {
  const known = models.find((item) => item.provider === module.provider && item.id === module.model);
  stageModel(known ?? {
    provider: module.provider,
    id: module.model,
    name: module.model,
    reasoning: false,
    relay: false,
    current: false,
  });
  if (running) {
    const command = `/model ${module.provider}/${module.model}`;
    api.write(`${command}\r`);
    terminal.focus();
    toast('已切换模型 {model}', { model: `${module.provider}/${module.model}` });
    audit('终端执行 {command}', { command });
  } else {
    toast('模块已暂存，启动 Pi 后发送');
    audit('应用模块 {name}', { name: module.name });
  }
}

async function refreshModels(): Promise<void> {
  modelSummaryElement.textContent = t('读取本机 Pi 配置…');
  try {
    const result = await api.inspectModels();
    if (!result.ok || !result.report) {
      modelSummaryElement.textContent = result.error ?? t('读取模型配置失败');
      models = [];
      renderProviderFilter();
      renderModels();
      renderModules();
      return;
    }
    const report = result.report;
    models = report.models;
    if (selectedModel && !models.some((model) => model.provider === selectedModel?.provider && model.id === selectedModel?.id)) {
      selectedModel = null;
      previewElement.textContent = t('选择模型后生成命令');
      copyButton.disabled = true;
      sendButton.disabled = true;
      setDefaultButton.disabled = true;
    }
    const parts = [t('{count} 个模型', { count: models.length })];
    if (report.defaultProvider) parts.push(t('默认 {provider}/{model}', { provider: report.defaultProvider, model: report.defaultModel }));
    if (report.relayProviders.length) parts.push(t('{count} 个中转站', { count: report.relayProviders.length }));
    modelSummaryElement.textContent = parts.join(' · ');
    if (report.warnings.length) {
      modelSummaryElement.textContent += ` · ${report.warnings[0]}`;
    }
    renderProviderFilter();
    renderModels();
    renderModules();
  } catch (error) {
    modelSummaryElement.textContent = error instanceof Error ? error.message : String(error);
    models = [];
    renderProviderFilter();
    renderModels();
    renderModules();
  }
}

const headersBlock = $('headers-block');
const headersField = $('field-headers');
const headersReplaceRow = $('headers-replace-row');
const headersReplaceLabel = $('headers-replace-label');
const fetchModelsButton = $<HTMLButtonElement>('fetch-models');
const saveProviderButton = $<HTMLButtonElement>('save-provider');
const deleteProviderButton = $<HTMLButtonElement>('delete-provider');
const CUSTOM_FIELDS = ['field-display', 'field-baseurl', 'field-api', 'field-models'] as const;

function setFieldVisible(id: string, visible: boolean): void {
  const element = document.getElementById(id);
  if (element) element.hidden = !visible;
}

let formNoteSource = '';
let formNoteVars: Record<string, string | number> | undefined;
let formNoteKind: '' | 'error' | 'ok' = '';

function setFormNote(source: string, kind: '' | 'error' | 'ok' = '', vars?: Record<string, string | number>): void {
  formNoteSource = source;
  formNoteVars = vars;
  formNoteKind = kind;
  providerFormNote.textContent = t(source, vars);
  providerFormNote.className = kind ? `note ${kind}` : 'note';
}

function setProviderBusy(busy: boolean): void {
  providerBusy = busy;
  saveProviderButton.disabled = busy;
  fetchModelsButton.disabled = busy;
  clearProviderKeyButton.disabled = busy;
  deleteProviderButton.disabled = busy;
}

function providerTag(text: string, className = 'tag'): HTMLSpanElement {
  const tag = document.createElement('span');
  tag.className = className;
  tag.textContent = text;
  return tag;
}

function providerAction(label: string, handler: () => void, className = 'ghost'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function keyTag(provider: ProviderInfo): HTMLSpanElement | null {
  if (provider.hasStoredKey) return providerTag(t('密钥已配置'), 'tag key');
  if (provider.credentialType === 'oauth') return providerTag('OAuth', 'tag key');
  if (provider.keySource === 'config') return providerTag(t('models.json 密钥'), 'tag key');
  if (provider.keySource === 'environment') return providerTag(t('环境变量'), 'tag key');
  if (provider.keySource === 'command') return providerTag(t('命令读取'), 'tag key');
  return null;
}

function renderProviders(warnings: string[] = []): void {
  providerListElement.replaceChildren();
  const customCount = providers.filter((provider) => provider.custom).length;
  const keyedCount = providers.filter((provider) => provider.hasStoredKey).length;
  providerSummaryElement.textContent = `${t('{count} 个自定义 · {keyed} 个已配置密钥', { count: customCount, keyed: keyedCount })}${
    warnings.length ? ` · ${warnings[0]}` : ''
  }`;

  if (!providers.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('还没有接入配置。点击「新增自定义接入」填写中转站地址与模型。');
    providerListElement.append(empty);
    return;
  }

  for (const provider of providers) {
    const row = document.createElement('div');
    row.className = 'provider-item';

    const main = document.createElement('span');
    main.className = 'item-main';
    const name = document.createElement('strong');
    name.textContent = provider.name ? `${provider.name}` : provider.id;
    const detail = document.createElement('small');
    detail.textContent = [
      provider.name ? provider.id : '',
      provider.baseUrl,
      t('{count} 个模型', { count: provider.modelCount }),
      provider.api,
    ].filter(Boolean).join(' · ');
    const tags = document.createElement('span');
    tags.className = 'item-tags';
    tags.append(providerTag(t(provider.custom ? '自定义' : '内置'), provider.custom ? 'tag custom' : 'tag'));
    const key = keyTag(provider);
    if (key) tags.append(key);
    main.append(name, detail, tags);

    const actions = document.createElement('span');
    actions.className = 'item-actions';
    if (provider.custom) {
      actions.append(
        providerAction(t('编辑'), () => openEditProvider(provider)),
        providerAction(t('测试'), () => void testProvider(provider)),
        providerAction(t('删除'), () => void removeProvider(provider), 'ghost danger'),
      );
    } else {
      actions.append(providerAction(t(provider.hasStoredKey ? '换密钥' : '设置密钥'), () => openBuiltinKey(provider.id)));
    }

    row.append(main, actions);
    providerListElement.append(row);
  }
}

async function refreshProviders(): Promise<void> {
  providerSummaryElement.textContent = t('读取接入配置…');
  try {
    const result = await api.providers();
    if (!result.ok || !result.report) {
      providerSummaryElement.textContent = result.error ?? t('读取接入配置失败');
      providers = [];
      providerListElement.replaceChildren();
      return;
    }
    providers = result.report.providers;
    renderProviders(result.report.warnings);
  } catch (error) {
    providerSummaryElement.textContent = error instanceof Error ? error.message : String(error);
    providers = [];
    providerListElement.replaceChildren();
  }
}

let keyPlaceholderSource = '留空则保留现有密钥';

function setKeyPlaceholder(source: string): void {
  keyPlaceholderSource = source;
  providerKeyInput.placeholder = t(source);
}

function resetProviderForm(): void {
  providerIdInput.value = '';
  providerDisplayInput.value = '';
  providerBaseUrlInput.value = '';
  providerApiSelect.value = 'openai-completions';
  providerKeyInput.value = '';
  providerHeadersInput.value = '';
  providerHeadersReplace.checked = false;
  providerModelsInput.value = '';
  providerIdInput.readOnly = false;
  setKeyPlaceholder('留空则保留现有密钥');
  headersReplaceRow.hidden = true;
  headersField.hidden = false;
  clearProviderKeyButton.hidden = true;
  deleteProviderButton.hidden = true;
  setProviderBusy(false);
}

function showProviderForm(visible: boolean): void {
  providerFormElement.hidden = !visible;
}

function ensureApiOption(api?: string): void {
  if (!api) return;
  if ([...providerApiSelect.options].some((option) => option.value === api)) return;
  const option = document.createElement('option');
  option.value = api;
  option.textContent = api;
  providerApiSelect.append(option);
}

function openNewProvider(): void {
  providerMode = 'new';
  providerEditingId = '';
  resetProviderForm();
  for (const field of CUSTOM_FIELDS) setFieldVisible(field, true);
  headersBlock.hidden = false;
  setFieldVisible('field-key', true);
  fetchModelsButton.hidden = false;
  setKeyPlaceholder('写入 auth.json；留空则暂不设置');
  setFormNote('保存后写入 models.json 与 auth.json；新增 provider 需新开 Pi 会话后生效。');
  showProviderForm(true);
  providerIdInput.focus();
}

function openEditProvider(provider: ProviderInfo): void {
  providerMode = 'edit';
  providerEditingId = provider.id;
  resetProviderForm();
  for (const field of CUSTOM_FIELDS) setFieldVisible(field, true);
  headersBlock.hidden = false;
  setFieldVisible('field-key', true);
  fetchModelsButton.hidden = false;
  providerIdInput.value = provider.id;
  providerIdInput.readOnly = true;
  providerDisplayInput.value = provider.name ?? '';
  providerBaseUrlInput.value = provider.baseUrl ?? '';
  ensureApiOption(provider.api);
  providerApiSelect.value = provider.api ?? 'openai-completions';
  providerModelsInput.value = provider.modelsText ?? '';
  const hasHeaders = Boolean(provider.headerNames?.length);
  headersReplaceRow.hidden = !hasHeaders;
  if (hasHeaders) {
    headersReplaceLabel.textContent = t('替换额外请求头（现有 {names}）', { names: provider.headerNames?.join(', ') ?? '' });
    headersField.hidden = true;
  } else {
    headersField.hidden = false;
  }
  clearProviderKeyButton.hidden = !provider.hasStoredKey;
  deleteProviderButton.hidden = false;
  setFormNote('留空 API Key 会保留现有密钥。修改后需新开 Pi 会话生效。');
  showProviderForm(true);
  providerDisplayInput.focus();
}

function openBuiltinKey(providerId: string): void {
  providerMode = 'builtin';
  providerEditingId = '';
  resetProviderForm();
  for (const field of CUSTOM_FIELDS) setFieldVisible(field, false);
  headersBlock.hidden = true;
  setFieldVisible('field-name', true);
  setFieldVisible('field-key', true);
  fetchModelsButton.hidden = true;
  deleteProviderButton.hidden = true;
  providerIdInput.value = providerId;
  const known = providers.find((provider) => provider.id === providerId);
  clearProviderKeyButton.hidden = !known?.hasStoredKey;
  setKeyPlaceholder('例如 sk-...；写入 auth.json');
  setFormNote(known?.hasStoredKey
    ? t(known.credentialType === 'oauth' ? '已有 OAuth 凭据；留空保留，填写则覆盖。' : '已有 凭据；留空保留，填写则覆盖。')
    : t('填写 Pi 内置 provider 的 ID 与 API Key；新开 Pi 会话后生效。例如 openrouter、deepseek。'));
  showProviderForm(true);
  (providerId ? providerKeyInput : providerIdInput).focus();
}

async function testProvider(provider: ProviderInfo): Promise<void> {
  toast('正在测试 {id}…', { id: provider.id });
  try {
    const result = await api.fetchProviderModels({ providerId: provider.id });
    if (!result.ok) {
      toast(result.error ?? t('连接失败'));
      audit('测试 {id} 失败：{error}', { id: provider.id, error: result.error ?? t('未知错误') });
      return;
    }
    const count = result.models?.length ?? 0;
    const latency = result.latencyMs ? ` · ${result.latencyMs} ms` : '';
    toast(count ? t('连接成功：{count} 个模型{latency}', { count, latency }) : (result.note ?? t('端点可达')));
    audit('测试 {id}：{result}', {
      id: provider.id,
      result: count ? t('{count} 个模型', { count }) : (result.note ?? t('端点可达')),
    });
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

async function removeProvider(provider: ProviderInfo): Promise<void> {
  if (!confirm(t('删除自定义 provider {id}？auth.json 中的密钥会保留。', { id: provider.id }))) return;
  const result = await api.deleteProvider(provider.id);
  if (!result.ok) {
    toast(result.error ?? t('删除失败'));
    return;
  }
  toast('已删除 {id}', { id: provider.id });
  audit('删除接入 {id}', { id: provider.id });
  showProviderForm(false);
  await Promise.all([refreshProviders(), refreshModels()]);
}

async function fetchModelsForForm(): Promise<void> {
  if (providerBusy) return;
  const baseUrl = providerBaseUrlInput.value.trim();
  if (!baseUrl) {
    setFormNote('先填写 Base URL', 'error');
    providerBaseUrlInput.focus();
    return;
  }
  const editing = providerMode === 'edit' ? providers.find((provider) => provider.id === providerEditingId) : undefined;
  setProviderBusy(true);
  setFormNote('正在请求 /models…');
  try {
    const result = await api.fetchProviderModels({
      providerId: editing?.id,
      baseUrl,
      api: providerApiSelect.value,
      apiKey: providerKeyInput.value.trim() || undefined,
      headersText: headersField.hidden ? undefined : providerHeadersInput.value,
    });
    if (!result.ok) {
      setFormNote(result.error ?? t('拉取失败'), 'error');
      return;
    }
    const list = result.models ?? [];
    const latency = result.latencyMs ? ` · ${result.latencyMs} ms` : '';
    if (list.length) {
      providerModelsInput.value = list.join('\n');
      setFormNote('已获取 {count} 个模型{latency}；可手动增删后再保存。', 'ok', { count: list.length, latency });
      toast('已拉取 {count} 个模型', { count: list.length });
      audit('拉取 {url} 模型 {count} 个', { url: baseUrl, count: list.length });
    } else {
      setFormNote(result.note ?? t('端点可达，但没有返回模型列表。'), 'ok');
    }
  } catch (error) {
    setFormNote(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    setProviderBusy(false);
  }
}

async function submitProviderForm(): Promise<void> {
  if (providerBusy) return;
  const id = providerIdInput.value.trim();
  if (!id) {
    setFormNote('填写 Provider ID', 'error');
    providerIdInput.focus();
    return;
  }

  if (providerMode === 'builtin') {
    const key = providerKeyInput.value.trim();
    if (!key) {
      setFormNote('填写 API Key；如需删除已保存密钥，点「清除密钥」。', 'error');
      providerKeyInput.focus();
      return;
    }
    setProviderBusy(true);
    setFormNote('正在写入 auth.json…');
    try {
      const result = await api.saveProviderKey(id, key);
      if (!result.ok) {
        setFormNote(result.error ?? t('写入失败'), 'error');
        return;
      }
      toast('已保存 {id} 的密钥；新 Pi 会话生效', { id });
      audit('配置 {id} 密钥', { id });
      showProviderForm(false);
      await Promise.all([refreshProviders(), refreshModels()]);
    } finally {
      setProviderBusy(false);
    }
    return;
  }

  const baseUrl = providerBaseUrlInput.value.trim();
  if (!baseUrl) {
    setFormNote('填写 Base URL', 'error');
    providerBaseUrlInput.focus();
    return;
  }
  if (!providerModelsInput.value.trim()) {
    setFormNote('至少填写一个模型 ID', 'error');
    providerModelsInput.focus();
    return;
  }

  const editing = providerMode === 'edit' ? providers.find((provider) => provider.id === providerEditingId) : undefined;
  const keepHeaders = Boolean(editing?.headerNames?.length) && !providerHeadersReplace.checked;
  setProviderBusy(true);
  setFormNote('正在写入 models.json…');
  try {
    const result = await api.saveProvider({
      id,
      name: providerDisplayInput.value.trim() || undefined,
      baseUrl,
      api: providerApiSelect.value,
      apiKey: providerKeyInput.value.trim() || undefined,
      headersText: keepHeaders ? undefined : providerHeadersInput.value,
      keepHeaders,
      modelsText: providerModelsInput.value,
    });
    if (!result.ok) {
      setFormNote(result.error ?? t('保存失败'), 'error');
      return;
    }
    toast(result.warning ?? t('已保存 {id}；新 Pi 会话生效', { id }));
    audit('保存接入 {id}', { id });
    showProviderForm(false);
    setFormNote('');
    await Promise.all([refreshProviders(), refreshModels()]);
  } catch (error) {
    setFormNote(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    setProviderBusy(false);
  }
}

async function clearProviderKeyFromForm(): Promise<void> {
  const id = providerIdInput.value.trim();
  if (!id) return;
  if (!confirm(t('清除 {id} 的已保存密钥？', { id }))) return;
  const result = await api.saveProviderKey(id, '');
  if (!result.ok) {
    setFormNote(result.error ?? t('清除失败'), 'error');
    return;
  }
  toast('已清除 {id} 的密钥', { id });
  audit('清除 {id} 密钥', { id });
  clearProviderKeyButton.hidden = true;
  await refreshProviders();
}

const KIND_LABELS: Record<CapabilityEntry['kind'], string> = {
  package: 'Pi 包',
  extension: '扩展',
  skill: 'Skills',
  mcp: 'MCP',
};

function renderCapabilities(capabilities: CapabilityEntry[], warnings: string[]): void {
  capabilityListElement.replaceChildren();
  if (!capabilities.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('未发现扩展、Skills 或 MCP 配置。');
    capabilityListElement.append(empty);
  }
  for (const kind of ['package', 'extension', 'skill', 'mcp'] as const) {
    const items = capabilities.filter((item) => item.kind === kind);
    if (!items.length) continue;
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = `${t(KIND_LABELS[kind])} · ${items.length}`;
    capabilityListElement.append(label);
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'item';
      const main = document.createElement('span');
      main.className = 'item-main';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const detail = document.createElement('small');
      detail.textContent = item.detail ?? item.kind;
      main.append(name, detail);
      const tags = document.createElement('span');
      const scope = document.createElement('span');
      scope.className = 'tag';
      scope.textContent = item.scope === 'user' ? t('用户') : t('项目');
      tags.append(scope);
      row.append(main, tags);
      capabilityListElement.append(row);
    }
  }
  const counts = capabilities.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(counts).map(([kind, count]) => `${t(KIND_LABELS[kind as CapabilityEntry['kind']])} ${count}`);
  capabilitySummaryElement.textContent = parts.length
    ? `${parts.join(' · ')}${warnings.length ? ` · ${warnings.join('；')}` : ''}`
    : t('未发现项目能力配置');
}

async function refreshCapabilities(): Promise<void> {
  if (!currentCwd) {
    capabilitySummaryElement.textContent = t('尚未选择项目');
    capabilityListElement.replaceChildren();
    return;
  }
  capabilitySummaryElement.textContent = t('读取中…');
  try {
    const result = await api.inspectCapabilities(currentCwd);
    if (!result.ok || !result.report) {
      capabilitySummaryElement.textContent = result.error ?? t('读取失败');
      capabilityListElement.replaceChildren();
      return;
    }
    renderCapabilities(result.report.capabilities, result.report.warnings);
  } catch (error) {
    capabilitySummaryElement.textContent = error instanceof Error ? error.message : String(error);
  }
}

function setCapabilityNote(source: string, kind: '' | 'error' | 'ok' = ''): void {
  capabilityFormNote.textContent = source ? t(source) : '';
  capabilityFormNote.className = kind ? `note ${kind}` : 'note';
}

function syncCapabilityFields(): void {
  const mcp = capabilityKindSelect.value === 'mcp';
  capabilityDescriptionInput.hidden = mcp;
  capabilityBodyInput.hidden = mcp;
  capabilityCommandInput.hidden = !mcp;
  capabilityArgsInput.hidden = !mcp;
  capabilityEnvInput.hidden = !mcp;
}

function openCapabilityForm(): void {
  capabilityFormElement.hidden = false;
  capabilityScopeSelect.value = currentCwd ? 'project' : 'user';
  setCapabilityNote('');
  syncCapabilityFields();
  capabilityNameInput.focus();
}

function closeCapabilityForm(): void {
  capabilityFormElement.hidden = true;
  capabilityNameInput.value = '';
  capabilityDescriptionInput.value = '';
  capabilityBodyInput.value = '';
  capabilityCommandInput.value = '';
  capabilityArgsInput.value = '';
  capabilityEnvInput.value = '';
  setCapabilityNote('');
}

async function submitCapabilityForm(event: Event): Promise<void> {
  event.preventDefault();
  const kind = capabilityKindSelect.value === 'mcp' ? 'mcp' : 'skill';
  const scope = capabilityScopeSelect.value === 'user' ? 'user' : 'project';
  if (scope === 'project' && !currentCwd) {
    setCapabilityNote('项目目录不存在', 'error');
    return;
  }
  const name = capabilityNameInput.value.trim();
  if (!name) {
    setCapabilityNote('填写名称', 'error');
    capabilityNameInput.focus();
    return;
  }
  setCapabilityNote('保存中…');
  try {
    const result = kind === 'mcp'
      ? await api.addMcp({
        scope,
        cwd: scope === 'project' ? currentCwd : undefined,
        name,
        command: capabilityCommandInput.value.trim(),
        argsText: capabilityArgsInput.value,
        envText: capabilityEnvInput.value,
      })
      : await api.addSkill({
        scope,
        cwd: scope === 'project' ? currentCwd : undefined,
        name,
        description: capabilityDescriptionInput.value.trim(),
        body: capabilityBodyInput.value,
      });
    if (!result.ok) {
      setCapabilityNote(result.error ?? '保存失败', 'error');
      return;
    }
    closeCapabilityForm();
    toast(kind === 'mcp' ? t('MCP 服务器已添加') : t('Skill 已添加'));
    audit('添加 {kind} {name}', { kind: kind === 'mcp' ? 'MCP' : 'Skill', name });
    await refreshCapabilities();
  } catch (error) {
    setCapabilityNote(error instanceof Error ? error.message : String(error), 'error');
  }
}

const TODOS_KEY = 'pi-project-todos';
const taskStatusElement = $('task-status');
const gitListElement = $('git-list');
const gitCountElement = $('git-count');
const todoListElement = $('todo-list');
const todoCountElement = $('todo-count');
const todoFormElement = $<HTMLFormElement>('todo-form');
const todoInputElement = $<HTMLInputElement>('todo-input');
const taskOpenFolderButton = $<HTMLButtonElement>('task-open-folder');
const taskOpenVSCodeButton = $<HTMLButtonElement>('task-open-vscode');
let taskStartedAt = 0;
let lastOutputAt = 0;
let gitReport: GitStatusResult | null = null;
let gitLoading = false;
let todoItems: TodoItem[] = [];

function loadTodos(): TodoItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TODOS_KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const list = (raw as Record<string, unknown>)[currentCwd];
    if (!Array.isArray(list)) return [];
    return list.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const item = value as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.text !== 'string' || !item.text.trim()) return [];
      return [{ id: item.id.slice(0, 80), text: item.text.slice(0, 300), done: item.done === true }];
    });
  } catch {
    return [];
  }
}

function saveTodos(): void {
  if (!currentCwd) return;
  try {
    const raw = JSON.parse(localStorage.getItem(TODOS_KEY) ?? '{}') as unknown;
    const all = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    all[currentCwd] = todoItems;
    localStorage.setItem(TODOS_KEY, JSON.stringify(all));
  } catch {
    // storage is optional
  }
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒` : `${seconds} 秒`;
}

function renderTodoList(): void {
  todoListElement.replaceChildren();
  if (!currentCwd) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('尚未选择项目');
    todoListElement.append(empty);
    todoCountElement.textContent = '';
    return;
  }
  if (!todoItems.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('还没有任务，添加一条开始跟踪。');
    todoListElement.append(empty);
  }
  for (const item of todoItems) {
    const row = document.createElement('label');
    row.className = item.done ? 'todo-item done' : 'todo-item';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = item.done;
    check.addEventListener('change', () => {
      item.done = check.checked;
      saveTodos();
      renderTodoList();
    });
    const text = document.createElement('span');
    text.textContent = item.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ghost';
    remove.textContent = '×';
    remove.title = t('删除任务');
    remove.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      todoItems = todoItems.filter((entry) => entry.id !== item.id);
      saveTodos();
      renderTodoList();
    });
    row.append(check, text, remove);
    todoListElement.append(row);
  }
  const done = todoItems.filter((item) => item.done).length;
  todoCountElement.textContent = todoItems.length ? `${done}/${todoItems.length}` : '';
}

function renderGitReport(): void {
  gitListElement.replaceChildren();
  if (!currentCwd) {
    gitCountElement.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('尚未选择项目');
    gitListElement.append(empty);
    return;
  }
  if (gitLoading || !gitReport) {
    gitCountElement.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('读取中…');
    gitListElement.append(empty);
    return;
  }
  if (!gitReport.ok) {
    gitCountElement.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty error';
    empty.textContent = gitReport.error ?? t('读取 Git 状态失败');
    gitListElement.append(empty);
    return;
  }
  if (!gitReport.repo) {
    gitCountElement.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('当前项目不是 Git 仓库');
    gitListElement.append(empty);
    return;
  }
  const changes = gitReport.changes ?? [];
  const summary = [
    gitReport.branch || t('未知分支'),
    gitReport.ahead ? `↑${gitReport.ahead}` : '',
    gitReport.behind ? `↓${gitReport.behind}` : '',
    `${changes.length} 个变更`,
  ].filter(Boolean).join(' · ');
  const head = document.createElement('div');
  head.className = 'git-head';
  head.textContent = summary;
  gitListElement.append(head);
  gitCountElement.textContent = String(changes.length);
  if (!changes.length) {
    const clean = document.createElement('div');
    clean.className = 'empty';
    clean.textContent = t('工作区干净');
    gitListElement.append(clean);
    return;
  }
  for (const change of changes.slice(0, 60)) {
    const row = document.createElement('div');
    row.className = 'git-item';
    const code = document.createElement('code');
    code.textContent = change.code;
    code.className = change.code.includes('?') ? 'untracked' : 'changed';
    const name = document.createElement('span');
    name.textContent = change.path;
    name.title = change.path;
    row.append(code, name);
    gitListElement.append(row);
  }
  if (changes.length > 60) {
    const more = document.createElement('div');
    more.className = 'empty';
    more.textContent = t('还有 {count} 个文件未显示', { count: changes.length - 60 });
    gitListElement.append(more);
  }
}

async function refreshTaskGit(): Promise<void> {
  if (!currentCwd) {
    gitReport = null;
    renderGitReport();
    return;
  }
  gitLoading = true;
  renderGitReport();
  try {
    gitReport = await api.gitStatus(currentCwd);
  } catch (error) {
    gitReport = { ok: false, repo: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    gitLoading = false;
    renderGitReport();
  }
}

function renderTaskStatus(): void {
  const labels: Record<ProcessStatus, string> = {
    idle: '未启动',
    starting: '启动中',
    running: '运行中',
    exited: '已退出',
    error: '启动失败',
  };
  const rows: Array<[string, string, string?]> = [
    [t('状态'), t(labels[stateStatus]), stateStatus === 'running' ? 'ok' : stateStatus === 'error' ? 'error' : ''],
    [t('当前模型'), shownModel || '—'],
    [t('运行时长'), running && taskStartedAt ? formatElapsed(Date.now() - taskStartedAt) : '—'],
    [t('最近输出'), running && lastOutputAt ? t('{seconds} 秒前', { seconds: Math.max(0, Math.round((Date.now() - lastOutputAt) / 1000)) }) : '—'],
    [t('项目'), currentCwd || t('尚未选择')],
  ];
  taskStatusElement.replaceChildren();
  for (const [label, value, kind] of rows) {
    const row = document.createElement('div');
    row.className = 'task-row';
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = value;
    val.title = value;
    if (kind) val.className = kind;
    row.append(key, val);
    taskStatusElement.append(row);
  }
  taskOpenFolderButton.disabled = !currentCwd;
  taskOpenVSCodeButton.disabled = !currentCwd;
}

function refreshTaskPane(): void {
  renderTaskStatus();
  renderTodoList();
}

window.setInterval(() => {
  const pane = document.getElementById('pane-task');
  if (!pane || pane.hidden) return;
  renderTaskStatus();
}, 1000);

async function openProjectTarget(kind: 'folder' | 'vscode'): Promise<void> {
  if (!currentCwd) {
    toast('先选择项目目录');
    return;
  }
  try {
    const result = kind === 'vscode' ? await api.openVSCode(currentCwd) : await api.openPath(currentCwd);
    if (!result.ok) toast(result.error ?? t('打开失败'));
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

function formatTime(value: string): string {  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || t('未知时间');
  return date.toLocaleString(getLocale() === 'en' ? 'en-US' : 'zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function renderSessions(sessions: SessionEntry[]): void {
  sessionListElement.replaceChildren();
  if (!sessions.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('该项目还没有 Pi 会话。启动新会话后会出现在这里。');
    sessionListElement.append(empty);
    return;
  }
  for (const session of sessions) {
    const button = document.createElement('button');
    button.className = 'item';
    const main = document.createElement('span');
    main.className = 'item-main';
    const name = document.createElement('strong');
    name.textContent = formatTime(session.timestamp);
    const detail = document.createElement('small');
    detail.textContent = `${session.id.slice(0, 8)} · ${formatSize(session.size)}`;
    main.append(name, detail);
    const tags = document.createElement('span');
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = t('恢复');
    tags.append(tag);
    button.append(main, tags);
    button.addEventListener('click', () => {
      if (running) {
        toast('先停止当前 Pi 再恢复会话');
        return;
      }
      void startSession(session.path);
    });
    sessionListElement.append(button);
  }
}

async function refreshSessions(): Promise<void> {
  if (!currentCwd) {
    sessionSummaryElement.textContent = t('尚未选择项目');
    sessionListElement.replaceChildren();
    return;
  }
  sessionSummaryElement.textContent = t('读取中…');
  try {
    const result = await api.sessions(currentCwd);
    if (!result.ok || !result.sessions) {
      sessionSummaryElement.textContent = result.error ?? t('读取会话失败');
      sessionListElement.replaceChildren();
      return;
    }
    sessionSummaryElement.textContent = t('{count} 个会话 · 点击恢复', { count: result.sessions.length });
    renderSessions(result.sessions);
  } catch (error) {
    sessionSummaryElement.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function startSession(sessionPath?: string): Promise<void> {
  if (!currentCwd) {
    toast('先选择项目目录');
    return;
  }
  if (running) {
    toast('Pi 已在运行');
    return;
  }
  if (startPending) return;
  startPending = true;
  const projectModule = isolatedCheckbox.checked ? undefined : boundModule() ?? autoModule();
  setState('starting', '启动中');
  setTerminalHint('正在启动 Pi…');
  modelProbe = '';
  shownModel = '';
  failedModel = '';
  dismissedDiagnosis = '';
  lastDiagnosisKey = '';
  activeDiagnosis = null;
  alertBar.hidden = true;
  renderModels();
  activeModelElement.textContent = t('模型 —');
  startButton.disabled = true;
  terminal.reset();
  const result = await api.startPi({
    cwd: currentCwd,
    cols: terminal.cols,
    rows: terminal.rows,
    sessionPath,
    isolated: isolatedCheckbox.checked,
    model: projectModule ? `${projectModule.provider}/${projectModule.model}` : undefined,
  }).catch((error: unknown): { ok: false; error: string } => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })).finally(() => {
    startPending = false;
  });
  if (!result.ok) {
    setState('error', '启动失败');
    startButton.disabled = false;
    setTerminalHint('启动失败，检查侧栏配置后重试');
    toast(result.error ?? t('启动失败'));
    audit('启动失败：{error}', { error: result.error ?? t('未知错误') });
    return;
  }
  isolatedDir = result.isolatedDir ?? '';
  isolatedElement.textContent = isolatedDir || '—';
  isolatedElement.title = isolatedElement.textContent;
  setTerminalHint();
  if (sessionPath) audit('恢复 Pi 会话');
  else audit('启动 Pi {version}', { version: result.install?.version ?? '' });
  if (projectModule) {
    audit('按项目使用模型 {model}', { model: `${projectModule.provider}/${projectModule.model}` });
  }
  doFit();
  composerInput.focus();
  updateComposerState();
  window.setTimeout(() => void refreshSessions(), 800);
}

terminal.onData((data) => {
  if (running) api.write(data);
});

function setFontSize(next: number): void {
  fontSize = Math.max(11, Math.min(28, Math.round(next)));
  terminal.options.fontSize = fontSize;
  doFit();
  try {
    localStorage.setItem('pi-font-size', String(fontSize));
  } catch {
    // private profiles may reject storage; the size still applies for this run
  }
}

function toggleSearch(show: boolean): void {
  searchBar.hidden = !show;
  if (show) {
    const selection = terminal.getSelection();
    if (selection && !selection.includes('\n')) searchInput.value = selection;
    searchInput.focus();
    searchInput.select();
    if (searchInput.value) searchAddon.findNext(searchInput.value, { incremental: true });
  } else {
    searchAddon.clearDecorations();
    terminal.focus();
  }
}

terminal.attachCustomKeyEventHandler((event) => {
  if (event.type !== 'keydown') return true;
  const key = event.key.toLowerCase();

  if (event.ctrlKey && event.shiftKey && key === 'c') {
    void copySelection();
    return false;
  }
  if (event.shiftKey && !event.ctrlKey && !event.altKey && event.key === 'Insert') {
    void pasteClipboard();
    return false;
  }
  if (event.ctrlKey && !event.altKey && !event.shiftKey) {
    if (key === 'v') {
      void pasteClipboard();
      return false;
    }
    if (key === 'f') {
      toggleSearch(true);
      return false;
    }
    if (key === 'k') {
      toggleCommandPalette();
      return false;
    }
    if (key === 'c' && terminal.hasSelection()) {
      void copySelection();
      return false;
    }
    if (key === '=' || key === '+') {
      setFontSize(fontSize + 1);
      return false;
    }
    if (key === '-') {
      setFontSize(fontSize - 1);
      return false;
    }
    if (key === '0') {
      setFontSize(15);
      return false;
    }
  }
  return true;
});

searchInput.addEventListener('input', () => {
  const term = searchInput.value;
  if (!term) {
    searchAddon.clearDecorations();
    return;
  }
  searchAddon.findNext(term, { incremental: true });
});
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (event.shiftKey) searchAddon.findPrevious(searchInput.value);
    else searchAddon.findNext(searchInput.value);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    toggleSearch(false);
  }
});
$('search-next').addEventListener('click', () => searchAddon.findNext(searchInput.value));
$('search-prev').addEventListener('click', () => searchAddon.findPrevious(searchInput.value));
$('search-close').addEventListener('click', () => toggleSearch(false));
$('search-toggle').addEventListener('click', () => toggleSearch(Boolean(searchBar.hidden)));
scrollBottomButton.addEventListener('click', () => {
  terminal.scrollToBottom();
  scrollBottomButton.hidden = true;
  terminal.focus();
});

terminalElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (terminal.hasSelection()) void copySelection();
  else void pasteClipboard();
});
terminalElement.addEventListener('dragover', (event) => event.preventDefault());
terminalElement.addEventListener('drop', (event) => {
  void handleDroppedFiles(event);
});
composerElement.addEventListener('dragover', (event) => event.preventDefault());
composerElement.addEventListener('drop', (event) => {
  void handleDroppedFiles(event);
});

composerInput.addEventListener('input', () => {
  resizeComposer();
  updateComposerState();
});
composerInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  sendComposerMessage();
});
composerInput.addEventListener('paste', (event) => {
  const items = [...(event.clipboardData?.items ?? [])];
  if (items.some((item) => item.kind === 'file')) {
    event.preventDefault();
    void attachClipboardImage();
  }
});
composerInput.addEventListener('dragover', (event) => event.preventDefault());
composerInput.addEventListener('drop', (event) => {
  void handleDroppedFiles(event);
});
sendMessageButton.addEventListener('click', sendComposerMessage);
stopRunButton.addEventListener('click', () => {
  if (!running) return;
  api.write('\x1b');
  toast('已发送中断');
  audit('中断当前生成');
});
$('composer-attach').addEventListener('click', () => void pickAttachments());
$('attach-media').addEventListener('click', () => void pickAttachments());
$('composer-commands').addEventListener('click', openCommandPalette);
$('open-commands').addEventListener('click', openCommandPalette);
commandSearch.addEventListener('input', () => renderCommandList(commandSearch.value));
commandSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCommandPalette();
    composerInput.focus();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveCommandActive(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const items = commandItems();
    (items[commandActiveIndex] ?? items[0])?.click();
  }
});
commandPalette.addEventListener('click', (event) => {
  if (event.target === commandPalette) closeCommandPalette();
});
mediaPreviewCloseButton.addEventListener('click', closeMediaPreview);
mediaPreviewExternalButton.addEventListener('click', () => {
  if (!previewItem) return;
  void api.openMediaExternally(previewItem.path).then((result) => {
    if (!result.ok) toast(result.error ?? '无法打开文件');
  });
});
mediaPreview.addEventListener('click', (event) => {
  if (event.target === mediaPreview) closeMediaPreview();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!mediaPreview.hidden) {
      event.preventDefault();
      closeMediaPreview();
      return;
    }
    if (!commandPalette.hidden) {
      event.preventDefault();
      closeCommandPalette();
      composerInput.focus();
    }
    return;
  }
  if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    toggleCommandPalette();
  }
});
terminalElement.addEventListener('wheel', (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setFontSize(fontSize + (event.deltaY < 0 ? 1 : -1));
}, { passive: false });

async function pasteClipboard(): Promise<void> {
  try {
    if (await attachClipboardImage()) return;
    if (!running) return;
    const text = await api.readClipboard();
    if (text) terminal.paste(text);
  } catch {
    toast('读取剪贴板失败');
  }
}

async function copySelection(): Promise<void> {
  const selection = terminal.getSelection();
  if (!selection) {
    toast('没有选中文本');
    return;
  }
  try {
    await api.writeClipboard(selection);
    toast('已复制终端选区');
  } catch {
    toast('写入剪贴板失败');
  }
}

function updateComposerState(): void {
  const hasContent = composerInput.value.trim().length > 0 || attachments.length > 0;
  sendMessageButton.disabled = !running || !hasContent;
  stopRunButton.disabled = !running;
}

function resizeComposer(): void {
  composerInput.style.height = 'auto';
  composerInput.style.height = `${Math.min(composerInput.scrollHeight, 170)}px`;
}

function renderAttachments(): void {
  attachmentBar.replaceChildren();
  attachmentBar.hidden = attachments.length === 0;
  for (const item of attachments) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.title = `${item.name} · ${formatSize(item.size)} · ${t('点击预览')}`;
    if (item.kind === 'image') {
      const thumb = document.createElement('img');
      thumb.src = item.url;
      thumb.alt = '';
      chip.append(thumb);
    } else {
      const icon = document.createElement('span');
      icon.className = 'media-icon';
      const ext = item.name.includes('.') ? item.name.split('.').pop() ?? '' : '';
      icon.textContent = item.kind === 'video' ? '▶' : (ext.slice(0, 4).toUpperCase() || 'FILE');
      chip.append(icon);
    }
    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = item.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'attachment-remove';
    remove.textContent = '×';
    remove.title = t('移除附件');
    remove.setAttribute('aria-label', t('移除 {name}', { name: item.name }));
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      attachments = attachments.filter((entry) => entry.path !== item.path);
      renderAttachments();
      updateComposerState();
    });
    chip.append(name, remove);
    chip.addEventListener('click', () => showMediaPreview(item));
    attachmentBar.append(chip);
  }
  updateComposerState();
}

function addAttachments(items: MediaItem[]): void {
  let added = 0;
  for (const item of items) {
    if (attachments.some((entry) => entry.path === item.path)) continue;
    if (attachments.length >= 8) {
      toast('最多同时附加 8 个文件');
      break;
    }
    attachments.push(item);
    added += 1;
  }
  if (!added) return;
  renderAttachments();
  audit('附加 {count} 个文件', { count: added });
}

async function pickAttachments(): Promise<void> {
  try {
    const result = await api.pickMedia();
    if (!result.ok) {
      if (result.error) toast(result.error);
      return;
    }
    const items = result.items ?? (result.item ? [result.item] : []);
    addAttachments(items);
  } catch {
    toast('选择文件失败');
  }
}

async function attachClipboardImage(): Promise<boolean> {
  try {
    const result = await api.clipboardImage();
    if (!result.ok || !result.item) return false;
    addAttachments([result.item]);
    toast('已附加剪贴板图片');
    return true;
  } catch {
    return false;
  }
}

function sendComposerMessage(): void {
  if (!mediaPreview.hidden || !commandPalette.hidden) return;
  const text = composerInput.value.trim();
  if (text && !attachments.length) {
    const intent = matchNaturalIntent(text);
    if (intent) {
      composerInput.value = '';
      resizeComposer();
      if (executeNaturalIntent(intent)) {
        updateComposerState();
        return;
      }
      composerInput.value = text;
      resizeComposer();
    }
  }
  if (!running) {
    toast('先启动 Pi 会话');
    return;
  }
  const paths = attachments.map((item) => (/\s/.test(item.path) ? `"${item.path}"` : item.path));
  const message = [text, paths.join(' ')].filter(Boolean).join('\n');
  if (!message) return;
  // Pi's TUI handles bracketed paste; multi-line input reaches the editor as one block.
  const payload = message.includes('\n') ? `\x1b[200~${message}\x1b[201~` : message;
  api.write(`${payload}\r`);
  const attached = attachments.length;
  composerInput.value = '';
  attachments = [];
  resizeComposer();
  renderAttachments();
  toast(attached ? t('已发送（含 {count} 个附件）', { count: attached }) : t('已发送'));
  audit('发送消息 · {count} 字{attachments}', {
    count: text.length,
    attachments: attached ? t(' · {count} 个附件', { count: attached }) : '',
  });
}

function localPathFromUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'file:') return '';
    let filePath = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
    if (parsed.hostname && parsed.hostname !== 'localhost') filePath = `//${parsed.hostname}${filePath}`;
    return filePath;
  } catch {
    return '';
  }
}

async function maybePreviewLocalFile(uri: string): Promise<boolean> {
  const filePath = localPathFromUri(uri);
  if (!filePath) return false;
  try {
    const result = await api.allowMediaPath(filePath);
    if (!result.ok || !result.item) return false;
    showMediaPreview(result.item);
    return true;
  } catch {
    return false;
  }
}

function applyPreviewTransform(): void {
  const image = mediaPreviewBody.querySelector<HTMLImageElement>('img');
  if (!image) return;
  image.style.transform = `translate(${previewX}px, ${previewY}px) scale(${previewScale})`;
  image.style.cursor = previewPan ? 'grabbing' : previewScale > 1 ? 'grab' : 'zoom-in';
}

function showMediaPreview(item: MediaItem): void {
  previewItem = item;
  previewScale = 1;
  previewX = 0;
  previewY = 0;
  mediaPreviewName.textContent = `${item.name} · ${formatSize(item.size)}`;
  mediaPreviewBody.replaceChildren();
  if (item.kind === 'image') {
    const image = document.createElement('img');
    image.src = item.url;
    image.alt = item.name;
    image.draggable = false;
    image.addEventListener('wheel', (event) => {
      event.preventDefault();
      const next = previewScale * (event.deltaY < 0 ? 1.1 : 0.9);
      previewScale = Math.max(0.2, Math.min(8, next));
      applyPreviewTransform();
    }, { passive: false });
    image.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      image.setPointerCapture(event.pointerId);
      previewPan = { x: event.clientX, y: event.clientY, left: previewX, top: previewY };
      applyPreviewTransform();
    });
    image.addEventListener('pointermove', (event) => {
      if (!previewPan) return;
      previewX = previewPan.left + (event.clientX - previewPan.x);
      previewY = previewPan.top + (event.clientY - previewPan.y);
      applyPreviewTransform();
    });
    const stopPan = () => {
      previewPan = null;
      applyPreviewTransform();
    };
    image.addEventListener('pointerup', stopPan);
    image.addEventListener('pointercancel', stopPan);
    mediaPreviewBody.append(image);
    applyPreviewTransform();
  } else if (item.kind === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('error', () => {
      toast('内置播放器无法播放该视频，可用系统播放器打开');
    });
    mediaPreviewBody.append(video);
  } else {
    const file = document.createElement('div');
    file.className = 'file-preview';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const detail = document.createElement('span');
    detail.textContent = `${formatSize(item.size)} · ${item.path}`;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'primary';
    open.textContent = t('用系统程序打开');
    open.addEventListener('click', async () => {
      const result = await api.openMediaExternally(item.path);
      if (!result.ok) toast(result.error ?? t('打开失败'));
    });
    file.append(name, detail, open);
    mediaPreviewBody.append(file);
  }
  mediaPreview.hidden = false;
  audit('预览 {kind} {name}', { kind: t(item.kind === 'image' ? '图片' : item.kind === 'video' ? '视频' : '文件'), name: item.name });
}

function closeMediaPreview(): void {
  mediaPreview.hidden = true;
  mediaPreviewBody.replaceChildren();
  previewItem = null;
  previewPan = null;
  composerInput.focus();
}

type NaturalIntent =
  | { kind: 'pi'; command: string; label: string }
  | { kind: 'insert'; command: string; label: string }
  | { kind: 'key'; data: string; label: string }
  | { kind: 'model'; query: string; label: string }
  | { kind: 'ui'; tab: string; label: string }
  | { kind: 'refresh'; target: 'models' | 'capabilities' | 'sessions' | 'task'; label: string };

const NATURAL_RULES: Array<{ re: RegExp; build: (match: RegExpMatchArray) => NaturalIntent | null }> = [
  { re: /^(?:请|帮我|麻烦)?\s*(?:压缩|精简|总结|compact|summarize)\s*(?:一下|下)?\s*(?:上下文|对话|context)?$/, build: () => ({ kind: 'pi', command: '/compact', label: '压缩上下文' }) },
  { re: /^(?:请|帮我)?\s*(?:新建|新开|创建|开)\s*(?:一个|个)?\s*(?:新)?\s*(?:会话|对话|session)$/, build: () => ({ kind: 'pi', command: '/new', label: '新建会话' }) },
  { re: /^(?:请|帮我)?\s*(?:恢复|继续)\s*(?:上次|上一个|之前|最近的)?\s*(?:会话|对话|session)$/, build: () => ({ kind: 'pi', command: '/resume', label: '恢复会话' }) },
  { re: /^(?:请|帮我)?\s*(?:重新加载|重载)\s*(?:配置|扩展|技能|skills?)?$|^reload$/, build: () => ({ kind: 'pi', command: '/reload', label: '重新加载配置' }) },
  { re: /^(?:查看|打开|看看|显示)?\s*(?:快捷键|hotkeys?)$/, build: () => ({ kind: 'pi', command: '/hotkeys', label: '查看快捷键' }) },
  { re: /^(?:查看|打开|看看|显示)?\s*(?:会话信息|会话统计|session)$/, build: () => ({ kind: 'pi', command: '/session', label: '查看会话信息' }) },
  { re: /^(?:停止|中断|取消|stop)\s*(?:生成|输出|当前)?$/, build: () => ({ kind: 'key', data: '\x1b', label: '中断生成' }) },
  { re: /^(?:导出|export)\s*(?:会话|对话)?$/, build: () => ({ kind: 'insert', command: '/export', label: '导出会话' }) },
  { re: /^(?:设置|命名)\s*(?:会话名|会话名称|名称)\s*(?:为|叫)?\s*(.+)$/, build: (m) => ({ kind: 'pi', command: `/name ${m[1].trim()}`, label: '设置会话名称' }) },
  { re: /^(?:切换|换|使用|用)\s*(?:到|成|为)?\s*(?:模型)?\s*[:：]?\s*(.+)$/, build: (m) => ({ kind: 'model', query: m[1].trim(), label: '切换模型' }) },
  { re: /^模型\s*(?:切换到|换成|切换为)\s*(.+)$/, build: (m) => ({ kind: 'model', query: m[1].trim(), label: '切换模型' }) },
  { re: /^(?:打开|显示)?\s*(?:模型|模型面板)$/, build: () => ({ kind: 'ui', tab: 'tab-model', label: '模型面板' }) },
  { re: /^(?:打开|显示)?\s*(?:能力|技能|扩展|skills?|mcp)(?:面板)?$/, build: () => ({ kind: 'ui', tab: 'tab-capability', label: '能力面板' }) },
  { re: /^(?:打开|显示)?\s*(?:会话|会话列表|会话面板)$/, build: () => ({ kind: 'ui', tab: 'tab-session', label: '会话面板' }) },
  { re: /^(?:打开|显示)?\s*(?:任务|任务面板|状态|git|git 状态)$/, build: () => ({ kind: 'ui', tab: 'tab-task', label: '任务面板' }) },
  { re: /^(?:打开|显示)?\s*(?:接入|provider|中转站)(?:面板)?$/, build: () => ({ kind: 'ui', tab: 'tab-provider', label: '接入面板' }) },
  { re: /^(?:刷新|重新读取)\s*(?:模型)$/, build: () => ({ kind: 'refresh', target: 'models', label: '刷新模型' }) },
  { re: /^(?:刷新|重新读取)\s*(?:能力|技能|扩展)$/, build: () => ({ kind: 'refresh', target: 'capabilities', label: '刷新能力' }) },
  { re: /^(?:刷新|重新读取)\s*(?:会话)$/, build: () => ({ kind: 'refresh', target: 'sessions', label: '刷新会话' }) },
  { re: /^(?:刷新|重新读取)\s*(?:任务|git|git 状态)$/, build: () => ({ kind: 'refresh', target: 'task', label: '刷新任务状态' }) },
];

function matchNaturalIntent(text: string): NaturalIntent | null {
  const normalized = text.trim().replace(/[，。！!？?、；;：:]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized || normalized.length > 40 || normalized.startsWith('/')) return null;
  for (const rule of NATURAL_RULES) {
    const match = normalized.match(rule.re);
    if (match) return rule.build(match);
  }
  return null;
}

function resolveModelIntent(query: string): { provider: string; model: string; module?: ModelModule } | null {
  const value = query.trim();
  if (!value) return null;
  const module = modelModules.find((item) =>
    item.name.toLowerCase() === value.toLowerCase()
    || `${item.provider}/${item.model}`.toLowerCase() === value.toLowerCase());
  if (module) return { provider: module.provider, model: module.model, module };
  const slash = value.indexOf('/');
  if (slash > 0 && slash < value.length - 1) {
    return { provider: value.slice(0, slash), model: value.slice(slash + 1) };
  }
  const known = models.find((item) => item.id.toLowerCase() === value.toLowerCase()
    || `${item.provider}/${item.id}`.toLowerCase() === value.toLowerCase());
  return known ? { provider: known.provider, model: known.id } : null;
}

function executeNaturalIntent(intent: NaturalIntent): boolean {
  if (intent.kind === 'ui') {
    activateTab(intent.tab);
    toast('已打开{label}', { label: t(intent.label) });
    return true;
  }
  if (intent.kind === 'refresh') {
    if (intent.target === 'models') void refreshModels();
    else if (intent.target === 'capabilities') void refreshCapabilities();
    else if (intent.target === 'sessions') void refreshSessions();
    else {
      refreshTaskPane();
      void refreshTaskGit();
    }
    toast('已{label}', { label: t(intent.label) });
    return true;
  }
  if (intent.kind === 'model') {
    const target = resolveModelIntent(intent.query);
    if (!target) return false;
    if (target.module) {
      applyModule(target.module);
    } else if (running) {
      const command = `/model ${target.provider}/${target.model}`;
      api.write(`${command}\r`);
      terminal.focus();
      toast('已切换模型 {model}', { model: `${target.provider}/${target.model}` });
      audit('自然语言执行 {command}', { command });
    } else {
      stageModel(models.find((item) => item.provider === target.provider && item.id === target.model) ?? {
        provider: target.provider,
        id: target.model,
        name: target.model,
        reasoning: false,
        relay: false,
        current: false,
      });
    }
    return true;
  }
  if (!running) {
    toast('先启动 Pi 会话');
    return true;
  }
  if (intent.kind === 'insert') {
    composerInput.value = `${intent.command} `;
    resizeComposer();
    composerInput.focus();
    updateComposerState();
    audit('自然语言待补参数 {command}', { command: intent.command });
    return true;
  }
  if (intent.kind === 'key') {
    api.write(intent.data);
    terminal.focus();
    toast('已发送中断信号');
    audit('自然语言中断生成');
    return true;
  }
  api.write(`${intent.command}\r`);
  terminal.focus();
  toast('已识别为 {command} · {label}', { command: intent.command, label: t(intent.label) });
  audit('自然语言执行 {command}', { command: intent.command });
  return true;
}

const PI_COMMANDS: Array<{ command: string; label: string; insertOnly?: boolean; keywords?: string }> = [
  { command: '/model', label: '选择模型（打开选择器）', keywords: '模型 切换 model' },
  { command: '/new', label: '新建会话' },
  { command: '/compact', label: '压缩上下文' },
  { command: '/resume', label: '恢复其他会话' },
  { command: '/thinking', label: '设置思考等级', insertOnly: true },
  { command: '/scoped-models', label: '管理 Ctrl+P 循环的模型' },
  { command: '/tree', label: '浏览会话树 / 切换分支' },
  { command: '/fork', label: '从历史消息分叉' },
  { command: '/clone', label: '克隆当前会话' },
  { command: '/session', label: '查看会话信息与统计' },
  { command: '/name', label: '设置会话名称', insertOnly: true },
  { command: '/copy', label: '复制上一条回复' },
  { command: '/export', label: '导出会话（HTML / JSONL）', insertOnly: true },
  { command: '/import', label: '导入并恢复 JSONL 会话', insertOnly: true },
  { command: '/share', label: '分享会话' },
  { command: '/login', label: '配置 provider 登录' },
  { command: '/logout', label: '移除 provider 登录' },
  { command: '/trust', label: '保存项目信任决定' },
  { command: '/reload', label: '重新加载扩展 / 技能 / 配置' },
  { command: '/settings', label: '打开设置菜单' },
  { command: '/hotkeys', label: '查看全部快捷键' },
  { command: '/changelog', label: '查看更新日志' },
  { command: '/bug', label: '反馈问题', insertOnly: true },
  { command: '/quit', label: '退出 Pi' },
];

function runPiCommand(command: string, insertOnly = false): void {
  closeCommandPalette();
  if (insertOnly) {
    composerInput.value = `${command} `;
    resizeComposer();
    composerInput.focus();
    updateComposerState();
    return;
  }
  if (!running) {
    toast('先启动 Pi 会话');
    return;
  }
  api.write(`${command}\r`);
  terminal.focus();
  audit('执行指令 {command}', { command });
}

let commandActiveIndex = 0;

function commandItems(): HTMLButtonElement[] {
  return Array.from(commandListElement.querySelectorAll<HTMLButtonElement>('.command-item'));
}

function updateCommandActive(): void {
  const items = commandItems();
  if (!items.length) {
    commandActiveIndex = 0;
    return;
  }
  commandActiveIndex = (commandActiveIndex + items.length) % items.length;
  items.forEach((item, index) => {
    item.classList.toggle('active', index === commandActiveIndex);
    if (index === commandActiveIndex) item.scrollIntoView({ block: 'nearest' });
  });
}

function moveCommandActive(step: number): void {
  commandActiveIndex += step;
  updateCommandActive();
}

function renderCommandList(filter = ''): void {
  const term = filter.trim().toLowerCase();
  const matches = PI_COMMANDS.filter((entry) =>
    !term
    || entry.command.toLowerCase().includes(term)
    || t(entry.label).toLowerCase().includes(term)
    || (entry.keywords ?? '').toLowerCase().includes(term));
  commandListElement.replaceChildren();
  commandActiveIndex = 0;
  const intent = term ? matchNaturalIntent(filter) : null;
  if (intent) {
    const resolved = intent;
    const suggestion = document.createElement('button');
    suggestion.type = 'button';
    suggestion.className = 'command-item natural';
    const code = document.createElement('code');
    code.textContent = resolved.kind === 'pi' ? resolved.command
      : resolved.kind === 'insert' ? resolved.command
        : resolved.kind === 'model' ? '/model'
          : resolved.kind === 'refresh' ? '/refresh'
            : '/panel';
    const label = document.createElement('span');
    label.textContent = t('识别意图：{label}', { label: t(resolved.label) });
    suggestion.append(code, label);
    suggestion.addEventListener('click', () => {
      closeCommandPalette();
      executeNaturalIntent(resolved);
    });
    commandListElement.append(suggestion);
  }
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('没有匹配的指令');
    commandListElement.append(empty);
    return;
  }
  for (const entry of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'command-item';
    const code = document.createElement('code');
    code.textContent = entry.command;
    const label = document.createElement('span');
    label.textContent = t(entry.label);
    button.append(code, label);
    button.addEventListener('click', () => runPiCommand(entry.command, entry.insertOnly));
    button.addEventListener('mousemove', () => {
      const items = commandItems();
      const index = items.indexOf(button);
      if (index >= 0 && index !== commandActiveIndex) {
        commandActiveIndex = index;
        updateCommandActive();
      }
    });
    commandListElement.append(button);
  }
  updateCommandActive();
}

function openCommandPalette(): void {
  commandPalette.hidden = false;
  commandSearch.value = '';
  renderCommandList();
  commandSearch.focus();
}

function closeCommandPalette(): void {
  commandPalette.hidden = true;
}

function toggleCommandPalette(): void {
  if (commandPalette.hidden) openCommandPalette();
  else closeCommandPalette();
}

async function handleDroppedFiles(event: DragEvent): Promise<void> {
  event.preventDefault();
  const transfer = event.dataTransfer;
  if (!transfer) return;
  const media: MediaItem[] = [];
  const others: string[] = [];
  for (const file of [...transfer.files]) {
    const filePath = api.filePath(file);
    if (!filePath) continue;
    try {
      const result = await api.allowMediaPath(filePath);
      if (result.ok && result.item) media.push(result.item);
      else others.push(filePath);
    } catch {
      others.push(filePath);
    }
  }
  if (!media.length && !others.length) {
    const raw = transfer.getData('text/uri-list') ?? '';
    const paths = raw.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        try {
          return decodeURIComponent(new URL(line).pathname).replace(/^\/([A-Za-z]:)/, '$1');
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    for (const filePath of paths) {
      try {
        const result = await api.allowMediaPath(filePath);
        if (result.ok && result.item) media.push(result.item);
        else others.push(filePath);
      } catch {
        others.push(filePath);
      }
    }
  }
  if (media.length) addAttachments(media);
  if (others.length && running) {
    const text = `${others.map((item) => (/\s/.test(item) ? `"${item}"` : item)).join(' ')} `;
    terminal.paste(text);
    toast('已插入 {count} 个路径', { count: others.length });
  } else if (!media.length && !others.length) {
    toast('没有可用的文件');
  }
}

api.onData((data) => {
  lastOutputAt = Date.now();
  trackActiveModel(data);
  terminal.write(data, () => api.ack(data.length));
});

api.onState((state) => {
  if (state.status === 'running') {
    running = true;
    taskStartedAt = Date.now();
    lastOutputAt = Date.now();
    setState('running', '运行中');
    setTerminalHint();
    stopButton.disabled = false;
    startButton.disabled = true;
    sendButton.disabled = !(previewElement.textContent ?? '').startsWith('/model ');
    updateComposerState();
  } else if (state.status === 'exited') {
    running = false;
    setState('exited', '已退出 {code}', { code: state.exitCode ?? '?' });
    stopButton.disabled = true;
    startButton.disabled = !currentCwd;
    sendButton.disabled = true;
    updateComposerState();
    setTerminalHint('会话已结束 · 点击「新会话」或从会话面板恢复');
    audit('Pi 退出，代码 {code}', { code: state.exitCode ?? t('未知') });
    renderTaskStatus();
    void refreshTaskGit();
    window.setTimeout(() => void refreshSessions(), 500);
  } else if (state.status === 'stopped') {
    running = false;
    setState('idle', '已停止');
    stopButton.disabled = true;
    startButton.disabled = !currentCwd;
    sendButton.disabled = true;
    updateComposerState();
    setTerminalHint('Pi 已停止 · 点击「新会话」重新开始');
    audit('已停止 Pi');
    renderTaskStatus();
    void refreshTaskGit();
    window.setTimeout(() => void refreshSessions(), 500);
  }
});

$('pick-project').addEventListener('click', async () => {
  const result = await api.pickProject();
  if (!result.ok || !result.path) return;
  setProject(result.path);
  void refreshProjects();
});

startButton.addEventListener('click', () => {
  void startSession();
});

stopButton.addEventListener('click', async () => {
  await api.stopPi();
});

$('refresh-models').addEventListener('click', () => void refreshModels());
$('refresh-capabilities').addEventListener('click', () => void refreshCapabilities());
$('refresh-sessions').addEventListener('click', () => void refreshSessions());
$('refresh-providers').addEventListener('click', () => void refreshProviders());
$('add-provider').addEventListener('click', openNewProvider);
$('builtin-provider-key').addEventListener('click', () => openBuiltinKey(''));
modelSearchElement.addEventListener('input', renderModels);
modelProviderElement.addEventListener('change', renderModels);
$('add-module').addEventListener('click', () => openModuleForm());
$('cancel-module').addEventListener('click', closeModuleForm);
moduleFormElement.addEventListener('submit', saveModuleFromForm);
moduleModelSelect.addEventListener('change', () => {
  moduleModelCustomInput.hidden = moduleModelSelect.value !== CUSTOM_MODEL;
  if (!moduleModelCustomInput.hidden) moduleModelCustomInput.focus();
});
$('add-capability').addEventListener('click', openCapabilityForm);
$('cancel-capability').addEventListener('click', closeCapabilityForm);
capabilityKindSelect.addEventListener('change', syncCapabilityFields);
capabilityFormElement.addEventListener('submit', (event) => void submitCapabilityForm(event));
$('refresh-task').addEventListener('click', () => {
  refreshTaskPane();
  void refreshTaskGit();
});
$('open-folder').addEventListener('click', () => void openProjectTarget('folder'));
$('open-vscode').addEventListener('click', () => void openProjectTarget('vscode'));
taskOpenFolderButton.addEventListener('click', () => void openProjectTarget('folder'));
taskOpenVSCodeButton.addEventListener('click', () => void openProjectTarget('vscode'));
todoFormElement.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = todoInputElement.value.trim();
  if (!text || !currentCwd) return;
  todoItems.push({ id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text: text.slice(0, 300), done: false });
  todoInputElement.value = '';
  saveTodos();
  renderTodoList();
  audit('添加任务 {text}', { text });
});
activeModelElement.addEventListener('click', () => activateTab('tab-model'));
activeModelElement.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateTab('tab-model');
  }
});
projectModuleSelect.addEventListener('change', () => {
  if (!currentCwd) {
    toast('先选择项目目录');
    renderModules();
    return;
  }
  const module = modelModules.find((item) => item.id === projectModuleSelect.value);
  if (module) {
    projectModelBindings[currentCwd] = module.id;
    toast('已绑定 {name}；下次启动 Pi 生效', { name: module.name });
    audit('绑定项目模型 {name}', { name: module.name });
  } else {
    delete projectModelBindings[currentCwd];
    toast('已解绑本项目模型；下次启动 Pi 生效');
    audit('解绑项目模型');
  }
  saveProjectModelBindings();
});
providerFormElement.addEventListener('submit', (event) => {
  event.preventDefault();
  void submitProviderForm();
});
$('cancel-provider').addEventListener('click', () => {
  showProviderForm(false);
  setFormNote('');
});
fetchModelsButton.addEventListener('click', () => void fetchModelsForForm());
clearProviderKeyButton.addEventListener('click', () => void clearProviderKeyFromForm());
providerHeadersReplace.addEventListener('change', () => {
  headersField.hidden = !providerHeadersReplace.checked;
});
deleteProviderButton.addEventListener('click', () => {
  const provider = providers.find((item) => item.id === providerEditingId);
  if (provider) void removeProvider(provider);
});
setDefaultButton.addEventListener('click', async () => {
  if (!selectedModel) return;
  const provider = selectedModel.provider;
  const modelId = selectedModel.id;
  setDefaultButton.disabled = true;
  try {
    const result = await api.setDefaultModel(provider, modelId);
    if (!result.ok) {
      toast(result.error ?? t('设置默认模型失败'));
      return;
    }
    for (const model of models) {
      model.current = model.provider === provider && model.id === modelId;
    }
    renderModels();
    toast('已设为默认模型；新 Pi 会话生效');
    audit('默认模型 {provider}/{model}', { provider, model: modelId });
  } finally {
    setDefaultButton.disabled = !selectedModel;
  }
});

copyButton.addEventListener('click', async () => {
  const command = previewElement.textContent ?? '';
  if (!command.startsWith('/model ')) return;
  try {
    await api.writeClipboard(command);
    toast('已复制 /model 命令');
    audit('复制模型切换命令');
  } catch {
    toast('写入剪贴板失败');
  }
});

sendButton.addEventListener('click', () => {
  const command = previewElement.textContent ?? '';
  if (!command.startsWith('/model ')) return;
  if (!running) {
    toast('先启动 Pi');
    return;
  }
  api.write(`${command}\r`);
  terminal.focus();
  toast('已发送到终端');
  audit('终端执行 {command}', { command });
});

alertText.addEventListener('click', () => {
  activateTab('tab-model');
  modelSearchElement.focus();
  modelSearchElement.select();
});
$('alert-models').addEventListener('click', () => {
  activateTab('tab-model');
  modelSearchElement.focus();
  modelSearchElement.select();
});
$('alert-dismiss').addEventListener('click', () => {
  alertBar.hidden = true;
  dismissedDiagnosis = lastDiagnosisKey;
});

function updateModeNote(): void {
  const note = document.getElementById('mode-note');
  if (!note) return;
  note.textContent = t(isolatedCheckbox.checked
    ? '隔离模式：独立配置，关闭扩展/MCP/Skills，剥离供应商密钥并离线，不会发起真实模型请求。'
    : '真实配置：使用本机 Pi 配置与授权，扩展/MCP/Skills 全部加载；对话可能联网并产生费用。');
}

function relocalize(): void {
  applyStaticI18n();
  document.title = t('Pi 工作台 · PoC');
  projectPathElement.textContent = currentCwd || t('尚未选择');
  cwdElement.textContent = currentCwd || t('未绑定项目');
  isolatedElement.textContent = isolatedDir || t('启动后显示');
  if (detectedVersion) versionElement.textContent = `Pi ${detectedVersion}`;
  else if (versionMissing) versionElement.textContent = t('Pi 未找到');
  if (shownModel) activeModelElement.textContent = t('模型 {model}', { model: shownModel });
  else if (!running) activeModelElement.textContent = t('模型 —');
  setState(stateStatus, stateSource, stateVars);
  if (hintSource) setTerminalHint(hintSource, hintVars);
  updateModeNote();
  renderProjects(lastProjects);
  if (models.length) renderProviderFilter();
  renderModels();
  renderModules();
  refreshTaskPane();
  void refreshEnvironment();
  previewElement.textContent = selectedModel
    ? `/model ${selectedModel.provider}/${selectedModel.id}`
    : t('选择模型后生成命令');
  if (!providerFormElement.hidden) {
    providerKeyInput.placeholder = t(keyPlaceholderSource);
    if (formNoteSource) {
      providerFormNote.textContent = t(formNoteSource, formNoteVars);
      providerFormNote.className = formNoteKind ? `note ${formNoteKind}` : 'note';
    }
    if (!headersReplaceRow.hidden) {
      const provider = providers.find((item) => item.id === providerEditingId);
      if (provider?.headerNames?.length) {
        headersReplaceLabel.textContent = t('替换额外请求头（现有 {names}）', { names: provider.headerNames.join(', ') });
      }
    }
  }
  renderAttachments();
  if (!commandPalette.hidden) renderCommandList(commandSearch.value);
  if (!alertBar.hidden && activeDiagnosis) alertText.textContent = diagnosisMessage(activeDiagnosis);
  void refreshModels();
  void refreshCapabilities();
  void refreshSessions();
  void refreshProviders();
}

let localeSwitching = false;
async function switchLocale(value: string): Promise<void> {
  if (localeSwitching) return;
  localeSwitching = true;
  setLocale(value);
  try {
    localStorage.setItem('pi-locale', getLocale());
  } catch {
    // storage is optional
  }
  languageSelect.value = getLocale();
  try {
    await api.setLocale(getLocale());
  } catch {
    // the UI still switches even if the backend handler is unavailable
  }
  relocalize();
  localeSwitching = false;
}

try {
  const smokeIsolated = new URLSearchParams(window.location.search).get('smokeIsolated');
  isolatedCheckbox.checked = smokeIsolated !== null
    ? smokeIsolated === '1'
    : localStorage.getItem('pi-isolated') === '1';
  const storedFont = Number(localStorage.getItem('pi-font-size'));
  if (Number.isFinite(storedFont) && storedFont >= 11 && storedFont <= 28) {
    fontSize = storedFont;
    terminal.options.fontSize = storedFont;
  }
} catch {
  // storage is optional; fall back to defaults
}
const languageSelect = $<HTMLSelectElement>('language-select');
languageSelect.value = getLocale();
languageSelect.addEventListener('change', () => void switchLocale(languageSelect.value));
applyStaticI18n();
renderModules();
void api.setLocale(getLocale()).catch(() => undefined);
updateModeNote();
isolatedCheckbox.addEventListener('change', () => {
  try {
    localStorage.setItem('pi-isolated', isolatedCheckbox.checked ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  updateModeNote();
  audit(isolatedCheckbox.checked ? '切换为隔离模式' : '切换为真实配置模式');
});

try {
  autoStartCheckbox.checked = localStorage.getItem(AUTO_START_KEY) !== '0';
} catch {
  autoStartCheckbox.checked = true;
}
autoStartCheckbox.addEventListener('change', () => {
  try {
    localStorage.setItem(AUTO_START_KEY, autoStartCheckbox.checked ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  audit(autoStartCheckbox.checked ? '开启打开时自动启动' : '关闭打开时自动启动');
});
setupEnvButton.addEventListener('click', () => void runEnvironmentSetup());
createShortcutButton.addEventListener('click', () => void createDesktopShortcut());
api.onOpenProject((projectPath) => {
  externalProjectPending = true;
  void openExternalProject(projectPath);
});

for (const [id, delta] of [['font-minus', -1], ['font-plus', 1]] as const) {
  $(id).addEventListener('click', () => setFontSize(fontSize + delta));
}

const resizeObserver = new ResizeObserver(() => {
  window.requestAnimationFrame(doFit);
});
resizeObserver.observe(terminalElement.parentElement ?? terminalElement);

terminalElement.addEventListener('click', () => terminal.focus());
window.addEventListener('resize', () => window.requestAnimationFrame(doFit));

void (async () => {
  await refreshProjects();
  const smokeCwd = new URLSearchParams(window.location.search).get('smokeCwd');
  if (smokeCwd) setProject(smokeCwd);
  const result = await api.locate();
  if (result.ok && result.install) {
    detectedVersion = result.install.version;
    versionMissing = false;
    versionElement.textContent = `Pi ${result.install.version}`;
    nodePathElement.textContent = result.install.nodePath;
    nodePathElement.title = result.install.nodePath;
    audit('发现 Pi {version}', { version: result.install.version });
  } else {
    versionMissing = true;
    versionElement.textContent = t('Pi 未找到');
    setState('error', '环境异常');
    toast(result.error ?? t('未找到 Pi 安装'));
    audit('环境异常：{error}', { error: result.error ?? t('未知') });
  }
  const environment = await refreshEnvironment();
  if (environment) syncVersionFromEnvironment(environment);
  void refreshModels();
  void refreshProviders();
  renderAttachments();
  if (!smokeCwd && !externalProjectPending) {
    let lastProject: string | null = null;
    try {
      lastProject = localStorage.getItem(LAST_PROJECT_KEY);
    } catch {
      // storage is optional
    }
    if (lastProject && lastProject !== currentCwd) {
      setProject(lastProject);
      void refreshProjects();
    }
    if (autoStartEnabled() && currentCwd && !versionMissing) void startSession();
  }
  if (new URLSearchParams(window.location.search).has('smokeCwd')) {
    (window as unknown as { __piSmoke?: unknown }).__piSmoke = {
      attach: (item: MediaItem) => addAttachments([item]),
      preview: (item: MediaItem) => showMediaPreview(item),
      closePreview: closeMediaPreview,
      openPalette: openCommandPalette,
      closePalette: closeCommandPalette,
      state: () => ({ attachments: attachments.length, running, palette: !commandPalette.hidden }),
    };
  }
  window.requestAnimationFrame(() => {
    doFit();
    composerInput.focus();
  });
})();
