import { app, BrowserWindow, clipboard, dialog, ipcMain, Notification, shell } from 'electron';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import inspector from 'node:inspector';
import os from 'node:os';
import path from 'node:path';
import { AutomationStore, type AutomationJob, type RunResult } from './automation.js';
import {
  configureCustomAgents,
  detectAgents,
  installAgent,
  openAgentApp,
  removeCustomAgent,
  runAgent,
  runTeam,
  saveCustomAgent,
  stopRun,
  suggestTeam,
} from './agents.js';
import { appCatalog, configureCustomApps, installLocalApp, launchLocalApp, launchScannedApp, removeCustomApp, saveCustomApp, scanLocalApps } from './apps.js';
import { configureCustomLinks, listCustomLinks, removeCustomLink, saveCustomLink } from './links.js';
import { listImportedProjects } from './projects-import.js';
import { fetchSkillFromUrl, installExtension, listCatalog, searchMcpRegistry, searchNpmExtensions } from './catalog.js';
import { addMcpServer, addSkill, recordInstalledMeta, removeSkill } from './capabilities.js';
import { installPi, probeEnvironment, setupEnvironment, updatePi } from './env.js';
import { createArchive, deleteArchive, listArchives, restoreArchive } from './archives.js';
import { ingestMemory, ensureMemorySkill, installMemorySkill, memoryStats, recentMemory, searchMemory } from './memory.js';
import { ensureBundledSkills } from './design-skills.js';
import { detectTools, installTool, type ToolId } from './external-tools.js';
import { cancelCrawl, startCrawl, type CrawlOptions } from './crawl-engine.js';
import { habitSummary, recordHabit } from './habits.js';
import { guardInstalled, installPermissionGuard, permissionGuardPath, readProjectPermissions, saveProjectPermissions } from './permissions.js';
import { checkUpdates, downloadUpdate, getUpdateSettings, saveUpdateSettings } from './updater.js';
import { gitStatus } from './git.js';
import { inspectCapabilities, inspectModels, isSafeSessionPath, listSessions } from './inspect.js';
import { setBackendLocale, t } from './i18n.js';
import {
  allowMediaPath,
  clipboardImage,
  installMediaProtocol,
  openMediaExternally,
  pickMedia,
  setProjectDir,
} from './media.js';
import {
  deleteProvider,
  fetchProviderModels,
  listProviders,
  saveProvider,
  saveProviderKey,
  setDefaultModel,
} from './providers.js';
import { resolvePi, spawnPi, type PiSession } from './pi.js';
import {
  analyzePath,
  crawlPage,
  fetchPage,
  getToolSettings,
  saveToolSettings,
  searchWeb,
} from './tools.js';
import { searchCode, searchRepos } from './search-extra.js';
import { runTriage } from './reverse-r2.js';
import { buildSarif, getLastFindings, runLocalAudit, stopAudit, type AuditOptions } from './security-audit.js';
import {
  authorizeTarget,
  getAuditLog,
  runPassive,
  runPentest,
  stopPentest,
  type PassiveOptions,
} from './pentest.js';
import type { AuthorizationInput } from './security-guard.js';
import { applyGlobalTokenSavings, usageReport } from './usage.js';
import { configureAppDefaults, loadAppDefaults, saveAppDefaults } from './app-defaults.js';
import { configureProjectConfig, readProjectConfig, resetProjectConfig, saveProjectConfig } from './project-config.js';
import {
  applyConfigTemplate,
  configureConfigShare,
  deleteConfigTemplate,
  exportProjectConfig,
  importDotEnvFile,
  importProjectConfig,
  listConfigTemplates,
  saveConfigTemplate,
} from './config-share.js';

const bootStartedAt = Date.now();

function bootLog(label: string): void {
  if (process.env.PI_DESKTOP_PROFILE === '1') {
    console.log(`[boot:main] ${label} ${Date.now() - bootStartedAt}ms`);
  }
}

if (process.env.PI_DESKTOP_PROFILE === '1') {
  let lastTick = Date.now();
  const heartbeat = setInterval(() => {
    const now = Date.now();
    const drift = now - lastTick - 250;
    if (drift > 250) bootLog(`loop-stall ${drift}ms`);
    lastTick = now;
  }, 250);
  heartbeat.unref();

  const profiler = new inspector.Session();
  profiler.connect();
  profiler.post('Profiler.enable');
  profiler.post('Profiler.start');
  (globalThis as Record<string, unknown>).__piProfiler = profiler;

  const rawHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = ((channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
    rawHandle(channel, async (event, ...args) => {
      const started = Date.now();
      try {
        return await listener(event, ...args);
      } finally {
        const elapsed = Date.now() - started;
        if (elapsed > 100) bootLog(`ipc ${channel} ${elapsed}ms`);
      }
    });
  }) as typeof ipcMain.handle;
}

interface ProjectRecord {
  path: string;
  name: string;
  lastUsed: number;
}

let win: BrowserWindow | null = null;

interface LiveSession {
  session: PiSession;
  cwd: string;
  unackedBytes: number;
  startedAt: number;
}

const liveSessions = new Map<string, LiveSession>();
let activeKey: string | null = null;

// ConPTY 会按很小的块吐数据；合并 8ms 再发 IPC，避免消息风暴和渲染进程抖动。
const pendingPtyData = new Map<string, string[]>();
let ptyFlushTimer: NodeJS.Timeout | null = null;

function flushPtyData(): void {
  if (ptyFlushTimer) {
    clearTimeout(ptyFlushTimer);
    ptyFlushTimer = null;
  }
  if (!pendingPtyData.size) return;
  const batches = [...pendingPtyData];
  pendingPtyData.clear();
  for (const [key, parts] of batches) {
    const live = liveSessions.get(key);
    if (!live) continue;
    const data = parts.join('');
    live.unackedBytes += data.length;
    send('pty:data', { key, data });
    if (live.unackedBytes > HIGH_WATER) {
      try {
        live.session.pause();
      } catch {
        // best effort; the renderer ack will retry resume
      }
    }
  }
}

function queuePtyData(key: string, data: string): void {
  const parts = pendingPtyData.get(key);
  if (parts) parts.push(data);
  else pendingPtyData.set(key, [data]);
  if (!ptyFlushTimer) ptyFlushTimer = setTimeout(flushPtyData, 8);
}
const MAX_LIVE_SESSIONS = 4;

function sessionKey(cwd: string): string {
  return path.resolve(cwd).replace(/\\/g, '/').toLowerCase();
}

function findLiveSession(key?: unknown): LiveSession | undefined {
  if (typeof key === 'string' && key) {
    return liveSessions.get(key) ?? liveSessions.get(sessionKey(key));
  }
  return activeKey ? liveSessions.get(activeKey) : undefined;
}

const HIGH_WATER = 512 * 1024;
const LOW_WATER = 128 * 1024;

function isolatedAgentDir(): string {
  return path.join(app.getPath('userData'), 'poc-agent');
}

function projectsFile(): string {
  return path.join(app.getPath('userData'), 'projects.json');
}

function loadProjects(): ProjectRecord[] {
  try {
    const data = JSON.parse(readFileSync(projectsFile(), 'utf8')) as { projects?: unknown };
    if (!Array.isArray(data.projects)) return [];
    return data.projects.filter((item): item is ProjectRecord => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.path === 'string' && typeof record.name === 'string' && typeof record.lastUsed === 'number';
    }).slice(0, 12);
  } catch {
    return [];
  }
}

function rememberProject(cwd: string): void {
  const list = loadProjects().filter((item) => item.path !== cwd);
  list.unshift({ path: cwd, name: path.basename(cwd) || cwd, lastUsed: Date.now() });
  try {
    writeFileSync(projectsFile(), `${JSON.stringify({ projects: list.slice(0, 12) }, null, 2)}\n`, 'utf8');
  } catch {
    // a read-only profile should not block starting Pi
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function send(channel: string, ...args: unknown[]): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

let automation: AutomationStore | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function automationStore(): AutomationStore {
  if (!automation) {
    automation = new AutomationStore(app.getPath('userData'));
    automation.setExecutor(executeAutomation);
  }
  return automation;
}

function runShellAction(command: string, argsText: string, cwd: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const line = argsText ? `${command} ${argsText}` : command;
    let output = '';
    let settled = false;
    let child;
    try {
      child = spawn(line, { cwd, shell: true, windowsHide: true, env: process.env });
    } catch (error) {
      resolve({ ok: false, message: errorMessage(error) });
      return;
    }
    const finish = (ok: boolean, message: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, message: message.slice(-4000) });
    };
    const timer = setTimeout(() => {
      try {
        if (process.platform === 'win32' && child.pid) {
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 });
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        // 进程可能已退出
      }
      finish(false, t('命令执行超时，已终止'));
    }, 10 * 60_000);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => { output = (output + chunk).slice(-20_000); });
    child.stderr?.on('data', (chunk: string) => { output = (output + chunk).slice(-20_000); });
    child.on('error', (error) => finish(false, error.message));
    child.on('close', (code) => finish(code === 0, output.trim() || t('命令已完成（无输出）')));
  });
}

async function executeAutomation(job: AutomationJob): Promise<RunResult> {
  const action = job.action;
  if (action.type === 'notify') {
    if (Notification.isSupported()) new Notification({ title: action.title, body: action.body }).show();
    send('automation:notify', { title: action.title, body: action.body });
    return { ok: true, message: action.title };
  }
  if (action.type === 'open-url') {
    if (!/^https?:\/\//i.test(action.url)) return { ok: false, message: t('只支持 http / https 链接') };
    await shell.openExternal(action.url);
    return { ok: true, message: action.url };
  }
  if (action.type === 'open-path') {
    const resolved = safeOpenTarget(action.target);
    const error = await shell.openPath(resolved);
    return error ? { ok: false, message: error } : { ok: true, message: resolved };
  }
  if (action.type === 'shell') {
    const cwd = job.cwd && existsSync(job.cwd) ? job.cwd : process.cwd();
    return runShellAction(action.command, action.argsText ?? '', cwd);
  }
  if (action.type === 'pi-prompt') {
    const project = job.cwd && existsSync(job.cwd) ? job.cwd : loadProjects()[0]?.path;
    if (!project) return { ok: false, message: t('未设置项目目录') };
    const key = sessionKey(project);
    if (!liveSessions.has(key)) {
      const started = startSession({ cwd: project, cols: 120, rows: 32, isolated: true });
      if (!started.ok) return { ok: false, message: started.error || t('Pi 启动失败') };
      await delay(6000);
    }
    const live = liveSessions.get(key);
    if (!live) return { ok: false, message: t('Pi 未运行') };
    live.session.write(action.prompt.replace(/\r?\n/g, '\r') + '\r');
    return { ok: true, message: t('已发送到 Pi 终端') };
  }
  if (action.type === 'agent') {
    const cwd = job.cwd && existsSync(job.cwd) ? job.cwd : process.cwd();
    const result = await runAgent({ agentId: action.agentId, prompt: action.prompt, cwd }, (event) => {
      send('agents:event', event);
    });
    return { ok: result.ok, message: result.summary || result.error || '' };
  }
  return { ok: false, message: t('未知动作') };
}

let pendingProject: string | undefined;

function projectFromArgv(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--project') {
      const value = argv[index + 1];
      if (value && existsSync(value)) return path.resolve(value);
    }
    if (arg.startsWith('--project=')) {
      const value = arg.slice('--project='.length);
      if (value && existsSync(value)) return path.resolve(value);
    }
  }
  const appPath = path.resolve(app.getAppPath());
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-') || arg === '.') continue;
    const resolved = path.resolve(arg);
    if (resolved === appPath) continue;
    try {
      if (existsSync(resolved) && statSync(resolved).isDirectory()) return resolved;
    } catch {
      // ignore unreadable launch arguments
    }
  }
  return undefined;
}

function focusWindow(): void {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function stopSession(key?: string): void {
  const live = key ? findLiveSession(key) : findLiveSession();
  if (!live) return;
  const targetKey = sessionKey(live.cwd);
  liveSessions.delete(targetKey);
  if (activeKey === targetKey) activeKey = liveSessions.keys().next().value ?? null;
  live.session.stop();
  send('pi:state', { status: 'stopped', key: targetKey, cwd: live.cwd });
}

interface StartOptions {
  cwd: string;
  cols: number;
  rows: number;
  sessionPath?: string;
  isolated?: boolean;
  model?: string;
  thinking?: string;
}

function startSession(options: StartOptions): { ok: boolean; key?: string; isolatedDir?: string; isolated?: boolean; install?: unknown; error?: string } {
  try {
    if (!options || typeof options.cwd !== 'string' || !options.cwd) {
      throw new Error(t('缺少项目目录'));
    }
    const key = sessionKey(options.cwd);
    if (!liveSessions.has(key) && liveSessions.size >= MAX_LIVE_SESSIONS) {
      return { ok: false, error: t('最多同时运行 {count} 个项目的 Pi，请先停止一个', { count: MAX_LIVE_SESSIONS }) };
    }
    if (liveSessions.has(key)) stopSession(key);
    const isolated = options.isolated !== false;
    const agentDir = isolated ? isolatedAgentDir() : resolvePi().agentDir;
    mkdirSync(agentDir, { recursive: true });
    setProjectDir(options.cwd);
    const isolatedSessions = path.join(isolatedAgentDir(), 'sessions');
    const sessionPath = options.sessionPath;
    if (sessionPath !== undefined && !isSafeSessionPath(sessionPath, [isolatedSessions])) {
      throw new Error(t('会话文件不在 Pi 会话目录内'));
    }
    const model = typeof options.model === 'string' ? options.model.trim() : '';
    if (model && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,120}$/.test(model)) {
      throw new Error(t('模型标识无效'));
    }
    const thinking = typeof options.thinking === 'string' ? options.thinking.trim() : '';
    if (thinking && !['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(thinking)) {
      throw new Error(t('推理度无效'));
    }

    // 优先级：本次启动显式选择 > 项目配置 > 应用默认值。
    const projectConfig = readProjectConfig(options.cwd);
    const project = projectConfig.ok ? projectConfig.config : undefined;
    const defaults = loadAppDefaults();
    const launchModel = model || project?.model || defaults.model;
    const launchThinking = thinking || project?.thinking || defaults.thinking;
    const projectEnv = projectConfig.ok ? projectConfig.env : undefined;

    const next = spawnPi({
      cwd: options.cwd,
      cols: Number(options.cols) || 120,
      rows: Number(options.rows) || 32,
      agentDir,
      isolated,
      sessionPath,
      model: launchModel || undefined,
      thinking: launchThinking || undefined,
      env: projectEnv,
    });
    const live: LiveSession = {
      session: next,
      cwd: options.cwd,
      unackedBytes: 0,
      startedAt: Date.now(),
    };
    liveSessions.set(key, live);
    activeKey = key;

    next.onData((data) => {
      queuePtyData(key, data);
    });

    next.onExit(({ exitCode }) => {
      flushPtyData();
      if (liveSessions.get(key) === live) {
        liveSessions.delete(key);
        if (activeKey === key) activeKey = liveSessions.keys().next().value ?? null;
        send('pi:state', { status: 'exited', exitCode, key, cwd: live.cwd });
      }
    });

    send('pi:state', { status: 'running', cwd: options.cwd, key });
    return {
      ok: true,
      key,
      isolatedDir: agentDir,
      isolated,
      install: {
        version: next.install.version,
        cliPath: next.install.cliPath,
        nodePath: next.install.nodePath,
      },
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

async function runSmoke(): Promise<void> {
  const cwd = process.env.PI_DESKTOP_SMOKE_CWD || process.cwd();
  const out = process.env.PI_DESKTOP_SMOKE_OUT || path.join(process.cwd(), 'poc-electron.png');
  const result = startSession({
    cwd,
    cols: 120,
    rows: 32,
    isolated: process.env.PI_DESKTOP_SMOKE_REAL !== '1',
  });
  console.log(`[smoke] start ${JSON.stringify(result)}`);
  if (!result.ok) {
    app.exit(1);
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  if (process.env.PI_DESKTOP_SMOKE_IME === '1') {
    try {
      const ime = await win?.webContents.executeJavaScript(`(() => {
        const textarea = document.querySelector('.xterm-helper-textarea');
        if (!textarea) return { ok: false };
        textarea.focus();
        const fire = (type, data) =>
          textarea.dispatchEvent(new CompositionEvent(type, { data, bubbles: true, cancelable: true }));
        fire('compositionstart', '');
        fire('compositionupdate', '中文');
        textarea.value = '中文';
        textarea.dispatchEvent(new InputEvent('input', {
          bubbles: true, inputType: 'insertCompositionText', data: '中文',
        }));
        fire('compositionend', '中文');
        return { ok: true, left: textarea.style.left, top: textarea.style.top };
      })()`);
      console.log(`[smoke] ime ${JSON.stringify(ime)}`);
    } catch (error) {
      console.error(`[smoke] ime probe failed: ${errorMessage(error)}`);
    }
  }
  if (process.env.PI_DESKTOP_SMOKE_ERROR === '1') {
    win?.webContents.send('pty:data', '\r\n  0.0%/272k (auto) (openai) gpt-5.5 • medium\r\nError: OpenAI API error (401): Incorrect API key provided\r\n');
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      const alert = await win?.webContents.executeJavaScript(`({
        hidden: document.getElementById('terminal-alert')?.hidden ?? null,
        text: document.getElementById('terminal-alert-text')?.textContent ?? '',
        failedTags: document.querySelectorAll('.tag.failed').length,
        model: document.getElementById('active-model')?.textContent ?? '',
      })`);
      console.log(`[smoke] alert ${JSON.stringify(alert)}`);
    } catch (error) {
      console.error(`[smoke] alert probe failed: ${errorMessage(error)}`);
    }
  }
  const tab = process.env.PI_DESKTOP_SMOKE_TAB;
  if (tab && ['model', 'capability', 'provider', 'session', 'audit'].includes(tab)) {
    try {
      const result = await win?.webContents.executeJavaScript(`(() => {
        const button = document.getElementById('tab-${tab}');
        if (button) button.click();
        return { found: Boolean(button), tabs: document.querySelectorAll('[role=tab]').length,
          selected: document.querySelector('[role=tab][aria-selected=true]')?.id ?? null };
      })()`);
      console.log(`[smoke] tab: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error(`[smoke] tab switch failed: ${errorMessage(error)}`);
    }
  }
  if (process.env.PI_DESKTOP_SMOKE_PROVIDERS === '1') {
    let server: Server | undefined;
    try {
      let authSeen = false;
      server = createServer((request, response) => {
        authSeen = authSeen || Boolean(request.headers.authorization);
        if (request.url?.includes('/deny')) {
          response.writeHead(401, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: { message: 'Incorrect API key provided: sk-smoke-test-key' } }));
          return;
        }
        if (request.url?.includes('/models')) {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ data: [{ id: 'smoke-alpha' }, { id: 'smoke-beta' }] }));
        } else {
          response.writeHead(404);
          response.end();
        }
      });
      await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const result = await win?.webContents.executeJavaScript(`(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const baseUrl = 'http://127.0.0.1:${port}/v1';
        const saved = await window.piDesktop.saveProvider({
          id: 'smoke-relay',
          name: 'Smoke Relay',
          baseUrl,
          api: 'openai-completions',
          apiKey: 'sk-smoke-test-key',
          headersText: 'X-Test-Header: 1',
          modelsText: 'smoke-manual | Manual Model | 65536 | true',
        });
        const listed = await window.piDesktop.providers();
        const info = listed.report?.providers.find((provider) => provider.id === 'smoke-relay');
        const fetched = await window.piDesktop.fetchProviderModels({ providerId: 'smoke-relay' });
        const edited = await window.piDesktop.saveProvider({
          id: 'smoke-relay',
          name: 'Smoke Relay Edited',
          baseUrl,
          api: 'openai-completions',
          keepHeaders: true,
          modelsText: 'smoke-manual | Manual Model | 131072 | false',
        });
        const afterEditList = await window.piDesktop.providers();
        const editedInfo = afterEditList.report?.providers.find((provider) => provider.id === 'smoke-relay');
        const invalid = await window.piDesktop.saveProvider({
          id: '__proto__',
          baseUrl,
          api: 'openai-completions',
          modelsText: 'x',
        });
        const denied = await window.piDesktop.fetchProviderModels({
          baseUrl: 'http://127.0.0.1:${port}/deny',
          api: 'openai-completions',
          apiKey: 'sk-smoke-test-key',
        });
        const defaultResult = await window.piDesktop.setDefaultModel('smoke-relay', 'smoke-manual');
        const defaultReport = await window.piDesktop.inspectModels();
        document.getElementById('tab-provider')?.click();
        document.getElementById('add-provider')?.click();
        const form = document.getElementById('provider-form');
        const formVisible = form ? !form.hidden : false;
        document.getElementById('cancel-provider')?.click();
        await wait(400);
        const panel = {
          formVisible,
          listCount: document.querySelectorAll('.provider-item').length,
          summary: document.getElementById('provider-summary')?.textContent ?? '',
        };
        const clearedResult = await window.piDesktop.saveProviderKey('smoke-relay', '');
        const cleared = await window.piDesktop.providers();
        const clearedInfo = cleared.report?.providers.find((provider) => provider.id === 'smoke-relay');
        const removed = await window.piDesktop.deleteProvider('smoke-relay');
        const finalList = await window.piDesktop.providers();
        const finalDefaults = await window.piDesktop.inspectModels();
        return {
          saved,
          listed: listed.ok,
          info: info ? { custom: info.custom, models: info.modelCount, hasKey: info.hasStoredKey, headers: info.headerNames, modelsText: info.modelsText } : null,
          fetched: fetched.ok ? { ok: true, count: fetched.models?.length ?? 0, models: fetched.models, latencyMs: fetched.latencyMs } : fetched,
          edited,
          editedInfo: editedInfo ? { name: editedInfo.name, modelsText: editedInfo.modelsText, hasKey: editedInfo.hasStoredKey, headers: editedInfo.headerNames } : null,
          invalidRejected: !invalid.ok,
          denied: { ok: denied.ok, error: denied.error },
          deniedLeaksKey: JSON.stringify(denied).includes('sk-smoke'),
          defaultResult,
          defaultBeforeDelete: defaultReport.report ? defaultReport.report.defaultProvider + '/' + defaultReport.report.defaultModel : '',
          panel,
          clearedResult,
          clearedHasKey: clearedInfo?.hasStoredKey ?? null,
          removed,
          removedGone: !(finalList.report?.providers ?? []).some((provider) => provider.id === 'smoke-relay'),
          defaultAfterDelete: finalDefaults.report ? finalDefaults.report.defaultProvider + '/' + finalDefaults.report.defaultModel : '',
        };
      })()`);
      console.log(`[smoke] providers ${JSON.stringify(result)} authSeen=${authSeen}`);
    } catch (error) {
      console.error(`[smoke] provider probe failed: ${errorMessage(error)}`);
    } finally {
      server?.close();
    }
  }
  if (process.env.PI_DESKTOP_SMOKE_MEDIA === '1') {
    try {
      const width = 240;
      const height = 140;
      const rowSize = Math.ceil((width * 3) / 4) * 4;
      const buffer = Buffer.alloc(54 + rowSize * height);
      buffer.write('BM', 0);
      buffer.writeUInt32LE(buffer.length, 2);
      buffer.writeUInt32LE(54, 10);
      buffer.writeUInt32LE(40, 14);
      buffer.writeInt32LE(width, 18);
      buffer.writeInt32LE(height, 22);
      buffer.writeUInt16LE(1, 26);
      buffer.writeUInt16LE(24, 28);
      buffer.writeUInt32LE(rowSize * height, 34);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = 54 + y * rowSize + x * 3;
          buffer[offset] = Math.round(120 + 90 * Math.sin(x / 26));
          buffer[offset + 1] = Math.round(150 + 70 * Math.cos(y / 18));
          buffer[offset + 2] = Math.round(170 + 60 * Math.sin((x + y) / 34));
        }
      }
      const mediaPath = path.join(app.getPath('userData'), 'smoke-media.bmp');
      writeFileSync(mediaPath, buffer);
      const result = await win?.webContents.executeJavaScript(`(async () => {
        const item = await window.piDesktop.allowMediaPath(${JSON.stringify(mediaPath)});
        const rejected = await window.piDesktop.allowMediaPath(${JSON.stringify(path.join(process.cwd(), 'package.json'))});
        const smoke = window.__piSmoke;
        smoke.attach(item.item);
        smoke.preview(item.item);
        smoke.openPalette();
        const paletteCount = document.querySelectorAll('.command-item').length;
        document.getElementById('command-search')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        const activeCommand = document.querySelector('.command-item.active code')?.textContent ?? '';
        smoke.closePalette();
        const composer = document.getElementById('composer-input');
        composer.value = 'smoke text';
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        const sendEnabled = !document.getElementById('send-message').disabled;
        composer.value = '';
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        const image = document.querySelector('#media-preview img');
        const width = image ? await new Promise((resolve) => {
          const done = () => resolve(image.naturalWidth || -1);
          if (image.complete) done();
          else {
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', () => resolve(-1), { once: true });
            setTimeout(() => resolve(-2), 2500);
          }
        }) : -3;
        return {
          ok: item.ok,
          kind: item.item?.kind,
          scheme: item.item?.url?.startsWith('pi-media://') ?? false,
          chips: document.querySelectorAll('.attachment-chip').length,
          thumbLoaded: (() => { const thumb = document.querySelector('.attachment-chip img'); return thumb ? thumb.complete && thumb.naturalWidth > 0 : false; })(),
          previewOpen: !document.getElementById('media-preview').hidden,
          imageWidth: width,
          paletteCount,
          activeCommand,
          rejectedNonMedia: !rejected.ok,
          composerSendEnabled: sendEnabled,
          state: smoke.state(),
        };
      })()`);
      console.log(`[smoke] media ${JSON.stringify(result)}`);
    } catch (error) {
      console.error(`[smoke] media probe failed: ${errorMessage(error)}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    const ui = await win?.webContents.executeJavaScript(`(() => {
      document.getElementById('search-toggle')?.click();
      const searchOpen = !document.getElementById('search-bar')?.hidden;
      document.getElementById('search-close')?.click();
      return {
        search: Boolean(document.getElementById('search-bar')),
        searchOpen,
        isolatedToggle: Boolean(document.getElementById('isolated-mode')),
        isolatedChecked: document.getElementById('isolated-mode')?.checked ?? null,
        send: Boolean(document.getElementById('send-command')),
        scroll: Boolean(document.getElementById('scroll-bottom')),
        hint: document.getElementById('terminal-hint')?.hidden ?? null,
        activeModel: document.getElementById('active-model')?.textContent ?? '',
        modeNote: document.getElementById('mode-note')?.textContent?.slice(0, 12) ?? ''
      };
    })()`);
    console.log(`[smoke] ui ${JSON.stringify(ui)}`);
  } catch (error) {
    console.error(`[smoke] ui probe failed: ${errorMessage(error)}`);
  }
  try {
    if (win && !win.isDestroyed()) {
      const image = await win.webContents.capturePage();
      writeFileSync(out, image.toPNG());
      console.log(`SMOKE_PNG=${out}`);
    }
  } catch (error) {
    console.error(`[smoke] capture failed: ${errorMessage(error)}`);
  }
  app.exit(0);
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111517',
    title: t('Pi 工作台'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const loadQuery: Record<string, string> = {};
  if (process.env.PI_DESKTOP_SMOKE === '1') {
    loadQuery.smokeCwd = process.env.PI_DESKTOP_SMOKE_CWD || process.cwd();
    loadQuery.smokeIsolated = process.env.PI_DESKTOP_SMOKE_REAL === '1' ? '0' : '1';
  }
  if (process.env.PI_DESKTOP_PROFILE === '1') loadQuery.profile = '1';
  win.loadFile(
    path.join(__dirname, '../renderer/index.html'),
    Object.keys(loadQuery).length ? { query: loadQuery } : undefined,
  );
  win.webContents.once('dom-ready', () => bootLog('dom-ready'));
  win.webContents.once('did-finish-load', () => bootLog('did-finish-load'));
  if (process.env.PI_DESKTOP_PROFILE === '1') {
    win.webContents.on('did-start-loading', () => bootLog('did-start-loading'));
    win.webContents.on('did-stop-loading', () => bootLog('did-stop-loading'));
    win.webContents.on('render-process-gone', (_event, details) => bootLog(`render-gone ${details.reason}`));
    win.on('unresponsive', () => bootLog('unresponsive'));
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        const profiler = (globalThis as Record<string, unknown>).__piProfiler as inspector.Session | undefined;
        if (!profiler) return;
        profiler.post('Profiler.stop', (stopError, result) => {
          if (stopError) return;
          try {
            const file = path.join(os.tmpdir(), 'pi-desktop-main.cpuprofile');
            writeFileSync(file, JSON.stringify((result as { profile: unknown }).profile));
            bootLog(`cpuprofile ${file}`);
          } catch {
            // 采样文件写失败不影响启动
          }
          profiler.disconnect();
        });
      }, 2000);
    });
  }
  win.on('closed', () => {
    win = null;
    stopSession();
  });

  win.webContents.once('did-finish-load', () => {
    if (!pendingProject) return;
    const target = pendingProject;
    pendingProject = undefined;
    send('app:open-project', target);
  });

  if (process.env.PI_DESKTOP_SMOKE === '1') {
    win.webContents.once('did-finish-load', () => {
      void runSmoke();
    });
  }
}

ipcMain.handle('app:locate', () => {
  try {
    const install = resolvePi();
    return {
      ok: true,
      install: {
        version: install.version,
        cliPath: install.cliPath,
        nodePath: install.nodePath,
        agentDir: install.agentDir,
      },
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron ?? '',
  platform: `${process.platform} ${process.arch}`,
}));

ipcMain.handle('project:pick', async () => {
  const result = await dialog.showOpenDialog({
    title: t('选择项目目录'),
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const picked = result.filePaths[0];
  rememberProject(picked);
  setProjectDir(picked);
  return { ok: true, path: picked };
});

ipcMain.handle('app:projects', () => ({
  ok: true,
  projects: loadProjects().map((project) => ({ ...project, exists: existsSync(project.path) })),
}));

// 从其他编辑器读取最近项目；只返回仍存在的目录，不修改对方配置。
ipcMain.handle('project:import-candidates', () => {
  try {
    return { ok: true, projects: listImportedProjects() };
  } catch (error) {
    return { ok: false, projects: [], error: errorMessage(error) };
  }
});

// 把用户勾选的项目写入本工作台的最近项目列表。
ipcMain.handle('project:remember', (_event, paths: unknown) => {
  const list = Array.isArray(paths) ? paths : [];
  let added = 0;
  for (const item of list.slice(0, 200)) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const resolved = path.resolve(item.trim());
    // 目录可能刚被删除或无权限访问，单条失败不影响其他项目
    try {
      if (!statSync(resolved).isDirectory()) continue;
    } catch {
      continue;
    }
    rememberProject(resolved);
    added += 1;
  }
  return { ok: true, added };
});

ipcMain.handle('pi:inspect-models', () => {
  try {
    return { ok: true, report: inspectModels() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('pi:providers', () => {
  try {
    return { ok: true, report: listProviders() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('pi:save-provider', (_event, input: unknown) => saveProvider(input));
ipcMain.handle('pi:delete-provider', (_event, id: unknown) => deleteProvider(id));
ipcMain.handle('pi:save-provider-key', (_event, id: unknown, key: unknown) => saveProviderKey(id, key));
ipcMain.handle('pi:fetch-provider-models', (_event, input: unknown) => fetchProviderModels(input));
ipcMain.handle('pi:set-default-model', (_event, provider: unknown, model: unknown) => setDefaultModel(provider, model));

ipcMain.handle('media:pick', () => pickMedia());
ipcMain.handle('media:clipboard-image', () => clipboardImage());
ipcMain.handle('media:allow', (_event, filePath: unknown) => allowMediaPath(filePath));
ipcMain.handle('media:open-external', (_event, filePath: unknown) => openMediaExternally(filePath));

ipcMain.handle('pi:inspect-capabilities', (_event, cwd: unknown) => {
  try {
    if (typeof cwd !== 'string' || !cwd) throw new Error(t('缺少项目目录'));
    return { ok: true, report: inspectCapabilities(cwd) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('pi:sessions', (_event, cwd: unknown) => {
  try {
    if (typeof cwd !== 'string' || !cwd) throw new Error(t('缺少项目目录'));
    const isolatedSessions = path.join(isolatedAgentDir(), 'sessions');
    return { ok: true, sessions: listSessions(cwd, [isolatedSessions]) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

// 只读汇总会话用量；与 pi:sessions 使用同一批会话目录
ipcMain.handle('usage:report', (_event, cwd: unknown) => {
  try {
    if (typeof cwd !== 'string' || !cwd) throw new Error(t('缺少项目目录'));
    const isolatedSessions = path.join(isolatedAgentDir(), 'sessions');
    return usageReport(cwd, [isolatedSessions]);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

// 用户点击后才会写入全局设置；保留其他键并自动备份
ipcMain.handle('usage:apply-savings', () => {
  try {
    return applyGlobalTokenSavings();
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('pi:add-skill', (_event, input: unknown) => addSkill(input as Parameters<typeof addSkill>[0]));
ipcMain.handle('pi:remove-skill', (_event, input: unknown) => removeSkill(input as Parameters<typeof removeSkill>[0]));
ipcMain.handle('pi:add-mcp', (_event, input: unknown) => addMcpServer(input as Parameters<typeof addMcpServer>[0]));

ipcMain.handle('project:git-status', (_event, cwd: unknown) => gitStatus(cwd));

ipcMain.handle('catalog:list', async () => {
  try {
    return { ok: true, catalog: listCatalog(), agents: await detectAgents() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('catalog:search-mcp', (_event, query: unknown) => searchMcpRegistry(typeof query === 'string' ? query : ''));
ipcMain.handle('catalog:search-extensions', (_event, query: unknown) =>
  searchNpmExtensions(typeof query === 'string' ? query : ''));
ipcMain.handle('catalog:install-extension', async (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const name = typeof input === 'string' ? input : typeof source.name === 'string' ? source.name : '';
  if (!name) return { ok: false, output: '', error: t('参数无效') };
  const result = await installExtension(name, (line) => send('catalog:install-event', { name, line }));
  if (result.ok) {
    recordInstalledMeta({
      scope: 'user',
      kind: 'extension',
      name,
      category: typeof source.category === 'string' ? source.category : undefined,
      tags: Array.isArray(source.tags) ? source.tags.filter((item): item is string => typeof item === 'string') : [],
      source: typeof source.source === 'string' ? source.source : 'npm',
    });
    send('catalog:changed', {});
  }
  return result;
});
ipcMain.handle('catalog:import-skill-url', async (_event, input: unknown) => {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const source = input as Record<string, unknown>;
  const scope = source.scope === 'user' ? 'user' : 'project';
  const cwd = typeof source.cwd === 'string' ? source.cwd : undefined;
  if (scope === 'project' && !cwd) return { ok: false, error: t('缺少项目目录') };
  const fetched = await fetchSkillFromUrl(typeof source.url === 'string' ? source.url : '');
  if (!fetched.ok || !fetched.name) return { ok: false, error: fetched.error ?? t('读取失败') };
  return addSkill({
    scope,
    cwd: scope === 'project' ? cwd : undefined,
    name: fetched.name,
    description: fetched.description,
    body: fetched.body,
    category: typeof source.category === 'string' ? source.category : '自定义',
    tags: Array.isArray(source.tags) ? source.tags.filter((item): item is string => typeof item === 'string') : [],
    source: typeof source.url === 'string' ? source.url : 'url',
  });
});

ipcMain.handle('agents:list', async (_event, refresh: unknown) => {
  try {
    return { ok: true, agents: await detectAgents(Boolean(refresh)) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('agents:run', async (_event, input: unknown) => {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const source = input as Record<string, unknown>;
  if (typeof source.agentId !== 'string' || typeof source.prompt !== 'string') {
    return { ok: false, error: t('参数无效') };
  }
  return runAgent(
    {
      agentId: source.agentId,
      prompt: source.prompt,
      cwd: typeof source.cwd === 'string' ? source.cwd : undefined,
      timeoutMinutes: Number(source.timeoutMinutes) || undefined,
    },
    (event) => send('agents:event', event),
  );
});

ipcMain.handle('agents:stop', (_event, runId: unknown) => ({ ok: stopRun(String(runId ?? '')) }));

ipcMain.handle('agents:suggest-team', (_event, task: unknown, cwd: unknown) => {
  try {
    return suggestTeam(typeof task === 'string' ? task : '', typeof cwd === 'string' ? cwd : '');
  } catch (error) {
    return { taskKind: '', members: [], supervisorId: '', reason: errorMessage(error) };
  }
});

ipcMain.handle('agents:install', async (_event, agentId: unknown) => {
  if (typeof agentId !== 'string') return { ok: false, agentId: '', output: '', error: t('参数无效') };
  return installAgent(agentId, (line) => send('agents:install-event', { agentId, line }));
});

ipcMain.handle('agents:save-custom', (_event, input: unknown) => saveCustomAgent(input));
ipcMain.handle('agents:remove-custom', (_event, id: unknown) => removeCustomAgent(id));

ipcMain.handle('agents:open-app', (_event, agentId: unknown, cwd: unknown) => {
  if (typeof agentId !== 'string') return { ok: false, error: t('参数无效') };
  return openAgentApp(agentId, typeof cwd === 'string' ? cwd : undefined);
});

ipcMain.handle('agents:pick-command', async () => {
  const result = await dialog.showOpenDialog({
    title: t('选择可执行文件'),
    properties: ['openFile'],
    filters: process.platform === 'win32'
      ? [{ name: t('可执行文件'), extensions: ['exe', 'cmd', 'bat', 'com'] }]
      : undefined,
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle('agents:team', async (_event, input: unknown) => {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效'), summaries: [] };
  const source = input as Record<string, unknown>;
  return runTeam(
    {
      task: typeof source.task === 'string' ? source.task : '',
      agentIds: Array.isArray(source.agentIds) ? source.agentIds.filter((id): id is string => typeof id === 'string') : [],
      mode: source.mode === 'supervisor' ? 'supervisor' : 'parallel',
      supervisorId: typeof source.supervisorId === 'string' ? source.supervisorId : undefined,
      cwd: typeof source.cwd === 'string' ? source.cwd : undefined,
      apps: Array.isArray(source.apps) ? source.apps.filter((id): id is string => typeof id === 'string') : [],
      webSearch: source.webSearch === true,
    },
    (event) => send('agents:event', event),
  );
});

ipcMain.handle('automation:list', () => {
  try {
    return { ok: true, ...automationStore().list() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('automation:save-job', (_event, input: unknown, id: unknown) => {
  try {
    return automationStore().saveJob(input, typeof id === 'string' ? id : undefined);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('automation:delete-job', (_event, id: unknown) => ({
  ok: automationStore().deleteJob(String(id ?? '')),
}));

ipcMain.handle('automation:toggle-job', (_event, id: unknown, enabled: unknown) => ({
  ok: automationStore().toggleJob(String(id ?? ''), Boolean(enabled)),
}));

ipcMain.handle('automation:run-job', async (_event, id: unknown) => automationStore().runNow(String(id ?? '')));

ipcMain.handle('automation:save-channel', (_event, input: unknown, id: unknown) => {
  try {
    return automationStore().saveChannel(input, typeof id === 'string' ? id : undefined);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('automation:delete-channel', (_event, id: unknown) => ({
  ok: automationStore().deleteChannel(String(id ?? '')),
}));

ipcMain.handle('automation:test-channel', (_event, id: unknown) => automationStore().testChannel(String(id ?? '')));

ipcMain.handle('tools:list-apps', async (_event, refresh: unknown) => {
  try {
    return { ok: true, apps: await appCatalog(refresh === true) };
  } catch (error) {
    return { ok: false, apps: [], error: errorMessage(error) };
  }
});

// 扫描开始菜单全部快捷方式；按需触发，不自动执行。
ipcMain.handle('tools:scan-apps', async (_event, refresh: unknown) => {
  try {
    return { ok: true, apps: await scanLocalApps(refresh === true) };
  } catch (error) {
    return { ok: false, apps: [], error: errorMessage(error) };
  }
});

// 一键安装：仅在用户点击时调用，命令与包 ID 都来自内置目录。
ipcMain.handle('tools:install-app', (_event, id: unknown) =>
  installLocalApp(typeof id === 'string' ? id : ''));

ipcMain.handle('tools:list-links', () => ({ ok: true, links: listCustomLinks() }));

ipcMain.handle('tools:save-link', (_event, input: unknown) => saveCustomLink(input));

ipcMain.handle('tools:remove-link', (_event, id: unknown) => removeCustomLink(id));

ipcMain.handle('tools:open-app', async (_event, id: unknown, target: unknown) => {
  try {
    return await openLocalApp(id, target);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('tools:save-app', (_event, input: unknown) => {
  try {
    return saveCustomApp(input);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('tools:remove-app', (_event, id: unknown) => {
  try {
    return removeCustomApp(id);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('tools:pick-app-exe', async () => {
  const result = await dialog.showOpenDialog({
    title: t('选择可执行文件'),
    properties: ['openFile'],
    filters: [{ name: t('可执行文件'), extensions: ['exe'] }],
  });
  const picked = result.filePaths[0];
  return result.canceled || !picked ? { ok: false } : { ok: true, path: picked };
});

ipcMain.handle('tools:get-settings', () => ({ ok: true, settings: getToolSettings() }));

ipcMain.handle('tools:tool-status', () => detectTools());

ipcMain.handle('tools:install-tool', async (event, id: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: t('未知工具') };
  const statuses = await detectTools();
  const status = statuses.find((item) => item.id === id);
  if (!status) return { ok: false, error: t('未知工具') };
  if (status.installed) return { ok: true, id, status };
  if (!status.installable) return { ok: false, id, error: t('该工具暂不支持一键安装') };

  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    type: 'question' as const,
    title: t('安装外部工具'),
    message: t('安装 {{name}}？').replace('{{name}}', status.label),
    detail: t('来源：{{source}} · 体积：{{size}}\n将从固定官方来源下载并校验，不修改系统 PATH。').replace('{{source}}', status.source).replace('{{size}}', status.sizeHint),
    buttons: [t('取消'), t('安装')],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const confirmed = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options);
  if (confirmed.response !== 1) return { ok: false, id, canceled: true, error: t('已取消安装') };
  return installTool(id as ToolId);
});

ipcMain.handle('tools:save-settings', (_event, input: unknown) => saveToolSettings(input));

ipcMain.handle('tools:search', (_event, query: unknown) =>
  searchWeb(typeof query === 'string' ? query : ''));

// 项目与代码检索：只发送查询词到 GitHub / grep.app，不在本机读取密钥
ipcMain.handle('tools:search-repos', (_event, query: unknown) => searchRepos(query));
ipcMain.handle('tools:search-code', (_event, query: unknown) => searchCode(query));

ipcMain.handle('tools:fetch-page', (_event, url: unknown) =>
  fetchPage(typeof url === 'string' ? url : ''));

ipcMain.handle('tools:crawl', (_event, url: unknown) =>
  crawlPage(typeof url === 'string' ? url : ''));

ipcMain.handle('tools:crawl-start', (event, input: unknown) => {
  const options = (input && typeof input === 'object' ? input : {}) as CrawlOptions;
  return startCrawl(options, (payload) => {
    if (!event.sender.isDestroyed()) event.sender.send('tools:crawl-progress', payload);
  });
});

ipcMain.handle('tools:crawl-cancel', (_event, runId: unknown) =>
  cancelCrawl(typeof runId === 'string' ? runId : ''));

ipcMain.handle('tools:analyze', (_event, target: unknown) =>
  analyzePath(typeof target === 'string' ? target : ''));

ipcMain.handle('tools:triage', (_event, target: unknown) =>
  runTriage(typeof target === 'string' ? target : ''));

ipcMain.handle('security:pick-path', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: t('选择要审计的项目目录'),
    properties: ['openDirectory' as const],
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const picked = result.filePaths[0];
  return result.canceled || !picked ? { ok: false } : { ok: true, path: picked };
});

ipcMain.handle('security:run-audit', (event, input: unknown) => {
  const options = (input && typeof input === 'object' ? input : {}) as AuditOptions;
  return runLocalAudit(options, (payload) => {
    if (!event.sender.isDestroyed()) event.sender.send('security:progress', payload);
  });
});

ipcMain.handle('security:stop-audit', () => stopAudit());

ipcMain.handle('security:findings', () => {
  const report = getLastFindings();
  return report ? { ok: true, report } : { ok: false };
});

ipcMain.handle('security:export', async (event, format: unknown) => {
  const report = getLastFindings();
  if (!report) return { ok: false, error: t('没有可导出的审计结果') };
  const sarif = format !== 'json';
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: sarif ? t('导出 SARIF') : t('导出 JSON'),
    defaultPath: path.join(app.getPath('downloads'), sarif ? 'security-report.sarif' : 'security-report.json'),
    filters: sarif
      ? [{ name: 'SARIF', extensions: ['sarif'] }, { name: t('所有文件'), extensions: ['*'] }]
      : [{ name: 'JSON', extensions: ['json'] }, { name: t('所有文件'), extensions: ['*'] }],
  };
  const picked = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (picked.canceled || !picked.filePath) return { ok: false, canceled: true };
  try {
    writeFileSync(picked.filePath, sarif ? buildSarif(report) : `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return { ok: true, path: picked.filePath };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('security:authorize', (_event, input: unknown) => {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<AuthorizationInput>;
  return authorizeTarget({
    url: typeof raw.url === 'string' ? raw.url : '',
    hostConfirm: typeof raw.hostConfirm === 'string' ? raw.hostConfirm : '',
    statement: raw.statement === true,
    note: typeof raw.note === 'string' ? raw.note : '',
    allowLocal: raw.allowLocal === true,
  });
});

ipcMain.handle('security:run-passive', (event, input: unknown) => {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<PassiveOptions>;
  return runPassive(
    { url: typeof raw.url === 'string' ? raw.url : '', allowLocal: raw.allowLocal === true },
    (payload) => {
      if (!event.sender.isDestroyed()) event.sender.send('security:pentest-progress', payload);
    },
  );
});

ipcMain.handle('security:run-pentest', (event, input: unknown) => {
  const raw = (input && typeof input === 'object' ? input : {}) as { token?: unknown };
  return runPentest(
    { token: typeof raw.token === 'string' ? raw.token : '' },
    (payload) => {
      if (!event.sender.isDestroyed()) event.sender.send('security:pentest-progress', payload);
    },
  );
});

ipcMain.handle('security:stop-pentest', () => stopPentest());

ipcMain.handle('security:audit-log', () => getAuditLog());

ipcMain.handle('tools:pick-analyze-path', async () => {
  const result = await dialog.showOpenDialog({
    title: t('选择要分析的文件或目录'),
    properties: ['openFile', 'openDirectory'],
  });
  const picked = result.filePaths[0];
  return result.canceled || !picked ? { ok: false } : { ok: true, path: picked };
});

async function openLocalApp(id: unknown, target: unknown): Promise<{ ok: boolean; error?: string }> {
  if (typeof id !== 'string') return { ok: false, error: t('未知应用') };
  const resolved = typeof target === 'string' && target.trim() ? safeOpenTarget(target) : undefined;
  // 开始菜单扫描出来的程序走独立启动路径，只能使用扫描缓存里的 ID。
  if (id.startsWith('scan-')) {
    return launchScannedApp(id, resolved) ?? { ok: false, error: t('未知应用') };
  }
  if (id === 'vscode') {
    const folder = resolved ?? process.cwd();
    const slashPath = folder.split(path.sep).join('/');
    const uri = encodeURI(`vscode://file${process.platform === 'win32' ? '/' : ''}${slashPath}`);
    void shell.openExternal(uri);
    return { ok: true };
  }
  if (process.platform !== 'win32') {
    if (id === 'explorer' || id === 'finder') {
      void shell.openPath(resolved ?? app.getPath('home'));
      return { ok: true };
    }
    return { ok: false, error: t('该平台暂未内置此应用，请用「打开路径」') };
  }
  const catalogApp = (await appCatalog()).find((item) => item.id === id);
  if (catalogApp) return launchLocalApp(id, resolved);

  const launches: Record<string, { command: string; args: string[] }> = {
    explorer: { command: 'explorer.exe', args: [resolved ?? app.getPath('home')] },
    terminal: { command: 'wt.exe', args: resolved ? ['-d', resolved] : [] },
    notepad: { command: 'notepad.exe', args: resolved ? [resolved] : [] },
    calculator: { command: 'calc.exe', args: [] },
    mspaint: { command: 'mspaint.exe', args: resolved ? [resolved] : [] },
  };
  const launch = launches[id];
  if (!launch) return { ok: false, error: t('未知应用') };
  const child = spawn(launch.command, launch.args, { detached: true, stdio: 'ignore', windowsHide: false });
  child.on('error', () => {
    if (id === 'terminal') {
      spawn('cmd.exe', ['/c', 'start', 'cmd'], { cwd: resolved ?? undefined, detached: true, stdio: 'ignore', windowsHide: false });
    }
  });
  child.unref();
  return { ok: true };
}

function safeOpenTarget(target: unknown): string {
  if (typeof target !== 'string' || !target.trim() || target.includes('\u0000') || target.length > 4096) {
    throw new Error(t('路径无效'));
  }
  const resolved = path.resolve(target);
  if (!existsSync(resolved)) throw new Error(t('路径不存在'));
  return resolved;
}

function shortcutArgs(projectPath?: string): string[] {
  const args = app.isPackaged ? [] : [app.getAppPath()];
  if (projectPath) args.push('--project', projectPath);
  return args;
}

function quoteArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function createDesktopShortcut(target?: unknown): { ok: boolean; path?: string; error?: string } {
  try {
    const project = typeof target === 'string' && target.trim() ? safeOpenTarget(target) : undefined;
    const args = shortcutArgs(project);
    if (process.platform === 'win32') {
      const link = path.join(app.getPath('desktop'), 'Pi 工作台.lnk');
      const created = shell.writeShortcutLink(link, 'create', {
        target: process.execPath,
        args: args.map(quoteArg).join(' '),
        description: 'Pi 桌面工作台',
        icon: process.execPath,
        iconIndex: 0,
      });
      if (!created) return { ok: false, error: t('创建快捷方式失败') };
      return { ok: true, path: link };
    }
    if (process.platform === 'linux') {
      const link = path.join(app.getPath('desktop'), 'pi-workbench.desktop');
      const exec = [process.execPath, ...args].map(quoteArg).join(' ');
      writeFileSync(link, [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Pi 工作台',
        `Exec=${exec}`,
        'Terminal=false',
        'Categories=Development;',
        'Comment=Pi desktop workbench',
        '',
      ].join('\n'), { mode: 0o755 });
      return { ok: true, path: link };
    }
    return { ok: false, error: t('macOS 请从「应用程序」文件夹启动') };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// 首次安装/配置后自动生成桌面快捷方式；已存在时保留用户自己的，不覆盖
function ensureDesktopShortcut(): void {
  try {
    if (process.platform !== 'win32' && process.platform !== 'linux') return;
    const name = process.platform === 'win32' ? 'Pi 工作台.lnk' : 'pi-workbench.desktop';
    if (existsSync(path.join(app.getPath('desktop'), name))) return;
    createDesktopShortcut();
  } catch {
    // 桌面目录不可写时静默跳过，设置里仍可手动补建
  }
}

ipcMain.handle('env:probe', () => probeEnvironment());
ipcMain.handle('env:install-pi', () => installPi());
ipcMain.handle('env:setup', async () => {
  const result = await setupEnvironment();
  if (result.ok) ensureDesktopShortcut();
  return result;
});
ipcMain.handle('env:update-pi', () => updatePi());

ipcMain.handle('permissions:get', (_event, cwd: unknown) => readProjectPermissions(cwd));
ipcMain.handle('permissions:save', (_event, input: unknown) => saveProjectPermissions(input));
ipcMain.handle('project:config', (_event, cwd: unknown) => readProjectConfig(cwd));
ipcMain.handle('project:config-save', (_event, input: unknown) => saveProjectConfig(input));
ipcMain.handle('project:config-reset', (_event, cwd: unknown) => resetProjectConfig(cwd));

ipcMain.handle('project:config-export', async (event, cwd: unknown) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: t('导出项目配置'),
    defaultPath: path.join(app.getPath('documents'), 'pi-workbench-config.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: t('所有文件'), extensions: ['*'] }],
  };
  const picked = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (picked.canceled || !picked.filePath) return { ok: false, canceled: true };
  return exportProjectConfig(cwd, picked.filePath);
});

ipcMain.handle('project:config-import', async (event, cwd: unknown) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: t('导入项目配置'),
    properties: ['openFile' as const],
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: t('所有文件'), extensions: ['*'] }],
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const picked = result.filePaths[0];
  if (result.canceled || !picked) return { ok: false, canceled: true };
  return importProjectConfig(cwd, picked);
});

ipcMain.handle('project:env-import', async (event, cwd: unknown) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: t('导入 .env 环境变量'),
    properties: ['openFile' as const],
    filters: [{ name: '.env', extensions: ['env'] }, { name: t('所有文件'), extensions: ['*'] }],
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const picked = result.filePaths[0];
  if (result.canceled || !picked) return { ok: false, canceled: true };
  return importDotEnvFile(cwd, picked);
});

ipcMain.handle('config:templates', () => listConfigTemplates());
ipcMain.handle('config:template-save', (_event, input: unknown) => saveConfigTemplate(input));
ipcMain.handle('config:template-apply', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return applyConfigTemplate(source.cwd, source.id);
});
ipcMain.handle('config:template-delete', (_event, id: unknown) => deleteConfigTemplate(id));
ipcMain.handle('app:defaults', () => loadAppDefaults());
ipcMain.handle('app:defaults-save', (_event, input: unknown) => {
  const result = saveAppDefaults(input);
  if (result.ok && result.defaults?.memorySkill) {
    try {
      ensureMemorySkill();
    } catch {
      // 记忆 Skill 装配失败不影响默认值保存
    }
  }
  return result;
});
ipcMain.handle('permissions:guard', () => ({
  ...installPermissionGuard(),
  installed: guardInstalled(),
  path: permissionGuardPath(),
}));
ipcMain.handle('permissions:guard-status', () => ({ installed: guardInstalled(), path: permissionGuardPath() }));

ipcMain.handle('archives:list', (_event, cwd: unknown) =>
  listArchives(typeof cwd === 'string' ? cwd : ''));
ipcMain.handle('archives:create', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return createArchive(
    typeof source.cwd === 'string' ? source.cwd : '',
    typeof source.label === 'string' ? source.label : undefined,
  );
});
ipcMain.handle('archives:restore', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return restoreArchive(
    typeof source.cwd === 'string' ? source.cwd : '',
    typeof source.id === 'string' ? source.id : '',
  );
});
ipcMain.handle('archives:delete', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return deleteArchive(
    typeof source.cwd === 'string' ? source.cwd : '',
    typeof source.id === 'string' ? source.id : '',
  );
});

ipcMain.handle('memory:ingest', (_event, cwd: unknown) => ingestMemory(cwd));
ipcMain.handle('memory:search', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return searchMemory(source);
});
ipcMain.handle('memory:stats', (_event, cwd: unknown) => memoryStats(cwd));
ipcMain.handle('memory:recent', (_event, cwd: unknown, limit: unknown) =>
  recentMemory(cwd, typeof limit === 'number' ? limit : 12));
ipcMain.handle('memory:install-skill', () => installMemorySkill());
ipcMain.handle('habits:record', (_event, input: unknown) => recordHabit(input));
ipcMain.handle('habits:summary', () => habitSummary());

ipcMain.handle('update:check', () => {
  let piVersion = '0.0.0';
  try {
    piVersion = resolvePi().version;
  } catch {
    // Pi 未安装时仍检查工作台更新
  }
  return checkUpdates(app.getVersion(), piVersion);
});
ipcMain.handle('update:download', (_event, input: unknown) => {
  const source = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  return downloadUpdate(source);
});
ipcMain.handle('update:settings', () => getUpdateSettings());
ipcMain.handle('update:save-settings', (_event, input: unknown) => saveUpdateSettings(input));

ipcMain.handle('app:create-shortcut', (_event, target: unknown) => createDesktopShortcut(target));

ipcMain.handle('app:open-path', async (_event, target: unknown) => {
  try {
    const resolved = safeOpenTarget(target);
    const error = await shell.openPath(resolved);
    return error ? { ok: false, error } : { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('app:open-user-data', async () => {
  try {
    const error = await shell.openPath(app.getPath('userData'));
    return error ? { ok: false, error } : { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('app:open-vscode', async (_event, target: unknown) => {
  try {
    const resolved = safeOpenTarget(target);
    const slashPath = resolved.split(path.sep).join('/');
    const uri = encodeURI(`vscode://file${process.platform === 'win32' ? '/' : ''}${slashPath}`);
    await shell.openExternal(uri);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
});

ipcMain.handle('pi:start', (_event, options: StartOptions) => startSession(options));

ipcMain.handle('pi:stop', (_event, key: unknown) => {
  stopSession(typeof key === 'string' ? key : undefined);
  return { ok: true };
});

ipcMain.handle('pi:live', () => ({
  ok: true,
  sessions: [...liveSessions.entries()].map(([key, live]) => ({
    key,
    cwd: live.cwd,
    startedAt: live.startedAt,
  })),
}));

ipcMain.on('pi:write', (_event, payload: unknown) => {
  const source = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const data = typeof payload === 'string' ? payload : source.data;
  if (typeof data !== 'string' || data.length > 65536) return;
  const live = findLiveSession(source.key);
  if (!live) return;
  activeKey = sessionKey(live.cwd);
  try {
    live.session.write(data);
  } catch {
    // the renderer will show the exit state
  }
});

ipcMain.on('pi:resize', (_event, payload: { key?: unknown; cols?: unknown; rows?: unknown }) => {
  const live = findLiveSession(payload?.key);
  if (!live) return;
  const cols = Number(payload?.cols);
  const rows = Number(payload?.rows);
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) return;
  if (cols < 20 || rows < 5 || cols > 1000 || rows > 500) return;
  try {
    live.session.resize(cols, rows);
  } catch {
    // ignore resize errors on an exiting child
  }
});

ipcMain.on('pty:ack', (_event, payload: unknown) => {
  const source = payload !== null && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const amount = Number(typeof payload === 'number' ? payload : source.bytes);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const live = findLiveSession(source.key);
  if (!live) return;
  live.unackedBytes = Math.max(0, live.unackedBytes - amount);
  if (live.unackedBytes < LOW_WATER) {
    try {
      live.session.resume();
    } catch {
      // ignore
    }
  }
});

ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.handle('clipboard:write', (_event, text: unknown) => {
  if (typeof text === 'string') clipboard.writeText(text);
});

ipcMain.handle('shell:open-external', (_event, url: unknown) => {
  if (typeof url !== 'string') return { ok: false };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.protocol !== 'mailto:') return { ok: false };
  void shell.openExternal(parsed.toString());
  return { ok: true };
});

ipcMain.handle('app:set-locale', (_event, locale: unknown) => {
  const applied = setBackendLocale(locale);
  if (win && !win.isDestroyed()) win.setTitle(t('Pi 工作台'));
  return { ok: true, locale: applied };
});

const singleInstance = app.requestSingleInstanceLock();

if (!singleInstance) {
  app.quit();
} else {
  pendingProject = projectFromArgv(process.argv);

  app.on('second-instance', (_event, argv) => {
    focusWindow();
    const target = projectFromArgv(argv);
    if (target) {
      pendingProject = target;
      send('app:open-project', target);
    }
  });

  app.whenReady().then(() => {
    bootLog('whenReady');
    setBackendLocale(app.getLocale());
    configureCustomAgents(path.join(app.getPath('userData'), 'custom-agents.json'));
    configureCustomApps(path.join(app.getPath('userData'), 'custom-apps.json'));
    configureCustomLinks(path.join(app.getPath('userData'), 'custom-links.json'));
    configureAppDefaults(app.getPath('userData'));
    configureProjectConfig(app.getPath('userData'));
    configureConfigShare(app.getPath('userData'));
    bootLog('configured');
    if (loadAppDefaults().memorySkill) {
      try {
        ensureMemorySkill();
      } catch {
        // 记忆 Skill 装配失败不阻塞启动
      }
    }
    bootLog('memory-skill');
    try {
      ensureBundledSkills();
    } catch {
      // 预置 Skill 装配失败不阻塞启动，用户仍可在能力页手动安装
    }
    bootLog('bundled-skills');
    ensureDesktopShortcut();
    bootLog('shortcut');
    installMediaProtocol();
    automationStore().start();
    bootLog('automation');
    createWindow();
    bootLog('createWindow');
    setTimeout(() => bootLog('timer-300ms'), 300);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => {
    automation?.stop();
    stopSession();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
