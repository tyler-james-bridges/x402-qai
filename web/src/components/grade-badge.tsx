interface GradeBadgeProps {
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  score?: number;
  size?: 'sm' | 'md';
}

const GRADE_COLOR: Record<string, string> = {
  A: 'border-green-500/40 bg-green-500/10 text-green-400',
  B: 'border-green-500/30 bg-green-500/5 text-green-300',
  C: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
  D: 'border-red-500/30 bg-red-500/10 text-red-300',
  F: 'border-red-500/40 bg-red-500/15 text-red-400',
};

export function GradeBadge({ grade, score, size = 'sm' }: GradeBadgeProps) {
  if (!grade) {
    return (
      <span className="rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-mono text-white/30 uppercase tracking-wider">
        unscored
      </span>
    );
  }
  const color = GRADE_COLOR[grade];
  const padding = size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[10px]';
  return (
    <span className={`rounded border font-mono font-bold uppercase tracking-wider ${color} ${padding}`}>
      {grade}{typeof score === 'number' ? ` ${score}` : ''}
    </span>
  );
}
