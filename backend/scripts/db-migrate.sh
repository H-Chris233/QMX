#!/usr/bin/env sh

set -u

NETWORK_ERROR_PATTERN='DrizzleQueryError|AggregateError|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|getaddrinfo|connect ETIMEDOUT|Temporary failure in name resolution'

if [ "${1:-}" = "--" ]; then
  shift
fi

run_drizzle_migrate() {
  host_addr="${1:-}"
  shift || true

  if [ -n "$host_addr" ]; then
    output="$(DATABASE_URL_MIGRATION_HOSTADDR="$host_addr" NODE_OPTIONS=--dns-result-order=ipv4first drizzle-kit migrate "$@" 2>&1)"
  else
    output="$(NODE_OPTIONS=--dns-result-order=ipv4first drizzle-kit migrate "$@" 2>&1)"
  fi
  exit_code=$?

  printf '%s\n' "$output"

  if printf '%s' "$output" | grep -Eq "$NETWORK_ERROR_PATTERN"; then
    return 1
  fi

  return "$exit_code"
}

if run_drizzle_migrate '' "$@"; then
  exit 0
fi

db_url="${DATABASE_URL_MIGRATION:-${DATABASE_URL:-}}"
if [ -z "$db_url" ]; then
  db_url="$(node -e "const dotenv=require('dotenv');dotenv.config({path:'./.env'});process.stdout.write(process.env.DATABASE_URL_MIGRATION||process.env.DATABASE_URL||'');" 2>/dev/null)"
fi

if [ -z "$db_url" ]; then
  echo '[db:migrate] 缺少 DATABASE_URL_MIGRATION 或 DATABASE_URL，无法执行回退' >&2
  exit 1
fi

db_host="$(node -e "try{const u=new URL(process.argv[1]);process.stdout.write(u.hostname);}catch(e){process.exit(1)}" "$db_url" 2>/dev/null)"
if [ -z "$db_host" ]; then
  echo '[db:migrate] 回退失败：无法从数据库 URL 解析主机名' >&2
  exit 1
fi

host_addr_list=''
if command -v getent >/dev/null 2>&1; then
  host_addr_list="$(getent ahostsv4 "$db_host" 2>/dev/null | awk '{print $1}' | sort -u)"
fi
if [ -z "$host_addr_list" ] && command -v dig >/dev/null 2>&1; then
  host_addr_list="$(dig +short A "$db_host" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$')"
fi
if [ -z "$host_addr_list" ] && command -v host >/dev/null 2>&1; then
  host_addr_list="$(host -t A "$db_host" 2>/dev/null | awk '/ has address /{print $NF}')"
fi

if [ -z "$host_addr_list" ]; then
  echo "[db:migrate] 回退失败：无法解析 $db_host 的 IPv4 地址" >&2
  exit 1
fi

for host_addr in $host_addr_list; do
  echo "[db:migrate] fallback hostaddr=$host_addr (resolved from $db_host)"
  if run_drizzle_migrate "$host_addr" "$@"; then
    exit 0
  fi
done

exit 1
