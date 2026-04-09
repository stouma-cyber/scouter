'use client';

export default function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      {/* Radar scanning animation */}
      <div className="relative w-32 h-32">
        {/* Outer circle */}
        <div className="absolute inset-0 border-2 border-accent/50 rounded-full animate-pulse"></div>

        {/* Mid circle */}
        <div className="absolute inset-4 border-2 border-accent/30 rounded-full"></div>

        {/* Inner circle */}
        <div className="absolute inset-8 border-2 border-accent/50 rounded-full"></div>

        {/* Scanning lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 128 128"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Horizontal line scanning */}
          <line
            x1="64"
            y1="10"
            x2="64"
            y2="118"
            stroke="url(#gradient1)"
            strokeWidth="2"
            opacity="0.8"
            className="animate-pulse"
          />

          {/* Vertical line scanning */}
          <line
            x1="10"
            y1="64"
            x2="118"
            y2="64"
            stroke="url(#gradient2)"
            strokeWidth="2"
            opacity="0.6"
            className="animate-pulse"
          />

          {/* Diagonal lines */}
          <line
            x1="20"
            y1="20"
            x2="108"
            y2="108"
            stroke="url(#gradient3)"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <line
            x1="108"
            y1="20"
            x2="20"
            y2="108"
            stroke="url(#gradient3)"
            strokeWidth="1.5"
            opacity="0.4"
          />

          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
              <stop offset="50%" stopColor="rgba(6, 182, 212, 1)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
              <stop offset="50%" stopColor="rgba(34, 211, 238, 1)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="50%" stopColor="rgba(34, 211, 238, 0.6)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.3)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center dot */}
        <div className="absolute inset-1/2 w-2 h-2 -ml-1 -mt-1 bg-accent rounded-full animate-glow"></div>
      </div>

      {/* Loading text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-accentLight">スキャン中...</p>
        <p className="text-sm text-slate-400">サイト分析を実行しています</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-accent rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.2}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
