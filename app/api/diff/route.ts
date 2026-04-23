import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { diffWords } from 'diff';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SerpEntry {
  url: string;
  rank: number;
  title: string | null;
}

export interface DiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

// 単語レベルの差分を計算し、変更箇所を前後コンテキスト付きで抽出
function extractWordDiff(oldText: string, newText: string): {
  added: string[];
  removed: string[];
  diffHunks: DiffChunk[][];
} {
  const MAX_LEN = 8000;
  const old = oldText.slice(0, MAX_LEN);
  const next = newText.slice(0, MAX_LEN);

  const chunks = diffWords(old, next);

  // DB保存用のサマリー（変更があった単語をまとめる）
  const added = chunks.filter(c => c.added).map(c => c.value.trim()).filter(Boolean);
  const removed = chunks.filter(c => c.removed).map(c => c.value.trim()).filter(Boolean);

  // 変更箇所周辺をハンクとして抽出（前後30文字分のコンテキスト）
  const CONTEXT_CHARS = 60;
  const hunks: DiffChunk[][] = [];
  let i = 0;

  while (i < chunks.length) {
    if (chunks[i].added || chunks[i].removed) {
      // 変更箇所を発見 → このあたりを1ハンクとして収集
      const hunk: DiffChunk[] = [];

      // 前コンテキスト（直前の未変更チャンクから末尾を取る）
      if (i > 0 && !chunks[i - 1].added && !chunks[i - 1].removed) {
        const pre = chunks[i - 1].value;
        hunk.push({ value: pre.slice(-CONTEXT_CHARS) });
      }

      // 変更チャンクをまとめる（連続する変更・隣接する変更をグループ化）
      while (i < chunks.length && (chunks[i].added || chunks[i].removed ||
        // 変更間の短い未変更テキストも含める
        (!chunks[i].added && !chunks[i].removed && chunks[i].value.length <= 20 &&
          i + 1 < chunks.length && (chunks[i + 1].added || chunks[i + 1].removed)))) {
        hunk.push({ value: chunks[i].value, added: chunks[i].added, removed: chunks[i].removed });
        i++;
      }

      // 後コンテキスト
      if (i < chunks.length && !chunks[i].added && !chunks[i].removed) {
        const post = chunks[i].value;
        hunk.push({ value: post.slice(0, CONTEXT_CHARS) });
      }

      if (hunk.some(c => c.added || c.removed)) {
        hunks.push(hunk);
      }
    } else {
      i++;
    }
  }

  return { added, removed, diffHunks: hunks };
}

// 画像差分を抽出
function extractImageDiff(
  oldImages: string[],
  newImages: string[]
): { addedImages: string[]; removedImages: string[] } {
  const oldSet = new Set(oldImages || []);
  const newSet = new Set(newImages || []);

  const addedImages = (newImages || []).filter((img) => !oldSet.has(img));
  const removedImages = (oldImages || []).filter((img) => !newSet.has(img));

  return { addedImages, removedImages };
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

    const addedTrimmed = added.join('\n').substring(0, 500);
    const removedTrimmed = removed.join('\n').substring(0, 500);

    const prompt = `SEO専門家として50文字x3行で簡潔に回答。
KW:${keyword} URL:${url} 変動:${rankChange}
追加:${addedTrimmed || 'なし'}
削除:${removedTrimmed || 'なし'}
1.検索意図への対応 2.評価理由 3.リライト提案`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const result = await model.generateContent(prompt);
    clearTimeout(timeout);
    return result.response.text();
  } catch (err) {
    console.error('AI analysis failed:', err);
    return 'AI分析に失敗しました（タイムアウト）';
  }
}

// 日付フォーマットの簡易バリデーション
function isValidDateString(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// POST: 差分検知＋AI分析を実行
// パラメータ:
//   keywordId: キーワードID（必須）
//   dateA: 比較元の日時（古い方）。省略時は前回クロール日
//   dateB: 比較先の日時（新しい方）。省略時は最新クロール日
//   mode: 'all' | 'rank-up'（デフォルト: 'all'）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keywordId, dateA, dateB, mode = 'all' } = body;

    // 入力値バリデーション
    if (!keywordId || typeof keywordId !== 'string') {
      return NextResponse.json({ error: 'keywordIdは必須です' }, { status: 400 });
    }
    if (mode && !['all', 'rank-up'].includes(mode)) {
      return NextResponse.json({ error: 'modeは "all" または "rank-up" を指定してください' }, { status: 400 });
    }
    if (dateA && !isValidDateString(dateA)) {
      return NextResponse.json({ error: '比較元の日付フォーマットが不正です' }, { status: 400 });
    }
    if (dateB && !isValidDateString(dateB)) {
      return NextResponse.json({ error: '比較先の日付フォーマットが不正です' }, { status: 400 });
    }

    // キーワード取得
    const { data: kw, error: kwError } = await supabase
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .single();

    if (kwError || !kw) {
      return NextResponse.json({ error: 'キーワードが見つかりません' }, { status: 404 });
    }

    // クロール日時を決定
    let prevDate: string;
    let latestDate: string;

    if (dateA && dateB) {
      // 日付が指定されている場合はそのまま使う
      prevDate = dateA;
      latestDate = dateB;
    } else {
      // 最新2回分のSERPスナップショットの日時を自動取得
      const { data: dates } = await supabase
        .from('serp_snapshots')
        .select('observed_at')
        .eq('keyword_id', keywordId)
        .order('observed_at', { ascending: false });

      if (!dates || dates.length === 0) {
        return NextResponse.json({ error: 'クロールデータがありません。先にクロールを実行してください。' }, { status: 404 });
      }

      const uniqueDates = [...new Set(dates.map((d) => d.observed_at))];
      if (uniqueDates.length < 2) {
        return NextResponse.json({
          error: 'データが1回分しかありません。もう1回クロールを実行してから差分検知してください。',
        }, { status: 400 });
      }

      latestDate = uniqueDates[0];
      prevDate = uniqueDates[1];
    }

    // 両日のSERPデータを取得
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
      return NextResponse.json({ error: 'SERPデータの取得に失敗しました' }, { status: 500 });
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
      hasContentChange: boolean;
      addedText: string;
      removedText: string;
      addedImages: string[];
      removedImages: string[];
      aiAnalysis: string;
      diffHunks: DiffChunk[][];
    }> = [];

    let aiAnalyzedCount = 0;

    for (const curr of latestSerp as SerpEntry[]) {
      const prev = prevMap.get(curr.url);
      const isNewEntry = !prev;
      const rankChange = prev ? prev.rank - curr.rank : null;

      // モードによるフィルタリング
      if (mode === 'rank-up') {
        // 従来モード: 順位上昇 or 新規のみ
        if (!isNewEntry && (rankChange === null || rankChange <= 0)) continue;
      }
      // mode === 'all' の場合はすべての記事を処理

      let addedText = '';
      let removedText = '';
      let addedImages: string[] = [];
      let removedImages: string[] = [];
      let aiAnalysis = '';
      let hasContentChange = false;
      let diffHunks: DiffChunk[][] = [];

      if (!isNewEntry) {
        // 記事コンテンツの差分検知
        // 指定日付に近いコンテンツを取得
        const { data: newContent } = await supabase
          .from('article_contents')
          .select('content, images, fetched_at')
          .eq('url', curr.url)
          .lte('fetched_at', latestDate)
          .order('fetched_at', { ascending: false })
          .limit(1);

        const { data: oldContent } = await supabase
          .from('article_contents')
          .select('content, images, fetched_at')
          .eq('url', curr.url)
          .lte('fetched_at', prevDate)
          .order('fetched_at', { ascending: false })
          .limit(1);

        if (newContent && newContent.length > 0 && oldContent && oldContent.length > 0) {
          // 同じコンテンツでないことを確認
          if (newContent[0].fetched_at !== oldContent[0].fetched_at) {
            const { added, removed, diffHunks: hunks } = extractWordDiff(oldContent[0].content, newContent[0].content);
            addedText = added.slice(0, 20).join('\n');
            removedText = removed.slice(0, 20).join('\n');
            diffHunks = hunks;

            const imgDiff = extractImageDiff(
              oldContent[0].images || [],
              newContent[0].images || []
            );
            addedImages = imgDiff.addedImages;
            removedImages = imgDiff.removedImages;

            hasContentChange = added.length > 0 || removed.length > 0 || addedImages.length > 0 || removedImages.length > 0;

            if (hasContentChange && aiAnalyzedCount === 0) {
              const imageInfo: string[] = [];
              if (addedImages.length > 0) imageInfo.push(`画像追加: ${addedImages.length}枚`);
              if (removedImages.length > 0) imageInfo.push(`画像削除: ${removedImages.length}枚`);

              const combinedAdded = [...added];
              if (imageInfo.length > 0) combinedAdded.push(`【画像変更】${imageInfo.join('、')}`);

              const rankInfo = rankChange !== null
                ? `${prev!.rank}位 → ${curr.rank}位（${rankChange > 0 ? '+' : ''}${rankChange}）`
                : `${curr.rank}位（変動なし）`;

              aiAnalysis = await analyzeWithAI(kw.keyword, curr.url, rankInfo, combinedAdded, removed);
              aiAnalyzedCount++;
            } else if (hasContentChange) {
              aiAnalysis = '（AI分析は1件目のみ自動実行）';
            }
          }
        }
      } else {
        // 新規ランクイン
        hasContentChange = true;
        const { data: content } = await supabase
          .from('article_contents')
          .select('content, images')
          .eq('url', curr.url)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();

        if (content) {
          if (aiAnalyzedCount === 0) {
            const truncated = content.content.substring(0, 500);
            const imageCount = (content.images || []).length;
            const imageNote = imageCount > 0 ? `\n【画像: ${imageCount}枚含む】` : '';

            aiAnalysis = await analyzeWithAI(
              kw.keyword, curr.url,
              `新規ランクイン（${curr.rank}位）`,
              [truncated + imageNote], []
            );
            aiAnalyzedCount++;
          } else {
            aiAnalysis = '（AI分析は1件目のみ自動実行）';
          }
          addedText = '【新規ランクイン】記事全体が対象';
          addedImages = content.images || [];
        }
      }

      // allモードの場合: コンテンツ変更があるか、順位変動がある記事のみ表示
      if (mode === 'all') {
        if (!hasContentChange && !isNewEntry && (rankChange === null || rankChange === 0)) continue;
      }

      // 結果をDBに保存
      const insertData: Record<string, unknown> = {
        keyword_id: keywordId,
        url: curr.url,
        prev_rank: prev?.rank || null,
        curr_rank: curr.rank,
        rank_change: rankChange,
        added_text: addedText,
        removed_text: removedText,
        added_images: addedImages,
        removed_images: removedImages,
        ai_analysis: aiAnalysis,
        is_new_entry: isNewEntry,
      };

      const { error: insertError } = await supabase.from('diff_results').insert(insertData);
      if (insertError && insertError.message?.includes('added_images')) {
        delete insertData.added_images;
        delete insertData.removed_images;
        await supabase.from('diff_results').insert(insertData);
      }

      diffResults.push({
        url: curr.url,
        title: curr.title,
        prevRank: prev?.rank || null,
        currRank: curr.rank,
        rankChange,
        isNewEntry,
        hasContentChange,
        addedText,
        removedText,
        addedImages,
        removedImages,
        aiAnalysis,
        diffHunks,
      });
    }

    return NextResponse.json({
      keyword: kw.keyword,
      latestDate,
      prevDate,
      mode,
      totalChanges: diffResults.length,
      contentChanges: diffResults.filter(r => r.hasContentChange).length,
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
