import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel Hobby plan max is 60s; allow enough time for retries
export const maxDuration = 60;

interface ScoreData {
  name: string;
  Performance: number;
  Accessibility: number;
  BestPractices: number;
  SEO: number;
}

export async function POST(request: NextRequest) {
  try {
    const { url, scores, issues } = await request.json();

    if (!url || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: 'URLとスコアが必要です' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 }
      );
    }

    const score = scores[0] as ScoreData;

    // Build detailed analysis
    const performanceLevel =
      score.Performance >= 90 ? '優秀' :
      score.Performance >= 70 ? '良好' :
      score.Performance >= 50 ? 'やや改善が必要' : '改善が必要';

    const seoLevel =
      score.SEO >= 90 ? '優秀' :
      score.SEO >= 70 ? '良好' :
      score.SEO >= 50 ? 'やや改善が必要' : '改善が必要';

    const issuesText = issues && issues.length > 0
      ? issues.slice(0, 5).map((issue: string, idx: number) => `${idx + 1}. ${issue}`).join('\n')
      : '特に大きな課題は検出されませんでした';

    const prompt = `以下のWebサイト分析結果をもとに、サウスエージェンシーからのSEO/デジタルマーケティング提案書ドラフトを日本語で作成してください。

【分析対象URL】
${url}

【Lighthouseスコア（0-100）】
- パフォーマンス: ${score.Performance} (${performanceLevel})
- アクセシビリティ: ${score.Accessibility}
- ベストプラクティス: ${score.BestPractices}
- SEO: ${score.SEO} (${seoLevel})

【検出された主な課題】
${issuesText}

【提案書作成のガイドライン】
以下の構成で提案書ドラフトを作成してください。営業提案として説得力があり、クライアント向けの分かりやすい日本語で記述してください。

1. 【課題サマリー】
   - サイトの現状評価
   - 主要な3つの課題点（顧客視点で説明）
   - 改善のメリット

2. 【改善提案】
   - 提案①: [具体的な施策名]
     説明（顧客メリット）
   - 提案②: [具体的な施策名]
     説明（顧客メリット）
   - 提案③: [具体的な施策名]
     説明（顧客メリット）

3. 【推奨プラン】
   - サウスエージェンシーの提案内容（簡潔に）
   - 実施範囲と成果物
   - 期待できる効果

4. 【想定スケジュール】
   - 診断・企画フェーズ: 1-2週間
   - 実装フェーズ: 2-4週間
   - 効果検証: 1ヶ月

5. 【期待効果】
   - 直近3ヶ月での見込み効果
   - 中期的な期待効果（6-12ヶ月）
   - ROI見積もり（概算）

提案書は営業向けのドラフトとして、信頼感を持たせながらも高圧的でない表現を心がけてください。`;

    // Call Gemini API with gemini-2.0-flash model (with retry for 429 rate limits)
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const maxRetries = 2;
    const baseDelay = 10000; // 10 seconds
    let result;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break; // Success, exit retry loop
      } catch (retryError: unknown) {
        const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
        const is429 = errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('quota');
        if (is429 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // 15s, 30s, 60s
          console.log(`Gemini API rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw retryError; // Not a rate limit error or max retries exceeded
        }
      }
    }

    const proposal = result!.response.text();

    if (!proposal) {
      throw new Error('提案書生成に失敗しました');
    }

    return NextResponse.json({
      url,
      proposal,
    });
  } catch (error) {
    console.error('Proposal generation error:', error);
    const errorMessage =
      error instanceof Error ? error.message : '提案書生成エラーが発生しました';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
