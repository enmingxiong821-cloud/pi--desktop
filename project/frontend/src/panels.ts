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

interface CatalogReport {
  vendors: VendorInfo[];
  skills: CatalogSkill[];
  mcps: CatalogMcp[];
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
  authHint: string;
  installHint: string;
  installed: boolean;
  version?: string;
  path?: string;
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

interface PanelApi {
  catalog(): Promise<{ ok: boolean; catalog?: CatalogReport; agents?: AgentInfo[]; error?: string }>;
  searchMcpRegistry(query: string): Promise<{ ok: boolean; results: RegistryMcp[]; error?: string }>;
  addSkill(input: { scope: 'user' | 'project'; cwd?: string; name: string; description?: string; body?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  addMcp(input: { scope: 'user' | 'project'; cwd?: string; name: string; command: string; argsText?: string; envText?: string }): Promise<{ ok: boolean; path?: string; error?: string }>;
  listAgents(refresh?: boolean): Promise<{ ok: boolean; agents?: AgentInfo[]; error?: string }>;
  runTeam(input: { task: string; agentIds: string[]; mode: 'parallel' | 'supervisor'; supervisorId?: string; cwd?: string }): Promise<{ ok: boolean; summaries: Array<{ agentId: string; ok: boolean; text: string }>; error?: string }>;
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
  openPath(target: string): Promise<{ ok: boolean; error?: string }>;
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

  // ---------- 市场 ----------
  const marketList = $('market-list');
  const marketStatus = $('market-status');
  const marketSearch = $<HTMLInputElement>('market-search');
  const marketScope = $<HTMLSelectElement>('market-scope');
  let catalog: CatalogReport | null = null;
  let marketMode: 'skills' | 'mcps' | 'online' = 'skills';
  let onlineResults: RegistryMcp[] = [];
  let onlineQuery = '';
  let onlineBusy = false;
  let catalogLoading = false;

  function matches(query: string, text: string): boolean {
    return !query || text.toLowerCase().includes(query);
  }

  function renderMarket(): void {
    const query = marketSearch.value.trim().toLowerCase();
    marketList.replaceChildren();
    if (marketMode === 'online') {
      if (onlineBusy) {
        marketStatus.textContent = t('正在查询官方 MCP Registry…');
        return;
      }
      if (!onlineResults.length) {
        marketStatus.textContent = onlineQuery
          ? t('没有找到可一键安装的 stdio npm 服务器。')
          : t('输入关键词后回车，从官方 MCP Registry 搜索。');
        return;
      }
      for (const entry of onlineResults) {
        marketList.append(onlineCard(entry));
      }
      marketStatus.textContent = t('共 {count} 个结果，来源 {source}', {
        count: onlineResults.length,
        source: onlineResults[0]?.source ?? 'MCP Registry',
      });
      return;
    }
    const items = catalog?.[marketMode] ?? [];
    const filtered = items.filter((item) => matches(query, `${item.title} ${item.name} ${item.description} ${item.tags.join(' ')}`));
    if (!filtered.length) {
      marketStatus.textContent = catalog ? t('没有匹配的能力。') : t('读取能力目录…');
      return;
    }
    for (const item of filtered) {
      marketList.append(marketMode === 'skills'
        ? skillCard(item as CatalogSkill)
        : mcpCard(item as CatalogMcp));
    }
    marketStatus.textContent = t('共 {count} 项', { count: filtered.length });
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

  function onlineCard(entry: RegistryMcp): HTMLElement {
    return mcpCard(entry);
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
    }
  }

  async function searchOnline(): Promise<void> {
    const query = marketSearch.value.trim();
    if (!query) {
      onlineResults = [];
      onlineQuery = '';
      renderMarket();
      return;
    }
    onlineBusy = true;
    onlineQuery = query;
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

  marketSearch.addEventListener('input', () => {
    if (marketMode === 'online') return;
    renderMarket();
  });
  marketSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && marketMode === 'online') {
      event.preventDefault();
      void searchOnline();
    }
  });
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.market-tab')) {
    tab.addEventListener('click', () => {
      marketMode = (tab.dataset.market as typeof marketMode) ?? 'skills';
      for (const other of document.querySelectorAll('.market-tab')) other.classList.toggle('active', other === tab);
      onlineResults = [];
      onlineQuery = '';
      if (marketMode === 'online' && !onlineResults.length) {
        marketStatus.textContent = t('输入关键词后回车，从官方 MCP Registry 搜索。');
        marketList.replaceChildren();
        return;
      }
      renderMarket();
    });
  }
  $('refresh-market').addEventListener('click', () => {
    if (marketMode === 'online') void searchOnline();
    else void loadCatalog();
  });

  // ---------- 自动化 ----------
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
      const agentIds = agentCache.filter((agent) => agent.installed).map((agent) => agent.id);
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
  let agentCache: AgentInfo[] = [];
  let selectedAgents = new Set<string>();
  let agentsLoaded = false;
  let teamRunning = false;

  function renderAgents(): void {
    agentList.replaceChildren();
    supervisorSelect.replaceChildren();
    teamAgents.replaceChildren();
    const installed = agentCache.filter((agent) => agent.installed);
    $('team-summary').textContent = t('检测到 {count} / {total} 个可用 Agent。', {
      count: installed.length,
      total: agentCache.length,
    });
    for (const agent of agentCache) {
      const item = document.createElement('div');
      item.className = 'item';
      const main = document.createElement('span');
      main.className = 'item-main';
      const name = document.createElement('strong');
      name.textContent = agent.name;
      const meta = document.createElement('small');
      meta.textContent = agent.installed
        ? `${agent.version ?? t('已安装')} · ${agent.roles.join('/')}`
        : `${t('未安装')} · ${agent.installHint}`;
      main.append(name, meta);
      const tags = document.createElement('span');
      tags.className = 'item-tags';
      const status = document.createElement('span');
      status.className = `tag ${agent.installed ? 'ready' : 'missing'}`;
      status.textContent = agent.installed ? t('可用') : t('缺失');
      tags.append(status);
      item.append(main, tags);
      agentList.append(item);

      if (!agent.installed) continue;
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = agent.id;
      checkbox.checked = selectedAgents.has(agent.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedAgents.add(agent.id);
        else selectedAgents.delete(agent.id);
      });
      const text = document.createElement('span');
      text.textContent = agent.name;
      const hint = document.createElement('small');
      hint.textContent = agent.roles.join('/');
      label.append(checkbox, text, hint);
      teamAgents.append(label);

      const option = document.createElement('option');
      option.value = agent.id;
      option.textContent = agent.name;
      supervisorSelect.append(option);
    }
    if (supervisorSelect.querySelector('option[value="codex"]')) supervisorSelect.value = 'codex';
    if (!teamAgents.children.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('没有检测到可用的 Agent CLI。安装后点「重新检测」。');
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
      if (!selectedAgents.size) {
        selectedAgents = new Set(agentCache.filter((agent) => agent.installed).slice(0, 3).map((agent) => agent.id));
      } else {
        const available = new Set(agentCache.filter((agent) => agent.installed).map((agent) => agent.id));
        selectedAgents = new Set([...selectedAgents].filter((id) => available.has(id)));
      }
      renderAgents();
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

  $('run-team').addEventListener('click', async () => {
    if (teamRunning) return;
    const task = teamTask.value.trim();
    if (!task) {
      deps.toast(t('填写协作任务'));
      return;
    }
    if (!selectedAgents.size) {
      deps.toast(t('至少选择一个 Agent'));
      return;
    }
    const mode = $<HTMLSelectElement>('team-mode').value === 'supervisor' ? 'supervisor' : 'parallel';
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
        supervisorId: supervisorSelect.value || undefined,
        cwd: deps.currentCwd() || undefined,
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

  // ---------- 生命周期 ----------
  function setProject(): void {
    // 项目切换后，安装范围与任务目录都跟随当前项目。
    if (automationForm.hidden) return;
    renderChannelPicker([...automationChannels.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value));
  }

  void loadCatalog();
  void refreshAgents(false);

  return {
    refreshMarket: () => void loadCatalog(),
    refreshAutomation,
    refreshAgents,
    setProject,
    activateWorkspace,
  };
}
