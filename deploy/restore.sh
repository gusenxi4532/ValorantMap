#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 1 ]; then echo '用法: bash deploy/restore.sh backups/备份文件.tar.gz' >&2; exit 1; fi
archive="$(realpath "$1")"
if docker compose ps --status running --services | grep -qx app; then echo '请先停止应用，并选择新的空DATA_VOLUME_NAME数据卷。' >&2; exit 1; fi
if [ ! -f "$archive.sha256" ]; then echo '缺少.sha256校验文件' >&2; exit 1; fi
expected="$(awk '{print $1}' "$archive.sha256")"
actual="$(sha256sum "$archive" | awk '{print $1}')"
[ "$expected" = "$actual" ] || { echo '备份校验失败' >&2; exit 1; }
docker compose run --rm --no-deps -T --user 0:0 --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE -v "$archive:/restore/archive.tar.gz:ro" --entrypoint sh app -c '
  if [ -n "$(ls -A /data)" ]; then echo "拒绝覆盖非空数据卷" >&2; exit 1; fi
  tar -xzf /restore/archive.tar.gz -C /data --no-same-owner
  chown -R 1000:1000 /data
  chmod -R go-rwx /data
'
echo '恢复完成。运行 docker compose up -d 并核对页面、登录与媒体。'
