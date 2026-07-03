#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[reset] Stopping and removing database containers and volumes..."
docker compose down -v

echo "[reset] Starting fresh database containers..."
docker compose up -d postgres qdrant

echo "[reset] Waiting for Postgres to become ready..."
until docker compose exec -T postgres pg_isready -U qa_user -d qa_task >/dev/null 2>&1; do
  sleep 1
done

echo "[reset] Running backend migrations..."
if command -v bun >/dev/null 2>&1; then
  (cd backend && bun run migrate)
else
  (cd backend && npm run migrate)
fi

echo "[reset] Done. Databases are reset and migrated."
