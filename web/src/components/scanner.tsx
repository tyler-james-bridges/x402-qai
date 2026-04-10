'use client';

import { useState } from 'react';
import { ScoreRing } from './score-ring';
import { RuleList } from './rule-list';
import { CategoryBreakdown } from './category-breakdown';

interface RuleResult {
  id: string;
  title: string;
  severity: 'error' | 'warn' | 'info';
  passed: boolean;
  message: string;
  suggestion?: string;
}

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
}

interface ScanResult {
  url: string;
  timestamp: string;
  passed: boolean;
  score: {
    total: number;
    categories: CategoryScore[];
  };
  rules: RuleResult[];
  discovery: Record<string, unknown> | null;
  errors: string[];
}

export function Scanner() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Scan failed');
        return;
      }

      setResult(data);
    } catch {
      setError('Failed to connect to scanner');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleScan} className="flex gap-3">
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
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40 font-mono">
                {new Date(result.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-white/60 font-mono break-all">
                {result.url}
              </p>
            </div>
            <ScoreRing score={result.score.total} passed={result.passed} />
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <h3 className="text-sm font-bold text-red-400 font-mono uppercase tracking-wider mb-2">
                Errors
              </h3>
              {result.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-300 font-mono">
                  {err}
                </p>
              ))}
            </div>
          )}

          <CategoryBreakdown categories={result.score.categories} />
          <RuleList rules={result.rules} />
        </div>
      )}
    </div>
  );
}
