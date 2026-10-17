import path from 'node:path';
import { backupAndWrite, readJsonFile, realAgentDir } from './config.js';
import { t } from './i18n.js';

const API_TYPES = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
  'google-generative-ai',
  'mistral-conversations',
  'azure-openai-responses',
] as const;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const RESERVED_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_KEY_LENGTH = 4096;

type RecordValue = Record<string, unknown>;

export interface ProviderInfo {
  id: string;
  name?: string;
  baseUrl?: string;
  api?: string;
  custom: boolean;
  modelCount: number;
  modelsText?: string;
  headerNames?: string[];
  hasStoredKey: boolean;
  credentialType?: string;
  keySource: 'stored' | 'config' | 'environment' | 'command' | 'none';
}

export interface ProviderReport {
  providers: ProviderInfo[];
  modelsPath: string;
  authPath: string;
  settingsPath: string;
  warnings: string[];
}

export interface SaveProviderResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

export interface FetchModelsResult {
  ok: boolean;
  reachable?: boolean;
  status?: number;
  models?: string[];
  note?: string;
  error?: string;
  latencyMs?: number;
}

function recordOf(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function paths(): { models: string; auth: string; settings: string } {
  const dir = realAgentDir();
  return {
    models: path.join(dir, 'models.json'),
    auth: path.join(dir, 'auth.json'),
    settings: path.join(dir, 'settings.json'),
  };
}

function readModelsFile(): { data: RecordValue; error?: string } {
  const file = readJsonFile(paths().models, true);
  if (file.error) return { data: {}, error: file.error };
  return { data: recordOf(file.data) };
}

function readAuthFile(): { data: RecordValue; error?: string } {
  const file = readJsonFile(paths().auth);
  if (file.error) return { data: {}, error: file.error };
  return { data: recordOf(file.data) };
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function modelCountOf(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((item) => {
    if (typeof item === 'string') return Boolean(item.trim());
    const model = recordOf(item);
    return typeof model.id === 'string' && Boolean(model.id);
  }).length;
}

function modelsTextOf(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const lines: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      if (item.trim()) lines.push(item.trim());
      continue;
    }
    const model = recordOf(item);
    const id = stringOf(model.id).trim();
    if (!id) continue;
    const name = stringOf(model.name);
    const contextWindow = typeof model.contextWindow === 'number' ? model.contextWindow : undefined;
    const reasoning = typeof model.reasoning === 'boolean' ? model.reasoning : undefined;
    const parts = [id];
    if (name || contextWindow !== undefined || reasoning !== undefined) {
      parts.push(name);
      if (contextWindow !== undefined || reasoning !== undefined) {
        parts.push(contextWindow !== undefined ? String(contextWindow) : '');
        if (reasoning !== undefined) parts.push(String(reasoning));
      }
    }
    lines.push(parts.join(' | '));
  }
  return lines.join('\n');
}

function keySourceOf(provider: RecordValue, authEntry: RecordValue): ProviderInfo['keySource'] {
  if (authEntry.type === 'api_key' && stringOf(authEntry.key)) return 'stored';
  const configured = provider.apiKey;
  if (typeof configured !== 'string' || !configured.trim()) return 'none';
  if (configured.startsWith('!')) return 'command';
  if (configured.startsWith('$')) return 'environment';
  return 'config';
}

export function listProviders(): ProviderReport {
  const { models, auth, settings } = paths();
  const modelsFile = readJsonFile(models, true);
  const authFile = readJsonFile(auth);
  const warnings: string[] = [];
  if (modelsFile.error) warnings.push(t('models.json 解析失败：{error}', { error: modelsFile.error }));
  if (authFile.error) warnings.push(t('auth.json 解析失败：{error}', { error: authFile.error }));

  const customProviders = recordOf(recordOf(modelsFile.data).providers);
  const store = recordOf(readJsonFile(path.join(realAgentDir(), 'models-store.json')).data);
  const authData = recordOf(authFile.data);

  const ids = new Set<string>([
    ...Object.keys(customProviders),
    ...Object.keys(store),
    ...Object.keys(authData),
  ]);

  const providers: ProviderInfo[] = [];
  for (const id of ids) {
    const custom = Object.prototype.hasOwnProperty.call(customProviders, id);
    const configured = recordOf(customProviders[id]);
    const authEntry = recordOf(authData[id]);
    const storedModels = recordOf(store[id]).models;
    const configuredHeaders = recordOf(configured.headers);
    providers.push({
      id,
      name: stringOf(configured.name) || undefined,
      baseUrl: stringOf(configured.baseUrl) || undefined,
      api: stringOf(configured.api) || undefined,
      custom,
      modelCount: custom ? modelCountOf(configured.models) : modelCountOf(storedModels),
      modelsText: custom ? modelsTextOf(configured.models) : undefined,
      headerNames: custom ? Object.keys(configuredHeaders).filter((name) => typeof configuredHeaders[name] === 'string') : undefined,
      hasStoredKey: authEntry.type === 'api_key' && Boolean(stringOf(authEntry.key)),
      credentialType: stringOf(authEntry.type) || undefined,
      keySource: keySourceOf(configured, authEntry),
    });
  }

  providers.sort((a, b) => {
    if (a.custom !== b.custom) return a.custom ? -1 : 1;
    if (a.hasStoredKey !== b.hasStoredKey) return a.hasStoredKey ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return { providers, modelsPath: models, authPath: auth, settingsPath: settings, warnings };
}

function validateProviderId(value: unknown): string {
  const id = stringOf(value).trim();
  if (!id) throw new Error(t('缺少 provider ID'));
  if (!ID_PATTERN.test(id)) {
    throw new Error(t('provider ID 只能用字母、数字、点、下划线、短横线，以字母或数字开头，最多 64 字符'));
  }
  if (RESERVED_IDS.has(id)) throw new Error(t('这个 provider ID 是保留字，请换一个'));
  return id;
}

function validateBaseUrl(value: unknown): string {
  const raw = stringOf(value).trim();
  if (!raw) throw new Error(t('缺少 Base URL'));
  if (raw.length > 2048) throw new Error(t('Base URL 过长'));
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(t('Base URL 不是合法地址'));
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(t('Base URL 只支持 http / https'));
  }
  if (parsed.username || parsed.password) {
    throw new Error(t('Base URL 不能包含用户名或密码，请把密钥填在 API Key'));
  }
  return raw.replace(/\/+$/, '');
}

function validateApi(value: unknown): string {
  const api = stringOf(value).trim() || 'openai-completions';
  if (!(API_TYPES as readonly string[]).includes(api)) {
    throw new Error(t('不支持的 API 类型：{api}', { api }));
  }
  return api;
}

function validateKey(value: unknown, label = 'API Key'): string {
  const key = stringOf(value).trim();
  if (!key) return '';
  if (/[\r\n]/.test(key)) throw new Error(t('{label} 不能包含换行', { label }));
  if (key.length > MAX_KEY_LENGTH) throw new Error(t('{label} 过长', { label }));
  return key;
}

function validateModelId(value: string): string {
  const id = value.trim();
  if (!id) throw new Error(t('模型 ID 为空'));
  if (id.length > 200) throw new Error(t('模型 ID 过长：{id}', { id: `${id.slice(0, 40)}…` }));
  if (/[\u0000-\u001f\u007f]/.test(id)) {
    throw new Error(t('模型 ID 含控制字符：{id}', { id: id.slice(0, 40) }));
  }
  return id;
}

function parseModelsText(value: unknown): Array<RecordValue> {
  const text = stringOf(value);
  const lines = text.split(/\r?\n/);
  const models: Array<RecordValue> = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    const raw = line.trim();
    if (!raw) return;
    const parts = raw.split('|').map((item) => item.trim());
    const id = validateModelId(parts[0] ?? '');
    if (seen.has(id)) throw new Error(t('第 {line} 行模型重复：{id}', { line: index + 1, id }));
    seen.add(id);
    const model: RecordValue = { id };
    if (parts[1]) model.name = parts[1];
    if (parts[2]) {
      const contextWindow = Number(parts[2].replace(/_/g, ''));
      if (!Number.isInteger(contextWindow) || contextWindow <= 0) {
        throw new Error(t('第 {line} 行上下文窗口不是正整数：{value}', { line: index + 1, value: parts[2] }));
      }
      model.contextWindow = contextWindow;
    }
    if (parts[3]) {
      const flag = parts[3].toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(flag)) {
        throw new Error(t('第 {line} 行「是否思考」只能是 true / false', { line: index + 1 }));
      }
      model.reasoning = ['true', '1', 'yes'].includes(flag);
    }
    models.push(model);
  });
  if (!models.length) throw new Error(t('至少填写一个模型 ID'));
  return models;
}

function parseHeadersText(value: unknown): RecordValue | undefined {
  const text = stringOf(value);
  const headers: RecordValue = {};
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const raw = line.trim();
    if (!raw) return;
    const colon = raw.indexOf(':');
    if (colon <= 0) throw new Error(t('第 {line} 行请求头格式应为 Key: Value', { line: index + 1 }));
    const name = raw.slice(0, colon).trim();
    const headerValue = raw.slice(colon + 1).trim();
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) {
      throw new Error(t('第 {line} 行请求头名称不合法：{name}', { line: index + 1, name }));
    }
    if (/[\r\n]/.test(headerValue)) {
      throw new Error(t('第 {line} 行请求头值不能包含换行', { line: index + 1 }));
    }
    if (name.toLowerCase() === 'host' || name.toLowerCase() === 'content-length') {
      throw new Error(t('不允许自定义 {name} 请求头', { name }));
    }
    headers[name] = headerValue;
  });
  return Object.keys(headers).length ? headers : undefined;
}

export function saveProvider(input: unknown): SaveProviderResult {
  try {
    const payload = recordOf(input);
    const id = validateProviderId(payload.id);
    const baseUrl = validateBaseUrl(payload.baseUrl);
    const api = validateApi(payload.api);
    const name = stringOf(payload.name).trim();
    const models = parseModelsText(payload.modelsText);
    const keepHeaders = payload.keepHeaders === true;
    const headers = keepHeaders ? undefined : parseHeadersText(payload.headersText);
    const apiKey = validateKey(payload.apiKey);
    const { models: modelsPath } = paths();

    const file = readJsonFile(modelsPath, true);
    if (file.error) return { ok: false, error: t('models.json 解析失败，未写入：{error}', { error: file.error }) };
    const data = recordOf(file.data);
    const providers = recordOf(data.providers);
    const existing = recordOf(providers[id]);
    const next: RecordValue = { ...existing, baseUrl, api, models };
    if (name) next.name = name;
    else delete next.name;
    if (keepHeaders) {
      // keep the existing headers untouched
    } else if (headers) {
      next.headers = headers;
    } else {
      delete next.headers;
    }
    providers[id] = next;
    data.providers = providers;
    backupAndWrite(modelsPath, `${JSON.stringify(data, null, 2)}\n`);

    let warning: string | undefined;
    if (apiKey) {
      const saved = saveProviderKey(id, apiKey);
      if (!saved.ok) {
        warning = t('models.json 已保存，但密钥写入失败：{error}', { error: saved.error ?? t('未知错误') });
      }
    }
    return { ok: true, warning };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function deleteProvider(input: unknown): SaveProviderResult {
  try {
    const id = validateProviderId(input);
    const { models: modelsPath } = paths();
    const file = readJsonFile(modelsPath, true);
    if (file.error) return { ok: false, error: t('models.json 解析失败，未删除：{error}', { error: file.error }) };
    const data = recordOf(file.data);
    const providers = recordOf(data.providers);
    if (!Object.prototype.hasOwnProperty.call(providers, id)) {
      return { ok: false, error: t('自定义 provider {id} 不存在', { id }) };
    }
    delete providers[id];
    data.providers = providers;
    backupAndWrite(modelsPath, `${JSON.stringify(data, null, 2)}\n`);

    let warning: string | undefined;
    const { settings: settingsPath } = paths();
    const settingsFile = readJsonFile(settingsPath);
    if (settingsFile.exists && settingsFile.error) {
      warning = t('自定义 provider 已删除，但 settings.json 解析失败，默认模型未清理。');
    } else if (recordOf(settingsFile.data).defaultProvider === id) {
      const settingsData = recordOf(settingsFile.data);
      delete settingsData.defaultProvider;
      delete settingsData.defaultModel;
      backupAndWrite(settingsPath, `${JSON.stringify(settingsData, null, 2)}\n`);
    }
    return { ok: true, warning };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function saveProviderKey(providerId: unknown, rawKey: unknown): SaveProviderResult {
  try {
    const id = validateProviderId(providerId);
    const key = validateKey(rawKey);
    const { auth: authPath } = paths();
    const file = readJsonFile(authPath);
    if (file.error) return { ok: false, error: t('auth.json 解析失败，未写入：{error}', { error: file.error }) };
    const data = recordOf(file.data);
    if (key) data[id] = { type: 'api_key', key };
    else delete data[id];
    backupAndWrite(authPath, `${JSON.stringify(data, null, 2)}\n`, 0o600);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function resolveProviderKey(providerId: string): { key?: string; note?: string } {
  const auth = readAuthFile();
  const entry = recordOf(auth.data[providerId]);
  const stored = entry.type === 'api_key' ? stringOf(entry.key) : '';
  if (stored) return { key: stored };

  const models = readModelsFile();
  const configured = stringOf(recordOf(recordOf(models.data.providers)[providerId]).apiKey).trim();
  if (!configured) return {};
  if (configured.startsWith('!')) {
    return { note: t('该 provider 的密钥由命令读取，工作台不会执行命令；测试连接请临时填写 API Key。') };
  }
  if (configured.startsWith('$$')) return { key: configured.slice(1) };
  if (configured.startsWith('$')) {
    const name = configured.replace(/^\$\{?/, '').replace(/\}$/, '');
    if (!name) return {};
    const value = process.env[name];
    return value ? { key: value } : { note: t('环境变量 {name} 未设置。', { name }) };
  }
  return { key: configured };
}

function friendlyStatus(status: number): string {
  if (status === 401) return t('密钥被拒绝（401），请检查 API Key');
  if (status === 403) return t('没有权限（403），请检查密钥权限或 IP 白名单');
  if (status === 404) return t('接口不存在（404），请检查 Base URL');
  if (status === 429) return t('请求被限流（429），稍后再试');
  if (status >= 500) return t('服务端错误（{status}）', { status });
  return t('请求失败（HTTP {status}）', { status });
}

function pickModelId(item: unknown): string {
  if (typeof item === 'string') return item;
  const model = recordOf(item);
  for (const field of ['id', 'name', 'model']) {
    const value = model[field];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function extractModels(payload: unknown): string[] {
  const ids: string[] = [];
  const collect = (list: unknown): void => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const id = pickModelId(item).trim().replace(/^models\//, '');
      if (id) ids.push(id);
    }
  };
  const root = recordOf(payload);
  collect(recordOf(root.data).data ?? root.data);
  collect(root.models);
  if (Array.isArray(payload)) collect(payload);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b)).slice(0, 500);
}

export async function fetchProviderModels(input: unknown): Promise<FetchModelsResult> {
  let key = '';
  let baseUrl = '';
  let api = 'openai-completions';
  let headers: RecordValue = {};
  let note: string | undefined;
  try {
    const payload = recordOf(input);
    const providerId = stringOf(payload.providerId).trim();
    let configured: RecordValue = {};
    if (providerId) {
      validateProviderId(providerId);
      const models = readModelsFile();
      configured = recordOf(recordOf(models.data.providers)[providerId]);
    }
    baseUrl = validateBaseUrl(payload.baseUrl || configured.baseUrl);
    api = validateApi(payload.api || configured.api);
    headers = { ...recordOf(configured.headers), ...(parseHeadersText(payload.headersText) ?? {}) };
    key = validateKey(payload.apiKey);
    if (!key) {
      const resolved = resolveProviderKey(providerId);
      key = resolved.key ?? '';
      note = resolved.note;
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, error: t('Base URL 不是合法地址') };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: t('Base URL 只支持 http / https') };
  }
  if (!/\/models\/?$/.test(url.pathname)) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/models`;
  }
  if (api === 'google-generative-ai' && key) url.searchParams.set('key', key);

  const requestHeaders: Record<string, string> = { Accept: 'application/json' };
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === 'string') requestHeaders[name] = value;
  }
  if (key && !Object.keys(requestHeaders).some((name) => name.toLowerCase() === 'authorization')) {
    if (api === 'anthropic-messages') {
      requestHeaders['x-api-key'] = key;
      requestHeaders['anthropic-version'] = requestHeaders['anthropic-version'] || '2023-06-01';
    } else if (api === 'azure-openai-responses') {
      requestHeaders['api-key'] = key;
    } else if (api !== 'google-generative-ai') {
      requestHeaders.Authorization = `Bearer ${key}`;
    }
  }

  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - started;
    const body = await response.text();
    if (response.status === 404) {
      return {
        ok: true,
        reachable: true,
        status: 404,
        models: [],
        latencyMs,
        note: t('端点可达，但没有 /models 接口；请手动填写模型 ID。'),
      };
    }
    if (!response.ok) {
      return { ok: false, reachable: true, status: response.status, latencyMs, error: friendlyStatus(response.status), note };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body.slice(0, 2_000_000));
    } catch {
      return {
        ok: true,
        reachable: true,
        status: response.status,
        models: [],
        latencyMs,
        note: t('端点可达，但返回的不是 JSON 模型列表；请手动填写模型 ID。'),
      };
    }
    const models = extractModels(payload);
    return {
      ok: true,
      reachable: true,
      status: response.status,
      models,
      latencyMs,
      note: models.length ? note : (note || t('端点可达，但响应里没有模型列表；请手动填写模型 ID。')),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Never echo a key that may appear in the URL or error text.
    const sanitized = (key ? message.split(key).join('***') : message).replace(/key=[^&\s]+/gi, 'key=***');
    if (/timeout|timed out|aborted/i.test(sanitized)) {
      return { ok: false, error: t('连接超时（10 秒），请检查 Base URL、网络或代理'), note };
    }
    if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(sanitized)) {
      return { ok: false, error: t('域名解析失败，请检查 Base URL'), note };
    }
    if (/ECONNREFUSED/i.test(sanitized)) {
      return { ok: false, error: t('连接被拒绝，服务未启动或端口不对'), note };
    }
    if (/CERT|TLS|SSL/i.test(sanitized)) {
      return { ok: false, error: t('TLS 证书校验失败，请检查中转站证书'), note };
    }
    return { ok: false, error: t('连接失败：{error}', { error: sanitized.slice(0, 160) }), note };
  }
}

export function setDefaultModel(provider: unknown, model: unknown): SaveProviderResult {
  try {
    const providerId = stringOf(provider).trim();
    const modelId = stringOf(model).trim();
    if (!providerId || !modelId) return { ok: false, error: t('缺少 provider 或模型') };
    if (providerId.length > 100 || modelId.length > 200) {
      return { ok: false, error: t('provider 或模型名称过长') };
    }
    if (/[\u0000-\u001f\u007f]/.test(providerId + modelId)) {
      return { ok: false, error: t('名称含控制字符') };
    }
    const { settings: settingsPath } = paths();
    const file = readJsonFile(settingsPath);
    if (file.error) {
      return { ok: false, error: t('settings.json 解析失败，未写入：{error}', { error: file.error }) };
    }
    const data = recordOf(file.data);
    backupAndWrite(settingsPath, `${JSON.stringify({ ...data, defaultProvider: providerId, defaultModel: modelId }, null, 2)}\n`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export { API_TYPES };
