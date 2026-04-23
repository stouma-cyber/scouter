# SEO Reverse — 競合差分分析ツール

サウスエージェンシー社内ツール。Google検索上位の競合記事をクロールし、記事内容の変更を自動検知してSEO戦略に活用する。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + TypeScript
- **ホスティング**: Vercel (Hobbyプラン — 関数タイムアウト10秒)
- **DB**: Supabase PostgreSQL (無料枠 500MB)
- **検索API**: Serper.dev (Google SERP取得)
- **HTML解析**: linkedom + @mozilla/readability
- **AI分析**: Google Gemini (gemini-2.0-flash)
- **スタイル**: Tailwind CSS (白ベースのライトテーマ)

## ディレクトリ構成

```
app/
  page.tsx              # メインUI（SPA、全コンポーネント含む）
  layout.tsx            # レイアウト
  globals.css           # グローバルCSS
  api/
    keywords/route.ts   # キーワードCRUD
    crawl/route.ts      # SERP取得 + 記事本文クロール
    crawl-dates/route.ts # クロール日時一覧取得
    diff/route.ts       # 差分検知 + AI分析
lib/
  supabase.ts           # Supabaseクライアント初期化
```

## Supabase テーブル構成

### keywords
- `id` (uuid, PK), `keyword` (text, unique), `is_active` (bool), `created_at` (timestamptz)

### serp_snapshots
- `id` (uuid, PK), `keyword_id` (uuid, FK→keywords), `url` (text), `title` (text), `rank` (int), `observed_at` (timestamptz, default now())

### article_contents
- `id` (uuid, PK), `url` (text), `title` (text), `content` (text), `content_hash` (text), `images` (jsonb), `fetched_at` (timestamptz, default now())

### diff_results
- `id` (uuid, PK), `keyword_id` (uuid, FK→keywords), `url` (text), `prev_rank` (int), `curr_rank` (int), `rank_change` (int), `added_text` (text), `removed_text` (text), `added_images` (jsonb), `removed_images` (jsonb), `is_new_entry` (bool), `ai_analysis` (text), `detected_at` (timestamptz, default now())

## 環境変数 (Vercel側で設定済み)

```
NEXT_PUBLIC_SUPABASE_URL=https://rlcfdxhmrsuanzcdivef.supabase.co
SUPABASE_SECRET_KEY=<service_role_key>
SERPER_API_KEY=<serper_api_key>
GEMINI_API_KEY=<gemini_api_key>
```

## 主要な処理フロー

### クロール (POST /api/crawl)
1. Serper.devでGoogle検索上位20件取得
2. SERP順位をserp_snapshotsに保存
3. 上位10件の記事本文をlinkedom+Readabilityで抽出
4. content_hashで重複チェックし、変更があればarticle_contentsに保存
5. 3記事ずつ並列処理、1記事あたり5秒タイムアウト

### 差分検知 (POST /api/diff)
1. 2つの日時のSERPスナップショットを比較
2. 順位変動・新規ランクインを検出
3. article_contentsから句・節レベルのテキスト差分を抽出
4. 画像の追加・削除を検出
5. 最初の1件のみGemini AIで変更意図を分析
6. 結果をdiff_resultsに保存

### モード
- `all`: 全記事の変更を検知（コンテンツ変更 or 順位変動がある記事を表示）
- `rank-up`: 順位上昇した記事のみ

## Vercel Hobbyプランの制約

- **関数タイムアウト: 10秒**。クロール・差分検知ともにこの制限内で完了する必要がある
- クロール対象を上位10件に制限、バッチサイズ3、記事取得タイムアウト5秒で対策済み
- AI分析は1件目のみ自動実行（タイムアウト防止）

## 既知の問題・未対応事項

1. **認証なし** — URLを知っていれば誰でもアクセス・操作可能。簡易パスワード認証の実装が必要
2. **データ自動削除なし** — Supabase無料枠500MBに対してデータが蓄積し続ける。古いデータの定期削除が未実装
3. **AI分析が1件限定** — Vercelタイムアウト対策で最初の1件のみ。残りは「（AI分析は1件目のみ自動実行）」と表示
4. **`body img` フォールバック** — 画像抽出で広告画像も拾う可能性あり
5. **ローカルビルドエラー** — 環境変数未設定だと `supabaseUrl is required` エラーでビルド失敗する（Vercelでは問題なし）

## ビルド・デプロイ

```bash
npm install
npm run dev          # ローカル開発（要 .env.local に環境変数設定）
npm run build        # ビルド確認
git push origin main # Vercelに自動デプロイ
```

## コーディング規約

- 日本語コメント推奨
- コミットメッセージは日本語で機能の要約を記載
- UIコンポーネントはpage.tsxに集約（分割は今後の課題）
- Tailwind CSSのユーティリティクラスで直接スタイリング
- APIルートはNext.js App Router形式（route.ts）
