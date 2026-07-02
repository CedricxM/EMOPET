param(
  [string]$FciPath = 'data/fci/pdfs',
  [int]$FciLimit = 0,
  [ValidateSet('true','false')]
  [string]$ExtractImages = 'false',
  [switch]$SkipIngest
)

$ErrorActionPreference = 'Stop'

Write-Host '[dev] Docker compose up (db)...' -ForegroundColor Cyan
docker compose up -d db

Write-Host '[dev] Alembic upgrade head...' -ForegroundColor Cyan
python -m alembic upgrade head

if (-not $SkipIngest) {
  $args = @('scripts/ingest_fci_pdf.py', '--path', $FciPath, '--lang', 'fr', '--extract-images', $ExtractImages)
  if ($FciLimit -gt 0) {
    $args += @('--limit', "$FciLimit")
  }
  Write-Host "[dev] python $($args -join ' ')" -ForegroundColor Cyan
  python @args
}

Write-Host '[dev] Start API...' -ForegroundColor Green
python -m uvicorn src.api.emopet_api:app --reload --host 127.0.0.1 --port 8000
