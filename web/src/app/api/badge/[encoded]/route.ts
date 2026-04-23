import { scan } from 'x402-qai';
import { scoreToGrade, gradeColor, safeDecodeUrl, type Grade, type ScanResult } from '@/lib/grade';

export const revalidate = 300;

interface RouteParams {
  params: Promise<{ encoded: string }>;
}

interface BadgeData {
  label: string;
  message: string;
  color: string;
}

async function runScan(url: string): Promise<ScanResult | null> {
  try {
    const result = await scan(url, { pay: false, timeout: 15000, format: 'json' });
    return result as ScanResult;
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function approxTextWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (/[A-Z]/.test(ch)) width += 8.5;
    else if (/[mwMW]/.test(ch)) width += 9.5;
    else if (/[il1.,;:|!]/.test(ch)) width += 4;
    else if (/\d/.test(ch)) width += 7;
    else width += 7;
  }
  return Math.round(width);
}

function renderBadge({ label, message, color }: BadgeData): string {
  const padX = 8;
  const labelWidth = approxTextWidth(label) + padX * 2;
  const messageWidth = approxTextWidth(message) + padX * 2;
  const totalWidth = labelWidth + messageWidth;
  const height = 20;
  const labelMid = labelWidth / 2;
  const messageMid = labelWidth + messageWidth / 2;

  const safeLabel = escapeXml(label);
  const safeMessage = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${safeLabel}: ${safeMessage}">
  <title>${safeLabel}: ${safeMessage}</title>
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#1f2937"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#g)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelMid}" y="15" fill="#010101" fill-opacity=".3">${safeLabel}</text>
    <text x="${labelMid}" y="14">${safeLabel}</text>
    <text x="${messageMid}" y="15" fill="#010101" fill-opacity=".3">${safeMessage}</text>
    <text x="${messageMid}" y="14">${safeMessage}</text>
  </g>
</svg>`;
}

function svgResponse(svg: string, cacheSeconds = 3600): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  });
}

function fallbackBadge(message: string, color: string): string {
  return renderBadge({ label: 'x402 compliance', message, color });
}

export async function GET(_request: Request, ctx: RouteParams) {
  const { encoded } = await ctx.params;
  const url = safeDecodeUrl(encoded);

  if (!url) {
    return svgResponse(fallbackBadge('invalid url', '#9ca3af'), 60);
  }

  const result = await runScan(url);
  if (!result) {
    return svgResponse(fallbackBadge('unreachable', '#9ca3af'), 60);
  }

  const grade: Grade = scoreToGrade(result.score.total);
  const color = gradeColor(grade);
  const message = `${grade} (${result.score.total})`;

  return svgResponse(renderBadge({ label: 'x402 compliance', message, color }));
}
