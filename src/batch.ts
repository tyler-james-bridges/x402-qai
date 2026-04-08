import { scan } from './index.js';
import type { ScanOptions, ScanResult } from './types.js';

export async function scanBatch(urls: string[], options: ScanOptions): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const url of urls) {
    const result = await scan(url, options);
    results.push(result);
  }

  return results;
}
