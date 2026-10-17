import { t } from './i18n.js';

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

interface PageContent {
  url: string;
  title: string;
  text: string;
}

interface PanelApi {
  catalog(): Promise<{ ok: boolean; catalog?: CatalogReport; agents?: AgentInfo[]; error?: string }>;
  inspectCapabilities(cwd: string): Promise<{ ok: boolean; report?: { capabilities: CapabilityEntry[]; warnings: string[] }; error?: string }>;
  searchMcpRegistry(query: string): Promise<{ ok: boolean; results: RegistryMcp[]; error?: string }>;
  searchExtensions(query: string): Promise<{ ok: boolean; results: CatalogExtension[]; error?: string }>;
  installExtension(name: string): Promise<{ ok: boolean; output: string; error?: string }>;
  importSkillUrl(input: { url: string; scope: 'user' | 'project'; cwd?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  addSkill(input: { scope: 'user' | 'project'; cwd?: string; name: string; description?: string; body?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  removeSkill(input: { scope: 'user' | 'project'; cwd?: string; name: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  addMcp(input: { scope: 'user' | 'project'; cwd?: string; name: string; command: string; argsText?: string; envText?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  listAgents(refresh?: boolean): Promise<{ ok: boolean; agents?: AgentInfo[]; error?: string }>;
  runTeam(input: { task: string; agentIds: string[]; mode: 'parallel' | 'supervisor'; supervisorId?: string; cwd?: string; apps?: string[]; webSearch?: boolean }): Promise<{ ok: boolean; summaries: Array<{ agentId: string; ok: boolean; text: string }>; error?: string }>;
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
  getToolSettings(): Promise<{ ok: boolean; settings: ToolSettings }>;
  saveToolSettings(input: ToolSettings): Promise<{ ok: boolean; settings?: ToolSettings; error?: string }>;
  searchWeb(query: string): Promise<{ ok: boolean; results: SearchResult[]; error?: string }>;
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
  onAgentEvent(callback: (event: AgentEvent) => void): () => void;
}

export interface PanelDeps {
  api: PanelApi;
  currentCwd(): string;
  toast(message: string, vars?: Record<string, string | number>): void;
  refreshCapabilities(): void;
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
    if (id === 'tab-ws-visual') void refreshVisual();
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
  let visualItem: VisualMedia | null = null;
  let visualAppsCache: LocalAppInfo[] = [];
  let customLinkCache: CustomLink[] = [];
  const collapsedAppGroups = new Set<string>();

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

  function renderVisualApps(): void {
    const query = visualSearch.value.trim().toLowerCase();
    const matches = visualAppsCache.filter((app) => {
      if (!query) return true;
      const label = APP_KIND_LABEL[app.kind] || app.kind;
      return `${app.name} ${label} ${app.kind} ${app.hint} ${app.path ?? ''}`.toLowerCase().includes(query);
    });
    visualApps.replaceChildren();
    if (!visualAppsCache.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('正在检测本机软件…');
      visualApps.append(note);
      return;
    }
    if (!matches.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = t('没有匹配的软件');
      visualApps.append(note);
      return;
    }
    for (const kind of APP_KIND_ORDER) {
      const items = matches.filter((app) => app.kind === kind);
      if (!items.length) continue;
      items.sort((left, right) => Number(right.installed) - Number(left.installed) || left.name.localeCompare(right.name));
      const installed = items.filter((app) => app.installed).length;
      const group = document.createElement('details');
      group.className = 'app-group';
      group.open = !collapsedAppGroups.has(kind);
      group.addEventListener('toggle', () => {
        if (group.open) collapsedAppGroups.delete(kind);
        else collapsedAppGroups.add(kind);
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
      visualApps.append(group);
    }
  }

  async function refreshVisual(refresh = false): Promise<void> {
    const result = await api.listApps(refresh);
    if (!result.ok) {
      deps.toast(result.error || t('检测本机软件失败'));
      return;
    }
    visualAppsCache = result.apps;
    updateVisualCount();
    renderVisualApps();
  }

  // 统计已安装数量，扫描结果合并后也要刷新计数
  function updateVisualCount(): void {
    const installed = visualAppsCache.filter((app) => app.installed).length;
    visualCount.textContent = `${installed}/${visualAppsCache.length}`;
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
  async function scanAllApps(): Promise<void> {
    const trigger = $<HTMLButtonElement>('visual-scan-all');
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
      updateVisualCount();
      renderVisualApps();
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

  $('visual-refresh').addEventListener('click', () => void refreshVisual(true));
  $('visual-scan-all').addEventListener('click', () => void scanAllApps());
  visualSearch.addEventListener('input', () => renderVisualApps());
  $('visual-add-app').addEventListener('click', () => {
    resetCustomAppForm();
    customAppDrawer.open = true;
    customAppDrawer.scrollIntoView({ block: 'nearest' });
    customAppName.focus();
  });
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
  let marketMode: 'extensions' | 'skills' | 'mcps' = 'extensions';
  let onlineResults: RegistryMcp[] = [];
  let extensionResults: CatalogExtension[] = [];
  let activeTag = '';
  let onlineBusy = false;
  let extensionBusy = false;
  let catalogLoading = false;

  function matches(query: string, text: string): boolean {
    return !query || text.toLowerCase().includes(query);
  }

  function marketItems(): Array<CatalogExtension | CatalogSkill | CatalogMcp | RegistryMcp> {
    if (marketMode === 'extensions') {
      const builtins = catalog?.extensions ?? [];
      const byName = new Map(builtins.map((item) => [item.name.toLowerCase(), item]));
      for (const item of extensionResults) {
        if (!byName.has(item.name.toLowerCase())) byName.set(item.name.toLowerCase(), item);
      }
      return [...byName.values()];
    }
    if (marketMode === 'skills') return catalog?.skills ?? [];
    const byName = new Map<string, CatalogMcp | RegistryMcp>();
    for (const item of catalog?.mcps ?? []) byName.set(item.name, item);
    for (const item of onlineResults) if (!byName.has(item.name)) byName.set(item.name, item);
    return [...byName.values()];
  }

  function renderChips(tagsList: string[]): void {
    marketChips.replaceChildren();
    const tags = ['全部', ...new Set(tagsList.filter(Boolean))].slice(0, 12);
    for (const tag of tags) {
      const chip = button(tag, `chip ${activeTag === tag || (tag === '全部' && !activeTag) ? 'active' : ''}`);
      chip.addEventListener('click', () => {
        activeTag = tag === '全部' ? '' : tag;
        renderMarket();
      });
      marketChips.append(chip);
    }
  }

  function renderMarket(): void {
    const query = marketSearch.value.trim().toLowerCase();
    marketList.replaceChildren();
    if (extensionBusy || onlineBusy) {
      marketStatus.textContent = marketMode === 'extensions'
        ? t('正在查询 npm 上的 Pi 扩展…')
        : t('正在查询官方 MCP Registry…');
      return;
    }
    const source = marketItems();
    const tags = source.flatMap((item) => ('tags' in item && Array.isArray(item.tags) ? item.tags : []));
    renderChips(tags);
    const filtered = source.filter((item) => {
      const haystack = `${item.title} ${item.name} ${item.description} ${'tags' in item ? item.tags.join(' ') : ''}`;
      if (!matches(query, haystack)) return false;
      return !activeTag || ('tags' in item && item.tags.includes(activeTag));
    });
    if (!filtered.length) {
      marketStatus.textContent = catalog ? t('没有匹配的能力。') : t('读取能力目录…');
      return;
    }
    for (const item of filtered) {
      if (marketMode === 'extensions') marketList.append(extensionCard(item as CatalogExtension));
      else if (marketMode === 'skills') marketList.append(skillCard(item as CatalogSkill));
      else marketList.append(mcpCard(item as CatalogMcp | RegistryMcp));
    }
    const builtinCount = marketMode === 'extensions'
      ? (catalog?.extensions ?? []).length
      : marketMode === 'skills' ? (catalog?.skills ?? []).length : (catalog?.mcps ?? []).length;
    marketStatus.textContent = marketMode === 'extensions'
      ? t('内置 {builtin} 项，在线 {online} 项，当前显示 {count} 项', {
        builtin: builtinCount,
        online: extensionResults.length,
        count: filtered.length,
      })
      : t('共 {count} 项', { count: filtered.length });
  }

  function tagsRow(tagsList: string[]): HTMLElement {
    const tags = document.createElement('span');
    tags.className = 'market-meta';
    for (const label of tagsList.slice(0, 4)) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = label;
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
    const actions = document.createElement('div');
    actions.className = 'market-actions';
    const badge = document.createElement('span');
    badge.className = `tag ${ext.builtin ? 'free' : ''}`;
    badge.textContent = ext.builtin ? t('内置') : t('在线');
    const install = button(t('下载并安装'), 'primary');
    install.addEventListener('click', async () => {
      if (!window.confirm(t('将执行 pi install npm:{name}，把扩展写入 Pi 用户配置。确认继续？', { name: ext.name }))) return;
      install.disabled = true;
      install.textContent = t('安装中…');
      const result = await api.installExtension(ext.name);
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
    card.append(title, name, desc, tagsRow(ext.tags), actions);
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
      });
      deps.toast(result.ok ? t('已安装：{name}', { name: skill.name }) : t('安装失败：{error}', { error: result.error ?? '' }));
      if (result.ok) deps.refreshCapabilities();
      else install.disabled = false;
    });
    actions.append(install);
    card.append(title, name, desc, tagsRow(skill.tags), actions);
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
      });
      deps.toast(result.ok ? t('已安装：{name}', { name: mcp.title }) : t('安装失败：{error}', { error: result.error ?? '' }));
      if (result.ok) deps.refreshCapabilities();
      else install.disabled = false;
    });
    actions.append(install);
    card.append(title, desc, command);
    if ('tags' in mcp && mcp.tags.length) card.append(tagsRow(mcp.tags));
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
    } else {
      marketCustomInput.placeholder = t('粘贴 raw.githubusercontent.com 上的 SKILL.md 链接');
      marketCustomAdd.textContent = t('导入技能');
    }
    marketCustomInput.value = '';
  }

  async function customAdd(): Promise<void> {
    const value = marketCustomInput.value.trim();
    if (!value) {
      deps.toast(marketMode === 'extensions' ? t('输入 npm 包名') : t('粘贴 SKILL.md 链接'));
      return;
    }
    if (marketMode === 'extensions') {
      if (!window.confirm(t('将执行 pi install npm:{name}，把扩展写入 Pi 用户配置。确认继续？', { name: value }))) return;
      marketCustomAdd.disabled = true;
      const result = await api.installExtension(value);
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
  });
  marketCustomAdd.addEventListener('click', () => void customAdd());
  marketCustomInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void customAdd();
  });
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.market-tab')) {
    tab.addEventListener('click', () => {
      marketMode = (tab.dataset.market as typeof marketMode) ?? 'extensions';
      for (const other of document.querySelectorAll('.market-tab')) other.classList.toggle('active', other === tab);
      activeTag = '';
      onlineResults = [];
      updateCustomRow();
      renderMarket();
      if (marketMode === 'extensions' && !extensionResults.length) void loadExtensions();
      if (marketMode === 'mcps') {
        marketStatus.textContent = t('输入关键词后回车，从官方 MCP Registry 搜索。');
      }
    });
  }
  $('refresh-market').addEventListener('click', () => {
    activeTag = '';
    if (marketMode === 'mcps') void searchOnline();
    else if (marketMode === 'extensions') void Promise.all([loadCatalog(), loadExtensions(marketSearch.value.trim())]);
    else void loadCatalog();
  });
  updateCustomRow();

  // ---------- 能力包 ----------
  const packsElement = $('capability-packs');
  const PACKS: Array<{ id: string; label: string; description: string; skills: string[] }> = [
    { id: 'dev', label: '开发 / 修 Bug', description: '审查、测试、安全与重构流程', skills: ['code-review', 'test-writer', 'security-review', 'refactor-plan'] },
    { id: 'research', label: '调研 / 查资料', description: '资料整理、数据核对与文档输出', skills: ['docs-writer', 'data-analysis', 'release-notes'] },
    { id: 'data', label: '数据 / 表格', description: '查询、清洗与可复现分析', skills: ['sql-analyst', 'data-analysis'] },
    { id: 'design', label: '设计 / 视觉', description: '界面评审与视觉交付检查', skills: ['ui-review', 'docs-writer'] },
    { id: 'video3d', label: '视频 / 3D', description: '分镜、素材、工具与交付清单', skills: ['creative-brief', 'docs-writer'] },
    { id: 'writing', label: '写作 / 文档', description: '文档、发布说明与结构整理', skills: ['docs-writer', 'release-notes'] },
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
  const teamTask = $<HTMLTextAreaElement>('team-task');
  const teamEmpty = $('team-log-empty');
  const supervisorSelect = $<HTMLSelectElement>('team-supervisor');
  const supervisorMode = $<HTMLSelectElement>('team-supervisor-mode');
  const supervisorField = $('team-supervisor-field');
  let agentCache: AgentInfo[] = [];
  let selectedAgents = new Set<string>();
  let agentsLoaded = false;
  let teamRunning = false;

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

  // ---------- 生命周期 ----------
  function setProject(): void {
    // 项目切换后，安装范围与任务目录都跟随当前项目。
    void renderPacks();
    if (automationForm.hidden) return;
    renderChannelPicker([...automationChannels.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value));
  }

  void loadCatalog();
  void refreshAgents(false);
  void loadCustomLinks();
  renderRoom();

  return {
    refreshMarket: () => void loadCatalog(),
    refreshAutomation,
    refreshAgents,
    setProject,
    activateWorkspace,
  };
}
