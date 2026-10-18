# 参与开发

感谢你愿意改进 Pi 工作台。提交代码前请先确认以下约定。

## 环境

- Node.js 20 或更高版本
- Windows 10/11（主要目标平台；macOS 与 Linux 可构建但未完整实测）
- 本机已安装 Pi，或在应用设置中使用「一键配置环境」

```bash
npm install
npm run verify
npm start
```

## 开发约定

- TypeScript 严格模式；主进程代码在 `backend/`，渲染层在 `frontend/`，构建脚本在 `scripts/`。
- 不引入前端框架，沿用原生 DOM 与现有工具函数。
- 新增界面文案必须同时补充 `frontend/src/i18n.ts` 与 `backend/i18n.ts`（如涉及主进程），并保证 `npm run i18n:check` 缺失为 0。
- 不读取、不回显、不记录供应商密钥；不把环境变量值写入项目配置、模板、日志或截图。
- 不随包分发第三方二进制；外部工具只在用户确认后于本机安装。
- 不提供未授权扫描、任意命令透传、DoS、凭据攻击或规避检测的能力。

## 验证

提交前至少运行：

```bash
npm run verify
npx electron .smoke/i18n-smoke.mjs
npx electron .smoke/workbench-smoke.mjs
```

两套冒烟输出 `"failures": []` 才算通过。涉及界面的改动请同时检查 `.smoke/*.png` 截图，确认 1440 / 768 / 375 宽度下没有横向溢出。

## 提交与 Pull Request

- 一个 PR 聚焦一件事，避免混入无关格式化。
- 提交信息使用中文或英文均可，说明「为什么改」而不是重复代码内容。
- PR 描述中写清改动点、验证步骤与已知限制。
- 涉及权限、抓取、逆向或安全功能时，请说明新增的边界与拒绝策略。

## 行为准则

- 尊重其他贡献者，讨论聚焦技术与事实。
- 不提交从其他项目复制且许可证不兼容的代码。
- 发现安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。
