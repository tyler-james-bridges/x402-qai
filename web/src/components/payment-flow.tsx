'use client';

import { useEffect, useState } from 'react';
import type { FlowStep, FlowStepKind, FlowStepStatus, FlowTrace } from '@/lib/types';

export type { FlowStep, FlowStepKind, FlowStepStatus, FlowTrace };

interface PaymentFlowProps {
  trace: FlowTrace;
  autoPlay?: boolean;
  stepDelayMs?: number;
}

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

// traceFlow always emits steps in this order. If that changes, the visual
// flow layout (left-to-right, then wrap back right-to-left) breaks.
const ROW_0: FlowStepKind[] = ['discovery-request', 'discovery-response', 'parse-requirements'];
const ROW_1: FlowStepKind[] = ['paid-response', 'paid-request', 'sign-payment'];

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

function Bar({ active, vertical = false }: { active: boolean; vertical?: boolean }) {
  const color = active ? 'bg-white/60' : 'bg-white/10';
  const shape = vertical ? 'w-[2px] h-8 mx-auto' : 'h-[2px] w-full my-auto';
  return <div className={`transition-colors duration-500 ${color} ${shape}`} />;
}

export function PaymentFlow({ trace, autoPlay = true, stepDelayMs = 450 }: PaymentFlowProps) {
  const totalSteps = trace.steps.length;
  const [revealedCount, setRevealedCount] = useState(() => (autoPlay ? 0 : totalSteps));
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!autoPlay) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealedCount(i);
      if (i < totalSteps) timer = setTimeout(tick, stepDelayMs);
    };
    timer = setTimeout(tick, stepDelayMs);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoPlay, stepDelayMs, totalSteps]);

  function cellFor(kind: FlowStepKind) {
    const index = trace.steps.findIndex((s) => s.kind === kind);
    if (index < 0) return null;
    const step = trace.steps[index];
    return (
      <StepNode
        step={step}
        revealed={revealedCount > index}
        expanded={!!expanded[index]}
        onToggle={() => setExpanded((p) => ({ ...p, [index]: !p[index] }))}
      />
    );
  }

  function barAfter(kind: FlowStepKind, vertical = false) {
    const index = trace.steps.findIndex((s) => s.kind === kind);
    return <Bar vertical={vertical} active={index >= 0 && revealedCount > index} />;
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

      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] items-stretch gap-y-2">
        {cellFor(ROW_0[0])}
        {barAfter(ROW_0[1])}
        {cellFor(ROW_0[1])}
        {barAfter(ROW_0[2])}
        {cellFor(ROW_0[2])}

        <div className="col-start-5">
          {barAfter('sign-payment', true)}
        </div>

        {cellFor(ROW_1[0])}
        {barAfter(ROW_1[1])}
        {cellFor(ROW_1[1])}
        {barAfter(ROW_1[2])}
        {cellFor(ROW_1[2])}
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
