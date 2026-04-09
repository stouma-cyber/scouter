'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ScoreRadarProps {
  data: {
    name: string;
    Performance: number;
    Accessibility: number;
    BestPractices: number;
    SEO: number;
  }[];
}

export default function ScoreRadar({ data }: ScoreRadarProps) {
  const jpNames: { [key: string]: string } = {
    Performance: 'パフォーマンス',
    Accessibility: 'アクセシビリティ',
    BestPractices: 'ベストプラクティス',
    SEO: 'SEO',
  };

  return (
    <div className="section-container fade-in">
      <h2 className="heading-jp">📊 サイト戦闘力</h2>
      <p className="text-sm text-slate-400 mb-6">Lighthouseスコア（0-100）</p>

      <div className="w-full h-96 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid stroke="rgba(6, 182, 212, 0.2)" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Radar
              name={jpNames['Performance']}
              dataKey="Performance"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.3}
              isAnimationActive={true}
            />
            <Radar
              name={jpNames['Accessibility']}
              dataKey="Accessibility"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.2}
              isAnimationActive={true}
            />
            <Radar
              name={jpNames['BestPractices']}
              dataKey="BestPractices"
              stroke="#14b8a6"
              fill="#14b8a6"
              fillOpacity={0.2}
              isAnimationActive={true}
            />
            <Radar
              name={jpNames['SEO']}
              dataKey="SEO"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              isAnimationActive={true}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                color: '#cbd5e1',
              }}
              formatter={(value) => jpNames[value] || value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                borderRadius: '8px',
                color: '#cbd5e1',
              }}
              formatter={(value) => (typeof value === 'number' ? value.toFixed(0) : value)}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-accent/10">
        {data[0] && (
          <>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent mb-1">
                {Math.round(data[0].Performance)}
              </div>
              <div className="text-xs text-slate-400">パフォーマンス</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accentLight mb-1">
                {Math.round(data[0].Accessibility)}
              </div>
              <div className="text-xs text-slate-400">アクセシビリティ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400 mb-1">
                {Math.round(data[0].BestPractices)}
              </div>
              <div className="text-xs text-slate-400">ベストプラクティス</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {Math.round(data[0].SEO)}
              </div>
              <div className="text-xs text-slate-400">SEO</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
