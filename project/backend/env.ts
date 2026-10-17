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

export function installPi(): SetupResult {
  try {
    const existing = resolvePi();
    return { ok: true, installed: false, version: existing.version };
  } catch {
    // not installed yet; continue
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
