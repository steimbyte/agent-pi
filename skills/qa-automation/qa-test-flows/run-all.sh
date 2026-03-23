#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════╗
# ║  run-all.sh — Master Test Runner                                  ║
# ╠═══════════════════════════════════════════════════════════════════╣
# ║  Runs all test flows in the flows/ directory tree.                ║
# ║                                                                   ║
# ║  Usage:                                                           ║
# ║    bash run-all.sh              # Run all tests                   ║
# ║    bash run-all.sh smoke        # Run only smoke suite            ║
# ║    bash run-all.sh --list       # List available tests            ║
# ╚═══════════════════════════════════════════════════════════════════╝

set -euo pipefail

RUNNER_DIR="$(cd "$(dirname "$0")" && pwd)"
FLOWS_DIR="$RUNNER_DIR/flows"

# ── Parse args ───────────────────────────────────────────────────────
SUITE_FILTER="${1:-}"
LIST_ONLY=false

if [ "$SUITE_FILTER" = "--list" ]; then
    LIST_ONLY=true
fi

# ── Find all test scripts ───────────────────────────────────────────
find_tests() {
    if [ -n "$SUITE_FILTER" ] && [ "$SUITE_FILTER" != "--list" ]; then
        find "$FLOWS_DIR/$SUITE_FILTER" -name "*.sh" -type f 2>/dev/null | sort
    else
        find "$FLOWS_DIR" -name "*.sh" -type f 2>/dev/null | sort
    fi
}

TESTS=$(find_tests)
TEST_COUNT=$(echo "$TESTS" | grep -c "." || echo "0")

if [ "$TEST_COUNT" -eq 0 ]; then
    echo "No test scripts found in $FLOWS_DIR/"
    [ -n "$SUITE_FILTER" ] && echo "Suite filter: $SUITE_FILTER"
    exit 1
fi

# ── List mode ────────────────────────────────────────────────────────
if [ "$LIST_ONLY" = true ]; then
    echo ""
    echo "Available test flows ($TEST_COUNT):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$TESTS" | while read -r test; do
        suite=$(basename "$(dirname "$test")")
        name=$(basename "$test" .sh)
        printf "  %-15s %s\n" "[$suite]" "$name"
    done
    echo ""
    exit 0
fi

# ── Run mode ─────────────────────────────────────────────────────────
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
START_TIME=$(date +%s)

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  QA Test Runner — Running $TEST_COUNT test(s)                 "
echo "║  Started: $(date '+%Y-%m-%d %H:%M:%S')                        "
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

declare -a RESULTS=()

echo "$TESTS" | while read -r test; do
    suite=$(basename "$(dirname "$test")")
    name=$(basename "$test" .sh)

    echo "──────────────────────────────────────────────────────────────"
    echo "  Running: [$suite] $name"
    echo "──────────────────────────────────────────────────────────────"

    if bash "$test" 2>&1; then
        echo "  Result: ✅ PASSED"
    else
        echo "  Result: ❌ FAILED (exit code: $?)"
    fi

    echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  QA Test Run Complete"
echo "  Total tests: $TEST_COUNT"
echo "  Duration: ${DURATION}s"
echo "  Screenshots: /tmp/qa-tests/screenshots/"
echo "══════════════════════════════════════════════════════════════════"
echo ""
