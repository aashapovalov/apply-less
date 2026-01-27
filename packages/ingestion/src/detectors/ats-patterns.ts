import {ATSPattern} from "../types/index.js";

export const ATS_PATTERNS: ATSPattern[] = [
    // Greenhouse
    {
        type: 'greenhouse',
        urlPatterns: [
            /boards\.greenhouse\.io\/([^/?]+)/,
            /job-boards\.greenhouse\.io\/([^/?]+)/,
            /greenhouse\.io\/embed\/job_board\?for=([^&]+)/,
        ],
        htmlPatterns: [
            /greenhouse\.io/i,
            /data-gh-/i,
            /greenhouse_job_id/i,  // Custom career pages with GH backend
            /job-boards\.greenhouse\.io/i,  // Direct job-boards URL
            /job-boards\\\.greenhouse\\\.io/i,  // Escaped in JSON
        ],
        selectors: ['iframe[src*="greenhouse.io"]', '[data-gh-src]', '#grnhse_app'],
        scriptPatterns: [
            /Grnhse\.Iframe\.load/,
            /greenhouse_job_id/,  // JS objects with greenhouse_job_id attribute
        ],
        slugExtractor: (html, url) => {
            // Check embed pattern FIRST (before standard board URLs)
            // Formats: 
            //   boards.greenhouse.io/embed/job_board/js?for=SLUG
            //   boards.greenhouse.io/embed/job_app?for=SLUG&token=...
            let match = url.match(/boards\.greenhouse\.io\/embed\/job_board\/js\?for=([^&]+)/) ||
                html.match(/boards\.greenhouse\.io\/embed\/job_board\/js\?for=([^&'"]+)/) ||
                html.match(/boards\.greenhouse\.io\/embed\/job_app\?for=([^&'"]+)/) ||
                url.match(/greenhouse\.io\/embed\/job_board\?for=([^&]+)/) ||
                html.match(/greenhouse\.io\/embed\/job_board\?for=([^&'"]+)/);
            if (match) return { slug: match[1] };
            
            // Standard board URLs (exclude 'embed' as slug)
            match = url.match(/boards\.greenhouse\.io\/([^/?]+)/) ||
                html.match(/boards\.greenhouse\.io\/([^/?'"]+)/);
            if (match && match[1] !== 'embed') return { slug: match[1] };
            
            // Grnhse.Iframe.load pattern
            match = html.match(/Grnhse\.Iframe\.load\s*\(\s*['"]([^'"]+)['"]/);
            if (match && match[1] !== 'embed') return { slug: match[1] };
            
            // job-boards.greenhouse.io pattern (custom career pages)
            // Handle both normal slashes and escaped slashes (\/) in JSON
            match = url.match(/job-boards\.greenhouse\.io\/([^/?]+)/) ||
                html.match(/job-boards\.greenhouse\.io\/([^/?'"]+)/) ||
                html.match(/job-boards\.greenhouse\.io\\\/([^\\/]+)\\\//);  // escaped: \/
            if (match && match[1] !== 'embed') return { slug: match[1] };
            
            // greenhouse_job_id pattern - need to find company slug elsewhere
            if (/greenhouse_job_id/.test(html)) {
                const slugMatch = html.match(/job-boards\.greenhouse\.io\/([^/?'"]+)/) ||
                    html.match(/boards\.greenhouse\.io\/([^/?'"]+)/);
                if (slugMatch && slugMatch[1] !== 'embed') return { slug: slugMatch[1] };
            }
            
            return null;
        }
    },
    // Comeet
    {
        type: 'comeet',
        urlPatterns: [/comeet\.com\/jobs\/([^/?]+)/, /comeet\.co\/jobs\/([^/?]+)/],
        htmlPatterns: [/comeet\.com/i, /comeet\.co/i, /COMEET\.init/i, /comeet-position/i, /comeetvar/i, /comeet_uid/i],
        selectors: ['iframe[src*="comeet"]', '.comeet-positions-list', '.comeet-position', '#comeet_script-js-extra'],
        scriptPatterns: [/COMEET\.init\s*\(/, /comeetvar\s*=\s*\{/],
        slugExtractor: (html, url) => {
            // From URL
            let match = url.match(/comeet\.co?m?\/jobs\/([^/?]+)/);
            if (match) return { slug: match[1] };

            // From COMEET.init widget (company-uid with hyphen)
            let uidMatch = html.match(/"company-uid"\s*:\s*"([^"]+)"/);
            let tokenMatch = html.match(/"token"\s*:\s*"([^"]+)"/);
            if (uidMatch) return { slug: uidMatch[1], token: tokenMatch?.[1] };

            // From comeetvar (comeet_uid with underscore)
            uidMatch = html.match(/"comeet_uid"\s*:\s*"([^"]+)"/);
            tokenMatch = html.match(/"comeet_token"\s*:\s*"([^"]+)"/);
            if (uidMatch) return { slug: uidMatch[1], token: tokenMatch?.[1] };

            // From iframe src attribute (e.g., src="https://www.comeet.co/jobs/C6.001/social?token=...&company-uid=C6.001")
            const iframeSrcMatch = html.match(/iframe[^>]*src=["']([^"']*comeet\.co[^"']*)["']/i);
            if (iframeSrcMatch) {
                const iframeSrc = iframeSrcMatch[1];
                // Extract UID from path: /jobs/C6.001/
                const pathUidMatch = iframeSrc.match(/\/jobs\/([^/?]+)/);
                // Extract token from query param
                const iframeTokenMatch = iframeSrc.match(/token=([^&]+)/);
                if (pathUidMatch) {
                    return { slug: pathUidMatch[1], token: iframeTokenMatch?.[1] };
                }
                // Or from company-uid query param
                const paramUidMatch = iframeSrc.match(/company-uid=([^&]+)/);
                if (paramUidMatch) {
                    return { slug: paramUidMatch[1], token: iframeTokenMatch?.[1] };
                }
            }

            return null;
        }
    },

    // Lever
    {
        type: 'lever',
        urlPatterns: [/jobs\.lever\.co\/([^/?]+)/],
        htmlPatterns: [/lever\.co/i],
        selectors: ['iframe[src*="lever.co"]'],
        slugExtractor: (html, url) => {
            const match = url.match(/jobs\.lever\.co\/([^/?]+)/) ||
                html.match(/jobs\.lever\.co\/([^/?'"]+)/);
            return match ? { slug: match[1] } : null;
        }
    },

    // Workable
    {
        type: 'workable',
        urlPatterns: [/apply\.workable\.com\/([^/?]+)/],
        htmlPatterns: [/workable\.com/i],
        selectors: ['iframe[src*="workable.com"]', '.whr-title'],
        slugExtractor: (html, url) => {
            const match = url.match(/apply\.workable\.com\/([^/?]+)/) ||
                html.match(/apply\.workable\.com\/([^/?'"]+)/);
            return match ? { slug: match[1] } : null;
        }
    },
];

// Selectors to exclude (header, footer, nav)
export const EXCLUDED_SELECTORS = [
    'header', 'footer', 'nav',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.header', '.footer', '.nav', '.navbar', '.navigation',
    '.menu', '.sidebar', '.social', '.share',
    '#header', '#footer', '#nav', '#navbar', '#menu',
];

// Known ATS domains to follow (even though they're external)
export const ATS_DOMAINS = [
    'jobs.lever.co',
    'boards.greenhouse.io',
    'job-boards.greenhouse.io',
    'boards-api.greenhouse.io',
    'apply.workable.com',
    'www.comeet.co',
    'comeet.co',
];

// Domains to exclude
export const EXCLUDED_DOMAINS = [
    'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
    'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
    'github.com', 'glassdoor.com', 'indeed.com',
];

// Paths to exclude
export const EXCLUDED_PATHS = [
    '/privacy', '/terms', '/legal', '/cookie', '/policy',
    '/about', '/contact', '/blog', '/news', '/press',
    '/login', '/signin', '/signup', '/register',
    '/faq', '/help', '/support',
];

// Paths that indicate job-related content
export const JOB_PATTERNS = [
    '/position', '/positions',
    '/job', '/jobs',
    '/opening', '/openings',
    '/role', '/roles',
    '/vacancy', '/vacancies',
    '/career', '/careers',
    '/location', '/locations',
    '/department', '/departments',
    '/team', '/teams',
];
