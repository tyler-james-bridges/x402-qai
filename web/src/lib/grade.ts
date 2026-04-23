export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
}

export interface ScanScore {
  total: number;
  categories: CategoryScore[];
}

export interface RuleResult {
  id: string;
  title: string;
  severity: 'error' | 'warn' | 'info';
  passed: boolean;
  message: string;
  suggestion?: string;
}

export interface ScanResult {
  url: string;
  timestamp: string;
  passed: boolean;
  score: ScanScore;
  rules: RuleResult[];
  discovery: Record<string, unknown> | null;
  errors: string[];
}

export const GRADE_COLORS: Record<Grade, string> = {
  A: '#22c55e',
  B: '#3b82f6',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};

export const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  headers: 'Headers',
  paymentFlow: 'Payment Flow',
  errorHandling: 'Error Handling',
};

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function gradeColor(grade: Grade): string {
  return GRADE_COLORS[grade];
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function safeDecodeUrl(encoded: string): string | null {
  try {
    const decoded = decodeURIComponent(encoded);
    new URL(decoded);
    return decoded;
  } catch {
    return null;
  }
}
