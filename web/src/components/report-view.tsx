'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/types';
import { ScoreRing } from './score-ring';
import { CategoryBreakdown } from './category-breakdown';
import { RuleList } from './rule-list';

export type ReportPayload = ScanResult;

interface ReportViewProps {
  hash: string;
  origin: string;
  payload: ReportPayload;
}

export function ReportView({ hash, origin, payload }: ReportViewProps) {
  const badgeUrl = `${origin}/api/badge/${hash}.svg`;
  const reportUrl = `${origin}/report/${hash}`;
  const markdown = `[![x402 score](${badgeUrl})](${reportUrl})`;
  const [copied, setCopied] = useState<'md' | 'url' | null>(null);

  async function copy(text: string, key: 'md' | 'url') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-white/40">
            {new Date(payload.timestamp).toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-sm text-white/60 break-all">
            {payload.url}
          </p>
        </div>
        <ScoreRing score={payload.score.total} passed={payload.passed} />
      </div>

      {payload.errors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="mb-2 font-mono text-sm font-bold text-red-400 uppercase tracking-wider">
            Errors
          </h3>
          {payload.errors.map((err, i) => (
            <p key={i} className="font-mono text-sm text-red-300">{err}</p>
          ))}
        </div>
      )}

      <CategoryBreakdown categories={payload.score.categories} />
      <RuleList rules={payload.rules} />

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-white/40">
          Share this report
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* SVG badge served dynamically; next/image would require a remote-pattern allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="score badge" src={badgeUrl} className="h-5" />
            <button
              type="button"
              onClick={() => copy(badgeUrl, 'url')}
              className="font-mono text-[10px] text-white/40 hover:text-white/70 transition-colors"
            >
              {copied === 'url' ? 'copied' : 'copy badge URL'}
            </button>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              Markdown embed
            </p>
            <div className="mt-1 flex items-start gap-2">
              <pre className="flex-1 overflow-auto rounded bg-black/60 p-2 font-mono text-[10px] leading-tight text-white/70 break-all whitespace-pre-wrap">
{markdown}
              </pre>
              <button
                type="button"
                onClick={() => copy(markdown, 'md')}
                className="rounded border border-white/20 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60 hover:border-white/40 hover:text-white transition-colors"
              >
                {copied === 'md' ? 'copied' : 'copy'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
