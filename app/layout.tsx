import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCOUTER - Website Analysis Tool',
  description: 'Analyze websites and generate sales proposals automatically',
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
      <body className="bg-gradient-to-br from-primary via-slate-900 to-primary">
        <div className="relative min-h-screen">
          {/* Background effect */}
          <div className="fixed inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent rounded-full filter blur-3xl mix-blend-screen"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl mix-blend-screen"></div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
