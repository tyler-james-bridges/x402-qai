'use client';

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
}

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

const categoryLabels: Record<string, string> = {
  discovery: 'Discovery',
  headers: 'Headers',
  paymentFlow: 'Payment Flow',
  errorHandling: 'Error Handling',
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-xs font-bold text-white/40 font-mono uppercase tracking-wider mb-4">
        Score Breakdown
      </h3>
      <div className="space-y-3">
        {categories.map((cat) => {
          const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
          const color =
            pct === 100
              ? 'bg-green-500'
              : pct >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500';

          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/70 font-mono">
                  {categoryLabels[cat.category] || cat.category}
                </span>
                <span className="text-sm text-white/50 font-mono">
                  {cat.score}/{cat.maxScore}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full ${color} transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
