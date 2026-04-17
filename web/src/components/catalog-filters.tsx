'use client';

import { useMemo, useState } from 'react';
import type { CatalogEntry, CatalogFilters } from '@/lib/catalog';
import { filterCatalog } from '@/lib/catalog';
import { EndpointCard } from './endpoint-card';

interface CatalogBrowserProps {
  entries: CatalogEntry[];
}

const CATEGORIES = ['ai', 'data', 'infra', 'media', 'directory'] as const;
const NETWORKS = ['base', 'base-sepolia'] as const;
const GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
const SORTS: { value: NonNullable<CatalogFilters['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'highest-rated', label: 'Highest rated' },
];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
        active
          ? 'border-white bg-white text-black'
          : 'border-white/20 bg-white/[0.02] text-white/60 hover:border-white/40 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

export function CatalogBrowser({ entries }: CatalogBrowserProps) {
  const [filters, setFilters] = useState<CatalogFilters>({ sort: 'newest' });

  const results = useMemo(() => filterCatalog(entries, filters), [entries, filters]);

  function toggle<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  }

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div>
          <input
            type="search"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value || undefined }))}
            placeholder="search endpoints..."
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">category</span>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={filters.category === c}
                  onClick={() => toggle('category', c)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">network</span>
            <div className="flex flex-wrap gap-1">
              {NETWORKS.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  active={filters.network === n}
                  onClick={() => toggle('network', n)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">min grade</span>
            <div className="flex flex-wrap gap-1">
              {GRADES.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  active={filters.minGrade === g}
                  onClick={() => toggle('minGrade', g)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">sort</span>
            <div className="flex flex-wrap gap-1">
              {SORTS.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  active={filters.sort === s.value}
                  onClick={() => setFilters((p) => ({ ...p, sort: s.value }))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 font-mono text-xs text-white/40">
        {results.length} endpoint{results.length === 1 ? '' : 's'}
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center font-mono text-sm text-white/40">
          No endpoints match these filters.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((entry) => (
            <EndpointCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
