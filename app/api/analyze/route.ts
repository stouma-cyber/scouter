import { NextRequest, NextResponse } from 'next/server';

interface PageSpeedInsightsResponse {
  lighthouseResult?: {
    categories: {
      performance?: { score: number };
      accessibility?: { score: number };
      'best-practices'?: { score: number };
      seo?: { score: number };
    };
    audits: {
      [key: string]: {
        score?: number;
        scoreDisplayMode?: string;
      };
    };
  };
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (response.status === 429) {
      const waitTime = Math.pow(2, attempt + 1) * 5000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('RATE_LIMITED');
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '無効なURLです' },
        { status: 400 }
      );
    }

    const psiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    psiUrl.searchParams.append('url', url);
    psiUrl.searchParams.append('strategy', 'mobile');
    psiUrl.searchParams.append('category', 'performance');
    psiUrl.searchParams.append('category', 'accessibility');
    psiUrl.searchParams.append('category', 'best-practices');
    psiUrl.searchParams.append('category', 'seo');

    const apiKey = process.env.PSI_API_KEY;
    if (apiKey) {
      psiUrl.searchParams.append('key', apiKey);
    }

    let psiResponse: Response;
    try {
      psiResponse = await fetchWithRetry(psiUrl.toString());
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: 'Google APIのレート制限に達しました。30秒ほど待ってから再度お試しください。' },
          { status: 429 }
        );
      }
      throw error;
    }

    if (!psiResponse.ok) {
      throw new Error('PageSpeed Insights API error: ' + psiResponse.status);
    }

    const psiData: PageSpeedInsightsResponse = await psiResponse.json();

    if (!psiData.lighthouseResult) {
      return NextResponse.json(
        { error: 'Lighthouse結果を取得できませんでした' },
        { status: 500 }
      );
    }

    const lighthouse = psiData.lighthouseResult;

    const performanceScore = (lighthouse.categories.performance?.score ?? 0) * 100;
    const accessibilityScore = (lighthouse.categories.accessibility?.score ?? 0) * 100;
    const bestPracticesScore = (lighthouse.categories['best-practices']?.score ?? 0) * 100;
    const seoScore = (lighthouse.categories.seo?.score ?? 0) * 100;

    const issues: string[] = [];
    const audits = lighthouse.audits;

    Object.entries(audits).forEach(([auditId, audit]) => {
      if (audit.scoreDisplayMode !== 'notApplicable' && audit.score !== undefined && audit.score < 0.9) {
        issues.push('[' + auditId + '] Score: ' + Math.round(audit.score * 100));
      }
    });

    const topIssues = issues.slice(0, 8);

    const scores = [
      {
        name: url,
        Performance: Math.round(performanceScore),
        Accessibility: Math.round(accessibilityScore),
        BestPractices: Math.round(bestPracticesScore),
        SEO: Math.round(seoScore),
      },
    ];

    return NextResponse.json({
      url,
      scores,
      issues: topIssues,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : '分析エラーが発生しました';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
