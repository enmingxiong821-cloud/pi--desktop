import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AgentEvent,
  AgentInfo,
  AgentInstallResult,
  CustomAgentInput,
  TeamRequest,
  TeamResult,
  TeamSuggestion,
} from './agents.js';
import type { LocalAppInfo } from './apps.js';
import type { CustomLink } from './links.js';
import type { ImportedProject } from './projects-import.js';
import type { AutomationJob, PublicChannel, RunResult } from './automation.js';
import type { CatalogExtension, CatalogReport, RegistryMcp } from './catalog.js';
import type { CapabilityResult } from './capabilities.js';
import type { EnvironmentReport, SetupResult } from './env.js';
import type { GitStatusResult } from './git.js';
import type { CapabilityEntry, ModelReport, SessionEntry } from './inspect.js';
import type { MediaResult } from './media.js';
import type { FetchModelsResult, ProviderReport, SaveProviderResult } from './providers.js';
import type { PageContent, SearchResult, ToolSettings } from './tools.js';

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
  exists?: boolean;
}

const api = {
  locate: (): Promise<LocateResult> => ipcRenderer.invoke('app:locate'),
  setLocale: (locale: string): Promise<{ ok: boolean; locale: string }> =>
    ipcRenderer.invoke('app:set-locale', locale),
  pickProject: (): Promise<{ ok: boolean; path?: string }> => ipcRenderer.invoke('project:pick'),
  projects: (): Promise<{ ok: boolean; projects: ProjectRecord[] }> => ipcRenderer.invoke('app:projects'),
  importProjects: (): Promise<{ ok: boolean; projects: ImportedProject[]; error?: string }> =>
    ipcRenderer.invoke('project:import-candidates'),
  rememberProjects: (paths: string[]): Promise<{ ok: boolean; added: number }> =>
    ipcRenderer.invoke('project:remember', paths),
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
  catalog: (): Promise<{ ok: boolean; catalog?: CatalogReport; agents?: AgentInfo[]; error?: string }> =>
    ipcRenderer.invoke('catalog:list'),
  searchMcpRegistry: (query: string): Promise<{ ok: boolean; results: RegistryMcp[]; error?: string }> =>
    ipcRenderer.invoke('catalog:search-mcp', query),
  searchExtensions: (query: string): Promise<{ ok: boolean; results: CatalogExtension[]; error?: string }> =>
    ipcRenderer.invoke('catalog:search-extensions', query),
  installExtension: (name: string): Promise<{ ok: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('catalog:install-extension', name),
  importSkillUrl: (input: { url: string; scope: 'user' | 'project'; cwd?: string }): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('catalog:import-skill-url', input),
  listAgents: (refresh = false): Promise<{ ok: boolean; agents?: AgentInfo[]; error?: string }> =>
    ipcRenderer.invoke('agents:list', refresh),
  runAgent: (input: { agentId: string; prompt: string; cwd?: string; timeoutMinutes?: number }): Promise<{
    ok: boolean; runId: string; summary: string; error?: string;
  }> => ipcRenderer.invoke('agents:run', input),
  stopAgent: (runId: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('agents:stop', runId),
  runTeam: (input: TeamRequest): Promise<TeamResult> => ipcRenderer.invoke('agents:team', input),
  suggestTeam: (task: string, cwd?: string): Promise<TeamSuggestion> => ipcRenderer.invoke('agents:suggest-team', task, cwd),
  installAgent: (agentId: string): Promise<AgentInstallResult> => ipcRenderer.invoke('agents:install', agentId),
  openAgentApp: (agentId: string, cwd?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('agents:open-app', agentId, cwd),
  pickAgentCommand: (): Promise<{ ok: boolean; path?: string }> => ipcRenderer.invoke('agents:pick-command'),
  saveCustomAgent: (input: CustomAgentInput): Promise<{ ok: boolean; agent?: AgentInfo; error?: string }> =>
    ipcRenderer.invoke('agents:save-custom', input),
  removeCustomAgent: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('agents:remove-custom', id),
  automationList: (): Promise<{ ok: boolean; jobs?: AutomationJob[]; channels?: PublicChannel[]; error?: string }> =>
    ipcRenderer.invoke('automation:list'),
  saveAutomationJob: (input: unknown, id?: string): Promise<{ ok: boolean; job?: AutomationJob; error?: string }> =>
    ipcRenderer.invoke('automation:save-job', input, id),
  deleteAutomationJob: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('automation:delete-job', id),
  toggleAutomationJob: (id: string, enabled: boolean): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('automation:toggle-job', id, enabled),
  runAutomationJob: (id: string): Promise<RunResult> => ipcRenderer.invoke('automation:run-job', id),
  saveAutomationChannel: (input: unknown, id?: string): Promise<{
    ok: boolean; channel?: PublicChannel; error?: string;
  }> => ipcRenderer.invoke('automation:save-channel', input, id),
  deleteAutomationChannel: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('automation:delete-channel', id),
  testAutomationChannel: (id: string): Promise<RunResult> => ipcRenderer.invoke('automation:test-channel', id),
  openApp: (id: string, target?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('tools:open-app', id, target),
  listApps: (refresh?: boolean): Promise<{ ok: boolean; apps: LocalAppInfo[]; error?: string }> =>
    ipcRenderer.invoke('tools:list-apps', refresh),
  scanApps: (refresh?: boolean): Promise<{ ok: boolean; apps: LocalAppInfo[]; error?: string }> =>
    ipcRenderer.invoke('tools:scan-apps', refresh),
  installApp: (id: string): Promise<{ ok: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('tools:install-app', id),
  listLinks: (): Promise<{ ok: boolean; links: CustomLink[] }> => ipcRenderer.invoke('tools:list-links'),
  saveLink: (input: { name: string; url: string }): Promise<{ ok: boolean; link?: CustomLink; error?: string }> =>
    ipcRenderer.invoke('tools:save-link', input),
  removeLink: (id: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('tools:remove-link', id),
  pickAppExe: (): Promise<{ ok: boolean; path?: string; error?: string }> => ipcRenderer.invoke('tools:pick-app-exe'),
  saveApp: (input: {
    id?: string;
    name: string;
    kind: string;
    path: string;
    hint?: string;
    projectArg?: string;
  }): Promise<{ ok: boolean; app?: LocalAppInfo; error?: string }> => ipcRenderer.invoke('tools:save-app', input),
  removeApp: (id: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('tools:remove-app', id),
  getToolSettings: (): Promise<{ ok: boolean; settings: ToolSettings }> => ipcRenderer.invoke('tools:get-settings'),
  saveToolSettings: (input: ToolSettings): Promise<{ ok: boolean; settings?: ToolSettings; error?: string }> =>
    ipcRenderer.invoke('tools:save-settings', input),
  searchWeb: (query: string): Promise<{ ok: boolean; results: SearchResult[]; error?: string }> =>
    ipcRenderer.invoke('tools:search', query),
  fetchWebPage: (url: string): Promise<{ ok: boolean; page?: PageContent; error?: string }> =>
    ipcRenderer.invoke('tools:fetch-page', url),
  crawlWeb: (url: string): Promise<{ ok: boolean; pages: PageContent[]; links: string[]; error?: string }> =>
    ipcRenderer.invoke('tools:crawl', url),
  analyzePath: (target: string): Promise<{ ok: boolean; lines?: string[]; error?: string }> =>
    ipcRenderer.invoke('tools:analyze', target),
  pickAnalyzePath: (): Promise<{ ok: boolean; path?: string }> => ipcRenderer.invoke('tools:pick-analyze-path'),
  onAgentEvent: (callback: (event: AgentEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AgentEvent) => callback(payload);
    ipcRenderer.on('agents:event', listener);
    return () => ipcRenderer.removeListener('agents:event', listener);
  },
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
  removeSkill: (input: { scope: 'user' | 'project'; cwd?: string; name: string }): Promise<CapabilityResult> =>
    ipcRenderer.invoke('pi:remove-skill', input),
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
  openUserData: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:open-user-data'),
  openVSCode: (target: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:open-vscode', target),
  probeEnvironment: (): Promise<EnvironmentReport> => ipcRenderer.invoke('env:probe'),
  installPi: (): Promise<SetupResult> => ipcRenderer.invoke('env:install-pi'),
  createShortcut: (target?: string): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('app:create-shortcut', target),
  sessions: (cwd: string): Promise<{ ok: boolean; sessions?: SessionEntry[]; error?: string }> =>
    ipcRenderer.invoke('pi:sessions', cwd),
  startPi: (options: { cwd: string; cols: number; rows: number; sessionPath?: string; isolated?: boolean; model?: string; thinking?: string }): Promise<StartResult> =>
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
