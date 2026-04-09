'use client';

import { useState } from 'react';

interface UrlInputProps {
  onAnalyze: (url: string) => Promise<void>;
  isLoading: boolean;
}

export default function UrlInput({ onAnalyze, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      await onAnalyze(urlObj.toString());
    } catch {
      setError('有効なURLを入力してください（例: example.com または https://example.com）');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            placeholder="分析するURLを入力（例: example.com）"
            className="glow-input w-full text-lg"
            aria-label="URL input"
          />
          {error && (
            <div className="absolute top-full mt-2 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full text-lg font-bold flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span>
              スキャン中...
            </>
          ) : (
            <>
              <span className="text-xl">🔍</span>
              スカウト開始
            </>
          )}
        </button>
      </form>
    </div>
  );
}
