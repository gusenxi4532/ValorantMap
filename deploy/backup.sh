#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
archive="backups/senxi-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
if ! docker compose ps --status running --services | grep -qx app; then
  echo '应用未运行。请确认数据卷和配置后手动备份。' >&2
  exit 1
fi
trap 'docker compose start app >/dev/null' EXIT
docker compose stop app
docker compose run --rm --no-deps -T --user 1000:1000 --entrypoint tar app -C /data -czf - . > "$archive"
tar -tzf "$archive" >/dev/null
sha256sum "$archive" > "$archive.sha256"
echo "已生成 $archive 和校验文件；请另存到受保护的异地存储。"
