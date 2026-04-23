import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type PageType = 'article' | 'service' | 'lp' | 'unknown';

function detectPageTypeFromUrl(url: string): PageType {
  try {
    const path = new URL(url).pathname;
    if (/\/lp[\/\-_]|\/landing[\/\-_]/i.test(path)) return 'lp';
    if (/\/(column|blog|media|article|articles|news|post|posts|topics|journal|magazine|info|guide|howto|tips|knowledge|faq)/i.test(path)) return 'article';
    if (/\/(service|services|feature|features|product|products|solution|solutions|price|pricing)/i.test(path)) return 'service';
  } catch { /* ignore */ }
  return 'unknown';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json({ error: 'keywordId is required' }, { status: 400 });
    }

    // 最新のobserved_atを取得
    const { data: latestRow } = await supabase
      .from('serp_snapshots')
      .select('observed_at')
      .eq('keyword_id', keywordId)
      .order('observed_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestRow) {
      return NextResponse.json({ serp: [], crawledAt: null });
    }

    const latestDate = latestRow.observed_at;

    // その日付のSERPを全件取得
    const { data: serpRows, error } = await supabase
      .from('serp_snapshots')
      .select('url, title, rank')
      .eq('keyword_id', keywordId)
      .eq('observed_at', latestDate)
      .order('rank', { ascending: true });

    if (error) throw error;

    // クロール済みURLを一括チェック
    const urls = (serpRows || []).map(r => r.url);
    const { data: crawledRows } = await supabase
      .from('article_contents')
      .select('url')
      .in('url', urls);

    const crawledSet = new Set((crawledRows || []).map(r => r.url));

    const serp = (serpRows || []).map(r => ({
      rank: r.rank,
      title: r.title,
      url: r.url,
      crawled: crawledSet.has(r.url),
      siteName: '',
      pageType: detectPageTypeFromUrl(r.url) as PageType,
    }));

    return NextResponse.json({ serp, crawledAt: latestDate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch latest SERP' },
      { status: 500 }
    );
  }
}
