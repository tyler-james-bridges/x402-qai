'use client';

import { useState } from 'react';
import { PaymentFlow, type FlowTrace } from './payment-flow';

export function FlowScanner({ initialUrl }: { initialUrl?: string } = {}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<FlowTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  async function handleTrace(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setTrace(null);
    setError(null);
    try {
      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Trace failed');
        return;
      }
      setTrace(data);
      setReplayKey((k) => k + 1);
    } catch {
      setError('Failed to connect to tracer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleTrace} className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-api.com/endpoint"
          className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-6 py-3 font-mono text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Tracing...' : 'Trace Flow'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {trace && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 font-mono break-all">{trace.url}</p>
            <button
              onClick={() => setReplayKey((k) => k + 1)}
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
              type="button"
            >
              Replay
            </button>
          </div>
          <PaymentFlow key={replayKey} trace={trace} />
        </div>
      )}
    </div>
  );
}
