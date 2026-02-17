#!/bin/bash
#
# Jobs refresh — launched by macOS launchd (3x/day: 8:00, 14:00, 20:00)
#
# Stage D: Fetch Greenhouse jobs (API, no browser needed)
# Stage E: Fetch Comeet jobs (API, no browser needed)
# Stage G: Generate embeddings for new jobs
#
# Lightweight — no browser, no Chrome quit, just API calls + DB writes.
#

set -uo pipefail

# ── Config ──────────────────────────────────────────
HETZNER_HOST="89.167.50.54"
HETZNER_USER="root"
SSH_KEY="$HOME/.ssh/hetzner_headless"
LOCAL_PG_PORT=5432
REMOTE_PG_PORT=5432
PROJECT_DIR="$HOME/_projects/apply-less/packages/ingestion"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/jobs-refresh-$(date +%Y-%m-%d-%H%M).log"

# ── Setup ───────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "============================================"
echo "🔄 Jobs Refresh — $(date)"
echo "============================================"

WORST_EXIT=0
update_exit() { [ "$1" -gt "$WORST_EXIT" ] && WORST_EXIT=$1; }

# ── Cleanup function ────────────────────────────────
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    # Kill SSH tunnel
    lsof -ti:$LOCAL_PG_PORT | xargs kill -9 2>/dev/null || true
    # Remove old logs (keep 7 days for refresh logs)
    find "$LOG_DIR" -name "jobs-refresh-*.log" -mtime +7 -delete 2>/dev/null || true
    echo "✅ Cleanup done"
}
trap cleanup EXIT

# ── Open SSH tunnel ─────────────────────────────────
echo "📡 Opening SSH tunnel to Hetzner Postgres..."

# Check if tunnel already exists (daily pipeline might still be running)
if lsof -ti:$LOCAL_PG_PORT > /dev/null 2>&1; then
    echo "   Tunnel already open on port $LOCAL_PG_PORT, reusing"
else
    ssh -i "$SSH_KEY" \
        -L $LOCAL_PG_PORT:127.0.0.1:$REMOTE_PG_PORT \
        -L 8000:127.0.0.1:8000 \
        -N -f \
        -o StrictHostKeyChecking=no \
        -o ExitOnForwardFailure=yes \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o BatchMode=yes \
        "$HETZNER_USER@$HETZNER_HOST"

    if [ $? -ne 0 ]; then
        echo "❌ SSH tunnel FAILED — aborting pipeline"
        exit 1
    fi
    echo "✅ SSH tunnel open (PG + ML)"
fi

cd "$PROJECT_DIR"

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

# ── Snapshot ──────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Snapshot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx tsx src/cli.ts snapshot

echo "✅ Snapshot done — $(date)"

# ── Done ───────────────────────────────────────────
echo ""
echo "============================================"
if [ $WORST_EXIT -eq 0 ]; then
    echo "✅ Jobs refresh complete — $(date)"
else
    echo "⚠️  Jobs refresh finished with errors — $(date)"
fi
echo "============================================"
exit $WORST_EXIT
