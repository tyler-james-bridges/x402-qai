import { NextRequest, NextResponse } from 'next/server';
import { traceFlow } from 'x402-qai';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = body?.url;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const trace = await traceFlow(url, { timeout: 15000, pay: false });
    return NextResponse.json(trace);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trace failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
