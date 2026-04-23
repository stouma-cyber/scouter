import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkSecret(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === process.env.APP_PASSWORD;
}

// GET: DB状態確認
export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [{ data: articles }, { data: serps }] = await Promise.all([
    supabase.from('article_contents').select('url, fetched_at'),
    supabase.from('serp_snapshots').select('observed_at, keyword_id, url'),
  ]);

  const dateMap: Record<string, Set<string>> = {};
  (serps || []).forEach((r) => {
    const day = r.observed_at.substring(0, 10);
    if (!dateMap[day]) dateMap[day] = new Set();
    dateMap[day].add(r.observed_at);
  });

  return NextResponse.json({
    articleContentsCount: articles?.length ?? 0,
    uniqueUrls: new Set(articles?.map((a) => a.url)).size,
    serpSnapshotsCount: serps?.length ?? 0,
    crawlsByDate: Object.fromEntries(
      Object.entries(dateMap).map(([d, s]) => [d, s.size])
    ),
  });
}

// DELETE: 同日の重複クロールを削除（各日の最新1回だけ残す）
export async function DELETE(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: serps } = await supabase
    .from('serp_snapshots')
    .select('observed_at, keyword_id')
    .order('observed_at', { ascending: false });

  if (!serps) return NextResponse.json({ error: 'データ取得失敗' }, { status: 500 });

  // keyword_id × 日付ごとに最新observed_atを記録
  const keepMap = new Map<string, string>();
  serps.forEach((r) => {
    const day = r.observed_at.substring(0, 10);
    const key = `${r.keyword_id}_${day}`;
    if (!keepMap.has(key)) keepMap.set(key, r.observed_at); // 最新だけ保持
  });

  // 削除対象: keepMapに含まれないobserved_at
  const keepDates = new Set(keepMap.values());
  const deleteDates = [...new Set(serps.map((r) => r.observed_at))].filter(
    (d) => !keepDates.has(d)
  );

  if (deleteDates.length === 0) {
    return NextResponse.json({ message: '削除対象なし', deleted: 0 });
  }

  const { error, count } = await supabase
    .from('serp_snapshots')
    .delete({ count: 'exact' })
    .in('observed_at', deleteDates);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    message: `同日重複を削除しました`,
    deletedSessions: deleteDates.length,
    deletedRows: count,
  });
}
