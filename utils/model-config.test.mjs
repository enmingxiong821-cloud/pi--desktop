// 原型模型配置的正常、边界与恶意输入测试，不调用远端 API。
import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../prototype/model-config.js';
const good = { id: 'my-relay', baseUrl: 'https://relay.example.com/v1/', api: 'openai-completions', envName: 'PI_RELAY_API_KEY', models: 'model-a\nmodel-b\nmodel-a' };

test('合法中转配置保留路径且去重模型', () => {
  const profile = config.validateProfile(good);
  assert.equal(profile.baseUrl, 'https://relay.example.com/v1');
  assert.deepEqual(profile.models, ['model-a', 'model-b']);
});
test('不擅自补充中转地址路径', () => {
  assert.equal(config.validateProfile({ ...good, baseUrl: 'https://relay.example.com' }).baseUrl, 'https://relay.example.com');
});
test('远端明文协议及 URL 内凭据被拒绝', () => {
  for (const baseUrl of ['http://relay.example.com/v1', 'ftp://localhost', 'https://user:pass@relay.example.com', 'https://relay.example.com?key=secret', 'https://relay.example.com#secret', 'not-a-url']) {
    assert.throws(() => config.validateProfile({ ...good, baseUrl }));
  }
});
test('仅本地回环允许 HTTP', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) assert.ok(config.validateProfile({ ...good, baseUrl: `http://${host}:2420/v1` }));
  assert.throws(() => config.validateProfile({ ...good, baseUrl: 'http://localhost.attacker.example' }));
});
test('拒绝不支持协议和伪造变量或命令', () => {
  for (const envName of ['sk-example-secret', '!command', 'A;B', '1ABC', 'A'.repeat(65), '']) assert.throws(() => config.validateProfile({ ...good, envName }));
  assert.throws(() => config.validateProfile({ ...good, api: 'unknown-api' }));
});
test('拒绝原型污染与非法供应商 ID', () => {
  for (const id of ['__proto__', 'constructor', 'prototype', 'UPPER', 'a'.repeat(49), '<img>']) assert.throws(() => config.validateProfile({ ...good, id }));
});
test('模型数量与字符校验', () => {
  for (const models of ['', ' \n ', '<script>', 'a b', 'a'.repeat(161), Array.from({ length: 51 }, (_, i) => `model-${i}`).join('\n')]) assert.throws(() => config.validateProfile({ ...good, models }));
  assert.equal(config.validateProfile({ ...good, models: 'org/model:tag@v1' }).models[0], 'org/model:tag@v1');
});
test('导出仅包含环境变量引用且可序列化', () => {
  const result = JSON.parse(JSON.stringify(config.buildConfig([config.validateProfile(good)])));
  assert.equal(result.providers['my-relay'].apiKey, '${PI_RELAY_API_KEY}');
  assert.deepEqual(result.providers['my-relay'].models, [{ id: 'model-a' }, { id: 'model-b' }]);
});
test('导出拒绝空列表与重复供应商', () => {
  assert.throws(() => config.buildConfig([]));
  assert.throws(() => config.buildConfig([good, good]));
});

test('导出导入往返保留所有受支持字段', () => {
  const profile = config.validateProfile(good);
  assert.deepEqual(config.parseConfig(JSON.stringify(config.buildConfig([profile]))), [profile]);
});
test('导入拒绝无效 JSON、错误结构与过长文本', () => {
  for (const text of ['{', 'null', '[]', '{}', '{"providers":[]}', '{"providers":{}}', ' '.repeat(262145)]) {
    assert.throws(() => config.parseConfig(text));
  }
});
test('导入拒绝明文密钥与命令且错误不回显密钥', () => {
  for (const apiKey of ['secret-test-key', '!secret-command', '$KEY', '${1KEY}', null, 123]) {
    const draft = config.buildConfig([good]);
    draft.providers['my-relay'].apiKey = apiKey;
    assert.throws(() => config.parseConfig(JSON.stringify(draft)), (error) => {
      assert.match(error.message, /仅接受/);
      assert.ok(!error.message.includes('secret-'));
      return true;
    });
  }
});
test('导入拒绝高级字段以避免静默丢失配置', () => {
  const draft = () => JSON.parse(JSON.stringify(config.buildConfig([good])));
  const root = draft(); root.extra = true;
  const provider = draft(); provider.providers['my-relay'].headers = { Authorization: 'secret' };
  const model = draft(); model.providers['my-relay'].models[0].reasoning = true;
  const schema = draft(); schema.$schema = 'https://example.com/other';
  for (const input of [root, provider, model, schema]) assert.throws(() => config.parseConfig(JSON.stringify(input)));
});
test('导入拒绝换行模型 ID 与非对象供应商', () => {
  const draft = config.buildConfig([good]);
  draft.providers['my-relay'].models = [{ id: 'a\nb' }];
  assert.throws(() => config.parseConfig(JSON.stringify(draft)));
  for (const provider of [null, [], 'text']) {
    assert.throws(() => config.parseConfig(JSON.stringify({ providers: { relay: provider } })));
  }
});
test('导入供应商上限为二十个', () => {
  const profiles = Array.from({ length: 20 }, (_, i) => ({ ...good, id: `relay-${i}` }));
  assert.equal(config.parseConfig(JSON.stringify(config.buildConfig(profiles))).length, 20);
  assert.throws(() => config.parseConfig(JSON.stringify(config.buildConfig([...profiles, { ...good, id: 'relay-extra' }]))));
});
