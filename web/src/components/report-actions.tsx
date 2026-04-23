'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ReportActionsProps {
  shareUrl: string;
}

export function ReportActions({ shareUrl }: ReportActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const onRescan = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onShare}
        className="rounded border border-white/20 bg-white/10 px-3 py-2 text-xs font-mono text-white hover:bg-white/20 transition-colors"
      >
        {copied ? 'Copied' : 'Share Report'}
      </button>
      <button
        type="button"
        onClick={onRescan}
        disabled={pending}
        className="rounded border border-white/20 bg-white/5 px-3 py-2 text-xs font-mono text-white/80 hover:bg-white/10 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Scanning...' : 'Scan Again'}
      </button>
    </div>
  );
}
