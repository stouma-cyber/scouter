'use client';

import { useState } from 'react';

interface ProposalDraftProps {
  proposal: string;
  isLoading: boolean;
}

export default function ProposalDraft({ proposal, isLoading }: ProposalDraftProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="section-container fade-in">
        <h2 className="heading-jp">📋 提案書ドラフト</h2>
        <div className="bg-secondary/50 border border-accent/20 rounded-lg p-8 text-center">
          <div className="inline-block">
            <div className="flex gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-accent rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                  }}
                ></div>
              ))}
            </div>
            <p className="text-slate-400">提案書を生成中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  return (
    <div className="section-container fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-jp m-0">📋 提案書ドラフト</h2>
        <button
          onClick={handleCopy}
          className="text-sm bg-accent/20 hover:bg-accent/30 text-accent hover:text-accentLight px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          {copied ? (
            <>
              <span>✓</span>
              コピー完了
            </>
          ) : (
            <>
              <span>📋</span>
              コピー
            </>
          )}
        </button>
      </div>

      <div className="bg-secondary/30 border border-accent/20 rounded-lg p-6 max-h-96 overflow-y-auto">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
          {proposal.split('\n\n').map((section, idx) => (
            <div key={idx} className="mb-4 last:mb-0">
              {section.split('\n').map((line, lineIdx) => {
                // Detect headers (lines with Japanese punctuation or bold markers)
                if (line.match(/^#{1,3}\s/) || line.match(/^\*\*/) || line.match(/^【|】$/)) {
                  const cleanLine = line
                    .replace(/^#{1,3}\s/, '')
                    .replace(/\*\*/g, '')
                    .replace(/^【|】$/g, '');
                  return (
                    <h3
                      key={lineIdx}
                      className="font-bold text-accentLight mb-2 mt-2"
                    >
                      {cleanLine}
                    </h3>
                  );
                }

                // Regular text
                if (line.trim()) {
                  return (
                    <p key={lineIdx} className="mb-2 text-slate-300 leading-relaxed">
                      {line}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-accent/10 flex gap-4 flex-col sm:flex-row">
        <div className="flex-1 text-sm text-slate-400">
          <p>
            <span className="font-semibold text-accent">ご注意:</span>{' '}
            本ドラフトはAIにより自動生成されています。最終提案書として使用する前に、
            内容の確認・編集をお願いします。
          </p>
        </div>
      </div>
    </div>
  );
}
