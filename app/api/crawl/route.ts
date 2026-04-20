import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import crypto from 'crypto';

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY!;
const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX!;

interface SearchResult {
  title: string;
  link: string;
}

// Google Custom Search APIで上位記事を取得（10件ずつ、最大20件）
async function fetchSearchResults(keyword: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (let start = 1; start <= 11; start += 10) {
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CX,
      q: keyword,
      num: '10',
      start: String(start),
      lr: 'lang_ja',
      gl: 'jp',
    });

    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!res.ok) {
      console.error(`Google API error: ${res.status}`);
      break;
    }

    const data = await res.json();
    if (data.items) {
      results.push(
        ...data.items.map((item: { title: string; link: string }) => ({
          title: item.title,
          link: item.link,
        }))
      );
    }
  }

  return results;
}

// 記事本文を取得（Readabilityで抽出）
async function fetchArticleContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

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
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      return null;
    }

    return {
      title: article.title || '',
      content: article.textContent.trim(),
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

    // 1. Google検索上位取得
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

    // 3. 本文クローリング（5記事ずつ処理）
    const crawlResults: { url: string; success: boolean }[] = [];
    const batchSize = 5;

    for (let i = 0; i < searchResults.length; i += batchSize) {
      const batch = searchResults.slice(i, i + batchSize);
      const promises = batch.map(async (result) => {
        const article = await fetchArticleContent(result.link);
        if (article) {
          const contentHash = hashContent(article.content);

          // 同じURLの最新本文と比較し、変更があれば保存
          const { data: existing } = await supabase
            .from('article_contents')
            .select('content_hash')
            .eq('url', result.link)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

          // 新規 or 内容が変わっていれば保存
          if (!existing || existing.content_hash !== contentHash) {
            await supabase.from('article_contents').insert({
              url: result.link,
              title: article.title,
              content: article.content,
              content_hash: contentHash,
            });
          }

          return { url: result.link, success: true };
        }
        return { url: result.link, success: false };
      });

      const results = await Promise.all(promises);
      crawlResults.push(...results);
    }

    const successCount = crawlResults.filter((r) => r.success).length;
    const failCount = crawlResults.filter((r) => !r.success).length;

    return NextResponse.json({
      keyword: kw.keyword,
      totalResults: searchResults.length,
      crawled: successCount,
      failed: failCount,
      results: crawlResults,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Crawl failed' },
      { status: 500 }
    );
  }
}
