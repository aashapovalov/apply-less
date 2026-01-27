import { detectATSFromHTML } from "./ats-detector.js";
import { detectATSFromPage } from "./ats-detector.js";
import { probeGreenhouseAPI, generateSlugVariations } from "./greenhouse-probe.js";
import { detectByKeyword } from "./keyword-detector.js";

export {
    detectATSFromPage,
    detectATSFromHTML,
    probeGreenhouseAPI,
    generateSlugVariations,
    detectByKeyword,
};