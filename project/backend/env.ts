import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolvePi } from './pi.js';
import { findNode, findNpm, resolveNpmCli } from './tooling.js';
import { t } from './i18n.js';

export interface ToolInfo {
  ok: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface PiEnvironmentInfo {
  ok: boolean;
  version?: string;
  cliPath?: string;
  source?: string;
  error?: string;
}

export interface EnvironmentReport {
  platform: string;
  node: ToolInfo;
  npm: ToolInfo;
  pi: PiEnvironmentInfo;
}

export interface SetupResult {
  ok: boolean;
  installed?: boolean;
  version?: string;
  output?: string;
  steps?: string[];
  needsRestart?: boolean;
  error?: string;
}

const PI_PACKAGE = '@earendil-works/pi-coding-agent';
const TAIL_LIMIT = 4000;

function tail(value: string): string {
  const text = value.trim();
  return text.length > TAIL_LIMIT ? `…${text.slice(-TAIL_LIMIT)}` : text;
}

function npmVersion(npmCli?: string): string | undefined {
  if (!npmCli) return undefined;
  try {
    const packageJson = path.join(path.dirname(npmCli), '..', 'package.json');
    const data = JSON.parse(readFileSync(packageJson, 'utf8')) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : undefined;
  } catch {
    return undefined;
  }
}

export function probeEnvironment(): EnvironmentReport {
  const report: EnvironmentReport = {
    platform: process.platform,
    node: { ok: false },
    npm: { ok: false },
    pi: { ok: false },
  };

  let nodePath: string | undefined;
  try {
    nodePath = findNode();
    report.node = { ok: true, path: nodePath, version: process.version.replace(/^v/, '') };
  } catch (error) {
    report.node = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const npmPath = findNpm();
  const npmCli = resolveNpmCli(npmPath);
  if (npmPath) {
    const version = npmVersion(npmCli);
    report.npm = { ok: true, path: npmPath, version };
  } else {
    report.npm = { ok: false, error: t('未找到 npm；请先安装 Node.js') };
  }

  try {
    const install = resolvePi();
    report.pi = {
      ok: true,
      version: install.version,
      cliPath: install.cliPath,
      source: install.source,
    };
  } catch (error) {
    report.pi = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return report;
}

export function installPi(force = false): SetupResult {
  if (!force) {
    try {
      const existing = resolvePi();
      return { ok: true, installed: false, version: existing.version };
    } catch {
      // not installed yet; continue
    }
  }

  let nodePath: string;
  try {
    nodePath = findNode();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const npmCli = resolveNpmCli();
  if (!npmCli) {
    return { ok: false, error: t('未找到 npm；请先安装 Node.js（含 npm）') };
  }

  try {
    const output = execFileSync(nodePath, [npmCli, 'install', '-g', `${PI_PACKAGE}@latest`], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, npm_config_update_notifier: 'false' },
    });
    const install = resolvePi();
    return { ok: true, installed: true, version: install.version, output: tail(output) };
  } catch (error) {
    const detail = error as { stdout?: string; stderr?: string; message?: string };
    const output = tail([detail.stdout ?? '', detail.stderr ?? ''].filter(Boolean).join('\n'));
    return {
      ok: false,
      output,
      error: output || detail.message || String(error),
    };
  }
}

export function updatePi(): SetupResult {
  return installPi(true);
}

// 一键配置：Windows 用 winget 补 Node LTS，再安装/更新 Pi；其他系统给出明确手动步骤
export function setupEnvironment(): SetupResult {
  const steps: string[] = [];
  const initial = probeEnvironment();
  if (initial.node.ok && initial.npm.ok) {
    steps.push(t('Node.js 与 npm 已就绪'));
  } else {
    if (process.platform !== 'win32') {
      return {
        ok: false,
        steps,
        error: t('未检测到 Node.js/npm。请先安装 Node.js LTS，再回到工作台点「一键配置环境」。'),
      };
    }
    steps.push(t('正在通过 winget 安装 Node.js LTS…'));
    try {
      execFileSync(
        'winget',
        [
          'install', '--id', 'OpenJS.NodeJS.LTS', '-e',
          '--accept-package-agreements', '--accept-source-agreements',
          '--disable-interactivity',
        ],
        {
          encoding: 'utf8',
          windowsHide: true,
          timeout: 20 * 60 * 1000,
          maxBuffer: 16 * 1024 * 1024,
        },
      );
      steps.push(t('Node.js LTS 安装完成'));
    } catch (error) {
      const detail = error as { stdout?: string; stderr?: string; message?: string };
      const output = tail([detail.stdout ?? '', detail.stderr ?? ''].filter(Boolean).join('\n'));
      return {
        ok: false,
        steps,
        output,
        error: output || t('winget 安装 Node.js 失败，请手动安装 Node.js LTS'),
      };
    }
  }

  const afterNode = probeEnvironment();
  if (!afterNode.node.ok || !afterNode.npm.ok) {
    return {
      ok: false,
      steps,
      error: t('Node.js 已安装但当前进程尚未刷新 PATH，请重启工作台后再点一次。'),
      needsRestart: true,
    };
  }

  const pi = installPi(true);
  steps.push(pi.ok
    ? t('Pi 已安装/更新到 {version}', { version: pi.version ?? '' })
    : t('Pi 安装失败：{error}', { error: pi.error ?? '' }));
  return {
    ok: pi.ok,
    installed: pi.installed,
    version: pi.version,
    output: pi.output,
    steps,
    error: pi.ok ? undefined : pi.error,
  };
}
