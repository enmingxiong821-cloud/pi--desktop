import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function realAgentDir(): string {
  return process.env.PI_DESKTOP_PI_AGENT_DIR?.trim() || path.join(os.homedir(), '.pi', 'agent');
}

// Pi accepts JSONC in models.json; strip comments without touching string contents.
export function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  let inLine = false;
  let inBlock = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inLine) {
      if (char === '\n') {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        index += 1;
      } else if (char === '\n') {
        out += char;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') {
      inLine = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlock = true;
      index += 1;
      continue;
    }
    out += char;
  }
  return out;
}

export interface JsonFile {
  exists: boolean;
  data: unknown;
  raw: string;
  error?: string;
}

export function readJsonFile(file: string, allowComments = false): JsonFile {
  if (!existsSync(file)) return { exists: false, data: null, raw: '' };
  let raw = '';
  try {
    raw = readFileSync(file, 'utf8');
    const text = raw.replace(/^﻿/, '');
    return { exists: true, data: JSON.parse(allowComments ? stripJsonComments(text) : text), raw };
  } catch (error) {
    return { exists: true, data: null, raw, error: error instanceof Error ? error.message : String(error) };
  }
}

export function readJson(file: string): unknown {
  return readJsonFile(file).data;
}

export function backupAndWrite(file: string, text: string, mode?: number): string {
  let backup = '';
  if (existsSync(file)) {
    backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    copyFileSync(file, backup);
  }
  writeFileSync(file, text, { encoding: 'utf8', ...(mode === undefined ? {} : { mode }) });
  return backup;
}
