#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found."
  echo "Install from https://www.python.org/downloads/ or run: brew install python"
  exit 1
fi

for f in index.html app.js style.css server.py; do
  if [[ ! -f "$f" ]]; then
    echo "Error: missing $f"
    echo "Run this from the tribe-neural-analyzer project folder:"
    echo "  cd ~/tribe-neural-analyzer"
    exit 1
  fi
done

PORT="${PORT:-8080}"

if python3 -c "import fastapi, uvicorn" 2>/dev/null; then
  echo "Installing lightweight server deps (if needed)..."
  python3 -m pip install --user fastapi uvicorn python-multipart numpy pandas 2>/dev/null || \
    python3 -m pip install fastapi uvicorn python-multipart numpy pandas
  echo ""
  echo "Starting full server at http://127.0.0.1:${PORT}"
  python3 -m uvicorn server:app --host 127.0.0.1 --port "$PORT" --reload
else
  echo "FastAPI not installed — using simple static server (enough for the UI + Cloud Run)."
  echo ""
  exec bash serve-ui.sh
fi
