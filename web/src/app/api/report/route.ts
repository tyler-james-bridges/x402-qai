import { NextRequest, NextResponse } from 'next/server';
import { storeReport } from '@/lib/report-store';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  if (!payload.url || !payload.score) {
    return NextResponse.json(
      { error: 'Body must be a ScanResult (missing url or score).' },
      { status: 400 },
    );
  }

  const record = storeReport(payload);
  const origin = request.nextUrl.origin;
  return NextResponse.json(
    {
      hash: record.hash,
      reportUrl: `${origin}/report/${record.hash}`,
      badgeUrl: `${origin}/api/badge/${record.hash}.svg`,
      embedMarkdown: `![x402 score](${origin}/api/badge/${record.hash}.svg)`,
    },
    { status: 201 },
  );
}
