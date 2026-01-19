// Comeet API client for fetching jobs
// API Docs: https://www.comeet.com/careers-api/2.0/doc

import axios, { AxiosInstance } from "axios";

import {ComeetJob} from "../types/index.js";

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
     * Extract company UID from Comeet URL
     * Examples:
     *   https://www.comeet.com/jobs/ai21labs/12.345 -> ai21labs
     *   https://careers.ai21.com -> need to check page for UID
     */
    extractUidFromUrl(url: string): string | null {
        // Direct Comeet URL
        const comeetMatch = url.match(/comeet\.com\/jobs\/([^/?]+)/);
        if (comeetMatch) {
            return comeetMatch[1];
        }

        // Try to extract from careers subdomain
        const domainMatch = url.match(/careers\.([^.]+)\./);
        if (domainMatch) {
            return domainMatch[1];
        }

        return null;
    }

    /**
     * Fetch all positions for a company
     */
    async fetchPositions(companyUid: string): Promise<ComeetJob[]> {
        const url = `${BASE_URL}/company/${companyUid}/positions`;

        try {
            console.log(`  📥 Fetching Comeet jobs for: ${companyUid}`);

            const response = await this.httpClient.get(url);

            if (response.data && response.data.positions) {
                console.log(`  ✅ Found ${response.data.positions.length} jobs`);
                return response.data.positions;
            }

            return [];
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.log(`  ⚠️  Company not found: ${companyUid}`);
                return [];
            }
            throw new Error(`Failed to fetch Comeet jobs: ${error.message}`);
        }
    }

    /**
     * Test if a company has a Comeet page
     */
    async testCompany(companyUid: string): Promise<boolean> {
        try {
            const positions = await this.fetchPositions(companyUid);
            return positions.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Try to find company UID by trying common variations
     */
    async findCompanyUid(companyName: string): Promise<string | null> {
        // Try normalized name (lowercase, no spaces)
        const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

        const variations = [
            normalized,
            companyName.toLowerCase().replace(/\s+/g, ''),
            companyName.toLowerCase().replace(/\s+/g, '-'),
            companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ];

        for (const uid of variations) {
            try {
                const positions = await this.fetchPositions(uid);
                if (positions.length > 0) {
                    console.log(`  ✅ Found UID: ${uid}`);
                    return uid;
                }
            } catch (error) {
                // Continue trying
            }
        }
        return null;
    }
}