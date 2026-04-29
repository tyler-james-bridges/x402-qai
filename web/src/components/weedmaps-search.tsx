'use client';

import { useState } from 'react';

interface Recommendation {
  name: string;
  category: string;
  brand: string;
  genetics: string;
  price: number;
  description: string;
  orderable: boolean;
  picture: string | null;
}

interface Dispensary {
  name: string;
  rating: number;
  reviews: number;
  type: string;
  address: string;
  city: string;
  state: string;
  has_deals: boolean;
  license: string;
  url: string;
  recommendations: Recommendation[];
}

interface SearchResult {
  ok: boolean;
  error?: string;
  location: {
    query: string;
    lat: number;
    lng: number;
    resolved: string;
  };
  dispensaries: Dispensary[];
  summary: string;
}

const geneticsColor: Record<string, string> = {
  indica: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sativa: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hybrid: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const typeLabel: Record<string, string> = {
  dispensary: 'Pickup',
  delivery: 'Delivery',
};

const exampleQueries = [
  'edibles for sleep',
  'strongest flower',
  'cheap vape pens',
  'indica concentrates',
  'sativa drinks',
];

export function WeedmapsSearch() {
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/weedmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          query: query.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Search failed');
        return;
      }

      setResult(data);
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or address (US only)"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-6 py-3 font-mono text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for? (optional)"
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
        />
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-white/60 font-mono">{result.summary}</p>
            <p className="mt-2 text-[11px] text-white/30 font-mono">
              {result.location.resolved}
            </p>
          </div>

          {/* Dispensary Results */}
          {result.dispensaries.length === 0 ? (
            <p className="text-sm text-white/40 font-mono text-center py-8">
              No dispensaries found near this location.
            </p>
          ) : (
            result.dispensaries.map((disp, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                {/* Dispensary Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={disp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-bold font-mono text-white hover:text-white/80 transition-colors"
                      >
                        {disp.name}
                      </a>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-mono text-yellow-400">
                          {'*'.repeat(Math.round(disp.rating))} {disp.rating}
                        </span>
                        <span className="text-[11px] font-mono text-white/30">
                          ({disp.reviews} reviews)
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/40 uppercase">
                          {typeLabel[disp.type] || disp.type}
                        </span>
                        {disp.license && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-green-500/20 text-green-400/60 uppercase">
                            {disp.license}
                          </span>
                        )}
                        {disp.has_deals && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-yellow-500/20 text-yellow-400/60 uppercase">
                            Deals
                          </span>
                        )}
                      </div>
                      {disp.address && (
                        <p className="text-[11px] text-white/25 font-mono mt-1">
                          {disp.address}, {disp.city}, {disp.state}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Recommendations */}
                {disp.recommendations.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {disp.recommendations.map((rec, j) => (
                      <div key={j} className="p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-mono font-bold text-white/90 leading-snug">
                              {rec.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/40">
                                {rec.category}
                              </span>
                              {rec.genetics && rec.genetics !== 'unknown' && (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${geneticsColor[rec.genetics] || 'border-white/10 text-white/40'}`}
                                >
                                  {rec.genetics}
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-white/30">
                                {rec.brand}
                              </span>
                            </div>
                            {rec.description && (
                              <p className="text-[11px] text-white/25 font-mono mt-1.5 leading-relaxed line-clamp-2">
                                {rec.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {rec.price > 0 && (
                              <span className="text-sm font-mono font-bold text-green-400">
                                ${rec.price}
                              </span>
                            )}
                            {rec.orderable && (
                              <p className="text-[10px] font-mono text-white/30 mt-0.5">
                                Order online
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-[11px] text-white/30 font-mono">No matching products</p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* x402 callout */}
          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-4 text-center">
            <p className="text-[11px] text-white/25 font-mono">
              This is a free preview. The full API is available as an x402 endpoint at $0.03/req.
            </p>
            <code className="text-[10px] text-white/15 font-mono mt-1 block break-all">
              bankr x402 call
              https://x402.bankr.bot/0x72e45a93491a6acfd02da6ceb71a903f3d3b6d08/weedmaps-recs -i
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
