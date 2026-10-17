// 校验习惯画像与记忆 Skill 自动装配：全部写入临时目录，不触碰真实 ~/.pi。
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { habitSummary, recordHabit } from '../backend/habits.js';
import { ensureMemorySkill, memorySkillPath } from '../backend/memory.js';

const root = mkdtempSync(path.join(os.tmpdir(), 'pi-habits-check-'));
process.env.PI_DESKTOP_PI_AGENT_DIR = path.join(root, 'agent');

const failures: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
};

recordHabit({ type: 'model', value: 'openai/gpt-5', task: 'coding' });
recordHabit({ type: 'model', value: 'openai/gpt-5', task: 'coding' });
recordHabit({ type: 'permission', value: '完全自动' });
recordHabit({ type: 'bogus', value: 'x' });
recordHabit({ type: 'model', value: 'line\nbreak\ttab' });

const summary = habitSummary();
check(summary.ok, 'summary ok');
const model = summary.top?.find((item) => item.type === 'model' && item.value === 'openai/gpt-5');
check(model?.count === 2, `model counted twice (${model?.count})`);
check(Boolean(summary.top?.some((item) => item.type === 'permission' && item.value === '完全自动')), 'permission habit recorded');
check(!summary.top?.some((item) => item.type === 'bogus'), 'invalid type ignored');

const profilePath = summary.profilePath ?? '';
check(existsSync(profilePath), 'profile written');
const profile = existsSync(profilePath) ? readFileSync(profilePath, 'utf8') : '';
check(profile.includes('openai/gpt-5') && profile.includes('完全自动'), 'profile lists habits');
check(!profile.includes('\nline'), 'habit values are single-line');

const installed = ensureMemorySkill();
check(installed.ok, `skill auto-install (${installed.error ?? ''})`);
const skill = readFileSync(memorySkillPath(), 'utf8');
check(skill.includes('workbench-managed'), 'skill carries managed marker');
check(skill.includes('profile.md'), 'skill references the habit profile');

writeFileSync(memorySkillPath(), '---\nname: workbench-memory\ndescription: custom\n---\n');
ensureMemorySkill();
const custom = readFileSync(memorySkillPath(), 'utf8');
check(!custom.includes('workbench-managed'), 'custom skill is not overwritten');

rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exitCode = 1;
