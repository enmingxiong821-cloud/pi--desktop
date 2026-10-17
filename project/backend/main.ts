import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { addMcpServer, addSkill } from './capabilities.js';
import { installPi, probeEnvironment } from './env.js';
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

interface ProjectRecord {
  path: string;
  name: string;
  lastUsed: number;
}

let win: BrowserWindow | null = null;
let session: PiSession | null = null;
let unackedBytes = 0;

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

function stopSession(): void {
  if (!session) return;
  const current = session;
  session = null;
  current.stop();
  send('pi:state', { status: 'stopped' });
}

interface StartOptions {
  cwd: string;
  cols: number;
  rows: number;
  sessionPath?: string;
  isolated?: boolean;
  model?: string;
}

function startSession(options: StartOptions): { ok: boolean; isolatedDir?: string; isolated?: boolean; install?: unknown; error?: string } {
  stopSession();
  try {
    if (!options || typeof options.cwd !== 'string' || !options.cwd) {
      throw new Error(t('缺少项目目录'));
    }
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

    const next = spawnPi({
      cwd: options.cwd,
      cols: Number(options.cols) || 120,
      rows: Number(options.rows) || 32,
      agentDir,
      isolated,
      sessionPath,
      model: model || undefined,
    });
    session = next;
    unackedBytes = 0;

    next.onData((data) => {
      unackedBytes += data.length;
      send('pty:data', data);
      if (unackedBytes > HIGH_WATER) {
        try {
          next.pause();
        } catch {
          // best effort; the renderer ack will retry resume
        }
      }
    });

    next.onExit(({ exitCode }) => {
      if (session === next) {
        session = null;
        send('pi:state', { status: 'exited', exitCode });
      }
    });

    send('pi:state', { status: 'running', cwd: options.cwd });
    return {
      ok: true,
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
    title: t('Pi 工作台 · PoC'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'), process.env.PI_DESKTOP_SMOKE === '1'
    ? {
      query: {
        smokeCwd: process.env.PI_DESKTOP_SMOKE_CWD || process.cwd(),
        smokeIsolated: process.env.PI_DESKTOP_SMOKE_REAL === '1' ? '0' : '1',
      },
    }
    : undefined);
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

ipcMain.handle('app:projects', () => ({ ok: true, projects: loadProjects() }));

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

ipcMain.handle('pi:add-skill', (_event, input: unknown) => addSkill(input as Parameters<typeof addSkill>[0]));
ipcMain.handle('pi:add-mcp', (_event, input: unknown) => addMcpServer(input as Parameters<typeof addMcpServer>[0]));

ipcMain.handle('project:git-status', (_event, cwd: unknown) => gitStatus(cwd));

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

function createDesktopShortcut(target: unknown): { ok: boolean; path?: string; error?: string } {
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

ipcMain.handle('env:probe', () => probeEnvironment());
ipcMain.handle('env:install-pi', () => installPi());
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

ipcMain.handle('pi:stop', () => {
  stopSession();
  return { ok: true };
});

ipcMain.on('pi:write', (_event, data: unknown) => {
  if (!session || typeof data !== 'string' || data.length > 65536) return;
  try {
    session.write(data);
  } catch {
    // the renderer will show the exit state
  }
});

ipcMain.on('pi:resize', (_event, size: { cols?: unknown; rows?: unknown }) => {
  if (!session) return;
  const cols = Number(size?.cols);
  const rows = Number(size?.rows);
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) return;
  if (cols < 20 || rows < 5 || cols > 1000 || rows > 500) return;
  try {
    session.resize(cols, rows);
  } catch {
    // ignore resize errors on an exiting child
  }
});

ipcMain.on('pty:ack', (_event, bytes: unknown) => {
  const amount = Number(bytes);
  if (!Number.isFinite(amount) || amount <= 0) return;
  unackedBytes = Math.max(0, unackedBytes - amount);
  if (session && unackedBytes < LOW_WATER) {
    try {
      session.resume();
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
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { ok: false };
  void shell.openExternal(parsed.toString());
  return { ok: true };
});

ipcMain.handle('app:set-locale', (_event, locale: unknown) => {
  const applied = setBackendLocale(locale);
  if (win && !win.isDestroyed()) win.setTitle(t('Pi 工作台 · PoC'));
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
    setBackendLocale(app.getLocale());
    installMediaProtocol();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', stopSession);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
