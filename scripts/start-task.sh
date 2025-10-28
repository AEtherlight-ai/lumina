#!/bin/bash
# start-task.sh - Pre-task validation and setup
#
# DESIGN DECISION: Automated validation gates before task start
# WHY: Prevents Pattern-FAILURE-003 (process compliance failure)
#
# REASONING CHAIN:
# 1. Validate OTEL enabled (blocks if not)
# 2. Create task branch for git isolation
# 3. Create execution log with BEGIN_TIMESTAMP
# 4. Record task start in ISO 8601 format
# 5. Echo success message to confirm ready
#
# PATTERN: Pattern-CLI-001 (OTEL execution tracking)
# RELATED: SOP-008, PHASE_2_PROCESS_IMPROVEMENTS.md
# USAGE: ./scripts/start-task.sh P2-001 "Desktop App Scaffold"

set -e  # Exit on error

TASK_ID="$1"
TASK_NAME="$2"

# Validate arguments
if [ -z "$TASK_ID" ] || [ -z "$TASK_NAME" ]; then
    echo "❌ Usage: ./scripts/start-task.sh TASK_ID \"Task Name\""
    echo "   Example: ./scripts/start-task.sh P2-001 \"Desktop App Scaffold\""
    exit 1
fi

echo "=== Pre-Task Validation ==="

# Validate OTEL enabled
if [ "$OTEL_SDK_ENABLED" != "true" ]; then
    echo "❌ OTEL not enabled"
    echo "Run: export OTEL_SDK_ENABLED=true"
    echo "     export OTEL_EXPORTER_FILE_PATH=\"./logs/otel/traces.json\""
    exit 1
fi

# Validate OTEL export path
if [ -z "$OTEL_EXPORTER_FILE_PATH" ]; then
    echo "❌ OTEL export path not set"
    echo "Run: export OTEL_EXPORTER_FILE_PATH=\"./logs/otel/traces.json\""
    exit 1
fi

echo "✅ OTEL enabled: $OTEL_SDK_ENABLED"
echo "✅ OTEL export: $OTEL_EXPORTER_FILE_PATH"

# Create task branch
BRANCH_NAME="${TASK_ID}-$(echo "$TASK_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"
echo ""
echo "Creating task branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" 2>/dev/null || {
    echo "⚠️  Branch already exists, switching to it"
    git checkout "$BRANCH_NAME"
}

# Create execution log
LOG_FILE="logs/phase-2/${TASK_ID}-execution.md"
if [ -f "$LOG_FILE" ]; then
    echo "⚠️  Execution log already exists: $LOG_FILE"
else
    echo "Creating execution log: $LOG_FILE"

    # Use PowerShell date command on Windows, date on Unix
    if command -v powershell.exe &> /dev/null; then
        TIMESTAMP=$(powershell.exe -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'")
    else
        TIMESTAMP=$(date --iso-8601=seconds 2>/dev/null || date -Iseconds)
    fi

    cat > "$LOG_FILE" <<EOF
# ${TASK_ID} Execution Log

BEGIN_TIMESTAMP: ${TIMESTAMP}
TASK_NAME: ${TASK_NAME}
ESTIMATED_DURATION: [Fill during planning]

## Progress Log

### $(date +%H:%M) - Task started
- Ran start-task.sh
- OTEL enabled ✅
- Branch created: ${BRANCH_NAME}

EOF
fi

echo ""
echo "✅ Task ${TASK_ID} ready"
echo "📝 Execution log: ${LOG_FILE}"
echo "🌳 Branch: ${BRANCH_NAME}"
echo ""
echo "⚠️  REMEMBER: Update log in real-time as you work"
echo "⚠️  When done: ./scripts/complete-task.sh ${TASK_ID}"
