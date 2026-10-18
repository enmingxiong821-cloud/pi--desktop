// 通过 CDP 打开能力页，读取能力包状态并截图（仅本地调试用）。
import { writeFileSync } from 'node:fs';

const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const page = list.find((item) => item.type === 'page' && item.url.includes('index.html')) ?? list.find((item) => item.type === 'page');
if (!page) throw new Error('no page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (resolve) {
    pending.delete(message.id);
    resolve(message);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
}
async function evaluate(expression) {
  const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (reply.result?.exceptionDetails) throw new Error(JSON.stringify(reply.result.exceptionDetails));
  return reply.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');
await evaluate(`document.getElementById('tab-capability').click()`);
await new Promise((resolve) => setTimeout(resolve, 700));

const state = JSON.parse(await evaluate(`JSON.stringify({
  paneVisible: document.getElementById('pane-capability').hidden === false,
  toolbar: document.querySelector('#capability-packs .pack-toolbar')?.textContent,
  groups: [...document.querySelectorAll('#capability-packs .pack-group')].map((el) => el.textContent),
  rows: [...document.querySelectorAll('#capability-packs .pack-row')].map((el) => ({
    label: el.querySelector('strong')?.textContent,
    state: el.querySelector('.pack-state')?.textContent,
    checked: el.querySelector('input')?.checked,
  })),
  actions: [...document.querySelectorAll('#capability-packs .pack-action')].map((el) => ({ text: el.textContent, disabled: el.disabled })),
  note: document.querySelector('#pane-capability .note[data-i18n^="开关按当前项目"]')?.textContent,
})`));
console.log(JSON.stringify(state, null, 2));

await evaluate(`document.querySelector('#pane-capability').scrollTop = 0`);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(new URL('./capability-packs-live.png', import.meta.url), Buffer.from(shot.result.data, 'base64'));

await evaluate(`document.getElementById('tab-project').click()`);
await new Promise((resolve) => setTimeout(resolve, 400));
const env = JSON.parse(await evaluate(`JSON.stringify({
  summary: document.querySelector('#env-details > summary')?.textContent,
  open: document.getElementById('env-details')?.open,
  node: document.getElementById('node-path')?.textContent,
})`));
console.log(JSON.stringify({ env }, null, 2));
const projectShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(new URL('./project-env-live.png', import.meta.url), Buffer.from(projectShot.result.data, 'base64'));
ws.close();
