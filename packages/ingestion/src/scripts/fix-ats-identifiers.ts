/**
 * Fix missing ATS identifiers for Comeet and Greenhouse companies.
 * 
 * Two strategies:
 * 1. Comeet: Probes comeet.com/jobs/{slug} variations to find company UID
 * 2. Greenhouse: Checks both US and EU API endpoints
 * 
 * Also applies known manual fixes from investigation.
 * 
 * Usage: npx tsx src/scripts/fix-ats-identifiers.ts
 */
import { getDb, closeDb } from '../config/db.js';

// ── Known UIDs from manual investigation ────────────────────────
// Format: comeet.com/jobs/{comeet_slug}/{uid}/...
const KNOWN_COMEET_UIDS: Record<string, string> = {
    'Agora':        '08.007',  // comeet.com/jobs/agora/08.007
    'Code Ocean':   'A6.004',  // comeet.com/jobs/codeocean/A6.004
    'Elsight':      'B9.006',  // comeet.com/jobs/elsight/B9.006
    'Fabric':       '52.009',  // comeet.com/jobs/fabric/52.009
    'Immunai':      '37.009',  // comeet.com/jobs/immunai/37.009
};

const KNOWN_GREENHOUSE_SLUGS: Record<string, { slug: string; region?: string }> = {
    'Lightrun':  { slug: 'lightrun', region: 'eu' },
    'Beewise':   { slug: 'beewise' },
};

// ── Comeet probing ──────────────────────────────────────────────

async function probeComeetSlug(slug: string): Promise<string | null> {
    try {
        const url = `https://www.comeet.com/jobs/${slug}`;
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        
        const html = await res.text();
        
        // Extract UID from position links: /jobs/company/UID/title/POSITION_ID
        const match = html.match(/\/jobs\/[^\/]+\/([A-Z0-9]+\.[A-Z0-9]+)\//i);
        if (match) return match[1];
        
        // Check if page has any job content (might be empty board)
        if (html.includes('comeet') || html.includes('position')) {
            // Try alternate UID patterns
            const uidMatch = html.match(/"uid"\s*:\s*"([A-Z0-9]+\.[A-Z0-9]+)"/i);
            if (uidMatch) return uidMatch[1];
        }
        
        return null;
    } catch {
        return null;
    }
}

function generateComeetSlugs(companyName: string): string[] {
    const base = companyName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
    const slugs = new Set<string>();
    
    // Standard variations
    slugs.add(base.replace(/\s+/g, '-'));
    slugs.add(base.replace(/\s+/g, ''));
    
    // Remove common suffixes
    for (const suffix of ['technologies', 'technology', 'tech', 'labs', 'inc', 'ltd', 'ai', 'io', 'security', 'digital', 'dimension', 'global']) {
        const re = new RegExp(`\\s*\\b${suffix}\\b\\s*`, 'gi');
        const cleaned = base.replace(re, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (cleaned.length > 1 && !slugs.has(cleaned)) {
            slugs.add(cleaned);
        }
        // Also without hyphens
        const nohyphen = cleaned.replace(/-/g, '');
        if (nohyphen.length > 1 && !slugs.has(nohyphen)) {
            slugs.add(nohyphen);
        }
    }
    
    // First word only
    const first = base.split(/[^a-z0-9]/)[0];
    if (first && first.length > 2) slugs.add(first);
    
    return [...slugs].filter(s => s.length > 1);
}

// ── Greenhouse probing (US + EU) ────────────────────────────────

async function probeGreenhouseSlug(slug: string): Promise<{ found: boolean; region?: string }> {
    try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            const data = await res.json() as any;
            if (data.jobs?.length > 0) {
                // Check if any job URL contains .eu. to determine region
                const firstJobUrl = data.jobs[0]?.absolute_url || '';
                const region = firstJobUrl.includes('.eu.greenhouse.io') ? 'eu' : undefined;
                return { found: true, region };
            }
        }
    } catch {}
    return { found: false };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
    const db = getDb();
    
    try {
        // ── Fix Comeet companies ──
        console.log('\n' + '='.repeat(60));
        console.log('🔧 Fixing Comeet companies without UIDs');
        console.log('='.repeat(60) + '\n');
        
        const comeetResult = await db.query(`
            SELECT c.id, c.company_name, js.id as js_id, js.base_url
            FROM companies c
            JOIN job_sources js ON c.id = js.company_id
            WHERE js.source_type = 'comeet'
            AND (js.ats_identifier IS NULL OR js.ats_identifier = '')
            ORDER BY c.company_name
        `);
        
        console.log(`Found ${comeetResult.rows.length} Comeet companies without UIDs\n`);
        
        let comeetFixed = 0;
        let comeetFailed = 0;
        const comeetMissing: string[] = [];
        
        for (const row of comeetResult.rows) {
            const name = row.company_name;
            process.stdout.write(`🏢 ${name} → `);
            
            // Check known UIDs first
            if (KNOWN_COMEET_UIDS[name]) {
                const uid = KNOWN_COMEET_UIDS[name];
                await db.query(
                    `UPDATE job_sources SET ats_identifier = $1 WHERE id = $2`,
                    [uid, row.js_id]
                );
                console.log(`✅ ${uid} (known)`);
                comeetFixed++;
                continue;
            }
            
            // Probe comeet.com
            const slugs = generateComeetSlugs(name);
            let foundUid: string | null = null;
            
            for (const slug of slugs) {
                const uid = await probeComeetSlug(slug);
                if (uid) {
                    foundUid = uid;
                    console.log(`✅ ${uid} (probed: ${slug})`);
                    break;
                }
                await new Promise(r => setTimeout(r, 500));
            }
            
            if (foundUid) {
                await db.query(
                    `UPDATE job_sources SET ats_identifier = $1 WHERE id = $2`,
                    [foundUid, row.js_id]
                );
                comeetFixed++;
            } else {
                console.log(`❌ (tried: ${slugs.join(', ')})`);
                comeetMissing.push(name);
                comeetFailed++;
            }
            
            await new Promise(r => setTimeout(r, 300));
        }
        
        // ── Fix Greenhouse companies ──
        console.log('\n' + '='.repeat(60));
        console.log('🔧 Fixing Greenhouse companies without slugs');
        console.log('='.repeat(60) + '\n');
        
        const ghResult = await db.query(`
            SELECT c.id, c.company_name, js.id as js_id, js.base_url
            FROM companies c
            JOIN job_sources js ON c.id = js.company_id
            WHERE js.source_type = 'greenhouse'
            AND (js.ats_identifier IS NULL OR js.ats_identifier = '')
            ORDER BY c.company_name
        `);
        
        console.log(`Found ${ghResult.rows.length} Greenhouse companies without slugs\n`);
        
        let ghFixed = 0;
        let ghFailed = 0;
        const ghMissing: string[] = [];
        
        for (const row of ghResult.rows) {
            const name = row.company_name;
            process.stdout.write(`🏢 ${name} → `);
            
            // Check known slugs first
            if (KNOWN_GREENHOUSE_SLUGS[name]) {
                const { slug, region } = KNOWN_GREENHOUSE_SLUGS[name];
                const baseUrl = region 
                    ? `https://job-boards.${region}.greenhouse.io/${slug}`
                    : undefined;
                await db.query(
                    `UPDATE job_sources SET ats_identifier = $1${baseUrl ? ', base_url = $3' : ''} WHERE id = $2`,
                    baseUrl ? [slug, row.js_id, baseUrl] : [slug, row.js_id]
                );
                console.log(`✅ ${slug}${region ? ` (${region})` : ''} (known)`);
                ghFixed++;
                continue;
            }
            
            // Probe Greenhouse API
            const slugs = generateComeetSlugs(name); // reuse slug generator
            let foundSlug: string | null = null;
            let foundRegion: string | undefined;
            
            for (const slug of slugs) {
                const result = await probeGreenhouseSlug(slug);
                if (result.found) {
                    foundSlug = slug;
                    foundRegion = result.region;
                    console.log(`✅ ${slug}${foundRegion ? ` (${foundRegion})` : ''} (probed)`);
                    break;
                }
                await new Promise(r => setTimeout(r, 300));
            }
            
            if (foundSlug) {
                const baseUrl = foundRegion 
                    ? `https://job-boards.${foundRegion}.greenhouse.io/${foundSlug}`
                    : undefined;
                await db.query(
                    `UPDATE job_sources SET ats_identifier = $1${baseUrl ? ', base_url = $3' : ''} WHERE id = $2`,
                    baseUrl ? [foundSlug, row.js_id, baseUrl] : [foundSlug, row.js_id]
                );
                ghFixed++;
            } else {
                console.log(`❌ (tried: ${slugs.join(', ')})`);
                ghMissing.push(name);
                ghFailed++;
            }
            
            await new Promise(r => setTimeout(r, 300));
        }
        
        // ── Summary ──
        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log('='.repeat(60));
        console.log(`Comeet:      ✅ ${comeetFixed} fixed | ❌ ${comeetFailed} missing`);
        console.log(`Greenhouse:  ✅ ${ghFixed} fixed | ❌ ${ghFailed} missing`);
        
        if (comeetMissing.length > 0) {
            console.log(`\nComeet still missing:`);
            comeetMissing.forEach(c => console.log(`   - ${c}`));
        }
        if (ghMissing.length > 0) {
            console.log(`\nGreenhouse still missing:`);
            ghMissing.forEach(c => console.log(`   - ${c}`));
        }
        console.log('');
        
    } finally {
        await closeDb();
    }
}

main().catch(console.error);
