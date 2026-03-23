#!/bin/bash
# Run the State Persistence QA test
# Setup guard runs automatically.
#
# Usage: bash .pi/skills/qa-automation/qa-state-persistence/run.sh

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_FILE="/tmp/qa-tests/state-persistence-report.json"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  State Persistence QA                            ║"
echo "║  Started: $(date '+%Y-%m-%d %H:%M:%S')            "
echo "╚═══════════════════════════════════════════════════╝"
echo ""

bash "$SKILL_DIR/flows/example-state-test.sh"
EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$REPORT_FILE" ]; then
    echo "Report JSON: $REPORT_FILE"
    echo ""
    passed=$(node -e "var r=require('$REPORT_FILE'); console.log(r.totalPassed);" 2>/dev/null || echo "?")
    failed=$(node -e "var r=require('$REPORT_FILE'); console.log(r.totalFailed);" 2>/dev/null || echo "?")
    skipped=$(node -e "var r=require('$REPORT_FILE'); console.log(r.totalSkipped);" 2>/dev/null || echo "?")
    duration=$(node -e "var r=require('$REPORT_FILE'); console.log((r.totalDuration/1000).toFixed(1));" 2>/dev/null || echo "?")
    echo "  Passed:  $passed"
    echo "  Failed:  $failed"
    echo "  Skipped: $skipped"
    echo "  Duration: ${duration}s"
else
    echo "WARNING: No report file generated"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE
