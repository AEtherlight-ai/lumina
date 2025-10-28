#!/bin/bash
# Publish all repos (aetherlight, lumina, internal)
#
# DESIGN DECISION: Single command to sync all public repos
# WHY: Convenience, consistency, one-step deployment
#
# Usage: ./scripts/publish-all.sh

set -e

echo "========================================="
echo "  Publishing All ÆtherLight Repositories"
echo "========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Publish ÆtherLight core
echo "1/3: Publishing ÆtherLight Core..."
bash "$SCRIPT_DIR/publish-aetherlight.sh"
echo ""

# Publish Lumina
echo "2/3: Publishing Lumina..."
bash "$SCRIPT_DIR/publish-lumina.sh"
echo ""

# Publish Internal
echo "3/3: Publishing Internal Docs..."
bash "$SCRIPT_DIR/publish-internal.sh"
echo ""

echo "========================================="
echo "  ✅ All Repositories Published!"
echo "========================================="
echo ""
echo "Public Repos:"
echo "  🌐 ÆtherLight: https://github.com/AEtherlight-ai/aetherlight"
echo "  🌐 Lumina:     https://github.com/AEtherlight-ai/lumina"
echo ""
echo "Private Repo:"
echo "  🔐 Internal:   https://github.com/AEtherlight-ai/internal"
echo ""
