'use client';

interface WeaknessReportProps {
  issues: string[];
}

interface WeaknessItem {
  metric: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  category: 'performance' | 'seo' | 'accessibility' | 'security';
  suggestion: string;
  score: number;
}

const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
  performance: { label: 'パフォーマンス', icon: '⚡', color: '#f59e0b' },
  seo: { label: 'SEO', icon: '🔍', color: '#8b5cf6' },
  accessibility: { label: 'アクセシビリティ', icon: '♿', color: '#3b82f6' },
  security: { label: 'セキュリティ', icon: '🔒', color: '#ef4444' },
};

const impactLabels: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '影響度: 高', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { label: '影響度: 中', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low: { label: '影響度: 低', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

// Comprehensive audit translation map
const auditTranslations: Record<string, Omit<WeaknessItem, 'score'>> = {
  'largest-contentful-paint': {
    metric: 'LCP（最大コンテンツ描画）',
    issue: 'メインコンテンツの表示に時間がかかっています。ユーザーの53%が3秒以上の読み込みで離脱します。',
    impact: 'high',
    category: 'performance',
    suggestion: '画像の最適化、サーバー応答時間の短縮、レンダリングブロックリソースの削除',
  },
  'cumulative-layout-shift': {
    metric: 'CLS（レイアウトシフト）',
    issue: 'ページ読み込み中にレイアウトが動くため、ユーザーが誤クリックしやすい状態です。',
    impact: 'high',
    category: 'performance',
    suggestion: '画像・動画にサイズ属性を指定、フォント読み込みの最適化',
  },
  'first-contentful-paint': {
    metric: 'FCP（初回コンテンツ描画）',
    issue: '最初のコンテンツが表示されるまで時間がかかり、ユーザーに「遅い」印象を与えています。',
    impact: 'high',
    category: 'performance',
    suggestion: 'クリティカルCSSのインライン化、サーバー応答時間の短縮',
  },
  'interaction-to-next-paint': {
    metric: 'INP（インタラクション応答性）',
    issue: 'ボタンクリック等の操作後の反応が遅く、ユーザーのストレスにつながっています。',
    impact: 'high',
    category: 'performance',
    suggestion: 'JavaScriptの最適化、メインスレッドのブロッキング削減',
  },
  'speed-index': {
    metric: 'Speed Index（表示速度）',
    issue: 'ページ全体の表示速度が遅く、特にモバイルユーザーの離脱率に影響しています。',
    impact: 'high',
    category: 'performance',
    suggestion: 'リソースの遅延読み込み、コードスプリッティング、CDNの活用',
  },
  'total-blocking-time': {
    metric: 'TBT（メインスレッドブロック）',
    issue: 'JavaScriptの処理がページ操作を長時間ブロックしており、応答性が低下しています。',
    impact: 'high',
    category: 'performance',
    suggestion: '長時間タスクの分割、不要なJavaScriptの削除',
  },
  'unused-css': {
    metric: '未使用CSS',
    issue: '使われていないCSSルールが読み込まれ、不要な通信量と処理時間が発生しています。',
    impact: 'medium',
    category: 'performance',
    suggestion: 'PurgeCSSなどによる不要CSSの削除、Critical CSSの導入',
  },
  'unused-javascript': {
    metric: '未使用JavaScript',
    issue: '未使用のJavaScriptコードが含まれており、ページの読み込み速度を低下させています。',
    impact: 'medium',
    category: 'performance',
    suggestion: 'Tree shaking、コード分割、動的インポートの活用',
  },
  'render-blocking-resources': {
    metric: 'レンダリングブロック',
    issue: 'CSS/JSファイルがページ描画をブロックしており、初期表示が遅れています。',
    impact: 'medium',
    category: 'performance',
    suggestion: 'CSSの非同期読み込み、JSのdefer/async属性の追加',
  },
  'unsized-images': {
    metric: '画像サイズ未指定',
    issue: '画像にwidth/height属性が未設定で、レイアウトシフトの原因になっています。',
    impact: 'medium',
    category: 'performance',
    suggestion: 'すべての画像にwidth/height属性またはaspect-ratioを設定',
  },
  'color-contrast': {
    metric: 'コントラスト比',
    issue: 'テキストと背景のコントラストが不足し、視覚障害のあるユーザーが読みづらい状態です。',
    impact: 'medium',
    category: 'accessibility',
    suggestion: 'WCAG AA基準（4.5:1以上）を満たすコントラスト比に調整',
  },
  'image-alt': {
    metric: '画像Alt属性',
    issue: '画像に代替テキストがなく、スクリーンリーダー利用者やSEOに悪影響です。',
    impact: 'medium',
    category: 'accessibility',
    suggestion: 'すべての画像に意味のあるalt属性を追加',
  },
  'button-name': {
    metric: 'ボタンのラベル',
    issue: 'ボタンにアクセシブルな名前がなく、スクリーンリーダーで認識できません。',
    impact: 'medium',
    category: 'accessibility',
    suggestion: 'ボタンにaria-label属性またはテキストコンテンツを追加',
  },
  'link-name': {
    metric: 'リンクのラベル',
    issue: 'リンクにわかりやすいテキストがなく、どこに遷移するか判別できません。',
    impact: 'low',
    category: 'accessibility',
    suggestion: 'リンクテキストを具体的な内容に変更',
  },
  'visual-order-follows-dom': {
    metric: 'DOM順序',
    issue: '視覚的な表示順序とDOM構造が一致せず、キーボードナビゲーションに支障があります。',
    impact: 'low',
    category: 'accessibility',
    suggestion: 'CSSレイアウトとHTML構造の順序を一致させる',
  },
  'list': {
    metric: 'リスト構造',
    issue: 'リスト要素が正しいHTML構造になっていないため、支援技術での読み取りに問題があります。',
    impact: 'low',
    category: 'accessibility',
    suggestion: 'ul/ol/liタグを正しくネスト',
  },
  'meta-description': {
    metric: 'メタディスクリプション',
    issue: 'メタディスクリプションが未設定のため、検索結果での説明文がGoogleに委ねられています。',
    impact: 'high',
    category: 'seo',
    suggestion: '120〜160文字の魅力的なメタディスクリプションを設定',
  },
  'document-title': {
    metric: 'ページタイトル',
    issue: 'titleタグが未設定または最適化されていないため、検索順位に悪影響です。',
    impact: 'high',
    category: 'seo',
    suggestion: '30〜60文字のキーワードを含むタイトルを設定',
  },
  'heading-order': {
    metric: '見出し構造',
    issue: '見出しタグ（h1〜h6）の順序が正しくなく、SEO評価が低下する可能性があります。',
    impact: 'medium',
    category: 'seo',
    suggestion: 'h1→h2→h3の順序で見出しを正しく構造化',
  },
  'is-on-https': {
    metric: 'HTTPS対応',
    issue: 'サイトがHTTPSに対応しておらず、ユーザーのデータが保護されていません。',
    impact: 'high',
    category: 'security',
    suggestion: 'SSL証明書の導入とHTTPSへの完全移行',
  },
};

function parseIssue(issueStr: string, index: number): WeaknessItem {
  const keyMatch = issueStr.match(/\[(.*?)\]/);
  const scoreMatch = issueStr.match(/Score:\s*(\d+)/);
  const key = keyMatch ? keyMatch[1].toLowerCase() : '';
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  const translation = auditTranslations[key];
  if (translation) {
    return { ...translation, score };
  }

  // Fallback based on index
  const defaults: WeaknessItem[] = [
    { metric: '読み込み速度', issue: 'ページの読み込み速度に改善の余地があります。', impact: 'medium', category: 'performance', suggestion: 'リソースの最適化と圧縮', score },
    { metric: '構造最適化', issue: 'HTML/CSSの構造が最適化されていません。', impact: 'medium', category: 'performance', suggestion: 'セマンティックHTMLの活用', score },
    { metric: 'SEO基本設定', issue: 'SEO基本設定に改善点があります。', impact: 'medium', category: 'seo', suggestion: 'メタタグとOGP設定の最適化', score },
    { metric: 'セキュリティ', issue: 'セキュリティ設定に改善点があります。', impact: 'low', category: 'security', suggestion: 'セキュリティヘッダーの追加', score },
  ];
  return defaults[index % defaults.length];
}

function ImpactBar({ score }: { score: number }) {
  const width = Math.max(5, score);
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] text-slate-500 w-14 shrink-0">スコア {score}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function WeaknessReport({ issues }: WeaknessReportProps) {
  const items = issues.map((issue, index) => parseIssue(issue, index));

  // Sort by impact: high → medium → low
  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });

  // Group by category
  const highImpact = sorted.filter(i => i.impact === 'high');
  const mediumImpact = sorted.filter(i => i.impact === 'medium');
  const lowImpact = sorted.filter(i => i.impact === 'low');

  const totalHigh = highImpact.length;
  const totalMedium = mediumImpact.length;
  const totalLow = lowImpact.length;

  const renderCard = (item: WeaknessItem, index: number) => {
    const cat = categoryLabels[item.category];
    const imp = impactLabels[item.impact];
    return (
      <div key={index} className="group bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-300">
        {/* Top row: category + impact */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: cat.color, backgroundColor: `${cat.color}15` }}>
            {cat.icon} {cat.label}
          </span>
          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: imp.color, backgroundColor: imp.bg }}>
            {imp.label}
          </span>
        </div>

        {/* Metric name */}
        <h4 className="font-bold text-white text-base mb-2">{item.metric}</h4>

        {/* Issue description */}
        <p className="text-sm text-slate-400 leading-relaxed mb-3">{item.issue}</p>

        {/* Suggestion */}
        <div className="flex items-start gap-2 bg-slate-900/40 rounded-lg p-3">
          <span className="text-cyan-400 text-xs mt-0.5">💡</span>
          <p className="text-xs text-cyan-300/80 leading-relaxed">{item.suggestion}</p>
        </div>

        {/* Score bar */}
        <ImpactBar score={item.score} />
      </div>
    );
  };

  return (
    <div className="section-container fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-orange-400 to-red-500"></div>
        <div>
          <h2 className="text-xl font-bold text-white">課題レポート</h2>
          <p className="text-xs text-slate-400 mt-0.5">検出された技術的課題と改善提案</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 mt-6 mb-8 p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-sm text-slate-300">重要 <strong className="text-red-400">{totalHigh}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-sm text-slate-300">注意 <strong className="text-amber-400">{totalMedium}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
          <span className="text-sm text-slate-300">軽微 <strong className="text-green-400">{totalLow}</strong></span>
        </div>
        <div className="ml-auto text-sm text-slate-400">
          合計 <strong className="text-white">{items.length}</strong> 件
        </div>
      </div>

      {/* Issue cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((item, i) => renderCard(item, i))}
      </div>
    </div>
  );
}
