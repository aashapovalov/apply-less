// URL normalization utilities

export function normalizeUrl(url: string): string {
    if (!url) return '';

    try {
        //Remove protocol
        let normalized = url.replace(/^https?:\/\//, '');

        //Remove www
        normalized = normalized.replace(/^www\./, '');

        //Remove trailing slash
        normalized = normalized.replace(/\/$/, '');

        //Lowercase
        return normalized.toLowerCase();
    } catch {
        return url.toLowerCase().trim();
    }
}

export function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/[^\w\s-]/g, ''); // Remove special characters except dash
}