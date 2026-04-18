'use client';

import { useEffect, useRef, useState } from 'react';

interface ExploreSearchProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function ExploreSearch({
  value,
  loading,
  onChange,
  debounceMs = 300,
}: ExploreSearchProps) {
  const [input, setInput] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handle(next: string) {
    setInput(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(next.trim());
    }, debounceMs);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    onChange(input.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="search"
        value={input}
        onChange={(e) => handle(e.target.value)}
        placeholder="search x402 endpoints: weather, ai, trading..."
        className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
      />
      <div
        className={`flex items-center px-4 font-mono text-xs ${
          loading ? 'text-white/70' : 'text-white/30'
        }`}
        aria-live="polite"
      >
        {loading ? 'searching...' : 'idle'}
      </div>
    </form>
  );
}
