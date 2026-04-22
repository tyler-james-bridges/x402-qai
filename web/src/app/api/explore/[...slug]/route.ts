import { NextRequest, NextResponse } from 'next/server';
import { findServiceBySlug } from '@/lib/bankr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const joined = Array.isArray(slug) ? slug.join('/') : '';
  if (!joined) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const service = await findServiceBySlug(joined);
    if (!service) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ service });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
