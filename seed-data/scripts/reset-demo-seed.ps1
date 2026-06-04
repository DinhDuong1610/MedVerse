# Chạy từ root project trên PowerShell.
# Điều kiện: docker compose đang chạy postgres.

$ErrorActionPreference = "Stop"

if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = "medverse_user" }
if (-not $env:POSTGRES_DB) { $env:POSTGRES_DB = "medverse" }

Write-Host "Copy seed SQL into postgres container..." -ForegroundColor Cyan
docker compose cp seed-data/sql/02_ai_medications_from_atc.sql postgres:/tmp/02_ai_medications_from_atc.sql
docker compose cp seed-data/sql/01_demo_reset_core.sql postgres:/tmp/01_demo_reset_core.sql
docker compose cp seed-data/sql/03_rich_demo_clinical_data.sql postgres:/tmp/03_rich_demo_clinical_data.sql

Write-Host "Import AI medications..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f /tmp/02_ai_medications_from_atc.sql

Write-Host "Reset core demo data..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f /tmp/01_demo_reset_core.sql

Write-Host "Seed rich clinical demo data..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f /tmp/03_rich_demo_clinical_data.sql

Write-Host "Done." -ForegroundColor Green
