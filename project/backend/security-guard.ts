// 授权与目标校验：所有对外请求（抓取、被动基线、主动扫描）都必须先经过这里。
// 纯函数 + Node 标准库，不依赖 Electron，便于单独测试。
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

export interface NormalizedTarget {
  url: string;
  host: string;
  port: number;
  scheme: 'http' | 'https';
}

export interface AuthorizationInput {
  url: string;
  hostConfirm: string;
  statement: boolean;
  note: string;
  allowLocal?: boolean;
}

export interface AuthorizationResult {
  ok: boolean;
  target?: NormalizedTarget;
  ips?: string[];
  error?: string;
}

export interface PublicFetchOptions {
  allowLocal?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  method?: string;
}

export interface PublicFetchResult {
  ok: boolean;
  status?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  url?: string;
  ip?: string;
  error?: string;
}

const IPV4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const METADATA_IPV4 = new Set(['169.254.169.254', '169.254.170.2', '100.100.100.200', '192.0.0.192']);
const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'metadata',
  'metadata.azure.internal',
]);

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return -1;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return -1;
    const octet = Number(part);
    if (octet > 255) return -1;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function inV4Block(ip: string, base: string, bits: number): boolean {
  const value = ipv4ToInt(ip);
  const start = ipv4ToInt(base);
  if (value < 0 || start < 0) return false;
  const size = 2 ** (32 - bits);
  return value >= start && value < start + size;
}

function expandIpv6(ip: string): string[] | undefined {
  let value = ip.toLowerCase();
  const zone = value.indexOf('%');
  if (zone >= 0) value = value.slice(0, zone);
  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const tail = value.slice(lastColon + 1);
    if (isIP(tail) !== 4) return undefined;
    const n = ipv4ToInt(tail);
    value = `${value.slice(0, lastColon + 1)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (halves.length === 1 && head.length !== 8) return undefined;
  if (head.length + tail.length > 8) return undefined;
  const fill = new Array(8 - head.length - tail.length).fill('0');
  return [...head, ...fill, ...tail].map((part) => {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return 'x';
    return part.padStart(4, '0');
  });
}

function v6StartsWith(groups: string[], hex: string, bits: number): boolean {
  if (groups.some((part) => part === 'x')) return false;
  const actual = BigInt(`0x${groups.join('')}`);
  const target = BigInt(`0x${hex.padEnd(32, '0')}`);
  const shift = BigInt(128 - bits);
  return actual >> shift === target >> shift;
}

export function isCloudMetadataIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase();
  if (isIP(clean) === 4) return METADATA_IPV4.has(clean);
  const groups = expandIpv6(clean);
  if (!groups) return clean === 'fd00:ec2::254';
  const embedded = embeddedIpv4(groups);
  if (embedded && METADATA_IPV4.has(embedded)) return true;
  return v6StartsWith(groups, 'fd000ec2', 32) && groups.join('').endsWith('0000000000000254');
}

// IPv4 映射、NAT64、6to4、Teredo 都可能把内网 IPv4 藏进 IPv6，必须还原后再判断。
function embeddedIpv4(groups: string[]): string | undefined {
  const g = groups.map((part) => Number.parseInt(part, 16));
  if (g.some((value) => Number.isNaN(value))) return undefined;
  const v4 = (hi: number, lo: number) => `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;

  if (g.slice(0, 5).every((value) => value === 0) && g[5] === 0xffff) {
    return v4(g[6], g[7]);
  }
  // 64:ff9b::/96 与 64:ff9b:1::/48
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0 && g.slice(3, 6).every((value) => value === 0)) {
    return v4(g[6], g[7]);
  }
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 1) {
    return v4(g[6], g[7]);
  }
  // 2002::/16 6to4
  if (g[0] === 0x2002) {
    return v4(g[1], g[2]);
  }
  // 2001::/32 Teredo：客户端 IPv4 取反后放在最后 32 位
  if (g[0] === 0x2001 && g[1] === 0) {
    return v4(g[6] ^ 0xffff, g[7] ^ 0xffff);
  }
  return undefined;
}

// CGNAT 段 100.64/10 同时覆盖阿里云 100.100.100.200，因此单独保留 metadata 判断。
export function isForbiddenIp(ip: string, allowLocal = false): boolean {
  const clean = ip.trim().toLowerCase();
  if (isCloudMetadataIp(clean)) return true;
  if (!allowLocal) {
    if (isIP(clean) === 4) {
      return IPV4_BLOCKS.some(([base, bits]) => inV4Block(clean, base, bits));
    }
    if (isIP(clean) === 6) {
      const groups = expandIpv6(clean);
      if (!groups || groups.includes('x')) return true;
      const embedded = embeddedIpv4(groups);
      if (embedded && isForbiddenIp(embedded, false)) return true;
      const flat = groups.join('');
      if (flat === '00000000000000000000000000000000') return true;
      if (flat === '00000000000000000000000000000001') return true;
      return (
        v6StartsWith(groups, 'fc00', 7)
        || v6StartsWith(groups, 'fe80', 10)
        || v6StartsWith(groups, 'ff00', 8)
        || v6StartsWith(groups, '20010db8', 32)
        || v6StartsWith(groups, '20010002', 48)
        || v6StartsWith(groups, '0064ff9b0001', 48)
      );
    }
    return true;
  }
  return isIP(clean) === 0;
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

export function normalizeTarget(raw: string, options: { allowLocal?: boolean } = {}): { ok: boolean; target?: NormalizedTarget; error?: string } {
  const input = String(raw ?? '').trim();
  if (!input) return { ok: false, error: '目标不能为空' };
  if (/\s/.test(input)) return { ok: false, error: '目标不能包含空白字符或目标列表' };
  if (input.includes('*')) return { ok: false, error: '不支持通配符或网段，请填写单个目标' };
  if (/^[0-9a-fA-F:.]+(?:%[\w.]+)?\/\d{1,3}$/.test(input)) return { ok: false, error: '不支持 CIDR 网段，请填写单个主机' };
  if (/[,;]/.test(input)) return { ok: false, error: '一次只允许一个目标' };

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: '目标不是合法 URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: '只支持 http / https 目标' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: '目标不能包含用户名或密码' };
  }
  const host = stripBrackets(parsed.hostname.toLowerCase()).replace(/\.$/, '');
  if (!host) return { ok: false, error: '目标缺少主机名' };
  if (host.includes('*')) return { ok: false, error: '不支持通配符目标' };
  if (METADATA_HOSTS.has(host)) return { ok: false, error: '拒绝访问云元数据地址' };
  if (!options.allowLocal) {
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.home.arpa')) {
      return { ok: false, error: '该主机名指向本机或内网；如确需测试请开启「本机 / 实验目标」' };
    }
    if (isIP(host) && isForbiddenIp(host, false)) {
      return { ok: false, error: '目标地址属于内网、回环或保留网段；如确需测试请开启「本机 / 实验目标」' };
    }
  } else if (isIP(host) && isCloudMetadataIp(host)) {
    return { ok: false, error: '云元数据地址永远不允许访问' };
  }

  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: '端口不合法' };
  }
  parsed.hash = '';
  return {
    ok: true,
    target: { url: parsed.toString(), host, port, scheme: parsed.protocol === 'https:' ? 'https' : 'http' },
  };
}

export async function resolveTargetHost(host: string): Promise<{ ok: boolean; ips?: string[]; error?: string }> {
  if (isIP(host)) return { ok: true, ips: [host] };
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    const ips = [...new Set(records.map((item) => item.address))];
    if (!ips.length) return { ok: false, error: '域名未解析到任何地址' };
    return { ok: true, ips };
  } catch (error) {
    return { ok: false, error: `域名解析失败：${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function validateAuthorization(input: AuthorizationInput): Promise<AuthorizationResult> {
  if (!input.statement) return { ok: false, error: '请先确认你拥有该目标的测试授权' };
  if (String(input.note ?? '').trim().length < 10) {
    return { ok: false, error: '请在授权说明里写明授权来源与范围（至少 10 个字）' };
  }
  const normalized = normalizeTarget(input.url, { allowLocal: Boolean(input.allowLocal) });
  if (!normalized.ok || !normalized.target) return { ok: false, error: normalized.error };
  const target = normalized.target;

  if (String(input.hostConfirm ?? '').trim().toLowerCase().replace(/\.$/, '') !== target.host) {
    return { ok: false, error: `请完整键入目标主机名「${target.host}」以确认授权` };
  }

  const resolved = await resolveTargetHost(target.host);
  if (!resolved.ok || !resolved.ips) return { ok: false, error: resolved.error };
  if (resolved.ips.some((ip) => isCloudMetadataIp(ip))) {
    return { ok: false, error: '云元数据地址永远不允许访问' };
  }
  if (!input.allowLocal && resolved.ips.some((ip) => isForbiddenIp(ip, false))) {
    return { ok: false, error: '该域名解析到内网或保留地址；如确需测试请开启「本机 / 实验目标」' };
  }
  if (resolved.ips.some((ip) => isForbiddenIp(ip, Boolean(input.allowLocal)))) {
    return { ok: false, error: '解析结果包含不可访问的地址' };
  }
  return { ok: true, target, ips: resolved.ips };
}

export function isLocalTarget(target: NormalizedTarget, ips: string[]): boolean {
  return ips.some((ip) => isForbiddenIp(ip, false));
}

function requestOnce(
  target: NormalizedTarget,
  ip: string,
  options: PublicFetchOptions,
): Promise<PublicFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const parsed = new URL(target.url);
  const hostHeader = target.port === (target.scheme === 'https' ? 443 : 80) ? target.host : `${target.host}:${target.port}`;
  const requestFn = target.scheme === 'https' ? httpsRequest : httpRequest;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: PublicFetchResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const req = requestFn(
      {
        host: ip,
        port: target.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method ?? 'GET',
        timeout: timeoutMs,
        servername: target.scheme === 'https' ? target.host : undefined,
        // 证书仍按用户访问的主机名校验；IP 只用于连接，避免 DNS 二次解析被换绑。
        headers: {
          Host: hostHeader,
          'User-Agent': 'PiWorkbench/1.3 (authorized security testing; contact target owner)',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          ...options.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy();
            finish({ ok: false, status: res.statusCode, error: `响应超过 ${Math.round(maxBytes / 1024 / 1024)}MB 上限`, url: target.url, ip });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          finish({
            ok: true,
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            url: target.url,
            ip,
          });
        });
        res.on('error', (error) => finish({ ok: false, error: error.message, url: target.url, ip }));
      },
    );
    req.on('timeout', () => {
      req.destroy();
      finish({ ok: false, error: `请求超时（${Math.round(timeoutMs / 1000)}s）`, url: target.url, ip });
    });
    req.on('error', (error) => finish({ ok: false, error: error.message, url: target.url, ip }));
    req.end();
  });
}

export async function fetchPublicUrl(raw: string, options: PublicFetchOptions = {}): Promise<PublicFetchResult> {
  let current = raw;
  let last: PublicFetchResult = { ok: false, error: '未发起请求' };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const normalized = normalizeTarget(current, { allowLocal: options.allowLocal });
    if (!normalized.ok || !normalized.target) return { ok: false, error: normalized.error };
    const target = normalized.target;
    const resolved = await resolveTargetHost(target.host);
    if (!resolved.ok || !resolved.ips) return { ok: false, error: resolved.error };
    const ip = resolved.ips.find((item) => !isForbiddenIp(item, Boolean(options.allowLocal)));
    if (!ip) return { ok: false, error: '目标地址不可访问' };

    last = await requestOnce(target, ip, options);
    if (!last.ok) return last;
    const location = last.headers?.location;
    const redirect = Array.isArray(location) ? location[0] : location;
    if (last.status && last.status >= 300 && last.status < 400 && redirect) {
      try {
        current = new URL(redirect, target.url).toString();
      } catch {
        return { ok: false, error: '重定向地址不合法' };
      }
      continue;
    }
    return last;
  }
  return { ...last, ok: false, error: `重定向超过 ${MAX_REDIRECTS} 次` };
}
