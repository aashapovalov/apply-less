// Comeet API client for fetching jobs
// API Docs: https://www.comeet.com/careers-api/2.0/doc

import axios, { AxiosInstance } from "axios";

import { ComeetJob } from "../types/index.js";

const BASE_URL = "https://www.comeet.com/careers-api/2.0";

export class ComeetClient {
    private httpClient: AxiosInstance;

    constructor() {
        this.httpClient = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });
    }

    /**
     * Fetch positions from API (with optional token)
     */
    async fetchPositions(companyUid: string, token?: string): Promise<ComeetJob[]> {
        let url = `${BASE_URL}/company/${companyUid}/positions`;
        if (token) {
            url += `?token=${token}`;
        }

        try {
            console.log(`  📥 Fetching Comeet API: ${companyUid}`);
            const response = await this.httpClient.get(url);

            const positions = response.data?.positions ||
                (Array.isArray(response.data)) ? response.data : [];
            console.log(`  ✅ API returned ${positions.length} jobs`);
            return positions;
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.log(`  ⚠️  API 404 for: ${companyUid}`);
            }
            return [];
        }
    }

    /**
     * Fetch single position details (includes full description with details=true)
     */
    async fetchPositionDetail(companyUid: string, positionUid: string, token?: string): Promise<ComeetJob | null> {
        let url = `${BASE_URL}/company/${companyUid}/positions/${positionUid}`;
        const params = new URLSearchParams();
        if (token) {
            params.append('token', token);
        }
        params.append('details', 'true'); // This returns the full job description!
        
        url += '?' + params.toString();

        try {
            const response = await this.httpClient.get(url);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error(`  ⚠️  Failed to fetch position detail: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract HTML description from Comeet details array
     * The API returns details as an array: [{name, value (HTML), order}, ...]
     * We combine the HTML sections for proper formatting in frontend
     */
    parseDetailsToDescription(details: Array<{name: string; value: string; order: number}> | undefined): string {
        if (!details || !Array.isArray(details) || details.length === 0) {
            return '';
        }

        // Sort by order and combine all sections as HTML
        const sorted = [...details].sort((a, b) => a.order - b.order);
        
        const sections: string[] = [];
        for (const section of sorted) {
            if (section.value && section.value.trim()) {
                // Keep HTML, add section header
                sections.push(`<h3>${section.name}</h3>${section.value}`);
            }
        }

        return sections.join('');
    }
}
