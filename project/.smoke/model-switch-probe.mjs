import os from 'node:os';
import path from 'node:path';
import * as pty from 'node-pty';

const cli = 'C:/Users/Caspian6610/AppData/Roaming/npm/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js';
const cwd = 'C:/Users/Caspian6610/Desktop/pi desktop/project';
const target = process.argv[2] ?? 'openai/gpt-5.4';
const [provider, ...rest] = target.split('/');
const modelId = rest.join('/');

const term = pty.spawn(process.execPath, [cli, '--tui-mode', 'regular'], {
  name: 'xterm-256color',
  cols: 100,
  rows: 30,
  cwd,
  env: {
    ...process.env,
    PI_CODING_AGENT_DIR: path.join(os.homedir(), '.pi', 'agent'),
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  },
  useConptyDll: process.platform === 'win32',
});

let raw = '';
term.onData((data) => {
  raw += data;
});

const clean = () => raw
  .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
  .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
  .replace(/\r/g, '');

const footer = () => {
  const matches = [...clean().matchAll(/\(([\w.-]+)\)\s+([\w./:+-]+)\s+•/g)];
  const last = matches[matches.length - 1];
  return last ? `${last[1]}/${last[2]}` : '';
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await wait(7000);
const before = footer();
// 与前端 sendModelCommand 完全一致：Ctrl+E、Ctrl+U×2、括号粘贴、CR
term.write(`\x05\x15\x15\x1b[200~/model ${target}\x1b[201~\r`);
let after = '';
for (let i = 0; i < 16; i += 1) {
  await wait(750);
  after = footer();
  if (after === target) break;
}
const tail = clean().slice(-1200);
console.log(JSON.stringify({ target, before, after, changed: after === target, tail }, null, 2));
term.kill();
process.exit(0);
