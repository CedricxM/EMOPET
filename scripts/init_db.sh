#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "DB_PASSWORD must be set before starting PostgreSQL." >&2
  exit 1
fi

docker compose up -d db

echo "PostgreSQL started."
echo "Drizzle migrations were NOT run: the checked-in migration baseline remains an OPEN/BLOCKED gate."
