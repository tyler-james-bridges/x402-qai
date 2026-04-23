import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Service, ServiceRoute } from '@/app/api/explore/route';
import { findServiceBySlug } from '@/lib/bankr';
import { CopyButton } from '@/components/copy-button';
import { BadgeEmbed } from '@/components/badge-embed';

interface DetailProps {
  params: Promise<{ slug: string[] }>;
}

function joinSlug(parts: string[] | undefined): string {
  return Array.isArray(parts) ? parts.join('/') : '';
}

export async function generateMetadata({ params }: DetailProps) {
  const { slug } = await params;
  const joined = joinSlug(slug);
  const svc = joined ? await findServiceBySlug(joined) : null;
  if (!svc) return { title: 'Endpoint Not Found' };
  return {
    title: `${svc.name} - x402 Endpoint`,
    description: svc.description || `x402 endpoint: ${svc.name}`,
  };
}

function priceLabel(route?: ServiceRoute): string {
  if (!route?.price) return '--';
  const currency = route.currency ?? 'USDC';
  return `$${route.price} ${currency}`;
}

function firstMethod(route?: ServiceRoute): string {
  return route?.methods?.[0] ?? 'GET';
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function EndpointDetailPage({ params }: DetailProps) {
  const { slug } = await params;
  const joined = joinSlug(slug);
  const service = joined ? await findServiceBySlug(joined) : null;
  if (!service) notFound();

  const primary = service.routes?.[0];
  const encoded = encodeURIComponent(service.url);
  const method = firstMethod(primary);
  const schemas = collectSchemas(service);

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'qai.0x402.sh';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/explore"
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
            >
              &larr; explore
            </Link>
            <div className="flex gap-4 text-xs font-mono">
              <Link href="/flow" className="text-white/40 hover:text-white/70 transition-colors">
                /flow
              </Link>
              <Link
                href="/workflows"
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                /workflows
              </Link>
              <span className="text-white/30">0x402.sh</span>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold font-mono tracking-tight break-all">
              {service.name}
            </h1>
            <div className="flex items-center gap-2">
              <span className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] font-mono text-green-400">
                {priceLabel(primary)}
              </span>
              {primary?.network && (
                <span className="rounded border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-mono text-white/70">
                  {primary.network}
                </span>
              )}
            </div>
          </div>

          {service.description && (
            <p className="text-base md:text-lg text-white/60 font-mono leading-relaxed">
              {service.description}
            </p>
          )}

          {(service.category || service.tags?.length) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {service.category && (
                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-white/60">
                  {service.category}
                </span>
              )}
              {service.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-white/10 px-2 py-0.5 text-[11px] font-mono text-white/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5 font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-white/40">Endpoint</span>
            <div className="flex items-center gap-2">
              <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                {method}
              </span>
              <CopyButton value={service.url} />
            </div>
          </div>
          <div className="break-all text-sm text-white/80">{service.url}</div>
        </section>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
          <Link
            href={`/?url=${encoded}`}
            className="rounded border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
          >
            Scan Compliance
          </Link>
          <Link
            href={`/flow?url=${encoded}`}
            className="rounded border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
          >
            Run Flow
          </Link>
          <Link
            href="/workflows"
            className="rounded border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
          >
            Add to Workflow
          </Link>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/20 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white/80 hover:bg-white/10 transition-colors"
          >
            Try it
          </a>
        </section>

        <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5 font-mono">
          <h2 className="mb-4 text-sm font-bold text-white/90 uppercase tracking-wider">Pricing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <PricingCell label="Price" value={primary?.price ?? '--'} />
            <PricingCell label="Currency" value={primary?.currency ?? '--'} />
            <PricingCell label="Network" value={primary?.network ?? '--'} />
            <PricingCell label="Scheme" value={primary?.paymentScheme ?? '--'} />
          </div>
        </section>

        {schemas.length > 0 && (
          <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5 font-mono">
            <h2 className="mb-4 text-sm font-bold text-white/90 uppercase tracking-wider">
              Schema
            </h2>
            <div className="space-y-4">
              {schemas.map((s, i) => (
                <div key={`${s.label}-${i}`}>
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
                    {s.label}
                  </div>
                  <pre className="overflow-x-auto rounded border border-white/10 bg-black/60 p-3 text-[11px] leading-relaxed text-white/80">
                    <code>{formatJson(s.value)}</code>
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {service.routes && service.routes.length > 1 && (
          <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5 font-mono">
            <h2 className="mb-4 text-sm font-bold text-white/90 uppercase tracking-wider">
              Routes ({service.routes.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                    <th className="py-2 pr-4 font-normal">Method</th>
                    <th className="py-2 pr-4 font-normal">Path</th>
                    <th className="py-2 pr-4 font-normal">Price</th>
                    <th className="py-2 pr-4 font-normal">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {service.routes.map((r, i) => (
                    <tr
                      key={`${r.path ?? ''}-${i}`}
                      className="border-b border-white/5 last:border-b-0 align-top"
                    >
                      <td className="py-2 pr-4 text-white/70">{r.methods?.join('/') ?? '--'}</td>
                      <td className="py-2 pr-4 text-white/80 break-all">{r.path ?? '--'}</td>
                      <td className="py-2 pr-4 text-green-400">{priceLabel(r)}</td>
                      <td className="py-2 pr-4 text-white/50">{r.description ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-8">
          <BadgeEmbed encoded={encoded} origin={origin} />
        </section>

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Data from{' '}
            <a
              href="https://bankr.bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              bankr x402 marketplace
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function PricingCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-sm text-white/80 break-all">{value}</div>
    </div>
  );
}

interface SchemaEntry {
  label: string;
  value: unknown;
}

function collectSchemas(service: Service): SchemaEntry[] {
  const out: SchemaEntry[] = [];
  service.routes?.forEach((r, i) => {
    if (r.schema && typeof r.schema === 'object') {
      const base = r.path ?? `route ${i + 1}`;
      const method = r.methods?.join('/') ?? '';
      const label = method ? `${method} ${base}` : base;
      out.push({ label, value: r.schema });
    }
  });
  return out;
}
