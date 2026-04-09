'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-accent/20 bg-primary/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black bg-gradient-to-r from-accent to-accentLight bg-clip-text text-transparent">
            SCOUTER
          </div>
          <div className="text-xs text-slate-400 font-mono">
            サウスエージェンシー
          </div>
        </div>
        <div className="hidden sm:block text-sm text-slate-400">
          サイト診断 → 提案書自動生成
        </div>
      </div>
    </header>
  );
}
