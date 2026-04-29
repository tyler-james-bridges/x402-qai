'use client';

import { useState } from 'react';

interface TopPick {
  name: string;
  category: string;
  price: number;
}

interface Dispensary {
  name: string;
  rating: number;
  reviews: number;
  type: string;
  address: string;
  city: string;
  url: string;
  has_deals: boolean;
  topPick: TopPick | null;
}

interface Venue {
  name: string;
  cuisine: string | null;
  address: string | null;
  website: string | null;
  hours: string | null;
}

interface BreweryItem {
  name: string;
  type: string;
  address: string | null;
  city: string;
  website: string | null;
}

interface Plan {
  dispensaries: Dispensary[];
  bars: Venue[];
  restaurants: Venue[];
  breweries: BreweryItem[];
}

interface SearchResult {
  ok: boolean;
  error?: string;
  location: { query: string; lat: number; lng: number; resolved: string };
  plan: Plan;
  summary: string;
}

const examples = [
  'Scottsdale, AZ',
  'Denver, CO',
  'Portland, OR',
  'Los Angeles, CA',
  'San Francisco, CA',
];

export function NightOutSearch() {
  const [location, setLocation] = useState('');
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
      const res = await fetch('/api/night-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: location.trim() }),
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
            {loading ? 'Planning...' : 'Plan it'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setLocation(ex)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
            >
              {ex}
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
            <p className="mt-2 text-[11px] text-white/30 font-mono">{result.location.resolved}</p>
          </div>

          {/* Dispensaries */}
          {result.plan.dispensaries.length > 0 && (
            <Section title="Dispensaries" count={result.plan.dispensaries.length}>
              {result.plan.dispensaries.map((d, i) => (
                <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold font-mono text-white hover:text-white/80 transition-colors"
                      >
                        {d.name}
                      </a>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-yellow-400">
                          {'*'.repeat(Math.round(d.rating))} {d.rating}
                        </span>
                        <span className="text-[11px] font-mono text-white/30">
                          ({d.reviews} reviews)
                        </span>
                        {d.has_deals && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-yellow-500/20 text-yellow-400/60">
                            Deals
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {d.topPick && (
                    <div className="mt-2 pl-3 border-l border-white/10">
                      <p className="text-[11px] font-mono text-white/50">
                        Try: {d.topPick.name} ({d.topPick.category}
                        {d.topPick.price > 0 ? `, $${d.topPick.price}` : ''})
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Restaurants */}
          {result.plan.restaurants.length > 0 && (
            <Section title="Restaurants" count={result.plan.restaurants.length}>
              {result.plan.restaurants.map((r, i) => (
                <VenueRow key={i} venue={r} />
              ))}
            </Section>
          )}

          {/* Bars */}
          {result.plan.bars.length > 0 && (
            <Section title="Bars" count={result.plan.bars.length}>
              {result.plan.bars.map((b, i) => (
                <VenueRow key={i} venue={b} />
              ))}
            </Section>
          )}

          {/* Breweries */}
          {result.plan.breweries.length > 0 && (
            <Section title="Breweries" count={result.plan.breweries.length}>
              {result.plan.breweries.map((b, i) => (
                <div key={i} className="p-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {b.website ? (
                        <a
                          href={b.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-white/80 hover:text-white transition-colors"
                        >
                          {b.name}
                        </a>
                      ) : (
                        <span className="text-sm font-mono text-white/80">{b.name}</span>
                      )}
                      {b.address && (
                        <p className="text-[11px] font-mono text-white/25 mt-0.5">{b.address}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/30 shrink-0">
                      {b.type}
                    </span>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* x402 callout */}
          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-4 text-center">
            <p className="text-[11px] text-white/25 font-mono">
              Free preview. Full API: $0.05/req via x402.
            </p>
            <code className="text-[10px] text-white/15 font-mono mt-1 block break-all">
              bankr x402 call -X POST
              https://x402.bankr.bot/0x72e45a93491a6acfd02da6ceb71a903f3d3b6d08/night-out -d
              {' \'{"location":"Scottsdale, AZ"}\''}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold font-mono text-white/70">{title}</h3>
        <span className="text-[10px] font-mono text-white/30">{count} found</span>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function VenueRow({ venue }: { venue: Venue }) {
  return (
    <div className="p-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {venue.website ? (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-white/80 hover:text-white transition-colors"
            >
              {venue.name}
            </a>
          ) : (
            <span className="text-sm font-mono text-white/80">{venue.name}</span>
          )}
          {venue.address && (
            <p className="text-[11px] font-mono text-white/25 mt-0.5">{venue.address}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {venue.cuisine && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/30">
              {venue.cuisine}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
