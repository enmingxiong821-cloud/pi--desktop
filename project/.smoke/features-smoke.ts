// 本地功能冒烟：权限 / 存档 / 记忆 / 版本比较。使用临时目录，不触碰真实用户数据。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createArchive, deleteArchive, listArchives, restoreArchive } from '../backend/archives.js';
import { ingestMemory, installMemorySkill, memoryStats, searchMemory } from '../backend/memory.js';
import { installPermissionGuard, readProjectPermissions, saveProjectPermissions } from '../backend/permissions.js';
import { compareVersions, getUpdateSettings, saveUpdateSettings } from '../backend/updater.js';

const root = mkdtempSync(path.join(os.tmpdir(), 'pi-workbench-smoke-'));
const project = path.join(root, 'project');
const agent = path.join(root, 'agent');
mkdirSync(project, { recursive: true });
mkdirSync(agent, { recursive: true });
process.env.PI_DESKTOP_PI_AGENT_DIR = agent;

const failures: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
};

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: project, encoding: 'utf8', windowsHide: true });
}

writeFileSync(path.join(project, 'app.txt'), 'version one\n', 'utf8');
git('init');
git('config', 'user.email', 'smoke@example.com');
git('config', 'user.name', 'Smoke');
git('add', '.');
git('commit', '-m', 'init');

// 存档：修改 + 未跟踪文件
writeFileSync(path.join(project, 'app.txt'), 'version two\n', 'utf8');
writeFileSync(path.join(project, 'notes.txt'), 'scratch notes\n', 'utf8');
const created = await createArchive(project, 'smoke snapshot');
check(created.ok, `createArchive ok (${created.error ?? ''})`);
check(created.archive?.changedFiles === 1, `archive changed files (${created.archive?.changedFiles})`);
check(created.archive?.untrackedFiles === 1, `archive untracked files (${created.archive?.untrackedFiles})`);
check(Boolean(created.archive?.patchBytes), 'archive patch has bytes');

const listed = listArchives(project);
check(listed.ok && (listed.archives?.length ?? 0) === 1, `listArchives count (${listed.archives?.length})`);

// 恢复：先改回内容，再还原
writeFileSync(path.join(project, 'app.txt'), 'version three\n', 'utf8');
const restored = await restoreArchive(project, created.archive?.id ?? '');
check(restored.ok, `restoreArchive ok (${restored.error ?? ''})`);
check(readFileSync(path.join(project, 'app.txt'), 'utf8').replace(/\r\n/g, '\n') === 'version two\n',
  `restore rewrites tracked file (${restored.warnings?.join('|') ?? ''})`);
check(existsSync(path.join(project, 'notes.txt')), 'restore copies untracked file');
const afterRestore = listArchives(project);
check((afterRestore.archives?.length ?? 0) === 2, `restore creates a backup archive (${afterRestore.archives?.length})`);

const deleted = deleteArchive(project, created.archive?.id ?? '');
check(deleted.ok, `deleteArchive ok (${deleted.error ?? ''})`);

// 权限
const saved = saveProjectPermissions({
  cwd: project,
  rules: {
    fileRead: 'allow', fileWrite: 'deny', shell: 'ask',
    network: 'ask', gitWrite: 'deny', packageInstall: 'deny',
  },
  allowPaths: ['src', 'docs'],
  denyPaths: ['.env', 'secrets'],
});
check(saved.ok, `saveProjectPermissions ok (${saved.error ?? ''})`);
check(saved.permissions?.rules.fileWrite === 'deny', 'permission rules persisted');
const loaded = readProjectPermissions(project);
check(loaded.ok && loaded.permissions?.denyPaths.includes('.env'), 'permission paths persisted');

const guard = installPermissionGuard();
check(guard.ok && existsSync(guard.path ?? ''), `permission guard written (${guard.error ?? ''})`);
const guardSource = guard.path ? readFileSync(guard.path, 'utf8') : '';
check(guardSource.includes('tool_call'), 'guard intercepts tool_call');
check(guardSource.includes('workbench-permissions.json'), 'guard reads project policy');
check(!guardSource.includes('\\\\b'), 'guard regex escapes are correct');
check(guardSource.includes('\\b(npm'), 'guard word boundaries preserved');
check(guardSource.includes('\\s+'), 'guard whitespace escapes preserved');
check(!guardSource.includes('\b'), 'guard has no backspace control chars');

// 记忆
const sessions = path.join(agent, 'sessions', 'smoke');
mkdirSync(sessions, { recursive: true });
const lines = [
  JSON.stringify({ type: 'session', version: 3, id: 'smoke-session', timestamp: '2026-01-01T00:00:00.000Z', cwd: project }),
  JSON.stringify({
    type: 'message', timestamp: '2026-01-01T00:00:01.000Z',
    message: { role: 'user', content: '我们决定把长期记忆保存在本地，使用离线索引。' },
  }),
  JSON.stringify({
    type: 'message', timestamp: '2026-01-01T00:00:02.000Z',
    message: { role: 'assistant', content: [{ type: 'text', text: '已记录：本地长期记忆方案，不调用模型。' }] },
  }),
];
writeFileSync(path.join(sessions, 'smoke.jsonl'), `${lines.join('\n')}\n`, 'utf8');

const ingested = ingestMemory(project);
check(ingested.ok && (ingested.added ?? 0) === 2, `ingestMemory added (${ingested.added})`);
const stats = memoryStats(project);
check(stats.entries === 2, `memory stats entries (${stats.entries})`);
check(stats.projectEntries === 2, `memory stats project entries (${stats.projectEntries})`);
const found = searchMemory({ query: '长期记忆', cwd: project, scope: 'project', limit: 5 });
check(found.ok && (found.hits?.length ?? 0) === 2, `searchMemory hits (${found.hits?.length})`);
check(found.hits?.[0]?.snippet.includes('长期记忆') ?? false, 'memory snippet includes query');
const again = ingestMemory(project);
check(again.ok && again.added === 0, 'memory ingest is incremental');
const skill = installMemorySkill();
check(skill.ok && existsSync(path.join(skill.path ?? '', 'SKILL.md')), 'memory skill written');

// 更新设置与版本比较
check(compareVersions('1.2.0', '1.1.9') === 1, 'compareVersions newer');
check(compareVersions('v1.0.0', '1.0.0') === 0, 'compareVersions equal with v prefix');
check(compareVersions('1.0.0', '1.0.1') === -1, 'compareVersions older');
const settings = saveUpdateSettings({ autoCheck: false, autoDownload: true });
check(settings.autoCheck === false && settings.autoDownload === true, 'update settings persisted');
check(getUpdateSettings().autoDownload === true, 'update settings reloaded');

rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
