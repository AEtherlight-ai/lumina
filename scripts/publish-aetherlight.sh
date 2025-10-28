#!/bin/bash
# Publish ÆtherLight core to public repo (filtered)
#
# DESIGN DECISION: Automated sync from development repo to public repo
# WHY: Single source of truth, no code duplication
#
# Usage: ./scripts/publish-aetherlight.sh

set -e

echo "📦 Publishing ÆtherLight core to public repo..."
echo ""

# Check if we're in the right directory
if [ ! -d "crates/aetherlight-core" ]; then
    echo "❌ Error: Must run from repository root"
    exit 1
fi

# Check if remote exists
if ! git remote get-url public-aetherlight >/dev/null 2>&1; then
    echo "⚠️  Remote 'public-aetherlight' not found. Adding it..."
    git remote add public-aetherlight https://github.com/AEtherlight-ai/aetherlight.git
    echo "✅ Remote added"
fi

# Create temporary directory for filtered content
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Copy only public files
echo "Copying ÆtherLight core files..."
cp -r crates "$TEMP_DIR/"
cp -r packages "$TEMP_DIR/"
cp -r docs/vision "$TEMP_DIR/docs/"
cp -r docs/build/CONFIDENCE_SCORING_SYSTEM.md "$TEMP_DIR/docs/build/" 2>/dev/null || true
cp -r docs/build/GIT_SOPs.md "$TEMP_DIR/docs/build/" 2>/dev/null || true
cp -r docs/patterns "$TEMP_DIR/docs/"
cp FULL_FUNCTIONALITY_STATUS.md "$TEMP_DIR/" 2>/dev/null || true
cp LICENSE "$TEMP_DIR/" 2>/dev/null || true
cp README.md "$TEMP_DIR/" 2>/dev/null || true

# Clean build artifacts
find "$TEMP_DIR" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Initialize git in temp directory
cd "$TEMP_DIR"
git init
git config user.name "ÆtherLight Team"
git config user.email "noreply@aetherlight.ai"

# Add .gitignore
cat > .gitignore <<EOF
target/
**/target/
node_modules/
**/node_modules/
*.log
.env
.DS_Store
EOF

# Commit
git add .
git commit -m "chore: sync from development repo

Automated sync of ÆtherLight core infrastructure.

Co-Authored-By: ÆtherLight Team <noreply@aetherlight.ai>"

# Push to public repo
echo ""
echo "Pushing to github.com/AEtherlight-ai/aetherlight..."
git push https://github.com/AEtherlight-ai/aetherlight.git HEAD:main --force

# Cleanup
cd -
rm -rf "$TEMP_DIR"

echo ""
echo "✅ ÆtherLight published successfully!"
echo "🌐 https://github.com/AEtherlight-ai/aetherlight"
