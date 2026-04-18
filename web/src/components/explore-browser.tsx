'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExploreSearch } from './explore-search';
import { EndpointCard } from './endpoint-card';
import type { Service } from '@/app/api/explore/route';

interface ExploreResponse {
  query: string;
  services: Service[];
  error?: string;
}

export function ExploreBrowser() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const fetchServices = useCallback(async (q: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = q ? `/api/explore?q=${encodeURIComponent(q)}` : '/api/explore';
      const res = await fetch(url, { signal });
      const data = (await res.json()) as ExploreResponse;
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load endpoints');
      }
      setServices(data.services ?? []);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchServices(query, controller.signal);
    return () => controller.abort();
  }, [query, fetchServices]);

  return (
    <div>
      <ExploreSearch value={query} loading={loading} onChange={setQuery} />

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      <div className="mt-8">
        {loading && services.length === 0 ? (
          <SkeletonGrid />
        ) : services.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <>
            <p className="mb-4 text-xs text-white/40 font-mono">
              {services.length} endpoint{services.length === 1 ? '' : 's'}
              {query ? ` matching "${query}"` : ''}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <EndpointCard key={svc.slug} service={svc} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 rounded-lg border border-white/10 bg-white/[0.02] animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-12 text-center font-mono">
      <p className="text-sm text-white/50">
        {query ? `No endpoints found for "${query}"` : 'No endpoints available'}
      </p>
      <p className="mt-2 text-xs text-white/30">
        Try searching for: weather, ai, trading, social
      </p>
    </div>
  );
}
