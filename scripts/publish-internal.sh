#!/bin/bash
# Publish internal strategy docs to private repo
#
# DESIGN DECISION: Automated sync of strategy docs to separate private repo
# WHY: Keep business strategy isolated, single source of truth
#
# Usage: ./scripts/publish-internal.sh

set -e

echo "📦 Publishing internal docs to private repo..."
echo ""

# Check if remote exists
if ! git remote get-url public-internal >/dev/null 2>&1; then
    echo "⚠️  Remote 'public-internal' not found. Adding it..."
    git remote add public-internal https://github.com/AEtherlight-ai/internal.git
    echo "✅ Remote added"
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Copy only internal strategy docs
echo "Copying internal strategy documents..."
cp BUSINESS_MODEL_V2.md "$TEMP_DIR/"
cp STRATEGIC_ROLLOUT_PLAN.md "$TEMP_DIR/"
cp VIRAL_GROWTH_STRATEGY.md "$TEMP_DIR/"
cp CLAUDE.md "$TEMP_DIR/"
cp DOCUMENT_CLASSIFICATION_MATRIX.md "$TEMP_DIR/"
cp MEMORY_SYSTEM_STARTER_KIT.md "$TEMP_DIR/"
cp PRE_LAUNCH_TRAINING.md "$TEMP_DIR/"
cp PHASE_*.md "$TEMP_DIR/" 2>/dev/null || true
cp -r docs/execution "$TEMP_DIR/docs/" 2>/dev/null || true
cp -r sprint-system "$TEMP_DIR/" 2>/dev/null || true

# Create README
cat > "$TEMP_DIR/README.md" <<EOF
# ÆtherLight Internal

**CLASSIFICATION:** 🔐 PRIVATE - Team & Investors Only

Internal strategy, business model, and execution documentation.

## Contents

- Business model & revenue projections
- Strategic rollout plan
- Viral growth mechanics
- Phase implementation roadmaps
- Execution logs & metrics
- Project memory (CLAUDE.md)

## Related Repositories

- [ÆtherLight Core](https://github.com/AEtherlight-ai/aetherlight) (PUBLIC)
- [Lumina](https://github.com/AEtherlight-ai/lumina) (PUBLIC)

## Security

**DO NOT share publicly.** This documentation is the competitive moat.

---

ÆtherLight Team <noreply@aetherlight.ai>
EOF

# Initialize git in temp directory
cd "$TEMP_DIR"
git init
git config user.name "ÆtherLight Team"
git config user.email "noreply@aetherlight.ai"

# Commit
git add .
git commit -m "docs: sync from development repo

Automated sync of internal strategy documentation.

Co-Authored-By: ÆtherLight Team <noreply@aetherlight.ai>"

# Push to private repo
echo ""
echo "Pushing to github.com/AEtherlight-ai/internal..."
git push https://github.com/AEtherlight-ai/internal.git HEAD:main --force

# Cleanup
cd -
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Internal docs published successfully!"
echo "🔐 https://github.com/AEtherlight-ai/internal (PRIVATE)"
