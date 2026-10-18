# Pi 工作台

Windows 桌面端 Pi 客户端：窗口里运行**真实 Pi TUI**（node-pty + ConPTY），左侧是功能导航，右侧是编辑、审查与人机交互工作区。

- 终端是真实 Pi 进程，不是模拟输出。
- 打开项目即用，支持多项目切换、会话恢复、附件与剪贴板图片。
- 全程不读取、不回显供应商密钥。

## 运行

```bash
cd project
npm install
npm run build
npm start
```

首次运行如果 Electron 二进制缺失（npm 新版会拦截 lifecycle script）：

```bash
node node_modules/electron/install.js
```

## 功能

左侧导航包含八个模块，设置在右上角齿轮浮层（`Ctrl+,`）：

| 模块 | 内容 |
| --- | --- |
| 项目 | 选择/切换项目目录、多项目会话树（可同时运行多个项目）、最近项目（标记路径失效）、从 VS Code / Cursor / TRAE / Windsurf / JetBrains 导入最近项目、Git 分支与变更、项目级 Skill/MCP；左栏「项目工具」集中权限、存档、长期记忆与托管；「项目配置」抽屉可设置当前项目的默认模型、推理度、启动方式与本机环境变量 |
| 模型 | 按厂商强弱分层排序，点击厂商展开模型；第三方 API / 中转站接入整合在同一面板；支持搜索与设为默认 |
| 自动化 | 定时任务（cron、间隔、每日、每周）与消息通道（Webhook、企业微信、飞书、Telegram），支持手动运行与执行记录 |
| 协作 | 检测 Claude、Codex、Grok、Gemini、Trae、WorkBuddy、TRAE Agent、Qwen、OpenCode、Goose、Cursor、Aider、Cline、Crush、Kiro、Continue、Droid、Crow、Crow5、Amp、OpenHands；**会议室**可拖入软件卡片与 Agent；主管可自动分配或手动指定；CLI 直接无头执行，桌面版打开应用并复制任务；支持常用 CLI 快速配置与自定义 Agent |
| 能力 | Skills、MCP、扩展与模型配置的只读巡检，按类别折叠与搜索，支持能力包一键启用 |
| 会话 | Pi 会话按日期分组、搜索与恢复 |
| 搜索 | 全网实时检索（DuckDuckGo 免配置 / SearXNG）；抓取支持自动（搜索结果作种子）与指定网页两种模式；本机文件/项目逆向分析接入 radare2 triage；抓取与逆向默认关闭，由用户开关 |
| 安全 | 代码审计（Semgrep / Trivy / gitleaks，支持 SARIF / JSON 导出）、授权渗透（被动基线 + 逐次授权后的 Nuclei 主动扫描）、带哈希链的审计日志 |

右上角齿轮集中市场与设置：Skills / MCP / 在线目录一站式安装；外观（深色/浅色/跟随系统、强调色预设与自定义、紧凑布局、启动动画及预览）、新项目默认值（权限预设、自动同意、默认模型与推理度、记忆 Skill）、环境探测、一键配置 Pi、桌面快捷方式、语言切换、打开 Pi 配置 / 项目 `.pi` / 数据目录与本机工具入口。

右侧工作区包含五个页签：编辑、审查、交互、协作日志、可视化。可视化页按视频、音频、设计、建模、引擎、开发、办公、浏览器、系统分类展示本机软件；未安装的内置软件可经用户确认后通过 winget 一键安装；「扫描全部软件」读取开始菜单快捷方式，扫描结果可收藏；另可导入任意本地 `.exe` 或添加常用网站（只保存名称与网址）。

其他：

- 同一项目内可直接打开 VS Code、资源管理器、浏览器或任意本地路径。
- 底栏可调「推理度」与「聪明程度」：推理度映射 Pi `--thinking`（off → max，越高越慢、消耗越多）；聪明程度按当前 provider 的模型选型（快速 / 均衡 / 最强），均支持「自动」。运行中修改推理度会在新会话生效，聪明程度通过 `/model` 立即切换。
- 顶栏齿轮或 `Ctrl+,` 打开设置；主题、强调色、紧凑布局与启动动画保存在本机 `localStorage`，不上传。
- 自定义 Agent 使用参数模板（`{prompt}` / `{cwd}`）接入本机 CLI；自定义软件选择本机可执行文件后归入对应分类。
- 中英文界面切换，界面文案与后端错误信息同时生效。
- 自动化任务只在应用运行时调度；关闭窗口后不会在后台常驻。

## 安全边界

- 工作台只读取本机 Pi 配置来判断模型与能力，**不读取密钥内容**；自定义接入写入 `models.json` + `auth.json` 前会自动备份。
- 配置优先级为本次启动显式选择 > 项目 `.pi/workbench.json` > 应用默认值；项目配置可随仓库共享且不含密钥，环境变量只写本机 `userData/project-env.json`。
- 消息通道的 Token 只写入本机配置文件，界面仅显示是否已配置；配置文件中使用 `${ENV}` 占位符时不会展开。
- 微信/QQ 仅支持官方机器人或企业微信类合规通道，不做个人号自动化。
- Agent 协作调用本机已安装的命令行工具，不代为安装、不代为登录；桌面版参与者只打开应用并复制任务，由用户手动执行。
- 联网搜索会把查询词发送给所选搜索服务（DuckDuckGo 或自建 SearXNG）；抓取只访问公开 http/https 网页，遵守 robots.txt、按主机限速，并限制大小与同站链接数量。
- 逆向分析只读取本机文件或项目结构，输出类型、哈希与可打印字符串，不破解、不绕过授权、不访问未授权系统。
- 自定义 Agent 只保存命令与参数模板，不保存密钥；自定义软件只记录本机可执行文件路径，不上传或复制程序。
- 一键配置 Pi 只在用户点击时执行，且不改动既有 Pi 配置。

## 手动验证

1. 点「选择项目目录」，选一个本地仓库。
2. 点「启动真实 Pi」，终端出现 Pi TUI。
3. 在终端输入中文，覆盖连续输入、候选词、退格、中英混合、多行粘贴与窗口缩放。
4. 在左侧切换模型、安装 Skill/MCP、创建自动化任务、运行 Agent 协作，确认右侧工作区同步变化。

Windows 中文 IME 的 composition 事件仍需人工操作验证，脚本无法完整模拟。

## 自动验证

```bash
npm run verify                              # 类型检查 + i18n 校验 + 构建
npx electron .smoke/i18n-smoke.mjs          # 中英文界面与指令注入
npx electron .smoke/workbench-smoke.mjs     # 项目配置/模型/市场/自动化/协作/会话/安全/工作区
```

两套冒烟均以 `"failures": []` 为通过。

## 打包与安装

```bash
npm run dist:win     # Windows：NSIS 安装包 + 免安装 portable
npm run dist:mac     # macOS：dmg + zip（x64 / arm64）
npm run dist:linux   # Linux：AppImage + deb
```

产物在 `release/`：

- `Pi-Workbench-<版本>-setup.exe`：安装版（可改安装目录、可选桌面快捷方式）
- `Pi-Workbench-<版本>-portable.exe`：免安装，双击即用
- macOS / Linux 对应 `dmg`、`zip`、`AppImage`、`deb`

多平台构建也可用 `.github/workflows/build.yml`，在 GitHub Actions 上产出三端安装包。

首次打开：

1. 右上角齿轮 →「设置」显示 Node / npm / Pi 检测结果；缺 Pi 时点「一键配置环境」（只安装 Pi，不改动既有配置）。
2. 点「选择项目目录」，或用参数启动：`"Pi 工作台.exe" --project D:\work\repo`。
3. 「创建桌面快捷方式」生成带 Pi 图标的快捷方式；再次双击同一快捷方式会复用当前窗口并切换项目。
4. 勾选「打开时自动启动 Pi」后，下次启动恢复上次项目并自动接入终端。

## 结构

```
project/
  backend/     Electron main、preload、Pi 定位与 PTY、模型巡检、市场、自动化、Agent 协作
  frontend/    xterm 终端 + 左导航 / 右工作区 + 各功能面板
  scripts/     esbuild 构建、PTY 冒烟
  .smoke/      Electron 界面冒烟与截图
```

## 已知限制

- Windows 中文 IME 的 composition 事件依赖真实输入法，自动化脚本无法覆盖。
- 自动化任务使用应用内调度器，应用退出后停止；跨重启的定时执行需要系统计划任务配合。
- Agent 协作依赖本机已安装并登录的命令行工具；只有桌面版的 Agent 不能自动执行，也不能任主管，运行时会打开应用并把任务复制到剪贴板。
