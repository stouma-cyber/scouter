import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEO Reverse - 競合差分分析ツール',
  description: '競合サイトの変更点を自動検知し、SEO戦略に活用する',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <div className="relative min-h-screen">
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
