#!/bin/bash
# complete-task.sh - Post-task validation and metrics collection
#
# DESIGN DECISION: Automated metrics extraction and validation
# WHY: Ensures execution logs complete before task closure
#
# REASONING CHAIN:
# 1. Validate execution log exists
# 2. Record FINAL_APPROVAL_TIMESTAMP
# 3. Prompt for token count (from OTEL or manual)
# 4. Calculate ACTUAL_DURATION from timestamps
# 5. Remind to run documentation-enforcer
# 6. Remind to run commit-enforcer
# 7. Confirm ready to commit
#
# PATTERN: Pattern-CLI-001 (OTEL execution tracking)
# RELATED: SOP-008, PHASE_2_PROCESS_IMPROVEMENTS.md
# USAGE: ./scripts/complete-task.sh P2-001

set -e  # Exit on error

TASK_ID="$1"

# Validate arguments
if [ -z "$TASK_ID" ]; then
    echo "❌ Usage: ./scripts/complete-task.sh TASK_ID"
    echo "   Example: ./scripts/complete-task.sh P2-001"
    exit 1
fi

LOG_FILE="logs/phase-2/${TASK_ID}-execution.md"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Execution log not found: $LOG_FILE"
    echo "Did you run start-task.sh first?"
    exit 1
fi

echo "=== Post-Task Validation ==="

# Record completion timestamp
if command -v powershell.exe &> /dev/null; then
    COMPLETION_TIME=$(powershell.exe -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'")
else
    COMPLETION_TIME=$(date --iso-8601=seconds 2>/dev/null || date -Iseconds)
fi

echo ""
echo "FINAL_APPROVAL_TIMESTAMP: $COMPLETION_TIME" >> "$LOG_FILE"
echo "✅ Recorded completion timestamp"

# Extract token count
echo ""
echo "=== Token Count ==="
echo "Check your OTEL traces or use /cost command"
read -p "Enter TOKEN_COUNT: " TOKEN_COUNT
echo "TOKEN_COUNT: $TOKEN_COUNT" >> "$LOG_FILE"
echo "✅ Recorded token count"

# Calculate duration (if possible)
echo ""
echo "=== Duration Analysis ==="
BEGIN_TS=$(grep "^BEGIN_TIMESTAMP:" "$LOG_FILE" | cut -d' ' -f2)
echo "Begin: $BEGIN_TS"
echo "Final: $COMPLETION_TIME"
echo "(Manual calculation required for ACTUAL_DURATION)"

# Prompt for documentation-enforcer
echo ""
echo "=== Validation Gates ==="
read -p "Run documentation-enforcer? (y/n) " RUN_DOC_ENFORCER
if [ "$RUN_DOC_ENFORCER" = "y" ]; then
    echo "⚠️  documentation-enforcer invocation not yet automated"
    echo "TODO: Invoke documentation-enforcer agent via Claude Code"
fi

# Prompt for commit
echo ""
read -p "Ready to commit? (y/n) " READY_COMMIT
if [ "$READY_COMMIT" = "y" ]; then
    echo "✅ Task complete - ready for git commit"
    echo ""
    echo "Next steps:"
    echo "1. git add ."
    echo "2. git commit (pre-commit hook will validate)"
    echo ""
    echo "⚠️  commit-enforcer will run automatically in pre-commit hook"
else
    echo "⏳ Task incomplete - continue working"
    echo "Run ./scripts/complete-task.sh $TASK_ID when ready"
fi
