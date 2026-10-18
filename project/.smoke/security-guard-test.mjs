// 安全守卫纯函数测试：不联网，只验证地址分类与授权校验。
import { isCloudMetadataIp, isForbiddenIp, normalizeTarget, validateAuthorization } from './security-guard.bundle.mjs';

const failures = [];
function check(name, actual, expected) {
  if (actual !== expected) failures.push(`${name}: 期望 ${expected}，实际 ${actual}`);
}

for (const ip of ['0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.1.1', '172.20.1.1', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255']) {
  check(`v4 拒绝 ${ip}`, isForbiddenIp(ip), true);
}
for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
  check(`公网放行 ${ip}`, isForbiddenIp(ip), false);
}
for (const ip of ['::1', '::', 'fd00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::7f00:1', '2002:7f00:1::1', '2001:0:0:0:0:0:ffff:fffe']) {
  check(`v6 拒绝 ${ip}`, isForbiddenIp(ip), true);
}
check('本机开关放行 127.0.0.1', isForbiddenIp('127.0.0.1', true), false);
check('本机开关放行 10.0.0.1', isForbiddenIp('10.0.0.1', true), false);
check('元数据永不放行', isForbiddenIp('169.254.169.254', true), true);
check('IPv6 映射元数据', isCloudMetadataIp('::ffff:169.254.169.254'), true);
check('阿里云元数据', isCloudMetadataIp('100.100.100.200'), true);
check('公网非元数据', isCloudMetadataIp('1.1.1.1'), false);

check('空目标拒绝', normalizeTarget('').ok, false);
check('CIDR 拒绝', normalizeTarget('10.0.0.0/8').ok, false);
check('通配符拒绝', normalizeTarget('https://*.example.com').ok, false);
check('目标列表拒绝', normalizeTarget('https://a.com,https://b.com').ok, false);
check('文件协议拒绝', normalizeTarget('file:///C:/Windows').ok, false);
check('带凭据拒绝', normalizeTarget('https://user:pass@example.com').ok, false);
check('内网 IP 拒绝', normalizeTarget('https://10.0.0.1').ok, false);
check('内网开关放行', normalizeTarget('http://127.0.0.1:8080', { allowLocal: true }).ok, true);
check('公网默认 https', normalizeTarget('example.com').target?.url, 'https://example.com/');
check('保留路径', normalizeTarget('https://example.com/a?b=1#c').target?.url, 'https://example.com/a?b=1');

const base = { url: 'https://8.8.8.8', hostConfirm: '8.8.8.8', statement: true, note: '这是授权的本地测试说明' };
check('授权通过', (await validateAuthorization(base)).ok, true);
check('未勾选拒绝', (await validateAuthorization({ ...base, statement: false })).ok, false);
check('说明过短拒绝', (await validateAuthorization({ ...base, note: '太短' })).ok, false);
check('host 不一致拒绝', (await validateAuthorization({ ...base, hostConfirm: '8.8.4.4' })).ok, false);
check('私网目标拒绝', (await validateAuthorization({ ...base, url: 'https://10.0.0.1', hostConfirm: '10.0.0.1' })).ok, false);

console.log(JSON.stringify({ failures, passed: failures.length === 0 }, null, 2));
process.exit(failures.length ? 1 : 0);
