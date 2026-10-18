// 本地代码安全审计：只调用已安装的检测工具，固定参数、只读、不联网上传代码。
// 发现项统一归一化、去重并写入 userData/security/last-findings.json。
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';
import { resolveTool } from './external-tools.js';
import { getToolSettings } from './tools.js';
import { t } from './i18n.js';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AuditScanner = 'semgrep' | 'trivy' | 'gitleaks' | 'bandit' | 'gosec';

export interface Finding {
  id: string;
  tool: AuditScanner;
  severity: AuditSeverity;
  title: string;
  message: string;
  file?: string;
  line?: number;
  ruleId?: string;
  category?: string;
}

export interface AuditOptions {
  path: string;
  scanners?: AuditScanner[];
}

export interface AuditSummary {
  id: AuditScanner;
  installed: boolean;
  ok: boolean;
  count: number;
  skipped?: boolean;
  error?: string;
}

export interface AuditProgress {
  runId: string;
  phase: 'starting' | 'scanning' | 'done' | 'error' | 'canceled';
  message: string;
  percent?: number;
  count?: number;
}

export interface AuditReport {
  runId: string;
  root: string;
  startedAt: string;
  finishedAt: string;
  findings: Finding[];
  scanners: AuditSummary[];
  canceled: boolean;
  truncated: boolean;
}

const MAX_FINDINGS = 2000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const SEMGREP_TIMEOUT = 10 * 60 * 1000;
const TRIVY_TIMEOUT = 10 * 60 * 1000;
const GITLEAKS_TIMEOUT = 5 * 60 * 1000;
const SMALL_TOOL_TIMEOUT = 5 * 60 * 1000;

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const SCANNER_LABEL: Record<AuditScanner, string> = {
  semgrep: 'Semgrep',
  trivy: 'Trivy',
  gitleaks: 'gitleaks',
  bandit: 'Bandit',
  gosec: 'gosec',
};

interface ActiveRun {
  runId: string;
  root: string;
  canceled: boolean;
  child?: ChildProcess;
}

let active: ActiveRun | undefined;
let lastReport: AuditReport | undefined;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

function runCommand(binary: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(binary, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ stdout: '', stderr: error instanceof Error ? error.message : String(error), code: null, timedOut: false });
      return;
    }
    if (active) active.child = child;
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
      child.kill();
    }, timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_OUTPUT_BYTES) out.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      if (err.length < 400) err.push(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: error.message, code: null, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        code,
        timedOut,
      });
    });
  });
}

function parseJson(raw: string): unknown {
  const body = raw.trim();
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function normalizeSeverity(value: string): AuditSeverity {
  const key = value.trim().toLowerCase();
  if (key === 'critical') return 'critical';
  if (key === 'high' || key === 'error') return 'high';
  if (key === 'medium' || key === 'moderate' || key === 'warning') return 'medium';
  if (key === 'low') return 'low';
  return 'info';
}

function semgrepSeverity(raw: string, score: number): AuditSeverity {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return normalizeSeverity(raw);
}

function relativeFile(root: string, file: string): string {
  if (!file) return '';
  const resolved = path.resolve(file);
  const rel = path.relative(root, resolved);
  return rel && !rel.startsWith('..') ? rel.split(path.sep).join('/') : resolved;
}

function truncate(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function tail(value: string): string {
  return value.trim().slice(-400);
}

function detectLanguage(root: string): { python: boolean; go: boolean } {
  const names = new Set<string>();
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isFile()) names.add(entry.name);
    }
  } catch {
    // 目录不可读时按无语言处理
  }
  const python = ['requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile']
    .some((name) => names.has(name))
    || [...names].some((name) => name.endsWith('.py'));
  return { python, go: existsSync(path.join(root, 'go.mod')) };
}

async function scanSemgrep(binary: string, root: string): Promise<{ findings: Finding[]; error?: string }> {
  const args = [
    // auto 配置要求开启 metrics；改用注册表 p/default，保持 --metrics=off。
    'scan', '--config', 'p/default', '--json', '--metrics=off', '--disable-version-check',
    '--timeout', '60', '--max-target-bytes', '2000000', '--quiet', root,
  ];
  const run = await runCommand(binary, args, root, SEMGREP_TIMEOUT);
  const parsed = parseJson(run.stdout);
  if (!parsed) {
    return { findings: [], error: run.timedOut ? t('扫描超时') : (tail(run.stderr) || t('Semgrep 输出无法解析')) };
  }
  const findings: Finding[] = [];
  for (const item of asArray(asRecord(parsed).results)) {
    const row = asRecord(item);
    const extra = asRecord(row.extra);
    const meta = asRecord(extra.metadata);
    const ruleId = text(row.check_id);
    const file = relativeFile(root, text(row.path));
    findings.push({
      id: '',
      tool: 'semgrep',
      severity: semgrepSeverity(text(extra.severity), Number.parseFloat(text(meta['security-severity'])) || 0),
      title: truncate(text(ruleId) || t('Semgrep 规则命中'), 140),
      message: truncate(text(extra.message), 400),
      file: file || undefined,
      line: num(asRecord(row.start).line) || undefined,
      ruleId: ruleId || undefined,
      category: text(meta.category) || undefined,
    });
  }
  return { findings };
}

async function scanTrivy(binary: string, root: string): Promise<{ findings: Finding[]; error?: string }> {
  const args = [
    'fs', '--format', 'json', '--scanners', 'vuln,secret,misconfig',
    '--severity', 'HIGH,CRITICAL', '--timeout', '10m',
    '--skip-dirs', 'node_modules', '--skip-dirs', 'dist', '--skip-dirs', '.git',
    '--skip-dirs', 'build', '--quiet', root,
  ];
  const run = await runCommand(binary, args, root, TRIVY_TIMEOUT);
  const parsed = parseJson(run.stdout);
  if (!parsed) {
    return { findings: [], error: run.timedOut ? t('扫描超时') : (tail(run.stderr) || t('Trivy 输出无法解析')) };
  }
  const findings: Finding[] = [];
  for (const result of asArray(asRecord(parsed).Results)) {
    const bucket = asRecord(result);
    const target = relativeFile(root, text(bucket.Target));
    for (const item of asArray(bucket.Vulnerabilities)) {
      const row = asRecord(item);
      findings.push({
        id: '',
        tool: 'trivy',
        severity: normalizeSeverity(text(row.Severity)),
        title: `${text(row.VulnerabilityID)} · ${text(row.PkgName)}`,
        message: truncate(
          `${text(row.PkgName)}@${text(row.InstalledVersion)}${row.FixedVersion ? ` → ${text(row.FixedVersion)}` : ''} ${text(row.Title)}`,
          400,
        ),
        file: target || undefined,
        ruleId: text(row.VulnerabilityID) || undefined,
        category: 'vulnerability',
      });
    }
    for (const item of asArray(bucket.Secrets)) {
      const row = asRecord(item);
      findings.push({
        id: '',
        tool: 'trivy',
        severity: normalizeSeverity(text(row.Severity)),
        title: truncate(text(row.Title) || text(row.RuleID) || t('疑似密钥泄露'), 140),
        message: t('检测到疑似密钥，内容未回显'),
        file: target || undefined,
        line: num(row.StartLine) || undefined,
        ruleId: text(row.RuleID) || undefined,
        category: 'secret',
      });
    }
    for (const item of asArray(bucket.Misconfigurations)) {
      const row = asRecord(item);
      findings.push({
        id: '',
        tool: 'trivy',
        severity: normalizeSeverity(text(row.Severity)),
        title: truncate(text(row.Title) || text(row.ID), 140),
        message: truncate(text(row.Message) || text(row.Description), 400),
        file: target || undefined,
        line: num(asRecord(row.CauseMetadata).StartLine) || undefined,
        ruleId: text(row.ID) || undefined,
        category: 'misconfiguration',
      });
    }
  }
  return { findings };
}

async function scanGitleaks(binary: string, root: string): Promise<{ findings: Finding[]; error?: string }> {
  const staging = mkdtempSync(path.join(os.tmpdir(), 'pi-gitleaks-'));
  const report = path.join(staging, 'report.json');
  try {
    // gitleaks 没有 --exclude-path；用扩展默认规则的最小配置跳过依赖与构建产物。
    const configPath = path.join(staging, 'gitleaks.toml');
    writeFileSync(configPath, [
      '[extend]',
      'useDefault = true',
      '',
      '[allowlist]',
      'paths = [',
      "  '''(^|/)node_modules(/|$)''',",
      "  '''(^|/)dist(/|$)''',",
      "  '''(^|/)build(/|$)''',",
      "  '''(^|/)coverage(/|$)''',",
      "  '''(^|/)\\.git(/|$)''',",
      "  '''(^|/)\\.venv(/|$)''',",
      "  '''(^|/)venv(/|$)''',",
      "  '''(^|/)__pycache__(/|$)''',",
      "  '''(^|/)vendor(/|$)''',",
      "  '''(^|/)release(/|$)''',",
      "  '''(^|/)target(/|$)''',",
      ']',
      '',
    ].join('\n'), 'utf8');
    const args = [
      'dir', root, '--config', configPath, '--report-format', 'json', '--report-path', report,
      '--no-banner', '--redact', '--exit-code', '0', '--max-target-megabytes', '2',
    ];
    const run = await runCommand(binary, args, root, GITLEAKS_TIMEOUT);
    let raw = '';
    try {
      raw = readFileSync(report, 'utf8');
    } catch {
      return { findings: [], error: run.timedOut ? t('扫描超时') : (tail(run.stderr) || t('gitleaks 未生成报告')) };
    }
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
      return { findings: [], error: tail(run.stderr) || t('gitleaks 输出无法解析') };
    }
    const findings: Finding[] = parsed.map((item) => {
      const row = asRecord(item);
      return {
        id: '',
        tool: 'gitleaks' as const,
        severity: 'high' as const,
        title: truncate(text(row.Description) || text(row.RuleID) || t('疑似密钥泄露'), 140),
        message: t('检测到疑似密钥，内容已脱敏'),
        file: relativeFile(root, text(row.File)) || undefined,
        line: num(row.StartLine) || undefined,
        ruleId: text(row.RuleID) || undefined,
        category: 'secret',
      };
    });
    return { findings };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

async function scanBandit(binary: string, root: string): Promise<{ findings: Finding[]; error?: string }> {
  const run = await runCommand(binary, ['-f', 'json', '-q', '-r', root], root, SMALL_TOOL_TIMEOUT);
  const parsed = parseJson(run.stdout);
  if (!parsed) {
    return { findings: [], error: run.timedOut ? t('扫描超时') : (tail(run.stderr) || t('Bandit 输出无法解析')) };
  }
  const findings: Finding[] = asArray(asRecord(parsed).results).map((item) => {
    const row = asRecord(item);
    return {
      id: '',
      tool: 'bandit' as const,
      severity: normalizeSeverity(text(row.issue_severity)),
      title: truncate(`${text(row.test_id)} · ${text(row.test_name)}`, 140),
      message: truncate(text(row.issue_text), 400),
      file: relativeFile(root, text(row.filename)) || undefined,
      line: num(row.line_number) || undefined,
      ruleId: text(row.test_id) || undefined,
      category: 'python',
    };
  });
  return { findings };
}

async function scanGosec(binary: string, root: string): Promise<{ findings: Finding[]; error?: string }> {
  const run = await runCommand(binary, ['-fmt=json', '-quiet', './...'], root, SMALL_TOOL_TIMEOUT);
  const parsed = parseJson(run.stdout);
  if (!parsed) {
    return { findings: [], error: run.timedOut ? t('扫描超时') : (tail(run.stderr) || t('gosec 输出无法解析')) };
  }
  const findings: Finding[] = asArray(asRecord(parsed).Issues).map((item) => {
    const row = asRecord(item);
    return {
      id: '',
      tool: 'gosec' as const,
      severity: normalizeSeverity(text(row.severity)),
      title: truncate(`${text(row.rule_id)} · ${text(row.details)}`, 140),
      message: truncate(text(row.details), 400),
      file: relativeFile(root, text(row.file)) || undefined,
      line: num(row.line) || undefined,
      ruleId: text(row.rule_id) || undefined,
      category: 'go',
    };
  });
  return { findings };
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const finding of findings) {
    const key = `${finding.tool}|${finding.ruleId ?? ''}|${finding.file ?? ''}|${finding.line ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    finding.id = `${finding.tool}-${seen.size}`;
    out.push(finding);
  }
  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function writeReport(report: AuditReport): void {
  try {
    const file = path.join(app.getPath('userData'), 'security', 'last-findings.json');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch {
    // 写入失败不影响本次结果展示
  }
}

function emitProgress(
  callback: (event: AuditProgress) => void,
  runId: string,
  phase: AuditProgress['phase'],
  message: string,
  percent?: number,
  count?: number,
): void {
  callback({ runId, phase, message, percent, count });
}

async function execute(
  run: ActiveRun,
  root: string,
  scanners: AuditScanner[],
  callback: (event: AuditProgress) => void,
): Promise<void> {
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];
  const summaries: AuditSummary[] = [];
  emitProgress(callback, run.runId, 'starting', t('正在准备审计'), 2);

  for (let index = 0; index < scanners.length; index += 1) {
    if (run.canceled) break;
    const id = scanners[index];
    const label = SCANNER_LABEL[id];
    const percent = Math.round(5 + (index / Math.max(1, scanners.length)) * 88);
    const binary = await resolveTool(id);
    if (!binary) {
      summaries.push({ id, installed: false, ok: false, count: 0, error: t('未安装') });
      emitProgress(callback, run.runId, 'scanning', `${label}：${t('未安装')}`, percent, findings.length);
      continue;
    }
    emitProgress(callback, run.runId, 'scanning', `${label} ${t('扫描中…')}`, percent, findings.length);
    let result: { findings: Finding[]; error?: string };
    try {
      result = id === 'semgrep'
        ? await scanSemgrep(binary, root)
        : id === 'trivy'
          ? await scanTrivy(binary, root)
          : id === 'gitleaks'
            ? await scanGitleaks(binary, root)
            : id === 'bandit'
              ? await scanBandit(binary, root)
              : await scanGosec(binary, root);
    } catch (error) {
      result = { findings: [], error: error instanceof Error ? error.message : String(error) };
    }
    if (run.canceled) break;
    findings.push(...result.findings);
    summaries.push({ id, installed: true, ok: !result.error, count: result.findings.length, error: result.error });
    emitProgress(
      callback, run.runId, 'scanning',
      `${label}：${result.error ? result.error : `${result.findings.length} ${t('项发现')}`}`,
      percent, findings.length,
    );
  }

  const canceled = run.canceled;
  const trimmed = findings.length > MAX_FINDINGS;
  const finalFindings = dedupe(trimmed ? findings.slice(0, MAX_FINDINGS) : findings);
  const report: AuditReport = {
    runId: run.runId,
    root,
    startedAt,
    finishedAt: new Date().toISOString(),
    findings: finalFindings,
    scanners: summaries,
    canceled,
    truncated: trimmed,
  };
  lastReport = report;
  writeReport(report);
  emitProgress(
    callback, run.runId,
    canceled ? 'canceled' : 'done',
    canceled ? t('审计已停止') : `${t('审计完成')} · ${finalFindings.length} ${t('项发现')}`,
    100, finalFindings.length,
  );
}

export function runLocalAudit(
  input: AuditOptions,
  callback: (event: AuditProgress) => void,
): { ok: boolean; runId?: string; error?: string } {
  if (!getToolSettings().security) return { ok: false, error: t('安全审计未开启') };
  if (active) return { ok: false, error: t('已有审计在运行') };
  const target = typeof input?.path === 'string' ? path.resolve(input.path.trim()) : '';
  if (!target || !existsSync(target)) return { ok: false, error: t('路径不存在') };
  let stat;
  try {
    stat = statSync(target);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const root = stat.isDirectory() ? target : path.dirname(target);
  const language = detectLanguage(root);
  const requested = Array.isArray(input.scanners) && input.scanners.length
    ? input.scanners.filter((id): id is AuditScanner => id in SCANNER_LABEL)
    : ['semgrep', 'trivy', 'gitleaks', ...(language.python ? ['bandit'] : []), ...(language.go ? ['gosec'] : [])] as AuditScanner[];
  if (!requested.length) return { ok: false, error: t('没有可用的审计工具') };

  const runId = randomUUID();
  const run: ActiveRun = { runId, root, canceled: false };
  active = run;
  void execute(run, stat.isDirectory() ? target : root, requested, callback).finally(() => {
    if (active === run) active = undefined;
  });
  return { ok: true, runId };
}

export function stopAudit(): { ok: boolean; error?: string } {
  if (!active) return { ok: false, error: t('没有正在运行的审计') };
  active.canceled = true;
  if (active.child) killTree(active.child.pid);
  return { ok: true };
}

export function getLastFindings(): AuditReport | undefined {
  if (lastReport) return lastReport;
  try {
    const file = path.join(app.getPath('userData'), 'security', 'last-findings.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as AuditReport;
    if (parsed && Array.isArray(parsed.findings)) {
      lastReport = parsed;
      return parsed;
    }
  } catch {
    // 没有历史报告
  }
  return undefined;
}

const SARIF_LEVEL: Record<AuditSeverity, 'error' | 'warning' | 'note'> = {
  critical: 'error', high: 'error', medium: 'warning', low: 'note', info: 'note',
};

export function buildSarif(report: AuditReport): string {
  const rules = new Map<string, { id: string; name: string; shortDescription: { text: string } }>();
  for (const finding of report.findings) {
    const ruleId = finding.ruleId || finding.tool;
    if (rules.has(ruleId)) continue;
    rules.set(ruleId, { id: ruleId, name: finding.tool, shortDescription: { text: finding.title } });
  }
  const payload = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'Pi Workbench Security Audit',
          informationUri: 'https://github.com/',
          rules: [...rules.values()],
        },
      },
      results: report.findings.map((finding) => ({
        ruleId: finding.ruleId || finding.tool,
        level: SARIF_LEVEL[finding.severity],
        message: { text: finding.message || finding.title },
        properties: { tool: finding.tool, severity: finding.severity },
        ...(finding.file ? {
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: finding.file },
              ...(finding.line ? { region: { startLine: finding.line } } : {}),
            },
          }],
        } : {}),
      })),
    }],
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
