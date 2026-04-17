'use client';

import { useState } from 'react';
import type { CatalogEntry } from '@/lib/catalog';
import { GradeBadge } from './grade-badge';
import { SchemaForm } from './schema-form';
import { SchemaTree } from './schema-tree';
import { PaymentFlow, type FlowTrace } from './payment-flow';

interface EndpointDetailProps {
  entry: CatalogEntry;
}

export function EndpointDetail({ entry }: EndpointDetailProps) {
  const [trace, setTrace] = useState<FlowTrace | null>(null);
  const [tracing, setTracing] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [traceKey, setTraceKey] = useState(0);
  const [showDiscoveryRaw, setShowDiscoveryRaw] = useState(false);

  async function runTrace() {
    setTracing(true);
    setTraceError(null);
    setTrace(null);
    try {
      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: entry.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTraceError(data.error || 'Trace failed');
        return;
      }
      setTrace(data);
      setTraceKey((k) => k + 1);
    } catch {
      setTraceError('Failed to connect to tracer');
    } finally {
      setTracing(false);
    }
  }

  const humanPrice =
    typeof entry.priceUsd === 'number'
      ? `$${entry.priceUsd.toFixed(3)} ${entry.asset ?? ''} on ${entry.network}`.trim()
      : `price not yet indexed on ${entry.network}`;

  const discoveryPayload: Record<string, unknown> = {
    x402Version: 1,
    scheme: entry.scheme ?? null,
    network: entry.network,
    asset: entry.asset ?? null,
    amount: typeof entry.priceUsd === 'number' ? entry.priceUsd.toString() : null,
    payTo: entry.payTo ?? null,
    resource: entry.url,
    description: entry.description,
  };

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-wider text-white/40">
            {entry.category} / {entry.network}
          </p>
          <h2 className="mt-1 font-mono text-2xl text-white">{entry.name}</h2>
          <p className="mt-2 font-mono text-sm text-white/60">{entry.description}</p>
          <p className="mt-3 font-mono text-xs text-white/40 break-all">
            {entry.url}
          </p>
        </div>
        <GradeBadge grade={entry.scoreGrade} score={entry.scoreValue} size="md" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/40">
            Discovery
          </h3>
          <button
            onClick={() => setShowDiscoveryRaw((v) => !v)}
            type="button"
            className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {showDiscoveryRaw ? 'Hide raw JSON' : 'Show raw JSON'}
          </button>
        </div>
        <p className="mt-3 font-mono text-sm text-white/70">
          This endpoint charges {humanPrice}.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
          <dt className="text-white/40">scheme</dt>
          <dd className="text-white/80">{entry.scheme ?? '—'}</dd>
          <dt className="text-white/40">network</dt>
          <dd className="text-white/80">{entry.network}</dd>
          <dt className="text-white/40">asset</dt>
          <dd className="text-white/80">{entry.asset ?? '—'}</dd>
          <dt className="text-white/40">amount</dt>
          <dd className="text-white/80">{entry.priceUsd ?? '—'}</dd>
          <dt className="text-white/40">payTo</dt>
          <dd className="text-white/80 break-all">{entry.payTo ?? '—'}</dd>
        </dl>
        {showDiscoveryRaw && (
          <pre className="mt-4 overflow-auto rounded bg-black/60 p-3 font-mono text-[10px] leading-tight text-white/60">
{JSON.stringify(discoveryPayload, null, 2)}
          </pre>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/40 mb-3">
            Input schema
          </h3>
          <SchemaForm schema={entry.inputSchema} />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/40 mb-3">
            Output schema
          </h3>
          <SchemaTree schema={entry.outputSchema} />
        </div>
      </section>

      {entry.example && (
        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/40 mb-3">
            Example
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">request</p>
              <pre className="mt-1 overflow-auto rounded bg-black/60 p-3 font-mono text-[10px] leading-tight text-white/60">
{JSON.stringify(entry.example.request ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">response</p>
              <pre className="mt-1 overflow-auto rounded bg-black/60 p-3 font-mono text-[10px] leading-tight text-white/60">
{JSON.stringify(entry.example.response ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/40">
            Live payment flow
          </h3>
          <button
            onClick={runTrace}
            type="button"
            disabled={tracing}
            className="rounded bg-white px-3 py-1.5 font-mono text-xs font-bold text-black hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {tracing ? 'Tracing...' : trace ? 'Re-scan' : 'Run trace'}
          </button>
        </div>
        {traceError && (
          <p className="mt-3 font-mono text-xs text-red-400">{traceError}</p>
        )}
        {trace && (
          <div className="mt-4">
            <PaymentFlow key={traceKey} trace={trace} />
          </div>
        )}
        {!trace && !tracing && !traceError && (
          <p className="mt-3 font-mono text-xs text-white/40">
            Tap &ldquo;Run trace&rdquo; to play the x402 handshake against this endpoint.
          </p>
        )}
      </section>
    </div>
  );
}
