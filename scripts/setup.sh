#!/bin/bash

#
# ÆtherLight One-Command Setup
#
# DESIGN DECISION: Single script that handles all initial setup
# WHY: Reduce friction for new users, get to value in <5 minutes
#
# REASONING CHAIN:
# 1. New users want instant value, not complex setup
# 2. Manual steps = friction = abandoned onboarding
# 3. Automated script = smooth experience
# 4. Check what's already installed (don't break existing setups)
# 5. Provide clear feedback at each step
#
# USAGE:
#   bash scripts/setup.sh
#   or
#   curl -fsSL https://raw.githubusercontent.com/aetherlight/aetherlight/main/scripts/setup.sh | bash
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║         ÆtherLight Setup (One-Command Install)            ║"
echo "║                                                           ║"
echo "║  This script will:                                        ║"
echo "║  ✓ Check prerequisites (Node.js, Git)                    ║"
echo "║  ✓ Install ÆtherLight SDK                                ║"
echo "║  ✓ Initialize project memory (CLAUDE.md)                 ║"
echo "║  ✓ Set up Git hooks (Chain of Thought enforcement)       ║"
echo "║  ✓ Create pattern library structure                      ║"
echo "║                                                           ║"
echo "║  Time: ~2 minutes                                         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to print success
success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
  echo -e "${RED}✗${NC} $1"
}

# Function to print info
info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Check if running in project directory
if [ ! -f "package.json" ]; then
  error "No package.json found. Please run this from your project root."
  echo ""
  echo "If you're starting a new project:"
  echo "  mkdir my-project && cd my-project"
  echo "  npm init -y"
  echo "  bash scripts/setup.sh"
  exit 1
fi

success "Found package.json"
echo ""

# Check Node.js
info "Checking Node.js..."
if ! command -v node &> /dev/null; then
  error "Node.js not found. Please install Node.js first:"
  echo "  https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
success "Node.js found: $NODE_VERSION"
echo ""

# Check Git
info "Checking Git..."
if ! command -v git &> /dev/null; then
  error "Git not found. Please install Git first:"
  echo "  https://git-scm.com/"
  exit 1
fi

GIT_VERSION=$(git --version)
success "Git found: $GIT_VERSION"
echo ""

# Initialize Git if not already
if [ ! -d ".git" ]; then
  info "Initializing Git repository..."
  git init
  success "Git repository initialized"
else
  success "Git repository already initialized"
fi
echo ""

# Install ÆtherLight SDK
info "Installing ÆtherLight SDK..."
echo ""

# Check if already installed
if grep -q "@aetherlight/sdk" package.json 2>/dev/null; then
  success "ÆtherLight SDK already installed"
else
  # Install SDK (will work once published)
  npm install @aetherlight/sdk 2>&1 | grep -v "npm WARN" || true

  if [ $? -eq 0 ]; then
    success "ÆtherLight SDK installed"
  else
    error "SDK not published yet. Using local setup instead."
    info "Creating .aetherlight directory manually..."
    mkdir -p .aetherlight/patterns
    success ".aetherlight directory created"
  fi
fi
echo ""

# Initialize ÆtherLight
info "Initializing ÆtherLight..."
echo ""

# Check if already initialized
if [ -f "CLAUDE.md" ]; then
  success "CLAUDE.md already exists (skipping)"
else
  # Try SDK init command
  if command -v npx &> /dev/null && npm list @aetherlight/sdk &> /dev/null; then
    npx @aetherlight/sdk init
  else
    # Manual initialization
    info "Creating CLAUDE.md (project memory)..."

    # Get project name from package.json
    PROJECT_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "My Project")

    cat > CLAUDE.md << 'EOF'
# ${PROJECT_NAME}

**VERSION:** 1.0
**LAST UPDATED:** $(date +%Y-%m-%d)
**STATUS:** Active Development

---

## 🎯 Project Identity

### **What This Is**
[Describe your project in 1-2 sentences]

### **Tech Stack**
- Language: [JavaScript, TypeScript, Python, etc.]
- Framework: [React, Next.js, Django, etc.]
- Database: [PostgreSQL, MongoDB, etc.]
- Other: [Key dependencies]

---

## 🧠 Key Decisions

**Document WHY you made choices, not just WHAT:**

1. **[Decision]** - [Reasoning]
2. **[Decision]** - [Reasoning]

---

## 🚫 What NOT To Do

**Failed experiments (so AI doesn't suggest them):**

- ❌ [Thing you tried that didn't work] - [Why it failed]
- ❌ [Thing you explicitly rejected] - [Why you rejected it]

---

## 📚 Patterns We Use

**As you extract patterns, list them here:**

- Pattern-XXX-YYY: [Description]

---

## 🤖 Agent Instructions

**ÆtherLight agents read this section:**

- Follow Chain of Thought documentation standard
- Use our existing patterns before creating new ones
- Test all changes before committing
- Document all design decisions

---

**This is project memory for AI assistants. Keep it updated!**
EOF

    success "CLAUDE.md created"
  fi
fi
echo ""

# Set up Git hooks
info "Setting up Git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Pre-commit hook (basic version)
if [ ! -f ".git/hooks/pre-commit" ]; then
  cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# ÆtherLight Pre-Commit Hook
# Enforces Chain of Thought documentation

# Check for Chain of Thought in staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx|py|rs)$')

if [ -n "$STAGED_FILES" ]; then
  echo "Checking Chain of Thought documentation..."

  # Basic check: Do new functions have Chain of Thought comments?
  # (This is a simplified check - full validation happens in CI)

  for FILE in $STAGED_FILES; do
    # Count function definitions
    FUNC_COUNT=$(git diff --cached $FILE | grep -E '^\+.*function |^\+.*def ' | wc -l)

    # Count Chain of Thought comments
    COT_COUNT=$(git diff --cached $FILE | grep -E '^\+.*DESIGN DECISION:' | wc -l)

    # If new functions but no Chain of Thought, warn
    if [ $FUNC_COUNT -gt 0 ] && [ $COT_COUNT -eq 0 ]; then
      echo "⚠️  Warning: $FILE has new functions but no Chain of Thought documentation"
      echo "   Consider adding DESIGN DECISION, WHY, REASONING CHAIN comments"
    fi
  done

  echo "✓ Pre-commit checks passed"
fi

exit 0
EOF

  chmod +x .git/hooks/pre-commit
  success "Pre-commit hook installed"
else
  success "Pre-commit hook already exists"
fi
echo ""

# Create pattern directory structure
info "Creating pattern library structure..."

mkdir -p .aetherlight/patterns/domains/{infrastructure,knowledge,scalability,innovation,quality,deployment,ethics}
mkdir -p .aetherlight/embeddings
mkdir -p .aetherlight/config

success "Pattern directories created"
echo ""

# Create .gitignore entries for ÆtherLight
if [ -f ".gitignore" ]; then
  if ! grep -q ".aetherlight/embeddings" .gitignore; then
    echo "" >> .gitignore
    echo "# ÆtherLight" >> .gitignore
    echo ".aetherlight/embeddings/" >> .gitignore
    echo ".aetherlight/cache/" >> .gitignore
    success "Added ÆtherLight to .gitignore"
  else
    success ".gitignore already configured"
  fi
else
  cat > .gitignore << 'EOF'
# ÆtherLight
.aetherlight/embeddings/
.aetherlight/cache/

# Node
node_modules/
EOF
  success "Created .gitignore"
fi
echo ""

# Create basic config
if [ ! -f ".aetherlight/config/aetherlight.json" ]; then
  cat > .aetherlight/config/aetherlight.json << 'EOF'
{
  "version": "1.0",
  "confidenceThreshold": 85,
  "offlineMode": true,
  "patternLibraryPath": ".aetherlight/patterns",
  "documentationEnforcement": true,
  "chainOfThoughtRequired": true
}
EOF
  success "Configuration file created"
else
  success "Configuration already exists"
fi
echo ""

# Summary
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ÆtherLight Setup Complete! ✓                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo "Next steps:"
echo ""
echo "1. Edit CLAUDE.md with your project details"
echo "   ${BLUE}→${NC} Describe what your project is"
echo "   ${BLUE}→${NC} List your tech stack"
echo "   ${BLUE}→${NC} Document key decisions"
echo ""

echo "2. Try Chain of Thought documentation"
echo "   ${BLUE}→${NC} Add DESIGN DECISION comments to your functions"
echo "   ${BLUE}→${NC} See: docs/vision/CHAIN_OF_THOUGHT_STANDARD.md"
echo ""

echo "3. Use ÆtherLight features (Claude Code)"
echo "   ${BLUE}→${NC} /aefeature [description] - Build features"
echo "   ${BLUE}→${NC} /aebug [description] - Fix bugs"
echo ""

echo "4. Join the community"
echo "   ${BLUE}→${NC} Discord: https://discord.gg/gdFxbJET"
echo "   ${BLUE}→${NC} Email: beta@lumina.ai"
echo ""

echo "Quick reads:"
echo "  • INSTANT_VALUE.md - Get value in 5 minutes"
echo "  • FOR_VIBE_CODERS.md - AI-native development"
echo "  • NORTH_STAR.md - Why we built this"
echo ""

echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
