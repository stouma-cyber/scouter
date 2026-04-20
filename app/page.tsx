'use client';

import { useState, useEffect, useCallback } from 'react';

interface Keyword {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
}

interface SerpItem {
  rank: number;
  title: string;
  url: string;
  crawled: boolean;
}

interface DiffResult {
  url: string;
  title: string | null;
  prevRank: number | null;
  currRank: number;
  rankChange: number | null;
  isNewEntry: boolean;
  addedText: string;
  removedText: string;
  aiAnalysis: string;
}

// 過去DB保存分用
interface SavedDiffResult {
  id: string;
  url: string;
  prev_rank: number | null;
  curr_rank: number;
  rank_change: number | null;
  is_new_entry: boolean;
  added_text: string;
  removed_text: string;
  ai_analysis: string;
  detected_at: string;
}

type TabType = 'serp' | 'diff' | 'history';

export default function Home() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{ totalResults: number; crawled: number; failed: number } | null>(null);
  const [serpItems, setSerpItems] = useState<SerpItem[]>([]);
  const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
  const [savedDiffs, setSavedDiffs] = useState<SavedDiffResult[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('serp');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // キーワード一覧取得
  const fetchKeywords = useCallback(async () => {
    setIsLoadingKeywords(true);
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      if (data.keywords) setKeywords(data.keywords);
    } catch {
      setError('キーワードの取得に失敗しました');
    } finally {
      setIsLoadingKeywords(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // 過去の差分結果を取得
  const fetchSavedDiffs = useCallback(async (keywordId: string) => {
    try {
      const res = await fetch(`/api/diff?keywordId=${keywordId}`);
      const data = await res.json();
      if (data.results) setSavedDiffs(data.results);
    } catch {
      console.error('Failed to fetch saved diffs');
    }
  }, []);

  // キーワード追加
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKeyword('');
        fetchKeywords();
        setSuccessMsg(`「${newKeyword.trim()}」を登録しました`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.error || '登録に失敗しました');
      }
    } catch {
      setError('キーワードの登録に失敗しました');
    }
  };

  // キーワード削除
  const deleteKeyword = async (id: string) => {
    try {
      await fetch('/api/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (selectedKeyword?.id === id) {
        setSelectedKeyword(null);
        setDiffResults([]);
        setCrawlResult(null);
        setSerpItems([]);
        setSavedDiffs([]);
      }
      fetchKeywords();
    } catch {
      setError('削除に失敗しました');
    }
  };

  // クロール実行
  const runCrawl = async () => {
    if (!selectedKeyword) return;
    setIsCrawling(true);
    setError('');
    setCrawlResult(null);
    setSerpItems([]);
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: selectedKeyword.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCrawlResult({
          totalResults: data.totalResults,
          crawled: data.crawled,
          failed: data.failed,
        });
        if (data.serp) {
          setSerpItems(data.serp);
          setActiveTab('serp');
        }
        setSuccessMsg(`クロール完了: ${data.crawled}件取得`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.error || 'クロールに失敗しました');
      }
    } catch {
      setError('クロールの実行に失敗しました');
    } finally {
      setIsCrawling(false);
    }
  };

  // 差分検知実行
  const runDiff = async () => {
    if (!selectedKeyword) return;
    setIsAnalyzing(true);
    setError('');
    setDiffResults([]);
    setActiveTab('diff');
    try {
      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: selectedKeyword.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiffResults(data.results || []);
        if (data.results?.length === 0) {
          setSuccessMsg('順位が上がった記事はありませんでした');
        } else {
          setSuccessMsg(`${data.totalChanges}件の変動を検知しました`);
        }
        setTimeout(() => setSuccessMsg(''), 5000);
        // 過去の差分もリフレッシュ
        fetchSavedDiffs(selectedKeyword.id);
      } else {
        setError(data.error || '差分検知に失敗しました');
      }
    } catch {
      setError('差分検知の実行に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // カード展開トグル
  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // キーワード選択時に過去データも読み込む
  const selectKeyword = (kw: Keyword) => {
    setSelectedKeyword(kw);
    setDiffResults([]);
    setCrawlResult(null);
    setSerpItems([]);
    setActiveTab('serp');
    fetchSavedDiffs(kw.id);
  };

  return (
    <>
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white font-black text-sm">
              SR
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">SEO Reverse</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">競合差分分析ツール</p>
            </div>
          </div>
          <span className="text-xs text-slate-600">SOUTH AGENCY</span>
        </div>
      </header>

      <main className="min-h-screen pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Keyword Management */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-4">監視キーワード</h2>

                {/* Add keyword */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="キーワードを入力..."
                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    追加
                  </button>
                </div>

                {/* Keyword list */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {isLoadingKeywords ? (
                    <p className="text-slate-500 text-sm text-center py-4">読み込み中...</p>
                  ) : keywords.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">キーワードが登録されていません</p>
                  ) : (
                    keywords.map((kw) => (
                      <div
                        key={kw.id}
                        onClick={() => selectKeyword(kw)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                          selectedKeyword?.id === kw.id
                            ? 'bg-cyan-500/10 border border-cyan-500/30'
                            : 'bg-slate-900/30 border border-transparent hover:border-slate-700/50'
                        }`}
                      >
                        <span className="text-sm text-white truncate">{kw.keyword}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteKeyword(kw.id);
                          }}
                          className="text-slate-600 hover:text-red-400 text-xs ml-2 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedKeyword && (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white mb-2">
                    「{selectedKeyword.keyword}」のアクション
                  </h3>
                  <button
                    onClick={runCrawl}
                    disabled={isCrawling}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isCrawling ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        クロール中...
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        SERP取得 + 本文クロール
                      </>
                    )}
                  </button>
                  <button
                    onClick={runDiff}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <span>🧠</span>
                        差分検知 + AI分析
                      </>
                    )}
                  </button>

                  {crawlResult && (
                    <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                      <p>検索結果: {crawlResult.totalResults}件</p>
                      <p>クロール成功: <span className="text-emerald-400">{crawlResult.crawled}件</span></p>
                      {crawlResult.failed > 0 && (
                        <p>クロール失敗: <span className="text-red-400">{crawlResult.failed}件</span></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
              {!selectedKeyword ? (
                <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-16 text-center">
                  <div className="text-4xl mb-4 opacity-30">🎯</div>
                  <h3 className="text-lg font-bold text-white mb-2">キーワードを選択</h3>
                  <p className="text-sm text-slate-500">
                    左のパネルからキーワードを選択して、<br />
                    クロールと差分検知を実行してください。
                  </p>
                </div>
              ) : (
                <div>
                  {/* Tab Navigation */}
                  <div className="flex gap-1 mb-6 bg-slate-800/30 border border-slate-700/30 rounded-xl p-1">
                    <button
                      onClick={() => setActiveTab('serp')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'serp'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🔍 SERP順位一覧
                      {serpItems.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-cyan-500/20 rounded-full text-[10px]">
                          {serpItems.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('diff')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'diff'
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🧠 差分検知結果
                      {diffResults.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-violet-500/20 rounded-full text-[10px]">
                          {diffResults.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'history'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      📋 過去の分析
                      {savedDiffs.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 rounded-full text-[10px]">
                          {savedDiffs.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* SERP Tab */}
                  {activeTab === 'serp' && (
                    <>
                      {serpItems.length === 0 ? (
                        <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-12 text-center">
                          <div className="text-3xl mb-3 opacity-30">📊</div>
                          <h3 className="text-base font-bold text-white mb-2">「{selectedKeyword.keyword}」</h3>
                          <p className="text-sm text-slate-500">
                            「SERP取得 + 本文クロール」を実行すると<br />
                            Google検索の順位一覧が表示されます。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <h2 className="text-sm font-bold text-white mb-3">
                            Google検索結果 — 「{selectedKeyword.keyword}」
                          </h2>
                          {serpItems.map((item) => (
                            <div
                              key={item.rank}
                              className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 flex items-start gap-4 hover:bg-slate-800/50 transition-colors"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                item.rank <= 3
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                  : 'bg-slate-700/50 text-slate-400'
                              }`}>
                                {item.rank}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium leading-snug mb-1 line-clamp-2">
                                  {item.title}
                                </p>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-cyan-400/70 hover:text-cyan-400 truncate block transition-colors"
                                >
                                  {item.url}
                                </a>
                              </div>
                              <div className="flex-shrink-0">
                                {item.crawled ? (
                                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                                    取得済
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20">
                                    失敗
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Diff Tab */}
                  {activeTab === 'diff' && (
                    <>
                      {isAnalyzing ? (
                        <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-16 text-center">
                          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                          <h3 className="text-lg font-bold text-white mb-2">AI分析中...</h3>
                          <p className="text-sm text-slate-500">
                            競合記事の差分を検知し、AIが変更意図を分析しています。<br />
                            少々お待ちください。
                          </p>
                        </div>
                      ) : diffResults.length === 0 ? (
                        <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-12 text-center">
                          <div className="text-3xl mb-3 opacity-30">🧠</div>
                          <h3 className="text-base font-bold text-white mb-2">差分検知</h3>
                          <p className="text-sm text-slate-500">
                            2回以上クロールした後に「差分検知 + AI分析」を<br />
                            実行すると、順位変動と記事変更の分析結果が表示されます。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h2 className="text-sm font-bold text-white">
                            差分検知結果 ({diffResults.length}件)
                          </h2>
                          {diffResults.map((result, index) => (
                            <DiffCard
                              key={index}
                              result={result}
                              isExpanded={expandedCards.has(index)}
                              onToggle={() => toggleCard(index)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <>
                      {savedDiffs.length === 0 ? (
                        <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-12 text-center">
                          <div className="text-3xl mb-3 opacity-30">📋</div>
                          <h3 className="text-base font-bold text-white mb-2">分析履歴</h3>
                          <p className="text-sm text-slate-500">
                            差分検知を実行すると、結果がここに蓄積されます。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h2 className="text-sm font-bold text-white mb-3">
                            過去の分析結果 ({savedDiffs.length}件)
                          </h2>
                          {savedDiffs.map((item) => (
                            <div
                              key={item.id}
                              className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden"
                            >
                              <div
                                onClick={() => toggleHistory(item.id)}
                                className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {item.is_new_entry ? (
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                                          NEW
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                                          UP +{item.rank_change}
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-500">
                                        {item.is_new_entry
                                          ? `${item.curr_rank}位にランクイン`
                                          : `${item.prev_rank}位 → ${item.curr_rank}位`}
                                      </span>
                                      <span className="text-[10px] text-slate-600 ml-auto">
                                        {new Date(item.detected_at).toLocaleDateString('ja-JP')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-cyan-400/70 truncate">{item.url}</p>
                                  </div>
                                  <svg
                                    className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${
                                      expandedHistory.has(item.id) ? 'rotate-180' : ''
                                    }`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </div>
                              </div>

                              {expandedHistory.has(item.id) && (
                                <div className="border-t border-slate-700/30 p-4 space-y-3">
                                  {item.added_text && (
                                    <div>
                                      <h4 className="text-xs font-bold text-emerald-400 mb-1.5">+ 追加コンテンツ</h4>
                                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {item.added_text}
                                      </div>
                                    </div>
                                  )}
                                  {item.removed_text && (
                                    <div>
                                      <h4 className="text-xs font-bold text-red-400 mb-1.5">- 削除コンテンツ</h4>
                                      <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {item.removed_text}
                                      </div>
                                    </div>
                                  )}
                                  {item.ai_analysis && (
                                    <div>
                                      <h4 className="text-xs font-bold text-cyan-400 mb-1.5">🧠 AI分析</h4>
                                      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                        {item.ai_analysis}
                                      </div>
                                    </div>
                                  )}
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                  >
                                    記事を開く ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>&copy; 2024 サウスエージェンシー &mdash; SEO Reverse</p>
          <div className="flex items-center gap-4">
            <span>Serper.dev (Google SERP)</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span>Gemini AI</span>
          </div>
        </div>
      </footer>
    </>
  );
}

// Diff結果カードコンポーネント
function DiffCard({
  result,
  isExpanded,
  onToggle,
}: {
  result: DiffResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
      <div
        onClick={onToggle}
        className="p-5 cursor-pointer hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {result.isNewEntry ? (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                  NEW
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                  UP +{result.rankChange}
                </span>
              )}
              <span className="text-xs text-slate-500">
                {result.isNewEntry
                  ? `${result.currRank}位にランクイン`
                  : `${result.prevRank}位 → ${result.currRank}位`}
              </span>
            </div>
            <p className="text-sm text-white font-medium truncate">
              {result.title || result.url}
            </p>
            <p className="text-xs text-slate-500 truncate mt-1">{result.url}</p>
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-700/30 p-5 space-y-4">
          {result.addedText && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                <span>+</span> 追加されたコンテンツ
              </h4>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {result.addedText}
              </div>
            </div>
          )}
          {result.removedText && (
            <div>
              <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                <span>-</span> 削除されたコンテンツ
              </h4>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {result.removedText}
              </div>
            </div>
          )}
          {result.aiAnalysis && (
            <div>
              <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1">
                <span>🧠</span> AI分析レポート
              </h4>
              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {result.aiAnalysis}
              </div>
            </div>
          )}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            記事を開く ↗
          </a>
        </div>
      )}
    </div>
  );
}
