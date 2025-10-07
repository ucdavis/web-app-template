#!/usr/bin/env bash
set -e

echo "🔧 Running post-create setup..."

# Wait for SQL to be ready
bash .devcontainer/wait-for-sql.sh

# Restore .NET tools and packages
echo "📦 Restoring .NET tools and packages..."
(cd server && dotnet restore && dotnet tool restore)

# Install frontend dependencies
echo "📦 Installing client dependencies..."
(cd client && npm install)

# Make EF helper scripts executable
echo "⚙️ Making EF helper scripts executable..."
chmod +x server.core/*.sh

echo "✅ Dev container setup complete."
