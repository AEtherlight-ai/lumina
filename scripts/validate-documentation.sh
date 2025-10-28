#!/bin/bash
# scripts/validate-documentation.sh - Comprehensive Chain of Thought validation
#
# DESIGN DECISION: Standalone documentation validation tool
# WHY: Enables thorough documentation checking before committing
#
# REASONING CHAIN:
# 1. Scans all code files (or specified files) for Chain of Thought compliance
# 2. Checks for complete Chain of Thought format (DESIGN DECISION, WHY, REASONING CHAIN)
# 3. Validates Pattern references (Pattern-XXX-YYY format)
# 4. Provides detailed report with line numbers
# 5. Exits with error code if validation fails
#
# PATTERN: Pattern-TRACKING-001 (Documentation validation)
# RELATED: .git/hooks/pre-commit, documentation-enforcer agent
# USAGE: ./scripts/validate-documentation.sh [file1] [file2] ...
#        ./scripts/validate-documentation.sh (validates all staged files)

set -e

echo "=== Chain of Thought Documentation Validator ==="
echo ""

# Get files to validate
if [ $# -eq 0 ]; then
    # No arguments: validate staged files
    FILES=$(git diff --cached --name-only | grep -E '\.(rs|ts|js|tsx|jsx|dart)$' || true)
    if [ -z "$FILES" ]; then
        echo "ℹ️  No code files staged for validation"
        echo "Usage: $0 [file1] [file2] ... (to validate specific files)"
        exit 0
    fi
    echo "📋 Validating staged files:"
else
    # Arguments provided: validate specified files
    FILES="$@"
    echo "📋 Validating specified files:"
fi

echo "$FILES" | tr ' ' '\n'
echo ""

TOTAL_FILES=0
VALID_FILES=0
INVALID_FILES=0
WARNINGS=0

for FILE in $FILES; do
    if [ ! -f "$FILE" ]; then
        echo "⚠️  File not found: $FILE"
        continue
    fi

    TOTAL_FILES=$((TOTAL_FILES + 1))
    echo "🔍 Checking: $FILE"

    # Check 1: DESIGN DECISION present
    DESIGN_LINES=$(grep -n "DESIGN DECISION:" "$FILE" 2>/dev/null || true)
    HAS_DESIGN=$(echo "$DESIGN_LINES" | wc -l)

    # Check 2: WHY present
    WHY_LINES=$(grep -n "WHY:" "$FILE" 2>/dev/null || true)
    HAS_WHY=$(echo "$WHY_LINES" | wc -l)

    # Check 3: REASONING CHAIN present
    REASONING_LINES=$(grep -n "REASONING CHAIN:" "$FILE" 2>/dev/null || true)
    HAS_REASONING=$(echo "$REASONING_LINES" | wc -l)

    # Check 4: Pattern reference present
    PATTERN_LINES=$(grep -n -E "Pattern-[A-Z]+-[0-9]+" "$FILE" 2>/dev/null || true)
    HAS_PATTERN=$(echo "$PATTERN_LINES" | wc -l)

    # Check 5: RELATED present
    RELATED_LINES=$(grep -n "RELATED:" "$FILE" 2>/dev/null || true)
    HAS_RELATED=$(echo "$RELATED_LINES" | wc -l)

    # Check 6: FUTURE present
    FUTURE_LINES=$(grep -n "FUTURE:" "$FILE" 2>/dev/null || true)
    HAS_FUTURE=$(echo "$FUTURE_LINES" | wc -l)

    FILE_VALID=1

    # Validate completeness
    if [ $HAS_DESIGN -eq 0 ]; then
        echo "  ❌ Missing: DESIGN DECISION"
        FILE_VALID=0
    else
        echo "  ✅ Found DESIGN DECISION (line $(echo "$DESIGN_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $HAS_WHY -eq 0 ]; then
        echo "  ❌ Missing: WHY"
        FILE_VALID=0
    else
        echo "  ✅ Found WHY (line $(echo "$WHY_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $HAS_REASONING -eq 0 ]; then
        echo "  ❌ Missing: REASONING CHAIN"
        FILE_VALID=0
    else
        echo "  ✅ Found REASONING CHAIN (line $(echo "$REASONING_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $HAS_PATTERN -eq 0 ]; then
        echo "  ⚠️  No Pattern reference (Pattern-XXX-YYY)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ Found Pattern reference (line $(echo "$PATTERN_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $HAS_RELATED -eq 0 ]; then
        echo "  ⚠️  Optional: RELATED (recommended)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ Found RELATED (line $(echo "$RELATED_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $HAS_FUTURE -eq 0 ]; then
        echo "  ℹ️  Optional: FUTURE (future improvements)"
    else
        echo "  ✅ Found FUTURE (line $(echo "$FUTURE_LINES" | head -1 | cut -d':' -f1))"
    fi

    if [ $FILE_VALID -eq 1 ]; then
        VALID_FILES=$((VALID_FILES + 1))
        echo "  ✅ VALID"
    else
        INVALID_FILES=$((INVALID_FILES + 1))
        echo "  ❌ INVALID - Missing required Chain of Thought elements"
    fi

    echo ""
done

# Summary
echo "=========================================="
echo "Validation Summary:"
echo "  Total files:   $TOTAL_FILES"
echo "  Valid files:   $VALID_FILES"
echo "  Invalid files: $INVALID_FILES"
echo "  Warnings:      $WARNINGS"
echo ""

if [ $INVALID_FILES -gt 0 ]; then
    echo "❌ VALIDATION FAILED - $INVALID_FILES file(s) missing required Chain of Thought elements"
    echo ""
    echo "Required elements:"
    echo "  - DESIGN DECISION: [Key choice made]"
    echo "  - WHY: [Reasoning behind decision]"
    echo "  - REASONING CHAIN: [Numbered steps]"
    echo ""
    echo "Recommended elements:"
    echo "  - PATTERN: Pattern-XXX-YYY (reference to existing pattern)"
    echo "  - RELATED: [Task IDs, components, files]"
    echo "  - FUTURE: [Planned improvements]"
    echo ""
    exit 1
else
    echo "✅ VALIDATION PASSED - All files have complete Chain of Thought documentation"
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  $WARNINGS warning(s) - consider adding recommended elements"
    fi
    exit 0
fi
