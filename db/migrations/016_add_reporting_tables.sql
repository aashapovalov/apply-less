-- Migration 016: Reporting tables for ingestion tracking and daily funnel snapshots.

-- ── Table 1: Ingestion run log ─────────────────────
-- One row per Stage A run. Auto-populated at end of each run.
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id                     SERIAL PRIMARY KEY,
    run_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at             TIMESTAMP NOT NULL,
    finished_at            TIMESTAMP,
    budget                 INTEGER NOT NULL,
    requests_used          INTEGER NOT NULL DEFAULT 0,
    details_fetched        INTEGER NOT NULL DEFAULT 0,
    list_pages_scanned     INTEGER NOT NULL DEFAULT 0,
    companies_created      INTEGER NOT NULL DEFAULT 0,
    companies_updated      INTEGER NOT NULL DEFAULT 0,
    companies_failed       INTEGER NOT NULL DEFAULT 0,
    careers_urls_found     INTEGER NOT NULL DEFAULT 0,
    rate_limited           BOOLEAN NOT NULL DEFAULT FALSE,
    error_count            INTEGER NOT NULL DEFAULT 0,
    errors_sample          JSONB,
    created_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_date ON ingestion_runs(run_date DESC);

-- ── Table 2: Daily funnel snapshot ─────────────────
-- One row per day. Captures full pipeline state.
CREATE TABLE IF NOT EXISTS daily_snapshots (
    id                            SERIAL PRIMARY KEY,
    snapshot_date                 DATE NOT NULL UNIQUE,
    total_companies               INTEGER NOT NULL DEFAULT 0,
    companies_with_details        INTEGER NOT NULL DEFAULT 0,
    companies_with_careers        INTEGER NOT NULL DEFAULT 0,
    companies_with_non_ln_careers INTEGER NOT NULL DEFAULT 0,
    companies_with_ats            INTEGER NOT NULL DEFAULT 0,
    companies_with_slug           INTEGER NOT NULL DEFAULT 0,
    companies_with_positions      INTEGER NOT NULL DEFAULT 0,
    total_active_positions        INTEGER NOT NULL DEFAULT 0,
    total_positions               INTEGER NOT NULL DEFAULT 0,
    created_at                    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(snapshot_date DESC);
