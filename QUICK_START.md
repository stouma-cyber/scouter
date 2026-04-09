# SCOUTER Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Install Dependencies
```bash
cd /sessions/great-ecstatic-heisenberg/scouter
npm install
```

### 2. Configure Gemini API Key
```bash
# Create .env.local file
echo "GEMINI_API_KEY=your_api_key_here" > .env.local
```

Get your API key from: https://aistudio.google.com

### 3. Start Development Server
```bash
npm run dev
```

Open browser: http://localhost:3000

## How It Works

### User Flow
1. User enters a website URL (e.g., example.com)
2. Clicks "スカウト開始" (Start Scanning)
3. App analyzes site using Google PageSpeed Insights API (FREE)
4. Shows radar chart with 4 scores
5. Displays weakness report in client-friendly Japanese
6. Generates proposal using Google Gemini API

### Key Features

#### 📊 Radar Chart (サイト戦闘力)
- Performance score
- Accessibility score
- Best Practices score
- SEO score
- All on 0-100 scale

#### ⚠️ Weakness Report (弱点レポート)
Translates technical metrics to business language:
- LCP slow → "ページの読み込みが遅く、ユーザーの53%が離脱する可能性があります"
- Missing mobile → "モバイル表示が最適化されておらず、ユーザーの60%を逃しています"

#### 📋 Proposal (提案書ドラフト)
AI-generated sales proposal including:
- 課題サマリー (Issue Summary)
- 改善提案 (Improvement Proposals)
- 推奨プラン (Recommended Plan)
- 想定スケジュール (Expected Timeline)
- 期待効果 (Expected Results)

Mentions "サウスエージェンシー" as the proposing company.

## API Routes

### POST /api/analyze
**Purpose:** Fetch Lighthouse scores from Google PageSpeed Insights

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Response:**
```json
{
  "url": "https://example.com",
  "scores": [{
    "name": "https://example.com",
    "Performance": 85,
    "Accessibility": 92,
    "BestPractices": 79,
    "SEO": 88
  }],
  "issues": ["[largest-contentful-paint] Score: 75", ...]
}
```

### POST /api/propose
**Purpose:** Generate sales proposal using Gemini API

```bash
curl -X POST http://localhost:3000/api/propose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "scores": [{"name":"...", "Performance":85, ...}],
    "issues": [...]
  }'
```

**Response:**
```json
{
  "url": "https://example.com",
  "proposal": "【課題サマリー】\n...\n【改善提案】\n..."
}
```

## Project Structure

```
scouter/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    ← PageSpeed Insights API
│   │   └── propose/route.ts    ← Gemini API
│   ├── page.tsx                ← Main app logic
│   ├── layout.tsx              ← Root layout
│   └── globals.css             ← Tailwind styles
├── components/
│   ├── Header.tsx              ← Navigation
│   ├── UrlInput.tsx            ← URL form
│   ├── LoadingAnimation.tsx    ← Radar animation
│   ├── ScoreRadar.tsx          ← Recharts chart
│   ├── WeaknessReport.tsx      ← Issue translation
│   └── ProposalDraft.tsx       ← Proposal display
└── Configuration files...
```

## Build & Deploy

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set GEMINI_API_KEY in Vercel dashboard
```

## Troubleshooting

### "GEMINI_API_KEY is not set"
- Check `.env.local` exists
- Verify API key is correct
- Restart dev server

### "PageSpeed Insights API error"
- Check internet connection
- Try a different URL
- Wait 30 seconds (API rate limit)

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

## Technology Stack

| Tech | Purpose |
|------|---------|
| Next.js 15 | Framework |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Recharts | Charts/graphs |
| Google PageSpeed Insights API | Website analysis (free) |
| Google Gemini API | AI proposal generation |

## Code Examples

### Adding a New Component
```tsx
// components/MyComponent.tsx
'use client';

export default function MyComponent() {
  return (
    <div className="section-container fade-in">
      <h2 className="heading-jp">📊 Title</h2>
      <p>Content here</p>
    </div>
  );
}
```

### Using the Radar Chart
```tsx
import ScoreRadar from '@/components/ScoreRadar';

const scores = [{
  name: 'https://example.com',
  Performance: 85,
  Accessibility: 92,
  BestPractices: 79,
  SEO: 88
}];

<ScoreRadar data={scores} />
```

### Calling an API Route
```tsx
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url })
});

const data = await response.json();
```

## Environment Variables

### Required
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional
None - PageSpeed Insights API is free and requires no key.

## Performance Tips

1. **Lighthouse Analysis** takes 10-30 seconds (normal)
2. **Proposal Generation** takes 5-15 seconds (depends on Gemini API)
3. Use mobile strategy for faster analysis
4. Cache results if analyzing same URL multiple times

## Security Notes

- API keys stored in `.env.local` (not committed to git)
- Never share your GEMINI_API_KEY
- PageSpeed Insights API is read-only
- No user data is stored
- HTTPS recommended for production

## Next Steps

1. Run `npm install`
2. Get Gemini API key
3. Create `.env.local`
4. Run `npm run dev`
5. Open http://localhost:3000
6. Try analyzing a website!

## Support

- Documentation: See `README.md`
- Structure Overview: See `PROJECT_STRUCTURE.txt`
- Checklist: See `IMPLEMENTATION_CHECKLIST.md`

---
Ready to boost your sales team's productivity! 🚀
