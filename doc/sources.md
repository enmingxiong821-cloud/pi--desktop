# 调研来源与复用登记

本表区分“已读取项目说明”“已阅读官方文档”“已局部审阅源码”“已核实完整许可”“已在运行时验证”。表格不将 README 宣称当作实测。

## A. 本机 Pi 1.3.0 一手资料

来源目录：`C:/Users/Caspian6610/.pi/agent/install/releases/1.3.0/node_modules/@earendil-works/pi-coding-agent/`。Pi launcher 实际 `--version` 返回 **1.3.0**。

| 本机文件 | 用途及已核实事实 |
|---|---|
| `docs/skills.md` | Skills 的发现目录、名称/描述启动加载、按需读取 `SKILL.md`、`/skill:name` 显式调用、模型可能漏选 |
| `docs/mcp.md` | 用户/项目 MCP 配置、服务器启动与工具暴露策略 |
| `docs/extensions.md` | Extension API、命令、技能/扩展加载与安全限制 |
| `docs/rpc-extension-ui.md` | RPC 的 select/confirm/input/editor 请求响应；TUI-only 方法限制 |
| `docs/rpc-commands.md` | `get_commands`、`get_available_models`、`set_model` 和 prompt/steer 生命周期 |
| `docs/models.md` | `/model`、`Ctrl+P`、`/scoped-models`、兼容端点、凭据优先级、配置合并/覆盖 |
| `docs/custom-provider.md` | `registerProvider()`、认证、模型目录与 custom streaming 扩展 |
| `docs/security.md` | 项目 trust 保护范围、trust 不等于 sandbox、文件/扩展/子进程权限边界 |
| `dist/core/extensions/types.d.ts` | `getAllTools`/`setActiveTools`/`setModel`/`registerProvider`/`registerMcpServer` 等 1.3.0 API 签名 |
| `dist/core/model-registry.d.ts` | model registry available/provider/model API |

关键准确结论：Skills 的完整文件按任务才载入；项目 MCP 要经 Pi 项目信任；Pi 1.3.0 会话开始连接启用 MCP；`deferred`/`codemode` 控制模型可见工具，不是服务器惰性启动；扩展 `registerMcpServer()` 注册后连接，后续注册会立即连接。

尚未验证：运行时实际列出技能/工具、自动匹配结果、Pi 扩展桥、API 凭据、模型切换和 MCP 进程启动顺序。

## B. Pi 官方在线依据

| 主题 | 官方链接 |
|---|---|
| Pi 项目与源码 | [pi.dev](https://pi.dev) · [GitHub](https://github.com/earendil-works/pi) |
| 开源许可 | [Pi LICENSE](https://github.com/earendil-works/pi/blob/main/LICENSE)，已读取正文；MIT，署名 Mario Zechner (c) 2025；发行仍需附声明 |
| RPC | [rpc.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) · [rpc-commands.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc-commands.md) |
| TUI 与 CLI 集成 | [cli-integration.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli-integration.md) |
| RPC 扩展 UI | [rpc-extension-ui.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc-extension-ui.md) |
| Skills | [skills.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) |
| MCP | [mcp.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md) · [MCP 架构规范](https://modelcontextprotocol.io/specification/2025-11-25/architecture) |
| 扩展和安全 | [extensions.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) · [security.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md) |
| 模型配置 | [models.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/models.md) · [providers.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md) · [custom-provider.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/custom-provider.md) |
| 终端缓冲 | [xterm.js 流量控制](https://xtermjs.org/docs/guides/flowcontrol/) |

GitHub `main` 源码曾记录提交锚点 `4dd2b149d155d7369de16ea4dc77c84e9f5ffb24`。在线 `main` 会变动；本设计的版本事实以本机 1.3.0 随包资料为主。

## C. 候选客户端资料

| 项目 | 来源 | 审阅范围与许可状态 |
|---|---|---|
| [zth0828/pi-desktop](https://github.com/zth0828/pi-desktop) | 用户给出的仓库 | 读 README 和 LICENSE 正文；限制为非商业/个人研究类用途，不作为自由商用代码底座 |
| [vastsa/PI-Desktop](https://github.com/vastsa/PI-Desktop) | 用户给出的仓库 | 读 README 和若干架构文档；README 标 LGPL-3.0，分发前完整审查 |
| [minghinmatthewlam/pi-gui](https://github.com/minghinmatthewlam/pi-gui) | GitHub 搜索 | 局部读 README、会话 lease 与 unsupported host UI 源码；MIT 为项目声明，尚未依赖审计；外部 CLI 不遵循 lease |
| [abcwyc/pi-agent-desktop](https://github.com/abcwyc/pi-agent-desktop) | GitHub 搜索 | 读 README；代码声明 MIT，依赖另审 |
| [nornzach/oh-my-pi-gui](https://github.com/nornzach/oh-my-pi-gui) | GitHub 搜索 | 读 README；基于 Oh My Pi，代码声明 MIT；不是原版 Pi 同义物 |
| [MarshallEriksen-Neura/pi-agent-desktop](https://github.com/MarshallEriksen-Neura/pi-agent-desktop) | GitHub 搜索 | 读 README；声明 MIT；依赖原生 CLI |
| [bengilla/pi-plus-plus](https://github.com/bengilla/pi-plus-plus) | GitHub 搜索 | 读 README/仓库 license 元数据；声明 MIT；macOS 专项 |
| [justhil/pi-app](https://github.com/justhil/pi-app) | GitHub 搜索 | 读 README 与局部 UI bridge 源码；声明 MIT；终端 UI 方法有不支持部分 |
| [gustavonline/pi-desktop](https://github.com/gustavonline/pi-desktop) | GitHub 搜索 | 局部读 RPC bridge 源码；未完成许可证正文核查，不复用代码 |
| [FaqFirebase/pi-desktop](https://github.com/FaqFirebase/pi-desktop) | GitHub 搜索 | 读 README；声明 Apache-2.0、alpha；其权限描述不是 OS sandbox |
| [am-will/gooey-pi](https://github.com/am-will/gooey-pi) | GitHub 搜索 | 读项目说明；未源码深审和许可审查 |
| [jmfederico/pi-web](https://github.com/jmfederico/pi-web) | GitHub 搜索 | 读 README 与部分 session daemon state ownership 源码；声明 MIT；主机关机仍非 durable 运行 |
| [ygncode/pi-web](https://github.com/ygncode/pi-web) | GitHub 搜索 | 读 README；声明 MIT、beta |
| [Pi Durable](https://earendil.com/posts/pi-durable/) | 官方文章 | 读取实验方向介绍；非首版基线 |

历史的 UI/竞品对照：[Claude Code Desktop](https://code.claude.com/docs/en/desktop)、[Codex App](https://developers.openai.com/codex/app/)、[TRAE](https://www.trae.ai/)、[Grok API](https://docs.x.ai/docs/overview)。这些资料未构成可嵌入其他 Agent 引擎的许可/技术契约。

## D. 许可证复用清单

- 当前仅完整读取 Pi 与 `zth0828/pi-desktop` 的 LICENSE 正文。
- 其他仓库的 README/元数据许可证结论是筛选信号，不是正式法律审计。
- 引入前须检查所用提交的 LICENSE、NOTICE、依赖锁文件、内嵌字体/图标/图片和生成内容；保存来源链接与确切 commit，保留署名文本。
- 不能以重新许可形式消除上游限制。PI Desktop 候选的行为/视觉借鉴不自动授予复制素材权。

## E. 已读局部源码的定位入口

以下链接便于定位相关机制，不代表建议直接复制；HEAD/main 可能变更，复用时应固定 commit 并重查授权。

| 源码 | 借鉴点及限制 |
|---|---|
| [官方 rpc-client.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-client.ts) | 请求/事件与进程生命周期；RPC 不是 TUI 的旁路控制接口 |
| [gustavonline bridge.ts](https://github.com/gustavonline/pi-desktop/blob/HEAD/src/rpc/bridge.ts) | 请求关联、generation 与退出清理；许可尚未审计 |
| [pi-gui session-lease.ts](https://github.com/minghinmatthewlam/pi-gui/blob/HEAD/packages/pi-sdk-driver/src/session-lease.ts) | 会话所有权与心跳；不能约束不遵守 lease 的原生 CLI |
| [pi-gui unsupported-host-ui.ts](https://github.com/minghinmatthewlam/pi-gui/blob/HEAD/packages/pi-sdk-driver/src/unsupported-host-ui.ts) | 明确提示不可用 TUI 能力，不静默替代 |
| [justhil desktop-ui-bridge.ts](https://github.com/justhil/pi-app/blob/HEAD/src/worker/desktop-ui-bridge.ts) | 交互请求 ID、超时、取消与已知协议适配 |
| [justhil 适配指南](https://github.com/justhil/pi-app/blob/HEAD/doc/adapter-authoring-guide.md) | 声明式交互适配，不代表任意 custom TUI 自动兼容 |
| [jmfederico sessiondStateOwnership.ts](https://github.com/jmfederico/pi-web/blob/HEAD/src/server/sessiond/sessiondStateOwnership.ts) | 后台状态所有权；独立 daemon 不等于断电后任务续跑 |

## F. 实现依赖文档入口（尚未锁版）

- [Electron 安全](https://www.electronjs.org/docs/latest/tutorial/security)、[原生模块](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)、[utility process](https://www.electronjs.org/docs/latest/api/utility-process)。
- [node-pty 上游](https://github.com/microsoft/node-pty)：Windows ConPTY 与进程接入。
- [xterm.js Terminal API](https://xtermjs.org/docs/api/terminal/classes/terminal/)、[流量控制](https://xtermjs.org/docs/guides/flowcontrol/)：终端渲染、输入、resize 和背压。
- [TypeScript 文档](https://www.typescriptlang.org/docs/handbook/intro.html)、[Playwright Python](https://playwright.dev/python/docs/library)：实现与浏览器测试参考。

历史 npm 查询不作为正式锁版。本资料整理未安装依赖；实施者应重新核准当前版本、Electron/Node ABI、原生模块构建条件及依赖许可证。

## G. 任务点级模型路由新增资料

本轮为需求设计查阅，未安装或运行以下方案，未核查其完整依赖许可；不直接引入实现。

| 来源 | 已读范围与可借鉴点 | 限制 |
|---|---|---|
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | GitHub README：强/弱模型路由、阈值校准、评测流程 | 原有模型对和问答数据不等于 Pi 项目工具任务；部分方法用远程 embedding，需计入隐私与成本 |
| [RouteLLM 作者文章](https://lmsys.org/blog/2024-07-01-routellm/) | 质量/费用曲线、训练分布与实际任务差异 | 历史基准数字不能移植为本项目收益承诺 |
| [LiteLLM 路由](https://docs.litellm.ai/docs/routing) | 部署负载、延迟/成本策略、会话粘性与故障恢复 | 部署负载均衡不等于按任务质量选模型；额外网关是新运行边界 |
| [LiteLLM Auto Router](https://docs.litellm.ai/docs/auto_router/) | 规则/分类器分层、上下文能力路由与会话固定的设计入口 | 文档产品/评测声明未经本项目复现；不得照搬模型清单或节省数字 |

Google 查询本轮仍返回脚本验证页，未提供可用搜索结果；以上依据来自直接读取 GitHub 和官方网页。详见 [任务路由设计](task-routing-design.md)。
