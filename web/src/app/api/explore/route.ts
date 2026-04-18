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

const DEFAULT_QUERIES = [
  'api',
  'data',
  'ai',
  'search',
  'trading',
  'social',
  'image',
  'crypto',
  'agent',
  'tool',
  'defi',
  'nft',
];

async function searchBankr(query: string): Promise<Service[]> {
  const params = new URLSearchParams({ q: query, limit: '10' });
  try {
    const res = await fetch(`${BANKR_API}/x402/endpoints/discover?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { success?: boolean; services?: Service[] };
    if (!data.success || !Array.isArray(data.services)) return [];
    return data.services.filter(
      (item): item is Service =>
        !!item &&
        typeof item === 'object' &&
        typeof item.slug === 'string',
    );
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  try {
    if (q) {
      const services = await searchBankr(q);
      return NextResponse.json({ query: q, services });
    }

    const results = await Promise.all(DEFAULT_QUERIES.map((query) => searchBankr(query)));
    const seen = new Set<string>();
    const merged: Service[] = [];
    for (const group of results) {
      for (const svc of group) {
        if (seen.has(svc.slug)) continue;
        seen.add(svc.slug);
        merged.push(svc);
      }
    }
    return NextResponse.json({ query: '', services: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Explore failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
