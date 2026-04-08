import type { ScanResult } from '../types.js';

interface JsonReport extends ScanResult {
  scanDuration: number;
  version: string;
}

interface BatchJsonReport {
  version: string;
  totalUrls: number;
  passed: number;
  failed: number;
  averageScore: number;
  results: ScanResult[];
}

export function formatJson(result: ScanResult, startTime?: number): string {
  const now = Date.now();
  const report: JsonReport = {
    ...result,
    scanDuration: startTime ? now - startTime : 0,
    version: '0.1.0',
  };
  return JSON.stringify(report, null, 2);
}

export function formatBatchJsonReport(results: ScanResult[]): string {
  const passed = results.filter((r) => r.passed).length;
  const avg =
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score.total, 0) / results.length)
      : 0;

  const report: BatchJsonReport = {
    version: '0.1.0',
    totalUrls: results.length,
    passed,
    failed: results.length - passed,
    averageScore: avg,
    results,
  };

  return JSON.stringify(report, null, 2);
}
