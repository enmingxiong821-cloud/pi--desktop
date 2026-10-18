// radare2 二进制 triage：只读副本、固定命令、禁插件、超时与进程树清理。
// 解析不可信样本本身有风险，建议在隔离环境分析未知文件。
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveTool } from './external-tools.js';
import { getToolSettings } from './tools.js';
import { t } from './i18n.js';

export interface R2Section {
  name: string;
  size: number;
  vsize: number;
  perm: string;
  vaddr: number;
}

export interface R2Import {
  name: string;
  library: string;
  type: string;
  plt?: number;
}

export interface R2String {
  value: string;
  length: number;
  type: string;
  vaddr: number;
}

export interface R2Function {
  name: string;
  size: number;
  cc: number;
  bbs: number;
}

export interface R2Xref {
  from: number;
  type: string;
  opcode: string;
}

export interface TriageReport {
  file: {
    path: string;
    size: number;
    sha256: string;
    format: string;
    arch: string;
    bits: number;
    os: string;
    type: string;
    stripped: boolean;
    compiler: string;
  };
  entry: number | null;
  sections: R2Section[];
  imports: R2Import[];
  exports: Array<{ name: string; address: number; type: string }>;
  strings: R2String[];
  functions: R2Function[];
  xrefs: Array<{ import: string; refs: R2Xref[] }>;
  packer: { score: number; reasons: string[] };
  durationMs: number;
  truncated: boolean;
  warnings: string[];
}

export interface TriageResult {
  ok: boolean;
  triage?: TriageReport;
  error?: string;
  installed?: boolean;
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_STRINGS = 200;
const MAX_FUNCTIONS = 120;
const MAX_SECTIONS = 60;
const MAX_IMPORTS = 120;
const MAX_XREFS = 20;
const TIMEOUT_MS = 120_000;

const PACKER_SECTION = /(upx|aspack|adata|themida|vmp|mpress|packed|enigma|petite)/i;
const PACKER_STRING = /(UPX!|MPRESS|Themida|VMProtect|ASPack|Enigma|\.packed)/;

function shannon(buffer: Buffer): number {
  const counts = new Array<number>(256).fill(0);
  for (const byte of buffer) counts[byte] += 1;
  let entropy = 0;
  for (const count of counts) {
    if (!count) continue;
    const p = count / buffer.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseJson(raw: string, warnings: string[], label: string): unknown {
  const body = raw.trim();
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    warnings.push(`${label}: 输出不是合法 JSON`);
    return undefined;
  }
}

interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
  truncated: boolean;
}

function runR2(binary: string, cwd: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
      child.kill();
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_OUTPUT_BYTES) out.push(chunk);
      else truncated = true;
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (err.length < 200) err.push(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: error.message, code: null, timedOut, truncated });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        code,
        timedOut,
        truncated,
      });
    });
  });
}

function killTree(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // 进程已退出
  }
}

export async function runTriage(target: string): Promise<TriageResult> {
  const settings = getToolSettings();
  if (!settings.reverse) return { ok: false, error: t('逆向分析未开启') };
  const resolved = typeof target === 'string' ? path.resolve(target.trim()) : '';
  if (!resolved || !existsSync(resolved)) return { ok: false, error: t('路径不存在') };
  let stat;
  try {
    stat = statSync(resolved);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (stat.isDirectory()) return { ok: false, error: t('请选择单个文件，目录请使用基础分析') };
  if (stat.size > MAX_FILE_BYTES) return { ok: false, error: t('文件超过 100MB，已跳过 triage') };

  const binary = await resolveTool('radare2');
  if (!binary) return { ok: false, error: t('未安装 radare2'), installed: false };

  const workDir = mkdtempSync(path.join(os.tmpdir(), 'pi-r2-'));
  const copy = path.join(workDir, `sample${path.extname(resolved) || '.bin'}`);
  try {
    copyFileSync(resolved, copy);
  } catch (error) {
    rmSync(workDir, { recursive: true, force: true });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const warnings: string[] = [];
  const started = Date.now();
  try {
    const token = `PIWB${randomUUID().replace(/-/g, '')}`;
    // 用 -c 链与唯一标记分帧：Windows 下交互式 stdin 管道不可靠，-c 稳定且仍是一次进程。
    const labels = ['IJ', 'IEJ', 'ISJ', 'IIJ', 'IEJX', 'IZJ', 'IHJ', 'ENTRY', 'AAA', 'AFLJ', 'AXT'];
    const commands = ['ij', 'iej', 'iSj', 'iij', 'iEj', 'izj', 'iHj', '?v entry0', 'aaa', 'aflj', 'axtj @@i'];
    const args = [
      '-N', '-NN', '-q',
      '-e', 'scr.color=0',
      '-e', 'bin.relocs.apply=true',
      '-e', 'anal.timeout=60',
    ];
    for (let index = 0; index < commands.length; index += 1) {
      args.push('-c', `?e ${token}${labels[index]}`);
      args.push('-c', commands[index]);
    }
    args.push('-c', `?e ${token}END`);
    args.push(copy);

    const run = await runR2(binary, workDir, args);
    if (run.timedOut) return { ok: false, error: t('radare2 分析超时（120 秒）') };
    if (run.code !== 0 && !run.stdout) {
      return { ok: false, error: (run.stderr.trim() || t('radare2 分析失败')).slice(-500) };
    }
    const chunks = run.stdout.split(token);
    const sectionOf = (label: string): string => {
      const item = chunks.find((chunk) => chunk.startsWith(label));
      return item ? item.slice(label.length).replace(/^\r?\n/, '').trim() : '';
    };

    const info = asRecord(parseJson(sectionOf('IJ'), warnings, 'ij'));
    const bin = asRecord(info.bin);
    const sectionsRaw = asArray(parseJson(sectionOf('ISJ'), warnings, 'iSj'));
    const importsRaw = asArray(parseJson(sectionOf('IIJ'), warnings, 'iij'));
    const exportsRaw = asArray(parseJson(sectionOf('IEJX'), warnings, 'iEj'));
    const stringsRaw = asArray(parseJson(sectionOf('IZJ'), warnings, 'izj'));
    const functionsRaw = asArray(parseJson(sectionOf('AFLJ'), warnings, 'aflj'));
    const xrefLines = sectionOf('AXT').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const entryValue = Number(sectionOf('ENTRY').split(/\s/)[0] || '');

    const sections: R2Section[] = sectionsRaw.slice(0, MAX_SECTIONS).map((item) => {
      const row = asRecord(item);
      return {
        name: text(row.name),
        size: num(row.size),
        vsize: num(row.vsize),
        perm: text(row.perm),
        vaddr: num(row.vaddr),
      };
    });
    const imports: R2Import[] = importsRaw.slice(0, MAX_IMPORTS).map((item) => {
      const row = asRecord(item);
      return {
        name: text(row.name),
        library: text(row.libname),
        type: text(row.type),
        plt: num(row.plt) || undefined,
      };
    });
    const exports: TriageReport['exports'] = exportsRaw.slice(0, 100).map((item) => {
      const row = asRecord(item);
      return { name: text(row.name), address: num(row.vaddr), type: text(row.type) };
    });
    const strings: R2String[] = stringsRaw
      .map((item) => {
        const row = asRecord(item);
        const value = text(row.string) || text(row.name);
        return { value, length: num(row.length) || value.length, type: text(row.type), vaddr: num(row.vaddr) };
      })
      .filter((item) => item.value.length >= 4)
      .sort((a, b) => b.length - a.length)
      .slice(0, MAX_STRINGS);
    const functions: R2Function[] = functionsRaw
      .map((item) => {
        const row = asRecord(item);
        return { name: text(row.name), size: num(row.size), cc: num(row.cc), bbs: num(row.nbbs) };
      })
      .sort((a, b) => b.size - a.size)
      .slice(0, MAX_FUNCTIONS);

    const xrefs: TriageReport['xrefs'] = [];
    const xrefAligned = xrefLines.length === importsRaw.length;
    if (xrefLines.length && !xrefAligned) {
      warnings.push(`导入交叉引用数量不匹配（${xrefLines.length} / ${importsRaw.length}），已跳过`);
    }
    if (xrefAligned) {
      for (let index = 0; index < Math.min(imports.length, xrefLines.length, MAX_XREFS * 4); index += 1) {
        const refs = asArray(parseJson(xrefLines[index], warnings, 'axtj'));
        if (!refs.length) continue;
        xrefs.push({
          import: imports[index]?.name || `#${index}`,
          refs: refs.slice(0, 10).map((item) => {
            const row = asRecord(item);
            return { from: num(row.from), type: text(row.type), opcode: text(row.opcode) };
          }),
        });
        if (xrefs.length >= MAX_XREFS) break;
      }
    }

    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    try {
      buffer = readFileSync(copy);
    } catch {
      warnings.push('读取样本内容失败，跳过熵与字符串加壳判断');
    }
    const entropy = buffer.length ? shannon(buffer.subarray(0, Math.min(buffer.length, 1024 * 1024))) : 0;
    const packerReasons: string[] = [];
    for (const section of sections) {
      if (PACKER_SECTION.test(section.name)) packerReasons.push(`段名可疑：${section.name}`);
    }
    if (entropy > 7.2) packerReasons.push(`文件熵偏高：${entropy.toFixed(2)}`);
    if (imports.length > 0 && imports.length < 12) packerReasons.push(`导入函数很少：${imports.length}`);
    if (strings.some((item) => PACKER_STRING.test(item.value))) packerReasons.push('字符串命中已知加壳特征');
    const packerScore = Math.min(100, packerReasons.length * 30);

    const triage: TriageReport = {
      file: {
        path: resolved,
        size: stat.size,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        format: text(bin.bintype) || text(bin.format) || text(asRecord(info.core).format),
        arch: text(bin.arch),
        bits: num(bin.bits),
        os: text(bin.os),
        type: text(bin.class) || text(asRecord(info.core).type),
        stripped: Boolean(bin.stripped),
        compiler: text(bin.compiler).trim(),
      },
      entry: Number.isFinite(entryValue) && entryValue > 0 ? entryValue : (num(bin.baddr) || null),
      sections,
      imports,
      exports,
      strings,
      functions,
      xrefs,
      packer: { score: packerScore, reasons: packerReasons },
      durationMs: Date.now() - started,
      truncated: run.truncated,
      warnings,
    };
    return { ok: true, triage, installed: true };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
