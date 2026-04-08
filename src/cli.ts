#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { scan } from './index.js';
import { formatText } from './reporters/text.js';
import { formatJson } from './reporters/json.js';
import type { ScanOptions, ReportFormat } from './types.js';

const program = new Command();

program
  .name('x402-qai')
  .description('Test x402 endpoints before your users do.')
  .version('0.1.0')
  .argument('[url]', 'URL of the x402 endpoint to scan')
  .option('--pay', 'enable live payment flow testing', false)
  .option('--json', 'output machine-readable JSON')
  .option('--ci', 'strict mode: exit 1 on score < 70')
  .option('--max-amount <n>', 'maximum payment amount (e.g. 0.01)')
  .option('--file <path>', 'file containing URLs to scan (one per line)')
  .option('--timeout <ms>', 'request timeout in milliseconds', '10000')
  .action(async (url: string | undefined, opts: Record<string, unknown>) => {
    const urls = collectUrls(url, opts.file as string | undefined);

    if (urls.length === 0) {
      console.error('Error: provide a URL argument or --file <path>');
      process.exit(2);
    }

    const format: ReportFormat = opts.json ? 'json' : 'text';
    const threshold = opts.ci ? 70 : undefined;

    const scanOptions: ScanOptions = {
      pay: Boolean(opts.pay),
      maxAmount: opts.maxAmount as string | undefined,
      timeout: Number(opts.timeout),
      format,
      threshold,
    };

    let worstExit = 0;

    for (const target of urls) {
      try {
        const startTime = Date.now();
        const result = await scan(target, scanOptions);
        const output = format === 'json' ? formatJson(result, startTime) : formatText(result);
        console.log(output);

        if (threshold !== undefined && result.score.total < threshold) {
          worstExit = Math.max(worstExit, 1);
        } else if (!result.passed) {
          worstExit = Math.max(worstExit, 1);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error scanning ${target}: ${msg}`);
        worstExit = 2;
      }
    }

    process.exit(worstExit);
  });

function collectUrls(positional: string | undefined, filePath: string | undefined): string[] {
  const urls: string[] = [];

  if (positional) {
    urls.push(positional);
  }

  if (filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0 && !l.startsWith('#'));
    urls.push(...lines);
  }

  return urls;
}

program.parse();
