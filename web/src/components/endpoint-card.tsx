import Link from 'next/link';
import type { CatalogEntry } from '@/lib/catalog';
import { GradeBadge } from './grade-badge';

export function EndpointCard({ entry }: { entry: CatalogEntry }) {
  return (
    <Link
      href={`/explore/${entry.slug}`}
      className="group block rounded-lg border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/30 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-white group-hover:text-white">
            {entry.name}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
            {entry.category} / {entry.network}
          </p>
        </div>
        <GradeBadge grade={entry.scoreGrade} score={entry.scoreValue} />
      </div>
      <p className="mt-3 font-mono text-xs text-white/60 line-clamp-3">
        {entry.description}
      </p>
      <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-white/40">
        <span>
          {typeof entry.priceUsd === 'number'
            ? `$${entry.priceUsd.toFixed(3)} ${entry.asset ?? ''}`.trim()
            : 'price TBD'}
        </span>
        {entry.lastScannedAt ? (
          <span>scanned {new Date(entry.lastScannedAt).toLocaleDateString()}</span>
        ) : (
          <span>unscanned</span>
        )}
      </div>
    </Link>
  );
}
