// 连接本地 Electron 的 CDP，按指定视口截图并输出关键布局信息（仅本地调试用）。
import { writeFileSync } from 'node:fs';

const [out = '.smoke/ui-live.png', width = '1440', height = '900', tabId = ''] = process.argv.slice(2);
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
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((resolve) => setTimeout(resolve, 1600));
if (tabId) {
  await evaluate(`document.getElementById(${JSON.stringify(tabId)})?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 700));
}
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
const metrics = await evaluate(`JSON.stringify({
  viewport: [innerWidth, innerHeight],
  title: document.title,
  body: [document.body.scrollWidth, document.body.scrollHeight],
  nav: [...document.querySelectorAll('.nav-list button')].map((el) => el.textContent.trim()),
  navWidths: [...document.querySelectorAll('.nav-list button')].map((el) => Math.round(el.getBoundingClientRect().width)),
  active: document.querySelector('.nav-list button[aria-selected="true"]')?.textContent?.trim(),
  workspaceTabs: [...document.querySelectorAll('.workspace-tabs button')].map((el) => ({
    text: el.textContent.trim(),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
    scroll: el.scrollWidth > el.clientWidth + 1,
  })),
  columns: {
    sidebar: Math.round(document.querySelector('.layout > .sidebar')?.getBoundingClientRect().width ?? 0),
    terminal: Math.round(document.querySelector('.layout > .terminal-column')?.getBoundingClientRect().width ?? 0),
    workspace: Math.round(document.querySelector('.layout > .workspace')?.getBoundingClientRect().width ?? 0),
  },
  pane: document.querySelector('.pane:not([hidden])')?.id,
  overflowX: document.documentElement.scrollWidth > innerWidth,
})`);
console.log(metrics);
ws.close();
