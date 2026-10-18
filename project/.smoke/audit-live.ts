// 本机验证：真实运行 Semgrep / Trivy / gitleaks 审计当前项目。
import { app } from 'electron';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectTools } from '../backend/external-tools.js';
import { getLastFindings, runLocalAudit, stopAudit } from '../backend/security-audit.js';
import type { AuditScanner } from '../backend/security-audit.js';

const dir = mkdtempSync(path.join(os.tmpdir(), 'pi-audit-live-'));
app.setPath('userData', dir);
writeFileSync(path.join(dir, 'advanced-tools.json'), JSON.stringify({
  webSearch: true,
  crawl: true,
  reverse: true,
  security: true,
}));

app.whenReady().then(async () => {
  const tools = await detectTools();
  console.log('tools', JSON.stringify(tools.map((item) => [item.id, item.installed, item.version])));
  const root = process.env.AUDIT_ROOT || path.resolve('.');
  const scanners = (process.env.AUDIT_SCANNERS || 'semgrep,trivy,gitleaks')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as AuditScanner[];
  const timer = setTimeout(() => {
    console.error('timeout');
    stopAudit();
    app.exit(2);
  }, 480000);
  const result = runLocalAudit({ path: root, scanners }, (event) => {
    console.log('progress', event.phase, event.percent, event.count, event.message);
    if (event.phase !== 'done' && event.phase !== 'error' && event.phase !== 'canceled') return;
    clearTimeout(timer);
    const report = getLastFindings();
    console.log(JSON.stringify({
      phase: event.phase,
      scanners: report?.scanners,
      total: report?.findings.length ?? 0,
      sample: report?.findings.slice(0, 8).map((finding) => ({
        tool: finding.tool,
        severity: finding.severity,
        title: finding.title,
        file: finding.file,
        line: finding.line,
        ruleId: finding.ruleId,
      })),
      truncated: report?.truncated,
    }, null, 2));
    app.exit(event.phase === 'done' ? 0 : 1);
  });
  if (!result.ok) {
    clearTimeout(timer);
    console.error(result.error);
    app.exit(1);
  }
});
