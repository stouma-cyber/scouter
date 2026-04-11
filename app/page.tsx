'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import UrlInput from '@/components/UrlInput';
import LoadingAnimation from '@/components/LoadingAnimation';
import SiteMetaInfo from '@/components/SiteMetaInfo';
import ScoreRadar from '@/components/ScoreRadar';
import WeaknessReport from '@/components/WeaknessReport';
import ProposalDraft from '@/components/ProposalDraft';

interface AnalysisResult {
  url: string;
  scores: {
    name: string;
    Performance: number;
    Accessibility: number;
    BestPractices: number;
    SEO: number;
  }[];
  issues: string[];
  proposal: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // Step 1: Analyze the website
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!analyzeResponse.ok) {
        const contentType = analyzeResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await analyzeResponse.json();
          throw new Error(errorData.error || 'サイト分析に失敗しました');
        }
        throw new Error(analyzeResponse.status === 504 ? 'サーバーがタイムアウトしました。もう一度お試しください。' : 'サイト分析に失敗しました');
      }

      const analysisData = await analyzeResponse.json();

      // Step 2: Generate proposal
      setIsGeneratingProposal(true);

      const proposeResponse = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          scores: analysisData.scores,
          issues: analysisData.issues,
        }),
      });

      if (!proposeResponse.ok) {
        const contentType = proposeResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await proposeResponse.json();
          throw new Error(errorData.error || '提案書生成に失敗しました');
        }
        throw new Error(proposeResponse.status === 504 ? 'AI提案書の生成がタイムアウトしました。もう一度お試しください。' : '提案書生成に失敗しました');
      }

      const proposalData = await proposeResponse.json();

      setResult({
        url,
        scores: analysisData.scores,
        issues: analysisData.issues,
        proposal: proposalData.proposal,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      setIsGeneratingProposal(false);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          {!result && !isLoading && (
            <div className="py-24 sm:py-36 text-center space-y-12 fade-in">
              <div className="space-y-5">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  Powered by Google Lighthouse & AI
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight">
                  Webサイトを診断して
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                    提案書を自動生成
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                  URLを入力するだけで、パフォーマンス・SEO・アクセシビリティを
                  AI が分析し、営業提案書のドラフトを自動作成します。
                </p>
              </div>

              <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />

              {error && (
                <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  {error}
                </div>
              )}

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-8">
                <div className="bg-slate-800/30 border border-slate-700/20 rounded-xl p-5 text-left">
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-white text-sm mb-1">パフォーマンス分析</h3>
                  <p className="text-xs text-slate-500">Core Web Vitalsを含む速度・表示品質の診断</p>
                </div>
                <div className="bg-slate-800/30 border border-slate-700/20 rounded-xl p-5 text-left">
                  <div className="text-2xl mb-2">🔍</div>
                  <h3 className="font-semibold text-white text-sm mb-1">SEO/アクセシビリティ</h3>
                  <p className="text-xs text-slate-500">検索エンジン最適化とアクセシビリティのチェック</p>
                </div>
                <div className="bg-slate-800/30 border border-slate-700/20 rounded-xl p-5 text-left">
                  <div className="text-2xl mb-2">📝</div>
                  <h3 className="font-semibold text-white text-sm mb-1">AI提案書生成</h3>
                  <p className="text-xs text-slate-500">分析結果から営業提案書のドラフトを自動作成</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingAnimation />}

          {/* Results Section */}
          {result && !isLoading && (
            <div className="py-12 space-y-10 stagger-in">
              {/* Results header */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  分析完了
                </div>
                <h2 className="text-2xl font-bold text-white">
                  診断レポート
                </h2>
                <p className="text-slate-500 text-sm break-all max-w-lg mx-auto">
                  {result.url}
                </p>
              </div>

              {/* Compact URL input for re-analysis */}
              <div className="max-w-2xl mx-auto">
                <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />
              </div>

              {/* Site Meta Info */}
              <SiteMetaInfo url={result.url} />

              {/* Score Radar */}
              <ScoreRadar data={result.scores} />

              {/* Weakness Report */}
              <WeaknessReport issues={result.issues} />

              {/* Proposal Draft */}
              <ProposalDraft
                proposal={result.proposal}
                isLoading={isGeneratingProposal}
              />
            </div>
          )}

          {/* Error Message (when result exists) */}
          {error && result && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm max-w-lg mx-auto mt-8 flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>&copy; 2024 サウスエージェンシー &mdash; SCOUTER</p>
          <div className="flex items-center gap-4">
            <span>Powered by Google Lighthouse</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span>Gemini AI</span>
          </div>
        </div>
      </footer>
    </>
  );
}

