#!/usr/bin/env bash
# Usage: ./updateDatabase.sh [MigrationName]
# If no MigrationName is given, updates to latest.

set -e

ROOT_DIR="$(dirname "$0")/.."

if [ -z "$1" ]; then
  echo "🚀 Updating database to latest migration..."
  dotnet ef database update -p "$ROOT_DIR/server.core" -s "$ROOT_DIR/server"
else
  echo "🚀 Updating database to migration '$1'..."
  dotnet ef database update "$1" -p "$ROOT_DIR/server.core" -s "$ROOT_DIR/server"
fi

echo "✅ Database updated successfully."
