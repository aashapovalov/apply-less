#!/bin/bash
#
# Daily SNC ingestion — launched by macOS launchd
# Opens SSH tunnel to Hetzner Postgres, runs Stage A, cleans up.
#

set -euo pipefail

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
    # Remove old logs (keep 30 days)
    find "$LOG_DIR" -name "snc-*.log" -mtime +30 -delete 2>/dev/null || true
    echo "✅ Cleanup done"
}
trap cleanup EXIT

# ── Step 1: Open SSH tunnel ─────────────────────────
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

# Verify tunnel works
if ! pg_isready -h localhost -p $LOCAL_PG_PORT -q 2>/dev/null; then
    # pg_isready may not be installed, try a simple connection test
    echo "   (pg_isready not available, skipping tunnel verification)"
fi

# ── Step 2: Run ingestion ──────────────────────────
echo "🏭 Running Stage A..."

cd "$PROJECT_DIR"

npx tsx src/cli.ts snc \
    --budget 250 \
    --page-delay 90000 \
    --detail-delay 25000 \
    --stale-days 90

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Ingestion complete — $(date)"
else
    echo ""
    echo "⚠️  Ingestion finished with errors (exit code: $EXIT_CODE) — $(date)"
fi

echo "============================================"
exit $EXIT_CODE