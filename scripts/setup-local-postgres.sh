#!/bin/bash
# Setup Local PostgreSQL for Dogfooding
#
# DESIGN DECISION: Local Postgres first, Supabase optional
# WHY: True dogfooding - local-first, works offline, privacy-first (matches our product)
#
# REASONING CHAIN:
# 1. User insight: "logical postgres database to start then user can also add supabase"
# 2. Our product philosophy: Local-first, cloud opt-in (Pattern-060)
# 3. Install PostgreSQL 16 locally
# 4. Enable pgvector extension
# 5. Create project_docs table locally
# 6. Result: Fully functional semantic search without internet/Supabase
# 7. Optional: Sync to Supabase later (Node 1 global sync)

set -e

echo "🚀 Local PostgreSQL Setup for Dogfooding"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  OS="windows"
else
  echo "❌ Unsupported OS: $OSTYPE"
  exit 1
fi

echo "📍 Detected OS: $OS"
echo ""

# Install PostgreSQL 16
if [ "$OS" == "mac" ]; then
  echo "📦 Installing PostgreSQL 16 (Homebrew)..."
  if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not installed. Install from https://brew.sh"
    exit 1
  fi
  brew install postgresql@16
  brew services start postgresql@16

  # Add to PATH
  echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

elif [ "$OS" == "linux" ]; then
  echo "📦 Installing PostgreSQL 16 (apt)..."
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc
  sudo apt update
  sudo apt install -y postgresql-16 postgresql-contrib-16
  sudo systemctl start postgresql
  sudo systemctl enable postgresql

elif [ "$OS" == "windows" ]; then
  echo "📦 Installing PostgreSQL 16 (Windows)..."
  echo ""
  echo "⚠️  Manual installation required:"
  echo "1. Download: https://www.postgresql.org/download/windows/"
  echo "2. Run installer (PostgreSQL 16)"
  echo "3. Set password for 'postgres' user"
  echo "4. Enable pgvector during installation"
  echo "5. Re-run this script after installation"
  echo ""
  read -p "Press Enter after PostgreSQL is installed..."
fi

echo ""
echo "✅ PostgreSQL installed"
echo ""

# Install pgvector extension
echo "📦 Installing pgvector extension..."

if [ "$OS" == "mac" ]; then
  brew install pgvector
elif [ "$OS" == "linux" ]; then
  sudo apt install -y postgresql-16-pgvector
elif [ "$OS" == "windows" ]; then
  echo "⚠️  Manual pgvector installation required:"
  echo "1. Download: https://github.com/pgvector/pgvector/releases"
  echo "2. Extract to PostgreSQL extension directory"
  echo "3. Run: CREATE EXTENSION vector; (in psql)"
fi

echo "✅ pgvector installed"
echo ""

# Create database
echo "📦 Creating 'aetherlight_local' database..."

if [ "$OS" == "windows" ]; then
  psql -U postgres -c "CREATE DATABASE aetherlight_local;" || true
else
  createdb aetherlight_local || true
fi

echo "✅ Database created"
echo ""

# Enable pgvector extension
echo "📦 Enabling pgvector extension..."

if [ "$OS" == "windows" ]; then
  psql -U postgres -d aetherlight_local -c "CREATE EXTENSION IF NOT EXISTS vector;"
else
  psql -d aetherlight_local -c "CREATE EXTENSION IF NOT EXISTS vector;"
fi

echo "✅ pgvector enabled"
echo ""

# Create tables
echo "📦 Creating project_docs table..."

SQL_FILE="$(dirname "$0")/create-project-docs-table.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

if [ "$OS" == "windows" ]; then
  psql -U postgres -d aetherlight_local -f "$SQL_FILE"
else
  psql -d aetherlight_local -f "$SQL_FILE"
fi

echo "✅ Tables created"
echo ""

# Set environment variables
echo "📦 Setting environment variables..."

if [ "$OS" == "windows" ]; then
  DB_URL="postgresql://postgres:password@localhost:5432/aetherlight_local"
else
  DB_URL="postgresql://localhost:5432/aetherlight_local"
fi

cat >> ~/.bashrc <<EOF

# ÆtherLight Local Postgres (Dogfooding)
export AETHERLIGHT_DB_URL="$DB_URL"
export AETHERLIGHT_USE_LOCAL=true
EOF

if [ "$OS" == "mac" ]; then
  cat >> ~/.zshrc <<EOF

# ÆtherLight Local Postgres (Dogfooding)
export AETHERLIGHT_DB_URL="$DB_URL"
export AETHERLIGHT_USE_LOCAL=true
EOF
fi

echo "✅ Environment variables set"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Local PostgreSQL Setup Complete!"
echo ""
echo "Database:   aetherlight_local"
echo "URL:        $DB_URL"
echo "Extension:  pgvector (1024-dim vectors)"
echo "Tables:     project_docs (with HNSW index)"
echo ""
echo "Next Steps:"
echo "1. Restart terminal (or: source ~/.bashrc)"
echo "2. Set VOYAGE_API_KEY: export VOYAGE_API_KEY='your-key'"
echo "3. Run ingestion: ts-node scripts/ingest-project-docs.ts"
echo "4. Test search: ts-node scripts/query-context-loader.ts 'query'"
echo ""
echo "Optional: Sync to Supabase later (Node 1 global sync)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
