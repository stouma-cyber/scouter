'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import UrlInput from '@/components/UrlInput';
import LoadingAnimation from '@/components/LoadingAnimation';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          {!result && (
            <div className="py-20 sm:py-32 text-center space-y-12">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-accent via-accentLight to-blue-400 bg-clip-text text-transparent mb-4">
                  サイト診断→提案書自動生成
                </h1>
                <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
                  Webサイトを分析し、AIが自動で営業提案書を生成します。
                  <br />
                  サウスエージェンシーの提案営業を加速化。
                </p>
              </div>

              <div className="bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/20 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto">
                <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />
              </div>

              {error && (
                <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingAnimation />}

          {/* Results Section */}
          {result && !isLoading && (
            <div className="py-12 space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-accentLight mb-2">
                  分析完了
                </h2>
                <p className="text-slate-400 break-all text-sm sm:text-base">
                  {result.url}
                </p>
              </div>

              {/* Score Radar */}
              <ScoreRadar data={result.scores} />

              {/* Weakness Report */}
              <WeaknessReport issues={result.issues} />

              {/* Proposal Draft */}
              <ProposalDraft
                proposal={result.proposal}
                isLoading={isGeneratingProposal}
              />

              {/* New Analysis Button */}
              <div className="text-center pt-8">
                <button
                  onClick={() => {
                    setResult(null);
                    setError('');
                  }}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <span>🔄</span>
                  別のサイトを分析
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && result && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm max-w-2xl mx-auto">
              エラー: {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-accent/10 bg-secondary/20 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>© 2024 サウスエージェンシー - SCOUTER</p>
          <p className="mt-2">Powered by Google PageSpeed Insights & Gemini API</p>
        </div>
      </footer>
    </>
  );
}
