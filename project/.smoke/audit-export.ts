// 本机验证：把已生成的审计报告导出为 SARIF 2.1.0 并校验结构。
import { readFileSync } from 'node:fs';
import { buildSarif } from '../backend/security-audit.js';
import type { AuditReport } from '../backend/security-audit.js';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: electron .smoke/audit-export.bundle.mjs <last-findings.json>');
  process.exit(2);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as AuditReport;
const sarif = JSON.parse(buildSarif(report));
console.log(JSON.stringify({
  version: sarif.version,
  runs: sarif.runs?.length ?? 0,
  results: sarif.runs?.[0]?.results?.length ?? 0,
  rules: sarif.runs?.[0]?.tool?.driver?.rules?.length ?? 0,
  levels: (sarif.runs?.[0]?.results ?? []).reduce((acc: Record<string, number>, row: { level?: string }) => {
    const key = row.level ?? 'none';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
}, null, 2));
