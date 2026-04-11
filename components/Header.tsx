'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-primary/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white">
              SCOUTER
            </div>
            <div className="text-[10px] text-slate-500 font-medium -mt-0.5 tracking-wider">
              SOUTH AGENCY
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="px-2 py-1 bg-slate-800/50 border border-slate-700/30 rounded-md">診断</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          <span className="px-2 py-1 bg-slate-800/50 border border-slate-700/30 rounded-md">分析</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-cyan-400">提案書</span>
        </div>
      </div>
    </header>
  );
}
