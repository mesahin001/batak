#!/usr/bin/env bash
# Publish a signed APK and tell installed apps an update exists.
#   scripts/release-apk.sh <apk> <versionName> <versionCode> [minVersionCode] [notes_en] [notes_tr]
# Uploads to ~/app/downloads/batak.apk (previous one kept as batak-prev-<date>.apk), then writes
# data/app-version.json inside batak-server, which GET /api/app-version serves. No server restart.
# minVersionCode forces installs below it to update (default: no forced update).
# dApp Store: set storeUrl via STORE_URL=https://... when the listing is live.
set -euo pipefail

APK=${1:?apk path}; VERSION=${2:?version name}; CODE=${3:?version code}
MIN=${4:-}; NOTES_EN=${5:-}; NOTES_TR=${6:-}
HOST=${BATAK_HOST:-batak@91.99.218.37}
BASE=${BATAK_BASE_URL:-https://batakci.xyz}

[[ -f "$APK" ]] || { echo "no such file: $APK" >&2; exit 1; }
[[ "$CODE" =~ ^[0-9]+$ ]] || { echo "versionCode must be a number" >&2; exit 1; }
SHA=$(sha256sum "$APK" | cut -d' ' -f1)

echo "uploading $APK ($SHA)"
scp -q "$APK" "$HOST:app/downloads/batak.apk.new"
ssh "$HOST" "cd app/downloads && [ -f batak.apk ] && cp -p batak.apk batak-prev-\$(date +%Y%m%d-%H%M).apk; mv batak.apk.new batak.apk && chmod 644 batak.apk"

REMOTE=$(curl -fsSL "$BASE/downloads/batak.apk" | sha256sum | cut -d' ' -f1)
[[ "$REMOTE" == "$SHA" ]] || { echo "served APK hash differs ($REMOTE); manifest NOT updated" >&2; exit 1; }

JSON=$(VERSION="$VERSION" CODE="$CODE" MIN="$MIN" SHA="$SHA" BASE="$BASE" EN="$NOTES_EN" TR="$NOTES_TR" STORE_URL="${STORE_URL:-}" python3 - <<'PY'
import json, os
e = os.environ
m = {"latestVersion": e["VERSION"], "latestVersionCode": int(e["CODE"]),
     "apkUrl": e["BASE"] + "/downloads/batak.apk", "sha256": e["SHA"]}
if e["MIN"]: m["minVersionCode"] = int(e["MIN"])
if e["STORE_URL"]: m["storeUrl"] = e["STORE_URL"]
notes = {k: e[v] for k, v in (("en", "EN"), ("tr", "TR")) if e[v]}
if notes: m["notes"] = notes
print(json.dumps(m, ensure_ascii=False, indent=2))
PY
)
printf '%s\n' "$JSON" | ssh "$HOST" "docker exec -i batak-server sh -c 'cat > data/app-version.json.tmp && mv data/app-version.json.tmp data/app-version.json'"
echo "manifest written:"; echo "$JSON"
