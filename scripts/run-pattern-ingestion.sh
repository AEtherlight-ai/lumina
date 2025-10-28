#!/bin/bash
#
# Run Pattern Ingestion Script
#
# DESIGN DECISION: Use npx ts-node to run TypeScript directly (no build step)
# WHY: Simple one-off script, no need for compilation
#
# USAGE:
#   export SUPABASE_URL="https://your-project.supabase.co"
#   export SUPABASE_SERVICE_KEY="your-service-key"
#   export VOYAGE_API_KEY="your-voyage-key"
#   bash scripts/run-pattern-ingestion.sh

set -e  # Exit on error

echo "🚀 Pattern Ingestion Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: SUPABASE_URL not set"
  echo "   Set with: export SUPABASE_URL='https://your-project.supabase.co'"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_KEY not set"
  echo "   Set with: export SUPABASE_SERVICE_KEY='your-service-key'"
  exit 1
fi

if [ -z "$VOYAGE_API_KEY" ]; then
  echo "❌ Error: VOYAGE_API_KEY not set"
  echo "   Set with: export VOYAGE_API_KEY='your-voyage-key'"
  exit 1
fi

echo "✅ Environment variables set"
echo ""

# Check if @supabase/supabase-js is installed globally or locally
if ! npx --version &> /dev/null; then
  echo "❌ Error: npx not found. Install Node.js first."
  exit 1
fi

echo "✅ npx found"
echo ""

# Check if ts-node is available
if ! npx ts-node --version &> /dev/null; then
  echo "⏳ Installing ts-node..."
  npm install -g ts-node typescript
fi

echo "✅ ts-node ready"
echo ""

# Install dependencies if needed (in script directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  echo "⏳ Installing dependencies..."
  npm init -y 2>/dev/null || true
  npm install @supabase/supabase-js
fi

echo "✅ Dependencies ready"
echo ""

# Run ingestion script
echo "⏳ Running pattern ingestion..."
echo ""
npx ts-node ingest-patterns.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Pattern ingestion script complete"
