# Pi 工作台 · 技术 PoC

验证一个问题：**在 Electron 里，中文输入法能否可靠驱动真实 Pi TUI。**
终端是真实的 Pi 进程（node-pty + ConPTY），不是模拟输出；两侧面板是壳。

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

## 手动验证（PoC 的唯一验收项）

1. 点「选择项目目录」，选一个本地仓库。
2. 点「启动真实 Pi」，终端出现 Pi TUI。
3. 点击终端输入框，使用微软拼音/搜狗输入一段中文，包括：
   - 连续输入、候选词选择；
   - 退格修改未上屏的拼音；
   - 中英混合；
   - 粘贴多行中文（Ctrl+V）；
   - 终端随窗口缩放后再次输入。
4. 不按回车提交，直接截图或记录结果。

当前使用隔离配置目录，且关闭扩展/MCP/Skills、剥离供应商密钥、开启离线模式，
所以 **不会发起真实模型请求**，出现 `No models available` 属预期。

## 已验证

- Electron 44 + node-pty 1.1（ConPTY DLL）+ xterm.js 6 启动正常。
- Pi 1.3.0 真实 TUI 在窗口内完整渲染，随窗口 fit 到 89×31 并正确 resize。
- PTY 写入 UTF-8 中文后，Pi 输入框正确回显（`poc-pty.log`）。
- 背压：主进程 512KB/128KB 高低水位 + 渲染层 ack。
- 隔离配置与密钥剥离生效。
- `npm run smoke` 自动验证 PTY 链路；`poc-electron.png` 为窗口截图。

## 未验证

- Windows 中文 IME 的 composition 事件（必须人工操作，脚本无法模拟）。
- 原生目录选择框 → 启动 → 停止的完整手工流程。

已打包验证：asar + node-pty unpack 后原生模块可加载。

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

1. 左侧「环境」显示 Node / npm / Pi 检测结果；缺 Pi 时点「一键配置环境」（只安装 Pi，不改动既有配置）。
2. 点「选择项目目录」，或用参数启动：`"Pi 工作台.exe" --project D:\work\repo`。
3. 「创建桌面快捷方式」生成带 Pi 图标的快捷方式；再次双击同一快捷方式会复用当前窗口并切换项目。
4. 勾选「打开时自动启动 Pi」后，下次启动恢复上次项目并自动接入终端。

## 结构

```
project/
  backend/     Electron main、preload、Pi 定位与 PTY
  frontend/    xterm 终端 + 三栏壳
  scripts/     esbuild 构建、PTY 冒烟
```

## 下一步（待 PoC 结论）

1. IME 通过 → 接入真实 Pi 配置，做模型/中转站快切与 Skills/MCP 面板。
2. IME 不通过 → 改为“辅助输入板 + 终端只读镜像”，或评估 RPC 模式。
3. 无论哪种，都需要补：会话持久化、崩溃恢复、扩展事件桥。
