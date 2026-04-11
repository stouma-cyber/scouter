'use client';

import { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface ScoreRadarProps {
  data: {
    name: string;
    Performance: number;
    Accessibility: number;
    BestPractices: number;
    SEO: number;
  }[];
}

// Animated circular gauge component
function CircularGauge({ score, label, color, delay }: { score: number; label: string; color: string; delay: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const scoreColor = animatedScore >= 90 ? '#22c55e' : animatedScore >= 70 ? '#f59e0b' : animatedScore >= 50 ? '#f97316' : '#ef4444';
  const scoreLabel = animatedScore >= 90 ? '優秀' : animatedScore >= 70 ? '良好' : animatedScore >= 50 ? '要改善' : '危険';

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const step = score / 40;
      const interval = setInterval(() => {
        current += step;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(interval);
        } else {
          setAnimatedScore(Math.round(current));
        }
      }, 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return (
    <div className="flex flex-col items-center gap-3 score-gauge-card">
      <div className="relative w-[136px] h-[136px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Background track */}
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="10" />
          {/* Score arc */}
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
          />
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${label})`}
            opacity="0.4"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {/* Center score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color: scoreColor }}>{animatedScore}</span>
          <span className="text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-full" style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}>{scoreLabel}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  );
}

// Overall score badge
function OverallScore({ scores }: { scores: { Performance: number; Accessibility: number; BestPractices: number; SEO: number } }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const avg = Math.round((scores.Performance + scores.Accessibility + scores.BestPractices + scores.SEO) / 4);

  useEffect(() => {
    let current = 0;
    const step = avg / 50;
    const interval = setInterval(() => {
      current += step;
      if (current >= avg) {
        setAnimatedScore(avg);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, 20);
    return () => clearInterval(interval);
  }, [avg]);

  const gradeColor = avg >= 90 ? '#22c55e' : avg >= 70 ? '#f59e0b' : avg >= 50 ? '#f97316' : '#ef4444';
  const grade = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 50 ? 'D' : 'F';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[180px] h-[180px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="14" />
          <circle
            cx="90" cy="90" r="78" fill="none"
            stroke={gradeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 78}
            strokeDashoffset={2 * Math.PI * 78 - (animatedScore / 100) * 2 * Math.PI * 78}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
          <defs>
            <filter id="glow-overall">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="90" cy="90" r="78" fill="none"
            stroke={gradeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 78}
            strokeDashoffset={2 * Math.PI * 78 - (animatedScore / 100) * 2 * Math.PI * 78}
            filter="url(#glow-overall)"
            opacity="0.3"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black" style={{ color: gradeColor }}>{animatedScore}</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-lg font-bold px-2.5 py-0.5 rounded-md" style={{ color: gradeColor, backgroundColor: `${gradeColor}20` }}>
              {grade}
            </span>
          </div>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-400">総合スコア</span>
    </div>
  );
}

export default function ScoreRadar({ data }: ScoreRadarProps) {
  // Reshape data for radar chart: array of { metric, score }
  const radarData = data[0] ? [
    { metric: 'パフォーマンス', score: data[0].Performance, fullMark: 100 },
    { metric: 'アクセシビリティ', score: data[0].Accessibility, fullMark: 100 },
    { metric: 'ベストプラクティス', score: data[0].BestPractices, fullMark: 100 },
    { metric: 'SEO', score: data[0].SEO, fullMark: 100 },
  ] : [];

  return (
    <div className="fade-in space-y-8">
      {/* Overall score + circular gauges row */}
      <div className="section-container">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500"></div>
          <div>
            <h2 className="text-xl font-bold text-white">サイト戦闘力</h2>
            <p className="text-xs text-slate-400 mt-0.5">Google Lighthouse モバイル分析</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* Left: Overall score */}
          {data[0] && <OverallScore scores={data[0]} />}

          {/* Right: 4 gauges */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
            {data[0] && (
              <>
                <CircularGauge score={data[0].Performance} label="パフォーマンス" color="#06b6d4" delay={200} />
                <CircularGauge score={data[0].Accessibility} label="アクセシビリティ" color="#22d3ee" delay={400} />
                <CircularGauge score={data[0].BestPractices} label="ベストプラクティス" color="#14b8a6" delay={600} />
                <CircularGauge score={data[0].SEO} label="SEO" color="#10b981" delay={800} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Radar chart section */}
      <div className="section-container">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500"></div>
          <h3 className="text-lg font-bold text-white">レーダーチャート</h3>
        </div>

        <div className="w-full h-80 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <PolarGrid stroke="rgba(148,163,184,0.15)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="スコア"
                dataKey="score"
                stroke="#06b6d4"
                fill="url(#radarGradient)"
                fillOpacity={0.5}
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1200}
              />
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  padding: '8px 14px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [`${value} / 100`, 'スコア']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
