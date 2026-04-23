import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyword, url, rankChange, addedText, removedText, diffResultId } = body;

    if (!keyword || !url) {
      return NextResponse.json({ error: 'keyword と url は必須です' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const addedTrimmed = (addedText || '').substring(0, 500);
    const removedTrimmed = (removedText || '').substring(0, 500);

    const prompt = `SEO専門家として50文字x3行で簡潔に回答。
KW:${keyword} URL:${url} 変動:${rankChange || '不明'}
追加:${addedTrimmed || 'なし'}
削除:${removedTrimmed || 'なし'}
1.検索意図への対応 2.評価理由 3.リライト提案`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    // diff_resultsにIDがあれば更新
    if (diffResultId) {
      await supabase
        .from('diff_results')
        .update({ ai_analysis: analysis })
        .eq('id', diffResultId);
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI分析に失敗しました' },
      { status: 500 }
    );
  }
}
