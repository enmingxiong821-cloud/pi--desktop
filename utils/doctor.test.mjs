// 诊断逻辑和真实回环端口测试，不启动 Pi 或调用模型。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { assess, checkDirectories, findPi, probePort } from './doctor.mjs';

test('空 PATH 不从当前目录隐式发现程序', async () => {
  assert.deepEqual(await findPi(''), []);
});

test('不存在的 PATH 返回空列表', async () => {
  assert.deepEqual(await findPi(fileURLToPath(new URL('./missing-path-for-test', import.meta.url))), []);
});

test('项目必需目录全部存在', async () => {
  const result = await checkDirectories(fileURLToPath(new URL('../', import.meta.url)));
  assert.equal(result.length, 6);
  assert.ok(result.every((entry) => entry.exists));
});

test('缺失目录不会被报告为存在', async () => {
  const result = await checkDirectories(fileURLToPath(new URL('./missing-root-for-test', import.meta.url)));
  assert.ok(result.every((entry) => !entry.exists && entry.reason === 'ENOENT'));
});

test('非法端口拒绝执行绑定', async () => {
  for (const port of [0, -1, 65536, 1.5, '1420', NaN]) {
    await assert.rejects(probePort(port), RangeError);
  }
});

test('真实已占用端口报告冲突，释放后可绑定', async () => {
  const server = createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port: 0, host: '127.0.0.1', exclusive: true }, resolve);
  });
  const port = server.address().port;
  try {
    const busy = await probePort(port);
    assert.equal(busy.available, false);
    assert.equal(busy.reason, 'EADDRINUSE');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  assert.equal((await probePort(port)).available, true);
  assert.equal((await probePort(port)).available, true);
});

test('诊断区分入口缺失与基础检查通过', () => {
  const report = { node: 'v24.0.0', directories: [{ exists: true }], piCandidates: ['candidate'], ports: [{ available: true }] };
  assert.deepEqual(assess(report), []);
  assert.equal(assess({ ...report, piCandidates: [] }).length, 1);
  assert.equal(assess({ ...report, node: 'v20.0.0' }).length, 1);
  assert.equal(assess({ ...report, directories: [{ exists: false }], ports: [{ available: false }] }).length, 2);
});
