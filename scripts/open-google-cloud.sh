#!/usr/bin/env bash
# Print the hosted Google Cloud app URL (UI + API on same Cloud Run service).
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-bornos-rag}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-tribe-backend}"

if command -v gcloud >/dev/null 2>&1; then
  URL="$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null || true)"
fi

URL="${URL:-https://tribe-backend-351432107547.us-central1.run.app}"

echo "TRIBE Neural Analyzer on Google Cloud:"
echo "  $URL"
echo ""
echo "Open that URL in your browser — UI and TRIBE v2 backend run on the same Cloud Run service."
echo "No localhost required."
