import { createHash } from 'crypto';

export interface StoredReport {
  hash: string;
  url: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

declare global {
  var __X402_QAI_REPORTS__: Map<string, StoredReport> | undefined;
}

function getStore(): Map<string, StoredReport> {
  if (!globalThis.__X402_QAI_REPORTS__) {
    globalThis.__X402_QAI_REPORTS__ = new Map();
  }
  return globalThis.__X402_QAI_REPORTS__;
}

export function storeReport(payload: Record<string, unknown>): StoredReport {
  const serialized = JSON.stringify(payload);
  const hash = createHash('sha256').update(serialized).digest('hex').slice(0, 12);
  const url = typeof payload.url === 'string' ? payload.url : 'unknown';
  const timestamp =
    typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString();
  const record: StoredReport = { hash, url, timestamp, payload };
  getStore().set(hash, record);
  return record;
}

export function getReport(hash: string): StoredReport | undefined {
  return getStore().get(hash);
}

export function listReports(): StoredReport[] {
  return Array.from(getStore().values()).sort((a, b) =>
    (b.timestamp ?? '').localeCompare(a.timestamp ?? ''),
  );
}

const GRADE_ORDER: Array<{ min: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' }> = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
];

export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  for (const { min, grade } of GRADE_ORDER) {
    if (score >= min) return grade;
  }
  return 'F';
}
