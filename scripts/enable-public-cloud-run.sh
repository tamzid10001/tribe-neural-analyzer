#!/usr/bin/env bash
# Grant unauthenticated invoke access to the TRIBE v2 Cloud Run backend (Option B).
set -euo pipefail

SERVICE_NAME="${CLOUD_RUN_SERVICE:-tribe-backend}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
BACKEND_URL="${TRIBE_BACKEND_URL:-https://tribe-backend-351432107547.us-central1.run.app}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  echo "Error: No active gcloud account. Run: gcloud auth login"
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "Error: GCP project not set."
  echo "  gcloud config set project YOUR_PROJECT_ID"
  echo "  # or: GCP_PROJECT_ID=your-project-id $0"
  exit 1
fi

echo "Project:  $PROJECT_ID"
echo "Service:  $SERVICE_NAME"
echo "Region:   $REGION"
echo ""
echo "Granting roles/run.invoker to allUsers..."

gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --member="allUsers" \
  --role="roles/run.invoker"

echo ""
echo "Verifying ${BACKEND_URL}/status ..."
HTTP_CODE="$(curl -sS -o /tmp/tribe-status.json -w "%{http_code}" --max-time 20 "${BACKEND_URL}/status")"
cat /tmp/tribe-status.json
echo ""
echo "HTTP ${HTTP_CODE}"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Success — Cloud Run is now publicly reachable."
else
  echo "IAM binding applied, but /status returned ${HTTP_CODE}."
  echo "Confirm the backend URL matches your deployed service."
  exit 1
fi
