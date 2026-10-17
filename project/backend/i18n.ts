export type Locale = 'zh-CN' | 'en';

const EN: Record<string, string> = {
  // main.ts
  '缺少项目目录': 'Project directory is required',
  '模型标识无效': 'Invalid model identifier',
  '会话文件不在 Pi 会话目录内': 'Session file is outside the Pi session directory',
  '选择项目目录': 'Choose project folder',
  'Pi 工作台 · PoC': 'Pi Workbench · PoC',
  '路径无效': 'Invalid path',
  '路径不存在': 'Path does not exist',

  // capabilities.ts
  '作用域无效': 'Invalid scope',
  '项目目录不存在': 'Project folder does not exist',
  '填写名称': 'Enter a name',
  '名称只能包含字母、数字、点、下划线、短横线，最多 64 字符':
    'Name may only contain letters, digits, dots, underscores and dashes, at most 64 characters',
  '描述': 'Description',
  '同名 Skill 已存在：{name}': 'A Skill with that name already exists: {name}',
  '参数过长': 'Argument is too long',
  '第 {line} 行环境变量格式应为 KEY=VALUE': 'Line {line}: environment variable must be KEY=VALUE',
  '第 {line} 行环境变量名不合法：{name}': 'Line {line}: invalid environment variable name: {name}',
  '第 {line} 行环境变量值过长': 'Line {line}: environment variable value is too long',
  'MCP 配置解析失败：{error}': 'Failed to parse the MCP configuration: {error}',
  '同名 MCP 服务器已存在：{name}': 'An MCP server with that name already exists: {name}',
  '填写启动命令': 'Enter the launch command',
  '启动命令': 'Launch command',

  // media.ts
  '缺少文件路径': 'File path is required',
  '不支持的文件类型': 'Unsupported file type',
  '无法读取该文件': 'Cannot read this file',
  '选择图片或视频': 'Choose images or videos',
  '图片与视频': 'Images and videos',
  '所有文件': 'All files',
  '所选文件都不可用': 'None of the selected files are usable',
  '选择文件或媒体': 'Choose files or media',
  '所选文件不是支持的图片或视频': 'The selected files are not supported images or videos',
  '剪贴板里没有图片': 'No image in the clipboard',
  '读取剪贴板图片失败': 'Failed to read the clipboard image',
  '文件不在允许预览的范围内': 'File is outside the preview allowlist',
  '文件不存在': 'File does not exist',

  // pi.ts
  '未找到 Node.js 可执行文件；请设置 PI_DESKTOP_NODE 指向 node.exe':
    'Node.js executable not found; set PI_DESKTOP_NODE to node.exe',
  '未找到 Pi 受管安装：{path}': 'No managed Pi installation found: {path}',
  'Pi 版本文件内容无效：{value}': 'Invalid Pi version file content: {value}',
  'Pi 包未声明 pi 可执行入口': 'The Pi package does not declare a pi executable entry',
  'Pi CLI 入口不存在：{path}': 'Pi CLI entry does not exist: {path}',

  // inspect.ts
  '未发现 models-store.json 或 models.json 中的模型。':
    'No models found in models-store.json or models.json.',
  '已发现 {count} 个中转站 provider；密钥不会被读取或显示。':
    'Found {count} relay providers; keys are never read or shown.',
  '未发现用户扩展。': 'No user extensions found.',
  '未发现 Skills。': 'No Skills found.',
  '未发现 MCP 配置。': 'No MCP configuration found.',

  // providers.ts
  'models.json 解析失败：{error}': 'Failed to parse models.json: {error}',
  'auth.json 解析失败：{error}': 'Failed to parse auth.json: {error}',
  '缺少 provider ID': 'Provider ID is required',
  'provider ID 只能用字母、数字、点、下划线、短横线，以字母或数字开头，最多 64 字符':
    'Provider ID may only contain letters, digits, dots, underscores and dashes, must start with a letter or digit, and be at most 64 characters',
  '这个 provider ID 是保留字，请换一个': 'This provider ID is reserved; choose another',
  '缺少 Base URL': 'Base URL is required',
  'Base URL 过长': 'Base URL is too long',
  'Base URL 不是合法地址': 'Base URL is not a valid address',
  'Base URL 只支持 http / https': 'Base URL must use http or https',
  'Base URL 不能包含用户名或密码，请把密钥填在 API Key':
    'Base URL must not contain a username or password; put the key in API Key',
  '不支持的 API 类型：{api}': 'Unsupported API type: {api}',
  '{label} 不能包含换行': '{label} must not contain line breaks',
  '{label} 过长': '{label} is too long',
  '模型 ID 为空': 'Model ID is empty',
  '模型 ID 过长：{id}': 'Model ID is too long: {id}',
  '模型 ID 含控制字符：{id}': 'Model ID contains control characters: {id}',
  '第 {line} 行模型重复：{id}': 'Line {line}: duplicate model {id}',
  '第 {line} 行上下文窗口不是正整数：{value}':
    'Line {line}: context window is not a positive integer: {value}',
  '第 {line} 行「是否思考」只能是 true / false':
    'Line {line}: reasoning flag must be true or false',
  '至少填写一个模型 ID': 'Enter at least one model ID',
  '第 {line} 行请求头格式应为 Key: Value': 'Line {line}: header must be in Key: Value form',
  '第 {line} 行请求头名称不合法：{name}': 'Line {line}: invalid header name: {name}',
  '第 {line} 行请求头值不能包含换行': 'Line {line}: header value must not contain line breaks',
  '不允许自定义 {name} 请求头': 'Custom header {name} is not allowed',
  'models.json 解析失败，未写入：{error}': 'Failed to parse models.json; nothing was written: {error}',
  'models.json 已保存，但密钥写入失败：{error}':
    'models.json was saved, but writing the key failed: {error}',
  'models.json 解析失败，未删除：{error}': 'Failed to parse models.json; nothing was deleted: {error}',
  '自定义 provider {id} 不存在': 'Custom provider {id} does not exist',
  '自定义 provider 已删除，但 settings.json 解析失败，默认模型未清理。':
    'The custom provider was deleted, but settings.json could not be parsed; the default model was not cleaned up.',
  'auth.json 解析失败，未写入：{error}': 'Failed to parse auth.json; nothing was written: {error}',
  '该 provider 的密钥由命令读取，工作台不会执行命令；测试连接请临时填写 API Key。':
    'This provider reads its key from a command; the workbench will not run commands. Enter an API Key temporarily to test the connection.',
  '环境变量 {name} 未设置。': 'Environment variable {name} is not set.',
  '密钥被拒绝（401），请检查 API Key': 'Key rejected (401); check the API Key',
  '没有权限（403），请检查密钥权限或 IP 白名单':
    'Permission denied (403); check key permissions or the IP allowlist',
  '接口不存在（404），请检查 Base URL': 'Endpoint not found (404); check the Base URL',
  '请求被限流（429），稍后再试': 'Rate limited (429); try again later',
  '服务端错误（{status}）': 'Server error ({status})',
  '请求失败（HTTP {status}）': 'Request failed (HTTP {status})',
  '端点可达，但没有 /models 接口；请手动填写模型 ID。':
    'Endpoint reachable, but it has no /models endpoint; enter model IDs manually.',
  '端点可达，但返回的不是 JSON 模型列表；请手动填写模型 ID。':
    'Endpoint reachable, but it did not return a JSON model list; enter model IDs manually.',
  '端点可达，但响应里没有模型列表；请手动填写模型 ID。':
    'Endpoint reachable, but the response contains no model list; enter model IDs manually.',
  '连接超时（10 秒），请检查 Base URL、网络或代理':
    'Connection timed out (10s); check the Base URL, network or proxy',
  '域名解析失败，请检查 Base URL': 'DNS lookup failed; check the Base URL',
  '连接被拒绝，服务未启动或端口不对': 'Connection refused; the service is not running or the port is wrong',
  'TLS 证书校验失败，请检查中转站证书': 'TLS certificate verification failed; check the relay certificate',
  '连接失败：{error}': 'Connection failed: {error}',
  '缺少 provider 或模型': 'Provider or model is missing',
  'provider 或模型名称过长': 'Provider or model name is too long',
  '名称含控制字符': 'Name contains control characters',
  'settings.json 解析失败，未写入：{error}': 'Failed to parse settings.json; nothing was written: {error}',
  '未知错误': 'Unknown error',
  '未找到 npm；请先安装 Node.js': 'npm not found; install Node.js first',
  '未找到 npm；请先安装 Node.js（含 npm）': 'npm not found; install Node.js (with npm) first',
  'Pi 版本文件内容无效：{value}': 'Invalid Pi version file value: {value}',
  '创建快捷方式失败': 'Failed to create shortcut',
  'macOS 请从「应用程序」文件夹启动': 'On macOS, launch from the Applications folder',
  '未找到 Pi 安装；请点击「一键配置环境」或运行 npm install -g @earendil-works/pi-coding-agent':
    'Pi is not installed; use "Set up environment" or run npm install -g @earendil-works/pi-coding-agent',
};

let current: Locale = 'zh-CN';

export function normalizeLocale(value: unknown): Locale {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return raw.startsWith('zh') ? 'zh-CN' : 'en';
}

export function setBackendLocale(value: unknown): Locale {
  current = normalizeLocale(value);
  return current;
}

export function backendLocale(): Locale {
  return current;
}

export function t(source: string, vars?: Record<string, string | number>): string {
  const base = current === 'en' ? (EN[source] ?? source) : source;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}
