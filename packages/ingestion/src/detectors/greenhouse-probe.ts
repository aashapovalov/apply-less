import { ATSDetectionResult } from "../types/index.js";

/**
 * Generate possible Greenhouse board slug variations from a company name.
 *
 * Greenhouse board slugs are usually:
 * - lowercase
 * - alphanumeric
 * - sometimes hyphen-separated
 * - often derived from company name with suffixes removed
 *
 * This function produces multiple normalized candidates to maximize
 * the chance of matching an existing Greenhouse board.
 *
 * Examples:
 *  "Apps Flyer Inc." → ["appsflyer", "apps-flyer", "apps"]
 *  "Open AI"        → ["openai", "open-ai", "open"]
 *
 * @param companyName - Raw company name (as provided by source, e.g. "App's Flyer Inc.")
 * @returns Array of unique slug candidates suitable for Greenhouse API probing
 */
export function generateSlugVariations(companyName: string): string[] {
    const base = companyName.toLowerCase().trim();
    const variations = new Set<string>();

    // Remove all non-alphanumeric: "App's Flyer Inc." -> "appsflyerinc"
    variations.add(base.replace(/[^a-z0-9]/g, ""));

    // Replace spaces/special chars with nothing, remove common suffixes
    const noSuffix = base
        .replace(/\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|company)$/i, "")
        .trim();
    variations.add(noSuffix.replace(/[^a-z0-9]/g, ""));

    // Replace spaces with hyphens: "Apps Flyer" -> "apps-flyer"
    variations.add(base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    variations.add(noSuffix.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    // Just first word (common for single-word company names)
    const firstWord = base.split(/[^a-z0-9]/)[0];
    if (firstWord && firstWord.length > 2) {
        variations.add(firstWord);
    }

    // Filter out empty strings and duplicates
    return Array.from(variations).filter(str => str.length > 1);
}

/**
 * Probe a single Greenhouse board slug via the public Greenhouse Jobs API.
 *
 * Performs a lightweight request to:
 *   https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *
 * If the board exists and returns at least one job, the slug is considered valid.
 *
 * Errors, network failures, and non-existing boards are silently ignored.
 *
 * @param slug - Candidate Greenhouse board slug to test
 * @returns Promise resolving to:
 *   - true  → valid board with jobs found
 *   - false → board not found, empty, or request failed
 */
async function probeSlug(slug: string): Promise<boolean>{
    try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            return data.jobs && data.jobs.length
        }
    } catch {
        // Ignore errors
    }
    return false;
}



/**
 * Attempt to detect a Greenhouse ATS board for a company by probing
 * multiple slug variations against the Greenhouse public API.
 *
 * Strategy:
 *  1. Generate slug candidates from company name
 *  2. Sequentially probe each slug via Greenhouse Jobs API
 *  3. Return the first working slug that returns jobs
 *
 * This method is used when:
 *  - The careers URL is known
 *  - Direct ATS provider detection is inconclusive
 *  - We want to confirm Greenhouse presence via API
 *
 * Detection characteristics:
 *  - Medium confidence (heuristic, based on name matching)
 *  - Reliable when a match is found (API-backed)
 *  - Rate-limited via small delay between probes
 *
 * @param companyName - Official or scraped company name
 * @param careersUrl - Detected careers page URL (used for context in result)
 *
 * @returns Promise resolving to:
 *  - ATSDetectionResult with:
 *      - atsType = "greenhouse"
 *      - extractedSlug = working board slug
 *      - detectionMethod = "api_probe"
 *      - confidence ≈ 0.75
 *  - null if no valid Greenhouse board is found
 */
export async function probeGreenhouseAPI(
    companyName: string,
    careersUrl: string
): Promise<ATSDetectionResult | null> {
    const slugVariations = generateSlugVariations(companyName);

    console.log(`   🔄 Trying Greenhouse API probe...`);
    console.log(`   📝 Slug variations: ${slugVariations.join(', ')}`);

    for (const slug of slugVariations) {
        const found = await probeSlug(slug);

        if (found) {
            console.log(`   🎯 Greenhouse API probe SUCCESS: ${slug}`);

            return {
                atsType: 'greenhouse',
                confidence: 0.75,
                detectionMethod: 'api_probe',
                extractedSlug: slug,
                careersUrl
            };
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`   ❌ Greenhouse API probe: no match`);
    return null;
}
