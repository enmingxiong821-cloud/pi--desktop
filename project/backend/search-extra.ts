// GitHub 项目检索与公共代码检索（grep.app）；只发送查询词，不读取本机密钥。
import { t } from './i18n.js';

export interface RepoResult {
  name: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
  topics: string[];
  license: string;
}

export interface CodeResult {
  repo: string;
  path: string;
  url: string;
  snippet: string;
}

const UA = 'PiWorkbench/1.0 (local research tool; contact via project repository)';
const TIMEOUT_MS = 15_000;
const MAX_QUERY = 200;

function cleanQuery(query: unknown): string {
  if (typeof query !== 'string') return '';
  return query.trim().slice(0, MAX_QUERY);
}

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function searchRepos(queryInput: unknown): Promise<{ ok: boolean; results: RepoResult[]; error?: string }> {
  const query = cleanQuery(queryInput);
  if (!query) return { ok: false, results: [], error: t('填写搜索内容') };
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': UA,
    'x-github-api-version': '2022-11-28',
  };
  // 允许用户自行提供只读 token 提高限额；不会读取或写入 Pi 的凭证
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (response.status === 403 || response.status === 429) {
      return { ok: false, results: [], error: t('GitHub 接口限流，请稍后再试或设置 GITHUB_TOKEN') };
    }
    if (!response.ok) return { ok: false, results: [], error: `GitHub HTTP ${response.status}` };
    const payload = (await response.json()) as { items?: Array<Record<string, unknown>> };
    const results = (payload.items ?? []).map((item) => {
      const license = item.license && typeof item.license === 'object'
        ? text((item.license as Record<string, unknown>).spdx_id, 40)
        : '';
      return {
        name: text(item.name, 120),
        fullName: text(item.full_name, 200),
        url: text(item.html_url, 500),
        description: text(item.description, 400),
        stars: number(item.stargazers_count),
        forks: number(item.forks_count),
        language: text(item.language, 60),
        updatedAt: text(item.updated_at, 40),
        topics: Array.isArray(item.topics) ? item.topics.filter((tag): tag is string => typeof tag === 'string').slice(0, 6) : [],
        license,
      };
    }).filter((item) => item.url);
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function searchCode(queryInput: unknown): Promise<{ ok: boolean; results: CodeResult[]; error?: string }> {
  const query = cleanQuery(queryInput);
  if (!query) return { ok: false, results: [], error: t('填写搜索内容') };
  try {
    const response = await fetch(
      `https://grep.app/api/search?q=${encodeURIComponent(query)}&page=1`,
      { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!response.ok) return { ok: false, results: [], error: `grep.app HTTP ${response.status}` };
    const payload = (await response.json()) as {
      hits?: { hits?: Array<Record<string, unknown>> };
    };
    const results = (payload.hits?.hits ?? []).slice(0, 12).map((hit) => {
      const repo = hit.repo && typeof hit.repo === 'object' ? text((hit.repo as Record<string, unknown>).raw, 200) : '';
      const file = hit.path && typeof hit.path === 'object' ? text((hit.path as Record<string, unknown>).raw, 300) : '';
      const content = hit.content && typeof hit.content === 'object'
        ? text((hit.content as Record<string, unknown>).snippet, 1200)
        : '';
      return {
        repo,
        path: file,
        url: repo ? `https://github.com/${repo}` : '',
        snippet: stripHtml(content),
      };
    }).filter((item) => item.repo && item.snippet);
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}
