import type { Service } from '@/app/api/explore/route';

const BANKR_API = 'https://api.bankr.bot';

export async function searchBankr(query: string, limit: number): Promise<Service[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set('q', query);
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
    return data.services.filter(
      (item): item is Service =>
        !!item && typeof item === 'object' && typeof item.slug === 'string',
    );
  } catch {
    return [];
  }
}

export async function findServiceBySlug(slug: string): Promise<Service | null> {
  const words = slug.split('-').filter((w) => w.length > 2);
  const queries = [words.slice(0, 2).join(' '), words[0] ?? '', ''];

  const tried = new Set<string>();
  for (const q of queries) {
    if (tried.has(q)) continue;
    tried.add(q);
    const limit = q ? 50 : 200;
    const services = await searchBankr(q, limit);
    const match = services.find((s) => s.slug === slug);
    if (match) return match;
  }
  return null;
}
