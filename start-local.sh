#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found."
  echo "Install Python 3 from https://www.python.org/downloads/ or run: brew install python"
  exit 1
fi

echo "Installing server dependencies..."
python3 -m pip install --user fastapi uvicorn python-multipart numpy pandas

echo ""
echo "Starting TRIBE Neural Analyzer at http://localhost:8080"
echo "Press Ctrl+C to stop."
echo ""
python3 -m uvicorn server:app --host 127.0.0.1 --port 8080 --reload
