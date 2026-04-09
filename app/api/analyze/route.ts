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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '無効なURLです' },
        { status: 400 }
      );
    }

    // Call Google PageSpeed Insights API (free, no key required)
    const psiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    psiUrl.searchParams.append('url', url);
    psiUrl.searchParams.append('strategy', 'mobile');
    psiUrl.searchParams.append('category', 'performance');
    psiUrl.searchParams.append('category', 'accessibility');
    psiUrl.searchParams.append('category', 'best-practices');
    psiUrl.searchParams.append('category', 'seo');

    const psiResponse = await fetch(psiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!psiResponse.ok) {
      throw new Error(`PageSpeed Insights API error: ${psiResponse.status}`);
    }

    const psiData: PageSpeedInsightsResponse = await psiResponse.json();

    if (!psiData.lighthouseResult) {
      return NextResponse.json(
        { error: 'Lighthouse結果を取得できませんでした' },
        { status: 500 }
      );
    }

    const lighthouse = psiData.lighthouseResult;

    // Extract scores (0-100 scale)
    const performanceScore = (lighthouse.categories.performance?.score ?? 0) * 100;
    const accessibilityScore = (lighthouse.categories.accessibility?.score ?? 0) * 100;
    const bestPracticesScore = (lighthouse.categories['best-practices']?.score ?? 0) * 100;
    const seoScore = (lighthouse.categories.seo?.score ?? 0) * 100;

    // Extract failed audits (issues)
    const issues: string[] = [];
    const audits = lighthouse.audits;

    // Collect failed audits
    Object.entries(audits).forEach(([auditId, audit]) => {
      if (audit.scoreDisplayMode !== 'notApplicable' && audit.score !== undefined && audit.score < 0.9) {
        issues.push(`[${auditId}] Score: ${Math.round(audit.score * 100)}`);
      }
    });

    // Limit to top 8 issues
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
