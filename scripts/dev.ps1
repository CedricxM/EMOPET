param(
  [switch]$Web
)

$ErrorActionPreference = 'Stop'

if (-not $env:DB_PASSWORD) {
  throw 'DB_PASSWORD must be set in the local environment before starting PostgreSQL.'
}

Write-Host '[dev] Starting local PostgreSQL...' -ForegroundColor Cyan
docker compose up -d db

if (-not $env:DATABASE_URL) {
  $dbUser = if ($env:DB_USER) { $env:DB_USER } else { 'emopet' }
  $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'emopet' }
  $env:DATABASE_URL = "postgres://$dbUser:$($env:DB_PASSWORD)@127.0.0.1:5432/$dbName"
  Write-Host '[dev] DATABASE_URL derived for this PowerShell session.' -ForegroundColor DarkGray
}

Write-Warning 'Drizzle migrations are NOT run automatically. The migration baseline remains a controlled OPEN/BLOCKED gate.'

if ($Web) {
  Write-Host '[dev] Starting monorepo dev tasks (backend + web + other workspace dev tasks)...' -ForegroundColor Green
  pnpm dev
} else {
  Write-Host '[dev] Starting Hono API workspace...' -ForegroundColor Green
  pnpm backend:dev
}
