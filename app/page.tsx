'use client';

import { useState, useEffect, useCallback } from 'react';

interface Keyword {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
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

export default function Home() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{ totalResults: number; crawled: number; failed: number } | null>(null);
  const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
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
                        onClick={() => {
                          setSelectedKeyword(kw);
                          setDiffResults([]);
                          setCrawlResult(null);
                        }}
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
              ) : diffResults.length === 0 && !isAnalyzing ? (
                <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-16 text-center">
                  <div className="text-4xl mb-4 opacity-30">📊</div>
                  <h3 className="text-lg font-bold text-white mb-2">「{selectedKeyword.keyword}」</h3>
                  <p className="text-sm text-slate-500">
                    まずSERP取得を実行し、2回目以降のクロール後に<br />
                    差分検知を実行すると結果が表示されます。
                  </p>
                </div>
              ) : isAnalyzing ? (
                <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-16 text-center">
                  <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-bold text-white mb-2">AI分析中...</h3>
                  <p className="text-sm text-slate-500">
                    競合記事の差分を検知し、AIが変更意図を分析しています。<br />
                    少々お待ちください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-white">
                    差分検知結果 ({diffResults.length}件)
                  </h2>
                  {diffResults.map((result, index) => (
                    <div
                      key={index}
                      className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden"
                    >
                      {/* Card header */}
                      <div
                        onClick={() => toggleCard(index)}
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
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {result.url}
                            </p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${
                              expandedCards.has(index) ? 'rotate-180' : ''
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

                      {/* Expanded content */}
                      {expandedCards.has(index) && (
                        <div className="border-t border-slate-700/30 p-5 space-y-4">
                          {/* Added content */}
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

                          {/* Removed content */}
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

                          {/* AI Analysis */}
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

                          {/* Link */}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            記事を開く
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
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
            <span>Google Custom Search API</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span>Gemini AI</span>
          </div>
        </div>
      </footer>
    </>
  );
}
