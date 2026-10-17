import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { t } from './i18n.js';

/**
 * 自定义网站：只保存名称与 http/https 地址，供可视化面板一键打开。
 * 不做账号、Cookie 或页面内容采集，也不上传到任何服务。
 */
export interface CustomLink {
  id: string;
  name: string;
  url: string;
}

const LINK_LIMIT = 50;
let links: CustomLink[] = [];
let storePath: string | null = null;

function persist(): void {
  if (!storePath) return;
  try {
    mkdirSync(path.dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify(links, null, 2), 'utf8');
  } catch {
    // 写入失败时保留内存态，避免中断当前操作
  }
}

export function configureCustomLinks(file: string): void {
  storePath = file;
  links = [];
  if (!existsSync(file)) return;
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) return;
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const url = typeof record.url === 'string' ? record.url.trim() : '';
      if (!name || !isSafeUrl(url)) continue;
      links.push({
        id: typeof record.id === 'string' && record.id.startsWith('custom-link-')
          ? record.id
          : `custom-link-${links.length + 1}`,
        name: name.slice(0, 40),
        url,
      });
    }
  } catch {
    // 配置损坏时按空列表处理
  }
}

function isSafeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function listCustomLinks(): CustomLink[] {
  return links.map((link) => ({ ...link }));
}

export function saveCustomLink(input: unknown): { ok: boolean; link?: CustomLink; error?: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const source = input as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const url = typeof source.url === 'string' ? source.url.trim() : '';
  if (!name) return { ok: false, error: t('请填写网站名称') };
  if (name.length > 40) return { ok: false, error: t('网站名称过长') };
  if (!isSafeUrl(url)) return { ok: false, error: t('只支持 http / https 链接') };
  if (links.length >= LINK_LIMIT) return { ok: false, error: t('自定义网站已达上限（{n} 个）', { n: LINK_LIMIT }) };
  const link: CustomLink = {
    id: `custom-link-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name,
    url,
  };
  links.push(link);
  persist();
  return { ok: true, link: { ...link } };
}

export function removeCustomLink(id: unknown): { ok: boolean; error?: string } {
  if (typeof id !== 'string' || !id.startsWith('custom-link-')) return { ok: false, error: t('参数无效') };
  const index = links.findIndex((link) => link.id === id);
  if (index < 0) return { ok: false, error: t('未找到该网站') };
  links.splice(index, 1);
  persist();
  return { ok: true };
}
