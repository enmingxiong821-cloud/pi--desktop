import { spawn } from 'node:child_process';
import { resolvePi } from './pi.js';
import { t } from './i18n.js';

export interface VendorInfo {
  key: string;
  label: string;
  tier: number;
  region: 'cn' | 'global';
  aliases: string[];
}

export interface CatalogSkill {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
}

export interface CatalogMcp {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  command: string;
  args: string[];
  envHint?: string;
  needsConfig?: boolean;
}

export interface CatalogExtension {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  builtin: boolean;
  version?: string;
  source: string;
}

export interface CatalogReport {
  vendors: VendorInfo[];
  skills: CatalogSkill[];
  mcps: CatalogMcp[];
  extensions: CatalogExtension[];
}

// 顺序即推荐顺序；tier 越小越靠前。这是编辑过的常用排序，不是客观评测。
export const VENDORS: VendorInfo[] = [
  { key: 'openai', label: 'OpenAI', tier: 1, region: 'global', aliases: ['openai', 'azure-openai', 'azure'] },
  { key: 'anthropic', label: 'Anthropic', tier: 1, region: 'global', aliases: ['anthropic', 'claude'] },
  { key: 'google', label: 'Google', tier: 1, region: 'global', aliases: ['google', 'gemini', 'vertex'] },
  { key: 'xai', label: 'xAI', tier: 1, region: 'global', aliases: ['xai', 'grok'] },
  { key: 'deepseek', label: 'DeepSeek', tier: 2, region: 'cn', aliases: ['deepseek'] },
  { key: 'moonshot', label: 'Moonshot · Kimi', tier: 2, region: 'cn', aliases: ['moonshot', 'kimi', 'moonshotai'] },
  { key: 'alibaba', label: '阿里通义', tier: 2, region: 'cn', aliases: ['qwen', 'alibaba', 'dashscope', 'tongyi'] },
  { key: 'zhipu', label: '智谱 GLM', tier: 2, region: 'cn', aliases: ['zhipu', 'glm', 'bigmodel', 'z-ai'] },
  { key: 'bytedance', label: '字节豆包', tier: 3, region: 'cn', aliases: ['doubao', 'volcengine', 'bytedance', 'ark'] },
  { key: 'baidu', label: '百度文心', tier: 3, region: 'cn', aliases: ['baidu', 'wenxin', 'ernie', 'qianfan'] },
  { key: 'meta', label: 'Meta', tier: 3, region: 'global', aliases: ['meta', 'llama'] },
  { key: 'mistral', label: 'Mistral', tier: 3, region: 'global', aliases: ['mistral'] },
  { key: 'cohere', label: 'Cohere', tier: 3, region: 'global', aliases: ['cohere', 'command'] },
  { key: 'amazon', label: 'Amazon', tier: 3, region: 'global', aliases: ['amazon', 'bedrock', 'nova'] },
  { key: 'openrouter', label: 'OpenRouter', tier: 4, region: 'global', aliases: ['openrouter'] },
  { key: 'local', label: '本地模型', tier: 4, region: 'global', aliases: ['ollama', 'lmstudio', 'localhost', 'local'] },
];

export function vendorKeyOf(providerId: string, modelId = ''): string {
  const haystack = `${providerId} ${modelId}`.toLowerCase();
  for (const vendor of VENDORS) {
    if (vendor.aliases.some((alias) => haystack.includes(alias))) return vendor.key;
  }
  return 'custom';
}

const SKILLS: CatalogSkill[] = [
  {
    id: 'code-review',
    name: 'code-review',
    title: '代码审查',
    description: '按正确性、安全、性能、可维护性分级审查当前改动，只报告可复现的问题。',
    tags: ['开发', '质量'],
    body: [
      '# 代码审查',
      '',
      '审查当前工作区的改动（优先 `git diff`），按以下顺序检查：',
      '',
      '1. 正确性：边界条件、空值、并发、错误处理。',
      '2. 安全：命令注入、路径穿越、密钥泄漏、XSS/SSRF。',
      '3. 兼容性：破坏既有接口、配置或数据格式。',
      '4. 可维护性：重复逻辑、命名、死代码。',
      '',
      '每条问题给出：文件:行号、触发条件、实际后果、最小修复建议。',
      '无法确认的猜测标注“待验证”，不要泛泛而谈。',
    ].join('\n'),
  },
  {
    id: 'test-writer',
    name: 'test-writer',
    title: '测试补齐',
    description: '为改动补充正常、边界、异常三类测试，优先复用项目现有测试框架。',
    tags: ['开发', '测试'],
    body: [
      '# 测试补齐',
      '',
      '先识别项目已有的测试框架与目录约定，再为当前改动补测试：',
      '',
      '- 正常路径：主要输入与预期输出。',
      '- 边界：空值、极值、超长输入、重复调用。',
      '- 异常：外部依赖失败、权限不足、格式错误。',
      '',
      '不要引入新框架；测试必须可离线运行，不调用付费 API。',
    ].join('\n'),
  },
  {
    id: 'commit-message',
    name: 'commit-message',
    title: '提交信息',
    description: '根据暂存区改动生成简洁、可回溯的提交信息。',
    tags: ['开发', 'Git'],
    body: [
      '# 提交信息',
      '',
      '读取 `git diff --cached`，生成一条提交信息：',
      '',
      '- 标题不超过 72 字符，说明“为什么改”，不要罗列文件名。',
      '- 正文用 1–3 条要点描述影响范围与验证方式。',
      '- 不添加署名、工具名或无关模板。',
    ].join('\n'),
  },
  {
    id: 'security-review',
    name: 'security-review',
    title: '安全审查',
    description: '审查密钥处理、命令执行、网络请求与文件访问边界。',
    tags: ['安全', '质量'],
    body: [
      '# 安全审查',
      '',
      '检查当前改动是否存在：',
      '',
      '- 密钥写入源码、日志、截图或导出配置。',
      '- 未校验的用户输入进入命令、SQL、路径或 URL。',
      '- 过宽的文件访问范围与隐式网络上传。',
      '- 权限提升、任意代码执行、反序列化风险。',
      '',
      '发现问题时给出攻击路径与最小修复；没有发现时明确说明检查过的边界。',
    ].join('\n'),
  },
  {
    id: 'docs-writer',
    name: 'docs-writer',
    title: '文档撰写',
    description: '按项目现有风格补充 README、接口说明或使用指南。',
    tags: ['文档'],
    body: [
      '# 文档撰写',
      '',
      '先读现有 README 与代码，保持同一语言、术语和结构。补充：',
      '',
      '- 这个功能解决什么问题、何时使用。',
      '- 最小可运行示例与预期结果。',
      '- 限制、安全边界与常见错误。',
      '',
      '不写营销文案，不重复代码中显而易见的内容。',
    ].join('\n'),
  },
  {
    id: 'refactor-plan',
    name: 'refactor-plan',
    title: '重构方案',
    description: '在不改变外部行为的前提下拆解重构步骤与回滚点。',
    tags: ['架构', '开发'],
    body: [
      '# 重构方案',
      '',
      '先描述当前结构与痛点，再给出分步方案：',
      '',
      '- 每一步都必须可独立验证、可回滚。',
      '- 明确不动哪些接口、配置与数据格式。',
      '- 列出风险、测试点与完成标准。',
      '',
      '优先复用项目已有工具与模式，不引入新依赖。',
    ].join('\n'),
  },
  {
    id: 'sql-analyst',
    name: 'sql-analyst',
    title: 'SQL 分析',
    description: '编写与优化查询，说明索引、执行计划与边界条件。',
    tags: ['数据'],
    body: [
      '# SQL 分析',
      '',
      '给出查询时同时说明：',
      '',
      '- 表关系与过滤条件，避免笛卡尔积。',
      '- 索引是否命中，必要时给出 `EXPLAIN` 解读。',
      '- 空值、时区、分页稳定性等边界。',
      '',
      '只读优先；涉及写入时先给出影响行数预估与回滚方式。',
    ].join('\n'),
  },
  {
    id: 'data-analysis',
    name: 'data-analysis',
    title: '数据分析',
    description: '从原始数据到结论的可复现分析流程。',
    tags: ['数据'],
    body: [
      '# 数据分析',
      '',
      '遵循：明确问题 → 检查数据质量 → 计算 → 交叉验证 → 结论。',
      '',
      '- 记录数据范围、缺失值与异常值处理。',
      '- 给出可复现的脚本或命令。',
      '- 区分相关与因果，结论附不确定性说明。',
    ].join('\n'),
  },
  {
    id: 'api-design',
    name: 'api-design',
    title: '接口设计',
    description: '设计稳定的 HTTP/IPC 接口，覆盖错误码、幂等与兼容性。',
    tags: ['架构'],
    body: [
      '# 接口设计',
      '',
      '输出包含：输入输出示例、错误码、幂等语义、版本与兼容策略。',
      '默认最小暴露面：只开放当前需求需要的字段与操作。',
      '涉及写操作时说明授权、审计与失败回滚。',
    ].join('\n'),
  },
  {
    id: 'ui-review',
    name: 'ui-review',
    title: '界面评审',
    description: '按层级、对比、间距、可访问性检查界面，并给出最小修改建议。',
    tags: ['设计', '前端'],
    body: [
      '# 界面评审',
      '',
      '先确认目标用户与使用场景，再按以下顺序检查：',
      '',
      '1. 信息层级：主任务是否一眼可见，次要信息是否退后。',
      '2. 对比与可读性：文字/背景对比度、字号、状态色。',
      '3. 间距与对齐：网格一致性、触控目标尺寸。',
      '4. 可访问性：键盘操作、焦点样式、语义标签。',
      '',
      '每条建议给出位置、问题、影响与最小改动；不重做整页视觉。',
    ].join('\n'),
  },
  {
    id: 'creative-brief',
    name: 'creative-brief',
    title: '创意项目简报',
    description: '把剪辑、建模、动画需求拆成分镜、素材、软件与交付清单。',
    tags: ['视频', '3D', '设计'],
    body: [
      '# 创意项目简报',
      '',
      '输出一份可执行简报：',
      '',
      '- 目标与受众、成片时长/分辨率、交付格式。',
      '- 分镜或结构：每个镜头的画面、时长、转场、音效。',
      '- 素材清单：实拍、图片、模型、字体、音乐及授权状态。',
      '- 工具与文件：所需软件、工程文件命名、目录结构。',
      '- 检查点：粗剪、精剪、调色、导出各阶段的验收标准。',
      '',
      '不确定的创意方向给出 2 个可选方案与取舍，不擅自替用户决定风格。',
    ].join('\n'),
  },
  {
    id: 'release-notes',
    name: 'release-notes',
    title: '发布说明',
    description: '从提交历史整理面向用户的发布说明与升级注意事项。',
    tags: ['发布'],
    body: [
      '# 发布说明',
      '',
      '按「新增 / 改进 / 修复 / 升级注意」分组。',
      '只写用户能感知的变化；破坏性变更给出迁移步骤。',
      '不写内部工具署名。',
    ].join('\n'),
  },
];

const MCPS: CatalogMcp[] = [
  {
    id: 'playwright',
    name: 'playwright',
    title: '浏览器自动化',
    description: '打开网页、点击、填表、截图、读取页面结构；适合资料查询与端到端验证。',
    tags: ['浏览器', '研究', '测试'],
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
  },
  {
    id: 'chrome-devtools',
    name: 'chrome-devtools',
    title: 'Chrome 调试',
    description: '通过 Chrome DevTools 协议检查网络、控制台与性能。',
    tags: ['浏览器', '调试'],
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest'],
  },
  {
    id: 'filesystem',
    name: 'filesystem',
    title: '文件系统',
    description: '读写当前项目目录内的文件，适合批量整理与检索。',
    tags: ['文件', '开发'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  },
  {
    id: 'desktop-commander',
    name: 'desktop-commander',
    title: '桌面与终端控制',
    description: '执行命令、管理进程、读写文件；权限较大，按需启用。',
    tags: ['系统', '终端'],
    command: 'npx',
    args: ['-y', '@wonderwhy-er/desktop-commander'],
  },
  {
    id: 'context7',
    name: 'context7',
    title: '文档检索 (Context7)',
    description: '检索最新库文档与代码示例，减少过时知识。',
    tags: ['文档', '研究'],
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
  },
  {
    id: 'sequential-thinking',
    name: 'sequential-thinking',
    title: '分步推理',
    description: '把复杂问题拆成可验证的推理步骤。',
    tags: ['推理'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  {
    id: 'memory',
    name: 'memory',
    title: '长期记忆',
    description: '在会话之间保存项目事实与偏好。',
    tags: ['记忆'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  {
    id: 'github',
    name: 'github',
    title: 'GitHub',
    description: '读取仓库、Issue 与 PR；需要个人访问令牌。',
    tags: ['Git', '协作'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envHint: 'GITHUB_PERSONAL_ACCESS_TOKEN=',
    needsConfig: true,
  },
  {
    id: 'brave-search',
    name: 'brave-search',
    title: '网页搜索',
    description: '通过 Brave Search 查询公开资料；需要 API Key。',
    tags: ['搜索', '研究'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    envHint: 'BRAVE_API_KEY=',
    needsConfig: true,
  },
];

const EXTENSIONS: CatalogExtension[] = [
  {
    id: 'pi-web-access',
    name: 'pi-web-access',
    title: '联网检索',
    description: '网页搜索、抓取 URL、GitHub 仓库克隆、PDF 与视频内容提取。',
    tags: ['联网', '搜索', '文档'],
    builtin: true,
    source: 'npm',
  },
  {
    id: 'pi-mcp-extension',
    name: 'pi-mcp-extension',
    title: 'MCP 客户端',
    description: '在 Pi 内连接 MCP 服务器，复用已配置的工具与资源。',
    tags: ['MCP', '工具'],
    builtin: true,
    source: 'npm',
  },
  {
    id: 'pi-subagents',
    name: 'pi-subagents',
    title: '子代理编排',
    description: '单 Agent 委派与脚本化多 Agent 工作流。',
    tags: ['协作', 'Agent'],
    builtin: true,
    source: 'npm',
  },
  {
    id: 'pi-lens',
    name: 'pi-lens',
    title: '实时代码反馈',
    description: 'LSP、Lint、格式化、类型检查与结构化代码反馈。',
    tags: ['开发', '质量'],
    builtin: true,
    source: 'npm',
  },
  {
    id: '@plannotator/pi-extension',
    name: '@plannotator/pi-extension',
    title: '计划审阅',
    description: '带批注的交互式计划审阅，适合长任务开工前确认。',
    tags: ['规划', '审阅'],
    builtin: true,
    source: 'npm',
  },
  {
    id: 'pi-powerline-footer',
    name: 'pi-powerline-footer',
    title: 'Powerline 状态栏',
    description: '在 Pi 底部显示模型、目录与运行状态。',
    tags: ['界面'],
    builtin: true,
    source: 'npm',
  },
  {
    id: '@langfuse/pi-observability-plugin',
    name: '@langfuse/pi-observability-plugin',
    title: 'Langfuse 可观测',
    description: '记录提示、工具调用与耗时，便于排查与统计。',
    tags: ['可观测', '日志'],
    builtin: true,
    source: 'npm',
  },
  {
    id: '@juicesharp/rpiv-ask-user-question',
    name: '@juicesharp/rpiv-ask-user-question',
    title: '结构化提问',
    description: '模型在关键决策点以问卷形式向用户确认。',
    tags: ['交互'],
    builtin: true,
    source: 'npm',
  },
];

export function listCatalog(): CatalogReport {
  return { vendors: VENDORS, skills: SKILLS, mcps: MCPS, extensions: EXTENSIONS };
}

export interface RegistryMcp {
  id: string;
  name: string;
  title: string;
  description: string;
  command: string;
  args: string[];
  source: string;
}

const NPM_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
}

export async function searchMcpRegistry(query: string): Promise<{ ok: boolean; results: RegistryMcp[]; error?: string }> {
  const term = cleanText(query, 80);
  if (!term) return { ok: true, results: [] };
  const url = `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(term)}&limit=20`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, results: [], error: `HTTP ${response.status}` };
    const payload = await response.json() as { servers?: unknown };
    if (!Array.isArray(payload.servers)) return { ok: true, results: [] };
    const results: RegistryMcp[] = [];
    const seen = new Set<string>();
    for (const entry of payload.servers) {
      if (!entry || typeof entry !== 'object') continue;
      const server = (entry as Record<string, unknown>).server;
      if (!server || typeof server !== 'object') continue;
      const record = server as Record<string, unknown>;
      const name = cleanText(record.name, 120);
      if (!name || seen.has(name)) continue;
      const packages = Array.isArray(record.packages) ? record.packages : [];
      const npmPackage = packages.find((item) => {
        if (!item || typeof item !== 'object') return false;
        const pkg = item as Record<string, unknown>;
        const transport = pkg.transport && typeof pkg.transport === 'object' ? pkg.transport as Record<string, unknown> : {};
        return pkg.registryType === 'npm' && transport.type === 'stdio' && typeof pkg.identifier === 'string' && NPM_NAME.test(pkg.identifier);
      }) as Record<string, unknown> | undefined;
      if (!npmPackage) continue;
      const identifier = String(npmPackage.identifier);
      const version = cleanText(npmPackage.version, 40);
      seen.add(name);
      results.push({
        id: `registry:${identifier}`,
        name,
        title: name.split('/').pop() || name,
        description: cleanText(record.description, 300) || '来自官方 MCP Registry',
        command: 'npx',
        args: ['-y', version ? `${identifier}@${version}` : identifier],
        source: 'registry.modelcontextprotocol.io',
      });
      if (results.length >= 12) break;
    }
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function searchNpmExtensions(
  query: string,
): Promise<{ ok: boolean; results: CatalogExtension[]; error?: string }> {
  const term = cleanText(query, 80);
  const text = term ? `${term} keywords:pi-package` : 'keywords:pi-package';
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=25`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, results: [], error: `HTTP ${response.status}` };
    const payload = await response.json() as { objects?: unknown };
    if (!Array.isArray(payload.objects)) return { ok: true, results: [] };
    const results: CatalogExtension[] = [];
    const seen = new Set<string>();
    for (const entry of payload.objects) {
      if (!entry || typeof entry !== 'object') continue;
      const pkg = (entry as Record<string, unknown>).package;
      if (!pkg || typeof pkg !== 'object') continue;
      const record = pkg as Record<string, unknown>;
      const name = cleanText(record.name, 120);
      const keywords = Array.isArray(record.keywords) ? record.keywords.filter((item): item is string => typeof item === 'string') : [];
      if (!name || seen.has(name) || !NPM_NAME.test(name)) continue;
      if (!keywords.some((item) => /^(pi-package|pi-extension)$/i.test(item))) continue;
      seen.add(name);
      results.push({
        id: `npm:${name}`,
        name,
        title: name.split('/').pop() || name,
        description: cleanText(record.description, 260) || '来自 npm 的 Pi 扩展',
        tags: keywords.filter((item) => !/^(pi|pi-package|pi-extension|pi-coding-agent)$/i.test(item)).slice(0, 3),
        builtin: EXTENSIONS.some((item) => item.name.toLowerCase() === name.toLowerCase()),
        version: cleanText(record.version, 40) || undefined,
        source: 'registry.npmjs.org',
      });
    }
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function installExtension(
  packageName: string,
  onEvent?: (line: string) => void,
): Promise<{ ok: boolean; output: string; error?: string }> {
  const name = cleanText(packageName, 160);
  if (!name || !NPM_NAME.test(name)) return { ok: false, output: '', error: t('npm 包名无效') };
  let install;
  try {
    install = resolvePi();
  } catch (error) {
    return { ok: false, output: '', error: error instanceof Error ? error.message : String(error) };
  }
  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    const append = (chunk: string): void => {
      if (settled || !chunk) return;
      output = (output + chunk).slice(-20_000);
      onEvent?.(chunk.slice(0, 2000));
    };
    let child;
    try {
      child = spawn(install.nodePath, [install.cliPath, 'install', `npm:${name}`], {
        cwd: install.agentDir,
        windowsHide: true,
        env: { ...process.env, PI_CODING_AGENT_DIR: install.agentDir },
      });
    } catch (error) {
      resolve({ ok: false, output: '', error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const finish = (ok: boolean, error?: string): void => {
      if (settled) return;
      settled = true;
      resolve({ ok, output: output.trim(), error });
    };
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // 已退出
      }
      finish(false, t('安装超时'));
    }, 5 * 60_000);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    child.on('error', (error) => {
      clearTimeout(timer);
      finish(false, error.message);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      finish(code === 0, code === 0 ? undefined : t('安装失败，退出码 {code}', { code: String(code) }));
    });
  });
}

export async function fetchSkillFromUrl(
  rawUrl: string,
): Promise<{ ok: boolean; name?: string; description?: string; body?: string; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: t('链接无效') };
  }
  if (parsed.protocol !== 'https:' || !/^raw\.githubusercontent\.com$/i.test(parsed.hostname)) {
    return { ok: false, error: t('只支持 raw.githubusercontent.com 的 SKILL.md 链接') };
  }
  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const text = (await response.text()).slice(0, 512_000);
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
    const meta: Record<string, string> = {};
    if (frontmatter) {
      for (const line of frontmatter[1].split(/\r?\n/)) {
        const match = /^([A-Za-z_-]+):\s*(.+)$/.exec(line);
        if (match) meta[match[1].toLowerCase()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
    const body = frontmatter ? text.slice(frontmatter[0].length).trim() : text.trim();
    const fallbackName = parsed.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'imported-skill';
    const name = (meta.name || fallbackName).replace(/[^\w.-]/g, '-').slice(0, 60);
    return { ok: true, name, description: (meta.description || '').slice(0, 300), body };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
