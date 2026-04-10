import { NextRequest, NextResponse } from 'next/server';
import { scan } from 'x402-qai';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = body.url;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const result = await scan(url, {
      pay: false,
      timeout: 15000,
      format: 'json',
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
