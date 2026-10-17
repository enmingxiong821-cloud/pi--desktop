import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const en = read('frontend/src/i18n.ts');
const keys = new Set();
for (const m of en.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) keys.add(m[1].replace(/\\'/g, "'"));

const sources = ['frontend/src/panels.ts', 'frontend/src/main.ts', 'frontend/index.html'];
const seen = new Map();
for (const file of sources) {
  const text = read(file);
  for (const m of text.matchAll(/t\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    const s = m[1].replace(/\\'/g, "'");
    if (/[一-鿿]/.test(s)) seen.set(s, file);
  }
  for (const m of text.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) {
    if (/[一-鿿]/.test(m[1])) seen.set(m[1], file);
  }
}
const missing = [...seen.entries()].filter(([s]) => !keys.has(s));
const dynamic = missing.filter(([s]) => s.includes('${'));
console.log(JSON.stringify({ total: seen.size, missing: missing.length, dynamic: dynamic.length }, null, 2));
for (const [s, file] of missing) console.log(`${file}\t${s}`);
