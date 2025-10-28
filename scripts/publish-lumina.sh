#!/bin/bash
# Publish Lumina product to public repo (filtered)
#
# DESIGN DECISION: Automated sync from development repo to public repo
# WHY: Single source of truth, no code duplication
#
# Usage: ./scripts/publish-lumina.sh

set -e

echo "📦 Publishing Lumina to public repo..."
echo ""

# Check if we're in the right directory
if [ ! -d "products" ]; then
    echo "❌ Error: Must run from repository root"
    exit 1
fi

# Check if remote exists
if ! git remote get-url public-lumina >/dev/null 2>&1; then
    echo "⚠️  Remote 'public-lumina' not found. Adding it..."
    git remote add public-lumina https://github.com/AEtherlight-ai/lumina.git
    echo "✅ Remote added"
fi

# Create temporary directory for filtered content
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Copy only Lumina product files
echo "Copying Lumina product files..."
mkdir -p "$TEMP_DIR/apps"
cp -r products/lumina-desktop "$TEMP_DIR/apps/desktop"
cp -r products/lumina-web "$TEMP_DIR/apps/web"

# Create package.json with @aetherlight/core dependency
cat > "$TEMP_DIR/package.json" <<EOF
{
  "name": "lumina",
  "version": "0.2.0",
  "description": "Voice-to-intelligence platform for developers",
  "author": "ÆtherLight Team <noreply@aetherlight.ai>",
  "license": "MIT",
  "homepage": "https://lumina.aetherlight.ai",
  "repository": {
    "type": "git",
    "url": "https://github.com/AEtherlight-ai/lumina.git"
  },
  "keywords": ["voice", "ai", "pattern-matching", "aetherlight", "lumina"],
  "private": false,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:desktop": "cd apps/desktop && npm run tauri dev",
    "dev:web": "cd apps/web && npm run dev",
    "build:desktop": "cd apps/desktop && npm run tauri build",
    "build:web": "cd apps/web && npm run build"
  },
  "dependencies": {
    "@aetherlight/core": "^0.2.0"
  }
}
EOF

# Create README.md
cat > "$TEMP_DIR/README.md" <<EOF
# Lumina

**Voice-to-intelligence platform for developers**

Built on [ÆtherLight](https://github.com/AEtherlight-ai/aetherlight)

🎤 Voice capture + transcription
🎯 Pattern matching via ÆtherLight
📊 Confidence scoring
🚀 Quick Send to AI tools

## Quick Start

\`\`\`bash
# Desktop app
cd apps/desktop
npm install
npm run tauri dev

# Web interface
cd apps/web
npm install
npm run dev
\`\`\`

## Documentation

- Desktop: [apps/desktop/README.md](./apps/desktop/README.md)
- Web: [apps/web/README.md](./apps/web/README.md)
- ÆtherLight Core: [github.com/AEtherlight-ai/aetherlight](https://github.com/AEtherlight-ai/aetherlight)

## License

MIT - Built on ÆtherLight
EOF

# Create LICENSE
cat > "$TEMP_DIR/LICENSE" <<EOF
MIT License

Copyright (c) 2025 ÆtherLight

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Clean build artifacts
find "$TEMP_DIR" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name "playwright-report" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name "test-results" -type d -exec rm -rf {} + 2>/dev/null || true

# Initialize git in temp directory
cd "$TEMP_DIR"
git init
git config user.name "ÆtherLight Team"
git config user.email "noreply@aetherlight.ai"

# Add .gitignore
cat > .gitignore <<EOF
node_modules/
**/node_modules/
target/
**/target/
.next/
dist/
build/
*.log
.env
.DS_Store
playwright-report/
test-results/
EOF

# Commit
git add .
git commit -m "chore: sync from development repo

Automated sync of Lumina voice platform.

Co-Authored-By: ÆtherLight Team <noreply@aetherlight.ai>"

# Push to public repo
echo ""
echo "Pushing to github.com/AEtherlight-ai/lumina..."
git push https://github.com/AEtherlight-ai/lumina.git HEAD:main --force

# Cleanup
cd -
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Lumina published successfully!"
echo "🌐 https://github.com/AEtherlight-ai/lumina"
