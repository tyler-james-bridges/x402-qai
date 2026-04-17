'use client';

import { useEffect, useMemo, useState } from 'react';

export type FlowStepKind =
  | 'discovery-request'
  | 'discovery-response'
  | 'parse-requirements'
  | 'sign-payment'
  | 'paid-request'
  | 'paid-response';

export type FlowStepStatus = 'success' | 'failure' | 'warning' | 'skipped';

export interface FlowStep {
  kind: FlowStepKind;
  label: string;
  status: FlowStepStatus;
  startedAt: number;
  durationMs: number;
  summary: string;
  detail?: Record<string, unknown>;
}

export interface FlowTrace {
  url: string;
  startedAt: string;
  totalDurationMs: number;
  paid: boolean;
  succeeded: boolean;
  steps: FlowStep[];
  discovery: Record<string, unknown> | null;
  errors: string[];
}

interface PaymentFlowProps {
  trace: FlowTrace;
  autoPlay?: boolean;
  stepDelayMs?: number;
}

const STEP_LAYOUT: { kind: FlowStepKind; row: number; col: number }[] = [
  { kind: 'discovery-request', row: 0, col: 0 },
  { kind: 'discovery-response', row: 0, col: 1 },
  { kind: 'parse-requirements', row: 0, col: 2 },
  { kind: 'sign-payment', row: 1, col: 2 },
  { kind: 'paid-request', row: 1, col: 1 },
  { kind: 'paid-response', row: 1, col: 0 },
];

const STATUS_COLOR: Record<FlowStepStatus, string> = {
  success: 'border-green-500/60 bg-green-500/10 text-green-400',
  failure: 'border-red-500/60 bg-red-500/10 text-red-400',
  warning: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400',
  skipped: 'border-white/10 bg-white/[0.02] text-white/40',
};

const STATUS_DOT: Record<FlowStepStatus, string> = {
  success: 'bg-green-500',
  failure: 'bg-red-500',
  warning: 'bg-yellow-500',
  skipped: 'bg-white/20',
};

function StepNode({
  step,
  revealed,
  expanded,
  onToggle,
}: {
  step: FlowStep;
  revealed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = revealed ? STATUS_COLOR[step.status] : 'border-white/10 bg-white/[0.02] text-white/30';
  const dot = revealed ? STATUS_DOT[step.status] : 'bg-white/10';
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left w-full rounded-lg border p-3 font-mono text-xs transition-all duration-500 ease-out ${color} ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full transition-colors duration-500 ${dot} ${
            revealed && step.status !== 'skipped' ? 'animate-pulse' : ''
          }`}
        />
        <span className="text-xs font-bold uppercase tracking-wider text-white/70">
          {step.label}
        </span>
        <span className="ml-auto text-[10px] text-white/30">
          {step.durationMs > 0 ? `${step.durationMs}ms` : ''}
        </span>
      </div>
      <p className="mt-2 text-white/60 break-all">{step.summary}</p>
      {expanded && step.detail && (
        <pre className="mt-3 max-h-60 overflow-auto rounded bg-black/60 p-2 text-[10px] leading-tight text-white/60 whitespace-pre-wrap break-all">
{JSON.stringify(step.detail, null, 2)}
        </pre>
      )}
    </button>
  );
}

function Connector({ active, direction }: { active: boolean; direction: 'right' | 'down' | 'left' }) {
  const base = 'transition-all duration-500 ease-out';
  const color = active ? 'bg-white/60' : 'bg-white/10';
  if (direction === 'down') {
    return (
      <div className="flex justify-center">
        <div className={`${base} ${color} w-[2px] h-8`} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <div className={`${base} ${color} h-[2px] w-full`} />
    </div>
  );
}

export function PaymentFlow({ trace, autoPlay = true, stepDelayMs = 450 }: PaymentFlowProps) {
  const totalSteps = trace.steps.length;
  const [revealedCount, setRevealedCount] = useState(() => (autoPlay ? 0 : totalSteps));
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!autoPlay) return;
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setRevealedCount(i);
      if (i < totalSteps) setTimeout(tick, stepDelayMs);
    };
    const initial = setTimeout(tick, stepDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [autoPlay, stepDelayMs, totalSteps]);

  const stepByKind = useMemo(() => {
    const map = new Map<FlowStepKind, { step: FlowStep; index: number }>();
    trace.steps.forEach((step, index) => map.set(step.kind, { step, index }));
    return map;
  }, [trace]);

  const layoutCells = STEP_LAYOUT.map(({ kind }) => stepByKind.get(kind));

  function renderCell(cell: { step: FlowStep; index: number } | undefined) {
    if (!cell) return <div />;
    return (
      <StepNode
        step={cell.step}
        revealed={revealedCount > cell.index}
        expanded={!!expanded[cell.index]}
        onToggle={() => setExpanded((p) => ({ ...p, [cell.index]: !p[cell.index] }))}
      />
    );
  }

  function connectorActive(cell: { step: FlowStep; index: number } | undefined) {
    return !!cell && revealedCount > cell.index;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
          Payment Flow
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
          <span>{trace.totalDurationMs}ms total</span>
          <span className={trace.succeeded ? 'text-green-500' : 'text-red-500'}>
            {trace.succeeded ? 'TRACE OK' : 'TRACE FAILED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] gap-y-2 items-stretch">
        {/* Row 0: req -> 402 -> parse */}
        {renderCell(layoutCells[0])}
        <Connector direction="right" active={connectorActive(layoutCells[1])} />
        {renderCell(layoutCells[1])}
        <Connector direction="right" active={connectorActive(layoutCells[2])} />
        {renderCell(layoutCells[2])}

        {/* Vertical connector between row 0 col 2 and row 1 col 2 */}
        <div className="col-span-5">
          <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr]">
            <div />
            <div />
            <div />
            <div />
            <Connector direction="down" active={connectorActive(layoutCells[3])} />
          </div>
        </div>

        {/* Row 1: 200 <- retry <- sign */}
        {renderCell(layoutCells[5])}
        <Connector direction="left" active={connectorActive(layoutCells[4])} />
        {renderCell(layoutCells[4])}
        <Connector direction="left" active={connectorActive(layoutCells[3])} />
        {renderCell(layoutCells[3])}
      </div>

      {trace.errors.length > 0 && (
        <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
          {trace.errors.map((err, i) => (
            <p key={i} className="break-all">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
