#!/usr/bin/env bash
# Uruchamia wszystkie testy aplikacji „Automat do Reklam TikTok – PRO”.
set -u
cd "$(dirname "$0")/.."

NODE_MODULES_DIR="${NODE_MODULES_DIR:-/tmp/tt/node_modules}"
if [ ! -d "$NODE_MODULES_DIR/jsdom" ]; then
  echo "→ Instaluję jsdom w $NODE_MODULES_DIR (tylko na potrzeby testów)…"
  mkdir -p "$(dirname "$NODE_MODULES_DIR")"
  (cd "$(dirname "$NODE_MODULES_DIR")" && npm install --silent --no-fund --no-audit jsdom)
fi
export NODE_PATH="$NODE_MODULES_DIR"

fails=0
run() { echo; echo "=== $1 ==="; node "$2" || fails=$((fails + 1)); }

run "Testy jednostkowe (silnik lokalny, eksporty, presety, pamięć)" tests/unit.test.js
run "Testy E2E (hurt, presety, storyboard, CSV, pamięć)"             tests/e2e.test.js
run "Testy API (OpenAI / Gemini / custom / reasoning / partie)"       tests/api.test.js

echo
if [ "$fails" -eq 0 ]; then
  echo "✅ WSZYSTKIE ZESTAWY TESTOW PRZESZLY"
else
  echo "❌ ZESTAWY Z BLEDAMI: $fails"
fi
exit "$fails"
