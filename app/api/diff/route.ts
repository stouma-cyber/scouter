import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SerpEntry {
  url: string;
  rank: number;
  title: string | null;
}

// テキスト差分を抽出（句・節レベルの細かい比較）
function extractDiff(oldText: string, newText: string): { added: string[]; removed: string[] } {
  // 。、\n、！、？、；で分割し、短い句も拾う（最低5文字）
  const splitText = (text: string) =>
    text.split(/[。！？\n；\r]+/).map((l) => l.trim()).filter((l) => l.length >= 5);

  const oldChunks = splitText(oldText);
  const newChunks = splitText(newText);

  const oldSet = new Set(oldChunks);
  const newSet = new Set(newChunks);

  const added: string[] = [];
  const removed: string[] = [];

  // 完全一致しないものを検出
  newChunks.forEach((chunk) => {
    if (!oldSet.has(chunk)) added.push(chunk);
  });

  oldChunks.forEach((chunk) => {
    if (!newSet.has(chunk)) removed.push(chunk);
  });

  return { added, removed };
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

// Gemini AIで差分の意図を分析（軽量版・タイムアウト対策）
async function analyzeWithAI(
  keyword: string,
  url: string,
  rankChange: string,
  added: string[],
  removed: string[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // テキストを最大500文字に制限
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
      addedImages: string[];
      removedImages: string[];
      aiAnalysis: string;
    }> = [];

    // 順位が上がった記事 + 新規ランクインを検出
    for (const curr of latestSerp as SerpEntry[]) {
      const prev = prevMap.get(curr.url);
      const isNewEntry = !prev;
      const rankChange = prev ? prev.rank - curr.rank : null;

      // 順位が上がった（rankChange > 0）または新規ランクインの場合のみ処理
      if (isNewEntry || (rankChange !== null && rankChange > 0)) {
        // 本文・画像の差分を取得
        let addedText = '';
        let removedText = '';
        let addedImages: string[] = [];
        let removedImages: string[] = [];
        let aiAnalysis = '';

        if (!isNewEntry) {
          // 既存記事の差分検知（本文 + 画像）
          const { data: contents } = await supabase
            .from('article_contents')
            .select('content, images, fetched_at')
            .eq('url', curr.url)
            .order('fetched_at', { ascending: false })
            .limit(2);

          if (contents && contents.length >= 2) {
            const { added, removed } = extractDiff(contents[1].content, contents[0].content);
            addedText = added.join('\n');
            removedText = removed.join('\n');

            // 画像差分
            const imgDiff = extractImageDiff(
              contents[1].images || [],
              contents[0].images || []
            );
            addedImages = imgDiff.addedImages;
            removedImages = imgDiff.removedImages;

            const hasTextChanges = added.length > 0 || removed.length > 0;
            const hasImageChanges = addedImages.length > 0 || removedImages.length > 0;

            if (hasTextChanges || hasImageChanges) {
              // 画像変更情報もAIプロンプトに含める
              const imageInfo: string[] = [];
              if (addedImages.length > 0) imageInfo.push(`画像追加: ${addedImages.length}枚`);
              if (removedImages.length > 0) imageInfo.push(`画像削除: ${removedImages.length}枚`);

              const combinedAdded = [...added];
              if (imageInfo.length > 0) combinedAdded.push(`【画像変更】${imageInfo.join('、')}`);

              // AI分析は最初の1件だけ実行（タイムアウト対策）
              if (diffResults.length === 0) {
                aiAnalysis = await analyzeWithAI(
                  kw.keyword,
                  curr.url,
                  `${prev!.rank}位 → ${curr.rank}位（+${rankChange}）`,
                  combinedAdded,
                  removed
                );
              } else {
                aiAnalysis = '（AI分析は1件目のみ自動実行。個別分析は今後対応予定）';
              }
            } else {
              aiAnalysis = '本文・画像に変更はありません。被リンク増加やアルゴリズム変動など外部要因の可能性があります。';
            }
          }
        } else {
          // 新規ランクイン：記事全体をAIに分析させる
          const { data: content } = await supabase
            .from('article_contents')
            .select('content, images')
            .eq('url', curr.url)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

          if (content) {
            // AI分析は最初の1件だけ実行（タイムアウト対策）
            if (diffResults.length === 0) {
              const truncated = content.content.substring(0, 500);
              const imageCount = (content.images || []).length;
              const imageNote = imageCount > 0 ? `\n【画像: ${imageCount}枚含む】` : '';

              aiAnalysis = await analyzeWithAI(
                kw.keyword,
                curr.url,
                `新規ランクイン（${curr.rank}位）`,
                [truncated + imageNote],
                []
              );
            } else {
              aiAnalysis = '（AI分析は1件目のみ自動実行）';
            }
            addedText = '【新規ランクイン】記事全体が対象';
            addedImages = content.images || [];
          }
        }

        // 結果をDBに保存（画像カラムがない場合はフォールバック）
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
          // カラム未追加の場合、画像なしで再試行
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
          addedText,
          removedText,
          addedImages,
          removedImages,
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
