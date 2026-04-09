#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { scan } from './index.js';
import { scanBatch } from './batch.js';
import { formatText, formatBatchTextReport } from './reporters/text.js';
import { formatJson, formatBatchJsonReport } from './reporters/json.js';
import { startWatch, formatWatchResult } from './watch.js';
import type { ScanOptions, ReportFormat } from './types.js';

const program = new Command();

program
  .name('x402-qai')
  .description('Test x402 endpoints before your users do.')
  .version('0.1.0')
  .argument('[url]', 'URL of the x402 endpoint to scan')
  .option('--pay', 'enable live payment flow testing', false)
  .option('--json', 'output machine-readable JSON')
  .option('--ci', 'strict mode: exit 1 on score below threshold')
  .option('--threshold <n>', 'score threshold for --ci mode (default 70)', '70')
  .option('--max-amount <n>', 'maximum payment amount (e.g. 0.01)')
  .option('--file <path>', 'file containing URLs to scan (one per line)')
  .option('--timeout <ms>', 'request timeout in milliseconds', '10000')
  .option('--watch <seconds>', 'watch mode: re-scan every N seconds (single URL only)')
  .option('--lint', 'run x402-lint before the endpoint scan', false)
  .action(async (url: string | undefined, opts: Record<string, unknown>) => {
    const urls = collectUrls(url, opts.file as string | undefined);

    if (urls.length === 0) {
      console.error('Error: provide a URL argument or --file <path>');
      process.exit(2);
    }

    const format: ReportFormat = opts.json ? 'json' : 'text';
    const threshold = opts.ci ? Number(opts.threshold) : undefined;

    const scanOptions: ScanOptions = {
      pay: Boolean(opts.pay),
      maxAmount: opts.maxAmount as string | undefined,
      timeout: Number(opts.timeout),
      format,
      threshold,
      lint: Boolean(opts.lint),
    };

    // Watch mode
    if (opts.watch !== undefined) {
      if (urls.length > 1) {
        console.error('Error: --watch only supports a single URL');
        process.exit(2);
      }

      const intervalSec = Number(opts.watch) || 30;
      const handle = startWatch({
        url: urls[0],
        intervalSec,
        scanOptions,
        onResult: (result, delta, iteration) => {
          console.log(formatWatchResult(result, delta, iteration));
        },
      });

      const onSignal = () => {
        handle.stop();
      };
      process.on('SIGINT', onSignal);
      process.on('SIGTERM', onSignal);

      await handle.stopped;
      process.exit(0);
    }

    const isBatch = urls.length > 1;

    if (isBatch) {
      const results = await scanBatch(urls, scanOptions);
      const output =
        format === 'json'
          ? formatBatchJsonReport(results)
          : formatBatchTextReport(results, threshold);
      console.log(output);

      const failed = results.some((r) => {
        if (threshold !== undefined) return r.score.total < threshold;
        return !r.passed;
      });
      process.exit(failed ? 1 : 0);
    } else {
      try {
        const startTime = Date.now();
        const result = await scan(urls[0], scanOptions);
        const output = format === 'json' ? formatJson(result, startTime) : formatText(result);
        console.log(output);

        if (threshold !== undefined && result.score.total < threshold) {
          process.exit(1);
        } else if (!result.passed) {
          process.exit(1);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error scanning ${urls[0]}: ${msg}`);
        process.exit(2);
      }
    }
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
