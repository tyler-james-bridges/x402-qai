'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StepStatus = 'dormant' | 'active' | 'ok' | 'fail' | 'dryRun';

interface FlowStep {
  id: string;
  label: string;
  status: 'ok' | 'fail' | 'skipped' | 'dryRun';
  detail: string;
  data: Record<string, unknown>;
}

interface FlowResult {
  url: string;
  timestamp: string;
  steps: FlowStep[];
  requirements: Record<string, unknown> | null;
  error: string | null;
}

const STEP_ORDER = [
  { id: 'request', label: 'Request Sent' },
  { id: 'response', label: '402 Received' },
  { id: 'parse', label: 'Requirements Parsed' },
  { id: 'sign', label: 'Payment Signed' },
  { id: 'submit', label: 'Payment Submitted' },
  { id: 'result', label: 'Response Received' },
] as const;

const STEP_DELAY_MS = 550;

interface StatusTokens {
  dot: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  segment: string;
  label: string;
}

function statusTokens(status: StepStatus): StatusTokens {
  switch (status) {
    case 'ok':
      return {
        dot: 'bg-green-500',
        ring: 'ring-green-500/30',
        badgeBg: 'bg-green-500/10',
        badgeText: 'text-green-400',
        badgeBorder: 'border-green-500/40',
        segment: 'bg-green-500',
        label: 'PASS',
      };
    case 'fail':
      return {
        dot: 'bg-red-500',
        ring: 'ring-red-500/30',
        badgeBg: 'bg-red-500/10',
        badgeText: 'text-red-400',
        badgeBorder: 'border-red-500/40',
        segment: 'bg-red-500',
        label: 'FAIL',
      };
    case 'dryRun':
      return {
        dot: 'bg-yellow-500',
        ring: 'ring-yellow-500/30',
        badgeBg: 'bg-yellow-500/10',
        badgeText: 'text-yellow-400',
        badgeBorder: 'border-yellow-500/40',
        segment: 'bg-yellow-500',
        label: 'DRY',
      };
    case 'active':
      return {
        dot: 'bg-white',
        ring: 'ring-white/30',
        badgeBg: 'bg-white/10',
        badgeText: 'text-white/80',
        badgeBorder: 'border-white/40',
        segment: 'bg-white/60',
        label: '...',
      };
    default:
      return {
        dot: 'bg-white/40',
        ring: 'ring-transparent',
        badgeBg: 'bg-white/10',
        badgeText: 'text-white/50',
        badgeBorder: 'border-white/20',
        segment: 'bg-white/20',
        label: '—',
      };
  }
}

function deriveStatus(
  index: number,
  result: FlowResult | null,
  revealed: number,
  activeIndex: number | null,
): StepStatus {
  const step = STEP_ORDER[index];
  if (!result || index >= revealed) {
    return index === activeIndex ? 'active' : 'dormant';
  }
  const resolved = result.steps.find((rs) => rs.id === step.id);
  if (!resolved) return 'dormant';
  if (resolved.status === 'ok') return 'ok';
  if (resolved.status === 'fail') return 'fail';
  if (resolved.status === 'dryRun') return 'dryRun';
  return 'dormant';
}

export function PaymentFlow() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('url');
    if (prefill) setUrl(prefill);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const run = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;

      clearTimers();
      setError(null);
      setResult(null);
      setRevealed(0);
      setActiveIndex(0);
      setExpandedIndex(null);
      setLoading(true);

      try {
        const res = await fetch('/api/flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = (await res.json()) as FlowResult | { error?: string };

        if (!res.ok || !('steps' in data)) {
          setError(('error' in data && data.error) || 'Flow request failed');
          setActiveIndex(null);
          return;
        }

        setResult(data);

        data.steps.forEach((_step, i) => {
          const t = setTimeout(
            () => {
              setRevealed(i + 1);
              setExpandedIndex(i);
              const nextActive = i + 1 < data.steps.length ? i + 1 : null;
              setActiveIndex(nextActive);
              const el = stepRefs.current[i];
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            },
            STEP_DELAY_MS * (i + 1),
          );
          timers.current.push(t);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Flow request failed');
        setActiveIndex(null);
      } finally {
        setLoading(false);
      }
    },
    [url, clearTimers],
  );

  const statuses: StepStatus[] = useMemo(
    () => STEP_ORDER.map((_, i) => deriveStatus(i, result, revealed, activeIndex)),
    [result, revealed, activeIndex],
  );

  return (
    <div>
      <form onSubmit={run} className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-api.com/paid-endpoint"
          className="flex-1 min-w-0 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-6 py-3 font-mono text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running...' : 'Run Flow'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      <div className="mt-8 md:max-w-2xl md:mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-white/70 font-mono tracking-wider">
            x402 Handshake
          </h2>
          <span className="text-[10px] text-yellow-500/70 font-mono border border-yellow-500/20 rounded px-2 py-0.5">
            dry-run mode
          </span>
        </div>

        <ol className="relative">
          {STEP_ORDER.map((step, i) => {
            const status = statuses[i];
            const resolved = result?.steps.find((rs) => rs.id === step.id) ?? null;
            const isRevealed = revealed > i;
            const isLast = i === STEP_ORDER.length - 1;
            const tokens = statusTokens(status);
            const nextStatus: StepStatus =
              i < STEP_ORDER.length - 1 ? statuses[i + 1] : 'dormant';
            const segmentTokens = statusTokens(
              status === 'fail'
                ? 'fail'
                : status === 'ok' || status === 'dryRun'
                  ? status
                  : nextStatus === 'active'
                    ? 'active'
                    : 'dormant',
            );

            const isExpanded = expandedIndex === i;

            return (
              <li
                key={step.id}
                ref={(el) => { stepRefs.current[i] = el; }}
                className={`relative pl-10 md:pl-12 ${isLast ? '' : 'pb-6'} ${
                  isRevealed || status === 'active'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-80'
                } transition-all duration-500 ease-out`}
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className={`absolute left-[15px] md:left-[19px] top-6 bottom-0 w-[2px] ${segmentTokens.segment} ${
                      segmentTokens.segment === 'bg-white/60'
                        ? 'animate-pulse'
                        : ''
                    } transition-colors duration-300`}
                  />
                )}

                <span
                  aria-hidden
                  className={`absolute left-[10px] md:left-[14px] top-2 flex h-3 w-3 items-center justify-center`}
                >
                  {status === 'active' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                  )}
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${tokens.dot} ring-2 ring-offset-0 ${tokens.ring} transition-colors duration-300`}
                  />
                </span>

                <div
                  className={`rounded-lg border border-white/20 bg-white/[0.08] p-3 md:p-4 font-mono transition-all duration-500 ease-out ${
                    isRevealed || status === 'active'
                      ? 'translate-x-0 opacity-100'
                      : 'opacity-80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    disabled={!isRevealed && status !== 'active'}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-white leading-tight">
                        {String(i + 1).padStart(2, '0')}. {step.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded border ${tokens.badgeBorder} ${tokens.badgeBg} px-2 py-0.5 text-[10px] uppercase tracking-wider ${tokens.badgeText}`}
                      >
                        {tokens.label}
                      </span>
                      {isRevealed && (
                        <span className="text-[10px] text-white/30">
                          {isExpanded ? '\u25B2' : '\u25BC'}
                        </span>
                      )}
                    </div>
                  </button>

                  {resolved?.detail && isRevealed && (
                    <div className="mt-2 text-[11px] text-white/70 leading-snug break-all">
                      {resolved.detail}
                    </div>
                  )}

                  {!isRevealed && (
                    <div className="mt-2 text-[11px] text-white/50 leading-snug">
                      {status === 'active' ? 'running...' : 'waiting'}
                    </div>
                  )}

                  {resolved && isRevealed && isExpanded && (
                    <pre className="mt-3 max-h-56 md:max-h-72 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/70 p-2.5 md:p-3 text-[10.5px] leading-relaxed text-white/70 border border-white/5">
                      {JSON.stringify(resolved.data, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {result && !loading && (
        <p className="mt-4 text-[10px] text-white/25 font-mono md:max-w-2xl md:mx-auto">
          Steps 4-6 are simulated. Use the CLI with --pay for live payments.
        </p>
      )}
    </div>
  );
}
