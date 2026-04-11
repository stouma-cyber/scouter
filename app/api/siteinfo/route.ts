import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface SiteInfo {
  cms: string | null;
  cmsConfidence: 'high' | 'medium' | 'low' | null;
  cmsDetails: string[];
  indexedPages: number | null;
  indexedPagesSource: string | null;
  sitemapUrl: string | null;
  firstSeen: string | null;
  firstSeenSource: string | null;
  domainAge: string | null;
  serverInfo: string | null;
  technologies: string[];
  metaGenerator: string | null;
  httpsEnabled: boolean;
  language: string | null;
}

// CMS detection signatures
const CMS_SIGNATURES: {
  name: string;
  patterns: { type: 'meta' | 'html' | 'header' | 'url'; pattern: RegExp; weight: number }[];
}[] = [
  {
    name: 'WordPress',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']WordPress/i, weight: 10 },
      { type: 'html', pattern: /wp-content\//i, weight: 8 },
      { type: 'html', pattern: /wp-includes\//i, weight: 8 },
      { type: 'html', pattern: /wp-json/i, weight: 6 },
      { type: 'url', pattern: /\/wp-admin/i, weight: 5 },
      { type: 'html', pattern: /wordpress\.org/i, weight: 4 },
    ],
  },
  {
    name: 'Wix',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Wix/i, weight: 10 },
      { type: 'html', pattern: /wix\.com/i, weight: 7 },
      { type: 'html', pattern: /wixstatic\.com/i, weight: 8 },
      { type: 'html', pattern: /X-Wix/i, weight: 9 },
    ],
  },
  {
    name: 'Shopify',
    patterns: [
      { type: 'html', pattern: /cdn\.shopify\.com/i, weight: 9 },
      { type: 'html', pattern: /Shopify\.theme/i, weight: 8 },
      { type: 'header', pattern: /x-shopify/i, weight: 9 },
      { type: 'html', pattern: /myshopify\.com/i, weight: 7 },
    ],
  },
  {
    name: 'Squarespace',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Squarespace/i, weight: 10 },
      { type: 'html', pattern: /squarespace\.com/i, weight: 7 },
      { type: 'html', pattern: /sqsp/i, weight: 5 },
    ],
  },
  {
    name: 'Drupal',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Drupal/i, weight: 10 },
      { type: 'html', pattern: /\/sites\/default\/files/i, weight: 7 },
      { type: 'html', pattern: /drupal\.js/i, weight: 8 },
      { type: 'header', pattern: /X-Drupal/i, weight: 9 },
    ],
  },
  {
    name: 'Joomla',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Joomla/i, weight: 10 },
      { type: 'html', pattern: /\/media\/jui\//i, weight: 7 },
      { type: 'html', pattern: /joomla/i, weight: 3 },
    ],
  },
  {
    name: 'Next.js',
    patterns: [
      { type: 'html', pattern: /__next/i, weight: 8 },
      { type: 'html', pattern: /_next\/static/i, weight: 9 },
      { type: 'html', pattern: /__NEXT_DATA__/i, weight: 10 },
    ],
  },
  {
    name: 'Nuxt.js',
    patterns: [
      { type: 'html', pattern: /__nuxt/i, weight: 8 },
      { type: 'html', pattern: /_nuxt\//i, weight: 9 },
      { type: 'html', pattern: /nuxt/i, weight: 3 },
    ],
  },
  {
    name: 'Gatsby',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Gatsby/i, weight: 10 },
      { type: 'html', pattern: /gatsby/i, weight: 4 },
      { type: 'html', pattern: /___gatsby/i, weight: 9 },
    ],
  },
  {
    name: 'Webflow',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Webflow/i, weight: 10 },
      { type: 'html', pattern: /webflow\.com/i, weight: 7 },
      { type: 'html', pattern: /w-webflow/i, weight: 8 },
    ],
  },
  {
    name: 'STUDIO',
    patterns: [
      { type: 'html', pattern: /studio\.design/i, weight: 8 },
      { type: 'html', pattern: /studio\.site/i, weight: 7 },
    ],
  },
  {
    name: 'ペライチ',
    patterns: [
      { type: 'html', pattern: /peraichi\.com/i, weight: 9 },
      { type: 'html', pattern: /ペライチ/i, weight: 8 },
    ],
  },
  {
    name: 'Jimdo',
    patterns: [
      { type: 'html', pattern: /jimdo/i, weight: 7 },
      { type: 'html', pattern: /jimdofree\.com/i, weight: 9 },
    ],
  },
  {
    name: 'MovableType',
    patterns: [
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']Movable Type/i, weight: 10 },
      { type: 'html', pattern: /mt-static/i, weight: 7 },
    ],
  },
  {
    name: 'Adobe Experience Manager',
    patterns: [
      { type: 'html', pattern: /\/etc\.clientlibs\//i, weight: 8 },
      { type: 'html', pattern: /cq-wcm/i, weight: 9 },
    ],
  },
  {
    name: 'HubSpot CMS',
    patterns: [
      { type: 'html', pattern: /hs-scripts\.com/i, weight: 6 },
      { type: 'html', pattern: /hubspot/i, weight: 4 },
      { type: 'meta', pattern: /name=["']generator["'][^>]*content=["']HubSpot/i, weight: 10 },
    ],
  },
];

// Technology detection
const TECH_SIGNATURES: { name: string; pattern: RegExp }[] = [
  { name: 'jQuery', pattern: /jquery[.-]?\d|jquery\.min\.js/i },
  { name: 'React', pattern: /react\.production|reactDOM|__REACT/i },
  { name: 'Vue.js', pattern: /vue\.min\.js|vue\.runtime|__VUE/i },
  { name: 'Angular', pattern: /ng-version|angular\.min\.js/i },
  { name: 'Bootstrap', pattern: /bootstrap\.min\.(css|js)/i },
  { name: 'Tailwind CSS', pattern: /tailwindcss|tailwind\.min/i },
  { name: 'Google Analytics', pattern: /google-analytics\.com|gtag\/js|googletagmanager/i },
  { name: 'Google Tag Manager', pattern: /googletagmanager\.com\/gtm/i },
  { name: 'Font Awesome', pattern: /font-awesome|fontawesome/i },
  { name: 'Cloudflare', pattern: /cloudflare/i },
  { name: 'reCAPTCHA', pattern: /recaptcha/i },
  { name: 'Stripe', pattern: /stripe\.com\/v\d|js\.stripe/i },
  { name: 'Lazy Load', pattern: /lazysizes|loading=["']lazy/i },
  { name: 'AMP', pattern: /ampproject\.org|<html\s[^>]*amp/i },
  { name: 'PWA', pattern: /service-worker|serviceWorker|manifest\.json/i },
];

function detectCMS(html: string, headers: Headers): { name: string; confidence: 'high' | 'medium' | 'low'; details: string[] } | null {
  const results: { name: string; totalWeight: number; details: string[] }[] = [];

  for (const cms of CMS_SIGNATURES) {
    let totalWeight = 0;
    const details: string[] = [];

    for (const sig of cms.patterns) {
      let matched = false;
      if (sig.type === 'header') {
        // Check response headers
        headers.forEach((_value, key) => {
          if (sig.pattern.test(key)) matched = true;
        });
      } else {
        matched = sig.pattern.test(html);
      }

      if (matched) {
        totalWeight += sig.weight;
        details.push(`${sig.type}: ${sig.pattern.source.substring(0, 40)}`);
      }
    }

    if (totalWeight > 0) {
      results.push({ name: cms.name, totalWeight, details });
    }
  }

  if (results.length === 0) return null;

  // Sort by weight descending
  results.sort((a, b) => b.totalWeight - a.totalWeight);
  const best = results[0];

  const confidence: 'high' | 'medium' | 'low' =
    best.totalWeight >= 15 ? 'high' :
    best.totalWeight >= 8 ? 'medium' : 'low';

  return { name: best.name, confidence, details: best.details };
}

function detectTechnologies(html: string): string[] {
  const techs: string[] = [];
  for (const tech of TECH_SIGNATURES) {
    if (tech.pattern.test(html)) {
      techs.push(tech.name);
    }
  }
  return techs;
}

function extractMetaGenerator(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']generator["']/i);
  return match ? match[1].trim() : null;
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}

async function countSitemapPages(baseUrl: string): Promise<{ count: number; source: string; sitemapUrl: string } | null> {
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  // Try common sitemap locations
  const sitemapUrls = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SCOUTER/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check if it's a sitemap index (contains other sitemaps)
      if (text.includes('<sitemapindex') || text.includes('<sitemap>')) {
        // Count child sitemaps and estimate
        const sitemapMatches = text.match(/<loc>/gi);
        const childCount = sitemapMatches ? sitemapMatches.length : 0;

        if (childCount > 0) {
          // Try to fetch first child sitemap for a sample count
          const firstLocMatch = text.match(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/i);
          if (firstLocMatch) {
            try {
              const childResp = await fetch(firstLocMatch[1], {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SCOUTER/1.0)' },
                signal: AbortSignal.timeout(8000),
              });
              if (childResp.ok) {
                const childText = await childResp.text();
                const childUrls = childText.match(/<loc>/gi);
                const avgPerSitemap = childUrls ? childUrls.length : 100;
                return {
                  count: childCount * avgPerSitemap,
                  source: `サイトマップインデックス (${childCount}件のサイトマップ × 約${avgPerSitemap}ページ)`,
                  sitemapUrl,
                };
              }
            } catch {
              // Estimate: average 500 pages per sitemap
              return {
                count: childCount * 500,
                source: `サイトマップインデックス (${childCount}件のサイトマップから推定)`,
                sitemapUrl,
              };
            }
          }
        }
      }

      // Regular sitemap - count <loc> or <url> entries
      if (contentType.includes('xml') || text.includes('<urlset') || text.includes('<loc>')) {
        const locMatches = text.match(/<loc>/gi);
        const count = locMatches ? locMatches.length : 0;
        if (count > 0) {
          return { count, source: 'sitemap.xml', sitemapUrl };
        }
      }
    } catch {
      continue;
    }
  }

  // Try robots.txt for sitemap reference
  try {
    const robotsResp = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SCOUTER/1.0)' },
      signal: AbortSignal.timeout(5000),
    });

    if (robotsResp.ok) {
      const robotsText = await robotsResp.text();
      const sitemapMatch = robotsText.match(/Sitemap:\s*(https?:\/\/\S+)/i);

      if (sitemapMatch && !sitemapUrls.includes(sitemapMatch[1])) {
        try {
          const resp = await fetch(sitemapMatch[1], {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SCOUTER/1.0)' },
            signal: AbortSignal.timeout(8000),
          });

          if (resp.ok) {
            const text = await resp.text();
            const locMatches = text.match(/<loc>/gi);
            if (locMatches && locMatches.length > 0) {
              return { count: locMatches.length, source: 'robots.txt経由のsitemap', sitemapUrl: sitemapMatch[1] };
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

async function getFirstSeenDate(domain: string): Promise<{ date: string; source: string } | null> {
  try {
    // Use Wayback Machine's availability API
    const response = await fetch(
      `https://archive.org/wayback/available?url=${domain}&timestamp=19900101`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const snapshot = data?.archived_snapshots?.closest;

    if (snapshot?.timestamp) {
      // timestamp format: YYYYMMDDHHmmss
      const ts = snapshot.timestamp;
      const year = ts.substring(0, 4);
      const month = ts.substring(4, 6);
      const day = ts.substring(6, 8);
      const dateStr = `${year}年${parseInt(month)}月${parseInt(day)}日`;

      // Calculate domain age
      const firstDate = new Date(`${year}-${month}-${day}`);
      const now = new Date();
      const diffYears = Math.floor((now.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const diffMonths = Math.floor(((now.getTime() - firstDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

      let ageStr = '';
      if (diffYears > 0) {
        ageStr = `${diffYears}年${diffMonths > 0 ? diffMonths + 'ヶ月' : ''}`;
      } else {
        ageStr = `${diffMonths}ヶ月`;
      }

      return {
        date: dateStr,
        source: `Wayback Machine (最古の記録: ${dateStr}、運営歴: 約${ageStr})`,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname;

    // Fetch the page HTML and headers
    let html = '';
    let responseHeaders = new Headers();
    let serverInfo: string | null = null;
    let httpsEnabled = targetUrl.startsWith('https');

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      html = await response.text();
      responseHeaders = response.headers;
      serverInfo = response.headers.get('server') || null;
      httpsEnabled = response.url.startsWith('https');
    } catch (err) {
      console.error('Failed to fetch site HTML:', err);
      // Continue with empty HTML - we can still try sitemap and wayback
    }

    // Run detection in parallel
    const [cmsResult, sitemapResult, firstSeenResult] = await Promise.all([
      // CMS detection (synchronous, from HTML)
      Promise.resolve(html ? detectCMS(html, responseHeaders) : null),
      // Sitemap page count
      countSitemapPages(targetUrl),
      // Wayback Machine first seen date
      getFirstSeenDate(domain),
    ]);

    // Detect technologies
    const technologies = html ? detectTechnologies(html) : [];
    const metaGenerator = html ? extractMetaGenerator(html) : null;
    const language = html ? extractLanguage(html) : null;

    // Calculate domain age from firstSeen
    let domainAge: string | null = null;
    if (firstSeenResult) {
      // Extract age from source string
      const ageMatch = firstSeenResult.source.match(/運営歴: 約(.+)\)/);
      if (ageMatch) domainAge = ageMatch[1];
    }

    const siteInfo: SiteInfo = {
      cms: cmsResult?.name || null,
      cmsConfidence: cmsResult?.confidence || null,
      cmsDetails: cmsResult?.details || [],
      indexedPages: sitemapResult?.count || null,
      indexedPagesSource: sitemapResult?.source || null,
      sitemapUrl: sitemapResult?.sitemapUrl || null,
      firstSeen: firstSeenResult?.date || null,
      firstSeenSource: firstSeenResult?.source || null,
      domainAge,
      serverInfo,
      technologies,
      metaGenerator,
      httpsEnabled,
      language,
    };

    return NextResponse.json(siteInfo);
  } catch (error) {
    console.error('Site info error:', error);
    return NextResponse.json(
      { error: 'サイト情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
