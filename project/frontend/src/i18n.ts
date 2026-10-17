export type Locale = 'zh-CN' | 'en';

const EN: Record<string, string> = {
  // window / header
  'Pi 工作台 · PoC': 'Pi Workbench · PoC',
  'Pi 工作台': 'Pi Workbench',
  '技术 PoC': 'Technical PoC',
  '模型 {model}': 'Model {model}',
  '模型 —': 'Model —',
  '界面语言': 'Interface language',
  '中文': '中文',
  'English': 'English',
  '检测中': 'Detecting',
  '辅助面板': 'Side panels',

  // sidebar
  '项目': 'Project',
  '环境': 'Environment',
  '选择项目目录': 'Choose project folder',
  '尚未选择': 'Not selected',
  '新会话': 'New session',
  '停止 Pi': 'Stop Pi',
  '配置目录': 'Config folder',
  '启动后显示': 'Shown after start',
  '隔离模式': 'Isolated mode',
  '隔离模式：独立配置，关闭扩展/MCP/Skills，剥离供应商密钥并离线，不会发起真实模型请求。':
    'Isolated mode: separate config, extensions/MCP/Skills disabled, provider keys stripped and offline; no real model requests.',
  '真实配置：使用本机 Pi 配置与授权，扩展/MCP/Skills 全部加载；对话可能联网并产生费用。':
    'Real config: uses the local Pi configuration and credentials, with all extensions/MCP/Skills loaded; conversations may go online and incur costs.',
  '还没有最近项目。': 'No recent projects yet.',

  // terminal head / composer
  '原生 Pi TUI · PTY': 'Native Pi TUI · PTY',
  '附件': 'Attach',
  '指令': 'Commands',
  '搜索': 'Search',
  '缩小字号': 'Decrease font size',
  '放大字号': 'Increase font size',
  '添加图片或视频附件': 'Add image or video attachments',
  '打开 Pi 指令面板': 'Open Pi command palette',
  '搜索终端输出': 'Search terminal output',
  '上一个': 'Previous',
  '下一个': 'Next',
  '关闭': 'Close',
  '打开模型面板': 'Open model panel',
  '忽略': 'Dismiss',
  '选择一个项目，然后点击「新会话」': 'Choose a project, then click “New session”',
  '↓ 回到底部': '↓ Back to bottom',
  '输入消息，Enter 发送，Shift+Enter 换行；可粘贴图片或拖入图片/视频':
    'Type a message. Enter to send, Shift+Enter for a new line. Paste or drop images/videos.',
  '选择图片或视频': 'Choose images or videos',
  'Pi 指令面板 (Ctrl+K)': 'Pi command palette (Ctrl+K)',
  'Enter 发送 · Shift+Enter 换行 · Ctrl+K 指令 · 点击终端可直接键盘交互':
    'Enter to send · Shift+Enter newline · Ctrl+K commands · Click the terminal for direct keyboard input',
  '向 Pi 发送 Esc，中断当前生成': 'Send Esc to Pi to interrupt the current generation',
  '中断': 'Interrupt',
  '发送': 'Send',
  '移除附件': 'Remove attachment',
  '移除 {name}': 'Remove {name}',
  '点击预览': 'Click to preview',
  '未绑定项目': 'No project bound',
  'Ctrl+F 搜索 · Ctrl+C 复制选区 · 右键复制/粘贴 · Ctrl+V 粘贴':
    'Ctrl+F search · Ctrl+C copy selection · Right-click copy/paste · Ctrl+V paste',

  // panel tabs
  '模型': 'Models',
  '能力': 'Capabilities',
  '接入': 'Providers',
  '会话': 'Sessions',
  '审计': 'Audit',

  // model pane
  '搜索 provider / 模型': 'Search provider / model',
  '重新读取 Pi 配置': 'Reload Pi configuration',
  '刷新': 'Refresh',
  '读取本机 Pi 配置…': 'Reading local Pi configuration…',
  '读取模型配置失败': 'Failed to read model configuration',
  '按 provider 筛选': 'Filter by provider',
  '全部 provider（{count}）': 'All providers ({count})',
  '全部 provider': 'All providers',
  '选择模型后生成命令': 'Select a model to generate a command',
  '复制': 'Copy',
  '设为默认': 'Set as default',
  '写入 settings.json，新 Pi 会话生效': 'Write to settings.json; applies to new Pi sessions',
  '只读扫描 <code>settings.json</code> / <code>models.json</code> / <code>models-store.json</code>；密钥不读取、不显示。选择只生成 <code>/model</code> 命令；「发送」会写入终端并回车。':
    'Read-only scan of <code>settings.json</code> / <code>models.json</code> / <code>models-store.json</code>; keys are never read or shown. Selecting only generates a <code>/model</code> command; Send writes it to the terminal with Enter.',
  '已暂存命令，未写入终端': 'Command staged; nothing was written to the terminal',
  '暂存 {command}': 'Staged {command}',
  '{count} 个模型 · 默认 {provider}/{model}': '{count} models · default {provider}/{model}',
  '{count} 个模型': '{count} models',
  '默认 {provider}/{model}': 'Default {provider}/{model}',
  '{count} 个中转站': '{count} relays',
  '思考': 'Reasoning',
  '中转': 'Relay',
  '默认': 'Default',
  '密钥无效': 'Invalid key',
  '没有匹配的模型。': 'No matching models.',
  '未读取到模型配置。': 'No model configuration found.',
  '模型模块': 'Model modules',
  '新建模块': 'New module',
  '模块名称，例如 快速修复': 'Module name, e.g. Quick fix',
  '模块使用的模型': 'Model used by the module',
  '选择模型': 'Choose a model',
  '应用': 'Apply',
  '本项目模型': 'Model for this project',
  'Pi 默认': 'Pi default',
  '填写模块名称': 'Enter a module name',
  '选择模块使用的模型': 'Choose a model for the module',
  '模块已保存': 'Module saved',
  '保存模块 {name}': 'Saved module {name}',
  '删除模块 {name}？': 'Delete module {name}?',
  '删除模块 {name}': 'Deleted module {name}',
  '模块已删除': 'Module deleted',
  '已切换模型 {model}': 'Switched to model {model}',
  '模块已暂存，启动 Pi 后发送': 'Module staged; send it after Pi starts',
  '应用模块 {name}': 'Applied module {name}',
  '已绑定 {name}；下次启动 Pi 生效': 'Bound {name}; applies when Pi starts next',
  '绑定项目模型 {name}': 'Bound project model {name}',
  '已解绑本项目模型；下次启动 Pi 生效': 'Unbound the project model; applies when Pi starts next',
  '解绑项目模型': 'Unbound the project model',
  '按项目使用模型 {model}': 'Using project model {model}',

  // capability pane
  '扩展 · Skills · MCP': 'Extensions · Skills · MCP',
  '刷新能力配置': 'Reload capabilities',
  '尚未选择项目': 'No project selected',
  '读取中…': 'Loading…',
  '读取失败': 'Failed to load',
  '未发现扩展、Skills 或 MCP 配置。': 'No extensions, Skills or MCP configuration found.',
  '未发现项目能力配置': 'No project capabilities found',
  'Pi 包': 'Pi package',
  '扩展': 'Extensions',
  'Skills': 'Skills',
  'MCP': 'MCP',
  '用户': 'User',
  '未发现用户扩展。': 'No user extensions found.',
  '未发现 Skills。': 'No Skills found.',
  '未发现 MCP 配置。': 'No MCP configuration found.',

  // provider pane
  '第三方 API · 中转站': 'Third-party APIs · Relays',
  '读取接入配置…': 'Reading provider configuration…',
  '读取接入配置失败': 'Failed to read provider configuration',
  '新增自定义接入': 'Add custom provider',
  '配置内置 provider 密钥': 'Configure built-in provider key',
  'Provider ID': 'Provider ID',
  '显示名（可选）': 'Display name (optional)',
  'Base URL': 'Base URL',
  'API 类型': 'API type',
  '额外请求头（可选，每行 Key: Value）': 'Extra headers (optional, one Key: Value per line)',
  '替换额外请求头': 'Replace extra headers',
  '替换额外请求头（现有 {names}）': 'Replace extra headers (current: {names})',
  '模型（每行一个：id | 显示名 | 上下文 | 是否思考）':
    'Models (one per line: id | display name | context | reasoning)',
  'openai-completions（OpenAI 兼容）': 'openai-completions (OpenAI compatible)',
  'anthropic-messages（Claude 兼容）': 'anthropic-messages (Claude compatible)',
  '从端点拉取模型': 'Fetch models from endpoint',
  '保存': 'Save',
  '取消': 'Cancel',
  '清除密钥': 'Clear key',
  '删除': 'Delete',
  '留空则保留现有密钥': 'Leave blank to keep the existing key',
  '自定义接入写入本机真实 Pi 配置（<code>models.json</code> + <code>auth.json</code>，与隔离模式无关，与 <code>/login</code> 同一份凭据），保存前自动备份。新增 provider 需新开 Pi 会话后生效。':
    'Custom providers are written to the real local Pi config (<code>models.json</code> + <code>auth.json</code>; independent of Isolated mode and the same credentials as <code>/login</code>). A backup is made before saving. New providers take effect in a new Pi session.',
  '{count} 个自定义 · {keyed} 个已配置密钥': '{count} custom · {keyed} keyed',
  '还没有接入配置。点击「新增自定义接入」填写中转站地址与模型。':
    'No providers configured yet. Click “Add custom provider” to enter a relay URL and models.',
  '自定义': 'Custom',
  '内置': 'Built-in',
  '密钥已配置': 'Key configured',
  'models.json 密钥': 'models.json key',
  '环境变量': 'Environment variable',
  '命令读取': 'Command',
  '编辑': 'Edit',
  '测试': 'Test',
  '换密钥': 'Change key',
  '设置密钥': 'Set key',
  '写入 auth.json；留空则暂不设置': 'Written to auth.json; leave blank to skip for now',
  '保存后写入 models.json 与 auth.json；新增 provider 需新开 Pi 会话后生效。':
    'Saves to models.json and auth.json. New providers take effect in a new Pi session.',
  '留空 API Key 会保留现有密钥。修改后需新开 Pi 会话生效。':
    'Leave API Key blank to keep the existing key. Changes take effect in a new Pi session.',
  '例如 sk-...；写入 auth.json': 'e.g. sk-...; written to auth.json',
  '例如 my-relay': 'e.g. my-relay',
  '例如 我的中转站': 'e.g. My relay',
  '已有 OAuth 凭据；留空保留，填写则覆盖。': 'OAuth credentials exist; leave blank to keep, or enter a new key to replace.',
  '已有 凭据；留空保留，填写则覆盖。': 'Credentials exist; leave blank to keep, or enter a new key to replace.',
  '填写 Pi 内置 provider 的 ID 与 API Key；新开 Pi 会话后生效。例如 openrouter、deepseek。':
    'Enter the built-in Pi provider ID and API Key; takes effect in a new Pi session. e.g. openrouter, deepseek.',
  '先填写 Base URL': 'Enter the Base URL first',
  '正在请求 /models…': 'Requesting /models…',
  '拉取失败': 'Fetch failed',
  '已获取 {count} 个模型{latency}；可手动增删后再保存。':
    'Fetched {count} models{latency}; edit them before saving if needed.',
  '已拉取 {count} 个模型': 'Fetched {count} models',
  '拉取 {url} 模型 {count} 个': 'Fetched {count} models from {url}',
  '端点可达，但没有返回模型列表。': 'Endpoint reachable, but it returned no model list.',
  '填写 Provider ID': 'Enter the Provider ID',
  '填写 API Key；如需删除已保存密钥，点「清除密钥」。':
    'Enter an API Key; to delete a saved key, click “Clear key”.',
  '正在写入 auth.json…': 'Writing auth.json…',
  '写入失败': 'Write failed',
  '已保存 {id} 的密钥；新 Pi 会话生效': 'Saved the key for {id}; applies to new Pi sessions',
  '配置 {id} 密钥': 'Configured key for {id}',
  '填写 Base URL': 'Enter the Base URL',
  '至少填写一个模型 ID': 'Enter at least one model ID',
  '正在写入 models.json…': 'Writing models.json…',
  '保存失败': 'Save failed',
  '已保存 {id}；新 Pi 会话生效': 'Saved {id}; applies to new Pi sessions',
  '保存接入 {id}': 'Saved provider {id}',
  '删除自定义 provider {id}？auth.json 中的密钥会保留。':
    'Delete custom provider {id}? The key in auth.json will be kept.',
  '删除失败': 'Delete failed',
  '已删除 {id}': 'Deleted {id}',
  '删除接入 {id}': 'Deleted provider {id}',
  '清除 {id} 的已保存密钥？': 'Clear the saved key for {id}?',
  '清除失败': 'Clear failed',
  '已清除 {id} 的密钥': 'Cleared the key for {id}',
  '清除 {id} 密钥': 'Cleared the key for {id}',
  '连接失败': 'Connection failed',
  '测试 {id} 失败：{error}': 'Test of {id} failed: {error}',
  '正在测试 {id}…': 'Testing {id}…',
  '连接成功：{count} 个模型{latency}': 'Connected: {count} models{latency}',
  '端点可达': 'Endpoint reachable',
  '测试 {id}：{result}': 'Tested {id}: {result}',
  '未知错误': 'Unknown error',
  '设置默认模型失败': 'Failed to set the default model',
  '已设为默认模型；新 Pi 会话生效': 'Set as the default model; applies to new Pi sessions',
  '默认模型 {provider}/{model}': 'Default model {provider}/{model}',
  '已复制 /model 命令': 'Copied the /model command',
  '复制模型切换命令': 'Copied the model switch command',
  '写入剪贴板失败': 'Failed to write to the clipboard',
  '先启动 Pi': 'Start Pi first',
  '已发送到终端': 'Sent to the terminal',
  '终端执行 {command}': 'Ran in terminal: {command}',

  // session pane
  'Pi 原生会话': 'Native Pi sessions',
  '读取会话失败': 'Failed to read sessions',
  '该项目还没有 Pi 会话。启动新会话后会出现在这里。':
    'No Pi sessions for this project yet. Start a new session and it will appear here.',
  '恢复': 'Resume',
  '先停止当前 Pi 再恢复会话': 'Stop the current Pi before resuming a session',
  '{count} 个会话 · 点击恢复': '{count} sessions · click to resume',
  '未知时间': 'Unknown time',
  '点击会话会在停止当前 Pi 后以 <code>--session</code> 恢复；会话文件不会被修改，除非继续对话。':
    'Clicking a session stops the current Pi and resumes it with <code>--session</code>; the session file is not modified unless you continue the conversation.',

  // audit
  '本地操作记录': 'Local activity log',
  '选择项目 {cwd}': 'Selected project {cwd}',
  '启动失败：{error}': 'Start failed: {error}',
  '启动失败，检查侧栏配置后重试': 'Start failed; check the sidebar configuration and retry',
  '未找到 Pi 安装': 'Pi installation not found',
  '环境异常：{error}': 'Environment error: {error}',
  '环境异常': 'Environment error',
  '发现 Pi {version}': 'Found Pi {version}',
  'Pi 未找到': 'Pi not found',
  'IME 组合开始': 'IME composition started',
  'IME 组合中 · {count} 字': 'IME composing · {count} chars',
  'IME 上屏 · {count} 字': 'IME committed · {count} chars',
  '切换为隔离模式': 'Switched to isolated mode',
  '切换为真实配置模式': 'Switched to real configuration mode',
  '未知': 'unknown',

  // process state / hints
  '未启动': 'Not started',
  '启动中': 'Starting',
  '运行中': 'Running',
  '已停止': 'Stopped',
  '启动失败': 'Start failed',
  '已退出 {code}': 'Exited {code}',
  '点击「新会话」启动 Pi': 'Click “New session” to start Pi',
  '正在启动 Pi…': 'Starting Pi…',
  '会话已结束 · 点击「新会话」或从会话面板恢复':
    'Session ended · click “New session” or resume from the Sessions panel',
  'Pi 已停止 · 点击「新会话」重新开始': 'Pi stopped · click “New session” to start again',
  'Pi 退出，代码 {code}': 'Pi exited with code {code}',
  '已停止 Pi': 'Stopped Pi',
  '恢复 Pi 会话': 'Resumed Pi session',
  '启动 Pi {version}': 'Started Pi {version}',

  // diagnosis
  '当前模型': 'the current model',
  '{model} 的凭据被拒绝（401）。在右侧模型面板换一个 provider，或在 Pi 里执行 /login 重新登录。':
    '{model} credentials were rejected (401). Switch providers in the model panel, or run /login in Pi.',
  '{model} 额度不足。换用其他 provider 或检查账户余额。':
    '{model} is out of quota. Switch providers or check the account balance.',
  '{model} 被限流（429）。稍后重试，或切换到其他模型。':
    '{model} is rate limited (429). Retry later or switch to another model.',
  '提供方找不到模型 {model}，可能已下线。请在模型面板换一个。':
    'The provider cannot find model {model}; it may be retired. Choose another in the model panel.',
  '上下文超出模型上限。用 /compact 压缩，或新建会话。':
    'Context exceeds the model limit. Use /compact or start a new session.',
  '连接模型服务失败。检查网络、代理或中转站地址后重试。':
    'Could not reach the model service. Check the network, proxy or relay URL and retry.',

  // composer / media
  '先选择项目目录': 'Choose a project folder first',
  'Pi 已在运行': 'Pi is already running',
  '先启动 Pi 会话': 'Start a Pi session first',
  '已发送中断': 'Interrupt sent',
  '中断当前生成': 'Interrupted the current generation',
  '读取剪贴板失败': 'Failed to read the clipboard',
  '没有选中文本': 'No text selected',
  '已复制终端选区': 'Copied the terminal selection',
  '最多同时附加 8 个文件': 'You can attach up to 8 files',
  '附加 {count} 个媒体文件': 'Attached {count} media files',
  '选择文件失败': 'Failed to choose files',
  '已附加剪贴板图片': 'Attached the clipboard image',
  '已发送（含 {count} 个附件）': 'Sent (with {count} attachments)',
  '已发送': 'Sent',
  '发送消息 · {count} 字{attachments}': 'Sent message · {count} chars{attachments}',
  ' · {count} 个附件': ' · {count} attachments',
  '内置播放器无法播放该视频，可用系统播放器打开':
    'The built-in player cannot play this video; open it in the system player',
  '预览 图片 {name}': 'Previewed image {name}',
  '预览 视频 {name}': 'Previewed video {name}',
  '无法打开文件': 'Cannot open the file',
  '无法打开链接：{uri}': 'Cannot open link: {uri}',
  '没有可用的文件': 'No usable files',
  '已插入 {count} 个路径': 'Inserted {count} paths',
  '已插入路径': 'Inserted paths',
  '执行指令 {command}': 'Ran command {command}',
  '没有匹配的指令': 'No matching commands',

  // command palette
  'Pi 指令面板': 'Pi command palette',
  '搜索 Pi 指令，例如 压缩、模型、恢复': 'Search Pi commands, e.g. compact, model, resume',
  '直接执行的指令会写入终端并回车；需要补充参数的会先填入输入框。':
    'Commands that run directly are written to the terminal with Enter; ones that need arguments are placed in the composer.',
  '选择模型（打开选择器）': 'Choose a model (opens the picker)',
  '新建会话': 'Start a new session',
  '压缩上下文': 'Compact context',
  '恢复其他会话': 'Resume another session',
  '设置思考等级': 'Set reasoning level',
  '管理 Ctrl+P 循环的模型': 'Manage models cycled with Ctrl+P',
  '浏览会话树 / 切换分支': 'Browse the session tree / switch branches',
  '从历史消息分叉': 'Fork from a historical message',
  '克隆当前会话': 'Clone the current session',
  '查看会话信息与统计': 'Show session info and statistics',
  '设置会话名称': 'Name the session',
  '复制上一条回复': 'Copy the last reply',
  '导出会话（HTML / JSONL）': 'Export the session (HTML / JSONL)',
  '导入并恢复 JSONL 会话': 'Import and resume a JSONL session',
  '分享会话': 'Share the session',
  '配置 provider 登录': 'Configure provider login',
  '移除 provider 登录': 'Remove provider login',
  '保存项目信任决定': 'Save the project trust decision',
  '重新加载扩展 / 技能 / 配置': 'Reload extensions / skills / config',
  '打开设置菜单': 'Open the settings menu',
  '查看全部快捷键': 'Show all shortcuts',
  '查看更新日志': 'Show the changelog',
  '反馈问题': 'Report a problem',
  '退出 Pi': 'Quit Pi',

  // media preview
  '媒体预览': 'Media preview',
  '用系统播放器打开': 'Open in system player',
  '滚轮缩放图片 · 拖动平移 · Esc 关闭': 'Scroll to zoom · drag to pan · Esc to close',
  '图片': 'image',
  '视频': 'video',
  '点击终端可直接键盘交互': 'Click the terminal for direct keyboard input',

  // misc
  '缺少元素 #{id}': 'Missing element #{id}',

  // modules / capabilities
  '启动时自动使用': 'Use automatically on start',
  '启动 Pi 时自动使用 {name}': 'Use {name} automatically when Pi starts',
  '已关闭 {name} 的自动使用': 'Auto-use disabled for {name}',
  '启用模块自动使用 {name}': 'Enabled auto-use for {name}',
  '关闭模块自动使用 {name}': 'Disabled auto-use for {name}',
  '自动': 'Auto',
  '自定义 provider/model…': 'Custom provider/model…',
  '填写或选择模块使用的模型': 'Enter or choose the model for this module',
  '模型格式应为 provider/model': 'Model must be in provider/model form',
  'MCP 服务器已添加': 'MCP server added',
  'Skill 已添加': 'Skill added',
  '保存中…': 'Saving…',
  '项目目录不存在': 'Project folder does not exist',
  '填写名称': 'Enter a name',
  '类型': 'Type',
  '作用域': 'Scope',
  '名称，例如 code-review': 'Name, e.g. code-review',
  '描述（Skill）': 'Description (Skill)',
  'Skill 内容（Markdown）': 'Skill content (Markdown)',
  '启动命令（MCP），例如 npx': 'Launch command (MCP), e.g. npx',
  '参数，每行一个': 'Arguments, one per line',
  '环境变量，每行 KEY=VALUE': 'Environment variables, one KEY=VALUE per line',
  '添加': 'Add',
  '任务': 'Task',
  '任务状态': 'Task status',
  '打开项目目录': 'Open project folder',
  '在 VS Code 打开': 'Open in VS Code',
  '变更文件': 'Changed files',
  '任务清单': 'Task list',
  '添加任务…': 'Add a task…',
  '打开目录': 'Open folder',
  'VS Code': 'VS Code',
  '添加任意文件附件': 'Attach any file',
  '选择任意文件': 'Choose any file',
  '输入消息，Enter 发送，Shift+Enter 换行；可粘贴图片或拖入任意文件':
    'Type a message. Enter to send, Shift+Enter for a new line; paste images or drop any file',
  'provider/model，例如 openai/gpt-5.5': 'provider/model, e.g. openai/gpt-5.5',
  '状态': 'Status',
  '运行时长': 'Elapsed',
  '最近输出': 'Last output',
  '{seconds} 秒前': '{seconds}s ago',
  '用系统程序打开': 'Open with system app',
  '读取 Git 状态失败': 'Failed to read Git status',
  '当前项目不是 Git 仓库': 'This project is not a Git repository',
  '未知分支': 'unknown branch',
  '工作区干净': 'Working tree clean',
  '还有 {count} 个文件未显示': '{count} more files not shown',
  '还没有任务，添加一条开始跟踪。': 'No tasks yet. Add one to start tracking.',
  '删除任务': 'Delete task',
  '添加任务 {text}': 'Add task {text}',
  '打开失败': 'Failed to open',
  '识别意图：{label}': 'Recognized intent: {label}',
  '恢复会话': 'Resume session',
  '重新加载配置': 'Reload configuration',
  '查看快捷键': 'View shortcuts',
  '查看会话信息': 'Session info',
  '导出会话': 'Export session',
  '切换模型': 'Switch model',
  '模型面板': 'Model panel',
  '能力面板': 'Capabilities panel',
  '会话面板': 'Sessions panel',
  '任务面板': 'Task panel',
  '接入面板': 'Providers panel',
  '刷新模型': 'Refresh models',
  '刷新能力': 'Refresh capabilities',
  '刷新会话': 'Refresh sessions',
  '刷新任务状态': 'Refresh task status',
  '中断生成': 'Stop generation',
  '已发送中断信号': 'Interrupt signal sent',
  '已打开{label}': 'Opened {label}',
  '已{label}': '{label} done',
  '已识别为 {command} · {label}': 'Recognized as {command} · {label}',
  '自然语言执行 {command}': 'Natural-language command {command}',
  '自然语言待补参数 {command}': 'Natural-language command needs arguments: {command}',
  '自然语言中断生成': 'Natural-language stop',
  '附加 {count} 个文件': 'Attached {count} files',
  '文件': 'file',
  '未找到': 'Not found',
  '已安装': 'Installed',
  '未安装': 'Not installed',
  '受管安装': 'Managed install',
  'npm 全局安装': 'npm global install',
  '检测失败': 'Check failed',
  '配置中…': 'Configuring…',
  '重新检查环境': 'Recheck environment',
  '一键配置环境': 'Set up environment',
  '创建桌面快捷方式': 'Create desktop shortcut',
  '打开时自动启动 Pi': 'Start Pi automatically on launch',
  '环境检查通过': 'Environment check passed',
  '开始安装 Pi': 'Installing Pi',
  '已安装 Pi {version}': 'Installed Pi {version}',
  'Pi 已就绪 {version}': 'Pi ready: {version}',
  'Pi 安装失败：{error}': 'Pi install failed: {error}',
  '环境配置失败：{error}': 'Environment setup failed: {error}',
  '创建快捷方式失败：{error}': 'Shortcut creation failed: {error}',
  '已创建快捷方式：{path}': 'Shortcut created: {path}',
  '未找到 Node.js，已打开下载页；安装后再次点击一键配置': 'Node.js not found. The download page was opened; run setup again after installing.',
  '开启打开时自动启动': 'Automatic start on launch enabled',
  '关闭打开时自动启动': 'Automatic start on launch disabled',
  '创建快捷方式失败': 'Failed to create shortcut',
  'macOS 请从「应用程序」文件夹启动': 'On macOS, launch from the Applications folder',
};

let current: Locale = 'zh-CN';

export function normalizeLocale(value: unknown): Locale {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return raw.startsWith('zh') ? 'zh-CN' : 'en';
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(value: unknown): Locale {
  current = normalizeLocale(value);
  document.documentElement.lang = current === 'en' ? 'en' : 'zh-CN';
  return current;
}

export function initLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('pi-locale');
  } catch {
    // storage is optional
  }
  const preferred = stored ?? navigator.language ?? '';
  return setLocale(preferred);
}

export function t(source: string, vars?: Record<string, string | number>): string {
  const base = current === 'en' ? (EN[source] ?? source) : source;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

export function applyStaticI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n ?? '');
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    element.innerHTML = t(element.dataset.i18nHtml ?? '');
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder ?? ''));
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    element.setAttribute('title', t(element.dataset.i18nTitle ?? ''));
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel ?? ''));
  });
}
