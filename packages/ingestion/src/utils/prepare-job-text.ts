import {JobForEmbedding} from "../types/index.js";

/**
 * Prepare job text for embedding
 * Combines title, location and description
 */
export function prepareJobText(job: JobForEmbedding): string {
    const parts = [job.title];

    if (job.location) {
        parts.push(job.location);
    }

    if (job.description) {
        // Truncate description to avoid token limits (E5 max limit is 512 tokens)
        // Rough estimate: 1 token ~ 4 characters
        const maxDescLength = 1500; // ~375 tokens, leaving room for title/location
        const truncatedDesc = job.description.length > maxDescLength
            ? job.description.substring(0, maxDescLength)
            : job.description;
        parts.push(truncatedDesc);
    }

    return parts.join(' | ');
}