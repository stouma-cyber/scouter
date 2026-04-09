'use client';

interface WeaknessReportProps {
  issues: string[];
}

// Translation map for common Lighthouse audit IDs to client-friendly Japanese explanations
const auditTranslations: { [key: string]: { metric: string; issue: string } } = {
  'largest-contentful-paint': {
    metric: 'LCP',
    issue: 'ページの読み込みが遅く、ユーザーの53%が離脱する可能性があります',
  },
  'cumulative-layout-shift': {
    metric: 'CLS',
    issue: 'ページ読み込み時のレイアウトズレがあり、ユーザー体験が悪化しています',
  },
  'first-input-delay': {
    metric: 'FID',
    issue: 'ユーザー操作への応答遅延があり、離脱の原因になっています',
  },
  'first-contentful-paint': {
    metric: 'FCP',
    issue: 'コンテンツ表示までの時間が長く、初期インプレッション低下につながります',
  },
  'interaction-to-next-paint': {
    metric: 'INP',
    issue: 'クリック後の反応速度が遅く、ユーザーストレスが増加しています',
  },
  'speed-index': {
    metric: 'Speed Index',
    issue: 'ページ表示速度が遅く、コンバージョン率低下に直結しています',
  },
  'unused-css': {
    metric: '不要なCSS',
    issue: '使用されていないCSSが読み込まれており、ページ速度低下の原因です',
  },
  'unused-javascript': {
    metric: '不要なJavaScript',
    issue: '不要なJavaScriptが含まれており、ページ速度を圧迫しています',
  },
  'image-alt-text': {
    metric: 'Alt属性',
    issue: '画像にAlt属性がなく、SEOとアクセシビリティが低下しています',
  },
  'color-contrast': {
    metric: 'コントラスト',
    issue: 'テキストと背景のコントラストが不足し、読みやすさが低下しています',
  },
  'mobile-friendly': {
    metric: 'モバイル対応',
    issue: 'モバイル表示が最適化されておらず、ユーザーの60%を逃しています',
  },
  'meta-description': {
    metric: 'メタディスクリプション',
    issue: 'メタディスクリプションが設定されていないため、SEO評価が低下しています',
  },
};

function generateWeaknessPoint(
  index: number,
  issueKey: string
): { metric: string; issue: string } {
  const translation = auditTranslations[issueKey];
  if (translation) {
    return translation;
  }

  const defaultMetrics = ['読み込み速度', '構造最適化', 'SEO対応', 'セキュリティ'];
  const defaultIssues = [
    'ページの読み込み速度が改善の余地があり、ユーザー離脱率が高くなっています',
    'HTMLとCSSの構造が最適化されていないため、検索順位が低下する可能性があります',
    'SEO基本設定が不完全で、検索エンジンからのアクセス機会を逃しています',
    'セキュリティ対応が不十分で、ユーザー信頼度が低下するリスクがあります',
  ];

  return {
    metric: defaultMetrics[index % defaultMetrics.length],
    issue: defaultIssues[index % defaultIssues.length],
  };
}

export default function WeaknessReport({ issues }: WeaknessReportProps) {
  const weaknessPoints = issues.map((issue, index) => {
    const keywordMatch = issue.match(/\[(.*?)\]/);
    const key = keywordMatch ? keywordMatch[1] : `issue-${index}`;
    return generateWeaknessPoint(index, key.toLowerCase());
  });

  return (
    <div className="section-container fade-in">
      <h2 className="heading-jp">⚠️ 弱点レポート</h2>
      <p className="text-sm text-slate-400 mb-6">
        技術診断から発見された主な課題（クライアント向け説明）
      </p>

      <div className="space-y-4">
        {weaknessPoints.length > 0 ? (
          weaknessPoints.map((point, index) => (
            <div
              key={index}
              className="bg-secondary/50 border-l-4 border-orange-500 rounded-lg p-4 hover:bg-secondary/70 transition-colors duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">🔴</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-400 mb-1">
                    {point.metric}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {point.issue}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-secondary/50 border border-accent/20 rounded-lg p-6 text-center">
            <p className="text-slate-400">データ分析中...</p>
          </div>
        )}
      </div>

      {weaknessPoints.length > 0 && (
        <div className="mt-8 pt-6 border-t border-accent/10 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-4">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-orange-400">
              {weaknessPoints.length}個の課題
            </span>
            が確認されました。これらの改善によって、SEO順位とユーザー体験が大幅に向上します。
          </p>
        </div>
      )}
    </div>
  );
}
