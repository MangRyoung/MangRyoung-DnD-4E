#!/bin/sh
# 올리기 전에 버전 값을 한꺼번에 바꾼다: index.html 의 ?v= 와 meta, version.json
set -e
cd "$(dirname "$0")/.."
V="${1:-$(TZ=Asia/Seoul date +%Y%m%d%H%M)}"
sed -i "s/?v=[0-9]\{12\}/?v=$V/g; s/name=\"d4e-version\" content=\"[0-9]*\"/name=\"d4e-version\" content=\"$V\"/" index.html
printf '{"v":"%s"}\n' "$V" > version.json
echo "version $V"
