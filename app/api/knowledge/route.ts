import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywordId = searchParams.get('keywordId');

  const query = supabase
    .from('knowledge')
    .select('*')
    .order('created_at', { ascending: false });

  if (keywordId) query.eq('keyword_id', keywordId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ knowledge: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { keyword_id, keyword_text, patterns } = body;

  if (!keyword_id || !patterns?.length) {
    return NextResponse.json({ error: '必須パラメータ不足' }, { status: 400 });
  }

  const rows = patterns.map((p: { pattern: string; tags: string[]; source_urls: string[] }) => ({
    keyword_id,
    keyword_text,
    pattern: p.pattern,
    tags: p.tags || [],
    source_urls: p.source_urls || [],
  }));

  const { error } = await supabase.from('knowledge').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.length });
}
