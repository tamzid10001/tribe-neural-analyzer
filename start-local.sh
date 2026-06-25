#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q fastapi uvicorn python-multipart numpy pandas 2>/dev/null || true
echo "Starting TRIBE Neural Analyzer at http://localhost:8080"
python3 -m uvicorn server:app --host 0.0.0.0 --port 8080 --reload
