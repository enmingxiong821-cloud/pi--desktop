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
  { key: 'demo', label: 'Demo Labs', tier: 1, aliases: ['demo'] },
  { key: 'other', label: 'Other AI', tier: 2, aliases: ['other'] },
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
const agents = [
  { id: 'claude', name: 'Claude Code', command: 'claude', description: '', roles: ['实现', '审查'], authHint: '', installHint: '', versionArgs: ['--version'], installed: true, version: '1.2.3' },
  { id: 'codex', name: 'Codex', command: 'codex', description: '', roles: ['蓝图'], authHint: '', installHint: '', versionArgs: ['--version'], installed: true, version: '0.9.0' },
  { id: 'grok', name: 'Grok', command: 'grok', description: '', roles: ['调研'], authHint: '', installHint: 'install grok', versionArgs: ['--version'], installed: false },
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
ipcMain.handle('app:projects', () => ({ ok: true, projects: [] }));
ipcMain.handle('app:set-locale', () => ({ ok: true, locale: 'zh-CN' }));
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
      { provider: 'demo', id: 'demo-model', name: 'Demo Model', reasoning: false, contextWindow: 128000, relay: false, current: true },
      { provider: 'demo', id: 'demo-mini', name: 'Demo Mini', reasoning: true, contextWindow: 32000, relay: false, current: false },
      { provider: 'other', id: 'other-max', name: 'Other Max', reasoning: true, contextWindow: 200000, relay: false, current: false },
    ], warnings: [],
  },
}));
ipcMain.handle('pi:providers', () => ({ ok: true, report: { providers: [], warnings: [] } }));
ipcMain.handle('pi:inspect-capabilities', () => ({ ok: true, report: { capabilities: [], warnings: [] } }));
ipcMain.handle('pi:sessions', () => ({ ok: true, sessions: [] }));
ipcMain.handle('project:git-status', () => ({ ok: true, repo: true, branch: 'main', ahead: 0, behind: 0, changes: [] }));
ipcMain.handle('pi:add-skill', (_e, input) => { record('addSkill', input); return { ok: true, path: '.pi/skills/demo/SKILL.md' }; });
ipcMain.handle('pi:add-mcp', (_e, input) => { record('addMcp', input); return { ok: true, path: '.pi/mcp.json' }; });
ipcMain.handle('catalog:list', () => ({ ok: true, catalog: { vendors, skills, mcps } }));
ipcMain.handle('catalog:search-mcp', (_e, query) => { record('searchMcp', query); return { ok: true, results: registry }; });
ipcMain.handle('agents:list', () => ({ ok: true, agents }));
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

  // 模型面板：厂商分组 + 展开/收起
  const modelView = JSON.parse(await js(`JSON.stringify((() => { try { return ({
    groups: [...document.querySelectorAll('#model-list .vendor-group')].map((group) => ({
      name: group.querySelector('.vendor-name')?.textContent,
      count: group.querySelector('.vendor-count')?.textContent,
      expanded: group.querySelector('.vendor-head')?.getAttribute('aria-expanded'),
      models: [...group.querySelectorAll('.vendor-models .item strong')].map((el) => el.textContent),
    })),
  }); } catch (error) { return { error: String(error), stack: error && error.stack }; } })())`));
  expect(modelView.groups.length === 2, `model groups rendered (${modelView.groups.length})`);
  expect(modelView.groups[0]?.name === 'Demo Labs', `strongest vendor first (${modelView.groups[0]?.name})`);
  expect(modelView.groups[0]?.models.length === 2, 'vendor group lists its models');
  expect(modelView.groups[1]?.name === 'Other AI', 'second vendor follows');

  await js(`document.querySelector('#model-list .vendor-head').click()`);
  await wait(100);
  const collapsed = await js(`JSON.stringify(document.querySelector('#model-list .vendor-models').hidden)`);
  expect(collapsed === 'true', 'vendor collapses on click');

  // 市场：Skill / MCP / 在线目录
  await js(`document.getElementById('tab-market').click()`);
  await wait(400);
  const marketSkills = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(marketSkills === '1', `market lists skills (${marketSkills})`);
  await js(`document.querySelector('#market-list .market-card .primary').click()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'addSkill' && input.name === 'demo-skill'), 'skill install calls backend');

  await js(`document.querySelector('[data-market="mcps"]').click()`);
  await wait(150);
  await js(`document.querySelector('#market-list .market-card .primary').click()`);
  await wait(300);
  expect(calls.some(([name, input]) => name === 'addMcp' && input.name === 'demo-mcp'), 'mcp install calls backend');

  await js(`(() => {
    document.querySelector('[data-market="online"]').click();
    const input = document.getElementById('market-search');
    input.value = 'demo';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  })()`);
  await wait(400);
  const onlineCards = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(onlineCards === '1', `registry search renders results (${onlineCards})`);
  await js(`document.querySelector('#market-list .market-card .primary').click()`);
  await wait(300);
  expect(calls.some(([name]) => name === 'searchMcp'), 'registry search calls backend');

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
  expect(agentRows === '3', `agent list rendered (${agentRows})`);
  const summary = await js(`JSON.stringify(document.getElementById('team-summary').textContent)`);
  expect(summary.includes('2 / 3'), `agent summary counts installed (${summary})`);
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

  // 右侧工作区与本地工具
  await js(`document.getElementById('tab-ws-review').click()`);
  await wait(100);
  const reviewVisible = await js(`JSON.stringify(document.getElementById('pane-ws-review').hidden === false)`);
  expect(reviewVisible === 'true', 'review workspace opens');
  await js(`document.getElementById('tab-ws-interact').click()`);
  await wait(100);
  const interactVisible = await js(`JSON.stringify(document.getElementById('pane-ws-interact').hidden === false)`);
  expect(interactVisible === 'true', 'interact workspace opens');

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
