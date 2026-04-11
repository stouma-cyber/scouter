'use client';

import { useState, useEffect } from 'react';

const steps = [
  { label: 'サイトに接続中...', icon: '🌐' },
  { label: 'Lighthouse分析を実行中...', icon: '🔬' },
  { label: 'パフォーマンスを測定中...', icon: '⚡' },
  { label: 'SEOスコアを計算中...', icon: '📊' },
  { label: 'CMS・技術スタックを検出中...', icon: '🔍' },
  { label: '提案書を生成中...', icon: '📝' ,
];

export default function LoadingAnimation() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-10 py-24">
      {/* Radar animation */}
      <div className="relative w-40 h-40">
        {/* Background circles */}
        <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full"></div>
        <div className="absolute inset-4 border-2 border-cyan-500/15 rounded-full"></div>
        <div className="absolute inset-8 border-2 border-cyan-500/20 rounded-full"></div>
        <div className="absolute inset-12 border-2 border-cyan-500/25 rounded-full"></div>

        {/* Sweep arm */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          <div className="w-1/2 h-0.5 absolute top-1/2 left-1/2 origin-left bg-gradient-to-r from-cyan-400 to-transparent rounded-full"></div>
          {/* Sweep trail */}
          <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left -rotate-12 opacity-30" style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(6,182,212,0.3), transparent)',
            borderRadius: '0 100% 0 0',
          }}></div>
        </div>

        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse"></div>
        </div>

        {/* Blips */}
        <div className="absolute top-[20%] right-[25%] w-2 h-2 rounded-full bg-cyan-300 animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2s' }}></div>
        <div className="absolute bottom-[30%] left-[20%] w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '1.2s', animationDuration: '2.5s' }}></div>
      </div>

      {/* Step progress */}
      <div className="w-full max-w-sm space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 transition-all duration-500"
            style={{ opacity: i <= currentStep ? 1 : 0.25, transform: i === currentStep ? 'translateX(4px)' : 'none' }}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all duration-300 ${
              i < currentStep
                ? 'bg-cyan-500/20 text-cyan-400'
                : i === currentStep
                ? 'bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-500/30'
                : 'bg-slate-800/50 text-slate-600'
            }`}>
              {i < currentStep ? '✓' : step.icon}
            </div>
            <span className={`text-sm transition-colors duration-300 ${
              i === currentStep ? 'text-white font-medium' : i < currentStep ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {step.label}
            </span>
            {i === currentStep && (
              <div className="ml-auto flex gap-1">
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
