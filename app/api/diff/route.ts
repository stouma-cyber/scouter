import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SerpEntry {
  url: string;
  rank: number;
  title: string | null;
}

// テキスト差分を簡易的に抽出（行単位の比較）
function extractDiff(oldText: string, newText: string): { added: string[]; removed: string[] } {
  const oldLines = new Set(oldText.split(/[。\n]/).map((l) => l.trim()).filter((l) => l.length > 10));
  const newLines = new Set(newText.split(/[。\n]/).map((l) => l.trim()).filter((l) => l.length > 10));

  const added: string[] = [];
  const removed: string[] = [];

  newLines.forEach((line) => {
    if (!oldLines.has(line)) added.push(line);
  });

  oldLines.forEach((line) => {
    if (!newLines.has(line)) removed.push(line);
  });

  return { added, removed };
}

// Gemini AIで差分の意図を分析
async function analyzeWithAI(
  keyword: string,
  url: string,
  rankChange: string,
  added: string[],
  removed: string[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `あなたはSEO分析の専門家です。以下の情報を分析して、この記事がなぜ順位を上げたのかを解説してください。

## 対象キーワード
${keyword}

## 対象URL
${url}

## 順位変動
${rankChange}

## 追加されたコンテンツ
${added.length > 0 ? added.join('\n') : '追加なし'}

## 削除されたコンテンツ
${removed.length > 0 ? removed.join('\n') : '削除なし'}

## 分析してほしいこと
1. この加筆・修正はどんなユーザーの悩み（検索意図）に応えるためか？
2. Googleがこの変更を評価した理由は何か？
3. 自社記事に活かすなら、具体的にどうリライトすべきか？

簡潔に、箇条書きで回答してください。`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('AI analysis failed:', err);
    return 'AI分析に失敗しました';
  }
}

// POST: キーワードIDを受け取り、差分検知＋AI分析を実行
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

    // 最新2回分のSERPスナップショットの日時を取得
    const { data: dates } = await supabase
      .from('serp_snapshots')
      .select('observed_at')
      .eq('keyword_id', keywordId)
      .order('observed_at', { ascending: false });

    if (!dates || dates.length === 0) {
      return NextResponse.json({ error: 'No SERP data found. Run crawl first.' }, { status: 404 });
    }

    // ユニークな観測日時を取得
    const uniqueDates = [...new Set(dates.map((d) => d.observed_at))];
    if (uniqueDates.length < 2) {
      return NextResponse.json({
        error: 'データが1回分しかありません。もう1回クロールを実行してから差分検知してください。',
      }, { status: 400 });
    }

    const latestDate = uniqueDates[0];
    const prevDate = uniqueDates[1];

    // 最新と前回のSERPデータを取得
    const { data: latestSerp } = await supabase
      .from('serp_snapshots')
      .select('url, rank, title')
      .eq('keyword_id', keywordId)
      .eq('observed_at', latestDate);

    const { data: prevSerp } = await supabase
      .from('serp_snapshots')
      .select('url, rank, title')
      .eq('keyword_id', keywordId)
      .eq('observed_at', prevDate);

    if (!latestSerp || !prevSerp) {
      return NextResponse.json({ error: 'Failed to fetch SERP data' }, { status: 500 });
    }

    const prevMap = new Map<string, SerpEntry>();
    prevSerp.forEach((entry) => prevMap.set(entry.url, entry));

    const diffResults: Array<{
      url: string;
      title: string | null;
      prevRank: number | null;
      currRank: number;
      rankChange: number | null;
      isNewEntry: boolean;
      addedText: string;
      removedText: string;
      aiAnalysis: string;
    }> = [];

    // 順位が上がった記事 + 新規ランクインを検出
    for (const curr of latestSerp as SerpEntry[]) {
      const prev = prevMap.get(curr.url);
      const isNewEntry = !prev;
      const rankChange = prev ? prev.rank - curr.rank : null;

      // 順位が上がった（rankChange > 0）または新規ランクインの場合のみ処理
      if (isNewEntry || (rankChange !== null && rankChange > 0)) {
        // 本文の差分を取得
        let addedText = '';
        let removedText = '';
        let aiAnalysis = '';

        if (!isNewEntry) {
          // 既存記事の差分検知
          const { data: contents } = await supabase
            .from('article_contents')
            .select('content, fetched_at')
            .eq('url', curr.url)
            .order('fetched_at', { ascending: false })
            .limit(2);

          if (contents && contents.length >= 2) {
            const { added, removed } = extractDiff(contents[1].content, contents[0].content);
            addedText = added.join('\n');
            removedText = removed.join('\n');

            if (added.length > 0 || removed.length > 0) {
              aiAnalysis = await analyzeWithAI(
                kw.keyword,
                curr.url,
                `${prev!.rank}位 → ${curr.rank}位（+${rankChange}）`,
                added,
                removed
              );
            } else {
              aiAnalysis = '本文に変更はありません。被リンク増加やアルゴリズム変動など外部要因の可能性があります。';
            }
          }
        } else {
          // 新規ランクイン：記事全体をAIに分析させる
          const { data: content } = await supabase
            .from('article_contents')
            .select('content')
            .eq('url', curr.url)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

          if (content) {
            // 長すぎる場合は最初の3000文字だけ送る
            const truncated = content.content.substring(0, 3000);
            aiAnalysis = await analyzeWithAI(
              kw.keyword,
              curr.url,
              `新規ランクイン（${curr.rank}位）`,
              [truncated],
              []
            );
            addedText = '【新規ランクイン】記事全体が対象';
          }
        }

        // 結果をDBに保存
        await supabase.from('diff_results').insert({
          keyword_id: keywordId,
          url: curr.url,
          prev_rank: prev?.rank || null,
          curr_rank: curr.rank,
          rank_change: rankChange,
          added_text: addedText,
          removed_text: removedText,
          ai_analysis: aiAnalysis,
          is_new_entry: isNewEntry,
        });

        diffResults.push({
          url: curr.url,
          title: curr.title,
          prevRank: prev?.rank || null,
          currRank: curr.rank,
          rankChange,
          isNewEntry,
          addedText,
          removedText,
          aiAnalysis,
        });
      }
    }

    return NextResponse.json({
      keyword: kw.keyword,
      latestDate,
      prevDate,
      totalChanges: diffResults.length,
      results: diffResults,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Diff analysis failed' },
      { status: 500 }
    );
  }
}

// GET: 過去の差分結果を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json({ error: 'keywordId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('diff_results')
      .select('*')
      .eq('keyword_id', keywordId)
      .order('detected_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ results: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch diff results' },
      { status: 500 }
    );
  }
}
