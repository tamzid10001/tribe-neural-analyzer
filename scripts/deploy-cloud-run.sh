#!/usr/bin/env bash
# Build and deploy the TRIBE backend to Cloud Run.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-bornos-rag}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-tribe-backend}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found."
  exit 1
fi

echo "Building ${IMAGE} ..."
if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "Tip: export HF_TOKEN=hf_... to avoid HuggingFace rate limits during build/runtime."
fi

gcloud builds submit \
  --project "$PROJECT_ID" \
  --config cloudbuild.yaml \
  --substitutions "_IMAGE=${IMAGE},_HF_TOKEN=${HF_TOKEN:-}"

echo "Deploying ${SERVICE_NAME} ..."
DEPLOY_ARGS=(
  run deploy "$SERVICE_NAME"
  --image "$IMAGE"
  --region "$REGION"
  --project "$PROJECT_ID"
  --memory 32Gi
  --cpu 8
  --timeout 900
  --no-invoker-iam-check
)
if [[ -n "${HF_TOKEN:-}" ]]; then
  DEPLOY_ARGS+=(--set-env-vars "HF_TOKEN=${HF_TOKEN}")
fi
gcloud "${DEPLOY_ARGS[@]}"

echo ""
echo "Backend URL:"
gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format='value(status.url)'
