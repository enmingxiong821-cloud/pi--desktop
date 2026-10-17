export type Locale = 'zh-CN' | 'en';

const EN: Record<string, string> = {
  // main.ts
  '缺少项目目录': 'Project directory is required',
  '模型标识无效': 'Invalid model identifier',
  '推理度无效': 'Invalid reasoning level',
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
  '创建快捷方式失败': 'Failed to create shortcut',
  'macOS 请从「应用程序」文件夹启动': 'On macOS, launch from the Applications folder',
  '未找到 Pi 安装；请点击「一键配置环境」或运行 npm install -g @earendil-works/pi-coding-agent':
    'Pi is not installed; use "Set up environment" or run npm install -g @earendil-works/pi-coding-agent',
  // automation / agents / local tools
  '命令执行超时，已终止': 'Command timed out and was terminated',
  '命令已完成（无输出）': 'Command finished (no output)',
  '只支持 http / https 链接': 'Only http / https links are supported',
  '未设置项目目录': 'No project directory set',
  'Pi 启动失败': 'Failed to start Pi',
  'Pi 未运行': 'Pi is not running',
  '已发送到 Pi 终端': 'Sent to the Pi terminal',
  '未知动作': 'Unknown action',
  '参数无效': 'Invalid parameters',
  '未知应用': 'Unknown app',
  '该平台暂未内置此应用，请用「打开路径」': 'This app is not built in on this platform; use "Open path"',
  '任务配置无效': 'Invalid job configuration',
  '填写任务名称': 'Enter a job name',
  '任务名称过长': 'Job name is too long',
  '选择执行周期': 'Choose a schedule',
  '间隔需在 1 分钟到 7 天之间': 'Interval must be between 1 minute and 7 days',
  '时间格式应为 HH:MM': 'Time must be HH:MM',
  '至少选择一天': 'Select at least one day',
  'cron 表达式无效（5 段：分 时 日 月 周）': 'Invalid cron expression (5 fields: min hour day month weekday)',
  '填写提示词': 'Enter a prompt',
  '提示词过长': 'Prompt is too long',
  '填写命令': 'Enter a command',
  '命令过长': 'Command is too long',
  '链接过长': 'URL is too long',
  '填写路径': 'Enter a path',
  '填写通知标题': 'Enter a notification title',
  '选择 Agent': 'Select an agent',
  '选择动作类型': 'Select an action type',
  '任务数量已达上限': 'Job limit reached',
  '任务不存在': 'Job not found',
  '通道配置无效': 'Invalid channel configuration',
  '填写通道名称': 'Enter a channel name',
  '选择通道类型': 'Select a channel type',
  '填写 Telegram Bot Token': 'Enter a Telegram bot token',
  'Webhook 需为 http / https 地址': 'Webhook must be an http / https URL',
  '地址过长': 'URL is too long',
  '通道数量已达上限': 'Channel limit reached',
  '通道不存在': 'Channel not found',
  'Pi 工作台测试消息': 'Pi Workbench test message',
  '任务正在执行': 'Job is already running',
  '执行器未就绪': 'Executor is not ready',
  '执行成功': 'Finished successfully',
  '执行失败': 'Execution failed',
  '消息已发送': 'Message sent',
  '发送失败（HTTP {status}）': 'Send failed (HTTP {status})',
  '提示词为空': 'Prompt is empty',
  '未知 Agent': 'Unknown agent',
  '未检测到 {name}，请先安装': '{name} not found; install it first',
  '{name} 仅支持桌面应用，无法自动执行': '{name} is a desktop app only and cannot run automatically',
  '未检测到 {name} 桌面版': '{name} desktop app not found',
  '已打开 {name}，任务已复制到剪贴板，请在应用中粘贴执行。':
    'Opened {name}; the task is on the clipboard — paste it in the app to run.',
  '主管必须支持命令行执行，请先安装该 Agent 的 CLI':
    'The supervisor must support command-line runs; install its CLI first',
  '没有可自动执行的主管；请安装 CLI 或选择其他 Agent':
    'No supervisor can run automatically; install a CLI or pick another agent',
  '暂无可自动执行的主管': 'No supervisor can run automatically',
  '未检测到已安装的 Agent': 'No installed agent detected',
  '同时运行的任务过多，请稍后再试': 'Too many tasks running; try again later',
  '该 Agent 暂不支持命令行调用': 'This agent does not support command-line runs',
  '执行超时，已终止': 'Execution timed out and was terminated',
  '进程退出码 {code}': 'Process exit code {code}',
  '填写协作任务': 'Enter a team task',
  '未检测到任何可用 Agent': 'No available agent detected',
  '所选 Agent 不可用': 'The selected agent is unavailable',
  '自定义 Agent 存储尚未初始化': 'Custom agent storage is not ready',
  '自定义 Agent 数量已达上限（{count}）': 'Custom agent limit reached ({count})',
  '填写名称与可执行命令': 'Enter a name and executable command',
  '命令只填写可执行文件或路径，不要包含 shell 符号': 'Enter only an executable or path; shell symbols are not allowed',
  '运行参数至少需要一处 {prompt} 占位': 'Arguments need at least one {prompt} placeholder',
  '同名自定义 Agent 过多': 'Too many custom agents with the same name',
  '未找到自定义 Agent': 'Custom agent not found',
  '请填写应用名称': 'Enter an app name',
  '应用名称过长': 'App name is too long',
  '请选择应用分类': 'Choose an app category',
  '请选择可执行文件': 'Choose an executable',
  '可执行文件不存在': 'Executable not found',
  '请选择 .exe 可执行文件': 'Choose an .exe executable',
  '自定义应用已达上限（{n} 个）': 'Custom app limit reached ({n})',
  '该程序已在内置列表中': 'This program is already in the built-in list',
  '未找到该应用': 'App not found',
  '开始菜单扫描': 'Start menu scan',
  '该应用没有内置安装源': 'This app has no built-in install source',
  '未找到 winget，请先安装「应用安装程序」': 'winget not found; install App Installer first',
  '安装失败，退出码 {code}': 'Installation failed with exit code {code}',
  '安装超时，请稍后重试': 'Installation timed out; try again later',
  '程序不存在，请重新扫描': 'The program no longer exists; scan again',
  '未找到该网站': 'Website not found',
  '网站名称过长': 'Website name is too long',
  '自定义网站已达上限（{n} 个）': 'Custom website limit reached ({n})',
  '请填写网站名称': 'Enter a website name',
  '保存失败': 'Save failed',
  '可执行文件': 'Executable',
  '选择可执行文件': 'Choose an executable',
  '选择要分析的文件或目录': 'Choose a file or folder to analyze',
  '搜索服务返回 {status}': 'Search service returned {status}',
  '未命名结果': 'Untitled result',
  '联网搜索未开启': 'Web search is disabled',
  '填写搜索内容': 'Enter a search query',
  '没有找到相关结果': 'No matching results',
  '网页抓取未开启': 'Page crawling is disabled',
  '该链接不是网页正文': 'This link is not page content',
  'robots.txt 不允许抓取该路径': 'robots.txt disallows this path',
  '逆向分析未开启': 'Reverse analysis is disabled',
  '类型': 'Type',
  '目录': 'Folder',
  '路径': 'Path',
  '文件数': 'File count',
  '顶层目录': 'Top-level folders',
  '主要类型': 'Main file types',
  '项目清单': 'Project manifests',
  '无': 'None',
  '未发现': 'Not found',
  '大小': 'Size',
  '文件头': 'File header',
  '可打印字符串': 'Printable strings',
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
