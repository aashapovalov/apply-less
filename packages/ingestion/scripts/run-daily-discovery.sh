#!/bin/bash
#
# Daily discovery pipeline — launched by macOS launchd (once/day at 10:00 AM)
#
# Stage A: Scrape SNC companies + details (browser, needs Chrome SSO profile)
# Stage B: Detect ATS on new companies (browser, Playwright)
# Stage D: Fetch Greenhouse jobs (API)
# Stage E: Fetch Comeet jobs (API)
# Stage G: Generate embeddings for new jobs
#

set -uo pipefail

# ── Config ──────────────────────────────────────────
HETZNER_HOST="89.167.50.54"
HETZNER_USER="root"
SSH_KEY="$HOME/.ssh/hetzner_applyles"
LOCAL_PG_PORT=5432
REMOTE_PG_PORT=5432
PROJECT_DIR="$HOME/_projects/apply-less/packages/ingestion"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/daily-$(date +%Y-%m-%d).log"

# ── Setup ───────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "============================================"
echo "🚀 Daily Discovery Pipeline — $(date)"
echo "============================================"

WORST_EXIT=0
update_exit() { [ "$1" -gt "$WORST_EXIT" ] && WORST_EXIT=$1; }

# ── Cleanup function ────────────────────────────────
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    # Kill SSH tunnel
    lsof -ti:$LOCAL_PG_PORT | xargs kill -9 2>/dev/null || true
    # Reopen Chrome for the user (normal profile, no debug port)
    open -a "Google Chrome" 2>/dev/null || true
    # Remove old logs (keep 30 days)
    find "$LOG_DIR" -name "daily-*.log" -mtime +30 -delete 2>/dev/null || true
    echo "✅ Cleanup done"
}
trap cleanup EXIT

# ── Step 1: Quit Chrome (can't share debug port) ───
echo "🔒 Quitting Chrome..."
osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
sleep 3
pkill -f "Google Chrome" 2>/dev/null || true
sleep 1

# ── Step 2: Open SSH tunnel ─────────────────────────
echo "📡 Opening SSH tunnel to Hetzner Postgres..."
lsof -ti:$LOCAL_PG_PORT | xargs kill -9 2>/dev/null || true
sleep 1

ssh -i "$SSH_KEY" \
    -L $LOCAL_PG_PORT:127.0.0.1:$REMOTE_PG_PORT \
    -L 8000:127.0.0.1:8000 \
    -N -f \
    -o StrictHostKeyChecking=no \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    "$HETZNER_USER@$HETZNER_HOST"

echo "✅ SSH tunnel open (PG :$LOCAL_PG_PORT + ML :8000 → Hetzner)"

cd "$PROJECT_DIR"

# ── Stage A: SNC Company Scraping ───────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Stage A: SNC Company Scraping"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts snc \
    --budget 250 \
    --page-delay 90000 \
    --detail-delay 25000 \
    --stale-days 90

update_exit $?
echo "✅ Stage A finished (exit: $?) — $(date)"

# ── Stage B: ATS Detection ─────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Stage B: ATS Detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts detect --deep-crawl

update_exit $?
echo "✅ Stage B finished (exit: $?) — $(date)"

# ── Stage D: Greenhouse Jobs ───────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 Stage D: Greenhouse Jobs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts greenhouse

update_exit $?
echo "✅ Stage D finished (exit: $?) — $(date)"

# ── Stage E: Comeet Jobs ───────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☄️  Stage E: Comeet Jobs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts comeet

update_exit $?
echo "✅ Stage E finished (exit: $?) — $(date)"

# ── Stage G: Embeddings ───────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Stage G: Embeddings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts embeddings

update_exit $?
echo "✅ Stage G finished (exit: $?) — $(date)"

# ── Snapshot ──────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Snapshot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

caffeinate -i npx tsx src/cli.ts snapshot

echo "✅ Snapshot done — $(date)"

# ── Done ───────────────────────────────────────────
echo ""
echo "============================================"
if [ $WORST_EXIT -eq 0 ]; then
    echo "✅ Daily pipeline complete — $(date)"
else
    echo "⚠️  Daily pipeline finished with errors — $(date)"
fi
echo "============================================"
exit $WORST_EXIT
