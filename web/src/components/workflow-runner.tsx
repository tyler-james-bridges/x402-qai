'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EstimateResult, ResolvedStep, WorkflowDefinition } from '@/lib/workflows';

type RunStatus = 'dormant' | 'active' | 'ok' | 'fail';

const STEP_DELAY_MS = 650;

interface StatusTokens {
  dot: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  segment: string;
  label: string;
}

function statusTokens(status: RunStatus): StatusTokens {
  switch (status) {
    case 'ok':
      return {
        dot: 'bg-green-500',
        ring: 'ring-green-500/30',
        badgeBg: 'bg-green-500/10',
        badgeText: 'text-green-400',
        badgeBorder: 'border-green-500/40',
        segment: 'bg-green-500',
        label: 'SIM',
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

function formatPrice(price: number, currency: string): string {
  if (price === 0) return `$0 ${currency}`;
  if (price < 0.01) return `$${price.toFixed(4)} ${currency}`;
  return `$${price.toFixed(3)} ${currency}`;
}

function schemaFieldList(schema: Record<string, unknown> | undefined): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== 'object') return [];
  return Object.keys(props);
}

function findRefs(input: Record<string, unknown> | undefined): string[] {
  if (!input) return [];
  const refs = new Set<string>();
  const pattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  const walk = (val: unknown): void => {
    if (typeof val === 'string') {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(val)) !== null) {
        refs.add(m[1]);
      }
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    if (val && typeof val === 'object') {
      Object.values(val as Record<string, unknown>).forEach(walk);
    }
  };
  walk(input);
  return Array.from(refs);
}

interface WorkflowRunnerProps {
  workflow: WorkflowDefinition;
  yamlSource: string;
}

export function WorkflowRunner({ workflow, yamlSource }: WorkflowRunnerProps) {
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(true);

  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showYaml, setShowYaml] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetch('/api/workflows/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as EstimateResult & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setEstimateError(data.error || 'Estimate failed');
        } else {
          setEstimate(data);
        }
        setEstimating(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { name?: string }).name === 'AbortError') return;
        setEstimateError(err instanceof Error ? err.message : 'Estimate failed');
        setEstimating(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [workflow]);

  const steps = useMemo<ResolvedStep[]>(() => estimate?.steps ?? [], [estimate]);

  const runDryRun = useCallback(() => {
    if (!estimate) return;
    clearTimers();
    setRunning(true);
    setRevealed(0);
    setActiveIndex(0);
    setExpandedIndex(0);

    estimate.steps.forEach((_step, i) => {
      const t = setTimeout(
        () => {
          setRevealed(i + 1);
          setExpandedIndex(i);
          const nextActive = i + 1 < estimate.steps.length ? i + 1 : null;
          setActiveIndex(nextActive);
          const el = stepRefs.current[i];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (i === estimate.steps.length - 1) {
            setRunning(false);
          }
        },
        STEP_DELAY_MS * (i + 1),
      );
      timers.current.push(t);
    });
  }, [estimate, clearTimers]);

  const resetRun = useCallback(() => {
    clearTimers();
    setRunning(false);
    setRevealed(0);
    setActiveIndex(null);
    setExpandedIndex(null);
  }, [clearTimers]);

  const statuses: RunStatus[] = useMemo(() => {
    return steps.map((_, i) => {
      if (revealed === 0 && activeIndex === null) return 'dormant';
      if (i < revealed) return 'ok';
      if (i === activeIndex) return 'active';
      return 'dormant';
    });
  }, [steps, revealed, activeIndex]);

  const totalLabel = estimate ? formatPrice(estimate.totalCost, estimate.currency) : '—';

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 font-mono mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              Estimated Total
            </div>
            <div className="text-3xl md:text-4xl font-bold text-green-400">{totalLabel}</div>
            <div className="mt-1 text-[11px] text-white/50">
              {estimating
                ? 'Resolving endpoints from Bankr...'
                : estimate
                  ? `${estimate.steps.length} step${estimate.steps.length === 1 ? '' : 's'}${
                      estimate.unresolvedCount > 0 ? `, ${estimate.unresolvedCount} unresolved` : ''
                    }`
                  : estimateError
                    ? 'Could not estimate'
                    : ''}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runDryRun}
              disabled={!estimate || running || estimating}
              className="rounded-lg bg-white px-5 py-2.5 font-mono text-sm font-bold text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {running ? 'Simulating...' : 'Run Dry-Run'}
            </button>
            <button
              type="button"
              onClick={resetRun}
              disabled={!estimate || revealed === 0}
              className="rounded-lg border border-white/20 bg-transparent px-4 py-2.5 font-mono text-sm text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setShowYaml((v) => !v)}
              className="rounded-lg border border-white/20 bg-transparent px-4 py-2.5 font-mono text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              {showYaml ? 'Hide YAML' : 'View YAML'}
            </button>
          </div>
        </div>

        {estimateError && (
          <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {estimateError}
          </div>
        )}
      </div>

      {showYaml && (
        <pre className="mb-6 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/70 p-4 text-[11px] leading-relaxed text-white/70 font-mono whitespace-pre">
          {yamlSource}
        </pre>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white/70 font-mono tracking-wider">Pipeline</h2>
        <span className="text-[10px] text-yellow-500/70 font-mono border border-yellow-500/20 rounded px-2 py-0.5">
          dry-run mode
        </span>
      </div>

      {estimating && steps.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-white/40 font-mono">
          Resolving endpoints...
        </div>
      )}

      <ol className="relative">
        {steps.map((step, i) => {
          const status = statuses[i];
          const isRevealed = revealed > i;
          const isLast = i === steps.length - 1;
          const tokens = statusTokens(status);
          const nextStatus: RunStatus = i < steps.length - 1 ? statuses[i + 1] : 'dormant';
          const segmentTokens = statusTokens(
            status === 'ok' ? 'ok' : nextStatus === 'active' ? 'active' : 'dormant',
          );
          const isExpanded = expandedIndex === i;
          const refs = findRefs(step.input);

          return (
            <li
              key={step.id}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className={`relative pl-10 md:pl-12 ${isLast ? '' : 'pb-6'} transition-all duration-500 ease-out`}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] md:left-[19px] top-6 bottom-0 w-[2px] ${segmentTokens.segment} ${
                    segmentTokens.segment === 'bg-white/60' ? 'animate-pulse' : ''
                  } transition-colors duration-300`}
                />
              )}

              <span
                aria-hidden
                className="absolute left-[10px] md:left-[14px] top-2 flex h-3 w-3 items-center justify-center"
              >
                {status === 'active' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${tokens.dot} ring-2 ring-offset-0 ${tokens.ring} transition-colors duration-300`}
                />
              </span>

              <StepCard
                index={i}
                step={step}
                status={status}
                tokens={tokens}
                isRevealed={isRevealed}
                isExpanded={isExpanded}
                refs={refs}
                onToggle={() => setExpandedIndex(isExpanded ? null : i)}
              />
            </li>
          );
        })}
      </ol>

      {estimate && estimate.unresolvedCount > 0 && (
        <p className="mt-4 text-[11px] text-yellow-500/60 font-mono">
          {estimate.unresolvedCount} step
          {estimate.unresolvedCount === 1 ? '' : 's'} could not be resolved against the Bankr
          marketplace. Prices shown as $0 where unknown.
        </p>
      )}
    </div>
  );
}

interface StepCardProps {
  index: number;
  step: ResolvedStep;
  status: RunStatus;
  tokens: StatusTokens;
  isRevealed: boolean;
  isExpanded: boolean;
  refs: string[];
  onToggle: () => void;
}

function StepCard({
  index,
  step,
  status,
  tokens,
  isRevealed,
  isExpanded,
  refs,
  onToggle,
}: StepCardProps) {
  const inputFields = schemaFieldList(step.inputSchema);
  const outputFields = schemaFieldList(step.outputSchema);

  return (
    <div
      className={`rounded-lg border border-white/20 bg-white/[0.08] p-3 md:p-4 font-mono transition-all duration-500 ease-out ${
        isRevealed || status === 'active' ? 'translate-x-0 opacity-100' : 'opacity-80'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white leading-tight">
            {String(index + 1).padStart(2, '0')}. {step.name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
            <span>{step.method}</span>
            <span>&middot;</span>
            <span className="text-green-400/80">{formatPrice(step.price, step.currency)}</span>
            {step.network && (
              <>
                <span>&middot;</span>
                <span>{step.network}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded border ${tokens.badgeBorder} ${tokens.badgeBg} px-2 py-0.5 text-[10px] uppercase tracking-wider ${tokens.badgeText}`}
          >
            {tokens.label}
          </span>
          <span className="text-[10px] text-white/30">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {refs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {refs.map((r) => (
            <span
              key={r}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9.5px] text-white/50"
              title={`Input ref: ${r}`}
            >
              &larr; {r}
            </span>
          ))}
        </div>
      )}

      {step.error && <div className="mt-2 text-[11px] text-yellow-400/80">{step.error}</div>}

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {step.routeDescription && (
            <p className="text-[11px] text-white/60 leading-snug">{step.routeDescription}</p>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Endpoint</div>
            <div className="text-[11px] text-white/70 break-all">{step.endpoint}</div>
          </div>

          {inputFields.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Input Schema
              </div>
              <div className="flex flex-wrap gap-1">
                {inputFields.map((f) => (
                  <span
                    key={f}
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {outputFields.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Output Schema
              </div>
              <div className="flex flex-wrap gap-1">
                {outputFields.map((f) => (
                  <span
                    key={f}
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step.input && Object.keys(step.input).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Configured Input
              </div>
              <pre className="max-h-56 overflow-auto rounded bg-black/70 p-2.5 text-[10.5px] leading-relaxed text-white/70 border border-white/5 whitespace-pre-wrap break-all">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {isRevealed && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Simulated Response
              </div>
              <pre className="rounded bg-black/70 p-2.5 text-[10.5px] leading-relaxed text-white/60 border border-white/5 whitespace-pre-wrap break-all">
                {simulatedResponse(step)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function simulatedResponse(step: ResolvedStep): string {
  const fields = schemaFieldList(step.outputSchema);
  if (fields.length === 0) {
    return `// dry-run: would POST to ${step.endpoint}\n// response schema unknown`;
  }
  const placeholder: Record<string, string> = {};
  for (const f of fields) {
    placeholder[f] = `<${f}>`;
  }
  return JSON.stringify(placeholder, null, 2);
}
