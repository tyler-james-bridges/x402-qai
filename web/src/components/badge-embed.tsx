'use client';

import { useCallback, useMemo, useState } from 'react';

interface BadgeEmbedProps {
  encoded: string;
  origin: string;
  reportPath?: string;
}

export function BadgeEmbed({ encoded, origin, reportPath }: BadgeEmbedProps) {
  const badgeUrl = `${origin}/api/badge/${encoded}`;
  const linkUrl = `${origin}${reportPath ?? `/report/${encoded}`}`;
  const markdown = useMemo(
    () => `[![x402 compliance](${badgeUrl})](${linkUrl})`,
    [badgeUrl, linkUrl],
  );

  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [markdown]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">
          Compliance Badge
        </h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/70 hover:bg-white/10 transition-colors"
        >
          {copied ? 'Copied' : 'Copy markdown'}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeUrl} alt="x402 compliance badge" width={140} height={20} className="h-5" />
        <a href={linkUrl} className="text-[11px] text-white/40 hover:text-white/70 underline">
          view report
        </a>
      </div>

      <pre className="overflow-x-auto rounded border border-white/10 bg-black/60 p-3 text-[11px] leading-relaxed text-white/80">
        <code>{markdown}</code>
      </pre>
    </div>
  );
}
