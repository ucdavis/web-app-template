#!/usr/bin/env bash
set -e

echo "🔧 Running post-create setup..."

# Upgrade npm to latest
echo "⬆️  Upgrading npm to latest..."
npm install -g npm@latest

# Wait for SQL to be ready
bash .devcontainer/wait-for-sql.sh

# Restore .NET tools and packages
echo "📦 Restoring .NET tools and packages..."
(cd server && dotnet restore && dotnet tool restore)

# Install root npm dependencies (for npm-run-all, etc.)
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing client dependencies..."
(cd client && npm install)

# Make EF helper scripts executable
echo "⚙️ Making EF helper scripts executable..."
chmod +x server.core/*.sh

echo "✅ Dev container setup complete."
