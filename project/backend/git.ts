import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { t } from './i18n.js';

export interface GitChange {
  code: string;
  path: string;
}

export interface GitStatusResult {
  ok: boolean;
  repo: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  changes?: GitChange[];
  error?: string;
}

export function gitStatus(target: unknown): Promise<GitStatusResult> {
  if (typeof target !== 'string' || !target.trim()) {
    return Promise.resolve({ ok: false, repo: false, error: t('缺少项目目录') });
  }
  const cwd = path.resolve(target);
  if (!existsSync(cwd)) {
    return Promise.resolve({ ok: false, repo: false, error: t('项目目录不存在') });
  }
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-b'],
      { cwd, timeout: 5000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const text = `${stderr || ''}${error.message || ''}`;
          if (/not a git repository/i.test(text) || (error as NodeJS.ErrnoException).code === 'ENOENT') {
            resolve({ ok: true, repo: false });
            return;
          }
          resolve({ ok: false, repo: true, error: text.trim().split(/\r?\n/)[0] || String(error) });
          return;
        }
        const lines = stdout.split(/\r?\n/);
        const header = lines[0]?.startsWith('## ') ? lines.shift() ?? '' : '';
        let branch = '';
        let ahead = 0;
        let behind = 0;
        if (header) {
          const body = header.slice(3).trim();
          const aheadMatch = /ahead (\d+)/.exec(body);
          const behindMatch = /behind (\d+)/.exec(body);
          ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
          behind = behindMatch ? Number(behindMatch[1]) : 0;
          branch = body
            .replace(/\.\.\..*$/, '')
            .replace(/\s*\[.*\]$/, '')
            .replace(/^No commits yet on /, '')
            .trim();
        }
        const changes: GitChange[] = [];
        for (const line of lines) {
          if (!line.trim() || line.length < 4) continue;
          const code = line.slice(0, 2).trim() || '?';
          const rest = line.slice(3);
          const arrow = rest.indexOf(' -> ');
          changes.push({ code, path: arrow >= 0 ? rest.slice(arrow + 4) : rest });
          if (changes.length >= 200) break;
        }
        resolve({ ok: true, repo: true, branch, ahead, behind, changes });
      },
    );
  });
}
