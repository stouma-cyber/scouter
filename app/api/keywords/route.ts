import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: キーワード一覧取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ keywords: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

// POST: キーワード登録
export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    if (keyword.trim().length > 100) {
      return NextResponse.json({ error: 'キーワードは100文字以内にしてください' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('keywords')
      .insert({ keyword: keyword.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'このキーワードは既に登録されています' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ keyword: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add keyword' },
      { status: 500 }
    );
  }
}

// DELETE: キーワード削除
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const { error } = await supabase
      .from('keywords')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete keyword' },
      { status: 500 }
    );
  }
}
