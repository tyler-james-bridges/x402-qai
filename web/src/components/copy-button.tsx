'use client';

import { useCallback, useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        className ??
        'rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/70 hover:bg-white/10 transition-colors'
      }
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
