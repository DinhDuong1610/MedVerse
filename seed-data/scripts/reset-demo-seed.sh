#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_USER:=medverse_user}"
: "${POSTGRES_DB:=medverse}"

echo "Import AI medications..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /seed-data/sql/02_ai_medications_from_atc.sql

echo "Reset core demo data..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /seed-data/sql/01_demo_reset_core.sql

echo "Done."
