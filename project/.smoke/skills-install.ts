// 本机验证：预置 Skills 首次安装、幂等与用户同名 Skill 保护。
import { app } from 'electron';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureBundledSkills } from '../backend/design-skills.js';

const root = mkdtempSync(path.join(os.tmpdir(), 'pi-skills-live-'));
const agentDir = path.join(root, 'agent');
process.env.PI_DESKTOP_PI_AGENT_DIR = agentDir;
app.setPath('userData', path.join(root, 'user-data'));
app.setAppPath(process.cwd());

app.whenReady().then(() => {
  const first = ensureBundledSkills();
  const skillsDir = path.join(agentDir, 'skills');
  const names = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
  const expected = ['web-scraping', 'reverse-engineering', 'security-audit', 'authorized-pentest'];
  console.log('first', JSON.stringify(first));
  console.log('installed-skills', JSON.stringify(names));
  console.log('bundled-present', JSON.stringify(expected.map((name) => [
    name,
    existsSync(path.join(skillsDir, name, 'SKILL.md')),
    existsSync(path.join(skillsDir, name, '.workbench-managed')),
  ])));

  const second = ensureBundledSkills();
  console.log('second', JSON.stringify(second));

  // 用户自建同名 Skill 必须保留
  const userDir = path.join(skillsDir, 'web-scraping');
  const managed = path.join(userDir, '.workbench-managed');
  if (existsSync(managed)) {
    // 移除标记，模拟用户自建目录
    writeFileSync(path.join(userDir, 'USER.txt'), 'user-owned', 'utf8');
    rmSync(managed);
  }
  mkdirSync(path.join(skillsDir, 'user-skill'), { recursive: true });
  writeFileSync(path.join(skillsDir, 'user-skill', 'SKILL.md'), 'user skill', 'utf8');
  const third = ensureBundledSkills();
  console.log('third', JSON.stringify(third));
  console.log('user-skill-kept', JSON.stringify(third.skipped.includes('web-scraping') && existsSync(path.join(userDir, 'USER.txt'))));
  console.log('user-skill-untouched', JSON.stringify(!existsSync(path.join(skillsDir, 'user-skill', '.workbench-managed'))));

  app.exit(0);
});
