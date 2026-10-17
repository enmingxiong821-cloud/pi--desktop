import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as pty from 'node-pty';
import { t } from './i18n.js';
import { findNode, npmGlobalPackageDir } from './tooling.js';

export interface PiInstall {
  agentDir: string;
  installRoot?: string;
  source: 'managed' | 'global';
  version: string;
  cliPath: string;
  nodePath: string;
}

export interface PiLaunchOptions {
  cwd: string;
  cols: number;
  rows: number;
  agentDir: string;
  isolated: boolean;
  sessionPath?: string;
  model?: string;
  thinking?: string;
}

export interface PiSession {
  install: PiInstall;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  onData(cb: (data: string) => void): void;
  onExit(cb: (info: { exitCode: number; signal?: number }) => void): void;
}

const SECRET_ENV = new Set([
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_OAUTH_TOKEN',
  'ANT_LING_API_KEY',
  'OPENAI_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'NVIDIA_API_KEY',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
  'XAI_API_KEY',
  'FIREWORKS_API_KEY',
  'TOGETHER_API_KEY',
  'BASETEN_API_KEY',
  'OPENROUTER_API_KEY',
  'AI_GATEWAY_API_KEY',
  'ZAI_API_KEY',
  'ZAI_CODING_CN_API_KEY',
  'MISTRAL_API_KEY',
]);

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function installFromPackageDir(
  packageDir: string,
  agentDir: string,
  source: PiInstall['source'],
  versionHint: string | undefined,
  installRoot?: string,
): PiInstall {
  const packageJson = readJson(path.join(packageDir, 'package.json'));
  const bin = packageJson.bin;
  const relativeBin = typeof bin === 'string'
    ? bin
    : (bin as Record<string, string> | undefined)?.pi;
  if (!relativeBin) throw new Error(t('Pi 包未声明 pi 可执行入口'));
  const cliPath = path.resolve(packageDir, relativeBin);
  const relative = path.relative(packageDir, cliPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(cliPath)) {
    throw new Error(t('Pi CLI 入口不存在：{path}', { path: cliPath }));
  }
  const packageVersion = typeof packageJson.version === 'string' ? packageJson.version : '';
  const version = versionHint || packageVersion;
  if (!/^[0-9A-Za-z._+-]+$/.test(version)) {
    throw new Error(t('Pi 版本文件内容无效：{value}', { value: version }));
  }
  return { agentDir, installRoot, source, version, cliPath, nodePath: findNode() };
}

function readManagedInstall(agentDir: string): PiInstall {
  const installRoot = path.join(agentDir, 'install');
  const currentFile = path.join(installRoot, 'current-version');
  if (!existsSync(currentFile)) {
    throw new Error(t('未找到 Pi 受管安装：{path}', { path: currentFile }));
  }
  const version = readFileSync(currentFile, 'utf8').trim();
  const packageDir = path.join(
    installRoot, 'releases', version, 'node_modules', '@earendil-works', 'pi-coding-agent',
  );
  return installFromPackageDir(packageDir, agentDir, 'managed', version, installRoot);
}

export function resolvePi(): PiInstall {
  const agentDir = process.env.PI_DESKTOP_PI_AGENT_DIR?.trim()
    || path.join(os.homedir(), '.pi', 'agent');
  const errors: string[] = [];

  try {
    return readManagedInstall(agentDir);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const customCli = process.env.PI_DESKTOP_PI_CLI?.trim();
  if (customCli) {
    const packageDir = path.dirname(path.dirname(customCli));
    try {
      return installFromPackageDir(packageDir, agentDir, 'global', undefined);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const packageDir of npmGlobalPackageDir('@earendil-works/pi-coding-agent')) {
    try {
      return installFromPackageDir(packageDir, agentDir, 'global', undefined);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(t('未找到 Pi 安装；请点击「一键配置环境」或运行 npm install -g @earendil-works/pi-coding-agent'));
}

function buildEnv(options: PiLaunchOptions, install: PiInstall): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (options.isolated) {
    for (const key of SECRET_ENV) delete env[key];
  }
  env.PI_CODING_AGENT_DIR = options.agentDir;
  if (install.installRoot) env.PI_MANAGED_INSTALL_ROOT = install.installRoot;
  env.PI_OFFLINE = '1';
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  return env;
}

export function spawnPi(options: PiLaunchOptions): PiSession {
  const install = resolvePi();
  const args = [install.cliPath, '--tui-mode', 'regular'];
  if (options.isolated) {
    args.push(
      '--offline',
      '--no-extensions',
      '--no-mcp',
      '--no-skills',
      '--no-prompt-templates',
      '--no-context-files',
    );
  }
  if (options.sessionPath) args.push('--session', options.sessionPath);
  if (options.model) args.push('--model', options.model);
  if (options.thinking) args.push('--thinking', options.thinking);

  const term = pty.spawn(install.nodePath, args, {
    name: 'xterm-256color',
    cols: Math.max(20, options.cols),
    rows: Math.max(5, options.rows),
    cwd: options.cwd,
    env: buildEnv(options, install),
    useConptyDll: process.platform === 'win32',
  });

  let stopped = false;

  return {
    install,
    write: (data) => {
      if (!stopped) term.write(data);
    },
    resize: (cols, rows) => {
      if (!stopped) term.resize(Math.max(20, cols), Math.max(5, rows));
    },
    pause: () => term.pause(),
    resume: () => term.resume(),
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        term.kill();
      } catch {
        // node-pty may throw when the child already exited
      }
    },
    onData: (cb) => term.onData(cb),
    onExit: (cb) => term.onExit(({ exitCode, signal }) => cb({ exitCode, signal })),
  };
}
