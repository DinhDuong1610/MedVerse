# Chạy từ root project trên PowerShell.
# Điều kiện: đang ở nhánh demo, docker compose đang chạy postgres.

$ErrorActionPreference = "Stop"

Write-Host "Import AI medications..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f /seed-data/sql/02_ai_medications_from_atc.sql

Write-Host "Reset core demo data..." -ForegroundColor Cyan
docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -v ON_ERROR_STOP=1 -f /seed-data/sql/01_demo_reset_core.sql

Write-Host "Done." -ForegroundColor Green
