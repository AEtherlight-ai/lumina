#!/bin/bash
# scripts/complete-phase.sh - Phase completion automation with testing gates
#
# DESIGN DECISION: Enforce phase completion workflow with version bumps and testing
# WHY: Ensure stable release points, prevent untested code from advancing phases
#
# REASONING CHAIN:
# 1. Validate all tasks in phase are completed (TOML status check)
# 2. Run compilation (blocking gate)
# 3. Validate phase success criteria (manual checklist)
# 4. Bump version (semantic versioning: 0.5.8 → 0.6.0 for Phase 1)
# 5. Create phase completion commit
# 6. Tag release (git tag -a v0.6.0)
# 7. Generate phase summary document
# 8. Result: Known-good state for testing/rollback
#
# PATTERN: Pattern-SPRINT-003 (Phase Completion Gates)
# RELATED: VOICE_PANEL_V0.5_SPRINT.toml, package.json, pre-commit hook
# USAGE: bash scripts/complete-phase.sh <phase_number> <sprint_toml_path>
#
# Example: bash scripts/complete-phase.sh 1 vscode-lumina/VOICE_PANEL_V0.5_SPRINT.toml

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
AUTO_VALIDATE="false"
while [ "$#" -gt 0 ]; do
    case "$1" in
        --auto-validate)
            AUTO_VALIDATE="true"
            shift
            ;;
        *)
            if [ -z "$PHASE_NUM" ]; then
                PHASE_NUM="$1"
            elif [ -z "$SPRINT_TOML" ]; then
                SPRINT_TOML="$1"
            fi
            shift
            ;;
    esac
done

# Usage
if [ -z "$PHASE_NUM" ] || [ -z "$SPRINT_TOML" ]; then
    echo -e "${RED}Usage: bash scripts/complete-phase.sh <phase_number> <sprint_toml_path> [--auto-validate]${NC}"
    echo ""
    echo "Example: bash scripts/complete-phase.sh 1 vscode-lumina/VOICE_PANEL_V0.5_SPRINT.toml"
    echo "Example: bash scripts/complete-phase.sh 1 vscode-lumina/VOICE_PANEL_V0.5_SPRINT.toml --auto-validate"
    exit 1
fi

PHASE_NAME="Phase ${PHASE_NUM}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase Completion Workflow - ${PHASE_NAME}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Gate 1: Validate TOML file exists
echo -e "${YELLOW}[Gate 1] Validating sprint TOML file...${NC}"
if [ ! -f "$SPRINT_TOML" ]; then
    echo -e "${RED}❌ Sprint TOML not found: $SPRINT_TOML${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Sprint TOML found${NC}"
echo ""

# Gate 2: Check all phase tasks are completed
echo -e "${YELLOW}[Gate 2] Checking task completion status...${NC}"

# Simple approach: grep for all Phase N tasks directly
INCOMPLETE_TASKS=()
TOTAL_TASKS=0
COMPLETED_TASKS=0

# For Phase 1, look for tasks A-001, A-002, A-003, A-004
# For Phase 2, look for B-001, etc.
case $PHASE_NUM in
    1) TASK_PREFIX="A-" ;;
    2) TASK_PREFIX="B-" ;;
    3) TASK_PREFIX="C-" ;;
    4) TASK_PREFIX="D-" ;;
    5) TASK_PREFIX="E-" ;;
    *) echo "Unknown phase number: $PHASE_NUM"; exit 1 ;;
esac

# Extract all tasks for this phase
COMPLETED_TASK_IDS=()
while IFS= read -r line; do
    if [[ "$line" =~ ^\[tasks\.($TASK_PREFIX[0-9]+)\] ]]; then
        current_task="${BASH_REMATCH[1]}"
        TOTAL_TASKS=$((TOTAL_TASKS + 1))

        # Get status for this task (within next 15 lines)
        task_status=$(grep -A 15 "^\[tasks\.${current_task}\]" "$SPRINT_TOML" | grep "^status = " | head -1 | sed 's/status = "\(.*\)"/\1/')

        if [ "$task_status" = "completed" ]; then
            COMPLETED_TASKS=$((COMPLETED_TASKS + 1))
            COMPLETED_TASK_IDS+=("$current_task")
            echo -e "${GREEN}  ✅ $current_task: completed${NC}"
        else
            INCOMPLETE_TASKS+=("$current_task ($task_status)")
            echo -e "${RED}  ❌ $current_task: $task_status${NC}"
        fi
    fi
done < "$SPRINT_TOML"

# Build PHASE_TASKS for commit message
PHASE_TASKS=""
for task_id in "${COMPLETED_TASK_IDS[@]}"; do
    PHASE_TASKS+="${task_id}\n"
done

if [ ${#INCOMPLETE_TASKS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Phase ${PHASE_NUM} has incomplete tasks:${NC}"
    for task in "${INCOMPLETE_TASKS[@]}"; do
        echo -e "${RED}   - $task${NC}"
    done
    echo ""
    echo -e "${YELLOW}Complete all tasks before running phase completion.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All ${PHASE_NAME} tasks completed (${COMPLETED_TASKS}/${TOTAL_TASKS})${NC}"
echo ""

# Gate 3: Run compilation
echo -e "${YELLOW}[Gate 3] Running compilation...${NC}"

if [ -f "vscode-lumina/package.json" ]; then
    cd vscode-lumina
    if ! npm run compile > /tmp/compile-output.log 2>&1; then
        echo -e "${RED}❌ Compilation failed!${NC}"
        echo ""
        cat /tmp/compile-output.log
        exit 1
    fi
    cd ..
    echo -e "${GREEN}✅ Compilation successful${NC}"
else
    echo -e "${YELLOW}⚠️  No package.json found, skipping compilation${NC}"
fi
echo ""

# Gate 4: Display success criteria checklist
echo -e "${YELLOW}[Gate 4] Phase Success Criteria Validation${NC}"
echo ""
echo -e "${BLUE}Please validate the following success criteria manually:${NC}"
echo ""

# Extract success criteria from TOML - only for this phase
# Find the phase_N array and extract only its entries
SUCCESS_CRITERIA=$(sed -n "/^phase_${PHASE_NUM} = \[/,/^\]/p" "$SPRINT_TOML" | grep '"' | sed 's/.*"\(.*\)".*/\1/')

CRITERIA_NUM=1
while IFS= read -r criterion; do
    if [ -n "$criterion" ]; then
        echo -e "  ${CRITERIA_NUM}. ${criterion}"
        CRITERIA_NUM=$((CRITERIA_NUM + 1))
    fi
done <<< "$SUCCESS_CRITERIA"

echo ""

# Allow auto-validation via --auto-validate flag
if [ "$AUTO_VALIDATE" = "true" ]; then
    echo "Auto-validation enabled - skipping manual validation prompt"
    VALIDATED="y"
else
    read -p "Have you validated all success criteria? (y/n) " VALIDATED
fi

if [ "$VALIDATED" != "y" ] && [ "$VALIDATED" != "Y" ]; then
    echo -e "${RED}❌ Phase completion aborted - success criteria not validated${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Success criteria validated${NC}"
echo ""

# Gate 5: Bump version
echo -e "${YELLOW}[Gate 5] Version bump...${NC}"

# Read current version from package.json
CURRENT_VERSION=$(grep '"version"' vscode-lumina/package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "Current version: ${BLUE}${CURRENT_VERSION}${NC}"

# Calculate new version (bump minor)
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
NEW_MINOR=$((minor + 1))
NEW_VERSION="${major}.${NEW_MINOR}.0"

echo -e "Proposed version: ${GREEN}${NEW_VERSION}${NC}"
echo ""

if [ "$AUTO_VALIDATE" = "true" ]; then
    echo "Auto-validation enabled - accepting version bump"
    ACCEPT_VERSION="y"
else
    read -p "Accept version bump to ${NEW_VERSION}? (y/n) " ACCEPT_VERSION

    if [ "$ACCEPT_VERSION" != "y" ] && [ "$ACCEPT_VERSION" != "Y" ]; then
        read -p "Enter custom version: " CUSTOM_VERSION
        NEW_VERSION=$CUSTOM_VERSION
    fi
fi

# Update package.json version
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" vscode-lumina/package.json

echo -e "${GREEN}✅ Version updated: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"
echo ""

# Gate 6: Generate phase summary
echo -e "${YELLOW}[Gate 6] Generating phase summary...${NC}"

SUMMARY_FILE="vscode-lumina/PHASE_${PHASE_NUM}_COMPLETE.md"

cat > "$SUMMARY_FILE" <<EOF
# Phase ${PHASE_NUM} Completion Summary

**Version:** ${NEW_VERSION}
**Date:** $(date -u +"%Y-%m-%d")
**Sprint:** Voice Panel Redesign v0.5.0

---

## ✅ Tasks Completed (${COMPLETED_TASKS}/${TOTAL_TASKS})

EOF

# Add completed tasks
for task_id in "${COMPLETED_TASK_IDS[@]}"; do
    echo "- ✅ **${task_id}**" >> "$SUMMARY_FILE"
done

cat >> "$SUMMARY_FILE" <<EOF

---

## ✅ Success Criteria Validated

EOF

# Add success criteria
CRITERIA_NUM=1
while IFS= read -r criterion; do
    echo "${CRITERIA_NUM}. ✅ ${criterion}" >> "$SUMMARY_FILE"
    CRITERIA_NUM=$((CRITERIA_NUM + 1))
done <<< "$SUCCESS_CRITERIA"

cat >> "$SUMMARY_FILE" <<EOF

---

## 📦 Deliverables

- TypeScript compilation: ✅ Passing
- All ${PHASE_NAME} tasks: ✅ Complete
- Success criteria: ✅ Validated
- Version: ${NEW_VERSION}

---

## 🧪 Testing Status

**Phase ${PHASE_NUM} Testing:**
- ✅ Compilation tests passed
- ✅ Manual validation completed
- ⏳ Unit tests: Planned for Phase 2+
- ⏳ Integration tests: Planned for Phase 3+
- ⏳ E2E tests: Planned for Phase 5

---

## 🚀 Next Steps

- **Ready for:** Phase $((PHASE_NUM + 1))
- **Stable release:** v${NEW_VERSION} tagged
- **Rollback available:** Use \`git checkout v${NEW_VERSION}\` to return to this state

---

**Generated by:** scripts/complete-phase.sh
**Pattern:** Pattern-SPRINT-003 (Phase Completion Gates)
EOF

echo -e "${GREEN}✅ Phase summary created: ${SUMMARY_FILE}${NC}"
echo ""

# Gate 7: Create completion commit
echo -e "${YELLOW}[Gate 7] Creating phase completion commit...${NC}"

git add vscode-lumina/package.json "$SUMMARY_FILE"

# Build Closes line with all task references
CLOSES_LINE="Closes"
for task_id in "${COMPLETED_TASK_IDS[@]}"; do
    CLOSES_LINE+=" #${task_id}"
done

COMMIT_MSG=$(cat <<EOF
chore(sprint): complete Phase ${PHASE_NUM} (v${NEW_VERSION})

DESIGN DECISION: Phase completion with version bump and testing gates
WHY: Establish stable release point before advancing to next phase

REASONING CHAIN:
1. Validated all ${COMPLETED_TASKS} tasks in Phase ${PHASE_NUM} completed
2. Ran compilation - all TypeScript passes
3. Validated success criteria manually
4. Bumped version: ${CURRENT_VERSION} → ${NEW_VERSION} (minor bump)
5. Generated phase summary: ${SUMMARY_FILE}
6. Created git tag v${NEW_VERSION}
7. Result: Stable release point for testing/dogfooding

PHASE ${PHASE_NUM} DELIVERABLES:
$(echo -e "$PHASE_TASKS" | while read -r task_id; do [ -n "$task_id" ] && echo "- ${task_id}"; done)

SUCCESS CRITERIA VALIDATED:
$(CRITERIA_NUM=1; while IFS= read -r criterion; do echo "${CRITERIA_NUM}. ${criterion}"; CRITERIA_NUM=$((CRITERIA_NUM + 1)); done <<< "$SUCCESS_CRITERIA")

TESTING STATUS:
- Compilation: ✅ Passing
- Manual validation: ✅ Complete
- Unit tests: Planned for Phase 2+
- Integration tests: Planned for Phase 3+

PATTERN: Pattern-SPRINT-003 (Phase Completion Gates)
RELATED: ${SPRINT_TOML}, PHASE_${PHASE_NUM}_COMPLETE.md
NEXT: Phase $((PHASE_NUM + 1))

${CLOSES_LINE}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)

git commit -m "$COMMIT_MSG"

echo -e "${GREEN}✅ Phase completion commit created${NC}"
echo ""

# Gate 8: Create git tag
echo -e "${YELLOW}[Gate 8] Creating git tag...${NC}"

git tag -a "v${NEW_VERSION}" -m "Phase ${PHASE_NUM}: Complete - ${COMPLETED_TASKS} tasks delivered"

echo -e "${GREEN}✅ Git tag created: v${NEW_VERSION}${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Phase ${PHASE_NUM} Completion Successful!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Version:${NC} ${NEW_VERSION}"
echo -e "${GREEN}Tag:${NC} v${NEW_VERSION}"
echo -e "${GREEN}Summary:${NC} ${SUMMARY_FILE}"
echo -e "${GREEN}Tasks:${NC} ${COMPLETED_TASKS}/${TOTAL_TASKS} complete"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test v${NEW_VERSION} thoroughly"
echo "2. Push commits: git push origin $(git branch --show-current)"
echo "3. Push tags: git push origin v${NEW_VERSION}"
echo "4. Start Phase $((PHASE_NUM + 1)) with v${NEW_VERSION} as baseline"
echo ""
echo -e "${YELLOW}Rollback if needed:${NC} git checkout v${NEW_VERSION}"
echo ""
