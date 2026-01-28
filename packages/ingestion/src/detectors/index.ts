import { detectATSFromHTML } from "./ats-detector.js";
import { detectATSFromPage } from "./ats-detector.js";
import { probeGreenhouseAPI, generateSlugVariations } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";
import { deepCrawlForAts } from "./deep-crawler.js"
import { runDetectionPipeline } from "./detection-pipeline.js"
import { debugDetection } from "./debug-detection.js"
import { extractComeetUID } from "./comeet-extractor.js"

export {
    detectATSFromPage,
    detectATSFromHTML,
    probeGreenhouseAPI,
    generateSlugVariations,
    detectByKeyword,
    deepCrawlForAts,
    runDetectionPipeline,
    debugDetection,
    extractComeetUID,
};