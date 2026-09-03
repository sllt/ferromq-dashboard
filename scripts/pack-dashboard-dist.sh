#!/usr/bin/env bash
# Build a clean Vite dist/ ready to copy into
#   sllt/ferromq  ferromq-plugins/ferromq-http-api/dashboard-dist/
# Prints the dashboard git commit SHA. Optional: --tarball
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "error: pnpm is required" >&2
  exit 1
fi

SHA="$(git rev-parse HEAD 2>/dev/null || true)"
SHORT="$(git rev-parse --short HEAD 2>/dev/null || true)"
if [[ -z "${SHA}" ]]; then
  echo "error: not a git checkout; cannot stamp commit SHA" >&2
  exit 1
fi

DIRTY=""
if [[ -n "$(git status --porcelain)" ]]; then
  DIRTY="-dirty"
fi

echo "dashboard commit: ${SHA}${DIRTY}"

rm -rf "${ROOT}/dist"
pnpm build

printf '%s%s\n' "${SHA}" "${DIRTY}" > "${ROOT}/dist/COMMIT"

echo
echo "dist ready: ${ROOT}/dist"
echo "sync into ferromq:"
echo "  rsync -a --delete dist/ /path/to/ferromq/ferromq-plugins/ferromq-http-api/dashboard-dist/"

if [[ "${1:-}" == "--tarball" ]]; then
  TARBALL="${ROOT}/ferromq-dashboard-dist-${SHORT}${DIRTY}.tar.gz"
  tar -C "${ROOT}/dist" -czf "${TARBALL}" .
  echo "tarball: ${TARBALL}"
fi
