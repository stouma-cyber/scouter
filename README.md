# SCOUTER - Website Analysis & Proposal Generation Tool

SCOUTER（サイト診断 → 提案書自動生成アプリ）は、日本のSEO/デジタルマーケティング代理店「サウスエージェンシー」向けの営業支援ツールです。

## 機能

1. **URL入力と自動分析**
   - ユーザーがWebサイトURLを入力
   - Google PageSpeed Insights APIを使用した自動診断

2. **サイト戦闘力表示（レーダーチャート）**
   - Lighthouseスコア（0-100）を4軸で表示
   - パフォーマンス、アクセシビリティ、ベストプラクティス、SEOを視覚化

3. **弱点レポート**
   - 技術的な課題を顧客向けの分かりやすい日本語に翻訳
   - クライアントの関心事（離脱率、SEO順位への影響など）に焦点

4. **提案書ドラフト自動生成**
   - Google Gemini APIを使用したAI生成
   - 営業提案として実用的な構成（課題→提案→スケジュール→期待効果）
   - コピーボタン付きで簡単にクリップボードに保存可能

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **スタイリング**: Tailwind CSS
- **チャート**: Recharts
- **外部API**:
  - Google PageSpeed Insights API（無料、APIキー不要）
  - Google Gemini API (gemini-2.0-flash)
- **言語**: TypeScript
- **デプロイ**: Vercel対応

## セットアップ方法

### 1. 環境構築

```bash
# リポジトリのクローン
git clone <repository-url>
cd scouter

# 依存関係のインストール
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、Gemini APIキーを設定します:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Gemini APIキーは[Google AI Studio](https://aistudio.google.com)から取得できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## ビルドと本番デプロイ

### ビルド

```bash
npm run build
```

### 本番実行

```bash
npm start
```

### Vercelへのデプロイ

```bash
# Vercel CLIをインストール（初回のみ）
npm i -g vercel

# デプロイ実行
vercel
```

Vercelダッシュボードで`GEMINI_API_KEY`環境変数を設定してください。

## ファイル構成

```
scouter/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts        # PageSpeed Insights APIへのプロキシ
│   │   └── propose/route.ts        # Gemini API呼び出し
│   ├── globals.css                 # グローバルスタイル
│   ├── layout.tsx                  # RootLayout
│   └── page.tsx                    # メインページ
├── components/
│   ├── Header.tsx                  # ヘッダー
│   ├── UrlInput.tsx                # URL入力フォーム
│   ├── LoadingAnimation.tsx        # ローディングアニメーション
│   ├── ScoreRadar.tsx              # レーダーチャート
│   ├── WeaknessReport.tsx          # 弱点レポート
│   └── ProposalDraft.tsx           # 提案書表示
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── tailwind.config.js
├── .env.example
├── .gitignore
└── README.md
```

## API仕様

### POST /api/analyze

Webサイトを分析し、Lighthouseスコアと検出された課題を返します。

**リクエスト:**
```json
{
  "url": "https://example.com"
}
```

**レスポンス:**
```json
{
  "url": "https://example.com",
  "scores": [
    {
      "name": "https://example.com",
      "Performance": 85,
      "Accessibility": 92,
      "BestPractices": 79,
      "SEO": 88
    }
  ],
  "issues": [
    "[largest-contentful-paint] Score: 75",
    "[unused-javascript] Score: 60",
    ...
  ]
}
```

### POST /api/propose

分析結果をもとに営業提案書をAI生成します。

**リクエスト:**
```json
{
  "url": "https://example.com",
  "scores": [...],
  "issues": [...]
}
```

**レスポンス:**
```json
{
  "url": "https://example.com",
  "proposal": "【課題サマリー】\n...\n【改善提案】\n..."
}
```

## デザインの特徴

- **ダーク・フューチャリスティック UI**: SCI-FIスキャナーのようなインターフェース
- **レスポンシブ設計**: モバイル・タブレット・デスクトップ対応
- **スムーズなアニメーション**: ローディング、フェード、グロー効果
- **日本語テキスト**: UI全体で統一された日本語表記
- **アクセシビリティ**: 適切なコントラスト比、セマンティックHTML

## 使用技術の詳細

### PageSpeed Insights API

GoogleのPageSpeed Insights APIを使用してLighthouseスコアを取得。APIキー不要で利用可能です。

```
https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo
```

### Gemini API

Google Generative AIのgemini-2.0-flashモデルを使用。営業提案書の高品質生成が可能です。

```typescript
const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

## トラブルシューティング

### GEMINI_API_KEYエラー

環境変数が正しく設定されているか確認してください:
```bash
echo $GEMINI_API_KEY
```

Vercelの場合は、プロジェクト設定 → Environment Variables で設定してください。

### PageSpeed Insights APIエラー

- ネットワーク接続を確認
- URLが有効か確認
- GoogleのAPI利用状況ダッシュボードを確認

### Lighthouseスコアが取得できない

PageSpeed Insights APIは初回呼び出しに数秒要します。タイムアウト値を増やすか、再試行してください。

## ライセンス

© 2024 South Agency. All rights reserved.

## サポート

問題が発生した場合は、以下をご確認ください:
1. 環境変数の設定
2. ネットワーク接続
3. APIキーの有効性
4. ブラウザの開発者ツール（コンソール）でエラー内容確認

## 今後の改善案

- [ ] 複数URLの一括分析
- [ ] 分析結果の履歴保存
- [ ] PDFダウンロード機能
- [ ] カスタマイズ可能なテンプレート
- [ ] ダッシュボード機能
- [ ] 顧客別のブランディング設定
