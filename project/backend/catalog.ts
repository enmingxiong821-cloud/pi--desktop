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
  {
    id: 'tdd-workflow',
    name: 'tdd-workflow',
    title: '测试驱动开发',
    description: '先写失败测试再实现，按红-绿-重构循环推进，每步保持可运行。',
    tags: ['开发', '测试'],
    body: [
      '# 测试驱动开发',
      '',
      '1. 用最小用例复现需求，确认测试失败且失败原因正确。',
      '2. 写刚好让测试通过的实现，不提前抽象。',
      '3. 在测试保护下重构，每轮结束运行完整测试。',
      '不修改测试来迁就实现；测试无法表达需求时先回到需求澄清。',
    ].join('\n'),
  },
  {
    id: 'unit-test-plan',
    name: 'unit-test-plan',
    title: '单元测试计划',
    description: '按函数边界、分支与错误路径列出测试点，避免只覆盖正常流程。',
    tags: ['测试', '质量'],
    body: [
      '# 单元测试计划',
      '',
      '列出：被测单元、输入域、分支条件、外部依赖与替身方式。',
      '每个分支至少一个用例，错误路径与空值单独覆盖。',
      '测试命名说明场景与预期；断言失败时必须能定位原因。',
      '不追求覆盖率数字，优先覆盖会出错的边界。',
    ].join('\n'),
  },
  {
    id: 'e2e-plan',
    name: 'e2e-plan',
    title: '端到端测试计划',
    description: '设计关键用户路径的浏览器级测试，覆盖登录、主流程与失败恢复。',
    tags: ['测试', '浏览器'],
    body: [
      '# 端到端测试计划',
      '',
      '只保留 3–7 条最能代表用户价值的路径，避免把所有单元测试搬到浏览器。',
      '每条路径写清：前置数据、操作步骤、可观察断言、失败后的清理。',
      '选择稳定的定位方式（角色/文本优先），避免依赖样式与 DOM 层级。',
      '外部服务使用本地假服务或录制样本，不调用付费接口。',
    ].join('\n'),
  },
  {
    id: 'api-test',
    name: 'api-test',
    title: '接口测试',
    description: '覆盖状态码、错误结构、幂等与权限边界的接口测试设计。',
    tags: ['测试', '开发', '文档'],
    body: [
      '# 接口测试',
      '',
      '每个接口验证：正常输入、缺失字段、类型错误、越权、重复提交与超限。',
      '断言状态码之外，还要校验错误码、消息结构与副作用。',
      '写操作测试使用独立测试数据，结束后回滚。',
      '把请求示例同步到文档，避免文档与实现漂移。',
    ].join('\n'),
  },
  {
    id: 'perf-test',
    name: 'perf-test',
    title: '性能测试',
    description: '定义可复现的负载模型，测量延迟、吞吐与资源占用并给出瓶颈结论。',
    tags: ['测试', '质量'],
    body: [
      '# 性能测试',
      '',
      '先固定环境与数据规模，再测基线；不要在不同机器上比较绝对数字。',
      '记录 p50/p95/p99 延迟、吞吐、错误率、CPU 与内存。',
      '每次只改变一个变量，保留可复现脚本与原始数据。',
      '结论必须指出瓶颈位置与下一步验证方式，不只看平均值。',
    ].join('\n'),
  },
  {
    id: 'test-data',
    name: 'test-data',
    title: '测试数据设计',
    description: '构造可复现、无真实隐私的测试数据，覆盖空值、极值与异常组合。',
    tags: ['测试', '数据'],
    body: [
      '# 测试数据设计',
      '',
      '使用合成数据，不复制真实用户信息、密钥或生产导出。',
      '覆盖：空值、极值、超长文本、重复、乱序、时区与编码差异。',
      '数据生成脚本入库，保证任何人可重建同一份数据。',
      '涉及删除或写入时提供幂等重置方式。',
    ].join('\n'),
  },
  {
    id: 'flaky-triage',
    name: 'flaky-triage',
    title: '不稳定测试排查',
    description: '定位随机失败的测试，区分环境、时序、数据与真实缺陷。',
    tags: ['测试', '质量'],
    body: [
      '# 不稳定测试排查',
      '',
      '先收集失败率与失败日志，确认是否与执行顺序、并发或时间相关。',
      '禁止用加重试掩盖问题；重试只能作为临时缓解并记录原因。',
      '常见根因：共享状态、异步未等待、真实时钟、外部网络、随机端口。',
      '修复后连续运行多轮验证，再恢复 CI 门禁。',
    ].join('\n'),
  },
  {
    id: 'threat-model',
    name: 'threat-model',
    title: '威胁建模',
    description: '按资产、入口、信任边界与攻击路径梳理风险，给出最小缓解措施。',
    tags: ['安全', '架构'],
    body: [
      '# 威胁建模',
      '',
      '列出资产（密钥、用户数据、构建产物）、入口（API、文件、URL、插件）与信任边界。',
      '对每条路径标注：谁能触发、需要什么前提、影响范围。',
      '按可利用性与影响排序，优先修复可远程触发且无需高权限的问题。',
      '缓解措施要能验证；接受的风险写明理由与复查时间。',
    ].join('\n'),
  },
  {
    id: 'secrets-scan',
    name: 'secrets-scan',
    title: '密钥泄漏排查',
    description: '检查源码、日志、配置与提交历史中的密钥痕迹，并给出轮换步骤。',
    tags: ['安全', '质量'],
    body: [
      '# 密钥泄漏排查',
      '',
      '扫描源码、示例配置、日志、截图、构建产物与 git 历史。',
      '发现疑似密钥时不要在回复中回显完整内容，只报告位置与类型。',
      '给出处置顺序：立即轮换 → 清理历史 → 加忽略规则 → 增加提交前检查。',
      '历史清理需要明确授权，避免误删他人提交。',
    ].join('\n'),
  },
  {
    id: 'dependency-audit',
    name: 'dependency-audit',
    title: '依赖审计',
    description: '检查依赖的漏洞、维护状态、许可证与体积，给出升级或替换建议。',
    tags: ['安全', '开发'],
    body: [
      '# 依赖审计',
      '',
      '先列出直接依赖，再查已知漏洞、最近发布时间、维护者与许可证。',
      '区分运行时与开发依赖；能删的依赖优先删除。',
      '升级前确认破坏性变更与替代方案，给出回滚路径。',
      '不引入来源不明或许可证不兼容的包。',
    ].join('\n'),
  },
  {
    id: 'auth-review',
    name: 'auth-review',
    title: '认证授权审查',
    description: '检查会话、令牌、权限边界与越权路径，按最小权限原则修正。',
    tags: ['安全', '开发', '架构'],
    body: [
      '# 认证授权审查',
      '',
      '确认：谁能登录、令牌如何存储与过期、权限在哪一层校验。',
      '重点检查水平/垂直越权、默认允许、客户端可控的角色字段。',
      '敏感操作要求服务端再次校验，不信任前端隐藏按钮。',
      '错误信息不泄漏账号是否存在等枚举线索。',
    ].join('\n'),
  },
  {
    id: 'web-security',
    name: 'web-security',
    title: 'Web 安全审查',
    description: '覆盖 XSS、CSRF、SSRF、注入、开放重定向与文件上传边界。',
    tags: ['安全', '浏览器'],
    body: [
      '# Web 安全审查',
      '',
      '按输入来源逐项检查：HTML 输出、URL 跳转、服务端请求、命令与查询拼接、上传文件。',
      '默认拒绝：白名单协议与主机，限制重定向与内网地址。',
      'Cookie 设置 HttpOnly/SameSite/Secure；CSP 最小放行。',
      '给出可复现的触发条件与最小修复。',
    ].join('\n'),
  },
  {
    id: 'privacy-review',
    name: 'privacy-review',
    title: '隐私合规检查',
    description: '核对数据采集范围、留存、脱敏与第三方共享，避免超范围收集。',
    tags: ['安全', '文档'],
    body: [
      '# 隐私合规检查',
      '',
      '逐项列出采集字段、用途、存储位置、保留时长与访问者。',
      '默认不采集与功能无关的数据；日志与埋点做脱敏。',
      '第三方请求说明发送内容与目的，提供关闭方式。',
      '删除与导出路径必须可用，并验证实际效果。',
    ].join('\n'),
  },
  {
    id: 'incident-response',
    name: 'incident-response',
    title: '故障应急',
    description: '按止损、取证、恢复、复盘四步处理线上故障，保留可追溯记录。',
    tags: ['安全', '系统'],
    body: [
      '# 故障应急',
      '',
      '1. 止损：先降级或回滚，避免扩大影响。',
      '2. 取证：保留日志、时间线与变更记录，不覆盖现场。',
      '3. 恢复：小步验证，确认核心路径后再全量。',
      '4. 复盘：写清根因、影响、发现方式与改进项，改进项要有负责人和期限。',
    ].join('\n'),
  },
  {
    id: 'supply-chain',
    name: 'supply-chain',
    title: '供应链安全',
    description: '检查构建来源、锁文件、安装脚本与发布流程，降低投毒风险。',
    tags: ['安全', '架构'],
    body: [
      '# 供应链安全',
      '',
      '确认依赖来源、版本锁定与完整性校验；禁止无锁安装。',
      '审查安装脚本与二进制下载地址，默认禁用不必要的 postinstall。',
      '构建与发布使用最小权限令牌，产物可追溯。',
      '发现可疑包时停止安装并给出替代方案。',
    ].join('\n'),
  },
  {
    id: 'design-tokens',
    name: 'design-tokens',
    title: '设计令牌',
    description: '把颜色、间距、字号与层级整理成可复用令牌，统一主题与对比度。',
    tags: ['设计', '前端'],
    body: [
      '# 设计令牌',
      '',
      '先盘点现有硬编码值，按语义命名（背景/文字/边界/强调/状态）。',
      '深浅主题共用同一套语义令牌，不直接引用色值。',
      '文字与背景对比度至少达到 WCAG AA；状态色同时提供图标或文字。',
      '改动令牌后全量检查关键界面，避免局部失衡。',
    ].join('\n'),
  },
  {
    id: 'accessibility-review',
    name: 'accessibility-review',
    title: '无障碍审查',
    description: '按键盘操作、焦点、语义与对比度检查界面，给出可验证的修复项。',
    tags: ['设计', '质量'],
    body: [
      '# 无障碍审查',
      '',
      '检查：键盘可到达、焦点可见、语义标签正确、图片有替代文本、对比度达标。',
      '自定义控件补齐 role、状态与键盘行为。',
      '动效尊重 reduced-motion；错误提示不只用颜色表达。',
      '每条问题给位置、影响与最小修复。',
    ].join('\n'),
  },
  {
    id: 'responsive-review',
    name: 'responsive-review',
    title: '响应式检查',
    description: '在常见宽度与缩放下检查布局、触控目标与内容溢出。',
    tags: ['设计', '浏览器'],
    body: [
      '# 响应式检查',
      '',
      '至少覆盖 360、768、1024、1440 宽度与 200% 缩放。',
      '检查横向滚动、文字截断、固定宽度、触控目标小于 44px 等问题。',
      '优先用流式布局与换行，不靠隐藏关键功能适配小屏。',
      '给出复现步骤与最小修复。',
    ].join('\n'),
  },
  {
    id: 'component-spec',
    name: 'component-spec',
    title: '组件规格',
    description: '描述组件的状态、变体、交互与边界，作为实现与验收的共同依据。',
    tags: ['设计', '架构'],
    body: [
      '# 组件规格',
      '',
      '列出：用途、状态（默认/悬停/聚焦/禁用/加载/错误）、尺寸与密度。',
      '说明键盘交互、无障碍属性、内容长度极限与空态。',
      '定义组合规则与不可用组合，避免实现时临时发挥。',
      '验收以状态矩阵为准，不以单张效果图为准。',
    ].join('\n'),
  },
  {
    id: 'ux-copy',
    name: 'ux-copy',
    title: '界面文案',
    description: '把按钮、提示与错误信息改写成清晰、可行动的中文文案。',
    tags: ['设计', '文档'],
    body: [
      '# 界面文案',
      '',
      '按钮用动词开头，说明结果；错误信息写清原因与下一步动作。',
      '避免术语堆叠与模糊表达（“出错了”“请稍后”）。',
      '保持同一概念同一称呼，中英文混排时加必要空格。',
      '不夸大、不承诺无法验证的结果。',
    ].join('\n'),
  },
  {
    id: 'motion-review',
    name: 'motion-review',
    title: '动效审查',
    description: '检查过渡的时长、缓动与信息作用，避免干扰操作或引发不适。',
    tags: ['设计', '浏览器'],
    body: [
      '# 动效审查',
      '',
      '动效只服务于状态变化与空间关系，不做无意义装饰。',
      '常规过渡 120–220ms，避免同时移动多个大区域。',
      '必须支持 prefers-reduced-motion，并保留清晰的状态反馈。',
      '检查动画是否阻塞输入、造成布局抖动或重复触发。',
    ].join('\n'),
  },
  {
    id: 'branch-plan',
    name: 'branch-plan',
    title: '分支规划',
    description: '按改动风险拆分分支与提交，保证每个提交可独立验证和回滚。',
    tags: ['Git', '架构'],
    body: [
      '# 分支规划',
      '',
      '先确定基线分支与发布节奏，再决定分支数量。',
      '一个分支只做一件事；大改拆成可独立合并的步骤。',
      '提交信息说明原因与影响，不混入格式化噪音。',
      '合并前同步基线并跑完整验证，冲突时不覆盖他人改动。',
    ].join('\n'),
  },
  {
    id: 'pr-review',
    name: 'pr-review',
    title: 'PR 评审',
    description: '按范围、正确性、安全与测试检查合并请求，给出可执行的评审意见。',
    tags: ['Git', '质量'],
    body: [
      '# PR 评审',
      '',
      '先确认改动范围与目标一致，排除无关文件与生成物。',
      '重点看边界、错误处理、权限、数据迁移与回滚。',
      '评论指向具体行，说明触发条件与建议改法。',
      '没有问题时说明验证过的场景，不写空泛的“LGTM”。',
    ].join('\n'),
  },
  {
    id: 'merge-conflict',
    name: 'merge-conflict',
    title: '合并冲突处理',
    description: '理解双方意图后合并冲突，保留必要逻辑并补充验证。',
    tags: ['Git', '开发'],
    body: [
      '# 合并冲突处理',
      '',
      '先读双方提交与相关测试，判断冲突是语义冲突还是格式冲突。',
      '不要用“取一边”快速了事；逐段确认两边的业务意图。',
      '解决后运行受影响范围的测试，并检查是否遗漏调用方。',
      '不提交冲突标记、临时文件或调试代码。',
    ].join('\n'),
  },
  {
    id: 'history-audit',
    name: 'history-audit',
    title: '提交历史审计',
    description: '检查历史中的密钥、大文件、误提交与许可证问题，给出处置建议。',
    tags: ['Git', '安全'],
    body: [
      '# 提交历史审计',
      '',
      '检查：敏感信息、构建产物、超大文件、第三方代码与许可证头。',
      '区分“需要重写历史”和“后续提交修正”两种情况。',
      '重写历史必须获得授权，并提前通知协作者与备份。',
      '报告只给位置与类型，不回显密钥内容。',
    ].join('\n'),
  },
  {
    id: 'ci-debug',
    name: 'ci-debug',
    title: 'CI 排查',
    description: '从失败日志定位环境、依赖、缓存与并发问题，给出最小修复。',
    tags: ['Git', '测试'],
    body: [
      '# CI 排查',
      '',
      '先找第一处真实错误，忽略后续级联失败。',
      '对比本地与 CI 的版本、环境变量、缓存与文件大小写差异。',
      '不通过跳过测试或放宽超时掩盖问题；确需调整时说明依据。',
      '修复后连续观察两轮，确认不是偶发通过。',
    ].join('\n'),
  },
  {
    id: 'git-recover',
    name: 'git-recover',
    title: 'Git 恢复',
    description: '在误删分支、误重置或丢失提交时，用 reflog 安全找回。',
    tags: ['Git', '系统'],
    body: [
      '# Git 恢复',
      '',
      '先停止一切写操作，确认丢失范围与最后一次正确提交。',
      '用 reflog / fsck 查找对象，先创建备份分支再恢复。',
      '不直接 reset --hard 覆盖工作区；优先用 cherry-pick 或新分支。',
      '恢复后核对文件内容与测试，再清理临时分支。',
    ].join('\n'),
  },
  {
    id: 'schema-design',
    name: 'schema-design',
    title: '数据模型设计',
    description: '从查询与一致性需求反推表结构、索引与约束。',
    tags: ['数据', '架构'],
    body: [
      '# 数据模型设计',
      '',
      '先列出核心查询与写入频率，再决定范式化与冗余。',
      '明确主键、唯一约束、外键与级联策略。',
      '为高频过滤与排序建索引，避免无谓索引拖慢写入。',
      '给出迁移与回滚方案，兼容旧数据。',
    ].join('\n'),
  },
  {
    id: 'migration-review',
    name: 'migration-review',
    title: '迁移审查',
    description: '检查数据库或配置迁移的可逆性、锁表风险与旧数据兼容。',
    tags: ['数据', '开发'],
    body: [
      '# 迁移审查',
      '',
      '确认：迁移是否可逆、是否锁表、是否兼容旧版本读写。',
      '大表变更分批执行，先加可空列再回填，最后加约束。',
      '上线顺序：迁移 → 应用 → 清理，避免新旧版本同时写入出错。',
      '准备回滚脚本并在预发验证。',
    ].join('\n'),
  },
  {
    id: 'etl-plan',
    name: 'etl-plan',
    title: '数据管道设计',
    description: '设计抽取、清洗、校验与增量同步流程，保证可重跑与可观测。',
    tags: ['数据', '架构'],
    body: [
      '# 数据管道设计',
      '',
      '明确数据源、变更频率、增量键与迟到数据策略。',
      '每一步可重跑且幂等；失败可从中断点恢复。',
      '记录行数、耗时、失败原因与数据质量指标。',
      '敏感字段在入仓前脱敏，访问按最小权限。',
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
  {
    id: 'fetch',
    name: 'fetch',
    title: '网页抓取',
    description: '把网页转成 Markdown 供模型阅读，适合查文档与单页资料；遵守目标站点规则。',
    tags: ['搜索', '文档', '开发'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
  },
  {
    id: 'git-server',
    name: 'git',
    title: 'Git 操作',
    description: '查看提交、差异、分支与文件历史，只读优先。',
    tags: ['Git', '开发'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git', '--repository', '.'],
  },
  {
    id: 'time',
    name: 'time',
    title: '时间与时区',
    description: '获取当前时间、时区换算与日期计算，避免模型自行猜测日期。',
    tags: ['系统', '协作'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-time'],
  },
  {
    id: 'postgres',
    name: 'postgres',
    title: 'PostgreSQL',
    description: '只读查询 PostgreSQL 数据库结构；数据库连接串需自行配置。',
    tags: ['数据', '系统'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    envHint: 'DATABASE_URL=postgresql://user:pass@localhost:5432/db',
    needsConfig: true,
  },
  {
    id: 'puppeteer',
    name: 'puppeteer',
    title: 'Puppeteer 浏览器',
    description: '无头浏览器导航、点击与截图，适合自动化验证；官方已标注为归档项目，优先用 Playwright。',
    tags: ['浏览器', '测试'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
  },
  {
    id: 'gitlab',
    name: 'gitlab',
    title: 'GitLab',
    description: '读取 GitLab 项目、Issue 与合并请求；需要访问令牌。',
    tags: ['Git', '协作'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gitlab'],
    envHint: 'GITLAB_PERSONAL_ACCESS_TOKEN=',
    needsConfig: true,
  },
  {
    id: 'sentry',
    name: 'sentry',
    title: 'Sentry 错误追踪',
    description: '查询线上错误、堆栈与发布记录，定位真实故障；需要 Sentry 令牌。',
    tags: ['质量', '安全', '系统'],
    command: 'npx',
    args: ['-y', '@sentry/mcp-server'],
    envHint: 'SENTRY_ACCESS_TOKEN=',
    needsConfig: true,
  },
  {
    id: 'notion',
    name: 'notion',
    title: 'Notion 知识库',
    description: '读取与更新 Notion 页面和数据库，适合接项目文档；需要集成令牌。',
    tags: ['文档', '协作'],
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    envHint: 'NOTION_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'figma',
    name: 'figma',
    title: 'Figma 设计稿',
    description: '读取设计稿结构、样式与切图信息，辅助还原界面；需要 Figma 访问令牌。',
    tags: ['设计'],
    command: 'npx',
    args: ['-y', 'figma-developer-mcp'],
    envHint: 'FIGMA_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'firecrawl',
    name: 'firecrawl',
    title: 'Firecrawl 抓取',
    description: '批量抓取网站并转为结构化文本；需要 API Key，遵守站点条款。',
    tags: ['搜索', '浏览器'],
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    envHint: 'FIRECRAWL_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'exa',
    name: 'exa',
    title: 'Exa 语义搜索',
    description: '按语义检索网页与资料，适合找同类项目与论文；需要 API Key。',
    tags: ['搜索', '文档'],
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    envHint: 'EXA_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'tavily',
    name: 'tavily',
    title: 'Tavily 搜索',
    description: '面向 AI 的网页搜索与摘要，适合快速调研；需要 API Key。',
    tags: ['搜索'],
    command: 'npx',
    args: ['-y', 'tavily-mcp'],
    envHint: 'TAVILY_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'markitdown',
    name: 'markitdown',
    title: '文档转换',
    description: '把 PDF、Office、图片等转换为 Markdown，便于检索与引用。',
    tags: ['文档', '数据'],
    command: 'uvx',
    args: ['markitdown-mcp'],
  },
  {
    id: 'arxiv',
    name: 'arxiv',
    title: 'arXiv 论文',
    description: '检索论文元数据与摘要，适合技术调研；下载全文前先确认授权。',
    tags: ['文档', '搜索'],
    command: 'uvx',
    args: ['arxiv-mcp-server'],
  },
  {
    id: 'duckduckgo',
    name: 'duckduckgo',
    title: 'DuckDuckGo 搜索',
    description: '免密钥网页搜索，作为内置搜索源的补充。',
    tags: ['搜索'],
    command: 'uvx',
    args: ['duckduckgo-mcp-server'],
  },
  {
    id: 'deepwiki',
    name: 'deepwiki',
    title: '仓库文档问答',
    description: '针对公开 GitHub 仓库生成结构化说明，快速理解项目设计。',
    tags: ['文档', '搜索', '开发'],
    command: 'npx',
    args: ['-y', 'mcp-deepwiki@latest'],
  },
  {
    id: 'supabase',
    name: 'supabase',
    title: 'Supabase',
    description: '查询 Supabase 项目、表结构与日志；需要访问令牌。',
    tags: ['数据', '架构'],
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase'],
    envHint: 'SUPABASE_ACCESS_TOKEN=',
    needsConfig: true,
  },
  {
    id: 'kubernetes',
    name: 'kubernetes',
    title: 'Kubernetes',
    description: '查看集群资源、Pod 状态与日志；权限较大，仅在本地 kubeconfig 可用时使用。',
    tags: ['系统', '架构'],
    command: 'npx',
    args: ['-y', 'mcp-server-kubernetes'],
  },
  {
    id: 'grafana',
    name: 'grafana',
    title: 'Grafana 监控',
    description: '查询仪表盘、指标与告警，辅助定位性能问题；需要服务地址与令牌。',
    tags: ['系统', '质量'],
    command: 'npx',
    args: ['-y', 'mcp-grafana'],
    envHint: 'GRAFANA_URL=\nGRAFANA_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'browserbase',
    name: 'browserbase',
    title: 'Browserbase 云端浏览器',
    description: '在云端浏览器执行自动化任务；需要 API Key，不用于规避访问控制。',
    tags: ['浏览器'],
    command: 'npx',
    args: ['-y', '@browserbasehq/mcp'],
    envHint: 'BROWSERBASE_API_KEY=\nBROWSERBASE_PROJECT_ID=',
    needsConfig: true,
  },
  {
    id: 'apify',
    name: 'apify',
    title: 'Apify 数据采集',
    description: '运行公开的采集 Actor 获取结构化数据；需要 API Key，遵守目标站点条款。',
    tags: ['浏览器', '数据'],
    command: 'npx',
    args: ['-y', '@apify/actors-mcp-server'],
    envHint: 'APIFY_TOKEN=',
    needsConfig: true,
  },
  {
    id: 'slack',
    name: 'slack',
    title: 'Slack 协作',
    description: '读取频道消息与发送通知；需要 Bot 令牌，注意不要发送敏感内容。',
    tags: ['协作'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    envHint: 'SLACK_BOT_TOKEN=\nSLACK_TEAM_ID=',
    needsConfig: true,
  },
  {
    id: 'google-maps',
    name: 'google-maps',
    title: '地图与地点',
    description: '地址解析、路线与地点检索；需要 Google Maps API Key。',
    tags: ['搜索', '系统'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    envHint: 'GOOGLE_MAPS_API_KEY=',
    needsConfig: true,
  },
  {
    id: 'everything',
    name: 'everything',
    title: 'MCP 示例工具集',
    description: '官方示例服务器，用于验证 MCP 连接与调试工具调用。',
    tags: ['系统', '开发'],
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
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
  {
    id: '@juicesharp/rpiv-todo',
    name: '@juicesharp/rpiv-todo',
    title: '任务清单',
    description: '在对话中维护待办清单，压缩会话后仍能保留，适合长任务跟踪。',
    tags: ['协作', '开发'],
    builtin: true,
    version: '2.13.9',
    source: 'npm',
  },
  {
    id: 'openwiki',
    name: 'openwiki',
    title: '项目文档生成',
    description: '为代码库生成并维护结构化 Wiki，帮助快速理解项目设计。',
    tags: ['文档', '开发'],
    builtin: true,
    version: '0.7.2',
    source: 'npm',
  },
  {
    id: 'context-mode',
    name: 'context-mode',
    title: '上下文压缩',
    description: '通过语义检索与按需加载减少上下文占用，主打节省 token。',
    tags: ['文档', '开发', '搜索'],
    builtin: true,
    version: '1.0.169',
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

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (host === '[::1]' || host.startsWith('fc') || host.startsWith('fd')) return true;
  return false;
}

function githubSkillCandidates(parsed: URL): string[] {
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parsed.hostname === 'github.com' && parts.length >= 2) {
    const [owner, repo, kind, ...rest] = parts;
    if (kind === 'blob' && rest.length >= 2) {
      return [`https://raw.githubusercontent.com/${owner}/${repo}/${rest[0]}/${rest.slice(1).join('/')}`];
    }
    if (kind === 'tree') {
      const branch = rest[0] || 'main';
      const prefix = rest.slice(1).join('/');
      return [`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${prefix ? `${prefix}/` : ''}SKILL.md`];
    }
    if (!kind) {
      return ['main', 'master'].map((branch) => `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`);
    }
  }
  return [parsed.toString()];
}

async function fetchSkillText(rawUrl: string): Promise<{ text?: string; error?: string }> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return { error: t('链接无效') };
  }
  for (let hop = 0; hop < 4; hop += 1) {
    if (current.protocol !== 'https:' || isPrivateHost(current.hostname)) {
      return { error: t('只支持公网 https 链接') };
    }
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(12_000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { error: t('链接跳转失败') };
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) return { error: `HTTP ${response.status}` };
    const text = (await response.text()).slice(0, 512_000);
    return { text };
  }
  return { error: t('链接跳转次数过多') };
}

// 支持 GitHub 文件/目录/仓库链接与任意公网 SKILL.md 地址；只读取文本，不执行内容
export async function fetchSkillFromUrl(
  rawUrl: string,
): Promise<{ ok: boolean; name?: string; description?: string; body?: string; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: t('链接无效') };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: t('只支持公网 https 链接') };
  let lastError = t('读取失败');
  for (const candidate of githubSkillCandidates(parsed)) {
    try {
      const fetched = await fetchSkillText(candidate);
      if (!fetched.text) {
        if (fetched.error) lastError = fetched.error;
        continue;
      }
      const text = fetched.text;
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
      const meta: Record<string, string> = {};
      if (frontmatter) {
        for (const line of frontmatter[1].split(/\r?\n/)) {
          const match = /^([A-Za-z_-]+):\s*(.+)$/.exec(line);
          if (match) meta[match[1].toLowerCase()] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
      }
      const body = frontmatter ? text.slice(frontmatter[0].length).trim() : text.trim();
      if (!body) {
        lastError = t('链接内容为空');
        continue;
      }
      const fallbackName = new URL(candidate).pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'imported-skill';
      const name = (meta.name || fallbackName).replace(/[^\w.-]/g, '-').slice(0, 60);
      if (!name) {
        lastError = t('无法识别 Skill 名称');
        continue;
      }
      return { ok: true, name, description: (meta.description || '').slice(0, 300), body };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { ok: false, error: lastError };
}
