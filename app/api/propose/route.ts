import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic();

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
      return NextResponse.json({ error: 'URLとスコアが必要です' }, { status: 400 });
    }

    const score = scores[0] as ScoreData;

    const performanceLevel =
      score.Performance >= 90 ? '優秀' :
      score.Performance >= 70 ? '良好' :
      score.Performance >= 50 ? 'やや改善が必要' : '改善が必要';

    const seoLevel =
      score.SEO >= 90 ? '優秀' :
      score.SEO >= 70 ? '良好' :
      score.SEO >= 50 ? 'やや改善が必要' : '改善が必要';

    const issuesText = issues?.length > 0
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

以下の構成で提案書ドラフトを作成してください。営業提案として説得力があり、クライアント向けの分かりやすい日本語で記述してください。

1. 【課題サマリー】サイトの現状評価・主要な3つの課題点・改善のメリット
2. 【改善提案】具体的な施策3つ（各施策名＋顧客メリット説明）
3. 【推奨プラン】提案内容・実施範囲・期待効果
4. 【想定スケジュール】診断1-2週間・実装2-4週間・効果検証1ヶ月
5. 【期待効果】直近3ヶ月・中期6-12ヶ月・ROI概算

信頼感を持たせながらも高圧的でない表現で。`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const proposal = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ url, proposal, source: 'claude' });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'レート制限中です。しばらく待ってから再試行してください' }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : '提案書生成エラーが発生しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
