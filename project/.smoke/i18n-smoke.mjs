import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const calls = [];
const writes = [];
let startOptions = null;
let stopRequested = false;

app.setPath('userData', path.join(root, '.smoke', 'user-data'));
app.disableHardwareAcceleration();

const stubReport = () => ({
  ok: true,
  report: {
    settingsPath: '',
    modelsPath: '',
    storePath: '',
    defaultProvider: 'demo',
    defaultModel: 'demo-model',
    relayProviders: ['demo'],
    providers: [
      {
        id: 'demo',
        name: 'Demo Relay',
        custom: true,
        relay: true,
        modelCount: 2,
        hasStoredKey: true,
        keySource: 'auth.json',
        headerNames: [],
      },
    ],
    models: [
      { provider: 'demo', id: 'demo-model', name: 'Demo Model', reasoning: false, contextWindow: 128000, relay: true, current: true },
      { provider: 'demo', id: 'mini', name: 'Mini', reasoning: true, contextWindow: 32000, relay: true, current: false },
    ],
    warnings: [],
  },
});

ipcMain.handle('app:locate', () => ({
  ok: true,
  install: {
    version: '1.3.0',
    cliPath: 'stub-pi',
    nodePath: 'C:/node/node.exe',
    agentDir: path.join(root, '.smoke', 'agent'),
  },
}));
ipcMain.handle('app:projects', () => ({ ok: true, projects: [] }));
ipcMain.handle('env:probe', () => ({
  platform: process.platform,
  node: { ok: true, path: 'C:\\nodejs\\node.exe', version: '24.0.0' },
  npm: { ok: true, path: 'C:\\nodejs\\npm.cmd', version: '11.0.0' },
  pi: { ok: true, version: '1.3.0', cliPath: 'C:\\pi\\cli.js', source: 'managed' },
}));
ipcMain.handle('env:install-pi', () => ({ ok: true, installed: false, version: '1.3.0' }));
ipcMain.handle('app:create-shortcut', () => ({ ok: true, path: 'C:\\Desktop\\Pi.lnk' }));
ipcMain.handle('app:set-locale', (_event, locale) => {
  calls.push(['setLocale', locale]);
  return { ok: true, locale };
});
ipcMain.handle('pi:inspect-models', () => stubReport());
ipcMain.handle('pi:providers', () => ({
  ok: true,
  report: { providers: [], warnings: [] },
}));
ipcMain.handle('pi:inspect-capabilities', () => ({ ok: true, report: { capabilities: [], warnings: [] } }));
ipcMain.handle('pi:sessions', () => ({ ok: true, sessions: [] }));
ipcMain.handle('project:git-status', () => ({
  ok: true,
  repo: true,
  branch: 'main',
  ahead: 1,
  behind: 0,
  changes: [{ code: ' M', path: 'src/app.ts' }, { code: '??', path: 'notes.md' }],
}));
ipcMain.handle('app:open-path', () => ({ ok: true }));
ipcMain.handle('app:open-vscode', () => ({ ok: true }));
ipcMain.handle('pi:add-skill', () => ({ ok: true, path: '.pi/skills/demo/SKILL.md' }));
ipcMain.handle('pi:add-mcp', () => ({ ok: true, path: '.pi/mcp.json' }));
ipcMain.handle('pi:start', (_event, options) => {
  startOptions = options;
  return { ok: true, isolatedDir: path.join(root, '.smoke', 'agent'), isolated: Boolean(options?.isolated), install: { version: '1.3.0' } };
});
ipcMain.handle('pi:stop', () => {
  stopRequested = true;
  return { ok: true };
});
ipcMain.handle('pi:live', () => ({ ok: true, sessions: [] }));
ipcMain.handle('habits:record', () => ({ ok: true }));
ipcMain.handle('habits:summary', () => ({ ok: true, updatedAt: '', top: [] }));
ipcMain.on('pi:write', (_event, data) => writes.push(typeof data === 'string' ? data : data?.data));
ipcMain.handle('pi:fetch-provider-models', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:pick', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:clipboard-image', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:allow', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('media:open-external', () => ({ ok: true }));
ipcMain.handle('clipboard:read', () => '');
ipcMain.handle('clipboard:write', () => undefined);
ipcMain.handle('shell:open-external', () => ({ ok: true }));
ipcMain.handle('permissions:get', () => ({ ok: true, path: '.pi/workbench-permissions.json',
  permissions: { rules: { fileRead: 'allow', fileWrite: 'ask', shell: 'ask', network: 'ask', gitWrite: 'ask', packageInstall: 'deny' }, allowPaths: [], denyPaths: [] } }));
ipcMain.handle('permissions:save', (_event, input) => ({ ok: true, path: '.pi/workbench-permissions.json', permissions: { rules: input.rules, allowPaths: input.allowPaths ?? [], denyPaths: input.denyPaths ?? [] } }));
ipcMain.handle('permissions:guard-status', () => ({ installed: false, path: 'C:\\Users\\smoke\\.pi\\agent\\extensions\\workbench-permissions.ts' }));
ipcMain.handle('permissions:guard', () => ({ ok: true, installed: true, path: 'C:\\Users\\smoke\\.pi\\agent\\extensions\\workbench-permissions.ts' }));
ipcMain.handle('app:defaults', () => ({
  version: 1, permissionPreset: 'standard', autoApprove: false, workspaceOnly: true,
  model: '', thinking: '', memorySkill: true,
}));
ipcMain.handle('app:defaults-save', (_event, input) => ({
  ok: true, defaults: {
    version: 1, permissionPreset: 'standard', autoApprove: false, workspaceOnly: true,
    model: '', thinking: '', memorySkill: true, ...input,
  },
}));
ipcMain.handle('project:config', (_event, cwd) => ({
  ok: true, path: `${cwd}/.pi/workbench.json`,
  config: { version: 1, project: cwd, updatedAt: '', model: '', thinking: '', autoStart: null },
  env: {},
}));
ipcMain.handle('project:config-save', (_event, input) => ({
  ok: true, path: `${input.cwd}/.pi/workbench.json`,
  config: { version: 1, project: input.cwd, updatedAt: new Date().toISOString(), model: input.model ?? '', thinking: input.thinking ?? '', autoStart: null },
  env: input.env ?? {},
}));
ipcMain.handle('archives:list', () => ({ ok: true, archives: [] }));
ipcMain.handle('archives:create', () => ({ ok: true }));
ipcMain.handle('archives:restore', () => ({ ok: true }));
ipcMain.handle('archives:delete', () => ({ ok: true }));
ipcMain.handle('memory:stats', () => ({ ok: true, entries: 0, projects: 0, projectEntries: 0, bytes: 0 }));
ipcMain.handle('memory:recent', () => []);
ipcMain.handle('memory:ingest', () => ({ ok: true, added: 0 }));
ipcMain.handle('memory:search', () => ({ ok: true, hits: [], scanned: 0 }));
ipcMain.handle('memory:install-skill', () => ({ ok: true, path: 'C:\\Users\\smoke\\.pi\\agent\\skills\\workbench-memory' }));
ipcMain.handle('update:settings', () => ({ autoCheck: false, autoDownload: false }));
ipcMain.handle('update:save-settings', (_event, input) => input);
ipcMain.handle('update:check', () => ({ ok: true, app: { current: '1.0.0', latest: '1.0.0', hasUpdate: false, url: '', notes: '', publishedAt: '' }, pi: { current: '1.0.0', latest: '1.0.0', hasUpdate: false }, settings: { autoCheck: false, autoDownload: false }, checkedAt: new Date().toISOString() }));
ipcMain.handle('update:download', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('env:setup', () => ({ ok: true, installed: false, version: '1.3.0', steps: [] }));
ipcMain.handle('env:update-pi', () => ({ ok: true, installed: true, version: '1.3.0' }));
ipcMain.handle('catalog:list', () => ({
  ok: true,
  catalog: { vendors: [], skills: [], mcps: [] },
  agents: [],
}));
ipcMain.handle('catalog:search-mcp', () => ({ ok: true, results: [] }));
ipcMain.handle('agents:list', () => ({ ok: true, agents: [] }));
ipcMain.handle('agents:run', () => ({ ok: false, runId: '', summary: '', error: 'stub' }));
ipcMain.handle('agents:stop', () => ({ ok: true }));
ipcMain.handle('agents:team', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('automation:list', () => ({ ok: true, jobs: [], channels: [] }));
ipcMain.handle('automation:save-job', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('automation:delete-job', () => ({ ok: true }));
ipcMain.handle('automation:toggle-job', () => ({ ok: true }));
ipcMain.handle('automation:run-job', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('automation:save-channel', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('automation:delete-channel', () => ({ ok: true }));
ipcMain.handle('automation:test-channel', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('tools:open-app', () => ({ ok: true }));
ipcMain.handle('tools:list-links', () => ({ ok: true, links: [] }));
ipcMain.handle('tools:list-apps', () => ({ ok: true, apps: [] }));
ipcMain.handle('tools:get-settings', () => ({ ok: true, settings: {} }));
ipcMain.handle('tools:tool-status', () => [
  { id: 'trafilatura', label: 'trafilatura', installed: false, installable: true, source: 'uv' },
]);
ipcMain.handle('catalog:search-extensions', () => ({ ok: true, results: [] }));
ipcMain.handle('agents:suggest-team', () => ({ ok: false, error: 'stub' }));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const expectText = expect;

async function run() {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    backgroundColor: '#111517',
    webPreferences: {
      preload: path.join(root, 'dist', 'main', 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  const page = window.webContents;
  page.on('console', (_event, level, message) => console.log('[renderer]', level, message));
  page.on('render-process-gone', (_event, details) => console.log('renderer gone', JSON.stringify(details)));
  page.on('unresponsive', () => console.log('renderer unresponsive'));
  const load = async () => {
    await window.loadFile(path.join(root, 'dist', 'renderer', 'index.html'), {
      query: { smokeCwd: root },
    });
    await wait(1200);
  };
  await load();
  console.log('step: loaded');
  await page.executeJavaScript('localStorage.clear()');
  await load();
  console.log('step: reloaded clean');

  const snapshot = () => `(() => {
    try {
    const text = (id) => document.getElementById(id)?.textContent ?? '';
    const rows = [...document.querySelectorAll('#module-list .module-item')];
    return {
      lang: document.documentElement.lang,
      title: document.title,
      brand: document.querySelector('.brand strong')?.textContent,
      tabs: [...document.querySelectorAll('.nav-list button[role=tab]')].map((el) => el.textContent.trim()),
      state: text('process-state'),
      model: text('active-model'),
      version: text('pi-version'),
      cwd: text('cwd-label'),
      path: text('project-path'),
      isolated: text('isolated-path'),
      modeNote: text('mode-note'),
      hint: text('terminal-hint'),
      composerPlaceholder: document.getElementById('composer-input')?.placeholder,
      searchPlaceholder: document.getElementById('model-search')?.placeholder,
      localeSelect: document.getElementById('language-select')?.value,
      storedLocale: localStorage.getItem('pi-locale'),
      preview: text('command-preview'),
      modelSummary: text('model-summary'),
      modelNote: [...document.querySelectorAll('#pane-model .note')]
        .find((node) => /按常用度排序|Sorted by popularity/.test(node.textContent ?? ''))?.textContent,
      providerNote: document.querySelector('#pane-provider .note[data-i18n-html]')?.textContent,
      paletteHint: document.querySelector('#command-palette .note')?.textContent,
      mediaHint: document.querySelector('#media-preview .media-preview-hint')?.textContent,
      alertHidden: document.getElementById('terminal-alert')?.hidden,
      moduleRows: rows.map((row) => row.textContent),
      moduleButtons: rows[0] ? [...rows[0].querySelectorAll('.item-actions button')].map((el) => el.textContent) : [],
      moduleBindingLabel: document.querySelector('.module-binding > span')?.textContent,
      moduleBindingValue: document.getElementById('project-module')?.value,
      moduleBindingOptions: [...(document.getElementById('project-module')?.options ?? [])].map((el) => el.textContent),
      moduleBindingDisabled: document.getElementById('project-module')?.disabled,
    };
    } catch (error) { return { snapshotError: String(error && error.stack || error) }; }
  })()`;
  const moduleInfo = () => `(() => {
    const rows = [...document.querySelectorAll('#module-list .module-item')];
    return {
      rows: rows.map((row) => row.textContent),
      buttons: rows[0] ? [...rows[0].querySelectorAll('.item-actions button')].map((el) => el.textContent) : [],
      formHidden: document.getElementById('module-form').hidden,
      formNote: document.querySelector('.module-head .summary')?.textContent,
      modelOptions: [...document.getElementById('module-model').options].map((el) => ({ value: el.value, text: el.textContent })),
      bindingLabel: document.querySelector('.module-binding > span')?.textContent,
      bindingValue: document.getElementById('project-module').value,
      bindingOptions: [...document.getElementById('project-module').options].map((el) => ({ value: el.value, text: el.textContent })),
      bindingDisabled: document.getElementById('project-module').disabled,
      storedModules: JSON.parse(localStorage.getItem('pi-model-modules') || '[]'),
      storedBindings: JSON.parse(localStorage.getItem('pi-project-models') || '{}'),
      preview: document.getElementById('command-preview')?.textContent,
      toast: document.getElementById('toast')?.textContent,
    };
  })()`;

  const taskInfo = () => `(() => ({
    status: document.getElementById('task-status')?.textContent ?? '',
    gitItems: [...document.querySelectorAll('#git-list .git-item')].map((el) => el.textContent),
    gitHead: document.querySelector('#git-list .git-head')?.textContent ?? '',
    todoEmpty: document.querySelector('#todo-list .empty')?.textContent ?? '',
  }))()`;

  console.log('step: zh snapshot');
  const zhData = await page.executeJavaScript(snapshot());
  writeFileSync(path.join(root, '.smoke', 'i18n-zh.json'), JSON.stringify(zhData, null, 2));
  const zhSnap = zhData;

  // task pane: git status + todo list
  await page.executeJavaScript(`document.getElementById('tab-ws-review').click()`);
  await wait(500);
  const task = await page.executeJavaScript(taskInfo());
  console.log('task pane:', JSON.stringify(task));
  expect(task.gitItems.length === 2, `task pane lists git changes (${task.gitItems.length})`);
  expect(task.gitHead.includes('main'), `task pane shows branch (${task.gitHead})`);
  expect(task.todoEmpty.includes('还没有任务'), `task pane todo empty state (${task.todoEmpty})`);
  await page.executeJavaScript(`(() => {
    document.getElementById('todo-input').value = '验证自动路由';
    document.getElementById('todo-form').requestSubmit();
  })()`);
  await wait(100);
  const todoAdded = await page.executeJavaScript(`document.querySelectorAll('#todo-list .todo-item').length`);
  expect(todoAdded === 1, `todo item added (${todoAdded})`);
  await page.executeJavaScript(`document.getElementById('tab-model').click()`);

  // capability form: add a skill
  await page.executeJavaScript(`(() => {
    document.getElementById('add-capability').click();
    document.getElementById('capability-kind').value = 'skill';
    document.getElementById('capability-name').value = 'demo-skill';
  })()`);
  const capabilityFormOpen = await page.executeJavaScript(`document.getElementById('capability-form').hidden === false`);
  expect(capabilityFormOpen, 'capability form opens');
  await page.executeJavaScript(`document.getElementById('capability-form').requestSubmit()`);
  await wait(200);
  const capabilityFormClosed = await page.executeJavaScript(`document.getElementById('capability-form').hidden === true`);
  expect(capabilityFormClosed, 'capability form closes after save');

  // model modules: open form
  await page.executeJavaScript(`document.getElementById('add-module').click()`);
  console.log('step: form opened');
  const opened = await page.executeJavaScript(moduleInfo());
  expect(opened.formHidden === false, 'module form opens');
  expect(opened.modelOptions.length === 4, `module form lists configured models and custom entry (${opened.modelOptions.length})`);
  expect(opened.modelOptions.some((option) => option.value === 'demo/mini'), 'module form has mini');
  expect(opened.modelOptions.some((option) => option.value === '__custom__'), 'module form has custom entry');

  // create module
  await page.executeJavaScript(`(() => {
    document.getElementById('module-name').value = '快速修复';
    const select = document.getElementById('module-model');
    select.value = 'demo/mini';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('module-auto').checked = true;
    document.getElementById('module-form').requestSubmit();
  })()`);
  await wait(200);
  console.log('step: module submitted');
  const created = await page.executeJavaScript(moduleInfo());
  const moduleId = created.storedModules[0]?.id;
  expect(created.rows.length === 1, `module row rendered (${created.rows.length})`);
  expect(created.rows[0]?.includes('快速修复') && created.rows[0]?.includes('demo/mini'), `module row content (${created.rows[0]})`);
  expect(created.storedModules.length === 1 && created.storedModules[0].model === 'mini', 'module persisted');
  expect(created.storedModules[0]?.auto === true, 'module auto flag persisted');
  expect(created.formHidden === true, 'module form closes after save');
  expect(created.buttons.join('|') === '自动|应用|编辑|×', `module actions (${created.buttons})`);

  // bind module to the project
  await page.executeJavaScript(`(() => {
    const select = document.getElementById('project-module');
    select.value = ${JSON.stringify(moduleId)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(150);
  console.log('step: module bound');
  const bound = await page.executeJavaScript(moduleInfo());
  expect(bound.storedBindings[root] === moduleId, 'project binding persisted');
  expect(bound.bindingValue === moduleId, 'project binding selected');

  // apply module while Pi is not running -> staged command
  console.log('rows before apply:', await page.executeJavaScript(`document.querySelectorAll('#module-list .module-item').length`));
  console.log('clicking apply');
  await Promise.race([
    page.executeJavaScript(`document.querySelector('#module-list .module-item .item-actions button:nth-child(2)').click()`),
    wait(5000).then(() => { throw new Error('apply click timeout'); }),
  ]);
  console.log('clicked apply');
  await wait(150);
  console.log('step: module applied');
  const applied = await page.executeJavaScript(moduleInfo());
  expect(applied.preview === '/model demo/mini', `module staged command (${applied.preview})`);
  expect(applied.toast.includes('已暂存'), `module staged toast (${applied.toast})`);

  // switch to English
  await page.executeJavaScript(`(() => {
    const select = document.getElementById('language-select');
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
  })()`);
  await wait(900);
  console.log('step: switched en');
  const en = await page.executeJavaScript(snapshot());
  writeFileSync(path.join(root, '.smoke', 'i18n-en.json'), JSON.stringify(en, null, 2));
  try {
    window.show();
    await wait(300);
    const enShot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'i18n-en.png'), enShot.toPNG());
    console.log('step: captured');
  } catch (error) {
    console.log('screenshot skipped:', String(error));
  }
  writeFileSync(path.join(root, '.smoke', 'modules-en.json'), JSON.stringify(en, null, 2));

  // switch back
  await page.executeJavaScript(`(() => {
    const select = document.getElementById('language-select');
    select.value = 'zh-CN';
    select.dispatchEvent(new Event('change'));
  })()`);
  await wait(900);
  const back = await page.executeJavaScript(snapshot());
  writeFileSync(path.join(root, '.smoke', 'i18n-back.json'), JSON.stringify(back, null, 2));

  expectText(zhSnap.lang === 'zh-CN', 'zh lang attribute');
  expectText(zhSnap.title === 'Pi 工作台', 'zh title');
  expectText(zhSnap.tabs.join('|') === '项目|模型|自动化|协作|能力|会话|搜索|安全', 'zh tabs');
  expectText(zhSnap.modeNote.startsWith('真实配置'), 'zh mode note');
  expectText(zhSnap.preview === '选择模型后生成命令', 'zh command preview');
  expectText(zhSnap.composerPlaceholder.includes('输入消息'), 'zh composer placeholder');
  expectText(zhSnap.moduleBindingLabel === '本项目模型', `zh module binding label (${zhSnap.moduleBindingLabel})`);
  expectText(zhSnap.moduleRows.length === 0, 'zh starts without modules');

  expectText(en.lang === 'en', 'en lang attribute');
  expectText(en.title === 'Pi Workbench', 'en title');
  expectText(en.brand === 'Pi Workbench', 'en brand');
  expectText(en.tabs.join('|') === 'Project|Models|Automation|Team|Capabilities|Sessions|Search|Security', 'en tabs');
  expectText(en.state === 'Not started', 'en process state');
  expectText(en.modeNote.startsWith('Real config'), 'en mode note');
  expectText(en.modeNote.includes('extensions/MCP/Skills'), 'en mode note body');
  expectText(en.cwd === root, 'en cwd label');
  expectText(en.isolated === 'Shown after start', 'en isolated path');
  expectText(en.composerPlaceholder.startsWith('Type a message.'), 'en composer placeholder');
  expectText(en.searchPlaceholder === 'Search vendor / model', 'en model search placeholder');
  expectText(en.preview === '/model demo/mini', `en selected command preserved (${en.preview})`);
  expectText(en.modelSummary.includes('Default demo/demo-model'), `en model summary (${en.modelSummary})`);
  expectText(en.modelSummary.includes('2 models'), 'en model summary count');
  expectText(en.modelNote.includes('Sorted by popularity'), 'en model note');
  expectText(en.providerNote.includes('Custom providers are written'), 'en provider note');
  expectText(en.paletteHint.startsWith('Commands that run directly'), 'en palette hint');
  expectText(en.mediaHint.startsWith('Scroll to zoom'), 'en media hint');
  expectText(en.version === 'Pi 1.3.0', 'version untouched by locale switch');
  expectText(en.storedLocale === 'en', 'en locale persisted');
  expectText(en.localeSelect === 'en', 'en select value');
  expectText(calls.some(([name, value]) => name === 'setLocale' && value === 'en'), 'backend locale notified');
  expectText(en.moduleBindingLabel === 'Model for this project', `en module binding label (${en.moduleBindingLabel})`);
  expectText(en.moduleBindingOptions.includes('Pi default'), `en module binding default (${en.moduleBindingOptions})`);
  expectText(en.moduleButtons.join('|') === 'Auto|Apply|Edit|×', `en module actions (${en.moduleButtons})`);
  expectText(en.moduleRows.length === 1 && en.moduleRows[0].includes('快速修复'), 'en module row kept');

  expectText(back.lang === 'zh-CN', 'back lang attribute');
  expectText(back.title === 'Pi 工作台', 'back title');
  expectText(back.tabs.join('|') === '项目|模型|自动化|协作|能力|会话|搜索|安全', 'back tabs');
  expectText(back.state === '未启动', 'back process state');
  expectText(back.cwd === root, 'back cwd label');
  expectText(back.composerPlaceholder.includes('输入消息'), 'back composer placeholder');
  expectText(back.storedLocale === 'zh-CN', 'back locale persisted');

  // reload: module and binding survive
  await load();
  console.log('step: reloaded persisted');
  const reloaded = await page.executeJavaScript(moduleInfo());
  console.log('reloaded:', JSON.stringify(reloaded));
  expectText(reloaded.rows.length === 1, 'module persists across reload');
  expectText(reloaded.bindingValue === moduleId, 'project binding persists across reload');

  // bottom tuning + appearance settings
  const tuning = await page.executeJavaScript(`(() => {
    const reasoning = document.getElementById('reasoning-level');
    const smart = document.getElementById('smart-level');
    const defaults = { reasoning: reasoning.value, smart: smart.value };
    reasoning.value = 'high';
    reasoning.dispatchEvent(new Event('change', { bubbles: true }));
    smart.value = 'fast';
    smart.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      defaults,
      reasoning: reasoning.value,
      smart: smart.value,
      storedReasoning: localStorage.getItem('pi-reasoning-level'),
      storedSmart: localStorage.getItem('pi-smart-level'),
      settingsReasoning: document.getElementById('settings-reasoning').value,
      settingsSmart: document.getElementById('settings-smart').value,
      state: document.getElementById('tuning-state').textContent,
    };
  })()`);
  console.log('tuning:', JSON.stringify(tuning));
  expectText(tuning.defaults.reasoning === 'auto' && tuning.defaults.smart === 'auto', `tuning defaults auto (${JSON.stringify(tuning.defaults)})`);
  expectText(tuning.storedReasoning === 'high' && tuning.storedSmart === 'fast', 'tuning persisted');
  expectText(tuning.settingsReasoning === 'high' && tuning.settingsSmart === 'fast', 'settings selects stay in sync');
  expectText(tuning.state.includes('启动生效'), `tuning state label (${tuning.state})`);

  await page.executeJavaScript(`document.getElementById('open-settings').click()`);
  await wait(150);
  const settingsState = await page.executeJavaScript(`(() => {
    const theme = document.getElementById('theme-mode');
    const accent = document.getElementById('accent-color');
    theme.value = 'light';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    accent.value = 'blue';
    accent.dispatchEvent(new Event('change', { bubbles: true }));
    const animation = document.getElementById('startup-animation');
    animation.value = 'off';
    animation.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      open: !document.getElementById('settings-overlay').hidden,
      tabSelected: document.getElementById('settings-tab-general').getAttribute('aria-selected'),
      theme: document.documentElement.dataset.theme,
      accent: document.documentElement.dataset.accent,
      accentValue: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      storedTheme: localStorage.getItem('pi-theme-mode'),
      splashHidden: document.getElementById('startup-splash').hidden,
      paneHidden: document.getElementById('pane-settings').hidden,
    };
  })()`);
  console.log('settings:', JSON.stringify(settingsState));
  expectText(settingsState.open === true && settingsState.tabSelected === 'true' && settingsState.paneHidden === false, 'settings button opens settings pane');
  expectText(settingsState.theme === 'light' && settingsState.storedTheme === 'light', 'theme switch applies and persists');
  expectText(settingsState.accent === 'blue' && settingsState.accentValue !== '', 'accent preset applies');
  expectText(settingsState.splashHidden === true, 'startup animation off hides splash');

  const resetState = await page.executeJavaScript(`(() => {
    document.getElementById('reset-appearance').click();
    return {
      theme: document.documentElement.dataset.theme,
      accent: document.documentElement.dataset.accent,
      storedTheme: localStorage.getItem('pi-theme-mode'),
      storedAccent: localStorage.getItem('pi-accent'),
      storedAnimation: localStorage.getItem('pi-startup-animation'),
    };
  })()`);
  expectText(resetState.theme === 'dark' && resetState.accent === 'mint', `appearance reset (${JSON.stringify(resetState)})`);
  expectText(resetState.storedAnimation === 'dynamic', 'startup animation reset');

  // start session: bound module becomes --model
  await page.executeJavaScript(`document.getElementById('start-pi').click()`);
  await wait(400);
  console.log('step: started', JSON.stringify(startOptions));
  expectText(startOptions?.model === 'demo/mini', `start passes bound model (${startOptions?.model})`);
  expectText(startOptions?.thinking === 'high', `start passes reasoning level (${startOptions?.thinking})`);
  page.send('pi:state', { status: 'running', cwd: root });
  await wait(250);
  console.log('rows before apply:', await page.executeJavaScript(`document.querySelectorAll('#module-list .module-item').length`));
  console.log('clicking apply');
  await Promise.race([
    page.executeJavaScript(`document.querySelector('#module-list .module-item .item-actions button:nth-child(2)').click()`),
    wait(5000).then(() => { throw new Error('apply click timeout'); }),
  ]);
  console.log('clicked apply');
  await wait(150);
  expectText(writes.includes('/model demo/mini\r'), `running module applies in terminal (${JSON.stringify(writes)})`);

  // natural-language intent routes to the matching Pi command
  await page.executeJavaScript(`(() => {
    const input = document.getElementById('composer-input');
    input.value = '压缩上下文';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('send-message').click();
  })()`);
  await wait(200);
  expectText(writes.includes('/compact\r'), `natural language routes to /compact (${JSON.stringify(writes)})`);

  // delete module: binding is cleared
  await page.executeJavaScript(`(() => {
    window.confirm = () => true;
    document.querySelector('#module-list .module-item .item-actions button.danger').click();
  })()`);
  await wait(200);
  console.log('step: deleted');
  const deleted = await page.executeJavaScript(moduleInfo());
  expectText(deleted.rows.length === 0, 'module deleted');
  expectText(Object.keys(deleted.storedBindings).length === 0, 'binding cleared with module');

  const envUi = await page.executeJavaScript(`({
    node: document.getElementById('node-path')?.textContent ?? '',
    npm: document.getElementById('npm-version')?.textContent ?? '',
    pi: document.getElementById('pi-env')?.textContent ?? '',
    autostart: document.getElementById('auto-start')?.checked ?? null,
    setup: document.getElementById('setup-env')?.textContent ?? '',
    shortcut: Boolean(document.getElementById('create-shortcut')?.closest('#pane-settings')),
  })`);
  expectText(envUi.pi.includes('1.3.0'), `environment shows Pi version (${JSON.stringify(envUi)})`);
  expectText(envUi.npm.includes('11.0.0'), 'environment shows npm version');
  expectText(envUi.autostart === true, 'autostart defaults on');
  expectText(envUi.shortcut, 'desktop shortcut action present in Settings');

  writeFileSync(path.join(root, '.smoke', 'module-test.json'), JSON.stringify({
    startOptions, writes, stopRequested, applied, en, deleted,
  }, null, 2));
  console.log(JSON.stringify({ failures, calls, writes, startOptions }, null, 2));
  await window.close();
  app.exit(failures.length ? 1 : 0);
}

app.whenReady().then(() => run().catch((error) => {
  console.error(error);
  app.exit(1);
}));
