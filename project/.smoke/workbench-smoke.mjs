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
  { key: 'deepseek', label: 'DeepSeek', tier: 2, region: 'cn', aliases: ['deepseek'] },
  { key: 'other', label: 'Other AI', tier: 2, region: 'global', aliases: ['other'] },
];
const packSkillNames = [
  'code-review', 'test-writer', 'security-review', 'refactor-plan',
  'docs-writer', 'data-analysis', 'release-notes', 'sql-analyst', 'ui-review', 'creative-brief',
];
const skills = [{
  id: 'demo-skill', name: 'demo-skill', title: '演示技能', description: '用于界面冒烟的技能',
  tags: ['demo', 'smoke'], body: '# demo',
}, ...packSkillNames.map((name) => ({
  id: name, name, title: name, description: `能力包冒烟：${name}`,
  tags: ['pack', 'smoke'], body: `# ${name}`,
}))];
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

ipcMain.handle('app:info', () => ({ version: '1.2.0', electron: 'test', platform: 'win32 x64' }));
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
ipcMain.handle('pi:providers', () => ({
  ok: true,
  report: {
    providers: [{
      id: 'demo', name: 'Demo Relay', baseUrl: 'https://demo.example/v1', api: 'openai-completions',
      custom: true, modelCount: 2, modelsText: 'demo-model | Demo Model\ndemo-mini | Demo Mini',
      headerNames: [], hasStoredKey: true, credentialType: 'apiKey', keySource: 'stored',
    }],
    warnings: [],
  },
}));
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
  settings: { webSearch: true, crawl: false, reverse: false, security: false, searchProvider: 'duckduckgo', searxngUrl: '' },
}));
ipcMain.handle('tools:save-settings', (_e, input) => { record('saveToolSettings', input); return { ok: true, settings: input }; });
ipcMain.handle('tools:tool-status', () => ([
  { id: 'trafilatura', label: 'trafilatura', installed: false, installable: true, source: 'uv' },
  { id: 'radare2', label: 'radare2', installed: false, installable: true, source: 'zip' },
  { id: 'semgrep', label: 'Semgrep', installed: true, version: '1.90.0', installable: true, source: 'uv' },
  { id: 'trivy', label: 'Trivy', installed: false, installable: true, source: 'winget' },
  { id: 'gitleaks', label: 'gitleaks', installed: true, version: '8.18.0', installable: true, source: 'winget' },
  { id: 'bandit', label: 'Bandit', installed: false, installable: false, source: 'uv' },
  { id: 'gosec', label: 'gosec', installed: false, installable: false, source: 'zip' },
]));
ipcMain.handle('tools:install-tool', (_e, id) => { record('installTool', id); return { ok: true, id }; });
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
ipcMain.handle('tools:crawl-start', (_e, options) => {
  record('startCrawl', options);
  const runId = 'run-demo';
  setTimeout(() => {
    const target = BrowserWindow.getAllWindows()[0];
    if (!target || target.isDestroyed()) return;
    const page = {
      url: options.mode === 'search' ? 'https://example.com/pi' : (options.url || 'https://example.com'),
      title: 'Example page', text: 'Example body text', engine: 'builtin', depth: 0, bytes: 128, links: 0,
    };
    target.webContents.send('tools:crawl-progress', { runId, phase: 'fetching', visited: 1, queued: 0, page });
    target.webContents.send('tools:crawl-progress', { runId, phase: 'done', visited: 1, queued: 0, message: '抓取完成' });
  }, 20);
  return { ok: true, runId };
});
ipcMain.handle('tools:crawl-cancel', (_e, runId) => { record('cancelCrawl', runId); return { ok: true }; });
ipcMain.handle('tools:analyze', (_e, target) => {
  record('analyzePath', target);
  return { ok: true, lines: ['类型：目录', `路径：${target}`, '文件数：12'] };
});
ipcMain.handle('tools:pick-analyze-path', () => ({ ok: true, path: 'C:\\src\\demo' }));
ipcMain.handle('tools:triage', (_e, target) => {
  record('triage', target);
  return {
    ok: true,
    installed: true,
    triage: {
      file: {
        path: target, size: 360448, sha256: 'a'.repeat(64), format: 'pe', arch: 'x86',
        bits: 64, os: 'windows', type: 'PE32+', stripped: false, compiler: '',
      },
      entry: 5368715696,
      sections: [{ name: '.text', size: 1024, vsize: 2048, perm: 'r-x', vaddr: 4096 }],
      imports: [{ name: 'CreateFileW', library: 'kernel32', type: 'FUNC' }],
      exports: [],
      strings: [{ value: 'hello world', length: 11, type: 'ascii', vaddr: 8192 }],
      functions: [{ name: 'main', size: 64, cc: 3, bbs: 2 }],
      xrefs: [],
      packer: { score: 0, reasons: [] },
      durationMs: 12,
      truncated: false,
      warnings: [],
    },
  };
});
const auditReport = {
  runId: 'audit-demo',
  root: 'C:\\src\\demo',
  startedAt: '2026-10-18T00:00:00.000Z',
  finishedAt: '2026-10-18T00:00:01.000Z',
  findings: [
    { id: 'semgrep-0', tool: 'semgrep', severity: 'high', title: 'SQL injection', message: 'User input reaches a query.', file: 'src/db.ts', line: 12, ruleId: 'js.sql-injection' },
    { id: 'trivy-1', tool: 'trivy', severity: 'critical', title: 'CVE-2024-0001', message: 'Vulnerable dependency.', file: 'package-lock.json', ruleId: 'CVE-2024-0001' },
    { id: 'gitleaks-2', tool: 'gitleaks', severity: 'high', title: '疑似密钥泄露', message: '检测到疑似密钥，内容已脱敏', file: '.env', line: 3, ruleId: 'generic-api-key' },
  ],
  scanners: [
    { id: 'semgrep', installed: true, ok: true, count: 1 },
    { id: 'trivy', installed: true, ok: true, count: 1 },
    { id: 'gitleaks', installed: true, ok: true, count: 1 },
  ],
  canceled: false,
  truncated: false,
};
ipcMain.handle('security:pick-path', () => ({ ok: true, path: 'C:\\src\\demo' }));
ipcMain.handle('security:run-audit', (_e, input) => {
  record('runAudit', input);
  const runId = 'audit-demo';
  setTimeout(() => {
    const target = BrowserWindow.getAllWindows()[0];
    if (!target || target.isDestroyed()) return;
    target.webContents.send('security:progress', { runId, phase: 'scanning', message: 'Semgrep 扫描中…', percent: 40, count: 0 });
    target.webContents.send('security:progress', { runId, phase: 'scanning', message: 'Trivy 扫描中…', percent: 70, count: 1 });
    target.webContents.send('security:progress', { runId, phase: 'done', message: '审计完成', percent: 100, count: 3 });
  }, 20);
  return { ok: true, runId };
});
ipcMain.handle('security:stop-audit', () => { record('stopAudit', true); return { ok: true }; });
ipcMain.handle('security:findings', () => ({ ok: true, report: auditReport }));
ipcMain.handle('security:export', (_e, format) => {
  record('exportAudit', format);
  return { ok: true, path: `C:\\Users\\demo\\Downloads\\security-report.${format === 'json' ? 'json' : 'sarif'}` };
});
const pentestTargetInfo = { url: 'https://example.com/', host: 'example.com', port: 443, scheme: 'https' };
const passiveFindings = [
  { id: 'passive-hsts', severity: 'medium', title: '缺少 HSTS', detail: '未设置 Strict-Transport-Security，浏览器可能先以 HTTP 访问。', category: 'headers', url: 'https://example.com/' },
  { id: 'passive-server', severity: 'info', title: '暴露服务器标识', detail: '响应头 Server：nginx', category: 'headers', url: 'https://example.com/' },
];
ipcMain.handle('security:authorize', (_e, input) => {
  record('authorizeTarget', input);
  if (input.hostConfirm !== pentestTargetInfo.host) {
    return { ok: false, error: '授权校验未通过' };
  }
  return {
    ok: true,
    token: 'ticket-demo',
    target: pentestTargetInfo,
    ips: ['93.184.216.34'],
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
});
ipcMain.handle('security:run-passive', (_e, input) => {
  record('runPassive', input);
  const runId = 'passive-demo';
  setTimeout(() => {
    const target = BrowserWindow.getAllWindows()[0];
    if (!target || target.isDestroyed()) return;
    target.webContents.send('security:pentest-progress', { runId, phase: 'checking', message: '请求目标并检查响应头…', percent: 50 });
    target.webContents.send('security:pentest-progress', { runId, phase: 'done', message: '被动基线完成', percent: 100, count: 2, findings: passiveFindings });
  }, 20);
  return { ok: true, runId };
});
ipcMain.handle('security:run-pentest', (_e, input) => {
  record('runPentest', input);
  const runId = 'active-demo';
  setTimeout(() => {
    const target = BrowserWindow.getAllWindows()[0];
    if (!target || target.isDestroyed()) return;
    target.webContents.send('security:pentest-progress', { runId, phase: 'scanning', message: 'Nuclei 扫描中…', percent: 60 });
    target.webContents.send('security:pentest-progress', {
      runId, phase: 'done', message: '主动扫描完成', percent: 100, count: 1,
      findings: [{ id: 'nuclei-1', severity: 'high', title: 'Exposed admin panel', detail: '模板 http/exposures/admin-panel.yaml 命中。', category: 'template', ruleId: 'admin-panel', url: 'https://example.com/admin' }],
    });
  }, 20);
  return { ok: true, runId };
});
ipcMain.handle('security:stop-pentest', () => { record('stopPentest', true); return { ok: true }; });
ipcMain.handle('security:audit-log', () => ({
  ok: true,
  chainValid: true,
  entries: [
    {
      runId: 'active-demo', at: '2026-10-18T00:02:00.000Z', kind: 'active',
      target: pentestTargetInfo, ips: ['93.184.216.34'], allowLocal: false,
      note: '授权测试 example.com', tool: 'nuclei', argv: ['-u', 'https://example.com/'],
      rulesHash: 'abc123', requests: 42, durationMs: 61000, exitCode: 0, findings: 1,
      outcome: 'ok', prevHash: '0'.repeat(64), hash: 'f'.repeat(64),
    },
    {
      runId: 'passive-demo', at: '2026-10-18T00:01:00.000Z', kind: 'passive',
      target: pentestTargetInfo, ips: ['93.184.216.34'], allowLocal: false,
      tool: 'builtin', argv: [], requests: 2, durationMs: 900, findings: 2,
      outcome: 'ok', prevHash: '0'.repeat(64), hash: 'e'.repeat(64),
    },
  ],
}));
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

const stubAppDefaults = {
  version: 1, permissionPreset: 'standard', autoApprove: false, workspaceOnly: true,
  model: '', thinking: '', memorySkill: true,
};
ipcMain.handle('app:defaults', () => stubAppDefaults);
ipcMain.handle('app:defaults-save', (_e, input) => {
  record('saveAppDefaults', input);
  return { ok: true, defaults: { ...stubAppDefaults, ...input } };
});
ipcMain.handle('project:config', (_e, cwd) => ({
  ok: true,
  path: path.join(cwd, '.pi', 'workbench.json'),
  envPath: 'C:\\Users\\smoke\\project-env.json',
  config: {
    version: 1, project: cwd, updatedAt: '2026-01-01T00:00:00.000Z',
    model: 'openai/gpt-5', thinking: 'medium', autoStart: null,
  },
  env: { SMOKE_TOKEN: 'secret' },
}));
ipcMain.handle('project:config-save', (_e, input) => {
  record('saveProjectConfig', input);
  const autoStart = input.autoStart === 'auto' ? true : input.autoStart === 'manual' ? false : null;
  return {
    ok: true,
    path: path.join(input.cwd, '.pi', 'workbench.json'),
    envPath: 'C:\\Users\\smoke\\project-env.json',
    config: {
      version: 1, project: input.cwd, updatedAt: new Date().toISOString(),
      model: input.model ?? '', thinking: input.thinking ?? '', autoStart,
    },
    env: input.env ?? {},
  };
});
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
  const settleForCapture = async () => {
    await js(`(() => {
      if (document.getElementById('capture-settle')) return;
      const style = document.createElement('style');
      style.id = 'capture-settle';
      style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
      document.head.append(style);
    })()`);
  };
  const capture = async (name) => {
    page.invalidate();
    await wait(220);
    writeFileSync(path.join(root, '.smoke', name), (await page.capturePage()).toPNG());
  };
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
    tabsOverflow: (() => {
      const el = document.querySelector('.dock-tabs');
      return el ? el.scrollWidth - el.clientWidth : -1;
    })(),
    tabWidths: [...document.querySelectorAll('.dock-tab')].map((el) => Math.round(el.getBoundingClientRect().width)),
    toolbarSticky: getComputedStyle(document.querySelector('[data-dock-panel="permissions"] > .dock-toolbar')).position,
    presetColumns: getComputedStyle(document.getElementById('perm-presets')).gridTemplateColumns.split(' ').length,
    helpOpen: document.querySelector('.dock-help')?.open,
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
  expect(dockState.tabsOverflow === 0, `dock tabs fit without horizontal scroll (${dockState.tabsOverflow})`);
  expect(dockState.tabWidths.length === 4 && Math.max(...dockState.tabWidths) - Math.min(...dockState.tabWidths) <= 2,
    `dock tabs share the row evenly (${dockState.tabWidths})`);
  expect(dockState.toolbarSticky === 'sticky', `permission toolbar stays visible (${dockState.toolbarSticky})`);
  expect(dockState.presetColumns === 2, `permission presets use two columns (${dockState.presetColumns})`);
  expect(dockState.helpOpen === false, 'auto-approve help stays collapsed');

  const projectConfigState = JSON.parse(await js(`JSON.stringify({
    drawer: Boolean(document.querySelector('#project-config-drawer')),
    model: document.getElementById('project-config-model').value,
    thinking: document.getElementById('project-config-thinking').value,
    autoStart: document.getElementById('project-config-autostart').value,
    envName: document.querySelector('#project-env-list .project-env-name')?.value,
    envType: document.querySelector('#project-env-list .project-env-value')?.type,
    envValue: document.querySelector('#project-env-list .project-env-value')?.value,
    saveDisabled: document.getElementById('project-config-save').disabled,
    status: document.getElementById('project-config-status').textContent,
  })`));
  expect(projectConfigState.drawer, 'project configuration drawer rendered');
  expect(projectConfigState.model === 'openai/gpt-5', `project model loaded (${projectConfigState.model})`);
  expect(projectConfigState.thinking === 'medium', `project thinking loaded (${projectConfigState.thinking})`);
  expect(projectConfigState.autoStart === 'follow', `project launch mode loaded (${projectConfigState.autoStart})`);
  expect(projectConfigState.envName === 'SMOKE_TOKEN', `project env name rendered (${projectConfigState.envName})`);
  expect(projectConfigState.envType === 'password', `project env value stays masked (${projectConfigState.envType})`);
  expect(projectConfigState.envValue === 'secret', 'project env value filled for editing');
  expect(projectConfigState.saveDisabled === false, 'project config becomes editable after load');
  expect(projectConfigState.status.includes('已保存'), `project config timestamp rendered (${projectConfigState.status})`);
  await js(`document.getElementById('project-config-drawer').open = true`);
  await js(`document.getElementById('project-config-drawer').scrollIntoView({ block: 'start' })`);
  await settleForCapture();
  await wait(150);
  await capture('workbench-project-config.png');
  await js(`document.getElementById('project-config-drawer').open = false`);

  await js(`(() => {
    document.getElementById('project-config-model').value = 'demo/demo-mini';
    document.getElementById('project-config-autostart').value = 'manual';
    document.getElementById('project-env-add').click();
    document.getElementById('project-config-save').click();
  })()`);
  await wait(300);
  const projectConfigSave = [...calls].reverse().find(([name]) => name === 'saveProjectConfig')?.[1];
  expect(projectConfigSave?.model === 'demo/demo-mini', `project model saved (${projectConfigSave?.model})`);
  expect(projectConfigSave?.autoStart === 'manual', `project launch mode saved (${projectConfigSave?.autoStart})`);
  expect(projectConfigSave?.env?.SMOKE_TOKEN === 'secret', 'project env saved');
  expect(Object.keys(projectConfigSave?.env ?? {}).length === 1, 'blank env row is skipped');

  const packState = JSON.parse(await js(`JSON.stringify({
    toolbar: Boolean(document.querySelector('#capability-packs .pack-toolbar')),
    groups: document.querySelectorAll('#capability-packs .pack-group').length,
    rows: document.querySelectorAll('#capability-packs .pack-row').length,
    switches: document.querySelectorAll('#capability-packs input[type="checkbox"]').length,
    states: [...document.querySelectorAll('#capability-packs .pack-state')].map((el) => el.textContent),
    actions: [...document.querySelectorAll('#capability-packs .pack-action')].map((el) => el.textContent),
    note: Boolean(document.querySelector('#pane-capability .note[data-i18n^="开关按当前项目"]')),
  })`));
  expect(packState.toolbar, 'capability packs expose a summary toolbar');
  expect(packState.rows === 6, `six capability packs rendered (${packState.rows})`);
  expect(packState.switches === 6, `each pack has a switch (${packState.switches})`);
  expect(packState.groups === 4, `packs grouped by category (${packState.groups})`);
  expect(packState.states.every((state) => state === '未启用'), `packs start disabled (${packState.states})`);
  expect(packState.actions.join('|').includes('全部启用'), `bulk enable action present (${packState.actions})`);
  expect(packState.note, 'per-project behavior note rendered');

  await js(`document.querySelector('#project-dock .dock-body-inner').scrollTop = 9999`);
  await capture('workbench-dock.png');
  await js(`document.querySelector('#project-dock .dock-body-inner').scrollTop = 0`);

  await js(`document.getElementById('dock-toggle').click()`);
  await wait(420);
  const dockCollapsed = JSON.parse(await js(`JSON.stringify((() => {
    const dock = document.getElementById('project-dock');
    const rect = dock.getBoundingClientRect();
    return {
      collapsed: dock.classList.contains('collapsed'),
      height: Math.round(rect.height),
      bottomGap: Math.round(window.innerHeight - rect.bottom),
    };
  })())`));
  expect(dockCollapsed.collapsed, 'dock collapses');
  expect(dockCollapsed.height <= 100, `collapsed dock keeps only its head (${dockCollapsed.height}px)`);
  expect(Math.abs(dockCollapsed.bottomGap) <= 1, `collapsed dock pins to the sidebar bottom (${dockCollapsed.bottomGap}px)`);
  await js(`document.getElementById('dock-toggle').click()`);
  await wait(420);

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

  // 设置 → 项目默认：应用级默认值与新项目权限预设
  await js(`document.getElementById('open-settings').click()`);
  await js(`document.getElementById('settings-tab-project').click()`);
  await wait(300);
  const defaultState = JSON.parse(await js(`JSON.stringify({
    visible: document.getElementById('pane-project-defaults').hidden === false,
    model: document.getElementById('project-defaults-model').value,
    thinking: document.getElementById('project-defaults-thinking').value,
    preset: document.getElementById('project-defaults-preset').value,
    autoApprove: document.getElementById('project-defaults-auto-approve').checked,
    workspaceOnly: document.getElementById('project-defaults-workspace-only').checked,
    memorySkill: document.getElementById('project-defaults-memory-skill').checked,
    save: Boolean(document.getElementById('project-defaults-save')),
  })`));
  expect(defaultState.visible, 'project defaults pane opens from settings');
  expect(defaultState.model === '' && defaultState.thinking === '', 'default model and thinking start empty');
  expect(defaultState.preset === 'standard', `standard permission preset is the default (${defaultState.preset})`);
  expect(defaultState.autoApprove === false, 'default auto-approve is off');
  expect(defaultState.workspaceOnly === true, 'default workspace boundary is on');
  expect(defaultState.memorySkill === true, 'memory skill is installed by default');
  expect(defaultState.save, 'project defaults save button rendered');
  await settleForCapture();
  await capture('workbench-project-defaults.png');
  await js(`(() => {
    const preset = document.getElementById('project-defaults-preset');
    preset.value = 'full-access';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('project-defaults-save').click();
  })()`);
  await wait(300);
  const defaultSave = [...calls].reverse().find(([name]) => name === 'saveAppDefaults')?.[1];
  expect(defaultSave?.permissionPreset === 'full-access', `default preset saved (${defaultSave?.permissionPreset})`);
  expect(defaultSave?.workspaceOnly === false, 'full access preset lifts the default boundary');
  expect(defaultSave?.memorySkill === true, 'memory skill choice saved');
  await js(`document.getElementById('settings-close').click()`);

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
      expanded: group.querySelector('.vendor-toggle')?.getAttribute('aria-expanded'),
      models: [...group.querySelectorAll('.vendor-models .item strong')].map((el) => el.textContent),
    })),
  }); } catch (error) { return { error: String(error), stack: error && error.stack }; } })())`));
  const modelView = await readGroups();
  expect(modelView.groups.length === 2, `cn board lists all domestic vendors (${modelView.groups.length})`);
  expect(modelView.groups[0]?.name === 'Demo Labs', `domestic vendor first (${modelView.groups[0]?.name})`);
  expect(modelView.groups[0]?.models.length === 2, 'vendor group lists its models');
  expect(modelView.groups[1]?.name === 'DeepSeek' && modelView.groups[1]?.models.length === 0,
    `empty vendor stays visible (${modelView.groups[1]?.name}/${modelView.groups[1]?.models.length})`);

  const filterChips = JSON.parse(await js(`JSON.stringify(
    [...document.querySelectorAll('#model-filter [data-model-filter]')].map((el) => ({
      id: el.dataset.modelFilter, text: el.textContent, pressed: el.getAttribute('aria-pressed'),
    })))`));
  expect(filterChips.length === 3, `model filter chips rendered (${filterChips.length})`);
  expect(filterChips.find((chip) => chip.id === 'all')?.text === '全部 2', `all chip counts board models (${filterChips.map((chip) => chip.text).join(',')})`);
  expect(filterChips.find((chip) => chip.id === 'added')?.text === '已添加 1', 'added chip counts saved models');
  expect(filterChips.find((chip) => chip.id === 'available')?.text === '可用 2', 'available chip counts usable models');

  await js(`document.querySelector('[data-model-filter="available"]').click()`);
  await wait(150);
  const availableView = await readGroups();
  expect(availableView.groups.length === 1 && availableView.groups[0]?.models.length === 2,
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
  const beforeToggle = await js(`document.querySelector('#model-list .vendor-toggle').getAttribute('aria-expanded')`);
  await js(`document.querySelector('#model-list .vendor-toggle').click()`);
  await wait(100);
  const afterToggle = JSON.parse(await js(`JSON.stringify({
    expanded: document.querySelector('#model-list .vendor-toggle').getAttribute('aria-expanded'),
    hidden: document.querySelector('#model-list .vendor-models').hidden,
  })`));
  expect(afterToggle.expanded === String(beforeToggle !== 'true') && afterToggle.hidden === (beforeToggle === 'true'),
    `vendor toggles on click (${beforeToggle} -> ${afterToggle.expanded})`);

  // 快捷模型池：清空 → 单个加入 → 全部加入 → chip 立即使用
  await js(`document.getElementById('model-pool-clear').click()`);
  await wait(100);
  const poolEmpty = JSON.parse(await js(`JSON.stringify({
    count: document.getElementById('model-pool-count').textContent,
    hint: !document.getElementById('model-pool-empty').hidden,
  })`));
  expect(poolEmpty.count.includes('0'), `quick pool starts empty (${poolEmpty.count})`);
  expect(poolEmpty.hint, 'empty quick pool shows its hint');
  if (afterToggle.hidden) {
    await js(`document.querySelector('#model-list .vendor-toggle').click()`);
    await wait(100);
  }
  const routing = JSON.parse(await js(`JSON.stringify({
    chips: document.querySelectorAll('#model-list .vendor-routing .routing-chip').length,
    chip: document.querySelector('#model-list .vendor-routing .routing-chip')?.textContent ?? '',
  })`));
  expect(routing.chips === 7, `vendor offers automatic task types (${routing.chips})`);
  await js(`document.querySelectorAll('#model-list .vendor-routing .routing-chip')[0].click()`);
  await wait(150);
  const routingOn = JSON.parse(await js(`JSON.stringify({
    pressed: document.querySelectorAll('#model-list .vendor-routing .routing-chip')[0].getAttribute('aria-pressed'),
    badge: document.querySelector('#model-list .vendor-task-badge')?.textContent ?? '',
    router: document.getElementById('router-toggle').checked,
  })`));
  expect(routingOn.pressed === 'true', 'task chip toggles on');
  expect(routingOn.badge.includes(routing.chip), `vendor badge names the assigned task (${routingOn.badge})`);
  expect(routingOn.router, 'first vendor assignment enables auto-routing');
  await js(`document.querySelectorAll('#model-list .vendor-routing .routing-chip')[0].click()`);
  await wait(150);
  const routingOff = await js(`JSON.stringify(document.querySelectorAll('#model-list .vendor-task-badge').length)`);
  expect(routingOff === '0', 'unassigning clears the vendor badge');
  await js(`document.querySelectorAll('#model-list .model-item .pool-toggle')[0].click()`);
  await wait(150);
  const poolOne = JSON.parse(await js(`JSON.stringify({
    count: document.getElementById('model-pool-count').textContent,
    chips: document.querySelectorAll('#model-pool-chips .pool-chip').length,
    pressed: document.querySelectorAll('#model-list .model-item .pool-toggle')[0].getAttribute('aria-pressed'),
  })`));
  expect(poolOne.count.includes('1'), `adding one model updates pool count (${poolOne.count})`);
  expect(poolOne.chips === 1, `pool renders one chip (${poolOne.chips})`);
  expect(poolOne.pressed === 'true', 'pool toggle reflects membership');
  await js(`document.querySelectorAll('#model-list .model-item .use-model')[1].click()`);
  await wait(150);
  const usePreview = await js(`JSON.stringify(document.getElementById('command-preview').textContent)`);
  expect(usePreview.includes('/model demo/demo-mini'), `use button stages the model command (${usePreview})`);
  await js(`document.getElementById('model-pool-all').click()`);
  await wait(150);
  const poolAll = JSON.parse(await js(`JSON.stringify({
    count: document.getElementById('model-pool-count').textContent,
    chips: document.querySelectorAll('#model-pool-chips .pool-chip').length,
  })`));
  expect(poolAll.count.includes('4'), `add all fills the pool (${poolAll.count})`);
  expect(poolAll.chips === 4, `add all renders every chip (${poolAll.chips})`);
  await js(`document.getElementById('model-pool-clear').click()`);
  await wait(100);
  const poolCleared = await js(`JSON.stringify(document.querySelectorAll('#model-pool-chips .pool-chip').length)`);
  expect(poolCleared === '0', `clearing the pool removes chips (${poolCleared})`);

  // 自定义接入卡片：已移到 设置 → 接入，默认展开并给每个模型提供「使用 / 快捷」
  await js(`document.getElementById('open-settings').click()`);
  await js(`document.getElementById('settings-tab-provider').click()`);
  await wait(300);
  const providerModels = JSON.parse(await js(`JSON.stringify({
    rows: document.querySelectorAll('#provider-list .provider-model').length,
    use: document.querySelectorAll('#provider-list .provider-model .use-model').length,
    pool: document.querySelectorAll('#provider-list .provider-model .pool-toggle').length,
    expanded: document.querySelector('#provider-list .provider-item')?.getAttribute('aria-expanded') ?? '',
  })`));
  expect(providerModels.rows === 2, `custom provider lists its models (${providerModels.rows})`);
  expect(providerModels.use === 2, `every provider model has a use button (${providerModels.use})`);
  expect(providerModels.pool === 2, `every provider model has a pool toggle (${providerModels.pool})`);
  expect(providerModels.expanded === 'true', 'custom provider expands its models by default');
  await js(`document.querySelectorAll('#provider-list .provider-model .use-model')[1].click()`);
  await wait(150);
  const providerUse = await js(`JSON.stringify(document.getElementById('command-preview').textContent)`);
  expect(providerUse.includes('/model demo/demo-mini'), `provider model use stages its command (${providerUse})`);
  await js(`document.querySelector('#provider-list .provider-models-toggle').click()`);
  await wait(150);
  const providerCollapsed = await js(`JSON.stringify(document.querySelector('#provider-list .provider-models').hidden)`);
  expect(providerCollapsed === 'true', 'provider model list collapses');
  await js(`document.querySelector('#provider-list .provider-models-toggle').click()`);
  await wait(150);
  const providerReopened = await js(`JSON.stringify(document.querySelector('#provider-list .provider-models').hidden)`);
  expect(providerReopened === 'false', 'provider model list reopens');

  // 市场：扩展 / 技能 / MCP 三个分类 + 在线目录（已并入右上角设置）
  await js(`document.getElementById('open-settings').click()`);
  await js(`document.getElementById('settings-tab-market').click()`);
  await wait(500);
  const marketExtensions = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(marketExtensions === String(skills.length + mcps.length + extensions.length), `market lists all capabilities by default (${marketExtensions})`);

  await js(`document.querySelector('.market-tab[data-market="skills"]').click()`);
  await wait(300);
  const marketSkills = await js(`JSON.stringify(document.querySelectorAll('#market-list .market-card').length)`);
  expect(marketSkills === String(skills.length), `market lists skills (${marketSkills})`);
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
  await js(`document.getElementById('settings-close').click()`);

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
  const teamLayout = JSON.parse(await js(`JSON.stringify({
    sections: document.querySelectorAll('#pane-team details.team-section').length,
    compose: Boolean(document.querySelector('#pane-team .team-compose')),
    sticky: getComputedStyle(document.querySelector('#pane-team .team-compose')).position,
    rosterCount: document.getElementById('team-roster-count').textContent,
    roomCount: document.getElementById('meeting-room-count').textContent,
  })`));
  expect(teamLayout.sections === 2, `team sections are collapsible (${teamLayout.sections})`);
  expect(teamLayout.compose, 'team task compose block exists');
  expect(teamLayout.sticky === 'sticky', `team compose sticks to the bottom (${teamLayout.sticky})`);
  expect(Boolean(teamLayout.rosterCount), 'roster shows its member count');
  expect(teamLayout.roomCount.includes('1'), `meeting room shows its member count (${teamLayout.roomCount})`);
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
  const teamChart = JSON.parse(await js(`JSON.stringify({
    visible: !document.getElementById('team-visual').hidden,
    supervisor: document.querySelector('#team-supervisor-node strong').textContent,
    workers: document.querySelectorAll('#team-worker-nodes [data-agent-id]').length,
    flowDone: document.querySelectorAll('#team-flow li.done').length,
    activeTab: document.getElementById('tab-ws-collab').getAttribute('aria-selected'),
  })`));
  expect(teamChart.visible, 'team structure chart opens');
  expect(teamChart.supervisor.length > 0, `team chart names the supervisor (${teamChart.supervisor})`);
  expect(teamChart.workers === 1, `team chart lists workers (${teamChart.workers})`);
  expect(teamChart.flowDone === 4, `team workflow reaches summary (${teamChart.flowDone})`);
  expect(teamChart.activeTab === 'true', 'team run reveals the collaboration workspace');
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
  await js(`document.getElementById('crawl-drawer').open = true`);
  await js(`document.querySelector('[data-crawl-mode="page"]').click()`);
  const crawlPageMode = JSON.parse(await js(`JSON.stringify({
    urlHidden: document.getElementById('crawl-url-row').hidden,
    searchHidden: document.getElementById('crawl-search-row').hidden,
    depth: document.getElementById('crawl-depth').disabled,
  })`));
  expect(crawlPageMode.urlHidden === false && crawlPageMode.searchHidden === true, 'crawl page mode shows URL input');
  expect(crawlPageMode.depth === true, 'crawl page mode disables follow depth');
  await js(`document.querySelector('[data-crawl-mode="search"]').click()`);
  const crawlSearchMode = JSON.parse(await js(`JSON.stringify({
    urlHidden: document.getElementById('crawl-url-row').hidden,
    searchHidden: document.getElementById('crawl-search-row').hidden,
    depth: document.getElementById('crawl-depth').disabled,
  })`));
  expect(crawlSearchMode.urlHidden === true && crawlSearchMode.searchHidden === false, 'crawl search mode shows query input');
  expect(crawlSearchMode.depth === false, 'crawl search mode enables follow depth');
  await js(`(() => {
    document.getElementById('crawl-query').value = 'pi workbench';
    document.getElementById('crawl-start').click();
  })()`);
  await wait(400);
  const crawlCall = calls.filter(([name]) => name === 'startCrawl').pop()?.[1];
  expect(crawlCall?.mode === 'search' && crawlCall?.query === 'pi workbench', `crawl start passes mode and query (${JSON.stringify(crawlCall)})`);
  const crawlCards = await js(`JSON.stringify(document.querySelectorAll('#crawl-pages .crawl-item').length)`);
  expect(crawlCards === '1', `crawl renders page cards (${crawlCards})`);
  const crawlProgressText = await js(`JSON.stringify(document.getElementById('crawl-progress-text').textContent)`);
  expect(crawlProgressText.includes('完成'), `crawl progress reports completion (${crawlProgressText})`);
  const crawlCopyState = await js(`JSON.stringify(document.getElementById('crawl-copy').disabled)`);
  expect(crawlCopyState === 'false', `crawl copy enabled after results (${crawlCopyState})`);
  const crawlEngine = await js(`JSON.stringify(document.getElementById('install-trafilatura').hidden)`);
  expect(crawlEngine === 'false', `trafilatura install action visible when missing (${crawlEngine})`);
  await js(`(() => {
    document.getElementById('analyze-path').value = 'C:\\\\src\\\\demo';
    document.getElementById('run-analyze').click();
  })()`);
  await wait(200);
  const analyzeText = await js(`JSON.stringify(document.getElementById('analyze-output').textContent)`);
  expect(analyzeText.includes('文件数'), `reverse analysis renders output (${analyzeText})`);
  expect(calls.some(([name]) => name === 'analyzePath'), 'reverse analysis calls backend');
  const reverseInstall = await js(`JSON.stringify(document.getElementById('install-radare2').hidden)`);
  expect(reverseInstall === 'false', `radare2 install action visible when missing (${reverseInstall})`);
  await js(`(() => {
    document.getElementById('analyze-path').value = 'C:\\\\Windows\\\\System32\\\\notepad.exe';
    document.getElementById('run-triage').click();
  })()`);
  await wait(200);
  const triageRows = await js(`JSON.stringify(document.querySelectorAll('#triage-report .triage-row').length)`);
  expect(Number(triageRows) >= 5, `triage renders summary rows (${triageRows})`);
  const triageBlocks = await js(`JSON.stringify(document.querySelectorAll('#triage-report .triage-block').length)`);
  expect(Number(triageBlocks) >= 4, `triage renders detail blocks (${triageBlocks})`);
  const triageCopy = await js(`JSON.stringify(document.getElementById('copy-triage').disabled)`);
  expect(triageCopy === 'false', `triage copy enabled after run (${triageCopy})`);
  expect(calls.some(([name]) => name === 'triage'), 'triage calls backend');
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-search.png'), shot.toPNG());
  } catch (error) {
    console.log('search screenshot skipped:', String(error));
  }

  // 安全页：工具状态、本地审计、筛选与导出
  await js(`document.getElementById('tab-security').click()`);
  await wait(300);
  const securityVisible = await js(`JSON.stringify(document.getElementById('pane-security').hidden === false)`);
  expect(securityVisible === 'true', 'security pane opens from nav');
  const secChips = await js(`JSON.stringify(document.querySelectorAll('#security-toolbar .sec-tool').length)`);
  expect(Number(secChips) >= 3, `security toolbar lists audit tools (${secChips})`);
  await js(`document.querySelector('[data-sec-mode="pentest"]').click()`);
  const pentestShown = await js(`JSON.stringify(document.querySelector('[data-sec-panel="pentest"]').hidden === false)`);
  expect(pentestShown === 'true', 'security mode tabs switch panes');
  await js(`document.querySelector('[data-sec-mode="audit"]').click()`);
  await js(`(() => {
    document.getElementById('audit-path').value = 'C:\\\\src\\\\demo';
    document.getElementById('audit-run').click();
  })()`);
  await wait(400);
  const auditCall = calls.filter(([name]) => name === 'runAudit').pop()?.[1];
  expect(auditCall?.path === 'C:\\src\\demo', `audit start passes folder (${JSON.stringify(auditCall)})`);
  const findingCards = await js(`JSON.stringify(document.querySelectorAll('#audit-findings .finding').length)`);
  expect(findingCards === '3', `audit renders findings (${findingCards})`);
  const auditSummaryText = await js(`JSON.stringify(document.getElementById('audit-summary').textContent)`);
  expect(auditSummaryText.includes('3'), `audit summary counts findings (${auditSummaryText})`);
  await js(`(() => {
    const select = document.getElementById('audit-filter-severity');
    select.value = 'critical';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const filteredCards = await js(`JSON.stringify(document.querySelectorAll('#audit-findings .finding').length)`);
  expect(filteredCards === '1', `audit severity filter narrows list (${filteredCards})`);
  await js(`(() => {
    const select = document.getElementById('audit-filter-severity');
    select.value = 'all';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('audit-export-json').click();
  })()`);
  await wait(100);
  expect(calls.some(([name, format]) => name === 'exportAudit' && format === 'json'), 'audit export calls backend');

  // 授权渗透：校验目标 → 被动基线 → 主动扫描 → 审计日志
  await js(`document.querySelector('[data-sec-mode="pentest"]').click()`);
  await js(`(() => {
    document.getElementById('pentest-target').value = 'https://example.com/';
    document.getElementById('pentest-confirm-host').value = 'example.com';
    document.getElementById('pentest-authorize').checked = true;
    document.getElementById('pentest-note').value = '授权测试 example.com';
    document.getElementById('pentest-check').click();
  })()`);
  await wait(200);
  const authCall = calls.filter(([name]) => name === 'authorizeTarget').pop()?.[1];
  expect(authCall?.url === 'https://example.com/', `authorize passes target (${JSON.stringify(authCall)})`);
  const authText = await js(`JSON.stringify(document.getElementById('pentest-auth-info').textContent)`);
  expect(authText.includes('93.184.216.34'), `authorize shows resolved IPs (${authText})`);
  await js(`document.getElementById('pentest-passive').click()`);
  await wait(400);
  const passiveCall = calls.filter(([name]) => name === 'runPassive').pop()?.[1];
  expect(passiveCall?.url === 'https://example.com/', 'passive baseline calls backend');
  const passiveCards = await js(`JSON.stringify(document.querySelectorAll('#pentest-results .finding').length)`);
  expect(passiveCards === '2', `passive findings render (${passiveCards})`);
  const passiveText = await js(`JSON.stringify(document.getElementById('pentest-progress-text').textContent)`);
  expect(passiveText.includes('被动基线完成'), `passive progress completes (${passiveText})`);
  // 一次性授权：主动扫描前重新校验目标
  await js(`document.getElementById('pentest-check').click()`);
  await wait(200);
  await js(`document.getElementById('pentest-active').click()`);
  await wait(400);
  const activeCall = calls.filter(([name]) => name === 'runPentest').pop()?.[1];
  expect(activeCall?.token === 'ticket-demo', `active scan passes ticket (${JSON.stringify(activeCall)})`);
  const activeCards = await js(`JSON.stringify(document.querySelectorAll('#pentest-results .finding').length)`);
  expect(activeCards === '1', `active findings render (${activeCards})`);
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-security-pentest.png'), shot.toPNG());
  } catch (error) {
    console.log('pentest screenshot skipped:', String(error));
  }

  await js(`document.querySelector('[data-sec-mode="log"]').click()`);
  await wait(300);
  const logState = JSON.parse(await js(`JSON.stringify({
    chain: document.getElementById('audit-log-chain').textContent,
    cards: document.querySelectorAll('#audit-log-list .item').length,
    meta: document.getElementById('audit-log-list').textContent,
  })`));
  expect(logState.chain.includes('链校验通过'), `audit log chain valid (${logState.chain})`);
  expect(logState.cards === 2, `audit log renders entries (${logState.cards})`);
  expect(logState.meta.includes('nuclei'), `audit log shows tool (${logState.meta})`);
  await js(`document.querySelector('[data-sec-mode="audit"]').click()`);
  try {
    const shot = await page.capturePage();
    writeFileSync(path.join(root, '.smoke', 'workbench-security.png'), shot.toPNG());
  } catch (error) {
    console.log('security screenshot skipped:', String(error));
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

  await js(`document.getElementById('open-settings').click()`);
  await js(`document.querySelector('[data-open-app="vscode"]').click()`);
  await wait(200);
  expect(calls.some(([name, input]) => name === 'openApp' && input.id === 'vscode'), 'local app button calls backend');
  await js(`document.getElementById('settings-close').click()`);

  // 截图存档
  try {
    await js(`document.getElementById('tab-model').click()`);
    await wait(300);
    await settleForCapture();
    await capture('workbench-model.png');
    await js(`document.getElementById('open-settings').click()`);
    await js(`document.getElementById('settings-tab-market').click()`);
    await wait(300);
    await capture('workbench-market.png');
    await js(`document.getElementById('settings-tab-provider').click()`);
    await wait(300);
    expect(await js(`document.getElementById('pane-provider').hidden === false`), 'provider pane lives in settings');
    await capture('workbench-provider.png');
    await js(`document.getElementById('settings-tab-about').click()`);
    await wait(800);
    const aboutState = JSON.parse(await js(`JSON.stringify({
      visible: document.getElementById('pane-about').hidden === false,
      version: document.getElementById('about-app-version').textContent,
      pi: document.getElementById('about-pi-version').textContent,
      feedback: document.querySelectorAll('[data-feedback-email]').length,
      wechat: Boolean(document.querySelector('[data-copy-text="CxemCaspian111"]')),
      selected: document.querySelector('.settings-nav [aria-selected="true"]')?.id,
      visiblePanes: [...document.querySelectorAll('.settings-content .pane')].filter((pane) => !pane.hidden).map((pane) => pane.id),
      sheet: (() => { const r = document.querySelector('.settings-sheet').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    })`));
    expect(aboutState.selected === 'settings-tab-about', `about tab selected (${aboutState.selected})`);
    expect(aboutState.visiblePanes.includes('pane-about'), 'about pane visible');
    expect(aboutState.version.startsWith('v'), `about shows app version (${aboutState.version})`);
    expect(aboutState.feedback >= 2, `about lists feedback emails (${aboutState.feedback})`);
    expect(aboutState.wechat === true, 'about shows wechat contact');
    expect(aboutState.sheet[0] > 600, `settings sheet has usable width (${aboutState.sheet.join('x')})`);
    await capture('workbench-about.png');
    await js(`document.getElementById('settings-close').click()`);
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
