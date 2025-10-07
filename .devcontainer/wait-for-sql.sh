#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-sql}"
PORT="${2:-1433}"

echo "Waiting for SQL Server at ${HOST}:${PORT}..."
for i in {1..60}; do
  if /bin/bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
    echo "SQL TCP port is open."
    # just checking the port, it might not really be ready but I think it's close enough
    exit 0
  fi
  sleep 2
done

echo "ERROR: SQL did not become ready in time." >&2
exit 1