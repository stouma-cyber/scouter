import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: キーワードのクロール履歴（日付一覧）を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json({ error: 'keywordId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('serp_snapshots')
      .select('observed_at')
      .eq('keyword_id', keywordId)
      .order('observed_at', { ascending: false });

    if (error) throw error;

    // ユニークな日時を取得し、各回の記事数も集計
    const dateCountMap = new Map<string, number>();
    (data || []).forEach((d) => {
      const date = d.observed_at;
      dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
    });

    const dates = Array.from(dateCountMap.entries()).map(([date, count]) => ({
      date,
      articleCount: count,
    }));

    return NextResponse.json({ dates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch crawl dates' },
      { status: 500 }
    );
  }
}
