// 开发环境诊断：不执行候选程序，不读取凭据，不安装依赖。
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

export const requiredDirectories = ['doc', 'prototype', 'project/frontend', 'project/backend', 'database', 'utils'];

export async function checkDirectories(root) {
  return Promise.all(requiredDirectories.map(async (name) => {
    try {
      return { name, exists: (await stat(path.join(root, name))).isDirectory() };
    } catch (error) {
      return { name, exists: false, reason: error.code ?? 'UNKNOWN' };
    }
  }));
}

// 只发现 PATH 中的候选文件；不推断其版本、身份或启动结果。
export async function findPi(pathValue = process.env.PATH ?? '', platform = process.platform) {
  const windows = platform === 'win32';
  const names = windows ? ['pi.exe', 'pi.cmd', 'pi.bat', 'pi.ps1'] : ['pi'];
  const candidates = [];
  for (const directory of pathValue.split(windows ? ';' : ':').filter(Boolean)) {
    for (const name of names) {
      const candidate = path.resolve(directory.replace(/^"|"$/g, ''), name);
      try {
        if (!(await stat(candidate)).isFile()) continue;
        await access(candidate, windows ? constants.F_OK : constants.X_OK);
        if (!candidates.includes(candidate)) candidates.push(candidate);
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code)) throw error;
      }
    }
  }
  return candidates;
}

// 短暂绑定 IPv4 回环地址后释放；这是即时检查，不是端口预留。
export async function probePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('端口必须是 1 至 65535 的整数');
  }
  return new Promise((resolve) => {
    const controller = new AbortController();
    const server = createServer((socket) => socket.destroy());
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ port, host: '127.0.0.1', ...result });
    };
    const timer = setTimeout(() => {
      controller.abort();
      finish({ available: false, reason: 'TIMEOUT' });
    }, 2000);
    server.on('error', (error) => finish({ available: false, reason: error.code ?? 'UNKNOWN' }));
    server.listen({ port, host: '127.0.0.1', exclusive: true, signal: controller.signal }, () => {
      server.close((error) => finish(error
        ? { available: false, reason: error.code ?? 'CLOSE_FAILED' }
        : { available: true }));
    });
  });
}

export function assess(report) {
  const blockers = [];
  if (Number(report.node.replace(/^v/, '').split('.')[0]) < 22) blockers.push('诊断工具要求 Node.js 22 或更高版本');
  if (report.directories.some((item) => !item.exists)) blockers.push('项目目录缺失或不可访问');
  if (!report.piCandidates.length) blockers.push('PATH 中未找到 Pi 候选入口；无法开始真实 Pi 终端验证');
  if (report.ports.some((item) => !item.available)) blockers.push('候选端口无法绑定，需要重新分配');
  return blockers;
}

async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const report = {
    node: process.version,
    platform: process.platform,
    directories: await checkDirectories(root),
    piCandidates: await findPi(),
    ports: await Promise.all([1420, 2420].map(probePort)),
    limitations: ['未执行 Pi，未检查模型认证', '端口仅检查 IPv4 回环即时可绑定性，未预留', '未扫描其他项目的端口登记，端口尚未批准使用'],
  };
  report.blockers = assess(report);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.blockers.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`诊断未完成：${error.code ?? error.name}`);
    process.exitCode = 2;
  });
}
