import { Page } from "playwright";
import { deepCrawlForAts, DeepCrawlOptions } from "./deep-crawler.js";
import { ATSDetectionResult } from "../types/index.js";
import { detectATSFromPage } from "./ats-detector.js";
import { probeGreenhouseAPI } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";
import { extractComeetUID } from "./comeet-extractor.js";

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
 *  3) Comeet UID extraction (if Comeet detected but no UID) - follows position links
 *  4) Optional deep crawl across job/career links to find ATS pages not directly linked
 *  5) Keyword-based HTML detection as a last resort (fast but lower confidence)
 *  6) If keyword found Comeet, try UID extraction again
 *
 * Key principle: Finding an ATS type without a slug should NOT stop the pipeline.
 * We keep probing until we find a slug or exhaust all options.
 *
 * @param context - Detection context including page, companyName, and careersUrl
 * @param options - Pipeline configuration (deep crawl toggle + crawl limits)
 *
 * @returns Promise resolving to an ATSDetectionResult
 */
export async function runDetectionPipeline(
    context: DetectionContext,
    options: PipelineOptions = {},
): Promise<ATSDetectionResult> {
    const { page, companyName, careersUrl } = context;
    const { enableDeepCrawl = false, deepCrawlOptions } = options;

    // Track best detection so far (even without slug)
    let bestDetection: ATSDetectionResult | null = null;

    // 1. Main detection from careers page
    let detection = await detectATSFromPage(page, careersUrl);
    
    // Return early only if we have BOTH a known ATS type AND extracted slug
    if (detection.atsType !== 'unknown' && detection.extractedSlug) {
        return detection;
    }

    // Remember if we found an ATS type (even without slug)
    if (detection.atsType !== 'unknown') {
        bestDetection = detection;
    }

    // 2. Greenhouse API probe
    const greenhouseResult = await probeGreenhouseAPI(companyName, careersUrl);
    if (greenhouseResult) {
        return greenhouseResult;
    }

    // 3. If Comeet detected, try to extract UID from position pages
    if (bestDetection?.atsType === 'comeet') {
        const comeetResult = await extractComeetUID(page, careersUrl);
        if (comeetResult) {
            return comeetResult;
        }
    }

    // 4. Deep crawl for hidden ATS
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

    // 5. Keyword-based detection
    const html = await page.content();
    const keywordResult = await detectByKeyword(html, careersUrl);

    if (keywordResult) {
        // If keyword found Comeet but we don't have UID yet, try extraction
        if (keywordResult.atsType === 'comeet' && !keywordResult.extractedSlug && !bestDetection?.extractedSlug) {
            const comeetResult = await extractComeetUID(page, careersUrl);
            if (comeetResult) {
                return comeetResult;
            }
        }

        // Update best detection if keyword is better or we had nothing
        if (!bestDetection || keywordResult.confidence > bestDetection.confidence) {
            bestDetection = keywordResult;
        }
    }

    // Return best detection found (even if no slug), or unknown
    if (bestDetection) {
        return bestDetection;
    }

    return {
        atsType: 'unknown',
        confidence: 0,
        detectionMethod: 'no_match',
        careersUrl,
    };
}
