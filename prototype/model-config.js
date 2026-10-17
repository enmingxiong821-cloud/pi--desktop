// 中转站配置校验与导出；浏览器原型和 Node 测试共用，不处理真实密钥。
(function (root) {
  'use strict';
  const protocols = ['openai-completions', 'openai-responses', 'anthropic-messages'];

  function validateProfile(input) {
    const id = String(input.id ?? '').trim();
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(id) || ['constructor', 'prototype'].includes(id)) {
      throw new Error('供应商标识须为小写字母开头的字母、数字或短横线，最多 48 字符。');
    }
    const endpoint = String(input.baseUrl ?? '').trim();
    let url;
    try { url = new URL(endpoint); } catch { throw new Error('请输入完整的 API Base URL。'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
      throw new Error('远程中转站必须使用 HTTPS；仅本机回环地址允许 HTTP。');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('地址不能包含账号、密码、查询参数或片段，请勿将 Key 放入地址。');
    }
    if (!protocols.includes(input.api)) throw new Error('请选择支持的 API 协议。');
    const envName = String(input.envName ?? '').trim();
    if (!/^[A-Z_][A-Z0-9_]{0,63}$/.test(envName)) {
      throw new Error('密钥变量名只允许大写字母、数字和下划线，不能以数字开头。');
    }
    const models = [...new Set(String(input.models ?? '').split(/\r?\n/).map((id) => id.trim()).filter(Boolean))];
    if (!models.length || models.length > 50) throw new Error('请填写 1 至 50 个模型 ID，每行一个。');
    if (models.some((id) => !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,159}$/.test(id))) {
      throw new Error('模型 ID 含不支持的字符或过长，请使用中转站给出的准确 ID。');
    }
    return { id, baseUrl: url.href.replace(/\/$/, ''), api: input.api, envName, models };
  }

  function buildConfig(profiles) {
    if (!Array.isArray(profiles) || !profiles.length) throw new Error('请先添加中转站。');
    const providers = Object.create(null);
    for (const input of profiles) {
      const profile = validateProfile({ ...input, models: Array.isArray(input.models) ? input.models.join('\n') : input.models });
      if (Object.hasOwn(providers, profile.id)) throw new Error('供应商标识重复。');
      providers[profile.id] = {
        baseUrl: profile.baseUrl,
        api: profile.api,
        apiKey: '${' + profile.envName + '}',
        models: profile.models.map((id) => ({ id })),
      };
    }
    return { $schema: 'https://pi.dev/schemas/models.schema.json', providers };
  }

  // 仅接收本原型可完整表达的草稿，避免导入后丢失高级 Pi 配置。
  function parseConfig(text) {
    if (typeof text !== 'string' || text.length > 262144) throw new Error('草稿不能超过 256K 字符。');
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('草稿不是有效 JSON。'); }
    const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
    const fields = (value, allowed) => object(value) && Object.keys(value).every((key) => allowed.includes(key));
    if (!fields(data, ['$schema', 'providers']) || !object(data.providers)) throw new Error('需要仅包含 providers 和可选 $schema 的配置草稿。');
    if (data.$schema !== undefined && data.$schema !== 'https://pi.dev/schemas/models.schema.json') throw new Error('不支持该配置 schema。');
    const entries = Object.entries(data.providers);
    if (!entries.length || entries.length > 20) throw new Error('每份草稿须包含 1 至 20 个中转站。');
    return entries.map(([id, provider]) => {
      if (!fields(provider, ['baseUrl', 'api', 'apiKey', 'models'])) throw new Error('包含不支持的供应商字段；为避免丢失配置，已拒绝导入。');
      const variable = typeof provider.apiKey === 'string' && /^\$\{([A-Z_][A-Z0-9_]{0,63})\}$/.exec(provider.apiKey);
      if (!variable) throw new Error('仅接受 ${变量名} 密钥引用，不接受真实 Key 或命令。');
      if (typeof provider.baseUrl !== 'string' || !Array.isArray(provider.models)
        || provider.models.some((model) => !fields(model, ['id']) || typeof model.id !== 'string'
          || !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,159}$/.test(model.id))) {
        throw new Error('模型仅支持 id 字段；高级模型配置请保留在原生 Pi 中。');
      }
      return validateProfile({ id, baseUrl: provider.baseUrl, api: provider.api, envName: variable[1], models: provider.models.map((model) => model.id).join('\n') });
    });
  }

  const api = { validateProfile, buildConfig, parseConfig };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiModelConfig = api;
})(globalThis);
