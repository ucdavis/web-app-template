#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-sql}"
PORT="${2:-1433}"

echo "Waiting for SQL Server at ${HOST}:${PORT}..."
for i in {1..60}; do
  if /bin/bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
    echo "SQL port is accepting connections."
    # Optional lightweight query
    if command -v sqlcmd >/dev/null 2>&1; then
      if sqlcmd -S ${HOST},${PORT} -U sa -P "${MSSQL_SA_PASSWORD:-Your_strong_password_123}" -Q "SELECT 1" -b -o /dev/null 2>/dev/null; then
        echo "SQL responded to query."
        exit 0
      fi
    else
      exit 0
    fi
  fi
  sleep 2
done

echo "ERROR: SQL did not become ready in time." >&2
exit 1