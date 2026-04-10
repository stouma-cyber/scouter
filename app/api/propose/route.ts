import { NextRequest, NextResponse } from 'next/server';

// Vercel Hobby plan max is 60s; allow enough time for retries
export const maxDuration = 60;

interface ScoreData {
  name: string;
  Performance: number;
  Accessibility: number;
  BestPractices: number;
  SEO: number;
}

// ─── Fallback: Template-based proposal when Gemini is unavailable ───
function generateTemplateProposal(url: string, score: ScoreData, issues: string[]): string {
  const performanceLevel =
    score.Performance >= 90 ? '優秀' :
    score.Performance >= 70 ? '良好' :
    score.Performance >= 50 ? 'やや改善が必要' : '改善が必要';

  const seoLevel =
    score.SEO >= 90 ? '優秀' :
    score.SEO >= 70 ? '良好' :
    score.SEO >= 50 ? 'やや改善が必要' : '改善が必要';

  const accessibilityLevel =
    score.Accessibility >= 90 ? '優秀' :
    score.Accessibility >= 70 ? '良好' :
    score.Accessibility >= 50 ? 'やや改善が必要' : '改善が必要';

  const bestPracticesLevel =
    score.BestPractices >= 90 ? '優秀' :
    score.BestPractices >= 70 ? '良好' :
    score.BestPractices >= 50 ? 'やや改善が必要' : '改善が必要';

  // Identify top 3 weakest areas
  const areas = [
    { name: 'パフォーマンス', score: score.Performance, level: performanceLevel },
    { name: 'SEO', score: score.SEO, level: seoLevel },
    { name: 'アクセシビリティ', score: score.Accessibility, level: accessibilityLevel },
    { name: 'ベストプラクティス', score: score.BestPractices, level: bestPracticesLevel },
  ].sort((a, b) => a.score - b.score);

  const weakest = areas.slice(0, 3);

  // Build issue details
  const issueDetails = issues.length > 0
    ? issues.slice(0, 5).map((issue, idx) => `  ${idx + 1}. ${issue}`).join('\n')
    : '  特に大きな課題は検出されませんでした';

  // Performance-specific recommendations
  const perfRecommendations: string[] = [];
  if (score.Performance < 70) {
    perfRecommendations.push(
      '- **画像最適化**: WebP/AVIF形式への変換、遅延読み込み（Lazy Loading）の導入',
      '- **コード最適化**: JavaScript/CSSの圧縮・分割、不要なスクリプトの削除',
      '- **キャッシュ戦略**: ブラウザキャッシュ・CDNの適切な設定',
    );
  }
  if (score.SEO < 80) {
    perfRecommendations.push(
      '- **メタタグ最適化**: title、description、OGPタグの最適化',
      '- **構造化データ**: JSON-LDによるリッチスニペット対応',
      '- **内部リンク改善**: サイト構造の最適化とクロール効率の向上',
    );
  }
  if (score.Accessibility < 80) {
    perfRecommendations.push(
      '- **アクセシビリティ改善**: alt属性、ARIAラベル、コントラスト比の最適化',
      '- **キーボードナビゲーション**: フォーカス管理とキーボード操作の対応',
    );
  }
  if (perfRecommendations.length === 0) {
    perfRecommendations.push(
      '- **継続的モニタリング**: Core Web Vitalsの定期チェックと改善',
      '- **最新技術の導入**: HTTP/3、プリフェッチ戦略の検討',
    );
  }

  // Overall assessment
  const avgScore = Math.round((score.Performance + score.SEO + score.Accessibility + score.BestPractices) / 4);
  const overallAssessment =
    avgScore >= 90 ? '全体的に高い品質を維持しています。さらなる最適化で競合優位性を強化できます。' :
    avgScore >= 70 ? '概ね良好ですが、いくつかの領域で改善の余地があります。' :
    avgScore >= 50 ? '複数の重要な改善ポイントが見つかりました。優先度を付けた段階的な改善をお勧めします。' :
    '早急な改善が必要な状態です。基本的な項目から優先的に対応することで、大幅な改善が見込めます。';

  return `# サイト診断レポート＆改善提案書

**対象サイト**: ${url}
**診断日**: ${new Date().toLocaleDateString('ja-JP')}
**診断ツール**: Google Lighthouse (モバイル)

---

## 1. 課題サマリー

### サイトの現状評価

${overallAssessment}

| カテゴリ | スコア | 評価 |
|---------|--------|------|
| パフォーマンス | **${score.Performance}** / 100 | ${performanceLevel} |
| SEO | **${score.SEO}** / 100 | ${seoLevel} |
| アクセシビリティ | **${score.Accessibility}** / 100 | ${accessibilityLevel} |
| ベストプラクティス | **${score.BestPractices}** / 100 | ${bestPracticesLevel} |
| **総合平均** | **${avgScore}** / 100 | |

### 主要な課題点

${weakest.map((w, i) => `**課題${i + 1}: ${w.name}（スコア: ${w.score}）**
${w.score < 50 ? '早急な改善が必要です。' : w.score < 70 ? '改善することでユーザー体験と検索順位に好影響が期待できます。' : '微調整でさらなる向上が見込めます。'}`).join('\n\n')}

### 検出された技術的課題

${issueDetails}

---

## 2. 改善提案

${perfRecommendations.join('\n')}

---

## 3. 推奨プラン

サウスエージェンシーでは、以下のステップで改善を支援いたします。

**実施範囲と成果物**:
- サイト診断詳細レポート
- 改善施策の優先度マトリクス
- 技術的な改善実装
- 改善前後の効果測定レポート

---

## 4. 想定スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| 診断・企画 | 1〜2週間 | 詳細な技術診断と改善計画の策定 |
| 実装 | 2〜4週間 | 優先度の高い施策から段階的に実装 |
| 効果検証 | 1ヶ月 | 改善効果の測定とレポーティング |

---

## 5. 期待効果

**直近3ヶ月の見込み効果**:
${score.Performance < 70 ? '- ページ読み込み速度の30〜50%改善\n- モバイルでのユーザー離脱率の低減' : '- パフォーマンスの微調整による安定化'}
${score.SEO < 80 ? '- 検索エンジンでのインデックス効率向上\n- 主要キーワードでの検索順位改善' : '- SEOポジションの維持・強化'}

**中期的な期待効果（6〜12ヶ月）**:
- Core Web Vitalsの継続的な改善
- オーガニック検索流入の増加
- コンバージョン率の向上

---

*本レポートはGoogle Lighthouse（モバイル）の分析結果に基づいて自動生成されました。*
*より詳細な分析と具体的な改善提案については、お気軽にお問い合わせください。*

**サウスエージェンシー**
`;
}

// ─── Try Gemini API via direct REST call (v1 endpoint) ───
async function callGeminiRest(apiKey: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        console.log(`Gemini REST API error: ${response.status}`);
        return null; // Fall through to template
      }

      if (!response.ok) {
        console.log(`Gemini REST API non-OK: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || null;
    } catch (err) {
      console.error('Gemini REST call error:', err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─── Try Gemini via SDK (v1beta endpoint) ───
async function callGeminiSdk(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text || null;
  } catch (err) {
    console.error('Gemini SDK error:', err);
    return null;
  }
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

    const score = scores[0] as ScoreData;
    const apiKey = process.env.GEMINI_API_KEY;

    let proposal: string | null = null;
    let source: 'gemini-rest' | 'gemini-sdk' | 'template' = 'template';

    if (apiKey) {
      // Build the prompt
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

      // Strategy 1: Try v1 REST endpoint (different quota pool than v1beta)
      console.log('Trying Gemini v1 REST endpoint...');
      proposal = await callGeminiRest(apiKey, prompt);
      if (proposal) {
        source = 'gemini-rest';
        console.log('Gemini v1 REST succeeded');
      }

      // Strategy 2: Try SDK (v1beta endpoint)
      if (!proposal) {
        console.log('Trying Gemini SDK (v1beta)...');
        proposal = await callGeminiSdk(apiKey, prompt);
        if (proposal) {
          source = 'gemini-sdk';
          console.log('Gemini SDK succeeded');
        }
      }
    }

    // Strategy 3: Fallback to template-based proposal
    if (!proposal) {
      console.log('Using template-based proposal generator');
      proposal = generateTemplateProposal(url, score, issues || []);
      source = 'template';
    }

    return NextResponse.json({
      url,
      proposal,
      source, // Let frontend know which method was used
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
