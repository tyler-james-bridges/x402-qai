import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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

const DEFAULT_QUERIES = [
  'api',
  'data',
  'ai',
  'search',
  'trading',
  'social',
  'image',
  'crypto',
];

function extractJsonArray(stdout: string): unknown[] {
  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }
  const slice = stdout.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeQuery(q: string): string {
  return q.replace(/[^a-zA-Z0-9 \-_.]/g, '').trim();
}

async function runSearch(query: string): Promise<Service[]> {
  const safe = sanitizeQuery(query);
  if (!safe) return [];
  try {
    const { stdout } = await execAsync(
      `bankr x402 search "${safe}" --raw`,
      { timeout: 20000, maxBuffer: 10 * 1024 * 1024 },
    );
    const arr = extractJsonArray(stdout);
    return arr.filter(
      (item): item is Service =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Service).slug === 'string',
    );
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  try {
    if (q) {
      const services = await runSearch(q);
      return NextResponse.json({ query: q, services });
    }

    const results = await Promise.all(DEFAULT_QUERIES.map((query) => runSearch(query)));
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
