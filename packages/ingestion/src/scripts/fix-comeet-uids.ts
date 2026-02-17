/**
 * Fix missing Comeet UIDs by probing the Comeet public jobs page.
 * 
 * For each company with source_type='comeet' and no ats_identifier,
 * tries variations of the company name on comeet.com/jobs/{slug}
 * and extracts the company UID from position links.
 * 
 * Usage: npx tsx src/scripts/fix-comeet-uids.ts
 */
import { getDb, closeDb } from '../config/db.js';

async function probeComeetSlug(slug: string): Promise<string | null> {
    try {
        const url = `https://www.comeet.com/jobs/${slug}`;
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) return null;
        
        const html = await res.text();
        
        // Extract UID from position links: /jobs/company/UID/title/POSITION_ID
        const match = html.match(/\/jobs\/[^\/]+\/([A-Z0-9]+\.[A-Z0-9]+)\//i);
        if (match) return match[1];
        
        return null;
    } catch {
        return null;
    }
}

function generateComeetSlugs(companyName: string): string[] {
    const base = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim();
    
    const slugs = new Set<string>();
    
    slugs.add(base.replace(/\s+/g, '-'));
    slugs.add(base.replace(/\s+/g, ''));
    
    // Remove common suffixes
    for (const suffix of ['technologies', 'technology', 'tech', 'labs', 'inc', 'ltd', 'ai', 'io', 'security', 'digital']) {
        const re = new RegExp(`\\b${suffix}\\b`, 'gi');
        const cleaned = base.replace(re, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (cleaned.length > 1 && cleaned !== base.replace(/\s+/g, '-')) {
            slugs.add(cleaned);
        }
    }
    
    return [...slugs].filter(s => s.length > 1);
}

async function main() {
    const db = getDb();
    
    try {
        const result = await db.query(`
            SELECT c.id, c.company_name, c.normalized_name, js.id as js_id, js.base_url
            FROM companies c
            JOIN job_sources js ON c.id = js.company_id
            WHERE js.source_type = 'comeet'
            AND (js.ats_identifier IS NULL OR js.ats_identifier = '')
            ORDER BY c.company_name
        `);
        
        console.log(`\n🔍 Found ${result.rows.length} Comeet companies without UIDs\n`);
        
        let fixed = 0;
        let failed = 0;
        const failedCompanies: string[] = [];
        
        for (const row of result.rows) {
            const slugs = generateComeetSlugs(row.company_name);
            process.stdout.write(`🏢 ${row.company_name} → `);
            
            let foundUid: string | null = null;
            
            for (const slug of slugs) {
                const uid = await probeComeetSlug(slug);
                if (uid) {
                    foundUid = uid;
                    console.log(`✅ UID: ${uid} (slug: ${slug})`);
                    break;
                }
                await new Promise(r => setTimeout(r, 500));
            }
            
            if (foundUid) {
                await db.query(
                    `UPDATE job_sources SET ats_identifier = $1 WHERE id = $2`,
                    [foundUid, row.js_id]
                );
                fixed++;
            } else {
                console.log(`❌ not found (tried: ${slugs.join(', ')})`);
                failedCompanies.push(row.company_name);
                failed++;
            }
            
            await new Promise(r => setTimeout(r, 500));
        }
        
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ Fixed: ${fixed}`);
        console.log(`❌ Not found: ${failed}`);
        if (failedCompanies.length > 0) {
            console.log(`\nStill missing:`);
            failedCompanies.forEach(c => console.log(`   - ${c}`));
        }
        console.log(`${'='.repeat(50)}\n`);
        
    } finally {
        await closeDb();
    }
}

main().catch(console.error);
