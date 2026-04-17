export type {
  ScanResult,
  RuleResult,
  CategoryScore,
  ScoreBreakdown,
  ScoreCategory,
  Severity,
  DiscoveryPayload,
  FlowStep,
  FlowStepKind,
  FlowStepStatus,
  FlowTrace,
} from 'x402-qai';

export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
