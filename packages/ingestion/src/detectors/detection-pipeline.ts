import { Page } from "playwright";
import { deepCrawlForAts, DeepCrawlOptions } from "./deep-crawler.js";
import { ATSDetectionResult } from "../types/index.js";
import { detectATSFromPage } from "./ats-detector.js";
import { probeGreenhouseAPI } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";

export interface DetectionContext {
    page: Page;
    companyName: string;
    careersUrl: string;
}

export interface PipelineOptions {
    enableDeepCrawl?: boolean;
    deepCrawlOptions?: DeepCrawlOptions;
}

/**
 * Run a multi-stage ATS detection pipeline and return the best available detection result.
 *
 * Pipeline stages (in order):
 *  1) Primary detection from the current careers page (URL signals, embedded widgets, HTML patterns, etc.)
 *  2) Greenhouse API probing using slug variations derived from companyName
 *  3) Optional deep crawl across job/career links to find ATS pages not directly linked from the start page
 *     - Crawling is bounded by maxDepth/maxLinksPerLevel
 *     - After crawling, the function navigates back to careersUrl for subsequent steps
 *  4) Keyword-based HTML detection as a last resort (fast but lower confidence)
 *
 * Notes:
 *  - The function returns early on the first confident non-unknown detection.
 *  - Deep crawl can mutate the page navigation state; the pipeline resets it back to careersUrl.
 *
 * @param context - Detection context including page, companyName, and careersUrl
 * @param options - Pipeline configuration (deep crawl toggle + crawl limits)
 *
 * @returns Promise resolving to an ATSDetectionResult:
 *  - atsType !== "unknown" when a provider is detected
 *  - atsType === "unknown" with detectionMethod "no_match" when no signals are found
 */
export async function runDetectionPipeline(
    context: DetectionContext,
    options: PipelineOptions = {},
): Promise<ATSDetectionResult> {
    const { page, companyName, careersUrl } = context;
    const { enableDeepCrawl = false, deepCrawlOptions } = options;

    // 1. Main detection from careers page
    let detection = await detectATSFromPage(page, careersUrl);
    
    // Return early only if we have both a known ATS type AND extracted slug
    // Otherwise continue to API probe which might find the slug
    if (detection.atsType !== 'unknown' && detection.extractedSlug) {
        return detection;
    }

    // 2. Greenhouse API probe
    const greenhouseResult = await probeGreenhouseAPI(companyName, careersUrl);
    if (greenhouseResult) {
        return greenhouseResult;
    }

    // 3. Deep crawl for hidden ATS
    if (enableDeepCrawl) {
        console.log(`   🔄 Deep crawling for hidden ATS...`);

        const deepResult = await deepCrawlForAts(page, careersUrl, deepCrawlOptions);

        if (deepResult) {
            return deepResult;
        }

        // Navigate back to original page for subsequent checks
        await page.goto(careersUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
    }

    // 4. Keyword-based detection (last resort)
    const html = await page.content();
    const keywordResult = await detectByKeyword(html, careersUrl);

    if (keywordResult) {
        return keywordResult;
    }

    // Nothing found
    return {
        atsType: 'unknown',
        confidence: 0,
        detectionMethod: 'no_match',
        careersUrl,
    }

}