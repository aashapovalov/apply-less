#!/bin/bash
#
# Daily SNC ingestion — launched by macOS launchd
# Quits Chrome, opens SSH tunnel to Hetzner Postgres, runs Stage A, cleans up.
# Uses caffeinate to prevent sleep during the run.
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
LOG_FILE="$LOG_DIR/snc-$(date +%Y-%m-%d).log"

# ── Setup ───────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "============================================"
echo "🚀 SNC Daily Ingestion — $(date)"
echo "============================================"

# ── Cleanup function ────────────────────────────────
cleanup() {
    echo "🧹 Cleaning up..."
    # Kill SSH tunnel
    lsof -ti:$LOCAL_PG_PORT | xargs kill -9 2>/dev/null || true
    # Reopen Chrome for the user (normal profile, no debug port)
    open -a "Google Chrome" 2>/dev/null || true
    # Remove old logs (keep 30 days)
    find "$LOG_DIR" -name "snc-*.log" -mtime +30 -delete 2>/dev/null || true
    echo "✅ Cleanup done"
}
trap cleanup EXIT

# ── Step 1: Quit Chrome (can't share debug port) ───
echo "🔒 Quitting Chrome..."
osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
sleep 3

# Force-kill if it didn't quit gracefully
pkill -f "Google Chrome" 2>/dev/null || true
sleep 1

# ── Step 2: Open SSH tunnel ─────────────────────────
echo "📡 Opening SSH tunnel to Hetzner Postgres..."

# Kill any existing tunnel on this port
lsof -ti:$LOCAL_PG_PORT | xargs kill -9 2>/dev/null || true
sleep 1

ssh -i "$SSH_KEY" \
    -L $LOCAL_PG_PORT:127.0.0.1:$REMOTE_PG_PORT \
    -N -f \
    -o StrictHostKeyChecking=no \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    "$HETZNER_USER@$HETZNER_HOST"

echo "✅ SSH tunnel open (localhost:$LOCAL_PG_PORT → Hetzner)"

# ── Step 3: Run ingestion (with caffeinate) ────────
echo "🏭 Running Stage A..."

cd "$PROJECT_DIR"

caffeinate -i npx tsx src/cli.ts snc \
    --budget 250 \
    --page-delay 90000 \
    --detail-delay 25000 \
    --stale-days 90

SNC_EXIT=$?

if [ $SNC_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Stage A complete — $(date)"
else
    echo ""
    echo "⚠️  Stage A finished with errors (exit code: $SNC_EXIT) — $(date)"
fi

# ── Step 4: Run ATS detection (Stage B) ─────────────
echo ""
echo "🔍 Running Stage B (ATS Detection)..."

caffeinate -i npx tsx src/cli.ts detect

DETECT_EXIT=$?

if [ $DETECT_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Stage B complete — $(date)"
else
    echo ""
    echo "⚠️  Stage B finished with errors (exit code: $DETECT_EXIT) — $(date)"
fi

# Use worst exit code
EXIT_CODE=$(( SNC_EXIT > DETECT_EXIT ? SNC_EXIT : DETECT_EXIT ))

echo "============================================"
exit $EXIT_CODE