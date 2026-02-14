#!/bin/bash
#
# Run stages B → G manually (assumes SSH tunnel is already open)
#

set -uo pipefail

PROJECT_DIR="$HOME/_projects/apply-less/packages/ingestion"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/manual-bdefg-$(date +%Y-%m-%d-%H%M).log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "============================================"
echo "🚀 Manual Pipeline B→G — $(date)"
echo "============================================"

WORST_EXIT=0
update_exit() { [ "$1" -gt "$WORST_EXIT" ] && WORST_EXIT=$1; }

cd "$PROJECT_DIR"

# ── Stage B: ATS Detection ─────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Stage B: ATS Detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx tsx src/cli.ts detect --deep-crawl

update_exit $?
echo "✅ Stage B finished (exit: $?) — $(date)"

# ── Stage D: Greenhouse Jobs ───────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 Stage D: Greenhouse Jobs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx tsx src/cli.ts greenhouse

update_exit $?
echo "✅ Stage D finished (exit: $?) — $(date)"

# ── Stage E: Comeet Jobs ───────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☄️  Stage E: Comeet Jobs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx tsx src/cli.ts comeet

update_exit $?
echo "✅ Stage E finished (exit: $?) — $(date)"

# ── Stage G: Embeddings ───────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Stage G: Embeddings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx tsx src/cli.ts embeddings

update_exit $?
echo "✅ Stage G finished (exit: $?) — $(date)"

# ── Done ───────────────────────────────────────────
echo ""
echo "============================================"
if [ $WORST_EXIT -eq 0 ]; then
    echo "✅ Pipeline B→G complete — $(date)"
else
    echo "⚠️  Pipeline B→G finished with errors — $(date)"
fi
echo "============================================"
exit $WORST_EXIT
