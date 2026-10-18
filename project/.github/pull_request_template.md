## 改动内容

<!-- 一两句话说明改了什么，以及为什么需要这个改动。 -->

## 验证

- [ ] `npm run verify` 通过
- [ ] `npx electron .smoke/i18n-smoke.mjs` 输出 `"failures": []`
- [ ] `npx electron .smoke/workbench-smoke.mjs` 输出 `"failures": []`
- [ ] 涉及界面时，已检查 1440 / 768 / 375 宽度截图

## 风险与边界

<!-- 是否涉及权限、抓取、逆向、安全扫描或数据迁移？如有，说明新增的限制与拒绝策略。 -->

- [ ] 不包含真实密钥、Token、Cookie 或他人隐私
- [ ] 不引入未授权扫描、命令透传、凭据攻击或规避检测能力
