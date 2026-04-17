import { getReport, scoreToGrade } from '@/lib/report-store';

const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e',
  B: '#86efac',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};

function badgeSvg(score: number, grade: string): string {
  const color = GRADE_COLOR[grade] ?? '#9ca3af';
  const label = 'x402';
  const value = `${grade} · ${score}`;
  const labelWidth = 42;
  const valueWidth = 58;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect width="${totalWidth}" height="${height}" rx="3" fill="#0a0a0a"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="${height}" rx="3" fill="${color}"/>
  <rect width="${totalWidth}" height="${height}" rx="3" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#0a0a0a" font-weight="bold">${value}</text>
  </g>
</svg>`;
}

export async function GET(_req: Request, ctx: RouteContext<'/api/badge/[hash]'>) {
  const raw = await ctx.params;
  const hash = raw.hash.replace(/\.svg$/, '');
  const record = getReport(hash);

  const body = record
    ? ((): string => {
        const score = typeof (record.payload as { score?: { total?: number } }).score?.total === 'number'
          ? (record.payload as { score: { total: number } }).score.total
          : 0;
        return badgeSvg(score, scoreToGrade(score));
      })()
    : badgeSvg(0, 'F');

  return new Response(body, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=60',
    },
  });
}
