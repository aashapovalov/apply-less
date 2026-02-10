import { Pool } from "pg";

/**
 * Data captured from a single Stage A ingestion run.
 * Passed to {@link ReportingService.saveIngestionRun} at end of run.
 */
export interface IngestionRunData {
    startedAt: Date;
    finishedAt: Date;
    budget: number;
    requestsUsed: number;
    detailsFetched: number;
    listPagesScanned: number;
    companiesCreated: number;
    companiesUpdated: number;
    companiesFailed: number;
    careersUrlsFound: number;
    rateLimited: boolean;
    errors: Array<{ message: string; details?: string }>;
}

/**
 * Service for persisting ingestion run logs and daily pipeline snapshots.
 *
 * Both methods are designed to be called at the end of Stage A so that
 * reporting is fully automated with no manual CLI commands.
 */
export class ReportingService {
    constructor(private db: Pool) {}

    /**
     * Insert a row into `ingestion_runs` with metrics from the completed run.
     */
    async saveIngestionRun(data: IngestionRunData): Promise<void> {
        const errorsSample = data.errors.slice(0, 10);

        await this.db.query(
            `INSERT INTO ingestion_runs (
                run_date, started_at, finished_at, budget, requests_used,
                details_fetched, list_pages_scanned,
                companies_created, companies_updated, companies_failed,
                careers_urls_found, rate_limited, error_count, errors_sample
            ) VALUES (
                CURRENT_DATE, $1, $2, $3, $4,
                $5, $6,
                $7, $8, $9,
                $10, $11, $12, $13
            )`,
            [
                data.startedAt,
                data.finishedAt,
                data.budget,
                data.requestsUsed,
                data.detailsFetched,
                data.listPagesScanned,
                data.companiesCreated,
                data.companiesUpdated,
                data.companiesFailed,
                data.careersUrlsFound,
                data.rateLimited,
                data.errors.length,
                JSON.stringify(errorsSample),
            ]
        );

        console.log("📊 Run stats saved to ingestion_runs");
    }

    /**
     * Capture a snapshot of the full pipeline funnel and upsert into `daily_snapshots`.
     *
     * Uses a single query with sub-selects for efficiency.
     * If a snapshot already exists for today, it is replaced (latest wins).
     */
    async captureDailySnapshot(): Promise<void> {
        await this.db.query(
            `INSERT INTO daily_snapshots (
                snapshot_date,
                total_companies,
                companies_with_details,
                companies_with_careers,
                companies_with_non_ln_careers,
                companies_with_ats,
                companies_with_slug,
                companies_with_positions,
                total_active_positions,
                total_positions
            )
            SELECT
                CURRENT_DATE,
                (SELECT COUNT(*) FROM companies),
                (SELECT COUNT(*) FROM companies WHERE details_fetched_at IS NOT NULL),
                (SELECT COUNT(*) FROM companies WHERE careers_page_url IS NOT NULL),
                (SELECT COUNT(*) FROM companies
                 WHERE careers_page_url IS NOT NULL
                 AND careers_page_url NOT LIKE '%linkedin.com%'),
                (SELECT COUNT(DISTINCT company_id) FROM job_sources
                 WHERE source_type IN ('greenhouse', 'comeet', 'lever', 'workable')),
                (SELECT COUNT(DISTINCT company_id) FROM job_sources
                 WHERE source_type IN ('greenhouse', 'comeet', 'lever', 'workable')
                 AND ats_identifier IS NOT NULL),
                (SELECT COUNT(DISTINCT company_id) FROM jobs),
                (SELECT COUNT(*) FROM jobs WHERE status = 'active'),
                (SELECT COUNT(*) FROM jobs)
            ON CONFLICT (snapshot_date) DO UPDATE SET
                total_companies               = EXCLUDED.total_companies,
                companies_with_details        = EXCLUDED.companies_with_details,
                companies_with_careers        = EXCLUDED.companies_with_careers,
                companies_with_non_ln_careers = EXCLUDED.companies_with_non_ln_careers,
                companies_with_ats            = EXCLUDED.companies_with_ats,
                companies_with_slug           = EXCLUDED.companies_with_slug,
                companies_with_positions      = EXCLUDED.companies_with_positions,
                total_active_positions        = EXCLUDED.total_active_positions,
                total_positions               = EXCLUDED.total_positions`
        );

        console.log("📊 Daily snapshot saved to daily_snapshots");
    }
}
