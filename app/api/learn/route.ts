import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface DiffInput {
  url: string;
  title: string | null;
  currRank: number;
  prevRank: number | null;
  rankChange: number | null;
  isNewEntry: boolean;
  addedText: string;
  removedText: string;
}

export async function POST(request: Request) {
  try {
    const { keywordId, keywordText, results } = await request.json();

    if (!keywordId || !keywordText || !results?.length) {
      return NextResponse.json({ error: '必須パラメータ不足' }, { status: 400 });
    }

    // 順位上昇 or 新規ランクインのうちコンテンツ変更があるものに絞る
    const targets: DiffInput[] = results.filter((r: DiffInput) =>
      (r.isNewEntry || (r.rankChange !== null && r.rankChange > 0)) &&
      (r.addedText || r.removedText)
    );

    if (targets.length === 0) {
      return NextResponse.json({ message: '学習対象なし', patterns: [] });
    }

    const articleSummaries = targets.map((r, i) => {
      const rank = r.isNewEntry
        ? `新規ランクイン（${r.currRank}位）`
        : `${r.prevRank}位 → ${r.currRank}位（+${r.rankChange}）`;
      return `【記事${i + 1}】${rank}
URL: ${r.url}
タイトル: ${r.title || '不明'}
追加内容: ${r.addedText?.slice(0, 300) || 'なし'}
削除内容: ${r.removedText?.slice(0, 200) || 'なし'}`;
    }).join('\n\n');

    const prompt = `SEO専門家として、以下の「${keywordText}」で順位が上昇した記事の変更内容を分析し、共通するSEO改善パターンを抽出してください。

${articleSummaries}

以下のJSON形式のみで回答（説明文不要）:
{
  "patterns": [
    {
      "pattern": "パターンの説明（40文字以内）",
      "tags": ["タグ1", "タグ2"],
      "source_urls": ["該当するURL"]
    }
  ]
}

パターンは2〜4個、タグは「コンテンツ追加」「構成変更」「情報更新」「画像追加」「E-E-A-T強化」「検索意図対応」などから選ぶか新規作成。`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed: { patterns: { pattern: string; tags: string[]; source_urls: string[] }[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] || '{"patterns":[]}');
    } catch {
      return NextResponse.json({ error: 'AIの出力をパースできませんでした', raw: text }, { status: 500 });
    }

    if (!parsed.patterns?.length) {
      return NextResponse.json({ message: 'パターンを抽出できませんでした', patterns: [] });
    }

    // DBに保存
    const rows = parsed.patterns.map(p => ({
      keyword_id: keywordId,
      keyword_text: keywordText,
      pattern: p.pattern,
      tags: p.tags || [],
      source_urls: p.source_urls || [],
    }));

    const { error } = await supabase.from('knowledge').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, patterns: parsed.patterns });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'パターン学習に失敗しました' },
      { status: 500 }
    );
  }
}
