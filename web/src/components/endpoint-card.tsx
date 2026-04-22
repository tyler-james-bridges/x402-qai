import Link from 'next/link';
import type { Service } from '@/app/api/explore/route';

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '\u2026';
}

function priceLabel(svc: Service): string {
  const first = svc.routes?.[0];
  if (!first?.price) return '--';
  const currency = first.currency ?? 'USDC';
  return `$${first.price} ${currency}`;
}

function networkLabel(svc: Service): string {
  const first = svc.routes?.[0];
  return first?.network ?? '--';
}

function methodsLabel(svc: Service): string {
  const first = svc.routes?.[0];
  if (!first?.methods?.length) return '--';
  return first.methods.join('/');
}

export function EndpointCard({ service }: { service: Service }) {
  const url = service.url;
  const encoded = encodeURIComponent(url);
  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-4 font-mono transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/explore/${service.slug}`}
          className="text-sm font-bold text-white break-all hover:underline"
        >
          {service.name}
        </Link>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/50">
          {methodsLabel(service)}
        </span>
      </div>

      <p className="text-xs text-white/60 leading-relaxed mb-3 min-h-[3rem]">
        {truncate(service.description ?? '', 140)}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
        <div>
          <div className="text-white/30 uppercase tracking-wider">Price</div>
          <div className="text-green-400">{priceLabel(service)}</div>
        </div>
        <div>
          <div className="text-white/30 uppercase tracking-wider">Network</div>
          <div className="text-white/70">{networkLabel(service)}</div>
        </div>
      </div>

      {(service.category || service.tags?.length) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {service.category && (
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
              {service.category}
            </span>
          )}
          {service.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-white/10">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[11px] text-white/40 hover:text-white/70 mb-3"
          title={url}
        >
          {url}
        </a>
        <div className="flex gap-2">
          <Link
            href={`/explore/${service.slug}`}
            className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-white hover:bg-white/20 transition-colors"
          >
            Details
          </Link>
          <Link
            href={`/?url=${encoded}`}
            className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-white hover:bg-white/20 transition-colors"
          >
            Scan
          </Link>
          <Link
            href={`/flow?url=${encoded}`}
            className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-white hover:bg-white/20 transition-colors"
          >
            Flow
          </Link>
        </div>
      </div>
    </div>
  );
}
