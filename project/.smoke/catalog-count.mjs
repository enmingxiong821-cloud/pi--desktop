import fs from 'node:fs';

const source = fs.readFileSync('backend/catalog.ts', 'utf8');
function readArray(name) {
  const start = source.indexOf(`const ${name}`);
  const open = source.indexOf('[', start);
  const close = source.indexOf('\n];', open);
  return eval(source.slice(open, close + 2));
}
const skills = readArray('SKILLS');
const mcps = readArray('MCPS');
const extensions = readArray('EXTENSIONS');
const CATEGORIES = [
  ['开发', ['开发', '代码', '编程', '调试', 'code', 'dev', 'debug', 'refactor']],
  ['测试', ['测试', 'test', 'playwright', 'e2e']],
  ['质量', ['质量', '审查', '评审', '审阅', 'review', 'lint', 'quality']],
  ['安全', ['安全', 'security', 'audit']],
  ['设计', ['设计', '前端', '界面', 'ui', 'design', 'frontend']],
  ['架构', ['架构', '规划', '发布', 'architecture', 'plan', 'release']],
  ['数据', ['数据', 'sql', 'data', 'database']],
  ['文档', ['文档', '研究', 'documentation', 'docs', 'research']],
  ['搜索', ['搜索', '检索', '联网', 'search', 'web', 'fetch']],
  ['浏览器', ['浏览器', 'browser', 'chrome']],
  ['系统', ['系统', '终端', '文件', 'system', 'terminal', 'shell', 'filesystem']],
  ['Git', ['git', 'github', 'gitlab']],
  ['协作', ['协作', 'agent', '记忆', '推理', '交互', 'memory', 'thinking', 'team']],
];
const ESCAPE = /[.*+?^${}()|[\]\\]/g;
function includesWord(haystack, word) {
  const lower = word.toLowerCase();
  if (/[一-鿿]/.test(lower)) return haystack.includes(lower);
  return new RegExp(`(^|[^a-z0-9])${lower.replace(ESCAPE, '\\$&')}([^a-z0-9]|$)`).test(haystack);
}
function categories(item) {
  const haystack = `${item.title} ${item.name} ${item.description} ${(item.tags ?? []).join(' ')}`.toLowerCase();
  const found = CATEGORIES.filter(([, words]) => words.some((word) => includesWord(haystack, word))).map(([label]) => label);
  return found.length ? found : ['其他'];
}
for (const [label, list] of [['skills', skills], ['mcps', mcps], ['extensions', extensions]]) {
  const counts = {};
  for (const item of list) for (const category of categories(item)) counts[category] = (counts[category] ?? 0) + 1;
  console.log(label, list.length, JSON.stringify(counts));
}
