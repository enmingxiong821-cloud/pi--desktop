// 预置 Skills：首次启动时把随包携带的设计与安全能力写入用户级 Pi 技能目录。
// 只安装带 workbench 标记的目录，不覆盖用户自建的同名 Skill。
import { app } from 'electron';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { realAgentDir } from './config.js';

export interface BundledSkillInstallResult {
  ok: boolean;
  installed: string[];
  updated: string[];
  skipped: string[];
  path: string;
  error?: string;
}

const MARKER = '.workbench-managed';
// 安装时把开发机上的绝对路径替换为目标机器的实际技能目录
const SOURCE_ROOT = 'C:/Users/Caspian6610/.pi/agent/skills';
const BUNDLED_ROOTS = ['design-skills', 'bundled-skills'];

function resourceRoot(name: string): string {
  return path.join(app.getAppPath(), 'resources', name);
}

function targetRoot(): string {
  return path.join(realAgentDir(), 'skills');
}

function toForwardSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function copyTree(source: string, target: string, skillsDir: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to, skillsDir);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.endsWith('.json')) {
      const normalized = toForwardSlashes(skillsDir);
      const text = readFileSync(from, 'utf8')
        .split(SOURCE_ROOT).join(normalized)
        .split(SOURCE_ROOT.replace(/\//g, '\\')).join(normalized);
      writeFileSync(to, text, 'utf8');
      continue;
    }
    writeFileSync(to, readFileSync(from));
  }
}

function isDirectory(value: string): boolean {
  try {
    return statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function installRoot(root: string, result: BundledSkillInstallResult): void {
  if (!isDirectory(root)) return;

  let names: string[];
  try {
    names = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    result.ok = false;
    result.error = error instanceof Error ? error.message : String(error);
    return;
  }

  for (const name of names) {
    const source = path.join(root, name);
    const target = path.join(result.path, name);
    const existed = existsSync(target);
    const managed = existed && existsSync(path.join(target, MARKER));
    if (existed && !managed) {
      // 用户自己装的同名 Skill：保留，不覆盖
      result.skipped.push(name);
      continue;
    }
    if (managed) {
      // 标记一致说明已是最新，避免每次启动重复复制 7MB
      try {
        const sourceMarker = readFileSync(path.join(source, MARKER), 'utf8').trim();
        const targetMarker = readFileSync(path.join(target, MARKER), 'utf8').trim();
        if (sourceMarker === targetMarker) continue;
      } catch {
        // 标记不可读时按需重装
      }
    }
    try {
      if (existed) rmSync(target, { recursive: true, force: true });
      copyTree(source, target, result.path);
      if (existed) result.updated.push(name);
      else result.installed.push(name);
    } catch (error) {
      result.ok = false;
      result.error = `${name}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

export function ensureBundledSkills(): BundledSkillInstallResult {
  const result: BundledSkillInstallResult = {
    ok: true,
    installed: [],
    updated: [],
    skipped: [],
    path: targetRoot(),
  };

  try {
    mkdirSync(result.path, { recursive: true });
  } catch (error) {
    return { ...result, ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  for (const name of BUNDLED_ROOTS) installRoot(resourceRoot(name), result);
  return result;
}
