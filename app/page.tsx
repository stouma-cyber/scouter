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
  hasContentChange?: boolean;
  addedText: string;
  removedText: string;
  addedImages: string[];
  removedImages: string[];
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
  added_images: string[] | null;
  removed_images: string[] | null;
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
  const [crawledAt, setCrawledAt] = useState<string | null>(null);
  const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
  const [diffDates, setDiffDates] = useState<{ latestDate: string; prevDate: string } | null>(null);
  const [savedDiffs, setSavedDiffs] = useState<SavedDiffResult[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('serp');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // クロール履歴・日付選択
  const [crawlDates, setCrawlDates] = useState<{ date: string; articleCount: number }[]>([]);
  const [selectedDateA, setSelectedDateA] = useState<string>('');
  const [selectedDateB, setSelectedDateB] = useState<string>('');
  const [diffMode, setDiffMode] = useState<'all' | 'rank-up'>('all');

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

  const fetchSavedDiffs = useCallback(async (keywordId: string) => {
    try {
      const res = await fetch(`/api/diff?keywordId=${keywordId}`);
      const data = await res.json();
      if (data.results) setSavedDiffs(data.results);
    } catch {
      console.error('Failed to fetch saved diffs');
    }
  }, []);

  // クロール履歴を取得
  const fetchCrawlDates = useCallback(async (keywordId: string) => {
    try {
      const res = await fetch(`/api/crawl-dates?keywordId=${keywordId}`);
      const data = await res.json();
      if (data.dates) {
        setCrawlDates(data.dates);
        // デフォルトで最新2つを選択
        if (data.dates.length >= 2) {
          setSelectedDateB(data.dates[0].date);
          setSelectedDateA(data.dates[1].date);
        } else if (data.dates.length === 1) {
          setSelectedDateB(data.dates[0].date);
          setSelectedDateA('');
        }
      }
    } catch {
      console.error('Failed to fetch crawl dates');
    }
  }, []);

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
          setCrawledAt(data.crawledAt || new Date().toISOString());
          setActiveTab('serp');
        }
        setSuccessMsg(`クロール完了: ${data.crawled}件取得`);
        setTimeout(() => setSuccessMsg(''), 5000);
        // クロール履歴をリフレッシュ
        fetchCrawlDates(selectedKeyword.id);
      } else {
        setError(data.error || 'クロールに失敗しました');
      }
    } catch {
      setError('クロールの実行に失敗しました');
    } finally {
      setIsCrawling(false);
    }
  };

  const runDiff = async (overrideDateA?: string, overrideDateB?: string) => {
    if (!selectedKeyword) return;
    setIsAnalyzing(true);
    setError('');
    setDiffResults([]);
    setActiveTab('diff');
    try {
      const bodyData: Record<string, string> = {
        keywordId: selectedKeyword.id,
        mode: diffMode,
      };
      const dA = overrideDateA || selectedDateA;
      const dB = overrideDateB || selectedDateB;
      if (dA && dB) {
        bodyData.dateA = dA;
        bodyData.dateB = dB;
      }

      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (res.ok) {
        setDiffResults(data.results || []);
        if (data.latestDate && data.prevDate) {
          setDiffDates({ latestDate: data.latestDate, prevDate: data.prevDate });
        }
        if (data.results?.length === 0) {
          setSuccessMsg('変更が検知された記事はありませんでした');
        } else {
          const contentCount = data.contentChanges || 0;
          setSuccessMsg(`${data.totalChanges}件の変動を検知（コンテンツ変更: ${contentCount}件）`);
        }
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchSavedDiffs(selectedKeyword.id);
        fetchCrawlDates(selectedKeyword.id);
      } else {
        setError(data.error || '差分検知に失敗しました');
      }
    } catch {
      setError('差分検知の実行に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  const selectKeyword = (kw: Keyword) => {
    setSelectedKeyword(kw);
    setDiffResults([]);
    setDiffDates(null);
    setCrawlResult(null);
    setSerpItems([]);
    setCrawledAt(null);
    setCrawlDates([]);
    setSelectedDateA('');
    setSelectedDateB('');
    setActiveTab('serp');
    fetchSavedDiffs(kw.id);
    fetchCrawlDates(kw.id);
  };

  return (
    <>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
              SR
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">SEO Reverse</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">競合差分分析ツール</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium">SOUTH AGENCY</span>
        </div>
      </header>

      <main className="min-h-screen pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Keyword Management */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">監視キーワード</h2>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="キーワードを入力..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    追加
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {isLoadingKeywords ? (
                    <p className="text-gray-400 text-sm text-center py-4">読み込み中...</p>
                  ) : keywords.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">キーワードが登録されていません</p>
                  ) : (
                    keywords.map((kw) => (
                      <div
                        key={kw.id}
                        onClick={() => selectKeyword(kw)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                          selectedKeyword?.id === kw.id
                            ? 'bg-cyan-50 border border-cyan-200 shadow-sm'
                            : 'bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`text-sm truncate ${selectedKeyword?.id === kw.id ? 'text-cyan-700 font-medium' : 'text-gray-700'}`}>{kw.keyword}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteKeyword(kw.id);
                          }}
                          className="text-gray-400 hover:text-red-500 text-xs ml-2 transition-colors"
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
                <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">
                    「{selectedKeyword.keyword}」のアクション
                  </h3>
                  <button
                    onClick={runCrawl}
                    disabled={isCrawling}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isCrawling ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        クロール中...
                      </>
                    ) : (
                      'SERP取得 + 本文クロール'
                    )}
                  </button>
                  <button
                    onClick={runDiff}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        AI分析中...
                      </>
                    ) : (
                      '差分検知 + AI分析'
                    )}
                  </button>

                  {crawlResult && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                      <p>検索結果: {crawlResult.totalResults}件</p>
                      <p>クロール成功: <span className="text-emerald-600 font-medium">{crawlResult.crawled}件</span></p>
                      {crawlResult.failed > 0 && (
                        <p>クロール失敗: <span className="text-red-500 font-medium">{crawlResult.failed}件</span></p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
              {!selectedKeyword ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                  <div className="text-4xl mb-4 opacity-30">🎯</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">キーワードを選択</h3>
                  <p className="text-sm text-gray-500">
                    左のパネルからキーワードを選択して、<br />
                    クロールと差分検知を実行してください。
                  </p>
                </div>
              ) : (
                <div>
                  {/* Tab Navigation */}
                  <div className="flex gap-1 mb-6 bg-gray-100 border border-gray-200 rounded-xl p-1">
                    <button
                      onClick={() => setActiveTab('serp')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'serp'
                          ? 'bg-white text-cyan-700 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      SERP順位一覧
                      {serpItems.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-[10px]">
                          {serpItems.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('diff')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'diff'
                          ? 'bg-white text-violet-700 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      差分検知結果
                      {diffResults.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px]">
                          {diffResults.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'history'
                          ? 'bg-white text-amber-700 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      過去の分析
                      {savedDiffs.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                          {savedDiffs.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* SERP Tab */}
                  {activeTab === 'serp' && (
                    <>
                      {serpItems.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                          <div className="text-3xl mb-3 opacity-30">📊</div>
                          <h3 className="text-base font-bold text-gray-900 mb-2">「{selectedKeyword.keyword}」</h3>
                          <p className="text-sm text-gray-500">
                            「SERP取得 + 本文クロール」を実行すると<br />
                            Google検索の順位一覧が表示されます。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-900">
                              Google検索結果 — 「{selectedKeyword.keyword}」
                            </h2>
                            {crawledAt && (
                              <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                {new Date(crawledAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          {serpItems.map((item) => (
                            <div
                              key={item.rank}
                              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-all"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                item.rank <= 3
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {item.rank}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 font-medium leading-snug mb-1 line-clamp-2">
                                  {item.title}
                                </p>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-cyan-600 hover:text-cyan-700 truncate block transition-colors"
                                >
                                  {item.url}
                                </a>
                              </div>
                              <div className="flex-shrink-0">
                                {item.crawled ? (
                                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-200">
                                    取得済
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-50 text-red-500 text-[10px] font-bold rounded-full border border-red-200">
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
                      {/* 日付選択パネル */}
                      {crawlDates.length >= 2 && !isAnalyzing && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
                          <h3 className="text-xs font-bold text-gray-700 mb-3">クロール履歴から比較</h3>
                          <div className="flex items-end gap-3 flex-wrap">
                            <div className="flex-1 min-w-[140px]">
                              <label className="text-[10px] text-gray-400 font-medium mb-1 block">比較元（古い方）</label>
                              <select
                                value={selectedDateA}
                                onChange={(e) => setSelectedDateA(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                              >
                                <option value="">選択してください</option>
                                {crawlDates.map((d) => (
                                  <option key={d.date} value={d.date}>
                                    {new Date(d.date).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}（{d.articleCount}件）
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="text-gray-300 text-lg pb-2">→</div>
                            <div className="flex-1 min-w-[140px]">
                              <label className="text-[10px] text-gray-400 font-medium mb-1 block">比較先（新しい方）</label>
                              <select
                                value={selectedDateB}
                                onChange={(e) => setSelectedDateB(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                              >
                                <option value="">選択してください</option>
                                {crawlDates.map((d) => (
                                  <option key={d.date} value={d.date}>
                                    {new Date(d.date).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}（{d.articleCount}件）
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => runDiff(selectedDateA, selectedDateB)}
                              disabled={!selectedDateA || !selectedDateB || isAnalyzing}
                              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              比較実行
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <label className="text-[10px] text-gray-400 font-medium">モード:</label>
                            <button
                              onClick={() => setDiffMode('all')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                                diffMode === 'all'
                                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                  : 'bg-gray-50 text-gray-400 border border-gray-200 hover:text-gray-600'
                              }`}
                            >
                              全記事
                            </button>
                            <button
                              onClick={() => setDiffMode('rank-up')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                                diffMode === 'rank-up'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-50 text-gray-400 border border-gray-200 hover:text-gray-600'
                              }`}
                            >
                              順位上昇のみ
                            </button>
                          </div>
                        </div>
                      )}

                      {isAnalyzing ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">AI分析中...</h3>
                          <p className="text-sm text-gray-500">
                            競合記事の差分を検知し、AIが変更意図を分析しています。<br />
                            少々お待ちください。
                          </p>
                        </div>
                      ) : diffResults.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                          <div className="text-3xl mb-3 opacity-30">🧠</div>
                          <h3 className="text-base font-bold text-gray-900 mb-2">差分検知</h3>
                          <p className="text-sm text-gray-500">
                            {crawlDates.length >= 2
                              ? '上の日付セレクタから2つの日付を選んで「比較実行」するか、\n左の「差分検知 + AI分析」ボタンを押してください。'
                              : '2回以上クロールした後に「差分検知 + AI分析」を\n実行すると、順位変動と記事変更の分析結果が表示されます。'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* サマリーヘッダー */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h2 className="text-sm font-bold text-gray-900">
                                差分検知結果
                              </h2>
                              {diffDates && (
                                <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                  {new Date(diffDates.prevDate).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  {' → '}
                                  {new Date(diffDates.latestDate).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500">
                                順位変動: <span className="text-emerald-600 font-bold">{diffResults.filter(r => !r.isNewEntry && r.rankChange !== 0).length}件</span>
                              </span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-gray-500">
                                新規ランクイン: <span className="text-amber-600 font-bold">{diffResults.filter(r => r.isNewEntry).length}件</span>
                              </span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-gray-500">
                                コンテンツ変更: <span className="text-violet-600 font-bold">{diffResults.filter(r => r.addedText || r.removedText || (r.addedImages?.length > 0)).length}件</span>
                              </span>
                            </div>
                          </div>
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
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                          <div className="text-3xl mb-3 opacity-30">📋</div>
                          <h3 className="text-base font-bold text-gray-900 mb-2">分析履歴</h3>
                          <p className="text-sm text-gray-500">
                            差分検知を実行すると、結果がここに蓄積されます。
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h2 className="text-sm font-bold text-gray-900 mb-3">
                            過去の分析結果 ({savedDiffs.length}件)
                          </h2>
                          {savedDiffs.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                            >
                              <div
                                onClick={() => toggleHistory(item.id)}
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {item.is_new_entry ? (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-200">
                                          NEW
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-200">
                                          UP +{item.rank_change}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        {item.is_new_entry
                                          ? `${item.curr_rank}位にランクイン`
                                          : `${item.prev_rank}位 → ${item.curr_rank}位`}
                                      </span>
                                      <span className="text-[10px] text-gray-400 ml-auto">
                                        {new Date(item.detected_at).toLocaleDateString('ja-JP')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-cyan-600 truncate">{item.url}</p>
                                  </div>
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
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
                                <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
                                  {item.added_text && (
                                    <div>
                                      <h4 className="text-xs font-bold text-emerald-600 mb-1.5">+ 追加コンテンツ</h4>
                                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {item.added_text}
                                      </div>
                                    </div>
                                  )}
                                  {item.removed_text && (
                                    <div>
                                      <h4 className="text-xs font-bold text-red-500 mb-1.5">- 削除コンテンツ</h4>
                                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {item.removed_text}
                                      </div>
                                    </div>
                                  )}
                                  {item.added_images && item.added_images.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-emerald-600 mb-1.5">+ 追加画像 ({item.added_images.length}枚)</h4>
                                      <div className="grid grid-cols-3 gap-2">
                                        {item.added_images.slice(0, 6).map((img: string, i: number) => (
                                          <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                                            className="block bg-white border border-gray-200 rounded-lg overflow-hidden aspect-video hover:border-cyan-300 transition-colors">
                                            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {item.removed_images && item.removed_images.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-red-500 mb-1.5">- 削除画像 ({item.removed_images.length}枚)</h4>
                                      <div className="space-y-1">
                                        {item.removed_images.slice(0, 3).map((img: string, i: number) => (
                                          <p key={i} className="text-[10px] text-red-400 truncate">{img}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {item.ai_analysis && (
                                    <div>
                                      <h4 className="text-xs font-bold text-blue-600 mb-1.5">AI分析</h4>
                                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                        {item.ai_analysis}
                                      </div>
                                    </div>
                                  )}
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 transition-colors"
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
      <footer className="border-t border-gray-200 py-8 mt-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>&copy; 2026 サウスエージェンシー &mdash; SEO Reverse</p>
          <div className="flex items-center gap-4">
            <span>Serper.dev (Google SERP)</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Gemini AI</span>
          </div>
        </div>
      </footer>
    </>
  );
}

// 変更タイプを判定するヘルパー
function getChangeType(result: DiffResult): { label: string; color: string; icon: string } {
  if (result.isNewEntry) return { label: '新規', icon: '🆕', color: 'amber' };
  const hasText = !!(result.addedText || result.removedText);
  const hasImages = (result.addedImages?.length > 0 || result.removedImages?.length > 0);
  if (hasText && hasImages) return { label: 'テキスト+画像変更', icon: '📝', color: 'violet' };
  if (hasText) return { label: 'テキスト変更', icon: '📝', color: 'emerald' };
  if (hasImages) return { label: '画像変更', icon: '🖼️', color: 'blue' };
  return { label: '外部要因', icon: '🔗', color: 'slate' };
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
  const changeType = getChangeType(result);
  const hasAnyContent = !!(
    result.addedText || result.removedText || result.aiAnalysis ||
    (result.addedImages && result.addedImages.length > 0) ||
    (result.removedImages && result.removedImages.length > 0)
  );

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      isExpanded ? 'border-gray-300 shadow-md' : 'border-gray-200 shadow-sm'
    }`}>
      <div
        onClick={onToggle}
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* 順位変動 + 変更タイプ */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {result.isNewEntry ? (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-lg border border-amber-200">
                  NEW — {result.currRank}位
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200">
                  ↑ {result.prevRank}位 → {result.currRank}位
                  <span className="ml-1 opacity-60">(+{result.rankChange})</span>
                </span>
              )}
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${
                changeType.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                changeType.color === 'violet' ? 'bg-violet-50 text-violet-600 border border-violet-200' :
                changeType.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                changeType.color === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {changeType.icon} {changeType.label}
              </span>
            </div>
            {/* タイトル */}
            <p className="text-[13px] text-gray-900 font-medium leading-snug mb-1">
              {result.title || result.url}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{result.url}</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${
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
        <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/30">
          {/* テキスト差分がない場合の説明 */}
          {!hasAnyContent && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">🔗</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">本文・画像に変更なし</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    記事コンテンツの変更は検出されませんでした。順位変動の原因として以下が考えられます：
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                      被リンク（バックリンク）の増加
                    </li>
                    <li className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                      Googleアルゴリズムの変動
                    </li>
                    <li className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                      競合ページの順位低下による相対的な上昇
                    </li>
                    <li className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                      内部リンク構造の変化
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {result.addedText && (
            <div>
              <h4 className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7h14"/></svg>
                追加されたコンテンツ
              </h4>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {result.addedText}
              </div>
            </div>
          )}
          {result.removedText && (
            <div>
              <h4 className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                削除されたコンテンツ
              </h4>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {result.removedText}
              </div>
            </div>
          )}
          {result.addedImages && result.addedImages.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                追加された画像 ({result.addedImages.length}枚)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {result.addedImages.slice(0, 6).map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                    className="block bg-white border border-gray-200 rounded-lg overflow-hidden aspect-video hover:border-cyan-300 transition-colors">
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </a>
                ))}
              </div>
              {result.addedImages.length > 6 && (
                <p className="text-[10px] text-gray-400 mt-1">他 {result.addedImages.length - 6}枚</p>
              )}
            </div>
          )}
          {result.removedImages && result.removedImages.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>
                削除された画像 ({result.removedImages.length}枚)
              </h4>
              <div className="space-y-1">
                {result.removedImages.slice(0, 5).map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                    className="block text-[10px] text-red-400 hover:text-red-600 truncate transition-colors">
                    {img}
                  </a>
                ))}
                {result.removedImages.length > 5 && (
                  <p className="text-[10px] text-gray-400">他 {result.removedImages.length - 5}件</p>
                )}
              </div>
            </div>
          )}
          {result.aiAnalysis && (
            <div>
              <h4 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93"/><path d="M8 6a4 4 0 0 1 8 0"/><path d="M12 18v4"/><path d="M8 22h8"/><circle cx="12" cy="14" r="4"/></svg>
                AI分析レポート
              </h4>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.aiAnalysis}
              </div>
            </div>
          )}
          <div className="pt-1">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 transition-colors bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg border border-cyan-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              記事を開く
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
