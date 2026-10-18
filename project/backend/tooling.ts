import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { t } from './i18n.js';

function which(command: string): string[] {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    const output = execFileSync(finder, [command], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

let nodePathCache: string | null = null;

function resolveNode(): string {
  const override = process.env.PI_DESKTOP_NODE?.trim();
  if (override && existsSync(override)) return override;

  const found = which('node').find((candidate) => existsSync(candidate));
  if (found) return found;

  if (process.platform !== 'win32') {
    const shell = process.env.SHELL || '/bin/zsh';
    for (const args of [['-ilc', 'command -v node'], ['-lc', 'command -v node']]) {
      try {
        const output = execFileSync(shell, args, { encoding: 'utf8', timeout: 15000 });
        const candidate = output.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
        if (candidate && existsSync(candidate)) return candidate;
      } catch {
        // try the next shell invocation
      }
    }
  }

  const home = os.homedir();
  const known = process.platform === 'win32'
    ? [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
    ]
    : [
      '/usr/local/bin/node',
      '/opt/homebrew/bin/node',
      path.join(home, '.volta', 'bin', 'node'),
      path.join(home, '.local', 'bin', 'node'),
    ];
  const candidate = known.find((item) => existsSync(item));
  if (candidate) return candidate;

  throw new Error(t('未找到 Node.js 可执行文件；请设置 PI_DESKTOP_NODE 指向 node.exe'));
}

export function findNode(): string {
  if (nodePathCache && existsSync(nodePathCache)) return nodePathCache;
  nodePathCache = resolveNode();
  return nodePathCache;
}

export function findNpm(): string | undefined {
  const override = process.env.PI_DESKTOP_NPM?.trim();
  if (override && existsSync(override)) return override;

  const candidates = which('npm').filter((candidate) => existsSync(candidate));
  const preferred = process.platform === 'win32'
    ? candidates.find((item) => /\.cmd$/i.test(item)) ?? candidates[0]
    : candidates[0];
  if (preferred) return preferred;

  const home = os.homedir();
  const known = process.platform === 'win32'
    ? [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'npm.cmd'),
      path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm', 'npm.cmd'),
    ]
    : [
      '/usr/local/bin/npm',
      '/opt/homebrew/bin/npm',
      path.join(home, '.npm-global', 'bin', 'npm'),
      path.join(home, '.local', 'bin', 'npm'),
    ];
  return known.find((candidate) => existsSync(candidate));
}

export function resolveNpmCli(npmPath?: string): string | undefined {
  const npm = npmPath ?? findNpm();
  if (!npm) return undefined;
  const dir = path.dirname(npm);
  const candidates = process.platform === 'win32'
    ? [path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')]
    : [
      path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
  return candidates.find((candidate) => existsSync(candidate));
}

export function npmGlobalRoots(): string[] {
  const roots = new Set<string>();
  const home = os.homedir();
  const npm = findNpm();

  if (npm) {
    const cli = resolveNpmCli(npm);
    if (cli) roots.add(path.resolve(path.dirname(cli), '..', '..'));
    const dir = path.dirname(npm);
    if (process.platform === 'win32') {
      roots.add(path.join(dir, 'node_modules'));
      roots.add(path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm', 'node_modules'));
    } else {
      roots.add(path.join(dir, '..', 'lib', 'node_modules'));
    }
  }

  if (process.platform === 'win32') {
    roots.add(path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm', 'node_modules'));
  } else {
    roots.add('/usr/local/lib/node_modules');
    roots.add('/opt/homebrew/lib/node_modules');
    roots.add(path.join(home, '.npm-global', 'lib', 'node_modules'));
    roots.add(path.join(home, '.local', 'lib', 'node_modules'));
  }

  return [...roots].filter((root) => root && existsSync(root));
}

export function npmGlobalPackageDir(packageName: string): string[] {
  return npmGlobalRoots().map((root) => path.join(root, ...packageName.split('/')));
}
