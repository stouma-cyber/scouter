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
async function fetchArticleContent(url: string): Promise<{ title: string; content: string; images: string[] } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzer/1.0)',
        'Accept': 'text/html',
        'Accept-Language': 'ja,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
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

    // 3. 本文クローリング（上位5件を全並列処理）
    const crawlTargets = searchResults.slice(0, MAX_CRAWL_ARTICLES);
    const crawlResults: { url: string; success: boolean; error?: string }[] = [];

    const promises = crawlTargets.map(async (result) => {
      try {
        const article = await fetchArticleContent(result.link);
        if (article) {
          const contentHash = hashContent(article.content);

          const { data: existing } = await supabase
            .from('article_contents')
            .select('content_hash')
            .eq('url', result.link)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

          if (!existing || existing.content_hash !== contentHash) {
            const { error: insertErr } = await supabase.from('article_contents').insert({
              url: result.link,
              title: article.title,
              content: article.content,
              content_hash: contentHash,
              images: article.images,
            });
            if (insertErr) {
              console.error(`DB insert error for ${result.link}:`, insertErr.message);
            }
          }

          return { url: result.link, success: true };
        }
        return { url: result.link, success: false, error: '記事本文の抽出に失敗' };
      } catch (err) {
        return { url: result.link, success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    const settled = await Promise.allSettled(promises);
    settled.forEach((r) => {
      if (r.status === 'fulfilled') crawlResults.push(r.value);
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
    const serpList = searchResults.map((r, i) => ({
      rank: i + 1,
      title: r.title,
      url: r.link,
      crawled: crawlResults.find((cr) => cr.url === r.link)?.success ?? false,
    }));

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
