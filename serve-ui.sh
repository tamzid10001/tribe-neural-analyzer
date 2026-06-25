#!/usr/bin/env bash
# Serve the UI with zero pip dependencies. Cloud scans use Cloud Run automatically.
set -euo pipefail
cd "$(dirname "$0")"

for f in index.html app.js style.css; do
  if [[ ! -f "$f" ]]; then
    echo "Error: missing $f — run this script from the tribe-neural-analyzer folder."
    exit 1
  fi
done

pick_port() {
  local start="${1:-8080}"
  local end="${2:-8099}"
  local port
  for port in $(seq "$start" "$end"); do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

if [[ -n "${PORT:-}" ]]; then
  CHOSEN_PORT="$PORT"
else
  if lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port 8080 is already in use."
    lsof -nP -iTCP:8080 -sTCP:LISTEN 2>/dev/null || true
    CHOSEN_PORT="$(pick_port 8081 8099)" || {
      echo "Error: no free port found between 8081-8099."
      echo "Stop the other server with: kill \$(lsof -ti :8080)"
      exit 1
    }
    echo "Using port ${CHOSEN_PORT} instead."
  else
    CHOSEN_PORT="8080"
  fi
fi

echo "Serving UI at http://127.0.0.1:${CHOSEN_PORT}"
echo "Cloud backend: https://tribe-backend-351432107547.us-central1.run.app"
echo "Press Ctrl+C to stop."
python3 -m http.server "$CHOSEN_PORT" --bind 127.0.0.1
