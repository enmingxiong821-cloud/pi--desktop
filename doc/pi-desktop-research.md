# Pi 桌面工作台：调研记录与设计方向

状态：历史调研底稿，保留两轮候选与源码分析；不是当前产品规格。最新方向见 [设计蓝图](design-blueprint.md)、[决策记录](decisions.md) 与 [开发交接](development-handoff.md)。原生终端优先和 Electron 方向已选定，按项目自主调用 Skills/MCP 已纳入需求。下文的版本、发行包和功能描述均是当次查询记录，不是持续更新保证。

## 1. 目标与当前结论

让不方便使用终端的用户通过桌面应用使用 Pi，自主选择模型，并在任务中使用 Skills 和 MCP。先比较现有方案，再决定直接使用、插件扩展、二次开发或新建客户端。

初筛时尚未确定技术栈，因此当时建议先试用。后续用户已选择原生 Pi TUI＋图形辅助、Electron 方向，并要求按项目需要自主调用 Skills/MCP。具体实现与验收见主蓝图。未测候选客户端的性能，不对其好坏作实测结论。

## 2. 证据范围

- 已读取用户指定的两个仓库 README，以及补充候选的项目说明。
- 已读取 zth0828/pi-desktop 的 LICENSE 正文。
- 已查询 Pi 官网与 MCP 官方说明，以及部分同类产品官方页面。
- 功能表是项目文档声明，不代表本机实测成功；其他候选的许可仍需在复用前逐项核查正文与第三方组件。
- 未安装候选应用，未测启动时间、内存、模型连接、任务恢复、权限隔离和跨平台兼容性。
- 搜索存在覆盖限制：Google 脚本验证及增强搜索工具不可用。本记录不是全网穷尽清单。
- README 主分支与发行包可能不同。vastsa 本轮 README 声明 0.21.x Early Preview，而发行接口返回最新正式包 v0.20.1；试用时必须记录实际版本。

## 3. 候选初筛

| 项目 | 文档声明的特点 | 初步适用方向与限制 |
| --- | --- | --- |
| [zth0828/pi-desktop](https://github.com/zth0828/pi-desktop) | 原生 Pi 会话、模型配置、Skills、MCP 配置、逐 hunk 评审、会话树、多窗口 | 可试用并参考交互；依赖全局 Pi/Node；非商业许可，不作为可自由商用的开源底座 |
| [vastsa/PI-Desktop](https://github.com/vastsa/PI-Desktop) | Agent/Plan/Goal、子代理和 Worker Sessions、插件、MCP、权限层、模型配置 | 综合工作台优先试用候选；README 标注 LGPL-3.0，需审查复用义务及发行版功能 |
| [minghinmatthewlam/pi-gui](https://github.com/minghinmatthewlam/pi-gui) | Pi SDK 薄适配、并行线程、worktree、评审、终端、Skills、定时任务 | 开发者工作流和二次开发候选；README 标注 MIT；电脑控制是另接的 MCP 能力 |
| [abcwyc/pi-agent-desktop](https://github.com/abcwyc/pi-agent-desktop) | 打包 Node 与 Pi SDK、模型和技能管理、文件预览、会话恢复、定时任务 | 优先验证免额外运行时安装的体验；README 标注根目录代码 MIT，依赖仍遵守各自许可 |
| [nornzach/oh-my-pi-gui](https://github.com/nornzach/oh-my-pi-gui) | 内置 omp、Agent Hub、MCP、浏览器、终端、模型角色、语音 | 强交互参考候选；基于 Oh My Pi 分支，不能默认等同原版 Pi；README 标注 MIT |
| [MarshallEriksen-Neura/pi-agent-desktop](https://github.com/MarshallEriksen-Neura/pi-agent-desktop) | Tauri、RPC 驱动 Pi CLI、编辑器、终端、Git 审查 | 已有 Pi 环境的候选；需要另装 Pi CLI；README 标注 MIT |
| [bengilla/pi-plus-plus](https://github.com/bengilla/pi-plus-plus) | macOS 原生三栏工作台 | macOS 专项候选；仓库许可元数据为 MIT，未进行深入评测 |

## 4. 许可证与复用边界

zth0828 的许可证明确限制为个人、教育、研究及其他非商业用途，商业用途须事先获得书面授权，并明确不是 OSI 认可的开源许可证。不能复制其代码后直接以 MIT 重新许可。参考通用交互思路不等于获得源码、图标或视觉资源的复制授权。

vastsa 标注 LGPL-3.0；正式选择前核对许可证版本、修改与分发方式、第三方依赖及相应义务。对 MIT 候选也必须保留适用的版权和许可声明。

来源：[zth0828 LICENSE](https://github.com/zth0828/pi-desktop/blob/main/LICENSE)、[vastsa LICENSE](https://github.com/vastsa/PI-Desktop/blob/main/LICENSE)。前者已读取正文；后者仍需正式复用审查。

## 5. 第一轮设计假设（历史记录）

定位假设：以 Pi 为执行核心、本地优先、模型可选择、技能与工具按任务启用的桌面工作台。

核心交互链路：表达目标 → 补充必要信息 → 审查计划 → 授权执行 → 随时纠偏 → 检查成果。

以整理资料为例，用户拖入文件后，应用询问报告受众和输出形式，说明所需工具，显示执行步骤和产出，允许用户插话改变后续方向，最后预览报告与来源。不应要求普通用户先理解 Agent、Provider 或 MCP 的术语。

设计原则建议：

- 自动选择只覆盖已安装、已授权的技能与工具；安装扩展、获取权限和外发资料需明确处理。
- 进度、工具调用和产出可检查，不把未验证的执行结果标记为成功。
- 常规授权范围内不反复弹窗；高影响或新增范围操作单独确认。
- 停止、补充指令、接管和失败重试应有明确状态；文件恢复与外部操作撤销不得混为一谈。
- 模型选择与 Agent 引擎选择分开；使用 Claude/Grok 模型不等于运行相应产品，导入会话不等于接入其执行引擎。
- 本地优先不等于完全离线：云模型和远程 MCP 仍可能接收任务数据。

这些原则尚未转成页面结构、冻结需求或实现承诺。

## 6. 路线选择

| 路线 | 优点 | 主要成本 |
| --- | --- | --- |
| 直接使用现成客户端 | 快速验证真实需求，无需维护软件 | 受其交互与扩展边界限制 |
| 插件或二次开发 | 复用模型、会话、打包基础 | 上游同步、许可和兼容维护 |
| 基于 Pi 新建客户端 | 可围绕目标用户完整设计体验 | 权限、恢复、更新、安装与跨平台测试均需承担 |

建议先按同一组任务试用 vastsa、abcwyc 和 pi-gui；需要多代理和浏览器交互时加入 oh-my-pi-gui。尚无性能排名。

试用应使用隔离测试目录和非敏感样例，记录版本、平台、安装步骤、模型连接结果、Skills/MCP 调用、执行中纠偏、异常恢复及费用可见性。不得直接让未审查工具操作私人资料或重要仓库。

## 7. 首轮访谈问题

1. 第一批主要服务普通用户、开发者，还是默认简单模式并按需展开开发功能的两类用户？请给出一个最希望完成的真实任务。
2. 第一版优先 Windows、macOS 还是其他平台？模型主要通过 API Key、自定义网关、已有订阅登录还是本地模型连接？订阅兼容性需逐家验证。
3. 更偏助手型、共同确认计划并随时纠偏的协作型，还是给目标后自主执行的托管型？当前建议协作型，但未替用户作出决定。

回答后再确认页面结构与概念范围，输出正式蓝图；原型确认后才进入应用开发。

## 8. 其他已查阅来源

- [Pi 官网](https://pi.dev)
- [Pi 官方 MCP 说明](https://earendil.com/posts/you-said-no-mcp/)：当前能力须按具体版本判断，不能沿用旧资料中的“不支持 MCP”。
- [Claude Code Desktop](https://code.claude.com/docs/en/desktop)：权限、会话、评审、预览和执行中纠偏参考。
- [Codex App](https://developers.openai.com/codex/app/)：作为后续任务工作台对照，不据此声明可嵌入。
- [TRAE](https://www.trae.ai/)：本轮官网内容不足以支持深入能力结论。
- [Grok API 文档](https://docs.x.ai/docs/overview)：作为模型/API 接入方向参考，不能等同桌面产品集成。

## 9. 第二轮结论：保留原生 Pi，而不是重写一个 Pi

本轮围绕用户提出的桌面开销与终端完整性顾虑，补查官方协议、源码和更多客户端。推荐方向是原生 Pi 执行核心 + 可选图形控制界面 + 原生终端入口，不以桌面界面替代所有终端能力。

证据明确区分：

- 已读取：上游 RPC、CLI integration、RPC extension UI、Skills、MCP、安全文档，以及下列客户端文档和部分源码。
- 未执行：客户端安装、构建、功能测试和性能测试。不能据此评价响应速度、稳定性、资源占用大小，也不做性能排名。
- 检索方式：GitHub 仓库搜索、仓库内容 API、官方站点及相关链接。Google 搜索仍遇到脚本验证；增强搜索工具此前不可用，未安装。覆盖并非全网穷尽。
- 上游版本锚点：本轮查询 earendil-works/pi 的 main 返回 `4dd2b149d155d7369de16ea4dc77c84e9f5ffb24`。文档和源码按滚动分支读取，未做所有文件同一提交的快照；不能把 main 能力自动等同某个已发行版本。

### 9.1 终端完整性有明确协议依据

官方 RPC extension UI 文档列明：select、confirm、input、editor 可经请求/响应交互；notify、setStatus、setWidget 等可转发给客户端。但 custom 返回 undefined，页头、页脚、终端输入监听、自定义编辑器等接口不可用或降级；setWidget 仅支持字符串数组，不支持组件工厂。

因此“使用同一 Pi 核心”不等于“完整复现终端交互”。原生终端入口应作为产品能力，而不是出错后临时找终端的补救。

### 9.2 性能问题需要拆分测量

记录模型请求耗时、工具执行耗时、进程通信延迟、事件到界面显示延迟、历史会话载入时间、整体进程树 CPU/内存和启动成本。用户观察到的变慢应在这些层分别定位；本轮没有测量，不能把原因直接归给 Electron、Tauri、RPC 或某一项目。

### 9.3 自动加载的两处重要边界

- Skills：启动时公布名称、描述和路径，匹配任务后模型读取完整 SKILL.md；官方说明模型可能漏选，需保留显式选择入口。
- MCP：Pi 会在会话启动时后台连接所有已启用服务器。codemode/deferred 是工具暴露策略，不代表服务器进程按需启动。SDK 会话不自动加载内置扩展，需要显式接入 MCP，以及相应 codemode/tool-search 扩展。已有第三方 `/mcp` 扩展还可能替代原生 MCP 行为。

## 10. 新增项目与可借鉴机制

以下新增项目的许可证是 README 声明，尚未完成逐文件许可审计。

| 项目 | 已读材料体现的设计 | 适合借鉴与边界 |
| --- | --- | --- |
| [justhil/pi-app](https://github.com/justhil/pi-app) | Electron 主进程路由、每会话 SDK Worker、共享原生配置与会话、声明式扩展适配器；README 标注 MIT | 重点研究时间线、执行中纠偏、问卷/审图、配置表单和适配分级；源码仍有 TUI 不支持方法，不能宣称全扩展等价 |
| [gustavonline/pi-desktop](https://github.com/gustavonline/pi-desktop) | Tauri + Pi RPC；桥接包含 instanceId、generation、请求 ID、超时及退出清理 | 重点研究协议桥接、隔离旧进程事件；未审计许可证，不直接复制代码 |
| [FaqFirebase/pi-desktop](https://github.com/FaqFirebase/pi-desktop) | Pi/OMP 双引擎 RPC、任务评审、权限模式、可选 Pi/Claude/Codex 共同规划；README 标注 Apache-2.0，alpha | 借鉴引擎标签、联合规划的费用提示；其说明明确字符串权限规则不是安全沙箱 |
| [am-will/gooey-pi](https://github.com/am-will/gooey-pi) | 已读取多 Pi 引擎工作台说明 | 作为多引擎交互参考；未做源码深审和许可核准，不列为优先复用底座 |
| [jmfederico/pi-web](https://github.com/jmfederico/pi-web) | Web/API 与 session daemon 分离、持久会话、机器/项目/工作区模型；README 标注 MIT | 重点研究界面断开后继续运行；主机关机或 daemon 重启仍可能中断任务，不是断电续跑承诺 |
| [ygncode/pi-web](https://github.com/ygncode/pi-web) | Go HTTP 服务 + JSONL 观察 + SSE + 每会话 RPC Worker；README 标注 MIT，beta | 借鉴终端历史观察和 PWA 入口；终端需 refresh 获取外部消息，共享文件不等于同一进程并发控制 |
| [Pi Durable](https://earendil.com/posts/pi-durable/) | 官方介绍的持久化运行探索 | 关注长任务研究方向；仍属实验方案，不纳入首版核心依赖 |

结合第一轮候选，当前值得深入评估的是：justhil 的扩展交互、gustavonline 的 RPC 接入、pi-gui 的会话约束、jmfederico 的后台生命周期，以及 vastsa 的完整工作流。不是把这些项目直接拼接成产品。

## 11. 已读取的源码与实际启示

| 源码 | 实际观察 | 蓝图要求 |
| --- | --- | --- |
| [Pi rpc-client.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-client.ts) | 官方 RPC 客户端实现已读取 | 以官方协议为准设计适配器，区分命令响应与任务最终完成 |
| [gustavonline bridge.ts](https://github.com/gustavonline/pi-desktop/blob/HEAD/src/rpc/bridge.ts) | 区分实例与 generation；pending 请求按 ID 关联；关闭时拒绝未完成请求 | 旧进程事件不得污染新会话；请求超时不等于执行已停止，未知结果不得自动重发有副作用命令 |
| [pi-gui session-lease.ts](https://github.com/minghinmatthewlam/pi-gui/blob/HEAD/packages/pi-sdk-driver/src/session-lease.ts) | 租约文件、所有者标识和心跳；注释明确原生 CLI 不遵守该租约 | 协作锁只约束参与者；不能声称阻止外部 CLI 并发写同一会话 |
| [pi-gui unsupported-host-ui.ts](https://github.com/minghinmatthewlam/pi-gui/blob/HEAD/packages/pi-sdk-driver/src/unsupported-host-ui.ts) | 不支持的终端界面能力有明确提示处理 | 不静默伪装支持；界面显示兼容等级和原生终端入口 |
| [justhil desktop-ui-bridge.ts](https://github.com/justhil/pi-app/blob/HEAD/src/worker/desktop-ui-bridge.ts) | pending 对话、UUID 关联、取消/超时清理；custom 仅适配已知交互协议；部分接口仍为空实现 | 借鉴通用交互协议，不模拟任意 TUI；未知交互阻塞时可取消或安全交接 |
| [jmfederico sessiondStateOwnership.ts](https://github.com/jmfederico/pi-web/blob/HEAD/src/server/sessiond/sessiondStateOwnership.ts) | 后台状态目录所有者标记、存活检查、进程身份与独占创建 | 后台状态仅允许一个管理者；不同 PID 命名空间共享卷需单独处理，不能靠 PID 检查宣称全局互斥 |

上述为局部源码审阅，不是全仓库安全审计或运行验证。

## 12. 架构路线比较与建议

| 路线 | 能力与优势 | 代价和限制 | 建议 |
| --- | --- | --- | --- |
| 原生 Pi TUI + 系统终端/PTY + 可选观察扩展 | 保留真正终端执行路径，不重写 Agent 循环 | 结构化图形交互需额外事件桥；嵌入终端的输入、图片、键盘协议仍需兼容测试 | 第一阶段能力基线 |
| Pi CLI RPC + 图形客户端 | 使用正式协议，支持结构化事件与标准扩展对话 | TUI-only 扩展不能原样显示；切换模式不是运行中无损变形 | 第二阶段主要图形交互路径 |
| Pi SDK + 自建宿主 | 可深度整合 UI 和会话管理 | 内置扩展、资源加载、生命周期与 UI 兼容责任更多 | 暂不作为首版默认引擎 |

推荐：渐进式双入口，不同时为同一会话开两个执行者。

```text
桌面控制台：任务 / 交互卡 / 成果预览 / 配置 / 终端
                         │
                  本地会话管理服务（建议新增）
             所有权、进程生命周期、事件、鉴权
                         │
           ┌─────────────┴──────────────┐
      原生入口：Pi TUI              图形入口：Pi RPC
      系统终端或 PTY               标准对话与事件适配
           └─────────────┬──────────────┘
             同一会话一次只有一个写入执行者
                         │
           Pi 原生会话、模型、Skills、MCP、扩展
```

说明：这是待实现的目标架构，不是 Pi 当前自带的统一 daemon。原生 TUI 的结构化事件桥需要可选扩展和协议设计；不解析 ANSI 屏幕文本来猜任务成功或权限状态。未经管理的外部 Pi 会话默认只读观察，状态不明时建议分支，不抢占。

### 12.1 会话交接规则

1. 用户请求切换入口，停止接收新输入。
2. 等待当前回合结束，或请求取消并确认结果；取消不等于外部副作用回滚。
3. 处理未决对话、队列和持久化状态；检查当前版本恢复能力。
4. 原执行者确认退出并释放写入权后，目标入口再恢复同一会话。
5. 运行中的工具、扩展内存和外部进程不保证可迁移；不能恢复时明确提示或新建分支。

应用内租约不能强制约束用户另开的原生 CLI。只有经同一服务管理或自愿遵守协议的参与者，才能实现受控单写者；其他情况下采用只读和显式交接。

### 12.2 数据和运行所有权

- Pi 会话文件是对话事实源，桌面索引可重建，不维护另一份相互覆盖的权威聊天记录。
- 桌面只存布局、标签、最近任务和索引等界面元数据；配置写入保留未知字段并做冲突检查。
- 执行状态由运行时事件决定；RPC 接收成功、工具成功、整个任务验收成功分别显示。
- 如果要求关闭窗口仍执行，后台服务必须独立于窗口进程；只把子进程放进桌面主进程不能据此承诺后台持久运行。
- UI 重连可用服务生成的事件序号和快照补齐；这属于新增协议，不是原生 RPC 自动提供的能力。
- 机器休眠、关机和服务重启后的行为单独说明；有外部副作用的动作不能自动重试以假装恢复。

## 13. 产品交互蓝图（建议，待确认）

建议主导航控制在五类：任务、项目、能力、模型、设置。原生终端作为任务页的一等入口，不要求普通用户学会命令才能开始。

### 13.1 任务页

- 左侧：项目与会话，显示运行、等待用户、失败、中断等真实状态。
- 中间：对话与任务时间线；计划与实际执行分开展示，工具输出默认折叠但可检查。
- 右侧按需展开：文件、预览、变更、引用来源与费用。
- 输入区：附件、模型、纠偏消息、排队消息；明确区分现在调整与本轮后执行。
- 原生入口：启动真实 Pi TUI；图形入口不支持的扩展显示原因和交接条件。

### 13.2 人机协作

统一交互卡包括单选、多选、文本、计划确认和结果评审。每条请求绑定会话、运行代次、请求 ID 和有效状态；取消与超时后禁止迟到提交继续生效。首版只实现官方支持的标准交互，自定义问卷与审图按适配协议扩展。

暂时隐藏卡片不等于回答问题；后台必须保留“等待用户”状态。关闭窗口时不得默认批准。执行中提供纠偏、排队和取消，不把不可实现的瞬时暂停伪装成按钮。

### 13.3 能力中心

- 分开列出 Skills、MCP 和可执行扩展，显示来源、版本、授权范围及加载状态。
- 用户能查看本次采用的技能、明确要求某项技能、禁用不需要的能力。
- MCP 展示连接、认证、工具暴露策略和配置来源；继承 Pi 原生实现，不另建一套冲突的连接管理。
- 工具按需发现优先；若需真正按任务启动服务，列为额外开发项，不冒充 Pi 默认行为。
- 显示“图形完整适配 / 部分适配 / 仅终端 / 未验证”；未知自定义组件不自动变成问卷。
- 安装新扩展、启动本地服务、外发资料、扩大权限分别确认，不能由技能文本自行授予权限。

### 13.4 模型中心

区分供应商与模型、凭据方式、上下文能力、工具调用能力及已验证状态。支持方向为 Pi 已支持的供应商、自定义兼容接口和本地模型，但不能承诺任意接口都兼容。

会话中切换模型需遵守运行时能力和安全时机；API Key/OAuth 走可信后端，不送入界面日志。已有 CLI 认证文件保持兼容，新增密钥存储是否采用系统凭据库需设计桥接，不能擅自搬迁原文件。

Claude/Grok 模型与 Claude Code/Codex 引擎分开：首版专注 Pi，后续为其他引擎建立独立会话和适配器。跨引擎只做显式任务交接或结果汇总，不伪造完整历史兼容。TRAE 暂作交互参考，无已核准的引擎嵌入契约。

## 14. 性能与可靠性验证计划

以下均是计划，不是已测结果：

- 对照组：原生 Pi TUI、嵌入 TUI、Pi RPC 图形客户端。固定 Pi 版本、模型、提示词、工具、技能、MCP 配置和工作目录。
- 协议与渲染：用可重复的本地模拟响应/事件回放隔离模型网络波动，统计事件到显示的延迟分布。
- 真实任务：另用实际模型测端到端耗时，并记录网络与模型差异，重复运行后再判断。
- 资源：测整个进程树，包含桌面、Pi、MCP 与预览进程；不能只比较主窗口内存。
- 长会话、连续工具输出、大文件 diff、多个会话、窗口重开、连接中断、取消/超时均纳入测试。
- UI 建议：流式输出批量提交、历史分页/虚拟列表、重预览按需加载；不为装饰性步骤额外调用模型。
- PTY 必须有背压和有界缓冲。xterm.js 官方说明 write 异步缓冲，快生产者可能超过消费速度；不能逐 token 无限制堆积。
- 关键事件如授权、完成、失败不可因显示节流丢失；可合并的是展示更新，不是执行事实。
- 先测基线再确定预算；没有测量前不承诺毫秒数、内存上限或百分比提升。

## 15. 安全与开源发布边界

Pi 官方明确：项目工作目录不是文件访问沙箱；扩展与子进程通常继承启动账户权限；项目 trust 不等于工具权限隔离。图形确认框也不是操作系统安全边界。

建议先本机使用。若增加本地 HTTP 服务，仍需鉴权、来源校验和最小授权；远程入口另做安全设计，不直接暴露公网。更强隔离需容器、虚拟机、专用账户或平台沙箱，并同时评估跨平台及工具兼容。

复用开源代码前核对 LICENSE、NOTICE、第三方依赖与资源授权，记录来源提交；不复制 zth0828 的受非商业限制代码进入允许自由商用的发行包。包安装和来源校验独立于模型建议，不照搬仓库说明中的安全防护绕过步骤。

## 16. 分阶段交付蓝图

| 阶段 | 范围 | 验收条件 |
| --- | --- | --- |
| 兼容性验证 | 挑选真实技能和终端扩展；对照系统终端、嵌入终端与 RPC | 得出能力矩阵和性能基线，不用 README 代替验证 |
| 原生优先原型 | 项目/会话启动器、配置引导、终端入口、只读观察与产出预览 | 用户无需记命令即可进入真实 Pi，未知扩展不被静默替代 |
| 图形协作 | RPC 事件、标准问题卡、纠偏/排队、模型选择、受控交接 | 会话状态正确，取消/超时明确，不双写，不宣称运行中无损切换 |
| 生态与持久运行 | 适配器、能力中心、后台会话、重连 | 关闭窗口与停止任务区分，待答问题可找回，未经授权不扩权 |
| 后续扩展 | 远程设备、其他 Agent 引擎、受控多代理 | 单独需求与安全评估，不作为首版全能承诺 |

当时比较了 Tauri 与 Electron；后续已选 Electron，原生 Pi TUI 为主入口。RPC 图形聊天和双入口交接保留为历史备选，不是首版必须同时实现的架构。原生终端、进程生命周期、UI 控制桥仍待验证；当前只交付资料。

## 17. 官方依据与进一步阅读

- [Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
- [Pi CLI integration](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli-integration.md)
- [Pi RPC extension UI](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc-extension-ui.md)
- [Pi Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- [Pi MCP](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md)
- [Pi security](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md)
- [justhil 适配器指南](https://github.com/justhil/pi-app/blob/HEAD/doc/adapter-authoring-guide.md)
- [PI WEB 持久运行边界](https://pi-web.dev/remote-first)
- [xterm.js 流量控制](https://xtermjs.org/docs/guides/flowcontrol/)
- [MCP 架构与权限边界](https://modelcontextprotocol.io/specification/2025-11-25/architecture)

该项决策已完成：用户明确选择“打开就是真实 Pi 终端，旁边有图形辅助”。按项目自主选择/调用 Skills/MCP 是后续新增需求，详见 [主蓝图第 5 节](design-blueprint.md)。不要再把历史二选一问题作为待确认事项。
