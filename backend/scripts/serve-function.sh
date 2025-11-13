#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: SUPABASE_ENV_TARGET=local $0 <function-name> [extra supabase args]" >&2
  exit 1
fi

TARGET="${SUPABASE_ENV_TARGET:-local}"
ENV_FILE=".env.${TARGET}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Environment file ${ENV_FILE} not found. Create it before running this script." >&2
  exit 1
fi

FUNCTION_NAME="$1"
shift || true

echo "→ Serving function '${FUNCTION_NAME}' using ${ENV_FILE}"
npx supabase functions serve "${FUNCTION_NAME}" --env-file "${ENV_FILE}" "$@"
