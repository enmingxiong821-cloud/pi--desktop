import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'main'), { recursive: true });
await mkdir(path.join(out, 'renderer'), { recursive: true });

const common = {
  bundle: true,
  sourcemap: true,
  target: 'node22',
  logLevel: 'info',
};

await build({
  ...common,
  entryPoints: [path.join(root, 'backend/main.ts')],
  outfile: path.join(out, 'main/main.cjs'),
  platform: 'node',
  format: 'cjs',
  external: ['electron', 'node-pty'],
});

await build({
  ...common,
  entryPoints: [path.join(root, 'backend/preload.ts')],
  outfile: path.join(out, 'main/preload.cjs'),
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
});

await build({
  entryPoints: [path.join(root, 'frontend/src/main.ts')],
  outfile: path.join(out, 'renderer/main.js'),
  bundle: true,
  sourcemap: true,
  target: 'chrome140',
  format: 'iife',
  loader: { '.css': 'css' },
  logLevel: 'info',
});

await cp(path.join(root, 'frontend/index.html'), path.join(out, 'renderer/index.html'));
