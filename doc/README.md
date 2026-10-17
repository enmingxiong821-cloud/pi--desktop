# Pi 终端优先工作台文档中心

本目录整理现阶段的产品决定、设计蓝图、资料来源和验证状态。**当前执行以 `design-blueprint.md` 与 `decisions.md` 为准；**`pi-desktop-research.md` 是候选项目调研底稿，不是当前方案的权威规格。

## 建议阅读顺序

1. [`design-blueprint.md`](design-blueprint.md)：目标产品、终端优先架构、项目级 Skills/MCP 自主选用、界面和交付阶段。
2. [`decisions.md`](decisions.md)：用户已确认选择、尚未决定事项及容易混淆的产品边界。
3. [`sources.md`](sources.md)：GitHub 候选、官方 Pi 文档、许可证及局部源码依据。
4. [`verification.md`](verification.md)：自动化原型验证记录和真实桌面运行时未完成清单。
5. [`development-handoff.md`](development-handoff.md)：实现背景、分阶段任务和验收条件；要求先确认方案再改代码。
6. [`prototype-design.md`](prototype-design.md)：当前静态交互原型的视觉说明、安全限制及与正式产品的区别。
7. [`pi-desktop-research.md`](pi-desktop-research.md)：两轮外部项目调研与架构研究，作为历史研究底稿；冲突时以主蓝图和决策记录为准。
8. [`resume-notes.md`](resume-notes.md)：当前资料交接状态与后续阅读入口。
9. [`task-routing-design.md`](task-routing-design.md)：新增任务点智能路由模块；联合选择模型/Skills/MCP，质量门槛、预算、切换、失败升级与评测。

## 当前状态速览

- 用户已确认：Pi 原生 TUI 为主要入口、Electron 方向、旁置图形辅助、按项目和任务自主选择/调用 Skills/MCP、模型切换和中转站需求。Windows 是当前优先验证建议，不是已完成的兼容结论。
- 首版实现范围与验收条件以开发交接包为准；本资料包不代表已批准安装依赖或开始实现。
- 新增已确认需求：按项目任务点自动选择模型，与 Skills/MCP 联合调度；设计已补充，未实现、未测质量/时间/费用收益。
- 尚未构建：Electron 壳、PTY、Pi 扩展桥、真实项目能力解析和模型运行时切换。
- 已有：浏览器交互原型、零依赖诊断脚本、Node 单元测试、Playwright 验收脚本。
- 本机 Pi CLI 版本已读为 1.3.0；PATH 未发现入口，但本机用户目录中的 launcher 可读取该版本。未启动真实 Pi 会话。
- 没有完成原生桌面性能测量。不要把项目 README、预留端口或浏览器测试说成运行时验收。
