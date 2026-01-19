import axios, {AxiosInstance} from "axios";
import {GreenHouseJob, GreenHouseJobDetail} from "../types/index.js";

const BASE_URL = "https://boards-api.greenhouse.io/v1/boards";

export class GreenhouseClient {
    private httpClient: AxiosInstance;

    constructor() {
        this.httpClient = axios.create({
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "application/json",
            }
        });
    }

    /**
     * Extract compeny slug from Greenhouse URL
     *  * Examples:
     *      *   https://boards.greenhouse.io/appsflyer -> appsflyer
     *      *   https://www.appsflyer.com/careers -> try to detect from page
      */
    extractSlugFromUrl(url: string): string | null {
        // Direct Greenhouse board URL
        const boardMatch = url.match(/boards\.greenhouse\.io\/([^/?]+)/);
        if (boardMatch) {
            return boardMatch[1];
        }

        // Try embedded board
        const embedMatch = url.match(/greenhouse\.io\/embed\/job_board\?for=([^&]+)/);
        if (embedMatch) {
            return embedMatch[1];
        }

        return null;
    }

    /**
     * Fetch all jobs for a company
     */
    async fetchJobs(companySlug: string): Promise<GreenHouseJob[]> {
        const url = `${BASE_URL}/${companySlug}/jobs`;

        try {
            console.log(`  📥 Fetching Greenhouse jobs for: ${companySlug}`);

            const response = await this.httpClient.get(url);

            if (response.data && response.data.jobs) {
                console.log(`  ✅ Found ${response.data.jobs.length} jobs`);
                return response.data.jobs;
            }

            return [];
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.log(`  ⚠️  Company not found: ${companySlug}`);
                return [];
            }
            throw new Error(`Failed to fetch Greenhouse jobs: ${error.message}`);
        }
    }

    /**
     * Fetch detailed job information
     */
    async fetchJobDetail(companySlug: string, jobId: number): Promise<GreenHouseJobDetail | null> {
        const url = `${BASE_URL}/${companySlug}/jobs/${jobId}`;

        try {
            const response = await this.httpClient.get(url);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch job detail: ${error.message}`);
        }
    }

    /**
     * Test if a company has a Greenhouse board
     */
    async testCompany(companySlug: string): Promise<boolean> {
        try {
            const jobs = await this.fetchJobs(companySlug);
            return jobs.length > 0;
        } catch (error: any) {
            return false;
        }
    }
}
