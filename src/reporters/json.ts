import type { ScanResult } from '../types.js';

interface JsonReport extends ScanResult {
  scanDuration: number;
  version: string;
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
