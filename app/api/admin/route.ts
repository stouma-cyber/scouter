import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkSecret(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === process.env.APP_PASSWORD;
}

async function runCleanup() {
  const { data: serps } = await supabase
    .from('serp_snapshots')
    .select('observed_at, keyword_id')
    .order('observed_at', { ascending: false });

  if (!serps) return NextResponse.json({ error: 'データ取得失敗' }, { status: 500 });

  const keepMap = new Map<string, string>();
  serps.forEach((r) => {
    const day = r.observed_at.substring(0, 10);
    const key = `${r.keyword_id}_${day}`;
    if (!keepMap.has(key)) keepMap.set(key, r.observed_at);
  });

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
    message: '同日重複を削除しました',
    deletedSessions: deleteDates.length,
    deletedRows: count,
  });
}

// GET: DB状態確認 / ?action=cleanup で重複削除
export async function GET(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') === 'cleanup') return runCleanup();

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
