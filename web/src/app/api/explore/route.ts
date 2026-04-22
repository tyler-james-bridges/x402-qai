import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ServiceRoute {
  paymentScheme?: string;
  path?: string;
  methods?: string[];
  price?: string;
  currency?: string;
  network?: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface Service {
  slug: string;
  name: string;
  description: string;
  url: string;
  routes: ServiceRoute[];
  category?: string;
  tags?: string[];
  score?: number;
}

const BANKR_API = 'https://api.bankr.bot';

async function searchBankr(query: string, limit: number = 200): Promise<Service[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  try {
    const res = await fetch(`${BANKR_API}/x402/endpoints/discover?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success?: boolean;
      services?: Service[];
    };
    if (!data.success || !Array.isArray(data.services)) return [];
    return data.services
      .filter(
        (item): item is Service =>
          !!item &&
          typeof item === 'object' &&
          typeof item.slug === 'string',
      )
      .map((svc) => ({
        ...svc,
        url: svc.url || `https://x402.bankr.bot/${svc.slug}`,
      }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  try {
    const services = await searchBankr(q, q ? 50 : 200);
    return NextResponse.json({ query: q, services });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Explore failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
