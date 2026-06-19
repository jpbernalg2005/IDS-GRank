param(
  [switch]$SkipSeed
)

Write-Host "=== IDS-GRank Setup ===" -ForegroundColor Green

$dockerRunning = docker ps 2>$null
if (-not $?) {
  Write-Host "Docker Desktop no esta corriendo. Inicialo desde el menu Inicio" -ForegroundColor Red
  exit 1
}

Write-Host "[1/4] Construyendo imagenes..." -ForegroundColor Cyan
docker compose build

Write-Host "[2/4] Levantando contenedores..." -ForegroundColor Cyan
docker compose up -d

Write-Host "[3/4] Ejecutando migraciones..." -ForegroundColor Cyan
docker compose exec -T app npx drizzle-kit push 2>&1 | Select-String -NotMatch "npm notice|npm warn"

if (-not $SkipSeed) {
  Write-Host "[4/4] Sembrando datos de prueba..." -ForegroundColor Cyan
  docker compose exec -T app npx tsx src/db/seed.ts 2>&1
}

Write-Host ""
Write-Host "=== App lista! ===" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Usuario demo: demo@grank.com / demo1234" -ForegroundColor Yellow
Write-Host "pgAdmin: http://localhost:5050 (admin@grank.com / admin123)" -ForegroundColor Yellow
