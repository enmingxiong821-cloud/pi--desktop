// 本机验证：通过工作台安装器安装核心工具（需显式 TOOL_ID）。
import { app } from 'electron';
import { detectTools, installTool, type ToolId } from '../backend/external-tools.js';

app.whenReady().then(async () => {
  const id = (process.env.TOOL_ID || 'radare2') as ToolId;
  const result = await installTool(id);
  console.log(JSON.stringify(result, null, 2));
  console.log(JSON.stringify((await detectTools()).filter((item) => item.id === id), null, 2));
  app.exit(result.ok ? 0 : 1);
});
