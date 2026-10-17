// 项目存档：保存未提交改动（patch）与未跟踪文件的副本，恢复前自动备份当前状态。
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { realAgentDir } from './config.js';
import { t } from './i18n.js';

export interface ArchiveMeta {
  id: string;
  label: string;
  project: string;
  createdAt: string;
  branch: string;
  head: string;
  changedFiles: number;
  untrackedFiles: number;
  patchBytes: number;
  untrackedBytes: number;
}

export interface ArchiveResult {
  ok: boolean;
  archive?: ArchiveMeta;
  archives?: ArchiveMeta[];
  path?: string;
  touched?: string[];
  error?: string;
  warnings?: string[];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const META_FILE = 'meta.json';
const PATCH_FILE = 'changes.patch';
const UNTRACKED_DIR = 'untracked';

function archiveRoot(): string {
  return path.join(realAgentDir(), 'workbench-archives');
}

function projectKey(cwd: string): string {
  return createHash('sha1').update(path.resolve(cwd).toLowerCase()).digest('hex').slice(0, 16);
}

function projectDir(cwd: string): string {
  return path.join(archiveRoot(), projectKey(cwd));
}

function safeId(id: unknown): string | null {
  return typeof id === 'string' && /^[A-Za-z0-9._-]{4,80}$/.test(id) ? id : null;
}

function runGit(cwd: string, args: string[], input?: Buffer): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      'git',
      ['-c', 'core.quotepath=false', ...args],
      {
        cwd,
        timeout: 60_000,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: stdout ?? '',
          stderr: stderr ?? (error ? error.message : ''),
        });
      },
    );
    if (input && child.stdin) {
      child.stdin.end(input);
    }
  });
}

function runGitBuffer(cwd: string, args: string[]): Promise<{ ok: boolean; stdout: Buffer; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=false', ...args],
      {
        cwd,
        timeout: 60_000,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
        encoding: 'buffer',
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: Buffer.isBuffer(stdout) ? stdout : Buffer.alloc(0),
          stderr: Buffer.isBuffer(stderr) ? stderr.toString('utf8') : (error ? error.message : ''),
        });
      },
    );
  });
}

interface PatchEntry {
  from: string;
  to: string;
  before: string;
}

function patchEntries(patch: string): PatchEntry[] {
  const entries: PatchEntry[] = [];
  let current: PatchEntry | null = null;
  for (const line of patch.split('\n')) {
    const head = /^diff --git a\/(.+?) b\/(.+?)$/.exec(line);
    if (head) {
      current = { from: head[1], to: head[2], before: '' };
      entries.push(current);
      continue;
    }
    if (!current || current.before) continue;
    const index = /^index ([0-9a-f]+)\.\.([0-9a-f]+)/.exec(line);
    if (index) current.before = index[1];
  }
  return entries;
}

// 用户可能已在存档之后继续改过同一文件，直接用补丁会因上下文不匹配失败。
// 先把补丁触及的文件还原到存档基线，再应用补丁，得到与存档一致的状态。
async function restorePatchBase(cwd: string, patch: string, warnings: string[]): Promise<void> {
  const root = path.resolve(cwd) + path.sep;
  for (const entry of patchEntries(patch)) {
    const createdByPatch = !entry.before || /^0+$/.test(entry.before);
    const target = path.resolve(cwd, createdByPatch ? entry.to : entry.from);
    if (!target.startsWith(root)) continue;
    if (createdByPatch) {
      rmSync(target, { force: true });
      continue;
    }
    const blob = await runGitBuffer(cwd, ['cat-file', 'blob', entry.before]);
    if (!blob.ok) {
      warnings.push(t('无法读取补丁基线：{path}', { path: entry.from }));
      continue;
    }
    try {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, blob.stdout);
    } catch {
      warnings.push(t('写入失败已跳过：{path}', { path: entry.from }));
    }
  }
}

function readMeta(dir: string): ArchiveMeta | null {
  try {
    const data = JSON.parse(readFileSync(path.join(dir, META_FILE), 'utf8')) as ArchiveMeta;
    if (!data || typeof data.id !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function createArchive(cwd: string, label?: string): Promise<ArchiveResult> {
  if (!cwd || !existsSync(cwd)) return { ok: false, error: t('项目目录不存在') };
  const inside = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok || inside.stdout.trim() !== 'true') {
    return { ok: false, error: t('该项目不是 Git 仓库，无法创建存档') };
  }
  const branchResult = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const headResult = await runGit(cwd, ['rev-parse', 'HEAD']);
  const branch = branchResult.ok ? branchResult.stdout.trim() : '';
  const head = headResult.ok ? headResult.stdout.trim() : '';

  const diff = await runGit(cwd, ['diff', '--binary', '--no-color', 'HEAD']);
  let patch = diff.ok ? diff.stdout : '';
  if (!diff.ok) {
    // 仓库尚无首次提交时，分别收集暂存区与工作区改动
    const staged = await runGit(cwd, ['diff', '--binary', '--no-color', '--cached']);
    const working = await runGit(cwd, ['diff', '--binary', '--no-color']);
    patch = [staged.stdout, working.stdout].filter(Boolean).join('\n');
  }

  const untrackedResult = await runGit(cwd, ['ls-files', '--others', '--exclude-standard', '-z']);
  const untracked = untrackedResult.ok
    ? untrackedResult.stdout.split('\0').map((item) => item.trim()).filter(Boolean)
    : [];

  const id = `${stamp()}-${createHash('sha1').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 6)}`;
  const dir = path.join(projectDir(cwd), id);
  mkdirSync(path.join(dir, UNTRACKED_DIR), { recursive: true });

  const patchPath = path.join(dir, PATCH_FILE);
  writeFileSync(patchPath, patch, 'utf8');

  let untrackedBytes = 0;
  let copied = 0;
  const warnings: string[] = [];
  const projectRoot = path.resolve(cwd);
  for (const relative of untracked) {
    if (untrackedBytes >= MAX_TOTAL_BYTES) {
      warnings.push(t('未跟踪文件超过体积上限，后续文件未存档'));
      break;
    }
    const source = path.resolve(projectRoot, relative);
    if (source !== projectRoot && !source.startsWith(projectRoot + path.sep)) continue;
    try {
      const info = statSync(source);
      if (!info.isFile()) continue;
      if (info.size > MAX_FILE_BYTES) {
        warnings.push(t('文件过大已跳过：{path}', { path: relative }));
        continue;
      }
      if (untrackedBytes + info.size > MAX_TOTAL_BYTES) {
        warnings.push(t('未跟踪文件超过体积上限，后续文件未存档'));
        break;
      }
      const target = path.join(dir, UNTRACKED_DIR, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(source, target);
      untrackedBytes += info.size;
      copied += 1;
    } catch {
      warnings.push(t('读取失败已跳过：{path}', { path: relative }));
    }
  }

  const changedFiles = (patch.match(/^diff --git /gm) ?? []).length;
  const meta: ArchiveMeta = {
    id,
    label: (label ?? '').trim().slice(0, 80) || t('手动存档'),
    project: projectRoot,
    createdAt: new Date().toISOString(),
    branch,
    head,
    changedFiles,
    untrackedFiles: copied,
    patchBytes: Buffer.byteLength(patch),
    untrackedBytes,
  };
  writeFileSync(path.join(dir, META_FILE), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  return { ok: true, archive: meta, path: dir, warnings };
}

export function listArchives(cwd: string): ArchiveResult {
  if (!cwd || !existsSync(cwd)) return { ok: false, error: t('项目目录不存在') };
  const root = projectDir(cwd);
  if (!existsSync(root)) return { ok: true, archives: [] };
  const archives: ArchiveMeta[] = [];
  for (const name of readdirSync(root)) {
    const meta = readMeta(path.join(root, name));
    if (meta) archives.push(meta);
  }
  archives.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return { ok: true, archives };
}

export async function restoreArchive(cwd: string, id: string): Promise<ArchiveResult> {
  const safe = safeId(id);
  if (!cwd || !existsSync(cwd)) return { ok: false, error: t('项目目录不存在') };
  if (!safe) return { ok: false, error: t('存档标识无效') };
  const dir = path.join(projectDir(cwd), safe);
  const meta = readMeta(dir);
  if (!meta) return { ok: false, error: t('存档不存在或已损坏') };

  // 恢复是破坏性操作：先把当前未提交改动完整存档一份
  const safety = await createArchive(cwd, t('恢复前自动备份 {time}', { time: new Date().toLocaleString() }));
  if (!safety.ok) {
    return { ok: false, error: t('自动备份当前改动失败，已取消恢复：{error}', { error: safety.error ?? '' }) };
  }

  const warnings: string[] = [];
  const touched: string[] = [];
  const patchPath = path.join(dir, PATCH_FILE);
  const patch = existsSync(patchPath) ? readFileSync(patchPath) : Buffer.alloc(0);
  if (patch.length) {
    const patchText = patch.toString('utf8');
    await restorePatchBase(cwd, patchText, warnings);
    const applied = await runGit(cwd, ['apply', '--binary', '--whitespace=nowarn', '--recount', patchPath]);
    if (!applied.ok) {
      warnings.push(t('补丁未能完全应用：{error}', { error: applied.stderr.trim() || applied.stdout.trim() }));
    } else {
      touched.push(...(patchText.match(/^\+{3} b\/(.+)$/gm) ?? [])
        .map((line) => line.slice(6).trim())
        .filter(Boolean));
    }
  }

  const untrackedRoot = path.join(dir, UNTRACKED_DIR);
  const projectRoot = path.resolve(cwd);
  if (existsSync(untrackedRoot)) {
    const walk = (relative: string): void => {
      const current = path.join(untrackedRoot, relative);
      for (const name of readdirSync(current)) {
        const next = path.join(relative, name);
        const source = path.join(untrackedRoot, next);
        const info = statSync(source);
        if (info.isDirectory()) {
          walk(next);
          continue;
        }
        const target = path.join(projectRoot, next);
        if (target !== projectRoot && !target.startsWith(projectRoot + path.sep)) continue;
        try {
          mkdirSync(path.dirname(target), { recursive: true });
          copyFileSync(source, target);
          touched.push(next.replace(/\\/g, '/'));
        } catch {
          warnings.push(t('写入失败已跳过：{path}', { path: next }));
        }
      }
    };
    walk('');
  }

  return {
    ok: true,
    archive: meta,
    path: dir,
    touched: [...new Set(touched)].slice(0, 200),
    warnings: [
      ...warnings,
      t('恢复前已自动备份当前改动：{label}', { label: safety.archive?.label ?? '' }),
    ],
  };
}

export function deleteArchive(cwd: string, id: string): ArchiveResult {
  const safe = safeId(id);
  if (!cwd) return { ok: false, error: t('缺少项目目录') };
  if (!safe) return { ok: false, error: t('存档标识无效') };
  const dir = path.join(projectDir(cwd), safe);
  if (!existsSync(dir)) return { ok: false, error: t('存档不存在') };
  const meta = readMeta(dir);
  // 仅删除存档目录本身，避免路径穿越
  const root = path.resolve(projectDir(cwd)) + path.sep;
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(root)) return { ok: false, error: t('存档路径无效') };
  rmSync(resolved, { recursive: true, force: true });
  return { ok: true, archive: meta ?? undefined };
}
