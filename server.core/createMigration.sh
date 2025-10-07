#!/usr/bin/env bash
# Usage: ./createMigration.sh MigrationName

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <MigrationName>"
  exit 1
fi

MIGRATION_NAME=$1
ROOT_DIR="$(dirname "$0")/.."

echo "📦 Creating migration '$MIGRATION_NAME'..."
dotnet ef migrations add "$MIGRATION_NAME" -p "$ROOT_DIR/server.core" -s "$ROOT_DIR/server"

echo "✅ Migration created successfully."
