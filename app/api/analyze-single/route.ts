import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyword, url, rankChange, addedText, removedText, diffResultId } = body;

    if (!keyword || !url) {
      return NextResponse.json({ error: 'keyword と url は必須です' }, { status: 400 });
    }

    const addedTrimmed = (addedText || '').substring(0, 500);
    const removedTrimmed = (removedText || '').substring(0, 500);

    const prompt = `SEO専門家として50文字x3行で簡潔に回答。
KW:${keyword} URL:${url} 変動:${rankChange || '不明'}
追加:${addedTrimmed || 'なし'}
削除:${removedTrimmed || 'なし'}
1.検索意図への対応 2.評価理由 3.リライト提案`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

    // diff_resultsにIDがあれば更新
    if (diffResultId) {
      await supabase
        .from('diff_results')
        .update({ ai_analysis: analysis })
        .eq('id', diffResultId);
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'レート制限中です。しばらく待ってから再試行してください' }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : 'AI分析に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
