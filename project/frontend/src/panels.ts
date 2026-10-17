import { t } from './i18n.js';

interface HabitEvent {
  type: 'model' | 'permission' | 'autopilot' | 'memory-scope' | 'language';
  value: string;
  task?: string;
}

interface HabitSummary {
  ok: boolean;
  updatedAt?: string;
  top?: Array<{ type: HabitEvent['type']; value: string; count: number; lastAt: string; task?: string }>;
  profilePath?: string;
  error?: string;
}

interface CatalogSkill {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
}

interface CatalogMcp {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  command: string;
  args: string[];
  envHint?: string;
  needsConfig?: boolean;
}

interface VendorInfo {
  key: string;
  label: string;
  tier: number;
  aliases: string[];
}

interface CatalogExtension {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  builtin: boolean;
  version?: string;
  source: string;
}

interface CatalogReport {
  vendors: VendorInfo[];
  skills: CatalogSkill[];
  mcps: CatalogMcp[];
  extensions?: CatalogExtension[];
}

interface RegistryMcp {
  id: string;
  name: string;
  title: string;
  description: string;
  command: string;
  args: string[];
  source: string;
}

interface AgentInfo {
  id: string;
  name: string;
  command: string;
  description: string;
  roles: string[];
  strengths?: string[];
  weaknesses?: string[];
  specialties?: string[];
  limitations?: string[];
  authHint: string;
  installHint: string;
  install?: { kind: string; url?: string };
  installed: boolean;
  runnable?: boolean;
  cliInstalled?: boolean;
  desktopInstalled?: boolean;
  desktopPath?: string;
  version?: string;
  path?: string;
  custom?: boolean;
}

interface AgentEvent {
  runId: string;
  agentId: string;
  phase: 'start' | 'chunk' | 'stderr' | 'done' | 'error';
  text?: string;
  code?: number | null;
  summary?: string;
}

interface PublicChannel {
  id: string;
  name: string;
  type: string;
  url: string;
  chatId?: string;
  hasToken: boolean;
  enabled: boolean;
}

interface AutomationJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; minutes?: number; time?: string; days?: number[]; cron?: string };
  action: { type: string; prompt?: string; command?: string; argsText?: string; url?: string; target?: string; title?: string; body?: string; agentId?: string };
  cwd?: string;
  channelIds: string[];
  notifyOn: 'always' | 'failure' | 'never';
  createdAt: string;
  lastRunAt?: string;
  lastStatus?: 'ok' | 'error';
  lastMessage?: string;
  nextRunAt?: string;
}

interface CapabilityEntry {
  kind: 'package' | 'extension' | 'skill' | 'mcp';
  name: string;
  detail?: string;
  scope: 'user' | 'project';
}

interface VisualMedia {
  path: string;
  name: string;
  kind: 'image' | 'video' | 'file';
  size: number;
  url: string;
}

interface LocalAppInfo {
  id: string;
  name: string;
  kind: 'video' | '3d' | 'design' | 'audio' | 'engine' | 'dev' | 'office' | 'browser' | 'system';
  installed: boolean;
  path?: string;
  hint: string;
  custom?: boolean;
  /** 开始菜单扫描发现的软件 */
  discovered?: boolean;
  /** 内置 winget 包 ID */
  installId?: string;
}

interface CustomLink {
  id: string;
  name: string;
  url: string;
}

interface ToolSettings {
  webSearch: boolean;
  crawl: boolean;
  reverse: boolean;
  searchProvider: 'duckduckgo' | 'searxng';
  searxngUrl: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface RepoResult {
  name: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
  topics: string[];
  license: string;
}

interface CodeResult {
  repo: string;
  path: string;
  url: string;
  snippet: string;
}

interface PageContent {
  url: string;
  title: string;
  text: string;
}

interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

interface SessionUsage {
  id: string;
  path: string;
  startedAt: string;
  updatedAt: string;
  size: number;
  cacheHitRate: number;
  totals: UsageTotals;
  models: Array<UsageTotals & { provider: string; model: string }>;
}

export interface UsageReport {
  ok: true;
  sessions: SessionUsage[];
  totals: UsageTotals;
  cacheHitRate: number;
  generatedAt: string;
}

type PermissionLevel = 'allow' | 'ask' | 'deny';

interface PermissionRules {
  fileRead: PermissionLevel;
  fileWrite: PermissionLevel;
  shell: PermissionLevel;
  network: PermissionLevel;
  gitWrite: PermissionLevel;
  packageInstall: PermissionLevel;
}

interface PermissionResult {
  ok: boolean;
  path?: string;
  permissions?: {
    version: 1;
    project: string;
    updatedAt: string;
    rules: PermissionRules;
    workspaceOnly: boolean;
    autoApprove: boolean;
    allowPaths: string[];
    denyPaths: string[];
  };
  error?: string;
}

interface ArchiveMeta {
  id: string;
  label: string;
  project: string;
  createdAt: string;
  branch: string;
  head: string;
  changedFiles: number;
  untrackedFiles: number;
  patchBytes: number;
  untrackedBytes: number;
}

interface ArchiveResult {
  ok: boolean;
  archive?: ArchiveMeta;
  archives?: ArchiveMeta[];
  path?: string;
  touched?: string[];
  warnings?: string[];
  error?: string;
}

interface MemoryHit {
  id: string;
  project: string;
  sessionId: string;
  role: 'user' | 'assistant';
  timestamp: string;
  text: string;
  score: number;
  snippet: string;
}

interface MemoryStats {
  ok: true;
  entries: number;
  projects: number;
  projectEntries: number;
  updatedAt: string;
  bytes: number;
  path: string;
}

interface UpdateCheckResult {
  ok: boolean;
  app?: {
    current: string; latest: string; hasUpdate: boolean; url: string;
    notes: string; publishedAt: string;
    asset?: { name: string; url: string; size: number };
  };
  pi?: { current: string; latest: string; hasUpdate: boolean };
  settings?: { autoCheck: boolean; autoDownload: boolean };
  checkedAt?: string;
  error?: string;
}

interface PanelApi {
  catalog(): Promise<{ ok: boolean; catalog?: CatalogReport; agents?: AgentInfo[]; error?: string }>;
  inspectCapabilities(cwd: string): Promise<{ ok: boolean; report?: { capabilities: CapabilityEntry[]; warnings: string[] }; error?: string }>;
  searchMcpRegistry(query: string): Promise<{ ok: boolean; results: RegistryMcp[]; error?: string }>;
  searchExtensions(query: string): Promise<{ ok: boolean; results: CatalogExtension[]; error?: string }>;
  installExtension(input: string | { name: string; category?: string; tags?: string[]; source?: string }): Promise<{ ok: boolean; output: string; error?: string }>;
  importSkillUrl(input: { url: string; scope: 'user' | 'project'; cwd?: string; category?: string; tags?: string[] }): Promise<{ ok: boolean; path?: string; error?: string }>;
  addSkill(input: { scope: 'user' | 'project'; cwd?: string; name: string; description?: string; body?: string; category?: string; tags?: string[]; source?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  removeSkill(input: { scope: 'user' | 'project'; cwd?: string; name: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  addMcp(input: { scope: 'user' | 'project'; cwd?: string; name: string; command: string; argsText?: string; envText?: string; category?: string; tags?: string[]; source?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  listAgents(refresh?: boolean): Promise<{ ok: boolean; agents?: AgentInfo[]; error?: string }>;
  runTeam(input: { task: string; agentIds: string[]; mode: 'parallel' | 'supervisor'; supervisorId?: string; cwd?: string; apps?: string[]; webSearch?: boolean }): Promise<{ ok: boolean; supervisorId?: string; summaries: Array<{ agentId: string; ok: boolean; text: string }>; error?: string }>;
  suggestTeam(task: string, cwd?: string): Promise<{ taskKind: string; members: string[]; supervisorId: string; reason: string }>;
  installAgent(agentId: string): Promise<{ ok: boolean; agentId: string; output: string; error?: string }>;
  openAgentApp(agentId: string, cwd?: string): Promise<{ ok: boolean; error?: string }>;
  pickAgentCommand(): Promise<{ ok: boolean; path?: string }>;
  saveCustomAgent(input: {
    name: string;
    command: string;
    description?: string;
    roles?: string[];
    specialties?: string[];
    strengths?: string[];
    weaknesses?: string[];
    limitations?: string[];
    args?: string[];
  }): Promise<{ ok: boolean; error?: string }>;
  removeCustomAgent(id: string): Promise<{ ok: boolean; error?: string }>;
  stopAgent(runId: string): Promise<{ ok: boolean }>;
  automationList(): Promise<{ ok: boolean; jobs?: AutomationJob[]; channels?: PublicChannel[]; error?: string }>;
  saveAutomationJob(input: unknown, id?: string): Promise<{ ok: boolean; job?: AutomationJob; error?: string }>;
  deleteAutomationJob(id: string): Promise<{ ok: boolean }>;
  toggleAutomationJob(id: string, enabled: boolean): Promise<{ ok: boolean }>;
  runAutomationJob(id: string): Promise<{ ok: boolean; message: string }>;
  saveAutomationChannel(input: unknown, id?: string): Promise<{ ok: boolean; channel?: PublicChannel; error?: string }>;
  deleteAutomationChannel(id: string): Promise<{ ok: boolean }>;
  testAutomationChannel(id: string): Promise<{ ok: boolean; message: string }>;
  openApp(id: string, target?: string): Promise<{ ok: boolean; error?: string }>;
  listApps(refresh?: boolean): Promise<{ ok: boolean; apps: LocalAppInfo[]; error?: string }>;
  scanApps(refresh?: boolean): Promise<{ ok: boolean; apps: LocalAppInfo[]; error?: string }>;
  installApp(id: string): Promise<{ ok: boolean; output: string; error?: string }>;
  listLinks(): Promise<{ ok: boolean; links: CustomLink[] }>;
  saveLink(input: { name: string; url: string }): Promise<{ ok: boolean; link?: CustomLink; error?: string }>;
  removeLink(id: string): Promise<{ ok: boolean; error?: string }>;
  pickAppExe(): Promise<{ ok: boolean; path?: string; error?: string }>;
  saveApp(input: { id?: string; name: string; kind: string; path: string; hint?: string; projectArg?: string }): Promise<{ ok: boolean; app?: LocalAppInfo; error?: string }>;
  removeApp(id: string): Promise<{ ok: boolean; error?: string }>;
  usageReport(cwd: string): Promise<UsageReport | { ok: false; error: string }>;
  applyTokenSavings(): Promise<{ ok: boolean; path?: string; backup?: string; applied?: Record<string, unknown>; error?: string }>;
  getPermissions(cwd: string): Promise<PermissionResult>;
  savePermissions(input: { cwd: string; rules: PermissionRules; workspaceOnly?: boolean; autoApprove?: boolean; allowPaths?: string[]; denyPaths?: string[] }): Promise<PermissionResult>;
  installPermissionGuard(): Promise<{ ok: boolean; path?: string; installed?: boolean; error?: string }>;
  permissionGuardStatus(): Promise<{ installed: boolean; path: string }>;
  listArchives(cwd: string): Promise<{ ok: boolean; archives?: ArchiveMeta[]; path?: string; error?: string }>;
  createArchive(input: { cwd: string; label?: string }): Promise<ArchiveResult>;
  restoreArchive(input: { cwd: string; id: string }): Promise<ArchiveResult>;
  deleteArchive(input: { cwd: string; id: string }): Promise<ArchiveResult>;
  ingestMemory(cwd: string): Promise<{ ok: boolean; path?: string; added?: number; error?: string }>;
  searchMemory(input: { query: string; cwd?: string; scope?: 'project' | 'all'; limit?: number }): Promise<{ ok: boolean; hits?: MemoryHit[]; scanned?: number; error?: string }>;
  memoryStats(cwd?: string): Promise<MemoryStats>;
  recentMemory(cwd: string, limit?: number): Promise<MemoryHit[]>;
  installMemorySkill(): Promise<{ ok: boolean; path?: string; error?: string }>;
  recordHabit(input: HabitEvent): Promise<{ ok: boolean; error?: string }>;
  habitSummary(): Promise<HabitSummary>;
  checkUpdates(): Promise<UpdateCheckResult>;
  downloadUpdate(input: { url: string; name: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  getUpdateSettings(): Promise<{ autoCheck: boolean; autoDownload: boolean }>;
  saveUpdateSettings(input: { autoCheck: boolean; autoDownload: boolean }): Promise<{ autoCheck: boolean; autoDownload: boolean }>;
  updatePi(): Promise<{ ok: boolean; installed?: boolean; version?: string; output?: string; error?: string }>;
  getToolSettings(): Promise<{ ok: boolean; settings: ToolSettings }>;
  saveToolSettings(input: ToolSettings): Promise<{ ok: boolean; settings?: ToolSettings; error?: string }>;
  searchWeb(query: string): Promise<{ ok: boolean; results: SearchResult[]; error?: string }>;
  searchRepos(query: string): Promise<{ ok: boolean; results: RepoResult[]; error?: string }>;
  searchCode(query: string): Promise<{ ok: boolean; results: CodeResult[]; error?: string }>;
  fetchWebPage(url: string): Promise<{ ok: boolean; page?: PageContent; error?: string }>;
  crawlWeb(url: string): Promise<{ ok: boolean; pages: PageContent[]; links: string[]; error?: string }>;
  analyzePath(target: string): Promise<{ ok: boolean; lines?: string[]; error?: string }>;
  pickAnalyzePath(): Promise<{ ok: boolean; path?: string }>;
  pickMedia(): Promise<{ ok: boolean; item?: VisualMedia; items?: VisualMedia[]; error?: string }>;
  openMediaExternally(filePath: string): Promise<{ ok: boolean; error?: string }>;
  openPath(target: string): Promise<{ ok: boolean; error?: string }>;
  openUserData(): Promise<{ ok: boolean; error?: string }>;
  locate(): Promise<{ ok: boolean; install?: { agentDir?: string }; error?: string }>;
  openExternal(url: string): Promise<{ ok: boolean }>;
  writeClipboard(text: string): Promise<void>;
  onAgentEvent(callback: (event: AgentEvent) => void): () => void;
}

export interface PanelDeps {
  api: PanelApi;
  currentCwd(): string;
  toast(message: string, vars?: Record<string, string | number>): void;
  refreshCapabilities(): void;
  setRouterEnabled?(enabled: boolean): void;
  routerEnabled?(): boolean;
}

export interface PanelsController {
  refreshMarket(): void;
  refreshAutomation(): Promise<void>;
  refreshAgents(refresh?: boolean): Promise<void>;
  setProject(): void;
  activateWorkspace(id: string): void;
}

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(t('缺少元素 #{id}', { id }));
  return element as T;
};

function button(label: string, className = 'ghost'): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  return element;
}

function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const when = Date.parse(iso);
  if (!Number.isFinite(when)) return '—';
  const diff = when - Date.now();
  if (diff < 0) return t('已到期');
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} 小时`;
  return new Date(when).toLocaleString();
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${index === 0 || size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function scheduleLabel(schedule: AutomationJob['schedule']): string {
  if (schedule.kind === 'interval') return t('每 {minutes} 分钟', { minutes: schedule.minutes ?? 60 });
  if (schedule.kind === 'daily') return t('每天 {time}', { time: schedule.time ?? '09:00' });
  if (schedule.kind === 'weekly') return t('每周 {days} {time}', {
    days: (schedule.days ?? []).map((day) => t(['日', '一', '二', '三', '四', '五', '六'][day] ?? '')).join('、'),
    time: schedule.time ?? '09:00',
  });
  return `cron ${schedule.cron ?? ''}`;
}

function actionLabel(action: AutomationJob['action']): string {
  switch (action.type) {
    case 'pi-prompt': return t('Pi 提示词');
    case 'shell': return t('本机命令');
    case 'agent': return t('Agent：{id}', { id: action.agentId ?? '' });
    case 'open-url': return t('打开网页');
    case 'open-path': return t('打开路径');
    case 'notify': return t('系统通知');
    default: return action.type;
  }
}

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export function initPanels(deps: PanelDeps): PanelsController {
  const { api } = deps;

  // ---------- 会议室 ----------
  const meetingRoom = $('meeting-room');
  const meetingRoomEmpty = $('meeting-room-empty');
  const roomApps = new Map<string, string>();
  const roomAgents = new Map<string, string>();

  function renderRoom(): void {
    meetingRoom.querySelectorAll('.room-chip').forEach((chip) => chip.remove());
    meetingRoomEmpty.hidden = roomApps.size + roomAgents.size > 0;
    const addChip = (type: 'app' | 'agent', id: string, name: string): void => {
      const chip = document.createElement('span');
      chip.className = `room-chip ${type}`;
      chip.dataset.memberId = id;
      const label = document.createElement('span');
      label.textContent = name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'room-chip-remove';
      remove.title = t('移出会议室');
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        if (type === 'app') roomApps.delete(id);
        else {
          roomAgents.delete(id);
          selectedAgents.delete(id);
          renderAgents();
        }
        renderRoom();
      });
      chip.append(label, remove);
      meetingRoom.append(chip);
    };
    for (const [id, name] of roomApps) addChip('app', id, name);
    for (const [id, name] of roomAgents) addChip('agent', id, name);
  }

  function joinRoom(type: 'app' | 'agent', id: string, name: string): void {
    if (type === 'app') roomApps.set(id, name);
    else {
      roomAgents.set(id, name);
      selectedAgents.add(id);
      renderAgents();
    }
    renderRoom();
  }

  function roomDropData(event: DragEvent): { type?: 'app' | 'agent'; id?: string; name?: string } {
    const raw = event.dataTransfer?.getData('application/x-pi-room') || event.dataTransfer?.getData('text/plain') || '';
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as { type?: string; id?: string; name?: string };
      if ((parsed.type === 'app' || parsed.type === 'agent') && parsed.id && parsed.name) {
        return { type: parsed.type, id: parsed.id, name: parsed.name };
      }
    } catch {
      return {};
    }
    return {};
  }

  meetingRoom.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    meetingRoom.classList.add('active');
  });
  meetingRoom.addEventListener('dragleave', () => meetingRoom.classList.remove('active'));
  meetingRoom.addEventListener('drop', (event) => {
    event.preventDefault();
    meetingRoom.classList.remove('active');
    const item = roomDropData(event);
    if (item.type && item.id && item.name) joinRoom(item.type, item.id, item.name);
  });
  $('clear-room').addEventListener('click', () => {
    roomApps.clear();
    for (const id of roomAgents.keys()) selectedAgents.delete(id);
    roomAgents.clear();
    renderAgents();
    renderRoom();
  });

  // ---------- 工作区标签 ----------
  const workspaceTabs = [...document.querySelectorAll<HTMLButtonElement>('.workspace-tabs [role=tab]')];
  function activateWorkspace(id: string): void {
    for (const tab of workspaceTabs) {
      const selected = tab.id === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const pane = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (pane) pane.hidden = !selected;
    }
    if (id === 'tab-ws-visual' || id === 'tab-ws-edit' || id === 'tab-ws-review') void refreshVisual();
    if (id === 'tab-ws-cost') void loadUsage();
  }
  workspaceTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateWorkspace(tab.id));
    tab.addEventListener('keydown', (event) => {
      let next: HTMLButtonElement | undefined;
      if (event.key === 'ArrowRight') next = workspaceTabs[(index + 1) % workspaceTabs.length];
      if (event.key === 'ArrowLeft') next = workspaceTabs[(index + workspaceTabs.length - 1) % workspaceTabs.length];
      if (next) {
        event.preventDefault();
        activateWorkspace(next.id);
        next.focus();
      }
    });
  });

  // ---------- 可视化 ----------
  const visualStage = $('visual-stage');
  const visualApps = $('visual-apps');
  const visualCount = $('visual-app-count');
  const visualScanTime = $('visual-scan-time');
  const visualFilters = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.visual-filters [data-visual-filter]'),
  );
  let visualFilter: 'all' | 'installed' | 'missing' = 'all';
  let visualScannedAt = '';
  const visualSearch = $<HTMLInputElement>('visual-app-search');
  const visualOpenFile = $<HTMLButtonElement>('visual-open-file');
  const customAppDrawer = $<HTMLDetailsElement>('custom-app-drawer');
  const customAppName = $<HTMLInputElement>('custom-app-name');
  const customAppKind = $<HTMLSelectElement>('custom-app-kind');
  const customAppPath = $<HTMLInputElement>('custom-app-path');
  const customAppHint = $<HTMLInputElement>('custom-app-hint');
  const customLinks = $('custom-links');
  const customLinkDrawer = $<HTMLDetailsElement>('custom-link-drawer');
  const customLinkName = $<HTMLInputElement>('custom-link-name');
  const customLinkUrl = $<HTMLInputElement>('custom-link-url');
  const editApps = $('edit-apps');
  const editAppSearch = $<HTMLInputElement>('edit-app-search');
  const editAppCount = $('edit-app-count');
  const reviewApps = $('review-apps');
  const reviewAppSearch = $<HTMLInputElement>('review-app-search');
  const reviewAppCount = $('review-app-count');
  let visualItem: VisualMedia | null = null;
  let visualAppsCache: LocalAppInfo[] = [];
  let customLinkCache: CustomLink[] = [];
  const collapsedAppGroups = new Set<string>();
  const collapsedEditGroups = new Set<string>();
  const collapsedReviewGroups = new Set<string>();

  const APP_KIND_LABEL: Record<LocalAppInfo['kind'], string> = {
    video: '视频',
    '3d': '建模',
    design: '设计',
    audio: '音频',
    engine: '引擎',
    dev: '开发',
    office: '办公',
    browser: '浏览器',
    system: '系统',
  };
  const APP_KIND_ORDER: Array<LocalAppInfo['kind']> = [
    'video', 'audio', 'design', '3d', 'engine', 'dev', 'office', 'browser', 'system',
  ];

  function renderVisualItem(): void {
    visualStage.replaceChildren();
    visualOpenFile.disabled = !visualItem;
    if (!visualItem) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('选择图片或视频，在这里预览；软件工程文件用对应创作软件打开。');
      visualStage.append(note);
      return;
    }
    if (visualItem.kind === 'image') {
      const image = document.createElement('img');
      image.src = visualItem.url;
      image.alt = visualItem.name;
      image.loading = 'lazy';
      visualStage.append(image);
    } else if (visualItem.kind === 'video') {
      const video = document.createElement('video');
      video.src = visualItem.url;
      video.controls = true;
      video.preload = 'metadata';
      visualStage.append(video);
    }
    const caption = document.createElement('p');
    caption.className = 'note';
    caption.textContent = visualItem.name;
    visualStage.append(caption);
  }

  function appCard(app: LocalAppInfo): HTMLElement {
    const card = document.createElement('div');
    card.className = app.installed ? 'app-card' : 'app-card missing';
    card.draggable = true;
    card.title = t('拖到「协作 → 会议室」加入协作，或双击加入');
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-pi-room', JSON.stringify({ type: 'app', id: app.id, name: app.name }));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    card.addEventListener('dblclick', () => joinRoom('app', app.id, app.name));
    const title = document.createElement('span');
    title.className = 'app-name';
    title.textContent = app.name;
    if (app.custom) {
      const tag = document.createElement('span');
      tag.className = 'app-tag';
      tag.textContent = t('自定义');
      title.append(tag);
    } else if (app.discovered) {
      // 开始菜单扫描得到的软件，标注来源便于和内置目录区分
      const tag = document.createElement('span');
      tag.className = 'app-tag';
      tag.textContent = t('扫描');
      title.append(tag);
    }
    const meta = document.createElement('span');
    meta.className = 'app-meta';
    if (app.installed) {
      meta.textContent = t('已安装');
    } else if (app.installId) {
      meta.textContent = t('未安装 · 可一键安装');
    } else {
      meta.textContent = t('未检测到');
    }
    meta.title = app.path || app.hint;
    const actions = document.createElement('span');
    actions.className = 'app-actions';
    if (app.installed) {
      const launch = button(t('启动'), 'ghost small');
      launch.title = app.path || app.hint;
      launch.addEventListener('click', async () => {
        const opened = await api.openApp(app.id, deps.currentCwd() || undefined);
        if (!opened.ok) deps.toast(opened.error || t('启动失败'));
      });
      actions.append(launch);
    } else if (app.installId) {
      // 内置目录的应用：未安装时走 winget 安装，必须由用户确认后执行
      const install = button(t('一键安装'), 'ghost small');
      install.title = app.hint;
      install.addEventListener('click', () => void installApp(app));
      actions.append(install);
    }
    if (app.discovered && !app.custom) {
      // 扫描结果只是临时视图，收藏后写入自定义软件列表长期保留
      const save = button(t('收藏'), 'ghost small');
      save.title = t('加入自定义软件列表');
      save.addEventListener('click', async () => {
        if (!app.path) {
          deps.toast(t('该软件没有可用的启动路径'));
          return;
        }
        const result = await api.saveApp({ name: app.name, kind: app.kind, path: app.path, hint: app.hint });
        if (!result.ok) {
          deps.toast(result.error || t('保存失败'));
          return;
        }
        deps.toast(t('已收藏：{name}', { name: app.name }));
        await refreshVisual(true);
      });
      actions.append(save);
    }
    if (app.custom) {
      const remove = button(t('删除'), 'ghost small danger');
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('从自定义列表移除 {name}？', { name: app.name }))) return;
        const result = await api.removeApp(app.id);
        if (!result.ok) {
          deps.toast(result.error || t('删除失败'));
          return;
        }
        await refreshVisual(true);
      });
      actions.append(remove);
    }
    card.append(title, meta, actions);
    return card;
  }

  // 按分类渲染软件卡片：可视化、编辑、审查三个面板共用同一份扫描缓存
  function renderAppGroups(
    container: HTMLElement,
    cache: LocalAppInfo[],
    query: string,
    collapsed: Set<string>,
    extraFilter?: (app: LocalAppInfo) => boolean,
  ): void {
    const keyword = query.trim().toLowerCase();
    const matches = cache.filter((app) => {
      if (extraFilter && !extraFilter(app)) return false;
      if (!keyword) return true;
      const label = APP_KIND_LABEL[app.kind] || app.kind;
      return `${app.name} ${label} ${app.kind} ${app.hint} ${app.path ?? ''}`.toLowerCase().includes(keyword);
    });
    container.replaceChildren();
    if (!cache.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('正在检测本机软件…');
      container.append(note);
      return;
    }
    if (!matches.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('没有匹配的软件');
      container.append(note);
      return;
    }
    for (const kind of APP_KIND_ORDER) {
      const items = matches.filter((app) => app.kind === kind);
      if (!items.length) continue;
      items.sort((left, right) => Number(right.installed) - Number(left.installed) || left.name.localeCompare(right.name));
      const installed = items.filter((app) => app.installed).length;
      const group = document.createElement('details');
      group.className = 'app-group';
      group.open = !collapsed.has(kind);
      group.addEventListener('toggle', () => {
        if (group.open) collapsed.delete(kind);
        else collapsed.add(kind);
      });
      const head = document.createElement('summary');
      head.className = 'app-group-head';
      const label = document.createElement('span');
      label.textContent = t(APP_KIND_LABEL[kind]);
      const count = document.createElement('span');
      count.className = 'cap-count';
      count.textContent = `${installed}/${items.length}`;
      head.append(label, count);
      const grid = document.createElement('div');
      grid.className = 'app-grid';
      grid.append(...items.map(appCard));
      group.append(head, grid);
      container.append(group);
    }
  }

  function renderVisualApps(): void {
    renderAppGroups(
      visualApps,
      visualAppsCache,
      visualSearch.value,
      collapsedAppGroups,
      (app) => visualFilter === 'all' || (visualFilter === 'installed' ? app.installed : !app.installed),
    );
  }

  function renderEditApps(): void {
    renderAppGroups(editApps, visualAppsCache, editAppSearch.value, collapsedEditGroups);
  }

  function renderReviewApps(): void {
    renderAppGroups(reviewApps, visualAppsCache, reviewAppSearch.value, collapsedReviewGroups);
  }

  // 三个面板同步渲染，避免切换页签时看到过期的安装状态
  function renderAppViews(): void {
    const installed = visualAppsCache.filter((app) => app.installed).length;
    const summary = `${installed}/${visualAppsCache.length}`;
    visualCount.textContent = summary;
    visualScanTime.textContent = visualScannedAt
      ? t('检测于 {time}', { time: visualScannedAt })
      : '';
    editAppCount.textContent = summary;
    reviewAppCount.textContent = summary;
    renderVisualApps();
    renderEditApps();
    renderReviewApps();
  }

  async function refreshVisual(refresh = false): Promise<void> {
    const result = await api.listApps(refresh);
    if (!result.ok) {
      deps.toast(result.error || t('检测本机软件失败'));
      return;
    }
    visualAppsCache = result.apps;
    visualScannedAt = new Date().toLocaleTimeString();
    renderAppViews();
  }

  // 一键安装内置应用：固定 winget 包 ID，先让用户确认再执行
  async function installApp(app: LocalAppInfo): Promise<void> {
    if (!app.installId) return;
    const confirmed = window.confirm(
      t('将通过 winget 安装 {name}，可能需要几分钟，是否继续？', { name: app.name }),
    );
    if (!confirmed) return;
    deps.toast(t('正在安装 {name}…', { name: app.name }));
    const result = await api.installApp(app.id);
    if (!result.ok) {
      deps.toast(result.error || t('安装失败'));
      return;
    }
    deps.toast(t('{name} 安装完成', { name: app.name }));
    await refreshVisual(true);
  }

  // 扫描开始菜单全部软件，与内置目录按路径去重合并
  async function scanAllApps(trigger: HTMLButtonElement): Promise<void> {
    trigger.disabled = true;
    const original = trigger.textContent;
    trigger.textContent = t('正在扫描…');
    try {
      const result = await api.scanApps(true);
      if (!result.ok) {
        deps.toast(result.error || t('扫描本机软件失败'));
        return;
      }
      const known = new Set(
        visualAppsCache.filter((app) => app.path).map((app) => app.path!.toLowerCase()),
      );
      const added = result.apps.filter((app) => !app.path || !known.has(app.path.toLowerCase()));
      visualAppsCache = [...visualAppsCache, ...added];
      visualScannedAt = new Date().toLocaleTimeString();
      renderAppViews();
      deps.toast(t('扫描完成，新增 {n} 个软件', { n: added.length }));
    } finally {
      trigger.disabled = false;
      trigger.textContent = original;
    }
  }

  // 渲染用户自定义网站快捷入口
  function renderCustomLinks(): void {
    customLinks.replaceChildren();
    if (!customLinkCache.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('还没有自定义网站，可添加常用站点的地址。');
      customLinks.append(note);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'link-grid';
    for (const link of customLinkCache) {
      const card = document.createElement('div');
      card.className = 'link-card';
      const name = document.createElement('span');
      name.className = 'link-name';
      name.textContent = link.name;
      name.title = link.url;
      const actions = document.createElement('span');
      actions.className = 'app-actions';
      const open = button(t('打开'), 'ghost small');
      open.addEventListener('click', () => void api.openExternal(link.url));
      const remove = button(t('删除'), 'ghost small danger');
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('删除网站 {name}？', { name: link.name }))) return;
        const result = await api.removeLink(link.id);
        if (!result.ok) {
          deps.toast(result.error || t('删除失败'));
          return;
        }
        await loadCustomLinks();
      });
      actions.append(open, remove);
      card.append(name, actions);
      grid.append(card);
    }
    customLinks.append(grid);
  }

  async function loadCustomLinks(): Promise<void> {
    const result = await api.listLinks();
    if (!result.ok) return;
    customLinkCache = result.links;
    renderCustomLinks();
  }

  function resetCustomAppForm(): void {
    customAppName.value = '';
    customAppKind.value = 'dev';
    customAppPath.value = '';
    customAppHint.value = '';
  }

  // 自定义软件表单位于可视化页，编辑/审查页的入口直接切过去
  function openCustomAppForm(): void {
    activateWorkspace('tab-ws-visual');
    resetCustomAppForm();
    customAppDrawer.open = true;
    customAppDrawer.scrollIntoView({ block: 'nearest' });
    customAppName.focus();
  }

  $('visual-refresh').addEventListener('click', () => void refreshVisual(true));
  $('visual-scan-all').addEventListener('click', () => void scanAllApps($<HTMLButtonElement>('visual-scan-all')));
  $('edit-scan-all').addEventListener('click', () => void scanAllApps($<HTMLButtonElement>('edit-scan-all')));
  $('review-scan-all').addEventListener('click', () => void scanAllApps($<HTMLButtonElement>('review-scan-all')));
  visualSearch.addEventListener('input', () => renderVisualApps());
  for (const tab of visualFilters) {
    tab.addEventListener('click', () => {
      visualFilter = (tab.dataset.visualFilter as 'all' | 'installed' | 'missing') || 'all';
      for (const item of visualFilters) item.classList.toggle('active', item === tab);
      renderVisualApps();
    });
  }
  editAppSearch.addEventListener('input', () => renderEditApps());
  reviewAppSearch.addEventListener('input', () => renderReviewApps());
  $('edit-add-app').addEventListener('click', openCustomAppForm);
  $('review-add-app').addEventListener('click', openCustomAppForm);
  $('visual-add-app').addEventListener('click', openCustomAppForm);
  $('custom-app-pick').addEventListener('click', async () => {
    const result = await api.pickAppExe();
    if (!result.ok || !result.path) return;
    customAppPath.value = result.path;
    if (!customAppName.value.trim()) {
      customAppName.value = result.path.split(/[\\/]/).pop()?.replace(/\.exe$/i, '') ?? '';
    }
  });
  $('custom-app-cancel').addEventListener('click', () => {
    resetCustomAppForm();
    customAppDrawer.open = false;
  });
  $('custom-app-save').addEventListener('click', async () => {
    const name = customAppName.value.trim();
    const exePath = customAppPath.value.trim();
    if (!name || !exePath) {
      deps.toast(t('请填写名称并选择可执行文件'));
      return;
    }
    const result = await api.saveApp({
      name,
      kind: customAppKind.value,
      path: exePath,
      hint: customAppHint.value.trim(),
    });
    if (!result.ok) {
      deps.toast(result.error || t('保存失败'));
      return;
    }
    deps.toast(t('已添加自定义软件：{name}', { name }));
    resetCustomAppForm();
    customAppDrawer.open = false;
    await refreshVisual(true);
  });
  $('custom-link-cancel').addEventListener('click', () => {
    customLinkName.value = '';
    customLinkUrl.value = '';
    customLinkDrawer.open = false;
  });
  $('custom-link-save').addEventListener('click', async () => {
    const name = customLinkName.value.trim();
    const url = customLinkUrl.value.trim();
    if (!name || !url) {
      deps.toast(t('请填写网站名称和网址'));
      return;
    }
    const result = await api.saveLink({ name, url });
    if (!result.ok) {
      deps.toast(result.error || t('保存失败'));
      return;
    }
    customLinkName.value = '';
    customLinkUrl.value = '';
    customLinkDrawer.open = false;
    deps.toast(t('已添加网站：{name}', { name }));
    await loadCustomLinks();
  });
  $('visual-pick').addEventListener('click', async () => {
    const result = await api.pickMedia();
    if (!result.ok) {
      if (result.error) deps.toast(result.error);
      return;
    }
    const items = result.items ?? (result.item ? [result.item] : []);
    visualItem = items.find((item) => item.kind === 'image' || item.kind === 'video') ?? items[0] ?? null;
    renderVisualItem();
  });
  visualOpenFile.addEventListener('click', async () => {
    if (!visualItem) return;
    const result = await api.openMediaExternally(visualItem.path);
    if (!result.ok) deps.toast(result.error || t('打开失败'));
  });

  // ---------- 省 Token ----------
  const usageCards = $('usage-cards');
  const usageTips = $('usage-tips');
  const usageTipsCount = $('usage-tips-count');
  const usageSessions = $('usage-sessions');
  const usageSessionCount = $('usage-session-count');
  const usageStatus = $('usage-status');
  let usageLoading = false;

  // 推荐合并到 Pi settings.json 的压缩参数；只复制，不自动改配置
  const TOKEN_CONFIG_SNIPPET = `{
  "compaction": {
    "reserveTokens": 32768,
    "keepRecentTokens": 12000
  }
}`;

  function formatTokens(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toLocaleString();
  }

  function formatCost(value: number): string {
    return `$${value.toFixed(value >= 1 ? 2 : 4)}`;
  }

  function formatRate(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  function usageCard(label: string, value: string, sub: string, meter?: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'usage-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const name = document.createElement('span');
    name.textContent = label;
    const detail = document.createElement('span');
    detail.className = 'usage-sub';
    detail.textContent = sub;
    card.append(name, strong, detail);
    if (meter !== undefined) {
      const bar = document.createElement('div');
      bar.className = `usage-meter${meter < 0.3 ? ' warn' : ''}`;
      const fill = document.createElement('i');
      fill.style.width = `${Math.max(2, Math.min(100, Math.round(meter * 100)))}%`;
      bar.append(fill);
      bar.title = t('缓存命中率 {rate}', { rate: formatRate(meter) });
      card.append(bar);
    }
    return card;
  }

  // 规则全部基于本机用量，不调用模型，也不会产生费用
  function usageTipsFor(report: UsageReport): Array<{ kind: 'ok' | 'warn' | 'info'; text: string }> {
    const latest = report.sessions[0];
    if (!latest || report.totals.requests === 0) {
      return [{ kind: 'info', text: t('还没有带用量记录的会话；启动 Pi 并对话后即可统计。') }];
    }
    const tips: Array<{ kind: 'ok' | 'warn' | 'info'; text: string }> = [];
    if (report.cacheHitRate < 0.3) {
      tips.push({
        kind: 'warn',
        text: t('缓存命中率 {rate}，偏低。同一会话内尽量别切换模型或推理度，并保持连续对话。', {
          rate: formatRate(report.cacheHitRate),
        }),
      });
    } else if (report.cacheHitRate >= 0.5) {
      tips.push({
        kind: 'ok',
        text: t('缓存命中率 {rate}，当前用法有效。', { rate: formatRate(report.cacheHitRate) }),
      });
    }
    const outputShare = report.totals.output / Math.max(1, report.totals.totalTokens);
    if (outputShare > 0.3) {
      tips.push({
        kind: 'warn',
        text: t('输出占总用量 {rate}，偏高。可要求简短回答，或把推理度调低到中档。', {
          rate: formatRate(outputShare),
        }),
      });
    }
    if (report.totals.totalTokens > 200_000) {
      tips.push({
        kind: 'warn',
        text: t('最近会话累计 {tokens} token。接近上下文上限时新开会话，只附结论摘要和最近文件。', {
          tokens: formatTokens(report.totals.totalTokens),
        }),
      });
    }
    if (latest.models.length > 1) {
      tips.push({
        kind: 'warn',
        text: t('最近会话用过 {n} 个模型；切换模型会让 prompt cache 失效，下一轮按全价计费。', {
          n: latest.models.length,
        }),
      });
    }
    if (report.totals.cost > 0) {
      tips.push({
        kind: 'info',
        text: t('检索、总结、批量命名可交给低价模型，难题再升级到旗舰模型。'),
      });
    }
    tips.push({
      kind: 'info',
      text: t('先在市场按大分类筛选 Skills / MCP，只把当前项目需要的能力装进来。'),
    });
    return tips;
  }

  function renderUsage(report: UsageReport): void {
    const latest = report.sessions[0];
    usageCards.replaceChildren(
      usageCard(
        t('最近会话'),
        formatTokens(latest?.totals.totalTokens ?? 0),
        latest
          ? t('缓存命中 {rate} · {models} 个模型', {
            rate: formatRate(latest.cacheHitRate),
            models: latest.models.length,
          })
          : t('还没有会话记录'),
      ),
      usageCard(
        t('最近 {n} 个会话', { n: report.sessions.length }),
        formatTokens(report.totals.totalTokens),
        t('请求 {n} 次 · 缓存命中 {rate}', {
          n: report.totals.requests,
          rate: formatRate(report.cacheHitRate),
        }),
        report.cacheHitRate,
      ),
      usageCard(
        t('输入 / 输出'),
        `${formatTokens(report.totals.input)} / ${formatTokens(report.totals.output)}`,
        t('缓存读取 {read} · 缓存写入 {write}', {
          read: formatTokens(report.totals.cacheRead),
          write: formatTokens(report.totals.cacheWrite),
        }),
      ),
      usageCard(
        t('估算费用'),
        formatCost(report.totals.cost),
        t('按会话记录中的模型单价汇总'),
      ),
    );

    const tips = usageTipsFor(report);
    usageTips.replaceChildren();
    usageTipsCount.textContent = String(tips.length);
    for (const tip of tips) {
      const item = document.createElement('p');
      item.className = `usage-tip ${tip.kind}`;
      item.textContent = tip.text;
      usageTips.append(item);
    }

    usageSessions.replaceChildren();
    usageSessionCount.textContent = String(report.sessions.length);
    if (!report.sessions.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('当前项目还没有 Pi 会话。');
      usageSessions.append(note);
      return;
    }
    for (const session of report.sessions.slice(0, 10)) {
      const row = document.createElement('div');
      row.className = 'usage-session';
      const name = document.createElement('span');
      name.className = 'usage-session-id';
      const when = new Date(session.updatedAt || session.startedAt).toLocaleString();
      name.textContent = `${when} · ${session.id.slice(0, 8)}`;
      name.title = session.path;
      const value = document.createElement('span');
      value.className = 'usage-session-value';
      const models = session.models.slice(0, 3).map((item) => `${item.provider}/${item.model}`);
      value.textContent = t('{tokens} token · 命中 {rate} · {cost}', {
        tokens: formatTokens(session.totals.totalTokens),
        rate: formatRate(session.cacheHitRate),
        cost: formatCost(session.totals.cost),
      });
      value.title = models.length ? models.join('\n') : t('未记录模型');
      row.append(name, value);
      usageSessions.append(row);
    }
  }

  async function loadUsage(): Promise<void> {
    const cwd = deps.currentCwd();
    if (!cwd) {
      usageStatus.textContent = t('先选择项目目录，再统计会话用量。');
      usageCards.replaceChildren();
      usageTips.replaceChildren();
      usageSessions.replaceChildren();
      return;
    }
    if (usageLoading) return;
    usageLoading = true;
    usageStatus.textContent = t('正在统计本机会话用量…');
    try {
      const result = await api.usageReport(cwd);
      if (!result.ok) {
        usageStatus.textContent = t('统计失败：{error}', { error: result.error });
        return;
      }
      usageStatus.textContent = t('已统计 {n} 个会话（{time}）；只读本地文件，不上传。', {
        n: result.sessions.length,
        time: new Date(result.generatedAt).toLocaleTimeString(),
      });
      renderUsage(result);
    } catch (error) {
      usageStatus.textContent = t('统计失败：{error}', { error: String(error) });
    } finally {
      usageLoading = false;
    }
  }

  $('usage-refresh').addEventListener('click', () => void loadUsage());
  $('usage-copy-config').addEventListener('click', async () => {
    await api.writeClipboard(TOKEN_CONFIG_SNIPPET);
    deps.toast(t('已复制压缩配置；合并到 Pi settings.json 前请先备份。'));
  });
  $('usage-apply-savings').addEventListener('click', async () => {
    if (!window.confirm(t('将把压缩、缓存预热与缓存未命中提示合并写入全局 Pi settings.json（自动备份）。确认继续？'))) return;
    const result = await api.applyTokenSavings();
    if (!result.ok) {
      deps.toast(t('写入失败：{error}', { error: result.error ?? '' }));
      return;
    }
    const applied = result.applied ?? {};
    const compaction = (applied.compaction ?? {}) as Record<string, unknown>;
    usageStatus.textContent = t('已全局生效：压缩保留最近 {recent} token，缓存预热 {warming}；配置 {path}；备份 {backup}', {
      recent: String(compaction.keepRecentTokens ?? ''),
      warming: String(applied.cacheWarming ?? ''),
      path: result.path ?? '',
      backup: result.backup || t('无（原文件不存在）'),
    });
    deps.toast(t('省 Token 配置已全局生效；新 Pi 会话自动使用。'));
  });
  // 停留在本面板时定时刷新，离开后自动停止，不产生额外常驻开销
  window.setInterval(() => {
    const pane = document.getElementById('pane-ws-cost');
    if (pane && !pane.hidden) void loadUsage();
  }, 30_000);

  // ---------- 本机工具 ----------
  for (const element of document.querySelectorAll<HTMLButtonElement>('[data-open-app]')) {
    element.addEventListener('click', async () => {
      const app = element.dataset.openApp ?? '';
      const result = await api.openApp(app, deps.currentCwd() || undefined);
      if (!result.ok) deps.toast(result.error || t('打开失败'));
    });
  }
  const wsPath = $<HTMLInputElement>('ws-path');
  const wsUrl = $<HTMLInputElement>('ws-url');
  $('ws-open-path').addEventListener('click', async () => {
    const value = wsPath.value.trim();
    if (!value) return;
    const cwd = deps.currentCwd();
    const target = /^[A-Za-z]:[\\/]|^\//.test(value) || !cwd ? value : `${cwd}/${value}`;
    const result = await api.openPath(target);
    if (!result.ok) deps.toast(result.error || t('打开失败'));
  });
  $('ws-open-url').addEventListener('click', async () => {
    const value = wsUrl.value.trim();
    if (!/^https?:\/\//i.test(value)) {
      deps.toast('只支持 http / https 链接');
      return;
    }
    await api.openExternal(value);
  });
  $('tool-open-url').addEventListener('click', async () => {
    const value = $<HTMLInputElement>('tool-url').value.trim();
    if (!/^https?:\/\//i.test(value)) {
      deps.toast('只支持 http / https 链接');
      return;
    }
    await api.openExternal(value);
  });
  $('tool-open-path').addEventListener('click', async () => {
    const value = $<HTMLInputElement>('tool-path').value.trim();
    if (!value) return;
    const result = await api.openPath(value);
    if (!result.ok) deps.toast(result.error || t('打开失败'));
  });
  $('open-pi-config').addEventListener('click', async () => {
    const result = await api.locate();
    const dir = result.ok ? result.install?.agentDir : '';
    if (!dir) {
      deps.toast(result.error || t('未找到 Pi 配置目录'));
      return;
    }
    const opened = await api.openPath(dir);
    if (!opened.ok) deps.toast(opened.error || t('打开失败'));
  });
  $('open-project-pi').addEventListener('click', async () => {
    const cwd = deps.currentCwd();
    if (!cwd) {
      deps.toast(t('先选择项目目录'));
      return;
    }
    const opened = await api.openPath(`${cwd}/.pi`);
    if (!opened.ok) deps.toast(opened.error || t('打开失败'));
  });
  $('open-user-data').addEventListener('click', async () => {
    const result = await api.openUserData();
    if (!result.ok) deps.toast(result.error || t('打开失败'));
  });

  // ---------- 市场 ----------
  const marketList = $('market-list');
  const marketStatus = $('market-status');
  const marketSearch = $<HTMLInputElement>('market-search');
  const marketScope = $<HTMLSelectElement>('market-scope');
  const marketChips = $('market-chips');
  const marketCustom = $('market-custom');
  const marketCustomInput = $<HTMLInputElement>('market-custom-input');
  const marketCustomAdd = $<HTMLButtonElement>('market-custom-add');
  let catalog: CatalogReport | null = null;
  let marketMode: 'all' | 'extensions' | 'skills' | 'mcps' = 'all';
  let onlineResults: RegistryMcp[] = [];
  let extensionResults: CatalogExtension[] = [];
  let activeTag = '';
  let onlineBusy = false;
  let extensionBusy = false;
  let catalogLoading = false;

  type MarketItem = CatalogExtension | CatalogSkill | CatalogMcp | RegistryMcp;

  function matches(query: string, text: string): boolean {
    return !query || text.toLowerCase().includes(query);
  }

  function extensionItems(): MarketItem[] {
    const builtins = catalog?.extensions ?? [];
    const byName = new Map(builtins.map((item) => [item.name.toLowerCase(), item]));
    for (const item of extensionResults) {
      if (!byName.has(item.name.toLowerCase())) byName.set(item.name.toLowerCase(), item);
    }
    return [...byName.values()];
  }

  function mcpItems(): MarketItem[] {
    const byName = new Map<string, CatalogMcp | RegistryMcp>();
    for (const item of catalog?.mcps ?? []) byName.set(item.name, item);
    for (const item of onlineResults) if (!byName.has(item.name)) byName.set(item.name, item);
    return [...byName.values()];
  }

  function marketItems(): MarketItem[] {
    if (marketMode === 'extensions') return extensionItems();
    if (marketMode === 'skills') return catalog?.skills ?? [];
    if (marketMode === 'mcps') return mcpItems();
    // 全部：三个板块合在一起，保证每个大分类都有足够的可选项
    return [...(catalog?.skills ?? []), ...mcpItems(), ...extensionItems()];
  }

  // 市场大分类：把细标签归并为固定的大类，先按大类收窄再搜索，减少翻找
  const MARKET_CATEGORIES: Array<{ label: string; words: string[] }> = [
    { label: '开发', words: ['开发', '代码', '编程', '调试', 'code', 'dev', 'debug', 'refactor'] },
    { label: '测试', words: ['测试', 'test', 'playwright', 'e2e'] },
    { label: '质量', words: ['质量', '审查', '评审', '审阅', 'review', 'lint', 'quality'] },
    { label: '安全', words: ['安全', 'security', 'audit'] },
    { label: '设计', words: ['设计', '前端', '界面', 'ui', 'design', 'frontend'] },
    { label: '架构', words: ['架构', '规划', '发布', 'architecture', 'plan', 'release'] },
    { label: '数据', words: ['数据', 'sql', 'data', 'database'] },
    { label: '文档', words: ['文档', '研究', 'documentation', 'docs', 'research'] },
    { label: '搜索', words: ['搜索', '检索', '联网', 'search', 'web', 'fetch'] },
    { label: '浏览器', words: ['浏览器', 'browser', 'chrome'] },
    { label: '系统', words: ['系统', '终端', '文件', 'system', 'terminal', 'shell', 'filesystem'] },
    { label: 'Git', words: ['git', 'github', 'gitlab'] },
    { label: '协作', words: ['协作', 'agent', '记忆', '推理', '交互', 'memory', 'thinking', 'team'] },
  ];
  const MARKET_ALL = '全部';
  const MARKET_OTHER = '其他';

  // 英文关键词按词边界匹配，避免 ui 命中 guide、dev 命中 device
  function includesWord(haystack: string, word: string): boolean {
    const lower = word.toLowerCase();
    if (/[一-鿿]/.test(lower)) return haystack.includes(lower);
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
  }

  function marketHaystack(item: CatalogExtension | CatalogSkill | CatalogMcp | RegistryMcp): string {
    const tags = 'tags' in item && Array.isArray(item.tags) ? item.tags.join(' ') : '';
    return `${item.title} ${item.name} ${item.description} ${tags}`.toLowerCase();
  }

  // 一项能力可能同时属于多个大类，保证按大类筛选时不遗漏
  function marketCategories(item: CatalogExtension | CatalogSkill | CatalogMcp | RegistryMcp): string[] {
    const haystack = marketHaystack(item);
    const categories = MARKET_CATEGORIES
      .filter((category) => category.words.some((word) => includesWord(haystack, word)))
      .map((category) => category.label);
    return categories.length ? categories : [MARKET_OTHER];
  }

  // 在线结果的英文标签给中文注释；内置条目的标题与说明本身已是中文
  const TAG_ZH: Record<string, string> = {
    browser: '浏览器', automation: '自动化', search: '搜索', web: '网页', fetch: '抓取',
    scraping: '抓取', git: '版本控制', github: 'GitHub', gitlab: 'GitLab', database: '数据库',
    sql: '数据库', postgres: 'PostgreSQL', sqlite: 'SQLite', filesystem: '文件系统',
    terminal: '终端', shell: '命令行', memory: '记忆', team: '团队协作', agent: '智能体',
    test: '测试', testing: '测试', e2e: '端到端', review: '审查', lint: '静态检查',
    security: '安全', audit: '审计', design: '设计', ui: '界面', frontend: '前端',
    docs: '文档', documentation: '文档', research: '调研', planning: '规划', release: '发布',
    docker: '容器', kubernetes: 'Kubernetes', cloud: '云服务', api: '接口', mcp: 'MCP',
    skill: '技能', extension: '扩展', plugin: '插件', productivity: '效率', notes: '笔记',
    notion: 'Notion', slack: 'Slack', figma: 'Figma', sentry: 'Sentry', puppeteer: '浏览器自动化',
    playwright: '浏览器自动化', screenshot: '截图', markdown: 'Markdown', pdf: 'PDF',
    media: '媒体', image: '图片', video: '视频', audio: '音频', monitor: '监控', log: '日志',
  };

  function translateTag(label: string): string {
    const key = label.toLowerCase().trim();
    return TAG_ZH[key] ?? label;
  }

  function hasChinese(text: string): boolean {
    return /[一-鿿]/.test(text);
  }

  function itemKind(item: MarketItem): 'extension' | 'skill' | 'mcp' {
    if ('builtin' in item) return 'extension';
    if ('body' in item) return 'skill';
    return 'mcp';
  }

  function primaryCategory(item: MarketItem): string {
    return marketCategories(item).find((label) => label !== MARKET_OTHER) ?? MARKET_OTHER;
  }

  function chineseNote(item: MarketItem): string {
    if (hasChinese(`${item.title} ${item.description}`)) return '';
    const tags = 'tags' in item ? item.tags.slice(0, 3).map(translateTag).join('、') : '';
    return t('中文分类：{category}{tags}', {
      category: t(primaryCategory(item)),
      tags: tags ? ` · 关键词：${tags}` : '',
    });
  }

  function renderChips(source: MarketItem[]): void {
    marketChips.replaceChildren();
    const counts = new Map<string, number>();
    for (const item of source) {
      for (const category of marketCategories(item)) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    const labels = [MARKET_ALL, ...MARKET_CATEGORIES.map((category) => category.label).filter((label) => counts.has(label))];
    if (counts.has(MARKET_OTHER)) labels.push(MARKET_OTHER);
    for (const label of labels) {
      const count = label === MARKET_ALL ? source.length : counts.get(label) ?? 0;
      const chip = button(`${t(label)} ${count}`, `chip ${activeTag === label || (label === MARKET_ALL && !activeTag) ? 'active' : ''}`);
      chip.title = label === MARKET_ALL ? t('显示全部分类') : t('按分类筛选：{category}', { category: t(label) });
      chip.addEventListener('click', () => {
        activeTag = label === MARKET_ALL ? '' : label;
        renderMarket();
      });
      marketChips.append(chip);
    }
  }

  function renderMarket(): void {
    const query = marketSearch.value.trim().toLowerCase();
    marketList.replaceChildren();
    if (extensionBusy || onlineBusy) {
      marketStatus.textContent = extensionBusy
        ? t('正在查询 npm 上的 Pi 扩展…')
        : t('正在查询官方 MCP Registry…');
      return;
    }
    const source = marketItems();
    renderChips(source);
    const filtered = source.filter((item) => {
      if (!matches(query, marketHaystack(item))) return false;
      return !activeTag || marketCategories(item).includes(activeTag);
    });
    if (!filtered.length) {
      marketStatus.textContent = catalog ? t('没有匹配的能力。') : t('读取能力目录…');
      return;
    }
    // 全部模式下按 技能 → MCP → 扩展 排列，分类数量一眼可见
    const ordered = marketMode === 'all'
      ? [...filtered].sort((left, right) => {
        const rank = { skill: 0, mcp: 1, extension: 2 } as const;
        return rank[itemKind(left)] - rank[itemKind(right)];
      })
      : filtered;
    for (const item of ordered) {
      const kind = itemKind(item);
      if (kind === 'extension') marketList.append(extensionCard(item as CatalogExtension));
      else if (kind === 'skill') marketList.append(skillCard(item as CatalogSkill));
      else marketList.append(mcpCard(item as CatalogMcp | RegistryMcp));
    }
    const builtinCount = (catalog?.skills ?? []).length + (catalog?.mcps ?? []).length + (catalog?.extensions ?? []).length;
    marketStatus.textContent = marketMode === 'all'
      ? t('内置 {builtin} 项 · 在线 {online} 项 · 当前 {count} 项（按大分类快速筛选，安装后自动归类）', {
        builtin: builtinCount,
        online: onlineResults.length + extensionResults.length,
        count: filtered.length,
      })
      : marketMode === 'extensions'
        ? t('内置 {builtin} 项，在线 {online} 项，当前显示 {count} 项', {
          builtin: (catalog?.extensions ?? []).length,
          online: extensionResults.length,
          count: filtered.length,
        })
        : t('共 {count} 项', { count: filtered.length });
  }

  function tagsRow(tagsList: string[], category?: string): HTMLElement {
    const tags = document.createElement('span');
    tags.className = 'market-meta';
    if (category) {
      const group = document.createElement('span');
      group.className = 'tag category-tag';
      group.textContent = t('分类：{category}', { category: t(category) });
      tags.append(group);
    }
    for (const label of tagsList.slice(0, 4)) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = translateTag(label);
      tags.append(tag);
    }
    return tags;
  }

  function extensionCard(ext: CatalogExtension): HTMLElement {
    const card = document.createElement('div');
    card.className = 'market-card';
    const title = document.createElement('strong');
    title.textContent = ext.title;
    const name = document.createElement('span');
    name.className = 'tag';
    name.textContent = ext.version ? `${ext.name}@${ext.version}` : ext.name;
    const desc = document.createElement('p');
    desc.textContent = ext.description;
    const note = chineseNote(ext);
    const actions = document.createElement('div');
    actions.className = 'market-actions';
    const badge = document.createElement('span');
    badge.className = `tag ${ext.builtin ? 'free' : 'online'}`;
    badge.textContent = ext.builtin ? t('内置') : t('在线');
    const install = button(t('下载并安装'), 'primary');
    install.addEventListener('click', async () => {
      if (!window.confirm(t('将执行 pi install npm:{name}，把扩展写入 Pi 用户配置。确认继续？', { name: ext.name }))) return;
      install.disabled = true;
      install.textContent = t('安装中…');
      const result = await api.installExtension({
        name: ext.name,
        category: primaryCategory(ext),
        tags: ext.tags,
        source: ext.source || 'npm',
      });
      if (result.ok) {
        deps.toast(t('已安装：{name}', { name: ext.name }));
        deps.refreshCapabilities();
      } else {
        deps.toast(t('安装失败：{error}', { error: result.error ?? result.output.slice(-300) }));
        install.disabled = false;
        install.textContent = t('下载并安装');
      }
    });
    actions.append(badge, install);
    card.append(title, name, desc);
    if (note) {
      const zh = document.createElement('p');
      zh.className = 'note';
      zh.textContent = note;
      card.append(zh);
    }
    card.append(tagsRow(ext.tags, primaryCategory(ext)), actions);
    return card;
  }

  function skillCard(skill: CatalogSkill): HTMLElement {
    const card = document.createElement('div');
    card.className = 'market-card';
    const title = document.createElement('strong');
    title.textContent = skill.title;
    const name = document.createElement('span');
    name.className = 'tag';
    name.textContent = skill.name;
    const desc = document.createElement('p');
    desc.textContent = skill.description;
    const actions = document.createElement('div');
    actions.className = 'market-actions';
    const category = primaryCategory(skill);
    const install = button(t('安装 Skill'), 'primary');
    install.addEventListener('click', async () => {
      install.disabled = true;
      const scope = marketScope.value === 'user' ? 'user' : 'project';
      if (scope === 'project' && !deps.currentCwd()) {
        deps.toast(t('先选择项目目录'));
        install.disabled = false;
        return;
      }
      const result = await api.addSkill({
        scope,
        cwd: scope === 'project' ? deps.currentCwd() : undefined,
        name: skill.name,
        description: skill.description,
        body: skill.body,
        category,
        tags: skill.tags,
        source: 'builtin',
      });
      deps.toast(result.ok ? t('已安装：{name}', { name: skill.name }) : t('安装失败：{error}', { error: result.error ?? '' }));
      if (result.ok) deps.refreshCapabilities();
      else install.disabled = false;
    });
    actions.append(install);
    card.append(title, name, desc);
    const note = chineseNote(skill);
    if (note) {
      const zh = document.createElement('p');
      zh.className = 'note';
      zh.textContent = note;
      card.append(zh);
    }
    card.append(tagsRow(skill.tags, category), actions);
    return card;
  }

  function mcpCard(mcp: CatalogMcp | RegistryMcp): HTMLElement {
    const card = document.createElement('div');
    card.className = 'market-card';
    const title = document.createElement('strong');
    title.textContent = mcp.title;
    const desc = document.createElement('p');
    desc.textContent = mcp.description;
    const command = document.createElement('p');
    command.textContent = `${mcp.command} ${mcp.args.join(' ')}`;
    const risky = /desktop-commander|windows-mcp/i.test(mcp.id);
    const actions = document.createElement('div');
    actions.className = 'market-actions';
    const category = primaryCategory(mcp);
    const install = button(t('安装 MCP'), 'primary');
    install.addEventListener('click', async () => {
      if (risky && !window.confirm(t('该 MCP 可以控制系统或读取任意文件，安装后由 Pi 按授权调用。确认继续？'))) return;
      const scope = marketScope.value === 'user' ? 'user' : 'project';
      if (scope === 'project' && !deps.currentCwd()) {
        deps.toast(t('先选择项目目录'));
        return;
      }
      const envHint = 'envHint' in mcp ? mcp.envHint : undefined;
      install.disabled = true;
      const result = await api.addMcp({
        scope,
        cwd: scope === 'project' ? deps.currentCwd() : undefined,
        name: mcp.name.replace(/^registry:/, '').replace(/[^\w.-]/g, '-').slice(0, 60),
        command: mcp.command,
        argsText: mcp.args.join('\n'),
        envText: envHint ? `${envHint}\${${envHint.replace(/=$/, '')}}` : undefined,
        category,
        tags: 'tags' in mcp ? mcp.tags : [],
        source: 'source' in mcp ? mcp.source : 'registry',
      });
      deps.toast(result.ok ? t('已安装：{name}', { name: mcp.title }) : t('安装失败：{error}', { error: result.error ?? '' }));
      if (result.ok) deps.refreshCapabilities();
      else install.disabled = false;
    });
    actions.append(install);
    card.append(title, desc, command);
    const note = chineseNote(mcp);
    if (note) {
      const zh = document.createElement('p');
      zh.className = 'note';
      zh.textContent = note;
      card.append(zh);
    }
    if ('tags' in mcp && mcp.tags.length) card.append(tagsRow(mcp.tags, category));
    if ('needsConfig' in mcp && mcp.needsConfig) {
      const hint = document.createElement('p');
      hint.textContent = t('需要环境变量：{hint}（安装后写入占位符，请在系统中设置真实值）', { hint: mcp.envHint ?? '' });
      card.append(hint);
    }
    card.append(actions);
    return card;
  }

  async function loadExtensions(query = ''): Promise<void> {
    extensionBusy = true;
    renderMarket();
    try {
      const result = await api.searchExtensions(query);
      extensionResults = result.ok ? result.results : [];
      if (!result.ok) deps.toast(t('查询失败：{error}', { error: result.error ?? '' }));
    } catch (error) {
      extensionResults = [];
      deps.toast(String(error));
    } finally {
      extensionBusy = false;
      renderMarket();
    }
  }

  async function loadCatalog(): Promise<void> {
    if (catalogLoading) return;
    catalogLoading = true;
    marketStatus.textContent = t('读取能力目录…');
    try {
      const result = await api.catalog();
      if (result.ok && result.catalog) catalog = result.catalog;
      else marketStatus.textContent = t('目录读取失败：{error}', { error: result.error ?? '' });
    } catch (error) {
      marketStatus.textContent = String(error);
    } finally {
      catalogLoading = false;
      renderMarket();
      if (!extensionResults.length && !extensionBusy) void loadExtensions();
      void renderPacks();
    }
  }

  async function searchOnline(): Promise<void> {
    const query = marketSearch.value.trim();
    if (!query) {
      onlineResults = [];
      renderMarket();
      return;
    }
    onlineBusy = true;
    renderMarket();
    try {
      const result = await api.searchMcpRegistry(query);
      onlineResults = result.ok ? result.results : [];
      if (!result.ok) deps.toast(t('查询失败：{error}', { error: result.error ?? '' }));
    } catch (error) {
      onlineResults = [];
      deps.toast(String(error));
    } finally {
      onlineBusy = false;
      renderMarket();
    }
  }

  function updateCustomRow(): void {
    marketCustom.hidden = marketMode === 'mcps';
    if (marketMode === 'extensions') {
      marketCustomInput.placeholder = t('输入 npm 包名，例如 pi-web-access');
      marketCustomAdd.textContent = t('下载并安装');
    } else if (marketMode === 'skills') {
      marketCustomInput.placeholder = t('粘贴 GitHub 文件/仓库链接，或任意 https SKILL.md 地址');
      marketCustomAdd.textContent = t('导入技能');
    } else {
      marketCustomInput.placeholder = t('粘贴 npm 包名或 GitHub / https 技能链接，自动识别');
      marketCustomAdd.textContent = t('自动导入');
    }
    marketCustomInput.value = '';
  }

  async function customAdd(): Promise<void> {
    const value = marketCustomInput.value.trim();
    if (!value) {
      deps.toast(marketMode === 'extensions' ? t('输入 npm 包名') : t('粘贴 SKILL.md 链接'));
      return;
    }
    const isSkillLink = /^https:\/\//i.test(value)
      || (marketMode === 'skills' && !/^https:\/\//i.test(value));
    if (!isSkillLink) {
      if (!window.confirm(t('将执行 pi install npm:{name}，把扩展写入 Pi 用户配置。确认继续？', { name: value }))) return;
      marketCustomAdd.disabled = true;
      const result = await api.installExtension({ name: value, source: 'npm', category: MARKET_OTHER });
      marketCustomAdd.disabled = false;
      if (!result.ok) {
        deps.toast(t('安装失败：{error}', { error: result.error ?? result.output.slice(-300) }));
        return;
      }
      deps.toast(t('已安装：{name}', { name: value }));
      deps.refreshCapabilities();
      return;
    }
    const scope = marketScope.value === 'user' ? 'user' : 'project';
    if (scope === 'project' && !deps.currentCwd()) {
      deps.toast(t('先选择项目目录'));
      return;
    }
    marketCustomAdd.disabled = true;
    const result = await api.importSkillUrl({
      url: value,
      scope,
      cwd: scope === 'project' ? deps.currentCwd() : undefined,
      category: MARKET_OTHER,
      tags: ['自定义导入'],
    });
    marketCustomAdd.disabled = false;
    if (!result.ok) {
      deps.toast(t('导入失败：{error}', { error: result.error ?? '' }));
      return;
    }
    deps.toast(t('已导入技能'));
    marketCustomInput.value = '';
    deps.refreshCapabilities();
  }

  marketSearch.addEventListener('input', () => {
    activeTag = '';
    renderMarket();
  });
  marketSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (marketMode === 'mcps') void searchOnline();
    else if (marketMode === 'extensions') void loadExtensions(marketSearch.value.trim());
    else if (marketMode === 'all') {
      void Promise.all([loadExtensions(marketSearch.value.trim()), searchOnline()]);
    }
  });
  marketCustomAdd.addEventListener('click', () => void customAdd());
  marketCustomInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void customAdd();
  });
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.market-tab')) {
    tab.addEventListener('click', () => {
      marketMode = (tab.dataset.market as typeof marketMode) ?? 'all';
      for (const other of document.querySelectorAll('.market-tab')) other.classList.toggle('active', other === tab);
      activeTag = '';
      onlineResults = [];
      updateCustomRow();
      renderMarket();
      if ((marketMode === 'extensions' || marketMode === 'all') && !extensionResults.length) void loadExtensions();
      if (marketMode === 'mcps') {
        marketStatus.textContent = t('输入关键词后回车，从官方 MCP Registry 搜索。');
      }
    });
  }
  $('refresh-market').addEventListener('click', () => {
    activeTag = '';
    if (marketMode === 'mcps') void searchOnline();
    else if (marketMode === 'extensions' || marketMode === 'all') {
      void Promise.all([loadCatalog(), loadExtensions(marketSearch.value.trim())]);
    } else void loadCatalog();
  });
  updateCustomRow();

  // ---------- 能力包 ----------
  const packsElement = $('capability-packs');
  const PACKS: Array<{ id: string; label: string; description: string; category: string; skills: string[] }> = [
    { id: 'dev', label: '开发 / 修 Bug', description: '审查、测试、安全与重构流程', category: '开发', skills: ['code-review', 'test-writer', 'security-review', 'refactor-plan'] },
    { id: 'research', label: '调研 / 查资料', description: '资料整理、数据核对与文档输出', category: '文档', skills: ['docs-writer', 'data-analysis', 'release-notes'] },
    { id: 'data', label: '数据 / 表格', description: '查询、清洗与可复现分析', category: '数据', skills: ['sql-analyst', 'data-analysis'] },
    { id: 'design', label: '设计 / 视觉', description: '界面评审与视觉交付检查', category: '设计', skills: ['ui-review', 'docs-writer'] },
    { id: 'video3d', label: '视频 / 3D', description: '分镜、素材、工具与交付清单', category: '设计', skills: ['creative-brief', 'docs-writer'] },
    { id: 'writing', label: '写作 / 文档', description: '文档、发布说明与结构整理', category: '文档', skills: ['docs-writer', 'release-notes'] },
  ];

  async function installedSkillNames(cwd: string): Promise<Set<string>> {
    try {
      const report = await api.inspectCapabilities(cwd);
      if (!report.ok || !report.report) return new Set();
      return new Set(report.report.capabilities.filter((item) => item.kind === 'skill' && item.scope === 'project').map((item) => item.name));
    } catch {
      return new Set();
    }
  }

  async function renderPacks(): Promise<void> {
    packsElement.replaceChildren();
    if (!catalog) return;
    const cwd = deps.currentCwd();
    const heading = document.createElement('div');
    heading.className = 'group-label';
    heading.textContent = t('能力包 · 按项目类型一键启用');
    packsElement.append(heading);
    if (!cwd) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('先选择项目目录，能力包会写入项目 .pi/skills。');
      packsElement.append(empty);
      return;
    }
    const installed = await installedSkillNames(cwd);
    const skillById = new Map((catalog.skills ?? []).map((item) => [item.name, item]));
    for (const pack of PACKS) {
      const available = pack.skills.filter((name) => skillById.has(name));
      if (!available.length) continue;
      const allOn = available.every((name) => installed.has(name));
      const row = document.createElement('label');
      row.className = 'pack-row';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = allOn;
      const main = document.createElement('span');
      main.className = 'item-main';
      const title = document.createElement('strong');
      title.textContent = pack.label;
      const desc = document.createElement('small');
      desc.textContent = `${pack.description} · ${available.join(' / ')}`;
      main.append(title, desc);
      const badge = document.createElement('span');
      badge.className = 'tag';
      badge.textContent = t('自动调用');
      toggle.addEventListener('change', async () => {
        toggle.disabled = true;
        if (toggle.checked) {
          const missing = available.filter((name) => !installed.has(name));
          const failures: string[] = [];
          for (const name of missing) {
            const skill = skillById.get(name)!;
            const result = await api.addSkill({
              scope: 'project',
              cwd,
              name: skill.name,
              description: skill.description,
              body: skill.body,
              category: pack.category,
              tags: [pack.category, pack.label],
              source: `pack:${pack.id}`,
            });
            if (!result.ok) failures.push(`${name}: ${result.error ?? ''}`);
          }
          if (failures.length) deps.toast(t('部分能力安装失败：{error}', { error: failures.join('；') }));
          else deps.toast(t('已启用能力包：{name}', { name: pack.label }));
        } else {
          if (!window.confirm(t('停用后将删除本工作台写入该项目的 Skill 文件：{names}。确认继续？', { names: available.join('、') }))) {
            toggle.checked = true;
            toggle.disabled = false;
            return;
          }
          const failures: string[] = [];
          for (const name of available.filter((item) => installed.has(item))) {
            const result = await api.removeSkill({ scope: 'project', cwd, name });
            if (!result.ok) failures.push(`${name}: ${result.error ?? ''}`);
          }
          if (failures.length) deps.toast(t('部分能力停用失败：{error}', { error: failures.join('；') }));
          else deps.toast(t('已停用能力包：{name}', { name: pack.label }));
        }
        toggle.disabled = false;
        deps.refreshCapabilities();
        await renderPacks();
      });
      row.append(toggle, main, badge);
      packsElement.append(row);
    }
  }

  const automationList = $('automation-list');
  const channelList = $('channel-list');
  const automationForm = $<HTMLFormElement>('automation-form');
  const channelForm = $<HTMLFormElement>('channel-form');
  const automationSummary = $('automation-summary');
  const automationDays = $('automation-days-row');
  const automationChannels = $('automation-channels');
  let jobs: AutomationJob[] = [];
  let channels: PublicChannel[] = [];
  let editingJob = '';
  let editingChannel = '';
  let automationLoaded = false;

  for (const day of WEEKDAYS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = String(day.value);
    input.dataset.day = String(day.value);
    const span = document.createElement('span');
    span.textContent = t(day.label);
    label.append(input, span);
    automationDays.append(label);
  }

  function selectedDays(): number[] {
    return [...automationDays.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => Number(input.value));
  }

  function actionRows(): void {
    const value = $<HTMLSelectElement>('automation-action').value;
    $('automation-prompt').hidden = value !== 'pi-prompt' && value !== 'agent';
    $('automation-command').hidden = value !== 'shell';
    $('automation-agent').hidden = value !== 'agent';
    $('automation-url').hidden = value !== 'open-url';
    $('automation-path').hidden = value !== 'open-path';
    $('automation-title').hidden = value !== 'notify';
    $('automation-body').hidden = value !== 'notify';
  }

  function scheduleRows(): void {
    const kind = $<HTMLSelectElement>('automation-kind').value;
    $('automation-interval-row').hidden = kind !== 'interval';
    $('automation-time-row').hidden = kind !== 'daily' && kind !== 'weekly';
    automationDays.hidden = kind !== 'weekly';
    $('automation-cron-row').hidden = kind !== 'cron';
  }

  $<HTMLSelectElement>('automation-kind').addEventListener('change', scheduleRows);
  $<HTMLSelectElement>('automation-action').addEventListener('change', actionRows);

  function resetAutomationForm(): void {
    editingJob = '';
    automationForm.reset();
    $<HTMLInputElement>('automation-interval').value = '60';
    $<HTMLInputElement>('automation-time').value = '09:00';
    $<HTMLSelectElement>('automation-kind').value = 'interval';
    $<HTMLSelectElement>('automation-action').value = 'pi-prompt';
    $<HTMLSelectElement>('automation-notify').value = 'failure';
    for (const input of automationDays.querySelectorAll<HTMLInputElement>('input')) input.checked = false;
    automationForm.hidden = true;
    $('delete-automation').hidden = true;
    scheduleRows();
    actionRows();
  }

  function renderAutomation(): void {
    automationList.replaceChildren();
    automationSummary.textContent = jobs.length
      ? t('共 {count} 个任务；应用退出后暂停。', { count: jobs.length })
      : t('还没有定时任务。');
    for (const job of jobs) {
      const item = document.createElement('div');
      item.className = 'item';
      const main = document.createElement('span');
      main.className = 'item-main';
      const name = document.createElement('strong');
      name.textContent = job.name;
      const meta = document.createElement('small');
      meta.textContent = `${scheduleLabel(job.schedule)} · ${actionLabel(job.action)} · ${job.enabled ? t('下次 {when}', { when: relativeTime(job.nextRunAt) }) : t('已暂停')}${job.lastStatus ? ` · ${job.lastStatus === 'ok' ? t('上次成功') : t('上次失败')}` : ''}`;
      main.append(name, meta);
      const actions = document.createElement('span');
      actions.className = 'item-actions';
      const toggle = button(job.enabled ? t('暂停') : t('启用'));
      toggle.addEventListener('click', async () => {
        await api.toggleAutomationJob(job.id, !job.enabled);
        await refreshAutomation(true);
      });
      const run = button(t('运行'));
      run.addEventListener('click', async () => {
        run.disabled = true;
        run.textContent = t('运行中…');
        const result = await api.runAutomationJob(job.id);
        deps.toast(result.ok ? t('任务完成：{message}', { message: result.message }) : t('任务失败：{message}', { message: result.message }));
        await refreshAutomation(true);
      });
      const edit = button(t('编辑'));
      edit.addEventListener('click', () => fillAutomationForm(job));
      const remove = button(t('删除'), 'ghost danger');
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('删除任务「{name}」？', { name: job.name }))) return;
        await api.deleteAutomationJob(job.id);
        await refreshAutomation(true);
      });
      actions.append(toggle, run, edit, remove);
      item.append(main, actions);
      if (job.lastMessage) item.title = job.lastMessage;
      automationList.append(item);
    }
    renderChannels();
  }

  function renderChannels(): void {
    channelList.replaceChildren();
    if (!channels.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('尚未配置消息通道。企业微信/飞书机器人只能单向推送。');
      channelList.append(empty);
      return;
    }
    for (const channel of channels) {
      const item = document.createElement('div');
      item.className = 'item';
      const main = document.createElement('span');
      main.className = 'item-main';
      const name = document.createElement('strong');
      name.textContent = `${channel.name} · ${channel.type}`;
      const meta = document.createElement('small');
      meta.textContent = channel.enabled ? t('已启用') : t('已停用');
      main.append(name, meta);
      const actions = document.createElement('span');
      actions.className = 'item-actions';
      const test = button(t('测试'));
      test.addEventListener('click', async () => {
        test.disabled = true;
        const result = await api.testAutomationChannel(channel.id);
        deps.toast(result.ok ? t('测试消息已发送') : t('发送失败：{error}', { error: result.message }));
        test.disabled = false;
      });
      const edit = button(t('编辑'));
      edit.addEventListener('click', () => fillChannelForm(channel));
      const remove = button(t('删除'), 'ghost danger');
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('删除通道「{name}」？', { name: channel.name }))) return;
        await api.deleteAutomationChannel(channel.id);
        await refreshAutomation(true);
      });
      actions.append(test, edit, remove);
      item.append(main, actions);
      channelList.append(item);
    }
  }

  function renderChannelPicker(selected: string[]): void {
    automationChannels.replaceChildren();
    if (!channels.length) return;
    for (const channel of channels) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = channel.id;
      input.checked = selected.includes(channel.id);
      input.dataset.channel = channel.id;
      const span = document.createElement('span');
      span.textContent = channel.name;
      label.append(input, span);
      automationChannels.append(label);
    }
  }

  function fillAutomationForm(job: AutomationJob): void {
    editingJob = job.id;
    automationForm.hidden = false;
    $<HTMLInputElement>('automation-name').value = job.name;
    $<HTMLSelectElement>('automation-kind').value = job.schedule.kind;
    $<HTMLInputElement>('automation-interval').value = String(job.schedule.minutes ?? 60);
    $<HTMLInputElement>('automation-time').value = job.schedule.time ?? '09:00';
    $<HTMLInputElement>('automation-cron').value = job.schedule.cron ?? '';
    for (const input of automationDays.querySelectorAll<HTMLInputElement>('input')) {
      input.checked = (job.schedule.days ?? []).includes(Number(input.value));
    }
    $<HTMLSelectElement>('automation-action').value = job.action.type;
    $<HTMLTextAreaElement>('automation-prompt').value = job.action.prompt ?? '';
    $<HTMLInputElement>('automation-command').value = job.action.type === 'shell' ? `${job.action.command ?? ''} ${job.action.argsText ?? ''}`.trim() : '';
    $<HTMLInputElement>('automation-agent').value = job.action.agentId ?? '';
    $<HTMLInputElement>('automation-url').value = job.action.url ?? '';
    $<HTMLInputElement>('automation-path').value = job.action.target ?? '';
    $<HTMLInputElement>('automation-title').value = job.action.title ?? '';
    $<HTMLInputElement>('automation-body').value = job.action.body ?? '';
    $<HTMLSelectElement>('automation-notify').value = job.notifyOn;
    renderChannelPicker(job.channelIds);
    $('delete-automation').hidden = false;
    scheduleRows();
    actionRows();
  }

  function fillChannelForm(channel: PublicChannel): void {
    editingChannel = channel.id;
    channelForm.hidden = false;
    $<HTMLSelectElement>('channel-type').value = channel.type;
    $<HTMLInputElement>('channel-name').value = channel.name;
    $<HTMLInputElement>('channel-url').value = channel.type === 'telegram' ? '' : channel.url;
    $<HTMLInputElement>('channel-token').value = '';
    $<HTMLInputElement>('channel-chat').value = channel.chatId ?? '';
    $('delete-channel').hidden = false;
  }

  async function refreshAutomation(force = false): Promise<void> {
    if (automationLoaded && !force) return;
    try {
      const result = await api.automationList();
      if (!result.ok) {
        deps.toast(t('读取自动化失败：{error}', { error: result.error ?? '' }));
        return;
      }
      jobs = result.jobs ?? [];
      channels = result.channels ?? [];
      automationLoaded = true;
      const agentIds = agentCache.filter((agent) => agent.runnable).map((agent) => agent.id);
      const datalist = $<HTMLDataListElement>('agent-options');
      datalist.replaceChildren();
      for (const id of agentIds) {
        const option = document.createElement('option');
        option.value = id;
        datalist.append(option);
      }
      renderAutomation();
    } catch (error) {
      deps.toast(String(error));
    }
  }

  $('new-automation').addEventListener('click', () => {
    resetAutomationForm();
    renderChannelPicker([]);
    automationForm.hidden = false;
  });
  $('cancel-automation').addEventListener('click', resetAutomationForm);
  $('new-channel').addEventListener('click', () => {
    editingChannel = '';
    channelForm.reset();
    channelForm.hidden = false;
    $('delete-channel').hidden = true;
  });
  $('cancel-channel').addEventListener('click', () => {
    editingChannel = '';
    channelForm.hidden = true;
  });
  $('delete-automation').addEventListener('click', async () => {
    if (!editingJob) return;
    if (!window.confirm(t('删除这个任务？'))) return;
    await api.deleteAutomationJob(editingJob);
    resetAutomationForm();
    await refreshAutomation(true);
  });
  $('delete-channel').addEventListener('click', async () => {
    if (!editingChannel) return;
    if (!window.confirm(t('删除这个通道？'))) return;
    await api.deleteAutomationChannel(editingChannel);
    channelForm.hidden = true;
    editingChannel = '';
    await refreshAutomation(true);
  });
  $('test-channel').addEventListener('click', async () => {
    if (!editingChannel) {
      deps.toast(t('先保存通道再测试'));
      return;
    }
    const result = await api.testAutomationChannel(editingChannel);
    deps.toast(result.ok ? t('测试消息已发送') : t('发送失败：{error}', { error: result.message }));
  });

  automationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = $<HTMLSelectElement>('automation-kind').value;
    const actionType = $<HTMLSelectElement>('automation-action').value;
    const schedule = kind === 'interval'
      ? { kind, minutes: Number($<HTMLInputElement>('automation-interval').value) }
      : kind === 'cron'
        ? { kind, cron: $<HTMLInputElement>('automation-cron').value.trim() }
        : kind === 'weekly'
          ? { kind, time: $<HTMLInputElement>('automation-time').value, days: selectedDays() }
          : { kind, time: $<HTMLInputElement>('automation-time').value };
    const commandLine = $<HTMLInputElement>('automation-command').value.trim();
    const [command, ...rest] = commandLine.split(/\s+/);
    const action = actionType === 'pi-prompt'
      ? { type: actionType, prompt: $<HTMLTextAreaElement>('automation-prompt').value }
      : actionType === 'shell'
        ? { type: actionType, command: command ?? '', argsText: rest.join(' ') }
        : actionType === 'agent'
          ? { type: actionType, agentId: $<HTMLInputElement>('automation-agent').value.trim(), prompt: $<HTMLTextAreaElement>('automation-prompt').value }
          : actionType === 'open-url'
            ? { type: actionType, url: $<HTMLInputElement>('automation-url').value.trim() }
            : actionType === 'open-path'
              ? { type: actionType, target: $<HTMLInputElement>('automation-path').value.trim() }
              : {
                type: 'notify',
                title: $<HTMLInputElement>('automation-title').value.trim(),
                body: $<HTMLInputElement>('automation-body').value.trim(),
              };
    const channelIds = [...automationChannels.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value);
    const result = await api.saveAutomationJob({
      name: $<HTMLInputElement>('automation-name').value.trim(),
      enabled: true,
      schedule,
      action,
      cwd: deps.currentCwd() || undefined,
      channelIds,
      notifyOn: $<HTMLSelectElement>('automation-notify').value,
    }, editingJob || undefined);
    if (!result.ok) {
      deps.toast(t('保存失败：{error}', { error: result.error ?? '' }));
      return;
    }
    deps.toast(t('任务已保存'));
    resetAutomationForm();
    await refreshAutomation(true);
  });

  channelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const type = $<HTMLSelectElement>('channel-type').value;
    const result = await api.saveAutomationChannel({
      name: $<HTMLInputElement>('channel-name').value.trim(),
      type,
      url: $<HTMLInputElement>('channel-url').value.trim(),
      token: $<HTMLInputElement>('channel-token').value.trim() || undefined,
      chatId: $<HTMLInputElement>('channel-chat').value.trim() || undefined,
      enabled: true,
    }, editingChannel || undefined);
    if (!result.ok) {
      deps.toast(t('保存失败：{error}', { error: result.error ?? '' }));
      return;
    }
    deps.toast(t('通道已保存'));
    channelForm.hidden = true;
    editingChannel = '';
    await refreshAutomation(true);
  });
  $('refresh-automation').addEventListener('click', () => void refreshAutomation(true));

  // ---------- 多 Agent 协作 ----------
  const agentList = $('agent-list');
  const teamAgents = $('team-agents');
  const teamStatus = $('team-status');
  const teamLog = $('team-log-live');
  const teamVisual = $('team-visual');
  const teamVisualState = $('team-visual-state');
  const teamSupervisorNode = $('team-supervisor-node');
  const teamWorkerNodes = $('team-worker-nodes');
  const teamFlow = $('team-flow');
  const teamPlan = $('team-plan');
  const teamPlanText = $<HTMLPreElement>('team-plan-text');
  const teamTask = $<HTMLTextAreaElement>('team-task');
  const teamEmpty = $('team-log-empty');
  const supervisorSelect = $<HTMLSelectElement>('team-supervisor');
  const supervisorMode = $<HTMLSelectElement>('team-supervisor-mode');
  const supervisorField = $('team-supervisor-field');
  let agentCache: AgentInfo[] = [];
  let selectedAgents = new Set<string>();
  let agentsLoaded = false;
  let teamRunning = false;
  let chartSupervisorId = '';
  let chartSupervisorDone = 0;
  let chartPlan = '';
  let chartPhase: 'idle' | 'plan' | 'dispatch' | 'execute' | 'summary' | 'done' | 'failed' = 'idle';

  function teamAgent(id: string): AgentInfo | undefined {
    return agentCache.find((agent) => agent.id === id);
  }

  function teamFlowStep(phase: typeof chartPhase): void {
    chartPhase = phase;
    const order = ['plan', 'dispatch', 'execute', 'summary'];
    const reached = order.indexOf(phase === 'done' || phase === 'failed' ? 'summary' : phase);
    teamFlow.querySelectorAll<HTMLLIElement>('li').forEach((item) => {
      const index = order.indexOf(item.dataset.teamStep ?? '');
      item.classList.toggle('done', phase === 'done' || index < reached);
      item.classList.toggle('active', phase === 'failed' ? index === reached : index === reached && phase !== 'done');
    });
    teamVisualState.textContent = phase === 'done'
      ? t('协作完成')
      : phase === 'failed'
        ? t('协作失败')
        : phase === 'idle'
          ? t('待开始')
          : t('进行中');
  }

  function teamNodeState(id: string, state: 'idle' | 'running' | 'done' | 'failed', label?: string): void {
    const node = id === chartSupervisorId
      ? teamSupervisorNode
      : teamWorkerNodes.querySelector<HTMLElement>(`[data-agent-id="${CSS.escape(id)}"]`);
    if (!node) return;
    node.classList.remove('running', 'done', 'failed');
    if (state !== 'idle') node.classList.add(state);
    const stateLabel = node.querySelector('.team-node-state');
    if (stateLabel) {
      stateLabel.textContent = label ?? (state === 'running'
        ? t('执行中…')
        : state === 'done'
          ? t('已完成')
          : state === 'failed'
            ? t('失败')
            : t('待开始'));
    }
  }

  function renderTeamChart(supervisorId: string, memberIds: string[]): void {
    chartSupervisorId = supervisorId;
    chartSupervisorDone = 0;
    chartPlan = '';
    teamVisual.hidden = false;
    teamPlan.hidden = true;
    teamPlanText.textContent = '';
    const supervisor = teamAgent(supervisorId);
    const name = teamSupervisorNode.querySelector('strong');
    const duty = teamSupervisorNode.querySelector('.team-node-duty');
    if (name) name.textContent = supervisor?.name ?? t('自动选择');
    if (duty) duty.textContent = supervisor
      ? t('负责：规划、分工与汇总')
      : t('按任务与项目评分决定');
    teamSupervisorNode.classList.remove('running', 'done', 'failed');

    teamWorkerNodes.replaceChildren();
    const workers = memberIds.filter((id) => id !== supervisorId);
    if (!workers.length) {
      const empty = document.createElement('p');
      empty.className = 'note';
      empty.dataset.i18n = '暂无其他成员；主管将独立完成';
      empty.textContent = t('暂无其他成员；主管将独立完成');
      teamWorkerNodes.append(empty);
    }
    for (const id of workers) {
      const agent = teamAgent(id);
      const node = document.createElement('div');
      node.className = 'team-node';
      node.dataset.agentId = id;
      const role = document.createElement('span');
      role.className = 'team-node-role';
      role.textContent = t('成员');
      const strong = document.createElement('strong');
      strong.textContent = agent?.name ?? id;
      const dutyLine = document.createElement('span');
      dutyLine.className = 'team-node-duty';
      dutyLine.textContent = agent?.roles.length ? t('负责：{roles}', { roles: agent.roles.join(' / ') }) : t('按主管安排执行');
      const state = document.createElement('span');
      state.className = 'team-node-state';
      state.textContent = t('待开始');
      node.append(role, strong, dutyLine, state);
      teamWorkerNodes.append(node);
    }
    teamFlowStep('plan');
  }

  function applyChartPlan(plan: string): void {
    chartPlan = plan.trim();
    if (!chartPlan) return;
    teamPlan.hidden = false;
    teamPlanText.textContent = chartPlan;
    for (const node of teamWorkerNodes.querySelectorAll<HTMLElement>('[data-agent-id]')) {
      const agent = teamAgent(node.dataset.agentId ?? '');
      if (!agent) continue;
      const line = chartPlan.split(/\r?\n/).find((entry) => entry.includes(agent.name) || entry.includes(agent.id));
      if (!line) continue;
      const duty = node.querySelector('.team-node-duty');
      if (duty) duty.textContent = line.replace(/^[\s#*\-–—0-9.、)）]+/, '').slice(0, 110);
    }
  }

  const customPresets = [
    { id: 'claude', name: 'Claude Code', command: 'claude', roles: ['实现', '审查'], description: 'Claude Code CLI', args: ['-p', '{prompt}', '--output-format', 'text'] },
    { id: 'codex', name: 'Codex', command: 'codex', roles: ['实现', '调研'], description: 'OpenAI Codex CLI', args: ['exec', '--skip-git-repo-check', '{prompt}'] },
    { id: 'gemini', name: 'Gemini CLI', command: 'gemini', roles: ['调研', '实现'], description: 'Google Gemini CLI', args: ['-p', '{prompt}'] },
    { id: 'cursor', name: 'Cursor Agent', command: 'cursor-agent', roles: ['实现'], description: 'Cursor 命令行代理', args: ['-p', '{prompt}'] },
    { id: 'trae', name: 'TRAE CLI', command: 'traecli', roles: ['实现', '审查'], description: 'TRAE 命令行', args: ['run', '{prompt}'] },
    { id: 'workbuddy', name: 'WorkBuddy', command: 'workbuddy', roles: ['实现'], description: 'WorkBuddy CLI', args: ['chat', '{prompt}'] },
    { id: 'grok', name: 'Grok', command: 'grok', roles: ['调研', '实现'], description: 'Grok CLI', args: ['-p', '{prompt}'] },
    { id: 'crow5', name: 'Crow5', command: 'crow5-cli', roles: ['实现', '调研'], description: 'Crow5 自带 CLI', args: ['run', '{prompt}', '--format', 'json'] },
  ];

  function profileBlock(agent: AgentInfo): HTMLDetailsElement {
    const details = document.createElement('details');
    details.className = 'agent-profile';
    const summary = document.createElement('summary');
    summary.textContent = t('优点 / 缺点 / 擅长 / 弱点');
    details.append(summary);
    const rows: Array<[string, string[] | undefined]> = [
      [t('优点'), agent.strengths],
      [t('缺点'), agent.weaknesses],
      [t('擅长'), agent.specialties],
      [t('弱点'), agent.limitations],
    ];
    for (const [label, values] of rows) {
      const line = document.createElement('p');
      line.className = 'agent-profile-row';
      line.textContent = `${label}：${values?.length ? values.join('；') : t('未标注')}`;
      details.append(line);
    }
    const auth = document.createElement('p');
    auth.className = 'agent-profile-row';
    auth.textContent = `${t('凭据')}：${agent.authHint}`;
    details.append(auth);
    return details;
  }

  function renderAgents(): void {
    const previousSupervisor = supervisorSelect.value;
    agentList.replaceChildren();
    supervisorSelect.replaceChildren();
    teamAgents.replaceChildren();
    const autoOption = document.createElement('option');
    autoOption.value = '';
    autoOption.textContent = t('自动（按任务与项目最合适）');    supervisorSelect.append(autoOption);
    const installed = agentCache.filter((agent) => agent.installed);
    const runnableCount = agentCache.filter((agent) => agent.runnable).length;
    $('team-summary').textContent = t('检测到 {count} / {total} 个可用 Agent，其中 {runnable} 个可自动执行。', {
      count: installed.length,
      total: agentCache.length,
      runnable: runnableCount,
    });
    for (const agent of agentCache) {
      const item = document.createElement('div');
      item.className = 'item agent-item';
      const main = document.createElement('span');
      main.className = 'item-main';
      const name = document.createElement('strong');
      name.textContent = agent.name;
      const meta = document.createElement('small');
      meta.textContent = agent.runnable
        ? `${agent.version ?? t('已安装')} · ${agent.roles.join('/')}`
        : agent.installed
          ? `${t('桌面版')} · ${agent.roles.join('/')} · ${t('任务通过应用交接')}`
          : `${t('未安装')} · ${agent.custom ? t('自定义接入，请先安装该 CLI') : agent.installHint}`;
      main.append(name, meta, profileBlock(agent));
      const tags = document.createElement('span');
      tags.className = 'item-tags';
      const status = document.createElement('span');
      status.className = `tag ${agent.runnable ? 'ready' : agent.installed ? 'desktop' : 'missing'}`;
      status.textContent = agent.runnable ? t('可用') : agent.installed ? t('桌面版') : t('缺失');
      tags.append(status);
      if (agent.desktopInstalled) {
        const open = button(t('打开应用'), 'ghost small');
        open.title = agent.desktopPath ?? '';
        open.addEventListener('click', async () => {
          const result = await api.openAgentApp(agent.id, deps.currentCwd() || undefined);
          if (!result.ok) deps.toast(result.error || t('打开失败'));
        });
        tags.append(open);
      }
      if (agent.custom) {
        const badge = document.createElement('span');
        badge.className = 'tag';
        badge.textContent = t('自定义');
        tags.append(badge);
        const remove = button(t('删除'), 'ghost small');
        remove.addEventListener('click', async () => {
          const result = await api.removeCustomAgent(agent.id);
          if (!result.ok) {
            deps.toast(result.error || t('删除失败'));
            return;
          }
          deps.toast(t('已删除 {name}', { name: agent.name }));
          await refreshAgents(true);
        });
        tags.append(remove);
      }
      if (!agent.installed && agent.install && agent.install.kind !== 'manual') {
        const install = button(t('下载安装'), 'ghost small');
        install.addEventListener('click', async () => {
          install.disabled = true;
          install.textContent = t('安装中…');
          const result = await api.installAgent(agent.id);
          if (result.ok) {
            deps.toast(t('{name} 安装完成', { name: agent.name }));
            await refreshAgents(true);
            return;
          }
          install.disabled = false;
          install.textContent = t('下载安装');
          deps.toast(result.error || t('安装失败'));
        });
        tags.append(install);
      }
      if (!agent.installed && agent.install?.kind === 'manual' && agent.install.url) {
        const link = button(t('手动安装'), 'ghost small');
        link.addEventListener('click', () => void api.openExternal(agent.install!.url!));
        tags.append(link);
      }
      item.append(main, tags);
      if (agent.installed) {
        item.draggable = true;
        item.title = t('拖到会议室加入协作，或双击加入');
        item.addEventListener('dragstart', (event) => {
          event.dataTransfer?.setData('application/x-pi-room', JSON.stringify({ type: 'agent', id: agent.id, name: agent.name }));
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
        });
        item.addEventListener('dblclick', () => joinRoom('agent', agent.id, agent.name));
      }
      agentList.append(item);

      if (!agent.installed) continue;
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = agent.id;
      checkbox.checked = selectedAgents.has(agent.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedAgents.add(agent.id);
        else {
          selectedAgents.delete(agent.id);
          if (roomAgents.delete(agent.id)) renderRoom();
          if (supervisorSelect.value === agent.id) {
            supervisorSelect.value = '';
            $('team-suggest').textContent = t('主管将按任务与项目自动评分选择。');
          }
        }
      });
      const text = document.createElement('span');
      text.textContent = agent.name;
      const hint = document.createElement('small');
      const baseHint = agent.specialties?.slice(0, 2).join(' / ') || agent.roles.join('/');
      hint.textContent = agent.runnable ? baseHint : `${baseHint} · ${t('桌面交接')}`;
      label.append(checkbox, text, hint);
      label.title = `${t('优点')}：${agent.strengths?.join('；') || ''}\n${t('弱点')}：${agent.limitations?.join('；') || ''}`;
      teamAgents.append(label);

      if (!agent.runnable) continue;
      const option = document.createElement('option');
      option.value = agent.id;
      option.textContent = `${agent.name} · ${agent.specialties?.slice(0, 1).join('') || agent.roles.join('/')}`;
      supervisorSelect.append(option);
    }
    const keep = previousSupervisor
      ? [...supervisorSelect.options].some((option) => option.value === previousSupervisor)
      : false;
    supervisorSelect.value = keep ? previousSupervisor : '';
    supervisorField.hidden = supervisorMode.value !== 'manual';
    if (!teamAgents.children.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('没有检测到已安装的 Agent。安装后点「重新检测」。');
      teamAgents.append(empty);
    }
  }

  async function refreshAgents(refresh = false): Promise<void> {
    try {
      const result = await api.listAgents(refresh || !agentsLoaded);
      if (!result.ok || !result.agents) {
        deps.toast(t('检测 Agent 失败：{error}', { error: result.error ?? '' }));
        return;
      }
      agentCache = result.agents;
      agentsLoaded = true;
      let suggestion: { members: string[]; supervisorId: string } | null = null;
      if (!selectedAgents.size) {
        suggestion = await api.suggestTeam(teamTask.value.trim(), deps.currentCwd());
        selectedAgents = new Set(suggestion.members);
      } else {
        const available = new Set(agentCache.filter((agent) => agent.installed).map((agent) => agent.id));
        selectedAgents = new Set([...selectedAgents].filter((id) => available.has(id)));
      }
      const autoSupervisor = suggestion?.supervisorId;
      if (autoSupervisor) selectedAgents.add(autoSupervisor);
      renderAgents();
      const availableIds = new Set(agentCache.filter((agent) => agent.installed).map((agent) => agent.id));
      let roomChanged = false;
      for (const id of [...roomAgents.keys()]) {
        if (!availableIds.has(id)) {
          roomAgents.delete(id);
          roomChanged = true;
        }
      }
      if (roomChanged) renderRoom();
      if (autoSupervisor) supervisorSelect.value = autoSupervisor;
    } catch (error) {
      deps.toast(String(error));
    }
  }

  function logRow(event: AgentEvent): void {
    if (event.phase === 'chunk') return;
    teamEmpty.hidden = true;
    const row = document.createElement('div');
    row.className = `team-log-row ${event.phase}`;
    const who = document.createElement('span');
    who.className = 'who';
    const agent = agentCache.find((item) => item.id === event.agentId);
    who.textContent = `${agent?.name ?? event.agentId} `;
    const text = document.createElement('span');
    text.textContent = event.phase === 'done'
      ? t('完成（退出码 {code}）', { code: String(event.code ?? 0) })
      : event.phase === 'start'
        ? t('开始执行')
        : (event.text ?? '');
    row.append(who, text);
    teamLog.append(row);
    teamLog.scrollTop = teamLog.scrollHeight;

    if (!teamVisual.hidden) {
      if (event.phase === 'start') {
        if (event.agentId === chartSupervisorId) {
          if (chartSupervisorDone === 0) {
            teamNodeState(event.agentId, 'running', t('规划中…'));
            teamFlowStep('plan');
          } else {
            teamNodeState(event.agentId, 'running', t('汇总中…'));
            teamFlowStep('summary');
          }
        } else {
          teamNodeState(event.agentId, 'running');
          if (chartPhase === 'plan' || chartPhase === 'dispatch') teamFlowStep('execute');
        }
      } else if (event.phase === 'done') {
        const ok = event.code === 0 || event.code == null;
        teamNodeState(event.agentId, ok ? 'done' : 'failed');
        if (event.agentId === chartSupervisorId) {
          chartSupervisorDone += 1;
          if (chartSupervisorDone === 1 && chartPhase === 'plan') teamFlowStep('dispatch');
        }
      } else if (event.phase === 'error') {
        teamNodeState(event.agentId, 'failed');
      }
    }
  }

  api.onAgentEvent(logRow);
  $('clear-team-log').addEventListener('click', () => {
    teamLog.replaceChildren();
    teamEmpty.hidden = false;
  });
  $('refresh-agents').addEventListener('click', () => void refreshAgents(true));
  $('refresh-team').addEventListener('click', () => void refreshAgents(true));
  $('select-all-agents').addEventListener('click', () => {
    selectedAgents = new Set(agentCache.filter((agent) => agent.installed).map((agent) => agent.id));
    renderAgents();
  });
  $('clear-agents').addEventListener('click', () => {
    selectedAgents.clear();
    if (supervisorMode.value === 'auto') supervisorSelect.value = '';
    renderAgents();
  });
  supervisorMode.addEventListener('change', () => {
    supervisorField.hidden = supervisorMode.value !== 'manual';
    if (supervisorMode.value === 'auto') {
      supervisorSelect.value = '';
      $('team-suggest').textContent = t('主管将按任务与项目自动评分选择。');
    } else {
      $('team-suggest').textContent = t('请选择一个支持命令行的 Agent 任主管。');
    }
  });

  const presetSelect = $<HTMLSelectElement>('custom-agent-preset');
  for (const preset of customPresets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = `${preset.name} · ${preset.command}`;
    presetSelect.append(option);
  }
  presetSelect.addEventListener('change', () => {
    const preset = customPresets.find((item) => item.id === presetSelect.value);
    if (!preset) return;
    $<HTMLInputElement>('custom-agent-name').value = preset.name;
    $<HTMLInputElement>('custom-agent-command').value = preset.command;
    $<HTMLInputElement>('custom-agent-roles').value = preset.roles.join(', ');
    $<HTMLInputElement>('custom-agent-desc').value = preset.description;
    $<HTMLTextAreaElement>('custom-agent-args').value = preset.args.join('\n');
    deps.toast(t('已填入 {name} 的接入参数，可先点「选择程序」确认路径。', { name: preset.name }));
  });
  $('pick-agent-command').addEventListener('click', async () => {
    const result = await api.pickAgentCommand();
    if (result.ok && result.path) {
      $<HTMLInputElement>('custom-agent-command').value = result.path;
    }
  });

  $('save-custom-agent').addEventListener('click', async () => {
    const name = $<HTMLInputElement>('custom-agent-name').value.trim();
    const command = $<HTMLInputElement>('custom-agent-command').value.trim();
    const roles = $<HTMLInputElement>('custom-agent-roles').value.split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    const description = $<HTMLInputElement>('custom-agent-desc').value.trim();
    const args = $<HTMLTextAreaElement>('custom-agent-args').value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!name || !command) {
      deps.toast(t('填写名称与可执行命令'));
      return;
    }
    if (!args.some((arg) => arg.includes('{prompt}'))) {
      deps.toast(t('运行参数至少需要一处 {prompt} 占位'));
      return;
    }
    const result = await api.saveCustomAgent({ name, command, description, roles, args });
    if (!result.ok) {
      deps.toast(result.error || t('保存失败'));
      return;
    }
    deps.toast(t('已保存自定义 Agent：{name}', { name }));
    $<HTMLInputElement>('custom-agent-name').value = '';
    $<HTMLInputElement>('custom-agent-command').value = '';
    $<HTMLInputElement>('custom-agent-roles').value = '';
    $<HTMLInputElement>('custom-agent-desc').value = '';
    $<HTMLTextAreaElement>('custom-agent-args').value = '';
    await refreshAgents(true);
  });

  supervisorSelect.addEventListener('change', () => {
    const id = supervisorSelect.value;
    if (!id) {
      $('team-suggest').textContent = t('主管将按任务与项目自动评分选择。');
      return;
    }
    selectedAgents.add(id);
    renderAgents();
    supervisorSelect.value = id;
    const agent = agentCache.find((item) => item.id === id);
    $('team-suggest').textContent = t('已指定 {name} 任主管，运行时由它规划与汇总。', {
      name: agent?.name ?? id,
    });
  });

  $('auto-team').addEventListener('click', async () => {
    const task = teamTask.value.trim();
    const suggestion = await api.suggestTeam(task, deps.currentCwd());
    selectedAgents = new Set(suggestion.members);
    if (suggestion.supervisorId) selectedAgents.add(suggestion.supervisorId);
    renderAgents();
    if (suggestion.supervisorId) supervisorSelect.value = suggestion.supervisorId;
    $('team-suggest').textContent = suggestion.reason || t('未检测到已安装的 Agent');
    deps.toast(suggestion.members.length ? t('已按“{kind}”自动组队', { kind: suggestion.taskKind }) : t('没有可用 Agent'));
  });

  $('run-team').addEventListener('click', async () => {
    if (teamRunning) return;
    const task = teamTask.value.trim();
    if (!task) {
      deps.toast(t('填写协作任务'));
      return;
    }
    if (!selectedAgents.size) {
      const suggestion = await api.suggestTeam(task, deps.currentCwd());
      selectedAgents = new Set(suggestion.members);
      if (suggestion.supervisorId) selectedAgents.add(suggestion.supervisorId);
      renderAgents();
      if (suggestion.supervisorId) supervisorSelect.value = suggestion.supervisorId;
    }
    if (supervisorMode.value === 'manual' && !supervisorSelect.value) {
      deps.toast(t('请选择主管'));
      return;
    }
    if (supervisorSelect.value) selectedAgents.add(supervisorSelect.value);
    if (!selectedAgents.size) {
      deps.toast(t('至少选择一个 Agent'));
      return;
    }
    // 协作必须由主管统一规划和汇总，不提供无主管的并行模式。
    const mode: 'supervisor' = 'supervisor';
    const explicitSupervisor = supervisorMode.value === 'manual' ? supervisorSelect.value : '';
    teamRunning = true;
    const run = $<HTMLButtonElement>('run-team');
    run.disabled = true;
    teamStatus.textContent = t('协作进行中…');
    teamLog.replaceChildren();
    teamEmpty.hidden = true;
    const plannedSupervisor = explicitSupervisor || supervisorSelect.value;
    renderTeamChart(plannedSupervisor, [...selectedAgents]);
    activateWorkspace('tab-ws-collab');
    try {
      const result = await api.runTeam({
        task,
        agentIds: [...selectedAgents],
        mode,
        supervisorId: explicitSupervisor || undefined,
        cwd: deps.currentCwd() || undefined,
        apps: [...roomApps.values()],
        webSearch: $<HTMLInputElement>('team-web-search').checked,
      });
      if (!chartSupervisorId) {
        const resolved = result.supervisorId || result.summaries[0]?.agentId;
        if (resolved) {
          chartSupervisorId = resolved;
          const actual = teamAgent(resolved);
          const name = teamSupervisorNode.querySelector('strong');
          const duty = teamSupervisorNode.querySelector('.team-node-duty');
          if (name) name.textContent = actual?.name ?? resolved;
          if (duty) duty.textContent = t('负责：规划、分工与汇总');
          // 自动模式下主管在运行结束后才确定，需从成员区移除重复节点
          teamWorkerNodes.querySelector(`[data-agent-id="${CSS.escape(resolved)}"]`)?.remove();
          if (!teamWorkerNodes.querySelector('[data-agent-id]') && !teamWorkerNodes.querySelector('.note')) {
            const empty = document.createElement('p');
            empty.className = 'note';
            empty.dataset.i18n = '暂无其他成员；主管将独立完成';
            empty.textContent = t('暂无其他成员；主管将独立完成');
            teamWorkerNodes.append(empty);
          }
        }
      }
      const supervisorSummary = result.summaries.find((item) => item.agentId === chartSupervisorId);
      applyChartPlan(supervisorSummary?.text ?? '');
      for (const summary of result.summaries) {
        teamNodeState(summary.agentId, summary.ok ? 'done' : 'failed');
      }
      teamFlowStep(result.ok ? 'done' : 'failed');
      teamStatus.textContent = result.ok
        ? t('协作完成，共 {count} 份回报。', { count: result.summaries.length })
        : t('协作失败：{error}', { error: result.error ?? '' });
      for (const summary of result.summaries) {
        const row = document.createElement('div');
        row.className = 'team-log-row done';
        const who = document.createElement('span');
        who.className = 'who';
        who.textContent = `${summary.agentId} · `;
        const text = document.createElement('span');
        text.textContent = summary.text.slice(0, 2000);
        row.append(who, text);
        teamLog.append(row);
      }
      teamLog.scrollTop = teamLog.scrollHeight;
    } catch (error) {
      teamStatus.textContent = String(error);
      teamFlowStep('failed');
    } finally {
      teamRunning = false;
      run.disabled = false;
      teamTask.value = '';
    }
  });

  // ---------- 全网检索与高级工具 ----------
  const toolWebSearch = $<HTMLInputElement>('tool-web-search');
  const toolCrawl = $<HTMLInputElement>('tool-crawl');
  const toolReverse = $<HTMLInputElement>('tool-reverse');
  const searchProvider = $<HTMLSelectElement>('search-provider');
  const searxngUrl = $<HTMLInputElement>('searxng-url');
  const searchQuery = $<HTMLInputElement>('search-query');
  const searchResults = $('search-results');
  const searchStatus = $('search-status');
  const searchModeTabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.search-modes [data-search-mode]'),
  );
  let searchMode: 'web' | 'repos' | 'code' = 'web';
  const SEARCH_MODE_META: Record<'web' | 'repos' | 'code', { placeholder: string; hint: string }> = {
    web: { placeholder: '输入关键词，全网检索资料、项目设计思路', hint: '全网检索资料与项目设计思路' },
    repos: { placeholder: '输入关键词，检索 GitHub 开源项目', hint: 'GitHub 开源项目（Star 排序）' },
    code: { placeholder: '输入函数名、配置片段或报错信息，检索公开代码', hint: '公开代码检索（grep.app）' },
  };

  function setSearchMode(mode: 'web' | 'repos' | 'code'): void {
    searchMode = mode;
    for (const tab of searchModeTabs) {
      tab.classList.toggle('active', tab.dataset.searchMode === mode);
      tab.setAttribute('aria-selected', String(tab.dataset.searchMode === mode));
    }
    searchQuery.placeholder = t(SEARCH_MODE_META[mode].placeholder);
    searchResults.replaceChildren();
    searchStatus.textContent = t(SEARCH_MODE_META[mode].hint);
  }
  const crawlOutput = $('crawl-output');
  const analyzeOutput = $('analyze-output');

  function fillToolSettings(settings: ToolSettings): void {
    toolWebSearch.checked = settings.webSearch;
    toolCrawl.checked = settings.crawl;
    toolReverse.checked = settings.reverse;
    searchProvider.value = settings.searchProvider;
    searxngUrl.value = settings.searxngUrl;
    searxngUrl.disabled = settings.searchProvider !== 'searxng';
  }

  function currentToolSettings(): ToolSettings {
    return {
      webSearch: toolWebSearch.checked,
      crawl: toolCrawl.checked,
      reverse: toolReverse.checked,
      searchProvider: searchProvider.value === 'searxng' ? 'searxng' : 'duckduckgo',
      searxngUrl: searxngUrl.value.trim(),
    };
  }

  async function saveToolSettings(notify = true): Promise<void> {
    const result = await api.saveToolSettings(currentToolSettings());
    if (!result.ok) {
      deps.toast(result.error || t('保存失败'));
      return;
    }
    if (result.settings) fillToolSettings(result.settings);
    if (notify) deps.toast(t('高级工具设置已保存'));
  }

  async function loadToolSettings(): Promise<void> {
    try {
      const result = await api.getToolSettings();
      if (result.ok) fillToolSettings(result.settings);
    } catch (error) {
      deps.toast(String(error));
    }
  }

  function renderSearchResults(results: SearchResult[]): void {
    searchResults.replaceChildren();
    for (const item of results) {
      const row = document.createElement('div');
      row.className = 'item search-result';
      const main = document.createElement('span');
      main.className = 'item-main';
      const title = document.createElement('a');
      title.className = 'search-title';
      title.href = item.url;
      title.textContent = item.title;
      title.addEventListener('click', (event) => {
        event.preventDefault();
        void api.openExternal(item.url);
      });
      const url = document.createElement('small');
      url.className = 'search-url';
      url.textContent = item.url;
      const snippet = document.createElement('small');
      snippet.className = 'search-snippet';
      snippet.textContent = item.snippet;
      main.append(title, url, snippet);
      const actions = document.createElement('span');
      actions.className = 'item-tags';
      const crawl = button(t('抓取正文'), 'ghost small');
      crawl.addEventListener('click', () => {
        $<HTMLInputElement>('crawl-url').value = item.url;
        void runCrawl(false);
      });
      actions.append(crawl);
      row.append(main, actions);
      searchResults.append(row);
    }
  }

  async function runWebSearch(): Promise<void> {
    const query = searchQuery.value.trim();
    if (!query) {
      deps.toast(t('填写搜索内容'));
      return;
    }
    searchStatus.textContent = t('正在检索…');
    searchResults.replaceChildren();
    try {
      if (searchMode === 'repos') {
        const result = await api.searchRepos(query);
        if (!result.ok) {
          searchStatus.textContent = result.error || t('搜索失败');
          return;
        }
        renderRepoResults(result.results);
        searchStatus.textContent = t('找到 {count} 个 GitHub 项目（按 Star 排序）', { count: result.results.length });
        return;
      }
      if (searchMode === 'code') {
        const result = await api.searchCode(query);
        if (!result.ok) {
          searchStatus.textContent = result.error || t('搜索失败');
          return;
        }
        renderCodeResults(result.results);
        searchStatus.textContent = t('找到 {count} 段公开代码（来自 grep.app）', { count: result.results.length });
        return;
      }
      const result = await api.searchWeb(query);
      if (!result.ok) {
        searchStatus.textContent = result.error || t('搜索失败');
        return;
      }
      renderSearchResults(result.results);
      searchStatus.textContent = t('找到 {count} 条结果', { count: result.results.length });
    } catch (error) {
      searchStatus.textContent = String(error);
    }
  }

  function renderRepoResults(results: RepoResult[]): void {
    searchResults.replaceChildren();
    for (const item of results) {
      const row = document.createElement('div');
      row.className = 'item search-result repo-result';
      const main = document.createElement('span');
      main.className = 'item-main';
      const title = document.createElement('a');
      title.className = 'search-title';
      title.href = item.url;
      title.textContent = item.fullName || item.name;
      title.addEventListener('click', (event) => {
        event.preventDefault();
        void api.openExternal(item.url);
      });
      const meta = document.createElement('small');
      meta.className = 'search-url';
      meta.textContent = t('⭐ {stars} · {language} · 更新 {date} · {license}', {
        stars: item.stars.toLocaleString(),
        language: item.language || t('未知语言'),
        date: item.updatedAt.slice(0, 10),
        license: item.license || t('未声明许可证'),
      });
      const desc = document.createElement('small');
      desc.className = 'search-snippet';
      desc.textContent = item.description || t('没有项目说明');
      main.append(title, meta, desc);
      if (item.topics.length) {
        const topics = document.createElement('span');
        topics.className = 'market-meta';
        for (const topic of item.topics.slice(0, 5)) {
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = translateTag(topic);
          topics.append(tag);
        }
        main.append(topics);
      } else if (!hasChinese(item.description)) {
        const note = document.createElement('small');
        note.className = 'note';
        note.textContent = t('中文说明：GitHub 公开项目，可打开仓库查看 README 与示例代码。');
        main.append(note);
      }
      const actions = document.createElement('span');
      actions.className = 'item-tags';
      const clone = button(t('复制克隆命令'), 'ghost small');
      clone.addEventListener('click', async () => {
        await api.writeClipboard(`git clone ${item.url}.git`);
        deps.toast(t('已复制 git clone 命令'));
      });
      actions.append(clone);
      row.append(main, actions);
      searchResults.append(row);
    }
  }

  function renderCodeResults(results: CodeResult[]): void {
    searchResults.replaceChildren();
    for (const item of results) {
      const row = document.createElement('div');
      row.className = 'item search-result code-result';
      const main = document.createElement('span');
      main.className = 'item-main';
      const title = document.createElement('a');
      title.className = 'search-title';
      title.href = item.url;
      title.textContent = `${item.repo} · ${item.path}`;
      title.addEventListener('click', (event) => {
        event.preventDefault();
        void api.openExternal(item.url);
      });
      const snippet = document.createElement('pre');
      snippet.className = 'code-snippet';
      const lines = item.snippet.split(/\r?\n/).slice(0, 8).join('\n');
      snippet.textContent = lines;
      main.append(title, snippet);
      const actions = document.createElement('span');
      actions.className = 'item-tags';
      const copy = button(t('复制片段'), 'ghost small');
      copy.addEventListener('click', async () => {
        await api.writeClipboard(item.snippet);
        deps.toast(t('已复制代码片段'));
      });
      actions.append(copy);
      row.append(main, actions);
      searchResults.append(row);
    }
  }

  async function runCrawl(site: boolean): Promise<void> {
    const url = $<HTMLInputElement>('crawl-url').value.trim();
    if (!url) {
      deps.toast(t('填写网页地址'));
      return;
    }
    crawlOutput.textContent = t('正在抓取…');
    const result = site ? await api.crawlWeb(url) : await api.fetchWebPage(url);
    if (!result.ok) {
      crawlOutput.textContent = result.error || t('抓取失败');
      return;
    }
    const pages = site
      ? (result as { pages: PageContent[] }).pages
      : (result as { page?: PageContent }).page ? [(result as { page: PageContent }).page] : [];
    crawlOutput.textContent = pages
      .map((page) => `## ${page.title}\n${page.url}\n\n${page.text.slice(0, 6000)}`)
      .join('\n\n---\n\n') || t('没有抓到正文');
  }

  async function runAnalyze(): Promise<void> {
    const target = $<HTMLInputElement>('analyze-path').value.trim();
    if (!target) {
      deps.toast(t('填写文件或目录路径'));
      return;
    }
    analyzeOutput.textContent = t('正在分析…');
    const result = await api.analyzePath(target);
    analyzeOutput.textContent = result.ok ? (result.lines ?? []).join('\n') : (result.error || t('分析失败'));
  }

  $('run-web-search').addEventListener('click', () => void runWebSearch());
  searchQuery.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void runWebSearch();
  });
  for (const tab of searchModeTabs) {
    tab.addEventListener('click', () => {
      setSearchMode((tab.dataset.searchMode as 'web' | 'repos' | 'code') || 'web');
      searchQuery.focus();
    });
  }
  $('refresh-search').addEventListener('click', () => void loadToolSettings());
  $('save-tool-settings').addEventListener('click', () => void saveToolSettings());
  searchProvider.addEventListener('change', () => {
    searxngUrl.disabled = searchProvider.value !== 'searxng';
    void saveToolSettings(false);
  });
  toolWebSearch.addEventListener('change', () => void saveToolSettings(false));
  toolCrawl.addEventListener('change', () => void saveToolSettings(false));
  toolReverse.addEventListener('change', () => void saveToolSettings(false));
  $('crawl-page').addEventListener('click', () => void runCrawl(false));
  $('crawl-site').addEventListener('click', () => void runCrawl(true));
  $('run-analyze').addEventListener('click', () => void runAnalyze());
  $('pick-analyze-path').addEventListener('click', async () => {
    const result = await api.pickAnalyzePath();
    if (result.ok && result.path) $<HTMLInputElement>('analyze-path').value = result.path;
  });
  void loadToolSettings();

  // ---------- 项目中控台：权限 / 存档 / 长期记忆 / 更新 ----------
  const dock = $('project-dock');
  const dockToggle = $<HTMLButtonElement>('dock-toggle');
  const dockTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.dock-tab'));
  const dockPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-dock-panel]'));
  const permGrid = $('perm-grid');
  const permStatus = $('perm-status');
  const permAllow = $<HTMLInputElement>('perm-allow-paths');
  const permDeny = $<HTMLInputElement>('perm-deny-paths');
  const permWorkspaceOnly = $<HTMLInputElement>('perm-workspace-only');
  const permAutoApprove = $<HTMLInputElement>('perm-auto-approve');
  const archiveList = $('archive-list');
  const archiveStatus = $('archive-status');
  const archiveLabel = $<HTMLInputElement>('archive-label');
  const memoryStatsElement = $('memory-stats');
  const memoryQuery = $<HTMLInputElement>('memory-query');
  const memoryScope = $<HTMLSelectElement>('memory-scope');
  const memoryResults = $('memory-results');
  const memoryHabits = $('memory-habits');
  const updateStatus = $('update-status');
  const updateList = $('update-list');
  const updateDownload = $<HTMLButtonElement>('update-download');

  function setDockTab(tab: string): void {
    for (const item of dockTabs) item.setAttribute('aria-selected', String(item.dataset.dock === tab));
    for (const panel of dockPanels) panel.hidden = panel.dataset.dockPanel !== tab;
  }
  for (const tab of dockTabs) {
    tab.addEventListener('click', () => setDockTab(tab.dataset.dock || 'permissions'));
  }
  dockToggle.addEventListener('click', () => {
    const collapsed = dock.classList.toggle('collapsed');
    dockToggle.textContent = collapsed ? t('展开') : t('收起');
    dockToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  // 权限
  const permissionRules: PermissionRules = {
    fileRead: 'allow',
    fileWrite: 'ask',
    shell: 'ask',
    network: 'ask',
    gitWrite: 'ask',
    packageInstall: 'deny',
  };
  const permissionFields: Array<{ key: keyof PermissionRules; label: string }> = [
    { key: 'fileRead', label: '读取文件' },
    { key: 'fileWrite', label: '写入文件' },
    { key: 'shell', label: '执行命令' },
    { key: 'network', label: '网络访问' },
    { key: 'gitWrite', label: 'Git 写操作' },
    { key: 'packageInstall', label: '安装依赖' },
  ];
  const permPresets = $('perm-presets');
  const permPresetNote = $('perm-preset-note');
  const permGuardState = $('perm-guard-state');

  interface PermissionPreset {
    id: string;
    label: string;
    short: string;
    hint: string;
    rules?: PermissionRules;
    workspaceOnly?: boolean;
  }
  const permissionPresets: PermissionPreset[] = [
    {
      id: 'readonly',
      label: '只读',
      short: '读取放行，禁止写入与安装',
      hint: '只读：允许读取与检索；写入、Git 写、安装依赖禁止；命令与网络询问。适合先摸清代码。',
      rules: { fileRead: 'allow', fileWrite: 'deny', shell: 'ask', network: 'ask', gitWrite: 'deny', packageInstall: 'deny' },
    },
    {
      id: 'standard',
      label: '标准',
      short: '写入与命令逐次询问',
      hint: '标准：读取放行；写入、命令、网络、Git 写逐次询问；安装依赖禁止。日常推荐。',
      rules: { fileRead: 'allow', fileWrite: 'ask', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' },
    },
    {
      id: 'auto-edit',
      label: '自动编辑',
      short: '直接改文件，命令仍询问',
      hint: '自动编辑：允许直接改文件；命令、网络、Git 写仍询问；安装依赖禁止。类似自动接受编辑。',
      rules: { fileRead: 'allow', fileWrite: 'allow', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' },
    },
    {
      id: 'full-auto',
      label: '完全自动',
      short: '项目内全自动，不打扰',
      hint: '完全自动：全部放行，但自动写入限制在项目目录内；系统目录与账号/密钥文件仍受保护。适合长时间托管。',
      rules: { fileRead: 'allow', fileWrite: 'allow', shell: 'allow', network: 'allow', gitWrite: 'allow', packageInstall: 'allow' },
      workspaceOnly: true,
    },
    {
      id: 'full-access',
      label: '完全访问',
      short: '整台电脑，凭据需确认',
      hint: '完全访问：Pi 可操作整台电脑上的文件与命令；账号、密码、密钥等敏感文件会逐次询问；系统目录与破坏性命令始终禁止。',
      rules: { fileRead: 'allow', fileWrite: 'allow', shell: 'allow', network: 'allow', gitWrite: 'allow', packageInstall: 'allow' },
      workspaceOnly: false,
    },
    {
      id: 'custom',
      label: '自定义',
      short: '在高级里逐项设置',
      hint: '自定义：在下方「高级」中逐项调整；改动后需点「保存权限」。',
    },
  ];
  let permissionPreset = 'standard';
  let permissionWorkspaceOnly = true;
  let permissionAutoApprove = false;
  let permissionBusy = false;

  function presetMatches(rules: PermissionRules, preset: PermissionPreset): boolean {
    if (preset.workspaceOnly !== undefined && permissionWorkspaceOnly !== preset.workspaceOnly) return false;
    if (!preset.rules) return false;
    return (Object.keys(preset.rules) as Array<keyof PermissionRules>).every((key) => rules[key] === preset.rules![key]);
  }

  function detectPreset(): string {
    const matched = permissionPresets.find((preset) => presetMatches(permissionRules, preset));
    return matched ? matched.id : 'custom';
  }

  function renderPermissionPresets(): void {
    permPresets.textContent = '';
    for (const preset of permissionPresets) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'perm-preset';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', String(permissionPreset === preset.id));
      const label = document.createElement('strong');
      label.textContent = t(preset.label);
      const hint = document.createElement('small');
      hint.textContent = t(preset.short);
      card.append(label, hint);
      card.addEventListener('click', () => {
        permissionPreset = preset.id;
        if (preset.rules) Object.assign(permissionRules, preset.rules);
        if (preset.workspaceOnly !== undefined) {
          permissionWorkspaceOnly = preset.workspaceOnly;
          permWorkspaceOnly.checked = preset.workspaceOnly;
        }
        if (preset.id === 'custom') $<HTMLDetailsElement>('perm-advanced').open = true;
        renderPermissionPresets();
        permPresetNote.textContent = t(preset.hint);
        renderPermissionGrid();
        if (preset.rules) {
          void savePermissions(false);
          void api.recordHabit({ type: 'permission', value: t(preset.label) });
        }
      });
      permPresets.append(card);
    }
    const active = permissionPresets.find((preset) => preset.id === permissionPreset);
    permPresetNote.textContent = t(active ? active.hint : permissionPresets[1].hint);
  }

  function renderPermissionGrid(): void {
    permGrid.textContent = '';
    for (const field of permissionFields) {
      const row = document.createElement('label');
      row.className = `perm-field level-${permissionRules[field.key]}`;
      const name = document.createElement('span');
      name.textContent = t(field.label);
      const select = document.createElement('select');
      select.setAttribute('aria-label', t(field.label));
      for (const level of ['allow', 'ask', 'deny'] as PermissionLevel[]) {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level === 'allow' ? t('允许') : level === 'ask' ? t('询问') : t('禁止');
        option.selected = permissionRules[field.key] === level;
        select.append(option);
      }
      select.addEventListener('change', () => {
        permissionRules[field.key] = select.value as PermissionLevel;
        row.className = `perm-field level-${select.value}`;
        permissionPreset = detectPreset();
        renderPermissionPresets();
      });
      row.append(name, select);
      permGrid.append(row);
    }
  }

  function parsePathList(value: string): string[] {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 100);
  }

  function permissionTime(iso?: string): string {
    if (!iso) return t('使用默认策略');
    return t('已保存 · {time}', { time: new Date(iso).toLocaleString() });
  }

  async function loadPermissions(): Promise<void> {
    const cwd = deps.currentCwd();
    if (!cwd) {
      permStatus.textContent = t('未绑定项目');
      permStatus.className = 'dock-summary';
      permAllow.value = '';
      permDeny.value = '';
      permAutoApprove.checked = false;
      permAutoApprove.disabled = true;
      renderPermissionPresets();
      renderPermissionGrid();
      return;
    }
    permAutoApprove.disabled = false;
    let result: PermissionResult;
    try {
      result = await api.getPermissions(cwd);
    } catch (error) {
      permStatus.textContent = error instanceof Error ? error.message : String(error);
      permStatus.className = 'dock-summary bad';
      return;
    }
    if (!result.ok || !result.permissions) {
      permStatus.textContent = result.error || t('读取权限失败');
      permStatus.className = 'dock-summary bad';
      return;
    }
    Object.assign(permissionRules, result.permissions.rules);
    permissionWorkspaceOnly = result.permissions.workspaceOnly !== false;
    permissionAutoApprove = result.permissions.autoApprove === true;
    permissionPreset = detectPreset();
    permAllow.value = result.permissions.allowPaths.join(', ');
    permDeny.value = result.permissions.denyPaths.join(', ');
    permWorkspaceOnly.checked = permissionWorkspaceOnly;
    permAutoApprove.checked = permissionAutoApprove;
    permStatus.textContent = permissionTime(result.permissions.updatedAt);
    permStatus.className = 'dock-summary ok';
    renderPermissionPresets();
    renderPermissionGrid();
  }

  async function savePermissions(notify = true): Promise<boolean> {
    const cwd = deps.currentCwd();
    if (!cwd) {
      if (notify) deps.toast(t('先选择项目'));
      return false;
    }
    if (permissionBusy) return false;
    permissionBusy = true;
    try {
      const result = await api.savePermissions({
        cwd,
        rules: { ...permissionRules },
        workspaceOnly: permissionWorkspaceOnly,
        autoApprove: permissionAutoApprove,
        allowPaths: parsePathList(permAllow.value),
        denyPaths: parsePathList(permDeny.value),
      });
      if (!result.ok) {
        deps.toast(t('保存权限失败：{error}', { error: result.error || t('未知错误') }));
        return false;
      }
      permStatus.textContent = permissionTime(result.permissions?.updatedAt);
      permStatus.className = 'dock-summary ok';
      if (notify) {
        deps.toast(t('项目权限已保存'));
      } else {
        const active = permissionPresets.find((preset) => preset.id === permissionPreset);
        deps.toast(t('权限预设已应用：{name}', { name: t(active ? active.label : '') }));
      }
      return true;
    } finally {
      permissionBusy = false;
    }
  }

  $('perm-save').addEventListener('click', () => void savePermissions(true));

  permWorkspaceOnly.addEventListener('change', () => {
    permissionWorkspaceOnly = permWorkspaceOnly.checked;
    permissionPreset = detectPreset();
    renderPermissionPresets();
    void api.recordHabit({
      type: 'permission',
      value: t(permissionWorkspaceOnly ? '自动模式仅允许写入项目目录' : '完全访问（整台电脑）'),
    });
  });

  permAutoApprove.addEventListener('change', () => {
    permissionAutoApprove = permAutoApprove.checked;
    void savePermissions(false);
    if (permissionAutoApprove) {
      void ensureGuard();
      void api.recordHabit({ type: 'permission', value: t('自动同意') });
      deps.toast(t('自动同意已开启：项目读写、联网与依赖安装自动放行，敏感与破坏性操作仍会询问'));
    } else {
      deps.toast(t('自动同意已关闭'));
    }
  });

  $('perm-reset').addEventListener('click', () => {
    Object.assign(permissionRules, {
      fileRead: 'allow',
      fileWrite: 'ask',
      shell: 'ask',
      network: 'ask',
      gitWrite: 'ask',
      packageInstall: 'deny',
    } as PermissionRules);
    permissionPreset = 'standard';
    permissionWorkspaceOnly = true;
    permissionAutoApprove = false;
    permAllow.value = '';
    permDeny.value = '';
    permWorkspaceOnly.checked = true;
    permAutoApprove.checked = false;
    renderPermissionPresets();
    renderPermissionGrid();
  });

  let guardReady = false;
  async function ensureGuard(): Promise<void> {
    if (guardReady) return;
    try {
      const result = await api.installPermissionGuard();
      if (!result.ok) return;
      await refreshGuardStatus();
      deps.toast(t('Pi 护栏已自动安装，新启动的 Pi 会话生效'));
    } catch {
      // 护栏安装失败不阻塞托管；权限面板会继续显示未安装
    }
  }
  async function refreshGuardStatus(): Promise<void> {
    try {
      const status = await api.permissionGuardStatus();
      guardReady = status.installed;
    } catch {
      guardReady = false;
    }
    const button = $<HTMLButtonElement>('perm-guard');
    button.textContent = guardReady ? t('重装 Pi 护栏') : t('安装 Pi 护栏');
    button.classList.toggle('ghost', !guardReady);
    permGuardState.textContent = guardReady ? t('Pi 护栏已启用') : t('护栏未安装，权限暂不生效');
    permGuardState.className = `dock-summary ${guardReady ? 'ok' : 'warn'}`;
  }

  $('perm-guard').addEventListener('click', async () => {
    const result = await api.installPermissionGuard();
    if (!result.ok) {
      deps.toast(t('安装 Pi 护栏失败：{error}', { error: result.error || t('未知错误') }));
      return;
    }
    await refreshGuardStatus();
    deps.toast(t('Pi 护栏已安装，新启动的 Pi 会话生效'));
  });

  // 存档
  let archiveBusy = false;

  function archiveEmpty(text: string): void {
    const note = document.createElement('p');
    note.className = 'memory-empty';
    note.textContent = text;
    archiveList.append(note);
  }

  function renderArchive(archive: ArchiveMeta): void {
    const item = document.createElement('div');
    item.className = 'archive-item';
    const head = document.createElement('header');
    const label = document.createElement('strong');
    label.textContent = archive.label;
    const time = document.createElement('time');
    time.textContent = new Date(archive.createdAt).toLocaleString();
    head.append(label, time);

    const detail = document.createElement('p');
    detail.textContent = t('分支 {branch} · 改动 {changed} 个文件 · 未跟踪 {untracked} 个 · {size}', {
      branch: archive.branch || '—',
      changed: archive.changedFiles,
      untracked: archive.untrackedFiles,
      size: formatBytes(archive.patchBytes + archive.untrackedBytes),
    });

    const actions = document.createElement('span');
    actions.className = 'archive-actions';
    const restore = button(t('还原'), 'ghost');
    restore.addEventListener('click', async () => {
      const cwd = deps.currentCwd();
      if (!cwd || archiveBusy) return;
      if (!window.confirm(t('恢复存档「{label}」会覆盖当前未提交改动；工作台会先自动备份当前状态。确认继续？', { label: archive.label }))) return;
      archiveBusy = true;
      archiveStatus.textContent = t('正在恢复…');
      try {
        const result = await api.restoreArchive({ cwd, id: archive.id });
        if (!result.ok) {
          archiveStatus.textContent = result.error || t('恢复失败');
          archiveStatus.className = 'dock-summary bad';
          deps.toast(t('恢复失败：{error}', { error: result.error || t('未知错误') }));
          return;
        }
        archiveStatus.textContent = t('已恢复 {count} 个文件', { count: (result.touched ?? []).length });
        archiveStatus.className = 'dock-summary ok';
        deps.toast(t('存档已恢复'));
      } finally {
        archiveBusy = false;
        await refreshArchives();
      }
    });
    const remove = button(t('删除'), 'ghost danger');
    remove.addEventListener('click', async () => {
      const cwd = deps.currentCwd();
      if (!cwd || archiveBusy) return;
      if (!window.confirm(t('删除存档「{label}」？此操作不可撤销。', { label: archive.label }))) return;
      archiveBusy = true;
      try {
        const result = await api.deleteArchive({ cwd, id: archive.id });
        if (!result.ok) {
          deps.toast(t('删除存档失败：{error}', { error: result.error || t('未知错误') }));
          return;
        }
        deps.toast(t('存档已删除'));
      } finally {
        archiveBusy = false;
        await refreshArchives();
      }
    });
    actions.append(restore, remove);
    head.append(actions);
    item.append(head, detail);
    archiveList.append(item);
  }

  async function refreshArchives(): Promise<void> {
    archiveList.textContent = '';
    const cwd = deps.currentCwd();
    if (!cwd) {
      archiveEmpty(t('先选择项目'));
      return;
    }
    try {
      const result = await api.listArchives(cwd);
      if (!result.ok) {
        archiveEmpty(result.error || t('读取存档失败'));
        return;
      }
      if (!result.archives?.length) {
        archiveEmpty(t('还没有存档。写代码前点一次「创建存档」即可留底。'));
        return;
      }
      for (const archive of result.archives) renderArchive(archive);
    } catch (error) {
      archiveEmpty(error instanceof Error ? error.message : String(error));
    }
  }

  $('archive-create').addEventListener('click', async () => {
    const cwd = deps.currentCwd();
    if (!cwd) {
      deps.toast(t('先选择项目'));
      return;
    }
    if (archiveBusy) return;
    archiveBusy = true;
    archiveStatus.textContent = t('正在创建存档…');
    archiveStatus.className = 'dock-summary';
    try {
      const result = await api.createArchive({ cwd, label: archiveLabel.value.trim() || undefined });
      if (!result.ok) {
        archiveStatus.textContent = result.error || t('创建失败');
        archiveStatus.className = 'dock-summary bad';
        deps.toast(t('创建存档失败：{error}', { error: result.error || t('未知错误') }));
        return;
      }
      archiveLabel.value = '';
      archiveStatus.textContent = t('已创建 {files} 个文件的存档', {
        files: (result.archive?.changedFiles ?? 0) + (result.archive?.untrackedFiles ?? 0),
      });
      archiveStatus.className = 'dock-summary ok';
      deps.toast(t('存档已创建'));
      if (result.warnings?.length) deps.toast(result.warnings.join('；'));
    } finally {
      archiveBusy = false;
      await refreshArchives();
    }
  });

  // 长期记忆
  const autoIngested = new Set<string>();

  function memoryMeta(hit: MemoryHit): string {
    const role = hit.role === 'user' ? t('你') : t('Pi');
    const time = hit.timestamp ? new Date(hit.timestamp).toLocaleString() : '—';
    return `${role} · ${time}`;
  }

  function renderMemoryHits(hits: MemoryHit[], emptyText: string): void {
    memoryResults.textContent = '';
    if (!hits.length) {
      const note = document.createElement('p');
      note.className = 'memory-empty';
      note.textContent = emptyText;
      memoryResults.append(note);
      return;
    }
    for (const hit of hits) {
      const item = document.createElement('article');
      item.className = 'memory-hit';
      const head = document.createElement('header');
      const role = document.createElement('span');
      role.className = `memory-role ${hit.role}`;
      role.textContent = hit.role === 'user' ? t('你') : t('Pi');
      const meta = document.createElement('time');
      meta.textContent = memoryMeta(hit);
      head.append(role, meta);
      if (hit.score > 0) {
        const score = document.createElement('span');
        score.className = 'dock-summary';
        score.textContent = t('相关度 {score}', { score: hit.score.toFixed(1) });
        head.append(score);
      }
      const body = document.createElement('p');
      body.textContent = hit.snippet || hit.text.slice(0, 280);
      item.append(head, body);
      memoryResults.append(item);
    }
  }

  const HABIT_TYPE_LABEL: Record<HabitEvent['type'], string> = {
    model: '模型偏好',
    permission: '权限习惯',
    autopilot: '托管方式',
    'memory-scope': '记忆范围',
    language: '界面语言',
  };

  async function refreshHabits(): Promise<void> {
    try {
      const summary = await api.habitSummary();
      const top = (summary.top ?? []).slice(0, 3);
      if (!top.length) return;
      memoryHabits.textContent = t('习惯画像：{items}', {
        items: top.map((item) => `${t(HABIT_TYPE_LABEL[item.type])} ${item.value} ×${item.count}`).join(' · '),
      });
      memoryHabits.className = 'dock-summary ok';
    } catch {
      // 习惯画像不可用时保留默认提示
    }
  }

  async function refreshMemoryStats(): Promise<void> {
    const cwd = deps.currentCwd();
    try {
      const stats = await api.memoryStats(cwd || undefined);
      memoryStatsElement.textContent = t('本机 {entries} 条记忆 · {projects} 个项目 · 本项目 {projectEntries} 条 · {size}', {
        entries: stats.entries,
        projects: stats.projects,
        projectEntries: stats.projectEntries,
        size: formatBytes(stats.bytes),
      });
      memoryStatsElement.className = 'dock-summary';
      memoryStatsElement.title = stats.path;
      void refreshHabits();
    } catch (error) {
      memoryStatsElement.textContent = error instanceof Error ? error.message : String(error);
      memoryStatsElement.className = 'dock-summary bad';
    }
  }

  async function ingestMemory(silent = false): Promise<void> {
    const cwd = deps.currentCwd();
    if (!cwd) {
      if (!silent) deps.toast(t('先选择项目'));
      return;
    }
    if (!silent) memoryStatsElement.textContent = t('正在摄取会话…');
    try {
      const result = await api.ingestMemory(cwd);
      if (!result.ok) {
        if (!silent) deps.toast(t('摄取失败：{error}', { error: result.error || t('未知错误') }));
        return;
      }
      if (!silent) deps.toast(t('已摄取 {count} 条新记忆', { count: result.added ?? 0 }));
      await refreshMemoryStats();
      if (!memoryQuery.value.trim()) {
        const all = memoryScope.value === 'all';
        const recent = await api.recentMemory(all ? '' : cwd, 12);
        renderMemoryHits(recent, all ? t('输入关键词搜索历史会话。') : t('这个项目还没有可检索的历史。'));
      }
    } catch (error) {
      if (!silent) deps.toast(error instanceof Error ? error.message : String(error));
    }
  }
  async function runMemorySearch(): Promise<void> {
    const query = memoryQuery.value.trim();
    if (!query) {
      const recent = await api.recentMemory(deps.currentCwd(), 12);
      renderMemoryHits(recent, t('输入关键词搜索历史会话。'));
      return;
    }
    const scope = memoryScope.value === 'all' ? 'all' : 'project';
    memoryResults.textContent = t('正在检索…');
    const result = await api.searchMemory({
      query,
      cwd: deps.currentCwd() || undefined,
      scope,
      limit: 20,
    });
    if (!result.ok) {
      renderMemoryHits([], result.error || t('检索失败'));
      return;
    }
    renderMemoryHits(result.hits ?? [], t('没有找到相关记忆。'));
  }

  $('memory-ingest').addEventListener('click', () => void ingestMemory(false));
  $('memory-search').addEventListener('click', () => void runMemorySearch());
  const MEMORY_SCOPE_KEY = 'pi-workbench-memory-scope';
  try {
    memoryScope.value = localStorage.getItem(MEMORY_SCOPE_KEY) === 'all' ? 'all' : 'project';
  } catch {
    memoryScope.value = 'project';
  }
  memoryScope.addEventListener('change', () => {
    const scope = memoryScope.value === 'all' ? 'all' : 'project';
    try {
      localStorage.setItem(MEMORY_SCOPE_KEY, scope);
    } catch {
      // storage is optional
    }
    void api.recordHabit({
      type: 'memory-scope',
      value: t(scope === 'all' ? '全局（所有项目）' : '项目本地'),
    });
    if (memoryQuery.value.trim()) {
      void runMemorySearch();
      return;
    }
    const target = scope === 'all' ? '' : (deps.currentCwd() || '');
    void api.recentMemory(target, 12).then((hits) => {
      renderMemoryHits(hits, target ? t('这个项目还没有可检索的历史。') : t('输入关键词搜索历史会话。'));
    });
  });
  memoryQuery.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void runMemorySearch();
  });
  $('memory-skill').addEventListener('click', async () => {
    const result = await api.installMemorySkill();
    if (result.ok) {
      deps.toast(t('记忆 Skill 已安装，可在 Pi 中直接调用'));
      deps.refreshCapabilities();
    } else {
      deps.toast(t('安装记忆 Skill 失败：{error}', { error: result.error || t('未知错误') }));
    }
  });

  // 托管：按项目记住开关与权限档位，模型路由交给主界面的总控
  interface AutopilotState {
    enabled: boolean;
    mode: 'safe' | 'full';
  }
  const AUTOPILOT_KEY = 'pi-workbench-autopilot';
  const autopilotToggle = $<HTMLInputElement>('autopilot-toggle');
  const autopilotMode = $<HTMLSelectElement>('autopilot-mode');
  const autopilotStatus = $('autopilot-status');

  function readAutopilotMap(): Record<string, AutopilotState> {
    try {
      const raw = JSON.parse(localStorage.getItem(AUTOPILOT_KEY) ?? '{}') as Record<string, unknown>;
      const result: Record<string, AutopilotState> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (!value || typeof value !== 'object') continue;
        const item = value as Record<string, unknown>;
        result[key] = {
          enabled: item.enabled === true,
          mode: item.mode === 'full' ? 'full' : 'safe',
        };
      }
      return result;
    } catch {
      return {};
    }
  }

  function autopilotState(cwd = deps.currentCwd()): AutopilotState {
    if (!cwd) return { enabled: false, mode: 'safe' };
    return readAutopilotMap()[cwd.toLowerCase()] ?? { enabled: false, mode: 'safe' };
  }

  function writeAutopilotState(state: AutopilotState): void {
    const cwd = deps.currentCwd();
    if (!cwd) return;
    try {
      const map = readAutopilotMap();
      map[cwd.toLowerCase()] = state;
      localStorage.setItem(AUTOPILOT_KEY, JSON.stringify(map));
    } catch {
      // storage is optional
    }
  }

  function applyAutopilotPreset(mode: 'safe' | 'full'): void {
    const preset = permissionPresets.find((item) => item.id === (mode === 'full' ? 'full-access' : 'full-auto'));
    if (!preset || !preset.rules) return;
    Object.assign(permissionRules, preset.rules);
    permissionWorkspaceOnly = preset.workspaceOnly !== false;
    permissionAutoApprove = true;
    permissionPreset = preset.id;
    permWorkspaceOnly.checked = permissionWorkspaceOnly;
    permAutoApprove.checked = true;
    renderPermissionPresets();
    renderPermissionGrid();
    void ensureGuard();
    void savePermissions(false);
  }

  function renderAutopilot(): void {
    const cwd = deps.currentCwd();
    const state = autopilotState(cwd);
    autopilotToggle.disabled = !cwd;
    autopilotToggle.checked = state.enabled;
    autopilotMode.disabled = !cwd || !state.enabled;
    autopilotMode.value = state.mode;
    if (!cwd) {
      autopilotStatus.textContent = t('先选择项目');
      autopilotStatus.className = 'dock-summary';
      return;
    }
    if (!state.enabled) {
      autopilotStatus.textContent = t('未启用');
      autopilotStatus.className = 'dock-summary';
      return;
    }
    autopilotStatus.textContent = state.mode === 'full'
      ? t('托管中：整机自动 · 凭据/外传/删除仍拦截')
      : t('托管中：项目内自动 · 凭据/外传/删除仍拦截');
    autopilotStatus.className = 'dock-summary ok';
  }

  autopilotToggle.addEventListener('change', () => {
    const cwd = deps.currentCwd();
    if (!cwd) {
      autopilotToggle.checked = false;
      deps.toast(t('先选择项目'));
      return;
    }
    const state = autopilotState(cwd);
    state.enabled = autopilotToggle.checked;
    writeAutopilotState(state);
    deps.setRouterEnabled?.(state.enabled);
    if (state.enabled) {
      applyAutopilotPreset(state.mode);
      void api.recordHabit({
        type: 'autopilot',
        value: t(state.mode === 'full' ? '整机完全访问' : '工作区自动'),
      });
      deps.toast(t('托管已开启：{mode}', {
        mode: state.mode === 'full' ? t('整机完全访问') : t('工作区自动'),
      }));
    } else {
      deps.toast(t('托管已关闭；权限保持不变'));
    }
    renderAutopilot();
  });

  autopilotMode.addEventListener('change', () => {
    const cwd = deps.currentCwd();
    if (!cwd) return;
    const state = autopilotState(cwd);
    state.mode = autopilotMode.value === 'full' ? 'full' : 'safe';
    writeAutopilotState(state);
    if (state.enabled) applyAutopilotPreset(state.mode);
    void api.recordHabit({
      type: 'autopilot',
      value: t(state.mode === 'full' ? '整机完全访问' : '工作区自动'),
    });
    renderAutopilot();
  });

  $('autopilot-config').addEventListener('click', () => {
    document.getElementById('tab-model')?.click();
    deps.toast(t('在「总控：按任务自动切换」中可微调每类任务的模型'));
  });

  // 更新
  let latestCheck: UpdateCheckResult | null = null;
  let updateBusy = false;
  const autoDownloadMark = 'pi-workbench-auto-downloaded';

  function updateSettingsFromUi(): { autoCheck: boolean; autoDownload: boolean } {
    return {
      autoCheck: $<HTMLInputElement>('update-auto-check').checked,
      autoDownload: $<HTMLInputElement>('update-auto-download').checked,
    };
  }

  async function persistUpdateSettings(): Promise<void> {
    try {
      await api.saveUpdateSettings(updateSettingsFromUi());
    } catch {
      // 设置持久化失败不阻塞界面
    }
  }

  function updateItem(options: {
    title: string;
    detail: string;
    notes?: string;
    actionLabel?: string;
    onAction?: () => void;
  }): HTMLElement {
    const item = document.createElement('article');
    item.className = 'update-item';
    const head = document.createElement('header');
    head.append(document.createTextNode(options.title));
    if (options.actionLabel && options.onAction) {
      const actions = document.createElement('span');
      actions.className = 'update-actions';
      const action = button(options.actionLabel, 'ghost');
      action.addEventListener('click', options.onAction);
      actions.append(action);
      head.append(actions);
    }
    const detail = document.createElement('p');
    detail.textContent = options.detail;
    item.append(head, detail);
    if (options.notes) {
      const notes = document.createElement('p');
      notes.textContent = options.notes.slice(0, 320);
      item.append(notes);
    }
    return item;
  }

  function renderUpdates(result: UpdateCheckResult): void {
    updateList.textContent = '';
    updateDownload.hidden = true;
    const app = result.app;
    const pi = result.pi;
    if (!app && !pi) {
      updateStatus.textContent = result.error || t('检查失败');
      updateStatus.className = 'dock-summary bad';
      return;
    }
    updateStatus.className = 'dock-summary';
    if (app) {
      updateList.append(updateItem({
        title: app.hasUpdate
          ? t('工作台 {current} → {latest}', { current: app.current, latest: app.latest })
          : t('工作台已是最新版本 {current}', { current: app.current }),
        detail: app.publishedAt
          ? t('发布时间 {time}', { time: new Date(app.publishedAt).toLocaleString() })
          : t('GitHub Releases'),
        notes: app.hasUpdate ? app.notes : '',
        actionLabel: app.hasUpdate ? t('打开发布页') : undefined,
        onAction: app.hasUpdate ? () => void api.openExternal(app.url) : undefined,
      }));
      if (app.hasUpdate && app.asset) {
        updateDownload.hidden = false;
        updateDownload.textContent = t('下载 {name}', { name: app.asset.name });
      }
    }
    if (pi) {
      updateList.append(updateItem({
        title: pi.hasUpdate
          ? t('Pi {current} → {latest}', { current: pi.current, latest: pi.latest })
          : t('Pi 已是最新版本 {current}', { current: pi.current }),
        detail: t('通过 npm 全局安装最新版'),
      }));
    }
    updateStatus.textContent = result.checkedAt
      ? t('检查于 {time}', { time: new Date(result.checkedAt).toLocaleString() })
      : t('检查完成');
  }

  async function autoDownloadUpdate(result: UpdateCheckResult, settings: { autoDownload: boolean }): Promise<void> {
    if (!settings.autoDownload || !result.app?.hasUpdate || !result.app.asset) return;
    const version = result.app.latest;
    let previous = '';
    try {
      previous = localStorage.getItem(autoDownloadMark) ?? '';
    } catch {
      previous = '';
    }
    if (previous === version) return;
    const download = await api.downloadUpdate({ url: result.app.asset.url, name: result.app.asset.name });
    if (download.ok) {
      try {
        localStorage.setItem(autoDownloadMark, version);
      } catch {
        // storage is optional
      }
      if (download.path) deps.toast(t('更新已自动下载到 {path}', { path: download.path }));
    }
  }

  async function checkUpdates(silent = false): Promise<void> {
    if (updateBusy) return;
    updateBusy = true;
    if (!silent) {
      updateStatus.textContent = t('正在检查更新…');
      updateStatus.className = 'dock-summary';
    }
    try {
      const result = await api.checkUpdates();
      latestCheck = result;
      renderUpdates(result);
      const settings = await api.getUpdateSettings();
      await autoDownloadUpdate(result, settings);
      if (!silent && result.error && result.ok) deps.toast(result.error);
    } catch (error) {
      updateStatus.textContent = t('检查更新失败：{error}', { error: error instanceof Error ? error.message : String(error) });
      updateStatus.className = 'dock-summary bad';
    } finally {
      updateBusy = false;
    }
  }

  $('update-check').addEventListener('click', () => void checkUpdates(false));
  updateDownload.addEventListener('click', async () => {
    const asset = latestCheck?.app?.asset;
    if (!asset) return;
    updateDownload.disabled = true;
    updateDownload.textContent = t('正在下载…');
    try {
      const result = await api.downloadUpdate({ url: asset.url, name: asset.name });
      if (result.ok) {
        deps.toast(t('已下载到 {path}', { path: result.path || '' }));
        void api.openPath(result.path ? result.path.replace(/[\\/][^\\/]+$/, '') : '');
      } else {
        deps.toast(t('下载失败：{error}', { error: result.error || t('未知错误') }));
      }
    } finally {
      updateDownload.disabled = false;
      updateDownload.textContent = t('下载 {name}', { name: asset.name });
    }
  });
  $('update-pi-btn').addEventListener('click', async () => {
    const buttonElement = $<HTMLButtonElement>('update-pi-btn');
    if (!window.confirm(t('将通过 npm 全局安装/更新 Pi 到最新版。确认继续？'))) return;
    buttonElement.disabled = true;
    buttonElement.textContent = t('更新中…');
    try {
      const result = await api.updatePi();
      if (result.ok) {
        deps.toast(t('Pi 已更新到 {version}', { version: result.version || '' }));
        void checkUpdates(true);
      } else {
        deps.toast(t('Pi 更新失败：{error}', { error: result.error || t('未知错误') }));
      }
    } finally {
      buttonElement.disabled = false;
      buttonElement.textContent = t('更新 Pi');
    }
  });
  $<HTMLInputElement>('update-auto-check').addEventListener('change', () => void persistUpdateSettings());
  $<HTMLInputElement>('update-auto-download').addEventListener('change', () => void persistUpdateSettings());

  async function loadUpdateSettings(): Promise<void> {
    try {
      const settings = await api.getUpdateSettings();
      $<HTMLInputElement>('update-auto-check').checked = settings.autoCheck;
      $<HTMLInputElement>('update-auto-download').checked = settings.autoDownload;
      if (settings.autoCheck) window.setTimeout(() => void checkUpdates(true), 1800);
    } catch {
      // 使用界面默认值
    }
  }

  async function refreshProjectDock(): Promise<void> {
    renderAutopilot();
    await Promise.all([
      loadPermissions(),
      refreshArchives(),
      refreshMemoryStats(),
    ]);
    const cwd = deps.currentCwd();
    const state = autopilotState(cwd);
    if (cwd && state.enabled) applyAutopilotPreset(state.mode);
    if (cwd && !autoIngested.has(cwd)) {
      autoIngested.add(cwd);
      void ingestMemory(true);
    } else if (!memoryQuery.value.trim()) {
      const all = memoryScope.value === 'all';
      const recent = await api.recentMemory(all ? '' : (cwd || ''), 12);
      renderMemoryHits(recent, all ? t('输入关键词搜索历史会话。') : (cwd ? t('这个项目还没有可检索的历史。') : t('先选择项目。')));
    }
  }

  renderPermissionPresets();
  renderPermissionGrid();
  renderAutopilot();
  void refreshGuardStatus();
  void refreshProjectDock();
  void loadUpdateSettings();

  // ---------- 生命周期 ----------
  function setProject(): void {
    // 项目切换后，安装范围与任务目录都跟随当前项目。
    void renderPacks();
    void refreshProjectDock();
    if (automationForm.hidden) return;
    renderChannelPicker([...automationChannels.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value));
  }

  void loadCatalog();
  void refreshAgents(false);
  void loadCustomLinks();
  void refreshVisual();
  renderRoom();

  return {
    refreshMarket: () => void loadCatalog(),
    refreshAutomation,
    refreshAgents,
    setProject,
    activateWorkspace,
  };
}
