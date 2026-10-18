// 本机验证：radare2 triage 只读样本。
import { app } from 'electron';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runTriage } from '../backend/reverse-r2.js';

const dir = mkdtempSync(path.join(os.tmpdir(), 'pi-r2-live-'));
app.setPath('userData', dir);
writeFileSync(path.join(dir, 'advanced-tools.json'), JSON.stringify({ reverse: true }));

app.whenReady().then(async () => {
  const target = process.env.TRIAGE_PATH || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'notepad.exe');
  const result = await runTriage(target);
  if (!result.ok) {
    console.log(JSON.stringify({ ok: false, error: result.error, installed: result.installed }, null, 2));
    app.exit(1);
    return;
  }
  const triage = result.triage!;
  console.log(JSON.stringify({
    ok: true,
    file: triage.file,
    entry: triage.entry,
    sections: triage.sections.length,
    imports: triage.imports.length,
    exports: triage.exports.length,
    strings: triage.strings.length,
    functions: triage.functions.length,
    xrefs: triage.xrefs.slice(0, 3),
    packer: triage.packer,
    durationMs: triage.durationMs,
    truncated: triage.truncated,
    warnings: triage.warnings,
    sampleFunctions: triage.functions.slice(0, 5),
    sampleStrings: triage.strings.slice(0, 5),
  }, null, 2));
  app.exit(0);
});
