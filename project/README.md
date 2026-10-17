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

左侧导航包含九个模块：

| 模块 | 内容 |
| --- | --- |
| 项目 | 选择/切换项目目录、最近项目、Git 分支与变更、项目级 Skill/MCP |
| 模型 | 按厂商强弱分层排序，点击厂商展开模型；第三方 API / 中转站接入整合在同一面板；支持搜索与设为默认 |
| 市场 | Skills / MCP / 在线目录，支持搜索、一键安装到当前项目或用户目录；安装前展示启动命令与所需环境变量 |
| 自动化 | 定时任务（cron、间隔、每日、每周）与消息通道（Webhook、企业微信、飞书、Telegram），支持手动运行与执行记录 |
| 协作 | 检测本机 Claude、Codex、Grok、Gemini、Trae、Qwen、OpenCode、Goose、Cursor、Aider，按角色分工并汇总结果 |
| 能力 | Skills、MCP、扩展与模型配置的只读巡检 |
| 会话 | Pi 会话列表、恢复与清理 |
| 审计 | 本机操作与自动化执行记录 |
| 设置 | 环境探测、一键配置 Pi、桌面快捷方式、语言切换、本机工具入口 |

右侧工作区保留四个页签：编辑、审查、交互、协作日志。

其他：

- 同一项目内可直接打开 VS Code、资源管理器、浏览器或任意本地路径。
- 中英文界面切换，界面文案与后端错误信息同时生效。
- 自动化任务只在应用运行时调度；关闭窗口后不会在后台常驻。

## 安全边界

- 工作台只读取本机 Pi 配置来判断模型与能力，**不读取密钥内容**；自定义接入写入 `models.json` + `auth.json` 前会自动备份。
- 消息通道的 Token 只写入本机配置文件，界面仅显示是否已配置；配置文件中使用 `${ENV}` 占位符时不会展开。
- 微信/QQ 仅支持官方机器人或企业微信类合规通道，不做个人号自动化。
- Agent 协作调用本机已安装的命令行工具，不代为安装、不代为登录。
- 一键配置 Pi 只在用户点击时执行，且不改动既有 Pi 配置。

## 手动验证

1. 点「选择项目目录」，选一个本地仓库。
2. 点「启动真实 Pi」，终端出现 Pi TUI。
3. 在终端输入中文，覆盖连续输入、候选词、退格、中英混合、多行粘贴与窗口缩放。
4. 在左侧切换模型、安装 Skill/MCP、创建自动化任务、运行 Agent 协作，确认右侧工作区同步变化。

Windows 中文 IME 的 composition 事件仍需人工操作验证，脚本无法完整模拟。

## 自动验证

```bash
npm run build
npx tsc --noEmit -p tsconfig.json
npx electron .smoke/i18n-smoke.mjs          # 中英文界面与指令注入
npx electron .smoke/workbench-smoke.mjs     # 模型/市场/自动化/协作/工作区
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

1. 左侧「设置」显示 Node / npm / Pi 检测结果；缺 Pi 时点「一键配置环境」（只安装 Pi，不改动既有配置）。
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
- Agent 协作依赖本机已安装并登录的命令行工具，未安装时只显示安装提示。
