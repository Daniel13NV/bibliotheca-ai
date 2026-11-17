#!/usr/bin/env bash
# Copia el código compartido (services/_shared) a cada microservicio.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/services/_shared"
for svc in users-service catalog-service loans-service rfid-service notifications-service; do
  mkdir -p "$ROOT/services/$svc/src/shared"
  cp "$SHARED"/*.ts "$ROOT/services/$svc/src/shared/"
  echo "✔ $svc"
done
mkdir -p "$ROOT/services/ai-service/src/shared"
for f in "$SHARED"/*.ts; do
  [ "$(basename "$f")" = "database.ts" ] || cp "$f" "$ROOT/services/ai-service/src/shared/"
done
echo "✔ ai-service"
