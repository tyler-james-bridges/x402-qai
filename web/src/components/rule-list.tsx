'use client';

import { useState } from 'react';

interface RuleResult {
  id: string;
  title: string;
  severity: 'error' | 'warn' | 'info';
  passed: boolean;
  message: string;
  suggestion?: string;
}

interface RuleListProps {
  rules: RuleResult[];
}

function StatusIcon({ passed, severity }: { passed: boolean; severity: string }) {
  if (passed) {
    return <span className="text-green-500 font-mono font-bold">PASS</span>;
  }
  if (severity === 'warn') {
    return <span className="text-yellow-500 font-mono font-bold">WARN</span>;
  }
  return <span className="text-red-500 font-mono font-bold">FAIL</span>;
}

export function RuleList({ rules }: RuleListProps) {
  const [showPassing, setShowPassing] = useState(false);

  const failed = rules.filter((r) => !r.passed);
  const passed = rules.filter((r) => r.passed);
  const displayRules = showPassing ? rules : failed;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white/40 font-mono uppercase tracking-wider">
          Rules ({passed.length}/{rules.length} passed)
        </h3>
        <button
          onClick={() => setShowPassing(!showPassing)}
          className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
        >
          {showPassing ? 'Show failures only' : 'Show all rules'}
        </button>
      </div>

      {displayRules.length === 0 && (
        <p className="text-sm text-green-500/70 font-mono">
          All {rules.length} rules passed.
        </p>
      )}

      <div className="space-y-2">
        {displayRules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-lg border p-3 ${
              rule.passed
                ? 'border-white/5 bg-white/[0.02]'
                : rule.severity === 'warn'
                  ? 'border-yellow-500/20 bg-yellow-500/5'
                  : 'border-red-500/20 bg-red-500/5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StatusIcon passed={rule.passed} severity={rule.severity} />
                  <span className="text-sm text-white/80 font-mono">
                    {rule.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40 font-mono">
                  {rule.message}
                </p>
                {rule.suggestion && !rule.passed && (
                  <p className="mt-1 text-xs text-white/50 font-mono">
                    Fix: {rule.suggestion}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-white/20 font-mono whitespace-nowrap">
                {rule.id}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
