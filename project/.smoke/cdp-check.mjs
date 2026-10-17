import { writeFileSync } from 'node:fs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let targets;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
    if (targets.some((target) => target.type === 'page')) break;
  } catch {
    // app still starting
  }
  await wait(500);
}
const target = targets?.find((item) => item.type === 'page');
if (!target) throw new Error('no page target');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(file) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(result.data, 'base64'));
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.reload');
await wait(2500);
await evaluate('document.getElementById("startup-splash").hidden = true');

const initial = await evaluate(`(() => ({
  title: document.title,
  theme: document.documentElement.dataset.theme,
  reasoning: document.getElementById('reasoning-level').value,
  smart: document.getElementById('smart-level').value,
  splash: document.getElementById('startup-splash').hidden,
  gear: Boolean(document.getElementById('open-settings')),
}))()`);
console.log('initial:', JSON.stringify(initial));

const light = await evaluate(`(() => {
  document.getElementById('open-settings').click();
  const theme = document.getElementById('theme-mode');
  theme.value = 'light';
  theme.dispatchEvent(new Event('change', { bubbles: true }));
  const accent = document.getElementById('accent-color');
  accent.value = 'violet';
  accent.dispatchEvent(new Event('change', { bubbles: true }));
  const density = document.getElementById('compact-density');
  density.checked = true;
  density.dispatchEvent(new Event('change', { bubbles: true }));
  const reasoning = document.getElementById('reasoning-level');
  reasoning.value = 'high';
  reasoning.dispatchEvent(new Event('change', { bubbles: true }));
  const smart = document.getElementById('smart-level');
  smart.value = 'balanced';
  smart.dispatchEvent(new Event('change', { bubbles: true }));
  const styles = getComputedStyle(document.documentElement);
  return {
    theme: document.documentElement.dataset.theme,
    accent: document.documentElement.dataset.accent,
    accentValue: styles.getPropertyValue('--accent').trim(),
    background: styles.getPropertyValue('--bg').trim(),
    text: styles.getPropertyValue('--text').trim(),
    compact: document.body.classList.contains('compact'),
    pane: document.getElementById('pane-settings').hidden,
    tuning: document.getElementById('tuning-state').textContent,
    terminalBg: getComputedStyle(document.querySelector('.xterm-viewport')).backgroundColor,
  };
})()`);
console.log('light:', JSON.stringify(light));
await wait(500);
await screenshot('.smoke/theme-light.png');

const preview = await evaluate(`(() => {
  document.getElementById('preview-startup').click();
  const splash = document.getElementById('startup-splash');
  return { hidden: splash.hidden, playing: splash.classList.contains('playing'), mode: splash.dataset.mode };
})()`);
console.log('preview:', JSON.stringify(preview));
await wait(350);
await screenshot('.smoke/startup-preview.png');
await wait(1400);

const reset = await evaluate(`(() => {
  document.getElementById('reset-appearance').click();
  const reasoning = document.getElementById('reasoning-level');
  reasoning.value = 'auto';
  reasoning.dispatchEvent(new Event('change', { bubbles: true }));
  const smart = document.getElementById('smart-level');
  smart.value = 'auto';
  smart.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    theme: document.documentElement.dataset.theme,
    accent: document.documentElement.dataset.accent,
    compact: document.body.classList.contains('compact'),
    reasoning: reasoning.value,
    smart: smart.value,
    storedTheme: localStorage.getItem('pi-theme-mode'),
    storedReasoning: localStorage.getItem('pi-reasoning-level'),
  };
})()`);
console.log('reset:', JSON.stringify(reset));
await wait(300);
await screenshot('.smoke/theme-dark.png');

socket.close();
