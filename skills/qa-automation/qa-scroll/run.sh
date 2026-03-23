#!/bin/bash
# Run the Feed Scroll & Play QA test
# Setup guard runs automatically — checks/fixes simulator, dev server, app, CDP.
#
# Usage: bash .pi/skills/qa-automation/qa-scroll/run.sh

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_FILE="/tmp/qa-tests/feed-scroll-play-report.json"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Feed Scroll & Play QA                           ║"
echo "║  Started: $(date '+%Y-%m-%d %H:%M:%S')            "
echo "╚═══════════════════════════════════════════════════╝"
echo ""

bash "$SKILL_DIR/flows/example-scroll-test.sh"
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
    echo "WARNING: No report file generated at $REPORT_FILE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE
