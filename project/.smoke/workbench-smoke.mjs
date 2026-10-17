import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const calls = [];
const record = (name, payload) => calls.push([name, payload]);

app.setPath('userData', path.join(root, '.smoke', 'user-data-workbench'));
app.disableHardwareAcceleration();

const vendors = [
  { key: 'demo', label: 'Demo Labs', tier: 1, region: 'cn', aliases: ['demo'] },
  { key: 'other', label: 'Other AI', tier: 2, region: 'global', aliases: ['other'] },
];
const skills = [{
  id: 'demo-skill', name: 'demo-skill', title: '演示技能', description: '用于界面冒烟的技能',
  tags: ['demo', 'smoke'], body: '# demo',
}];
const mcps = [{
  id: 'demo-mcp', name: 'demo-mcp', title: '演示 MCP', description: '用于界面冒烟的 MCP',
  tags: ['demo'], command: 'npx', args: ['-y', 'demo-mcp'], needsConfig: false,
}];
const registry = [{
  id: 'registry:@demo/mcp', name: '@demo/mcp', title: 'Registry Demo',
  description: 'registry result', command: 'npx', args: ['-y', '@demo/mcp'], source: 'registry.modelcontextprotocol.io',
}];
const extensions = [{
  id: 'demo-ext', name: 'demo-ext', title: '演示扩展', description: '用于界面冒烟的 Pi 扩展',
  tags: ['demo'], builtin: true, source: 'npm',
}];
const localApps = [
  { id: 'premiere', name: 'Premiere Pro', kind: 'video', installed: true, path: 'C:\\Adobe\\Premiere Pro.exe', hint: 'Adobe Premiere Pro' },
  { id: 'blender', name: 'Blender', kind: '3d', installed: false, hint: 'Blender Foundation' },
  { id: 'word', name: 'Word', kind: 'office', installed: true, path: 'C:\\Office\\WINWORD.EXE', hint: 'Microsoft Word' },
  { id: 'custom-app-demo', name: 'My Tool', kind: 'dev', installed: true, path: 'C:\\Tools\\MyTool.exe', hint: 'custom', custom: true },
];
const agents = [
  {
    id: 'claude', name: 'Claude Code', command: 'claude', description: '', roles: ['实现', '审查'],
    strengths: ['长上下文'], weaknesses: ['成本高'], specialties: ['重构'], limitations: ['需要网络'],
    authHint: '设置 API Key', installHint: '', versionArgs: ['--version'], installed: true, runnable: true,
    cliInstalled: true, desktopInstalled: false, version: '1.2.3',
  },
  {
    id: 'codex', name: 'Codex', command: 'codex', description: '', roles: ['蓝图'],
    strengths: ['结构化'], weaknesses: ['慢'], specialties: ['规划'], limitations: ['上下文短'],
    authHint: '登录 ChatGPT', installHint: '', versionArgs: ['--version'], installed: true, runnable: true,
    cliInstalled: true, desktopInstalled: false, version: '0.9.0',
  },
  {
    id: 'trae', name: 'TRAE', command: 'traecli', description: '', roles: ['实现'],
    strengths: ['中文界面'], weaknesses: ['无 CLI'], specialties: ['中文任务'], limitations: ['仅桌面'],
    authHint: '沿用客户端登录', installHint: '', versionArgs: ['--version'], installed: true, runnable: false,
    cliInstalled: false, desktopInstalled: true, desktopPath: 'C:\\Program Files\\Trae\\Trae.exe',
  },
  {
    id: 'grok', name: 'Grok', command: 'grok', description: '', roles: ['调研'],
    strengths: ['实时信息'], weaknesses: ['工具少'], specialties: ['检索'], limitations: ['区域限制'],
    authHint: '设置 xAI Key', installHint: 'install grok', versionArgs: ['--version'], installed: false,
    runnable: false, cliInstalled: false, desktopInstalled: false,
  },
];

const state = { jobs: [], channels: [] };
const job = (input, id = 'job-1') => ({
  id, name: input.name, enabled: true, schedule: input.schedule, action: input.action,
  cwd: input.cwd, channelIds: input.channelIds ?? [], notifyOn: input.notifyOn ?? 'failure',
  createdAt: new Date().toISOString(), nextRunAt: new Date(Date.now() + 3600e3).toISOString(),
});
const channel = (input, id = 'ch-1') => ({
  id, name: input.name, type: input.type, url: input.url ?? '', chatId: input.chatId,
  hasToken: Boolean(input.token), enabled: true,
});

ipcMain.handle('app:locate', () => ({ ok: true, install: { version: '1.3.0', cliPath: 'stub-pi', nodePath: 'node', agentDir: path.join(root, '.smoke', 'agent') } }));
ipcMain.handle('app:projects', () => ({
  ok: true,
  projects: [
    { path: 'C:\\src\\demo', name: 'Demo', lastUsed: Date.now() - 3600e3, exists: true },
    { path: 'C:\\old\\missing', name: '旧项目', lastUsed: Date.now() - 86400e3, exists: false },
  ],
}));
ipcMain.handle('app:set-locale', () => ({ ok: true, locale: 'zh-CN' }));
ipcMain.handle('project:import-candidates', () => ({
  ok: true,
  projects: [
    { source: 'VS Code', name: 'Imported Demo', path: 'C:\\src\\imported', lastUsed: Date.now() - 7200e3 },
    { source: 'Cursor', name: 'Cursor Demo', path: 'C:\\src\\cursor-demo', lastUsed: Date.now() - 86400e3 },
  ],
}));
ipcMain.handle('project:remember', (_e, paths) => { record('rememberProjects', paths); return { ok: true, added: paths.length }; });
ipcMain.handle('app:open-path', (_e, target) => { record('openPath', target); return { ok: true }; });
ipcMain.handle('app:open-vscode', () => ({ ok: true }));
ipcMain.handle('tools:open-app', (_e, id, target) => { record('openApp', { id, target }); return { ok: true }; });
ipcMain.handle('env:probe', () => ({
  platform: process.platform,
  node: { ok: true, path: 'node', version: '24.0.0' },
  npm: { ok: true, path: 'npm', version: '11.0.0' },
  pi: { ok: true, version: '1.3.0', cliPath: 'pi', source: 'managed' },
}));
ipcMain.handle('env:install-pi', () => ({ ok: true, installed: false, version: '1.3.0' }));
ipcMain.handle('app:create-shortcut', () => ({ ok: true, path: 'shortcut' }));
ipcMain.handle('pi:inspect-models', () => ({
  ok: true,
  report: {
    settingsPath: '', modelsPath: '', storePath: '', defaultProvider: 'demo', defaultModel: 'demo-model',
    relayProviders: [], providers: [], models: [
      { provider: 'demo', id: 'demo-model', name: 'Demo Model', reasoning: false, contextWindow: 128000, relay: false, current: true, free: false },
      { provider: 'demo', id: 'demo-mini', name: 'Demo Mini', reasoning: true, contextWindow: 32000, relay: false, current: false, free: false },
      { provider: 'other', id: 'other-max', name: 'Other Max', reasoning: true, contextWindow: 200000, relay: false, current: false, free: false },
      { provider: 'local', id: 'local-free', name: 'Local Free', reasoning: false, contextWindow: 32000, relay: false, current: false, free: true, freeReason: 'local' },
    ], warnings: [],
  },
}));
ipcMain.handle('pi:providers', () => ({ ok: true, report: { providers: [], warnings: [] } }));
ipcMain.handle('pi:inspect-capabilities', () => ({ ok: true, report: { capabilities: [], warnings: [] } }));
ipcMain.handle('pi:sessions', () => ({
  ok: true,
  sessions: [
    { id: 'session-today-0001', path: path.join(root, '.smoke', 'session-today.jsonl'), timestamp: new Date().toISOString(), cwd: root, size: 2048 },
    { id: 'session-old-0002', path: path.join(root, '.smoke', 'session-old.jsonl'), timestamp: new Date(Date.now() - 10 * 86400e3).toISOString(), cwd: root, size: 4096 },
  ],
}));
ipcMain.handle('pi:live', () => ({ ok: true, sessions: [] }));
ipcMain.handle('project:git-status', () => ({ ok: true, repo: true, branch: 'main', ahead: 0, behind: 0, changes: [] }));
ipcMain.handle('pi:add-skill', (_e, input) => { record('addSkill', input); return { ok: true, path: '.pi/skills/demo/SKILL.md' }; });
ipcMain.handle('pi:add-mcp', (_e, input) => { record('addMcp', input); return { ok: true, path: '.pi/mcp.json' }; });
ipcMain.handle('catalog:list', () => ({ ok: true, catalog: { vendors, skills, mcps, extensions } }));
ipcMain.handle('catalog:search-mcp', (_e, query) => { record('searchMcp', query); return { ok: true, results: registry }; });
ipcMain.handle('catalog:search-extensions', (_e, query) => { record('searchExtensions', query); return { ok: true, results: extensions }; });
ipcMain.handle('catalog:install-extension', (_e, name) => { record('installExtension', name); return { ok: true, output: 'ok' }; });
ipcMain.handle('catalog:import-skill-url', (_e, input) => { record('importSkill', input); return { ok: true, path: '.pi/skills/demo/SKILL.md' }; });
ipcMain.handle('pi:remove-skill', (_e, input) => { record('removeSkill', input); return { ok: true, path: '.pi/skills/demo/SKILL.md' }; });
ipcMain.handle('tools:list-apps', (_e, refresh) => { record('listApps', refresh); return { ok: true, apps: localApps }; });
ipcMain.handle('usage:report', (_e, cwd) => {
  record('usageReport', cwd);
  return {
    ok: true,
    sessions: [{
      id: 'session-demo-1', path: 'C:\\sessions\\demo.jsonl',
      startedAt: '2026-10-17T01:00:00.000Z', updatedAt: '2026-10-17T02:00:00.000Z', size: 2048,
      cacheHitRate: 0.6,
      totals: { input: 2000, output: 1500, cacheRead: 3000, cacheWrite: 400, totalTokens: 6900, cost: 0.12, requests: 4 },
      models: [{ provider: 'demo', model: 'mini', input: 2000, output: 1500, cacheRead: 3000, cacheWrite: 400, totalTokens: 6900, cost: 0.12, requests: 4 }],
    }],
    totals: { input: 2000, output: 1500, cacheRead: 3000, cacheWrite: 400, totalTokens: 6900, cost: 0.12, requests: 4 },
    cacheHitRate: 0.6,
    generatedAt: '2026-10-17T02:00:00.000Z',
  };
});
ipcMain.handle('tools:scan-apps', (_e, refresh) => {
  record('scanApps', refresh);
  return { ok: true, apps: [
    { id: 'scan-demo', name: 'Scanned Tool', kind: 'dev', installed: true, path: 'C:\\Tools\\Scanned.exe', hint: '开始菜单扫描', discovered: true },
    { id: 'discord', name: 'Discord', kind: 'office', installed: false, hint: '开始菜单扫描', discovered: true, installId: 'Discord.Discord' },
  ] };
});
ipcMain.handle('tools:install-app', (_e, id) => { record('installApp', id); return { ok: true, output: 'installed' }; });
ipcMain.handle('tools:list-links', () => ({ ok: true, links: [{ id: 'custom-link-demo', name: '站酷', url: 'https://www.zcool.com.cn' }] }));
ipcMain.handle('tools:save-link', (_e, input) => {
  record('saveLink', input);
  return { ok: true, link: { id: 'custom-link-new', name: input.name, url: input.url } };
});
ipcMain.handle('tools:remove-link', (_e, id) => { record('removeLink', id); return { ok: true }; });
ipcMain.handle('tools:pick-app-exe', () => ({ ok: true, path: 'C:\\Tools\\NewTool.exe' }));
ipcMain.handle('tools:save-app', (_e, input) => {
  record('saveApp', input);
  return {
    ok: true,
    app: {
      id: 'custom-app-new', name: input.name, kind: input.kind, installed: true,
      path: input.path, hint: input.hint ?? '', custom: true,
    },
  };
});
ipcMain.handle('tools:remove-app', (_e, id) => { record('removeApp', id); return { ok: true }; });
ipcMain.handle('tools:get-settings', () => ({
  ok: true,
  settings: { webSearch: true, crawl: false, reverse: false, searchProvider: 'duckduckgo', searxngUrl: '' },
}));
ipcMain.handle('tools:save-settings', (_e, input) => { record('saveToolSettings', input); return { ok: true, settings: input }; });
ipcMain.handle('tools:search', (_e, query) => {
  record('searchWeb', query);
  return {
    ok: true,
    results: [
      { title: 'Pi Workbench release notes', url: 'https://example.com/pi', snippet: 'Latest desktop client changes.' },
      { title: 'Agent orchestration guide', url: 'https://example.com/agents', snippet: 'How supervisors assign work.' },
    ],
  };
});
ipcMain.handle('tools:search-repos', (_e, query) => {
  record('searchRepos', query);
  return {
    ok: true,
    results: [{
      name: 'pi-agent', fullName: 'example/pi-agent', url: 'https://github.com/example/pi-agent',
      description: 'Desktop workbench for Pi', stars: 1200, forks: 80, language: 'TypeScript',
      updatedAt: '2026-10-01T00:00:00.000Z', topics: ['desktop', 'agent'], license: 'MIT',
    }],
  };
});
ipcMain.handle('tools:search-code', (_e, query) => {
  record('searchCode', query);
  return {
    ok: true,
    results: [{
      repo: 'example/pi-agent', path: 'src/main.ts', url: 'https://github.com/example/pi-agent/blob/main/src/main.ts',
      snippet: 'const app = createWorkbench();',
    }],
  };
});
ipcMain.handle('usage:apply-savings', () => {
  record('applyTokenSavings', true);
  return { ok: true, path: 'C:\\Users\\demo\\.pi\\agent\\settings.json', backup: 'settings.json.bak', applied: {} };
});
ipcMain.handle('tools:fetch-page', (_e, url) => {
  record('fetchPage', url);
  return { ok: true, page: { url, title: 'Example page', text: 'Example body text' } };
});
ipcMain.handle('tools:crawl', (_e, url) => {
  record('crawlWeb', url);
  return { ok: true, pages: [{ url, title: 'Example page', text: 'Example body text' }], links: [] };
});
ipcMain.handle('tools:analyze', (_e, target) => {
  record('analyzePath', target);
  return { ok: true, lines: ['类型：目录', `路径：${target}`, '文件数：12'] };
});
ipcMain.handle('tools:pick-analyze-path', () => ({ ok: true, path: 'C:\\src\\demo' }));
ipcMain.handle('app:open-user-data', () => ({ ok: true }));
ipcMain.handle('agents:list', () => ({ ok: true, agents }));
ipcMain.handle('agents:suggest-team', (_e, task) => {
  record('suggestTeam', task);
  return { taskKind: 'general', members: ['claude', 'codex'], supervisorId: 'codex', reason: '冒烟自动组队' };
});
ipcMain.handle('agents:install', (_e, agentId) => { record('installAgent', agentId); return { ok: true, agentId, output: 'installed' }; });
ipcMain.handle('agents:open-app', (_e, agentId, cwd) => { record('openAgentApp', { agentId, cwd }); return { ok: true }; });
ipcMain.handle('agents:pick-command', () => ({ ok: true, path: 'C:\\Tools\\agent.exe' }));
ipcMain.handle('agents:save-custom', (_e, input) => {
  record('saveCustomAgent', input);
  return { ok: true, agent: { ...agents[0], id: 'custom-demo', name: input.name, custom: true } };
});
ipcMain.handle('agents:remove-custom', (_e, id) => { record('removeCustomAgent', id); return { ok: true }; });
ipcMain.handle('agents:run', () => ({ ok: false, runId: '', summary: '', error: 'stub' }));
ipcMain.handle('agents:stop', () => ({ ok: true }));
ipcMain.handle('agents:team', (_e, input) => {
  record('runTeam', input);
  return {
    ok: true,
    summaries: input.agentIds.map((agentId) => ({ agentId, ok: true, text: `${agentId} 的调研回报` })),
  };
});
ipcMain.handle('automation:list', () => ({ ok: true, jobs: state.jobs, channels: state.channels }));
ipcMain.handle('automation:save-job', (_e, input, id) => {
  record('saveJob', input);
  const saved = job(input, id || 'job-1');
  state.jobs = [saved];
  return { ok: true, job: saved };
});
ipcMain.handle('automation:save-channel', (_e, input, id) => {
  record('saveChannel', input);
  const saved = channel(input, id || 'ch-1');
  state.channels = [saved];
  return { ok: true, channel: saved };
});
ipcMain.handle('automation:delete-job', () => ({ ok: true }));
ipcMain.handle('automation:toggle-job', () => ({ ok: true }));
ipcMain.handle('automation:run-job', () => ({ ok: true, message: 'ok' }));
ipcMain.handle('automation:delete-channel', () => ({ ok: true }));
ipcMain.handle('automation:test-channel', () => ({ ok: true, message: 'ok' }));
ipcMain.handle('pi:fetch-provider-models', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:pick', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:clipboard-image', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:allow', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:open-external', () => ({ ok: true }));
ipcMain.handle('clipboard:read', () => '');
ipcMain.handle('clipboard:write', () => undefined);
ipcMain.handle('shell:open-external', (_e, url) => { record('openExternal', url); return { ok: true }; });

const emptyRules = { fileRead: 'allow', fileWrite: 'ask', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' };
ipcMain.handle('permissions:get', (_e, cwd) => ({ ok: true, path: path.join(cwd, '.pi', 'workbench-permissions.json'),
  permissions: { version: 1, project: cwd, updatedAt: '', rules: emptyRules, allowPaths: [], denyPaths: [], workspaceOnly: true, autoApprove: false } }));
ipcMain.handle('permissions:save', (_e, input) => { record('savePermissions', input);
  return { ok: true, permissions: { version: 1, project: input.cwd, updatedAt: new Date().toISOString(), rules: input.rules, allowPaths: input.allowPaths ?? [], denyPaths: input.denyPaths ?? [], workspaceOnly: input.workspaceOnly !== false, autoApprove: input.autoApprove === true } }; });
ipcMain.handle('permissions:guard-status', () => ({ installed: false, path: 'C:\\Users\\smoke\\.pi\\agent\\extensions\\workbench-permissions.ts' }));
ipcMain.handle('permissions:guard', () => ({ ok: true, installed: true, path: 'C:\\Users\\smoke\\.pi\\agent\\extensions\\workbench-permissions.ts' }));
ipcMain.handle('archives:list', (_e, cwd) => ({ ok: true, archives: [{
  id: '20260101-000000-abcdef', label: 'smoke snapshot', project: cwd, createdAt: '2026-01-01T00:00:00.000Z',
  branch: 'main', head: 'abc1234', changedFiles: 2, untrackedFiles: 1, patchBytes: 1200, untrackedBytes: 300,
}] }));
ipcMain.handle('archives:create', (_e, input) => { record('createArchive', input); return { ok: true, archive: {
  id: '20260101-000000-abcdef', label: input.label || 'snapshot', project: input.cwd, createdAt: new Date().toISOString(),
  branch: 'main', head: 'abc1234', changedFiles: 1, untrackedFiles: 0, patchBytes: 100, untrackedBytes: 0,
} }; });
ipcMain.handle('archives:restore', (_e, input) => { record('restoreArchive', input); return { ok: true, touched: ['a.ts'] }; });
ipcMain.handle('archives:delete', (_e, input) => { record('deleteArchive', input); return { ok: true }; });
ipcMain.handle('memory:stats', (_e, cwd) => ({ ok: true, entries: 4, projects: 1, projectEntries: cwd ? 4 : 0,
  updatedAt: '2026-01-01T00:00:00.000Z', bytes: 512, path: 'C:\\Users\\smoke\\.pi\\agent\\workbench-memory\\entries.jsonl' }));
ipcMain.handle('memory:recent', () => [{ id: 'm1', project: '', sessionId: 's1', role: 'user',
  timestamp: '2026-01-01T00:00:00.000Z', text: '历史决策：使用本地记忆', score: 0, snippet: '历史决策：使用本地记忆' }]);
ipcMain.handle('memory:ingest', () => ({ ok: true, added: 0 }));
ipcMain.handle('memory:search', () => ({ ok: true, hits: [], scanned: 0 }));
ipcMain.handle('memory:install-skill', () => ({ ok: true, path: 'C:\\Users\\smoke\\.pi\\agent\\skills\\workbench-memory' }));
ipcMain.handle('habits:record', (_e, input) => { record('recordHabit', input); return { ok: true }; });
ipcMain.handle('habits:summary', () => ({ ok: true, updatedAt: '2026-01-01T00:00:00.000Z',
  top: [{ type: 'model', value: 'openai/gpt-5', count: 3, lastAt: '2026-01-01T00:00:00.000Z' },
    { type: 'permission', value: '完全自动', count: 2, lastAt: '2026-01-01T00:00:00.000Z' }],
  profilePath: 'C:\\Users\\smoke\\.pi\\agent\\workbench-memory\\profile.md' }));
ipcMain.handle('update:settings', () => ({ autoCheck: false, autoDownload: false }));
ipcMain.handle('update:save-settings', (_e, input) => input);
ipcMain.handle('update:check', () => ({ ok: true,
  app: { current: '1.0.0', latest: '1.1.0', hasUpdate: true, url: 'https://example.com/releases', notes: '', publishedAt: '2026-01-01T00:00:00.000Z',
    asset: { name: 'Pi-Workbench-Setup.exe', url: 'https://example.com/Pi-Workbench-Setup.exe', size: 1024 } },
  pi: { current: '1.0.0', latest: '1.0.0', hasUpdate: false }, checkedAt: '2026-01-01T00:00:00.000Z' }));
ipcMain.handle('update:download', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('env:setup', () => ({ ok: true, installed: false, version: '1.0.0', steps: [] }));
ipcMain.handle('env:update-pi', () => ({ ok: true, installed: true, version: '1.0.0' }));


const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

async function run() {
  const window = new BrowserWindow({
    width: 1500, height: 950, show: true, backgroundColor: '#111517',
    webPreferences: {
      preload: path.join(root, 'dist', 'main', 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
    },
  });
  const page = window.webContents;
  const js = async (expr) => {
    try {
      return await page.executeJavaScript(expr);
    } catch (error) {
      console.log('FAILED EXPR:', String(expr).slice(0, 160), String(error));
      throw error;
    }
  };
  page.on('console', (_e, level, message) => console.log('[renderer]', level, message));
  page.on('render-process-gone', (_e, details) => console.log('renderer gone', JSON.stringify(details)));
  page.on('unresponsive', () => console.log('renderer unresponsive'));
  await window.loadFile(path.join(root, 'dist', 'renderer', 'index.html'), { query: { smokeCwd: root } });
  await wait(1200);

  const projectState = JSON.parse(await js(`JSON.stringify({
    items: document.querySelectorAll('#recent-projects .project-node').length,
    missing: document.querySelectorAll('#recent-projects .project-node.missing').length,
    names: [...document.querySelectorAll('#recent-projects .project-name')].map((el) => el.textContent),
  })`));
  expect(projectState.items >= 2, `project tree groups rendered (${projectState.items})`);
  expect(projectState.missing >= 1, `invalid project path marked (${projectState.missing})`);
  expect(projectState.names.includes('旧项目'), `project names rendered (${projectState.names})`);

  // 项目工具已迁入左侧栏：权限 / 存档 / 记忆 / 托管；更新在设置
  const dockState = JSON.parse(await js(`JSON.stringify({
    tabs: document.querySelectorAll('.dock-tab').length,
    inSidebar: Boolean(document.querySelector('#project-dock')?.closest('.sidebar')),
    permFields: document.querySelectorAll('#perm-grid .perm-field').length,
    presets: document.querySelectorAll('#perm-presets .perm-preset').length,
    presetChecked: [...document.querySelectorAll('#perm-presets .perm-preset')]
      .filter((el) => el.getAttribute('aria-checked') === 'true').map((el) => el.querySelector('strong')?.textContent),
    advancedOpen: document.getElementById('perm-advanced').open,
    guardState: document.getElementById('perm-guard-state').textContent,
    archives: document.querySelectorAll('#archive-list .archive-item').length,
    memories: document.querySelectorAll('#memory-results .memory-hit').length,
    permStatus: document.getElementById('perm-status').textContent,
    resizer: Boolean(document.getElementById('dock-resizer')),
    workspaceOnly: document.getElementById('perm-workspace-only')?.checked,
    autoApprove: document.getElementById('perm-auto-approve')?.checked,
    shortcutInSettings: Boolean(document.getElementById('create-shortcut')?.closest('#pane-settings')),
    memoryScope: document.getElementById('memory-scope')?.value,
    autopilot: Boolean(document.getElementById('autopilot-toggle')),
    habits: document.getElementById('memory-habits')?.textContent,
  })`));
  expect(dockState.tabs === 4, `dock has four tabs (${dockState.tabs})`);
  expect(dockState.inSidebar, 'project tools live in the left sidebar');
  expect(dockState.permFields === 6, `permission grid rendered (${dockState.permFields})`);
  expect(dockState.presets === 6, `permission presets rendered (${dockState.presets})`);
  expect(dockState.presetChecked.join('|') === '标准', `standard preset selected (${dockState.presetChecked})`);
  expect(dockState.advancedOpen === false, 'advanced permission details stay collapsed');
  expect(dockState.guardState.includes('未安装'), `guard status warns when missing (${dockState.guardState})`);
  expect(dockState.archives === 1, `archive list rendered (${dockState.archives})`);
  expect(dockState.memories >= 1, `recent memory rendered (${dockState.memories})`);
  expect(Boolean(dockState.permStatus), 'permission status text present');
  expect(!dockState.resizer, 'dock resizer removed');
  expect(dockState.workspaceOnly === true, 'workspace-only enabled by default');
  expect(dockState.autoApprove === false, 'auto-approve is off by default');
  expect(dockState.shortcutInSettings, 'desktop shortcut action moved into Settings');
  expect(dockState.memoryScope === 'project', `memory defaults to project scope (${dockState.memoryScope})`);
  expect(dockState.autopilot, 'autopilot panel present');
  expect(String(dockState.habits).includes('习惯画像'), `habit profile rendered (${dockState.habits})`);

  await js(`document.querySelectorAll('#perm-presets .perm-preset')[3]?.click()`);
  await wait(300);
  const presetApplied = JSON.parse(await js(`JSON.stringify({
    checked: [...document.querySelectorAll('#perm-presets .perm-preset')]
      .filter((el) => el.getAttribute('aria-checked') === 'true').map((el) => el.querySelector('strong')?.textContent),
    grid: [...document.querySelectorAll('#perm-grid select')].map((el) => el.value),
    workspaceOnly: document.getElementById('perm-workspace-only').checked,
  })`));
  expect(presetApplied.checked.join('|') === '完全自动', `preset click selects full auto (${presetApplied.checked})`);
  expect(presetApplied.grid.every((value) => value === 'allow'), `full auto allows every action (${presetApplied.grid})`);
  expect(presetApplied.workspaceOnly, 'full auto keeps writes inside the project');
  expect(calls.some(([name]) => name === 'savePermissions'), 'preset click saves permissions');
  expect(calls.some(([name]) => name === 'recordHabit'), 'preset click records a habit');

  await js(`document.querySelectorAll('#perm-presets .perm-preset')[4]?.click()`);
  await wait(300);
  const fullAccess = JSON.parse(await js(`JSON.stringify({
    checked: [...document.querySelectorAll('#perm-presets .perm-preset')]
      .filter((el) => el.getAttribute('aria-checked') === 'true').map((el) => el.querySelector('strong')?.textContent),
    workspaceOnly: document.getElementById('perm-workspace-only').checked,
  })`));
  const lastSave = [...calls].reverse().find(([name]) => name === 'savePermissions')?.[1];
  expect(fullAccess.checked.join('|') === '完全访问', `full access preset selectable (${fullAccess.checked})`);
  expect(!fullAccess.workspaceOnly, 'full access lifts the workspace boundary');
  expect(lastSave?.workspaceOnly === false, `full access saves workspaceOnly=false (${JSON.stringify(lastSave?.workspaceOnly)})`);
  await js(`(() => {
    const el = document.getElementById('perm-auto-approve');
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(300);
  const autoSave = [...calls].reverse().find(([name]) => name === 'savePermissions')?.[1];
  expect(autoSave?.autoApprove === true, `auto approve is saved for the project (${JSON.stringify(autoSave?.autoApprove)})`);
  await js(`document.getElementById('perm-reset').click()`);
  await wait(200);
  const afterReset = JSON.parse(await js(`JSON.stringify({
    workspaceOnly: document.getElementById('perm-workspace-only').checked,
    autoApprove: document.getElementById('perm-auto-approve').checked,
    scope: document.getElementById('memory-scope').value,
  })`));
  expect(afterReset.workspaceOnly === true, 'reset restores workspace-only');
  expect(afterReset.autoApprove === false, 'reset turns auto approve off');

  await js(`(() => {
    const scope = document.getElementById('memory-scope');
    scope.value = 'all';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(300);
  const scopeState = JSON.parse(await js(`JSON.stringify({
    stored: localStorage.getItem('pi-workbench-memory-scope'),
    value: document.getElementById('memory-scope').value,
  })`));
  expect(scopeState.stored === 'all' && scopeState.value === 'all', `memory scope persists (${JSON.stringify(scopeState)})`);
  await js(`(() => {
    const scope = document.getElementById('memory-scope');
    scope.value = 'project';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  await js(`document.getElementById('update-check').click()`);
  await wait(500);
  const updateState = JSON.parse(await js(`JSON.stringify({
    inSettings: Boolean(document.getElementById('update-check')?.closest('#pane-settings')),
    items: document.querySelectorAll('#update-list .update-item').length,
    downloadVisible: !document.getElementById('update-download').hidden,
  })`));
  expect(updateState.inSettings, 'update controls live in the settings pane');
  expect(updateState.items === 2, `update list shows app and Pi (${updateState.items})`);
  expect(updateState.downloadVisible, 'download button appears when an asset exists');

  // 从其他编辑器导入最近项目
  await js(`document.getElementById('import-projects-drawer').open = true`);
  await wait(400);
  const importState = JSON.parse(await js(`JSON.stringify({
    items: document.querySelectorAll('#import-project-list .import-item').length,
    sources: [...document.querySelectorAll('#import-project-list .app-tag')].map((el) => el.textContent),
  })`));
  expect(importState.items === 2, `import candidates rendered (${importState.items})`);
  expect(importState.sources.includes('VS Code'), 'import candidate keeps source label');
  await js(`(() => {
    document.querySelectorAll('#import-project-list input[type=checkbox]').forEach((box) => { box.checked = true; });
    document.getElementById('import-projects-apply').click();
    return true;
  })()`);
  await wait(300);
  expect(
    calls.some(([name, input]) => name === 'rememberProjects' && input.length === 2),
    'import selected projects calls backend',
  );

  // 会话：按今天/更早分组
  await js(`document.getElementById('tab-session').click()`);
  await wait(500);
  const sessionState = JSON.parse(await js(`JSON.stringify({
    groups: document.querySelectorAll('#session-list .session-group').length,
    labels: [...document.querySelectorAll('#session-list .session-group .app-group-head span:first-child')].map((el) => el.textContent),
    items: document.querySelectorAll('#session-list .session-items .item').length,
  })`));
  expect(sessionState.groups === 2, `sessions grouped by date (${sessionState.groups})`);
  expect(sessionState.labels.filter(Boolean).length === 2, `session groups labeled (${sessionState.labels.join(',')})`);
  expect(sessionState.items === 2, `session items rendered (${sessionState.items})`);

  // 模型面板：国内 / 国外 / 免费三板块 + 厂商分组
  const readGroups = async () => JSON.parse(await js(`JSON.stringify((() => { try { return ({
    groups: [...document.querySelectorAll('#model-list .vendor-group')].map((group) => ({
      name: group.querySelector('.vendor-name')?.textContent,
      count: group.querySelector('.vendor-count')?.textContent,
      expanded: group.querySelector('.vendor-head')?.getAttribute('aria-expanded'),
      models: [...group.querySelectorAll('.vendor-models .item strong')].map((el) => el.textContent),
    })),
  }); } catch (error) { return { error: String(error), stack: error && error.stack }; } })())`));
  const modelView = await readGroups();
  expect(modelView.groups.length === 1, `cn board shows only domestic vendors (${modelView.groups.length})`);
  expect(modelView.groups[0]?.name === 'Demo Labs', `domestic vendor first (${modelView.groups[0]?.name})`);
  expect(modelView.groups[0]?.models.length === 2, 'vendor group lists its models');

  const filterChips = JSON.parse(await js(`JSON.stringify(
    [...document.querySelectorAll('#model-filter [data-model-filter]')].map((el) => ({
      id: el.dataset.modelFilter, text: el.textContent, pressed: el.getAttribute('aria-pressed'),
    })))`));
  expect(filterChips.length === 3, `model filter chips rendered (${filterChips.length})`);
  expect(filterChips.find((chip) => chip.id === 'all')?.text === '全部 2', `all chip counts board models (${filterChips.map((chip) => chip.text).join(',')})`);
  expect(filterChips.find((chip) => chip.id === 'added')?.text === '已添加 1', 'added chip counts saved models');
  expect(filterChips.find((chip) => chip.id === 'available')?.text === '可用 1', 'available chip counts usable models');

  await js(`document.querySelector('[data-model-filter="available"]').click()`);
  await wait(150);
  const availableView = await readGroups();
  expect(availableView.groups.length === 1 && availableView.groups[0]?.models.length === 1,
    `available filter keeps usable models only (${JSON.stringify(availableView.groups)})`);
  expect(availableView.groups[0]?.models[0]?.includes('demo-model'), 'available filter keeps the current model');
  await js(`document.querySelector('[data-model-filter="added"]').click()`);
  await wait(150);
  const addedView = await readGroups();
  expect(addedView.groups[0]?.models.length === 1, 'added filter keeps default model');
  await js(`document.querySelector('[data-model-filter="all"]').click()`);
  await wait(150);

  await js(`document.querySelector('.board-tab[data-board="global"]').click()`);
  await wait(150);
  const globalView = await readGroups();
  expect(globalView.groups.length === 1 && globalView.groups[0]?.name === 'Other AI', `global board isolates overseas models (${globalView.groups.map((group) => group.name).join(',')})`);

  await js(`document.querySelector('.board-tab[data-board="free"]').click()`);
  await wait(150);
  const freeView = await readGroups();
  expect(freeView.groups.length === 1, `free board renders free models (${freeView.groups.length})`);
  expect(freeView.groups[0]?.models.some((name) => String(name).includes('local-free')), 'free model listed on free board');

  await js(`document.querySelector('.board-tab[data-board="cn"]').click()`);
  await wait(150);
  await js(`document.querySelector('#model-list .vendor-head').click()`);
  await wait(100);
  const collapsed = await js(`JSON.stringify(document.querySelector('#model-list .vendor-models').hidden)`);
  expect(collapsed === 'true', 'vendor collapses on click');

  // 市场：扩展 / 技能 / MCP 三个分类 + 在线目录
  await js(`document.getElementById('tab-market').click()`);
  await wait(500);
  const marketExtensions = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(marketExtensions === '3', `market lists all capabilities by default (${marketExtensions})`);

  await js(`document.querySelector('.market-tab[data-market="skills"]').click()`);
  await wait(300);
  const marketSkills = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(marketSkills === '1', `market lists skills (${marketSkills})`);
  await js(`document.querySelector('#market-list .market-card .primary').click()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'addSkill' && input.name === 'demo-skill'), 'skill install calls backend');

  await js(`document.querySelector('.market-tab[data-market="mcps"]').click()`);
  await wait(200);
  await js(`document.querySelector('#market-list .market-card .primary').click()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'addMcp' && input.name === 'demo-mcp'), 'mcp install calls backend');

  await js(`(() => {
    const input = document.getElementById('market-search');
    input.value = 'demo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  })()`);
  await wait(400);
  const onlineCards = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(onlineCards === '2', `registry search merges results (${onlineCards})`);
  expect(calls.some(([name]) => name === 'searchMcp'), 'registry search calls backend');
  await js(`(() => {
    const buttons = [...document.querySelectorAll('#market-list .market-card .primary')];
    buttons[buttons.length - 1].click();
  })()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'addMcp' && input.name === '-demo-mcp'), 'registry result installs through backend');

  // 自动化：新增任务 + 通道
  await js(`document.getElementById('tab-automation').click()`);
  await wait(300);
  await js(`document.getElementById('new-automation').click()`);
  await js(`(() => {
    document.getElementById('automation-name').value = '晨间检查';
    document.getElementById('automation-interval').value = '30';
    document.getElementById('automation-action').value = 'pi-prompt';
    document.querySelector('#automation-form [id="automation-action"]').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('automation-prompt').value = '检查构建';
    document.getElementById('automation-form').requestSubmit();
  })()`);
  await wait(400);
  const savedJob = calls.find(([name]) => name === 'saveJob')?.[1];
  expect(savedJob?.name === '晨间检查', `job save payload (${JSON.stringify(savedJob)})`);
  expect(savedJob?.schedule?.minutes === 30, 'job interval captured');
  const jobRows = await js(`JSON.stringify(document.querySelectorAll('#automation-list .item').length)`);
  expect(jobRows === '1', `job row rendered (${jobRows})`);

  await js(`document.getElementById('new-channel').click()`);
  await js(`(() => {
    document.getElementById('channel-type').value = 'webhook';
    document.getElementById('channel-name').value = '本地提醒';
    document.getElementById('channel-url').value = 'https://example.com/hook';
    document.getElementById('channel-form').requestSubmit();
  })()`);
  await wait(400);
  const savedChannel = calls.find(([name]) => name === 'saveChannel')?.[1];
  expect(savedChannel?.name === '本地提醒', 'channel save payload');
  const channelRows = await js(`JSON.stringify(document.querySelectorAll('#channel-list .item').length)`);
  expect(channelRows === '1', `channel row rendered (${channelRows})`);

  // 协作：Agent 检测 + 运行
  await js(`document.getElementById('tab-team').click()`);
  await wait(400);
  const agentRows = await js(`JSON.stringify(document.querySelectorAll('#agent-list .item').length)`);
  expect(agentRows === '4', `agent list rendered (${agentRows})`);
  const summary = await js(`JSON.stringify(document.getElementById('team-summary').textContent)`);
  expect(summary.includes('3 / 4'), `agent summary counts installed (${summary})`);
  const desktopTag = await js(`JSON.stringify(document.getElementById('agent-list').textContent.includes('桌面版'))`);
  expect(desktopTag === 'true', 'desktop-only agent is labelled');
  const supervisorOptions = await js(`JSON.stringify(document.querySelectorAll('#team-supervisor option').length)`);
  expect(supervisorOptions === '3', `supervisor lists runnable agents only (${supervisorOptions})`);
  await js(`(() => {
    const dt = new DataTransfer();
    dt.setData('application/x-pi-room', JSON.stringify({ type: 'app', id: 'vscode', name: 'VS Code' }));
    document.getElementById('meeting-room').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  })()`);
  await wait(100);
  const roomChips = await js(`JSON.stringify(document.querySelectorAll('#meeting-room .room-chip').length)`);
  expect(roomChips === '1', `meeting room accepts dropped app (${roomChips})`);
  await js(`(() => {
    document.getElementById('team-task').value = '调研构建链路';
    document.getElementById('run-team').click();
  })()`);
  await wait(500);
  const teamStatus = await js(`JSON.stringify(document.getElementById('team-status').textContent)`);
  expect(teamStatus.includes('协作完成'), `team run completes (${teamStatus})`);
  const teamCall = calls.find(([name]) => name === 'runTeam')?.[1];
  expect(teamCall?.task === '调研构建链路', 'team task payload');
  expect(teamCall?.agentIds.length === 2, 'team selects installed agents');
  expect((teamCall?.apps ?? []).includes('VS Code'), `meeting room apps passed to backend (${JSON.stringify(teamCall?.apps)})`);
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-team.png'), shot.toPNG());
  } catch (error) {
    console.log('team screenshot skipped:', String(error));
  }

  await js(`(() => {
    const mode = document.getElementById('team-supervisor-mode');
    mode.value = 'manual';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    const select = document.getElementById('team-supervisor');
    select.value = 'claude';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('team-task').value = '复核构建脚本';
    document.getElementById('run-team').click();
  })()`);
  await wait(700);
  const manualCalls = calls.filter(([name]) => name === 'runTeam');
  const manualCall = manualCalls[manualCalls.length - 1]?.[1];
  expect(manualCalls.length === 2, `manual supervisor run starts a second team run (${manualCalls.length})`);
  expect(manualCall?.supervisorId === 'claude', `manual supervisor passes through (${manualCall?.supervisorId})`);

  // 搜索与高级工具
  await js(`document.getElementById('tab-search').click()`);
  await wait(200);
  await js(`(() => {
    document.getElementById('search-query').value = 'pi workbench';
    document.getElementById('run-web-search').click();
  })()`);
  await wait(300);
  const searchRows = await js(`JSON.stringify(document.querySelectorAll('#search-results .search-result').length)`);
  expect(searchRows === '2', `web search renders results (${searchRows})`);
  expect(calls.some(([name, query]) => name === 'searchWeb' && query === 'pi workbench'), 'web search calls backend');
  const searchStatus = await js(`JSON.stringify(document.getElementById('search-status').textContent)`);
  expect(searchStatus.includes('2'), `search status reports count (${searchStatus})`);
  await js(`(() => {
    const toggle = document.getElementById('tool-crawl');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(200);
  expect(calls.some(([name, input]) => name === 'saveToolSettings' && input?.crawl === true), 'advanced tool toggle persists');
  await js(`(() => {
    document.getElementById('analyze-path').value = 'C:\\\\src\\\\demo';
    document.getElementById('run-analyze').click();
  })()`);
  await wait(200);
  const analyzeText = await js(`JSON.stringify(document.getElementById('analyze-output').textContent)`);
  expect(analyzeText.includes('文件数'), `reverse analysis renders output (${analyzeText})`);
  expect(calls.some(([name]) => name === 'analyzePath'), 'reverse analysis calls backend');
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-search.png'), shot.toPNG());
  } catch (error) {
    console.log('search screenshot skipped:', String(error));
  }

  // 右侧工作区与本地工具
  await js(`document.getElementById('tab-ws-review').click()`);
  await wait(100);
  const reviewVisible = await js(`JSON.stringify(document.getElementById('pane-ws-review').hidden === false)`);
  expect(reviewVisible === 'true', 'review workspace opens');
  await js(`document.getElementById('tab-ws-interact').click()`);
  await wait(100);
  const interactVisible = await js(`JSON.stringify(document.getElementById('pane-ws-interact').hidden === false)`);
  expect(interactVisible === 'true', 'interact workspace opens');

  await js(`document.getElementById('tab-ws-visual').click()`);
  await wait(300);
  const visualState = JSON.parse(await js(`JSON.stringify({
    visible: document.getElementById('pane-ws-visual').hidden === false,
    cards: document.querySelectorAll('#visual-apps .app-card').length,
    installed: document.querySelectorAll('#visual-apps .app-card:not(.missing)').length,
    groups: document.querySelectorAll('#visual-apps .app-group').length,
    customTagged: document.querySelectorAll('#visual-apps .app-tag').length,
  })`));
  expect(visualState.visible === true, 'visual workspace opens');
  expect(visualState.cards === 4, `visual app cards rendered (${visualState.cards})`);
  expect(visualState.installed === 3, `visual app detects installed tool (${visualState.installed})`);
  expect(visualState.groups === 4, `visual apps grouped by category (${visualState.groups})`);
  expect(visualState.customTagged === 1, `custom app tagged (${visualState.customTagged})`);
  await js(`document.querySelector('#visual-apps .app-card:not(.missing) button').click()`);
  await wait(200);
  expect(calls.some(([name, input]) => name === 'openApp' && input.id === 'premiere'), 'visual launch calls backend with app id');

  await js(`document.getElementById('visual-scan-all').click()`);
  await wait(400);
  const scannedState = JSON.parse(await js(`JSON.stringify({
    cards: document.querySelectorAll('#visual-apps .app-card').length,
    tags: document.querySelectorAll('#visual-apps .app-tag').length,
    tagTexts: [...document.querySelectorAll('#visual-apps .app-tag')].map((el) => el.textContent),
    names: [...document.querySelectorAll('#visual-apps .app-card .app-name')].map((el) => el.textContent),
    installButtons: [...document.querySelectorAll('#visual-apps .app-card button')].filter((b) => b.textContent.includes('一键安装')).length,
  })`));
  expect(calls.some(([name]) => name === 'scanApps'), 'scan all calls backend');
  expect(scannedState.cards === 6, `scanned apps merged (${scannedState.cards})`);
  expect(scannedState.tags === 3, `scanned apps tagged (${scannedState.tags})`);
  expect(scannedState.installButtons === 1, `installable app shows install button (${scannedState.installButtons})`);

  await js(`(() => {
    document.getElementById('custom-link-name').value = '新站点';
    document.getElementById('custom-link-url').value = 'https://example.org';
    document.getElementById('custom-link-save').click();
    return true;
  })()`);
  await wait(200);
  expect(
    calls.some(([name, input]) => name === 'saveLink' && input.url === 'https://example.org'),
    'custom website save calls backend',
  );

  await js(`(() => {
    const input = document.getElementById('visual-app-search');
    input.value = 'blender';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await wait(150);
  const filteredApps = await js(`JSON.stringify(document.querySelectorAll('#visual-apps .app-card').length)`);
  expect(filteredApps === '1', `visual app search filters (${filteredApps})`);
  await js(`(() => {
    const input = document.getElementById('visual-app-search');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

  await js(`(() => { window.confirm = () => true; return true; })()`);
  await js(`document.querySelector('#visual-apps .app-card .danger').click()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'removeApp' && input === 'custom-app-demo'), 'custom app removal calls backend');

  await js(`document.getElementById('visual-add-app').click()`);
  await js(`(() => {
    document.getElementById('custom-app-name').value = '新工具';
    document.getElementById('custom-app-kind').value = 'office';
    document.getElementById('custom-app-path').value = 'C:\\\\Tools\\\\NewTool.exe';
    document.getElementById('custom-app-save').click();
  })()`);
  await wait(400);
  const savedApp = calls.find(([name]) => name === 'saveApp')?.[1];
  expect(savedApp?.name === '新工具' && savedApp?.kind === 'office', `custom app payload (${JSON.stringify(savedApp)})`);
  expect(String(savedApp?.path ?? '').includes('NewTool.exe'), 'custom app path captured');
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-visual.png'), shot.toPNG());
  } catch (error) {
    console.log('visual screenshot skipped:', String(error));
  }

  await js(`document.getElementById('tab-ws-cost').click()`);
  await wait(400);
  const usageState = JSON.parse(await js(`JSON.stringify({
    visible: document.getElementById('pane-ws-cost').hidden === false,
    cards: document.querySelectorAll('#usage-cards .usage-card').length,
    tips: document.querySelectorAll('#usage-tips .usage-tip').length,
    sessions: document.querySelectorAll('#usage-sessions .usage-session').length,
    status: document.getElementById('usage-status').textContent,
  })`));
  expect(usageState.visible === true, 'token usage workspace opens');
  expect(usageState.cards === 4, `usage cards rendered (${usageState.cards})`);
  expect(usageState.tips >= 1, `usage tips rendered (${usageState.tips})`);
  expect(usageState.sessions === 1, `usage sessions listed (${usageState.sessions})`);
  expect(calls.some(([name]) => name === 'usageReport'), 'usage panel calls backend');

  await js(`document.getElementById('tab-settings').click()`);
  await js(`document.querySelector('[data-open-app="vscode"]').click()`);
  await wait(200);
  expect(calls.some(([name, input]) => name === 'openApp' && input.id === 'vscode'), 'local app button calls backend');

  // 截图存档
  try {
    await js(`document.getElementById('tab-model').click()`);
    await wait(300);
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-model.png'), shot.toPNG());
    await js(`document.getElementById('tab-market').click()`);
    await wait(300);
    const shot2 = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-market.png'), shot2.toPNG());
  } catch (error) {
    console.log('screenshot skipped:', String(error));
  }

  writeFileSync(path.join(root, '.smoke', 'workbench-test.json'), JSON.stringify({ failures, calls, modelView }, null, 2));
  console.log(JSON.stringify({ failures, calls: calls.map(([name]) => name) }, null, 2));
  await window.close();
  app.exit(failures.length ? 1 : 0);
}

app.whenReady().then(() => run().catch((error) => {
  console.error(error);
  app.exit(1);
}));
