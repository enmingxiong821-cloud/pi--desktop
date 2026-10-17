import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pty from 'node-pty';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const agentDir = process.env.PI_DESKTOP_PI_AGENT_DIR?.trim() || path.join(os.homedir(), '.pi', 'agent');
const installRoot = path.join(agentDir, 'install');
const currentFile = path.join(installRoot, 'current-version');

if (!existsSync(currentFile)) {
  console.error(`未找到 Pi 受管安装：${currentFile}`);
  process.exit(2);
}

const version = readFileSync(currentFile, 'utf8').trim();
const packageDir = path.join(
  installRoot, 'releases', version, 'node_modules', '@earendil-works', 'pi-coding-agent',
);
const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
const relativeBin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.pi;
const cliPath = path.resolve(packageDir, relativeBin);

const command = process.platform === 'win32' ? 'where' : 'which';
const nodePath = execFileSync(command, ['node'], { encoding: 'utf8' })
  .split(/\r?\n/).map((line) => line.trim()).find(Boolean);

const isolatedDir = path.join(root, '.poc-agent');
mkdirSync(isolatedDir, { recursive: true });
const realMode = process.env.PI_SMOKE_REAL === '1';
const runAgentDir = realMode ? agentDir : isolatedDir;

const secretKeys = [
  'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_OAUTH_TOKEN', 'ANT_LING_API_KEY',
  'OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'NVIDIA_API_KEY',
  'GEMINI_API_KEY', 'GROQ_API_KEY', 'CEREBRAS_API_KEY', 'XAI_API_KEY', 'FIREWORKS_API_KEY',
  'TOGETHER_API_KEY', 'BASETEN_API_KEY', 'OPENROUTER_API_KEY', 'AI_GATEWAY_API_KEY',
  'ZAI_API_KEY', 'ZAI_CODING_CN_API_KEY', 'MISTRAL_API_KEY',
];

const env = { ...process.env };
if (!realMode) {
  for (const key of secretKeys) delete env[key];
}
Object.assign(env, {
  PI_CODING_AGENT_DIR: runAgentDir,
  PI_MANAGED_INSTALL_ROOT: installRoot,
  PI_OFFLINE: '1',
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
});

console.log(`Pi ${version}`);
console.log(`CLI  ${cliPath}`);
console.log(`Node ${nodePath}`);
console.log(`${realMode ? '真实' : '隔离'} ${runAgentDir}`);

const cliArgs = [cliPath, '--tui-mode', 'regular'];
if (!realMode) {
  cliArgs.push(
    '--offline',
    '--no-extensions',
    '--no-mcp',
    '--no-skills',
    '--no-prompt-templates',
    '--no-context-files',
  );
}
if (process.env.PI_SMOKE_SESSION) cliArgs.push('--session', process.env.PI_SMOKE_SESSION);

const term = pty.spawn(nodePath, cliArgs, {
  name: 'xterm-256color',
  cols: 120,
  rows: 32,
  cwd: process.env.PI_SMOKE_CWD || root,
  env,
  useConptyDll: true,
});

let output = '';
let finished = false;
let resized = false;

term.onData((data) => {
  output += data;
});

function finish(exitCode, reason) {
  if (finished) return;
  finished = true;

  const logPath = path.join(root, 'poc-pty.log');
  writeFileSync(logPath, output, 'utf8');

  const hasAnsi = /\x1b\[/.test(output);
  const hasCjk = output.includes('中') && output.includes('文');
  const hasPrompt = /pi|Pi|π/.test(output);
  const ok = output.length > 500 && hasAnsi && hasCjk;

  console.log('--- RESULT ---');
  console.log(`原因: ${reason}`);
  console.log(`输出字节: ${output.length}`);
  console.log(`ANSI: ${hasAnsi}`);
  console.log(`中文字符: ${hasCjk}`);
  console.log(`Pi 标识: ${hasPrompt}`);
  console.log(`resize 已执行: ${resized}`);
  console.log(`退出码: ${exitCode}`);
  console.log(`日志: ${logPath}`);
  process.exit(ok ? 0 : 1);
}

term.onExit(({ exitCode }) => finish(exitCode, '进程退出'));

setTimeout(() => {
  console.log('写入中文测试字符');
  term.write('中文输入测试');
}, 3000);

setTimeout(() => {
  resized = true;
  console.log('调整 PTY 尺寸到 100x30');
  term.resize(100, 30);
}, 4500);

setTimeout(() => {
  console.log('结束冒烟测试');
  try {
    term.kill();
  } catch {
    finish(1, 'kill 失败');
  }
  setTimeout(() => finish(1, '退出超时'), 2000);
}, 6500);
