import { ATSDetectionResult } from "../types/index.js";

/**
 * Detect ATS provider by searching for known vendor-specific keywords
 * directly inside the raw HTML of a careers page.
 *
 * This heuristic method is used when:
 *  - URL/domain-based detection is inconclusive
 *  - The careers page embeds ATS widgets or scripts
 *  - No direct ATS links are present
 *
 * Currently supported:
 *  - Comeet (detected by presence of "comeet" keyword in HTML)
 *
 * Detection characteristics:
 *  - Low–medium confidence (string-based heuristic)
 *  - Fast (no network calls required)
 *  - Useful as a fallback signal in multi-step ATS detection pipeline
 *
 * Limitations:
 *  - May produce false positives if the keyword appears incidentally
 *  - Cannot extract company slug or board identifier
 *
 * @param html - Raw HTML content of the careers page
 * @param careersUrl - URL of the analyzed careers page (used for context in result)
 *
 * @returns ATSDetectionResult when a known ATS keyword is detected, or null otherwise
 */
export function detectByKeyword(html: string, careersUrl: string): ATSDetectionResult | null {
    // Comeet keyword detection
    if (/comeet/i.test(html)) {
        console.log(`   🎯 Comeet keyword found (UID unknown)`);
        return {
            atsType: "comeet",
            confidence: 0.65,
            detectionMethod: "keyword_match",
            extractedSlug: undefined,
            careersUrl
        };
    }

    return null;
}