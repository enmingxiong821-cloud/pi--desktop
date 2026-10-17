import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { CapabilityResult } from './capabilities.js';
import type { EnvironmentReport, SetupResult } from './env.js';
import type { GitStatusResult } from './git.js';
import type { CapabilityEntry, ModelReport, SessionEntry } from './inspect.js';
import type { MediaResult } from './media.js';
import type { FetchModelsResult, ProviderReport, SaveProviderResult } from './providers.js';

export interface LocateResult {
  ok: boolean;
  install?: { version: string; cliPath: string; nodePath: string; agentDir: string };
  error?: string;
}

export interface StartResult {
  ok: boolean;
  isolatedDir?: string;
  isolated?: boolean;
  install?: { version: string; cliPath: string; nodePath: string };
  error?: string;
}

export interface ProjectRecord {
  path: string;
  name: string;
  lastUsed: number;
}

const api = {
  locate: (): Promise<LocateResult> => ipcRenderer.invoke('app:locate'),
  setLocale: (locale: string): Promise<{ ok: boolean; locale: string }> =>
    ipcRenderer.invoke('app:set-locale', locale),
  pickProject: (): Promise<{ ok: boolean; path?: string }> => ipcRenderer.invoke('project:pick'),
  projects: (): Promise<{ ok: boolean; projects: ProjectRecord[] }> => ipcRenderer.invoke('app:projects'),
  inspectModels: (): Promise<{ ok: boolean; report?: ModelReport; error?: string }> =>
    ipcRenderer.invoke('pi:inspect-models'),
  providers: (): Promise<{ ok: boolean; report?: ProviderReport; error?: string }> =>
    ipcRenderer.invoke('pi:providers'),
  saveProvider: (input: {
    id: string;
    name?: string;
    baseUrl: string;
    api: string;
    apiKey?: string;
    headersText?: string;
    keepHeaders?: boolean;
    modelsText: string;
  }): Promise<SaveProviderResult> => ipcRenderer.invoke('pi:save-provider', input),
  deleteProvider: (id: string): Promise<SaveProviderResult> => ipcRenderer.invoke('pi:delete-provider', id),
  saveProviderKey: (id: string, key: string): Promise<SaveProviderResult> =>
    ipcRenderer.invoke('pi:save-provider-key', id, key),
  fetchProviderModels: (input: {
    providerId?: string;
    baseUrl?: string;
    api?: string;
    apiKey?: string;
    headersText?: string;
  }): Promise<FetchModelsResult> => ipcRenderer.invoke('pi:fetch-provider-models', input),
  setDefaultModel: (provider: string, model: string): Promise<SaveProviderResult> =>
    ipcRenderer.invoke('pi:set-default-model', provider, model),
  pickMedia: (): Promise<MediaResult> => ipcRenderer.invoke('media:pick'),
  clipboardImage: (): Promise<MediaResult> => ipcRenderer.invoke('media:clipboard-image'),
  allowMediaPath: (filePath: string): Promise<MediaResult> => ipcRenderer.invoke('media:allow', filePath),
  openMediaExternally: (filePath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('media:open-external', filePath),
  filePath: (file: File): string => webUtils.getPathForFile(file),
  inspectCapabilities: (cwd: string): Promise<{ ok: boolean; report?: { capabilities: CapabilityEntry[]; warnings: string[] }; error?: string }> =>
    ipcRenderer.invoke('pi:inspect-capabilities', cwd),
  addSkill: (input: {
    scope: 'user' | 'project';
    cwd?: string;
    name: string;
    description?: string;
    body?: string;
  }): Promise<CapabilityResult> => ipcRenderer.invoke('pi:add-skill', input),
  addMcp: (input: {
    scope: 'user' | 'project';
    cwd?: string;
    name: string;
    command: string;
    argsText?: string;
    envText?: string;
  }): Promise<CapabilityResult> => ipcRenderer.invoke('pi:add-mcp', input),
  gitStatus: (cwd: string): Promise<GitStatusResult> => ipcRenderer.invoke('project:git-status', cwd),
  openPath: (target: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:open-path', target),
  openVSCode: (target: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:open-vscode', target),
  probeEnvironment: (): Promise<EnvironmentReport> => ipcRenderer.invoke('env:probe'),
  installPi: (): Promise<SetupResult> => ipcRenderer.invoke('env:install-pi'),
  createShortcut: (target?: string): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('app:create-shortcut', target),
  sessions: (cwd: string): Promise<{ ok: boolean; sessions?: SessionEntry[]; error?: string }> =>
    ipcRenderer.invoke('pi:sessions', cwd),
  startPi: (options: { cwd: string; cols: number; rows: number; sessionPath?: string; isolated?: boolean; model?: string }): Promise<StartResult> =>
    ipcRenderer.invoke('pi:start', options),
  stopPi: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('pi:stop'),
  write: (data: string): void => ipcRenderer.send('pi:write', data),
  resize: (cols: number, rows: number): void => ipcRenderer.send('pi:resize', { cols, rows }),
  ack: (bytes: number): void => ipcRenderer.send('pty:ack', bytes),
  readClipboard: (): Promise<string> => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text),
  openExternal: (url: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('shell:open-external', url),
  onData: (callback: (data: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('pty:data', listener);
    return () => ipcRenderer.removeListener('pty:data', listener);
  },
  onState: (callback: (state: { status: string; exitCode?: number; cwd?: string }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { status: string; exitCode?: number; cwd?: string }) =>
      callback(state);
    ipcRenderer.on('pi:state', listener);
    return () => ipcRenderer.removeListener('pi:state', listener);
  },
  onOpenProject: (callback: (projectPath: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, projectPath: string) => callback(projectPath);
    ipcRenderer.on('app:open-project', listener);
    return () => ipcRenderer.removeListener('app:open-project', listener);
  },
};

contextBridge.exposeInMainWorld('piDesktop', api);
