'use client';

import { useEffect, useState } from 'react';

interface SiteInfoData {
  cms: string | null;
  cmsConfidence: 'high' | 'medium' | 'low' | null;
  cmsDetails: string[];
  indexedPages: number | null;
  indexedPagesSource: string | null;
  sitemapUrl: string | null;
  firstSeen: string | null;
  firstSeenSource: string | null;
  domainAge: string | null;
  serverInfo: string | null;
  technologies: string[];
  metaGenerator: string | null;
  httpsEnabled: boolean;
  language: string | null;
}

interface SiteMetaInfoProps {
  url: string;
  onDataLoaded?: (data: SiteInfoData) => void;
}

export default function SiteMetaInfo({ url, onDataLoaded }: SiteMetaInfoProps) {
  const [data, setData] = useState<SiteInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSiteInfo() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch('/api/siteinfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error('fetch failed');

        const result: SiteInfoData = await response.json();
        if (!cancelled) {
          setData(result);
          onDataLoaded?.(result);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSiteInfo();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="section-container">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full"></div>
          <div>
            <h2 className="text-lg font-bold text-white">サイト基本情報</h2>
            <p className="text-xs text-slate-500">メタ情報を取得中...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded w-20 mb-3"></div>
              <div className="h-6 bg-slate-700/50 rounded w-32 mb-2"></div>
              <div className="h-3 bg-slate-700/30 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently fail - this is supplementary info
  }

  const confidenceLabel = {
    high: { text: '確度: 高', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    medium: { text: '確度: 中', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    low: { text: '確度: 低', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  };

  const formatPageCount = (count: number): string => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}千`;
    return count.toLocaleString();
  };

  return (
    <div className="section-container">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full"></div>
        <div>
          <h2 className="text-lg font-bold text-white">サイト基本情報</h2>
          <p className="text-xs text-slate-500">自動検出されたメタデータ</p>
        </div>
      </div>

      {/* Main info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* CMS */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 hover:border-slate-600/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8"/>
              <path d="M12 17v4"/>
            </svg>
            <span className="text-xs text-slate-500 font-medium">CMS / フレームワーク</span>
          </div>
          {data.cms ? (
            <>
              <p className="text-xl font-bold text-white mb-1">{data.cms}</p>
              {data.cmsConfidence && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${confidenceLabel[data.cmsConfidence].color}`}>
                  {confidenceLabel[data.cmsConfidence].text}
                </span>
              )}
              {data.metaGenerator && (
                <p className="text-[11px] text-slate-500 mt-1 truncate" title={data.metaGenerator}>
                  {data.metaGenerator}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-400 mb-1">検出なし</p>
              <p className="text-[11px] text-slate-600">独自開発またはSSGの可能性</p>
            </>
          )}
        </div>

        {/* Indexed Pages */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 hover:border-slate-600/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span className="text-xs text-slate-500 font-medium">ページ数</span>
          </div>
          {data.indexedPages ? (
            <>
              <p className="text-xl font-bold text-white mb-1">
                約 {formatPageCount(data.indexedPages)}<span className="text-sm text-slate-400 ml-1">ページ</span>
              </p>
              <p className="text-[11px] text-slate-500">{data.indexedPagesSource}</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-400 mb-1">取得不可</p>
              <p className="text-[11px] text-slate-600">サイトマップが未設定</p>
            </>
          )}
        </div>

        {/* Site Age */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 hover:border-slate-600/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-xs text-slate-500 font-medium">運営歴</span>
          </div>
          {data.domainAge ? (
            <>
              <p className="text-xl font-bold text-white mb-1">約 {data.domainAge}</p>
              <p className="text-[11px] text-slate-500">初回確認: {data.firstSeen}</p>
            </>
          ) : data.firstSeen ? (
            <>
              <p className="text-base font-semibold text-white mb-1">{data.firstSeen}〜</p>
              <p className="text-[11px] text-slate-500">Wayback Machine</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-400 mb-1">取得不可</p>
              <p className="text-[11px] text-slate-600">アーカイブ記録なし</p>
            </>
          )}
        </div>

        {/* Server / HTTPS */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 hover:border-slate-600/40 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
              <rect x="2" y="2" width="20" height="8" rx="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2"/>
              <circle cx="6" cy="6" r="1"/>
              <circle cx="6" cy="18" r="1"/>
            </svg>
            <span className="text-xs text-slate-500 font-medium">サーバー情報</span>
          </div>
          <p className="text-base font-semibold text-white mb-1">
            {data.serverInfo || '非公開'}
          </p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${data.httpsEnabled ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
              {data.httpsEnabled ? '🔒 HTTPS' : '⚠️ HTTP'}
            </span>
            {data.language && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-700/30 border border-slate-600/20">
                {data.language}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Technology tags */}
      {data.technologies.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span className="text-xs text-slate-500 font-medium">検出された技術スタック</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.technologies.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/15"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
