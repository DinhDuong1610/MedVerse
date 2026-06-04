#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_USER:=medverse_user}"
: "${POSTGRES_DB:=medverse}"

echo "Copy seed SQL into postgres container..."
docker compose cp seed-data/sql/02_ai_medications_from_atc.sql postgres:/tmp/02_ai_medications_from_atc.sql
docker compose cp seed-data/sql/01_demo_reset_core.sql postgres:/tmp/01_demo_reset_core.sql
docker compose cp seed-data/sql/03_rich_demo_clinical_data.sql postgres:/tmp/03_rich_demo_clinical_data.sql

echo "Import AI medications..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/02_ai_medications_from_atc.sql

echo "Reset core demo data..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/01_demo_reset_core.sql

echo "Seed rich clinical demo data..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/03_rich_demo_clinical_data.sql

echo "Done."
