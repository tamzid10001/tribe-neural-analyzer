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

PORT="${PORT:-8080}"
echo "Serving UI at http://localhost:${PORT}"
echo "Cloud backend: https://tribe-backend-351432107547.us-central1.run.app"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" --bind 127.0.0.1
