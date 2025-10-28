#!/bin/bash
# scripts/generate-commit-message.sh - Generate Chain of Thought commit message
#
# DESIGN DECISION: Automated commit message template generation
# WHY: Reduces cognitive load, ensures consistency, prevents forgotten elements
#
# REASONING CHAIN:
# 1. Analyzes git diff to understand changes
# 2. Extracts file types, counts, and modification patterns
# 3. Suggests appropriate commit type (feat/fix/docs/etc)
# 4. Generates template with Chain of Thought structure
# 5. Detects current task ID from branch name
# 6. Outputs ready-to-edit commit message template
#
# PATTERN: Pattern-TRACKING-001 (Structured commit messages)
# RELATED: .git/hooks/pre-commit, commit-enforcer agent
# USAGE: ./scripts/generate-commit-message.sh > commit-msg.txt
#        git commit -F commit-msg.txt

set -e

echo "=== Commit Message Generator ===" >&2
echo "" >&2

# Get current task from branch name
CURRENT_BRANCH=$(git branch --show-current)
TASK=$(echo "$CURRENT_BRANCH" | grep -oP 'P\d+-\d+' || echo "")

if [ -n "$TASK" ]; then
    echo "📋 Detected task: $TASK" >&2
else
    echo "ℹ️  No task detected in branch name" >&2
fi
echo "" >&2

# Analyze staged changes
STAGED_FILES=$(git diff --cached --name-only)
if [ -z "$STAGED_FILES" ]; then
    echo "❌ No files staged for commit" >&2
    echo "Run: git add <files>" >&2
    exit 1
fi

TOTAL_FILES=$(echo "$STAGED_FILES" | wc -l)
echo "📁 Staged files: $TOTAL_FILES" >&2

# Count file types
RUST_FILES=$(echo "$STAGED_FILES" | grep -c '\.rs$' || echo "0")
TS_FILES=$(echo "$STAGED_FILES" | grep -c '\.ts$' || echo "0")
JS_FILES=$(echo "$STAGED_FILES" | grep -c '\.js$' || echo "0")
MD_FILES=$(echo "$STAGED_FILES" | grep -c '\.md$' || echo "0")
JSON_FILES=$(echo "$STAGED_FILES" | grep -c '\.json$' || echo "0")

echo "  Rust:       $RUST_FILES" >&2
echo "  TypeScript: $TS_FILES" >&2
echo "  JavaScript: $JS_FILES" >&2
echo "  Markdown:   $MD_FILES" >&2
echo "  JSON:       $JSON_FILES" >&2
echo "" >&2

# Suggest commit type based on file types and changes
SUGGESTED_TYPE="chore"
SUGGESTED_SCOPE="core"

if [ $MD_FILES -gt 0 ] && [ $((MD_FILES * 2)) -gt $TOTAL_FILES ]; then
    SUGGESTED_TYPE="docs"
    SUGGESTED_SCOPE="documentation"
elif [ $RUST_FILES -gt 0 ]; then
    # Check if it's a test file
    if echo "$STAGED_FILES" | grep -q 'test'; then
        SUGGESTED_TYPE="test"
        SUGGESTED_SCOPE="testing"
    else
        SUGGESTED_TYPE="feat"
        SUGGESTED_SCOPE="core"
    fi
elif [ $TS_FILES -gt 0 ] || [ $JS_FILES -gt 0 ]; then
    SUGGESTED_TYPE="feat"
    SUGGESTED_SCOPE="ui"
fi

# Check for "fix" indicators in file names
if echo "$STAGED_FILES" | grep -q -i 'fix\|bug\|patch'; then
    SUGGESTED_TYPE="fix"
fi

echo "💡 Suggested type: $SUGGESTED_TYPE($SUGGESTED_SCOPE)" >&2
echo "" >&2
echo "=========================================" >&2
echo "Generated commit message template:" >&2
echo "=========================================" >&2
echo "" >&2

# Generate commit message template (output to stdout)
cat <<EOF
$SUGGESTED_TYPE($SUGGESTED_SCOPE): [concise description of change]

DESIGN DECISION: [What approach was taken]
WHY: [Reasoning behind the decision]

REASONING CHAIN:
1. [First step with reasoning]
2. [Second step with reasoning]
3. [Third step with reasoning]

FILES MODIFIED ($TOTAL_FILES files):
$(echo "$STAGED_FILES" | sed 's/^/- /')

PATTERN: Pattern-XXX-YYY ([Pattern description])
RELATED: [Task IDs, components, files]
PERFORMANCE: [Metrics if applicable]

$(if [ -n "$TASK" ]; then echo "Closes #$TASK"; fi)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF

echo "" >&2
echo "=========================================" >&2
echo "✅ Commit message template generated" >&2
echo "" >&2
echo "Next steps:" >&2
echo "  1. Review and edit the template above" >&2
echo "  2. Fill in the [placeholders] with actual content" >&2
echo "  3. Copy to clipboard or save to file" >&2
echo "" >&2
echo "Usage examples:" >&2
echo "  # Save to file:" >&2
echo "  ./scripts/generate-commit-message.sh > commit-msg.txt" >&2
echo "" >&2
echo "  # Edit and commit:" >&2
echo "  ./scripts/generate-commit-message.sh > commit-msg.txt" >&2
echo "  \$EDITOR commit-msg.txt" >&2
echo "  git commit -F commit-msg.txt" >&2
echo "" >&2
