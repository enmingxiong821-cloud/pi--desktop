import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const work = mkdtempSync(path.join(os.tmpdir(), 'pi-config-share-'));
const bundle = path.join(work, 'config-share.mjs');
execFileSync(process.execPath, [
  path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild'),
  '.smoke/config-share-entry.ts',  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${bundle}`,
], { cwd: root, stdio: 'inherit' });

const share = await import(pathToFileURL(bundle).href);
const userData = path.join(work, 'userData');
const project = path.join(work, 'project');
mkdirSync(project, { recursive: true });
share.configureConfigShare(userData);
share.configureProjectConfig(userData);

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const saved = share.saveConfigTemplate({ name: '常用', model: 'demo/mini', thinking: 'high', autoStart: true });
check(saved.ok && saved.template?.name === '常用', `save template (${JSON.stringify(saved)})`);
check(share.listConfigTemplates().templates?.length === 1, 'template listed');
const replaced = share.saveConfigTemplate({ name: '常用', model: 'demo/mini', thinking: 'low', autoStart: null });
check(replaced.ok && replaced.replaced === true, `same name replaces (${JSON.stringify(replaced)})`);
check(share.listConfigTemplates().templates?.length === 1, 'no duplicate template');

for (let i = 0; i < 19; i += 1) {
  const r = share.saveConfigTemplate({ name: `tpl-${i}`, model: '', thinking: '', autoStart: null });
  check(r.ok, `template ${i} saved (${r.error ?? ''})`);
}
const overflow = share.saveConfigTemplate({ name: 'too-many', model: '', thinking: '', autoStart: null });
check(!overflow.ok, 'template cap enforced');

const templateId = share.listConfigTemplates().templates.find((item) => item.name === '常用').id;
const applied = share.applyConfigTemplate(project, templateId);
check(applied.ok, `apply template (${applied.error ?? ''})`);
const appliedFile = path.join(project, '.pi', 'workbench.json');
const appliedConfig = JSON.parse(readFileSync(appliedFile, 'utf8'));
check(appliedConfig.model === 'demo/mini', 'template model written');
check(appliedConfig.thinking === 'low', 'template thinking written');

writeFileSync(path.join(project, '.env'), 'SMOKE_TOKEN=secret\n# comment\nQUOTED="a b"\n');
const imported = share.importDotEnvFile(project, path.join(project, '.env'));
check(imported.ok && imported.added === 2, `dotenv imported (${JSON.stringify(imported)})`);

const exportFile = path.join(work, 'export.json');
const exported = share.exportProjectConfig(project, exportFile);
check(exported.ok, `export config (${exported.error ?? ''})`);
const exportText = readFileSync(exportFile, 'utf8');
check(!exportText.includes('secret'), 'export never contains env values');
check(!exportText.includes('SMOKE_TOKEN'), 'export omits env names');
const exportedJson = JSON.parse(exportText);
check(exportedJson.kind === 'pi-workbench-project' && exportedJson.version === 1, 'export shape');

const exportedEnvPath = path.join(userData, 'project-env.json');
check(existsSync(exportedEnvPath), 'env stored on this machine');
const envStore = JSON.parse(readFileSync(exportedEnvPath, 'utf8'));
check(JSON.stringify(envStore).includes('secret'), 'env values kept locally');

const badFile = path.join(work, 'bad.json');
writeFileSync(badFile, JSON.stringify({ kind: 'other', version: 1 }));
const badImport = share.importProjectConfig(project, badFile);
check(!badImport.ok, 'foreign config rejected');

const importedBack = share.importProjectConfig(project, exportFile);
check(importedBack.ok, `exported config re-imports (${importedBack.error ?? ''})`);
const afterImportEnv = JSON.parse(readFileSync(exportedEnvPath, 'utf8'));
check(JSON.stringify(afterImportEnv).includes('secret'), 'import keeps existing env');

const parsed = share.parseDotEnv('A=1\nB="x\\ny"\nC=\'raw\'\n');
check(parsed.ok && parsed.env.A === '1' && parsed.env.B === 'x\ny' && parsed.env.C === 'raw', `dotenv parser (${JSON.stringify(parsed)})`);

const reset = share.resetProjectConfig(project);
check(reset.ok, `reset config (${reset.error ?? ''})`);
check(!existsSync(appliedFile), 'reset removes project config');
const resetEnv = JSON.parse(readFileSync(exportedEnvPath, 'utf8'));
check(!JSON.stringify(resetEnv).includes('secret'), 'reset clears local env');

console.log(JSON.stringify({ failures }, null, 2));
rmSync(work, { recursive: true, force: true });
process.exit(failures.length ? 1 : 0);
