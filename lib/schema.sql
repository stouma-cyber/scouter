-- SEO Reverse Engineering System - Database Schema

-- 1. 監視キーワード
CREATE TABLE keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 検索結果スナップショット（各観測回の記事URL+順位）
CREATE TABLE serp_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  rank INTEGER NOT NULL,
  observed_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 記事本文データ
CREATE TABLE article_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 差分検知結果
CREATE TABLE diff_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  prev_rank INTEGER,
  curr_rank INTEGER,
  rank_change INTEGER,
  added_text TEXT,
  removed_text TEXT,
  ai_analysis TEXT,
  is_new_entry BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_serp_keyword_date ON serp_snapshots(keyword_id, observed_at DESC);
CREATE INDEX idx_article_url_date ON article_contents(url, fetched_at DESC);
CREATE INDEX idx_diff_keyword_date ON diff_results(keyword_id, detected_at DESC);
