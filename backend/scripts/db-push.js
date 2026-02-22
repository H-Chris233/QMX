#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
const drizzleEntryPath = require.resolve('drizzle-kit', { paths: [backendRoot] });
const drizzleCliPath = path.join(path.dirname(drizzleEntryPath), 'bin.cjs');
dotenv.config({ path: path.join(backendRoot, '.env') });

const migrationUrl = process.env.DATABASE_URL_MIGRATION || process.env.DATABASE_URL;
const networkErrorPattern = /(EAI_AGAIN|ETIMEDOUT|ENETUNREACH|getaddrinfo|connect ETIMEDOUT|Temporary failure in name resolution)/i;

if (!migrationUrl) {
  console.error('[db:push] 缺少 DATABASE_URL_MIGRATION 或 DATABASE_URL');
  process.exit(1);
}

const runDrizzlePush = (extraEnv = {}) => {
  const result = spawnSync(process.execPath, [drizzleCliPath, 'push'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: '--dns-result-order=ipv4first',
      ...extraEnv,
    },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`[db:push] 子进程启动失败: ${result.error.message}\n`);

  return result;
};

const probeHostAddrByPsql = () => {
  const probe = spawnSync('psql', [migrationUrl, '-tAqc', 'select inet_server_addr()::text'], {
    cwd: backendRoot,
    encoding: 'utf8',
  });

  if (probe.status !== 0) {
    if (probe.stderr) process.stderr.write(probe.stderr);
    return null;
  }

  const ip = (probe.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return ip || null;
};

const isSuccess = (result) => !result.error && result.status === 0;
const firstTry = runDrizzlePush();

if (isSuccess(firstTry)) {
  process.exit(0);
}

const output = `${firstTry.stdout || ''}\n${firstTry.stderr || ''}`;
if (!networkErrorPattern.test(output)) {
  process.exit(firstTry.status || 1);
}

const hostAddr = probeHostAddrByPsql();
if (!hostAddr) {
  console.error('[db:push] 回退失败：无法通过 psql 获取可达数据库 IP');
  process.exit(firstTry.status || 1);
}

console.log(`[db:push] 检测到网络/DNS 波动，回退到 hostaddr=${hostAddr}`);

const secondTry = runDrizzlePush({
  DATABASE_URL_MIGRATION_HOSTADDR: hostAddr,
});

if (isSuccess(secondTry)) {
  process.exit(0);
}

process.exit(secondTry.status || 1);
