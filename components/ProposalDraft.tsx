'use client';

import { useState } from 'react';

interface ProposalDraftProps {
  proposal: string;
  isLoading: boolean;
}

// Simple markdown table parser
function parseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;

  const isTableLine = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');
  const isSeparator = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());

  if (!isTableLine(lines[0]) || !isSeparator(lines[1])) return null;

  const parseCells = (line: string) =>
    line.trim().slice(1, -1).split('|').map(cell => cell.trim());

  const headers = parseCells(lines[0]);
  const rows: string[][] = [];

  for (let i = 2; i < lines.length; i++) {
    if (!isTableLine(lines[i])) break;
    rows.push(parseCells(lines[i]));
  }

  return { headers, rows };
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-accent/30">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-accentLight font-semibold">
                {renderInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-accent/10 hover:bg-accent/5">
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 px-3 text-slate-300">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Try to parse table
    const remainingLines = lines.slice(i);
    const table = parseTable(remainingLines);
    if (table) {
      elements.push(
        <MarkdownTable key={`table-${i}`} headers={table.headers} rows={table.rows} />
      );
      // Skip table lines
      i += 1 + 1 + table.rows.length; // header + separator + data rows
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="border-accent/20 my-4" />);
      i++;
      continue;
    }

    // H1
    if (line.match(/^#\s/)) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-xl font-bold text-accentLight mt-6 mb-3">
          {renderInlineMarkdown(line.replace(/^#\s/, ''))}
        </h2>
      );
      i++;
      continue;
    }

    // H2
    if (line.match(/^##\s/)) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-lg font-bold text-accentLight mt-5 mb-2">
          {renderInlineMarkdown(line.replace(/^##\s/, ''))}
        </h3>
      );
      i++;
      continue;
    }

    // H3
    if (line.match(/^###\s/)) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-base font-bold text-accentLight mt-4 mb-2">
          {renderInlineMarkdown(line.replace(/^###\s/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    // 【】headers (Japanese style)
    if (line.match(/^【.+】$/)) {
      elements.push(
        <h3 key={`jp-h-${i}`} className="text-lg font-bold text-accentLight mt-5 mb-2">
          {line}
        </h3>
      );
      i++;
      continue;
    }

    // List items (- or *)
    if (line.match(/^\s*[-*]\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        listItems.push(lines[i].replace(/^\s*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 ml-2">
          {listItems.map((item, li) => (
            <li key={li} className="text-slate-300 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 ml-2">
          {listItems.map((item, li) => (
            <li key={li} className="text-slate-300 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="mb-2 text-slate-300 leading-relaxed">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return elements;
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

      <div className="bg-secondary/30 border border-accent/20 rounded-lg p-6 max-h-[600px] overflow-y-auto">
        <div className="prose prose-invert max-w-none text-sm">
          {renderMarkdown(proposal)}
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
