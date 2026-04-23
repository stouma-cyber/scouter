import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import crypto from 'crypto';

const SERPER_API_KEY = process.env.SERPER_API_KEY!;
const MAX_CRAWL_ARTICLES = 10; // 上位10件を全並列取得
const FETCH_TIMEOUT_MS = 3000; // 記事取得のタイムアウト（3秒）

interface SearchResult {
  title: string;
  link: string;
}

type PageType = 'article' | 'service' | 'lp' | 'unknown';

function extractSiteName(html: string, url: string): string {
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{1,60})["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']{1,60})["'][^>]+property=["']og:site_name["']/i);
  if (ogMatch) return ogMatch[1].trim();
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function detectPageType(url: string, html: string): PageType {
  const path = (() => { try { return new URL(url).pathname; } catch { return url; } })();

  const articlePaths = /\/(column|blog|media|article|articles|news|post|posts|topics|journal|magazine|info|guide|howto|tips|knowledge|faq|column|lp\/(?!.*service))/i;
  const servicePaths = /\/(service|services|feature|features|product|products|solution|solutions|price|pricing)/i;
  const lpPaths = /\/lp[\/\-_]|\/landing[\/\-_]/i;

  if (lpPaths.test(path)) return 'lp';
  if (articlePaths.test(path)) return 'article';
  if (servicePaths.test(path)) return 'service';

  if (/og:type["'\s]+content=["']article["']/i.test(html)) return 'article';
  if (/<time[\s>]/i.test(html) && /<article[\s>]/i.test(html)) return 'article';

  return 'unknown';
}

// Serper.dev APIでGoogle検索上位記事を取得（最大20件）
async function fetchSearchResults(keyword: string): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: keyword,
        gl: 'jp',
        hl: 'ja',
        num: 20,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.organic) return [];

    return data.organic.map((item: { title: string; link: string }) => ({
      title: item.title,
      link: item.link,
    }));
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`検索結果の取得に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// 記事本文と画像を取得（Readabilityで抽出）
async function fetchArticleContent(url: string): Promise<{ title: string; content: string; images: string[]; siteName: string; pageType: PageType } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const siteName = extractSiteName(html, url);
    const pageType = detectPageType(url, html);
    const { document } = parseHTML(html);
    // linkedom doesn't set baseURI automatically, set it for Readability
    Object.defineProperty(document, 'baseURI', { value: url, writable: false });

    // 画像URLを抽出（Readability処理前に元DOMから取得）
    const imgElements = document.querySelectorAll('article img, main img, .entry-content img, .post-content img, #content img, body img');
    const images: string[] = [];
    imgElements.forEach((img: Element) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      if (src && !src.includes('data:image') && !src.includes('pixel') && !src.includes('spacer')) {
        try {
          const absoluteUrl = new URL(src, url).href;
          if (!images.includes(absoluteUrl)) images.push(absoluteUrl);
        } catch { /* skip invalid URLs */ }
      }
    });

    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      return null;
    }

    return {
      title: article.title || '',
      content: article.textContent.trim(),
      images,
      siteName,
      pageType,
    };
  } catch {
    console.error(`Failed to fetch: ${url}`);
    return null;
  }
}

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

// POST: キーワードIDを受け取り、検索上位取得→本文クローリング→DB保存
export async function POST(request: Request) {
  try {
    const { keywordId } = await request.json();

    // キーワード取得
    const { data: kw, error: kwError } = await supabase
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .single();

    if (kwError || !kw) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    // 1. Google検索上位取得（Serper.dev経由）
    const searchResults = await fetchSearchResults(kw.keyword);
    if (searchResults.length === 0) {
      return NextResponse.json({ error: 'No search results found' }, { status: 404 });
    }

    // 2. SERP スナップショット保存
    const serpEntries = searchResults.map((r, i) => ({
      keyword_id: keywordId,
      url: r.link,
      title: r.title,
      rank: i + 1,
    }));

    const { error: serpError } = await supabase
      .from('serp_snapshots')
      .insert(serpEntries);

    if (serpError) {
      console.error('SERP save error:', serpError);
    }

    // 3. 本文クローリング（上位10件を全並列処理）
    const crawlTargets = searchResults.slice(0, MAX_CRAWL_ARTICLES);

    // Step 1: 全記事を並列フェッチ
    type FetchResult = { url: string; article: Awaited<ReturnType<typeof fetchArticleContent>> };
    const fetchSettled = await Promise.allSettled<FetchResult>(
      crawlTargets.map(async (result) => ({
        url: result.link,
        article: await fetchArticleContent(result.link),
      }))
    );

    const successfulFetches: Array<{ url: string; article: NonNullable<Awaited<ReturnType<typeof fetchArticleContent>>> }> = [];
    fetchSettled.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.article) {
        successfulFetches.push({ url: r.value.url, article: r.value.article });
      }
    });

    // Step 2: 成功分のURLを一括でDB照合（クエリ1回）
    const existingMap = new Map<string, string>();
    if (successfulFetches.length > 0) {
      const { data: existing } = await supabase
        .from('article_contents')
        .select('url, content_hash, fetched_at')
        .in('url', successfulFetches.map(f => f.url))
        .order('fetched_at', { ascending: false });
      (existing || []).forEach((row: { url: string; content_hash: string }) => {
        if (!existingMap.has(row.url)) existingMap.set(row.url, row.content_hash);
      });
    }

    // Step 3: 変更ありのみ挿入（並列）
    const crawlResults: { url: string; success: boolean; siteName?: string; pageType?: PageType; error?: string }[] = [];

    await Promise.allSettled(
      successfulFetches.map(async ({ url, article }) => {
        const contentHash = hashContent(article.content);
        if (existingMap.get(url) !== contentHash) {
          const { error: insertErr } = await supabase.from('article_contents').insert({
            url,
            title: article.title,
            content: article.content,
            content_hash: contentHash,
            images: article.images,
          });
          if (insertErr) console.error(`DB insert error for ${url}:`, insertErr.message);
        }
        crawlResults.push({ url, success: true, siteName: article.siteName, pageType: article.pageType });
      })
    );

    // フェッチ失敗分を追加
    const succeededUrls = new Set(successfulFetches.map(f => f.url));
    fetchSettled.forEach((r, i) => {
      const url = crawlTargets[i].link;
      if (!succeededUrls.has(url)) {
        crawlResults.push({
          url,
          success: false,
          error: r.status === 'rejected'
            ? (r.reason instanceof Error ? r.reason.message : 'Unknown error')
            : '記事本文の抽出に失敗',
        });
      }
    });

    // クロールしなかった記事もリストに追加（SERP保存はしてある）
    const skippedResults = searchResults.slice(MAX_CRAWL_ARTICLES).map((r) => ({
      url: r.link,
      success: false,
      error: 'クロール対象外（上位10件のみ取得）',
    }));
    crawlResults.push(...skippedResults);

    const successCount = crawlResults.filter((r) => r.success).length;
    const failCount = crawlResults.filter((r) => !r.success).length;

    // SERP順位一覧を生成
    const serpList = searchResults.map((r, i) => {
      const crawlResult = crawlResults.find((cr) => cr.url === r.link);
      return {
        rank: i + 1,
        title: r.title,
        url: r.link,
        crawled: crawlResult?.success ?? false,
        siteName: crawlResult?.siteName ?? '',
        pageType: crawlResult?.pageType ?? 'unknown',
      };
    });

    return NextResponse.json({
      keyword: kw.keyword,
      totalResults: searchResults.length,
      crawled: successCount,
      failed: failCount,
      results: crawlResults,
      serp: serpList,
      crawledAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Crawl failed' },
      { status: 500 }
    );
  }
}
