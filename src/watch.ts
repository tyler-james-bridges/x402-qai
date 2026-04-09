import { scan } from './index.js';
import type { ScanOptions, ScanResult, RuleResult } from './types.js';

export interface WatchDelta {
  scoreChanged: boolean;
  previousScore: number;
  currentScore: number;
  newFailures: string[];
  recovered: string[];
}

export function computeDelta(previous: ScanResult, current: ScanResult): WatchDelta {
  const prevFailed = new Set(
    previous.rules.filter((r: RuleResult) => !r.passed).map((r: RuleResult) => r.id),
  );
  const currFailed = new Set(
    current.rules.filter((r: RuleResult) => !r.passed).map((r: RuleResult) => r.id),
  );

  const newFailures: string[] = [];
  for (const id of currFailed) {
    if (!prevFailed.has(id)) newFailures.push(id);
  }

  const recovered: string[] = [];
  for (const id of prevFailed) {
    if (!currFailed.has(id)) recovered.push(id);
  }

  return {
    scoreChanged: previous.score.total !== current.score.total,
    previousScore: previous.score.total,
    currentScore: current.score.total,
    newFailures,
    recovered,
  };
}

export function formatDelta(delta: WatchDelta): string {
  const lines: string[] = [];

  if (delta.scoreChanged) {
    const direction = delta.currentScore > delta.previousScore ? '+' : '';
    const diff = delta.currentScore - delta.previousScore;
    lines.push(`  Score: ${delta.previousScore} -> ${delta.currentScore} (${direction}${diff})`);
  } else {
    lines.push(`  Score: ${delta.currentScore} (no change)`);
  }

  if (delta.newFailures.length > 0) {
    lines.push(`  New failures: ${delta.newFailures.join(', ')}`);
  }
  if (delta.recovered.length > 0) {
    lines.push(`  Recovered: ${delta.recovered.join(', ')}`);
  }

  return lines.join('\n');
}

export type ScanFn = (url: string, options: ScanOptions) => Promise<ScanResult>;
export type DelayFn = (ms: number) => Promise<void>;

export interface WatchOptions {
  url: string;
  intervalSec: number;
  scanOptions: ScanOptions;
  onResult?: (result: ScanResult, delta: WatchDelta | null, iteration: number) => void;
  /** Injectable scan function for testing. Defaults to the real scan(). */
  scanFn?: ScanFn;
  /** Injectable delay function for testing. Defaults to setTimeout-based delay. */
  delayFn?: DelayFn;
}

export interface WatchHandle {
  stop: () => void;
  stopped: Promise<void>;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startWatch(opts: WatchOptions): WatchHandle {
  let running = true;
  const doScan = opts.scanFn ?? scan;
  const doDelay = opts.delayFn ?? defaultDelay;

  const resolveRef: { fn: (() => void) | null } = { fn: null };
  const stopped = new Promise<void>((r) => {
    resolveRef.fn = r;
  });

  const loop = async () => {
    let previous: ScanResult | null = null;
    let iteration = 0;

    while (running) {
      iteration++;
      try {
        const result = await doScan(opts.url, opts.scanOptions);
        const delta = previous ? computeDelta(previous, result) : null;

        if (opts.onResult) {
          opts.onResult(result, delta, iteration);
        }

        previous = result;
      } catch {
        // scan errors are non-fatal in watch mode
      }

      if (!running) break;

      await doDelay(opts.intervalSec * 1000);
    }

    resolveRef.fn?.();
  };

  loop();

  return {
    stop: () => {
      running = false;
    },
    stopped,
  };
}

export function formatWatchResult(
  result: ScanResult,
  delta: WatchDelta | null,
  iteration: number,
): string {
  const lines: string[] = [];
  const ts = new Date().toISOString();

  lines.push(`--- [${ts}] iteration #${iteration} ---`);
  lines.push(`  URL: ${result.url}`);
  lines.push(`  Score: ${result.score.total}/100  ${result.passed ? 'PASS' : 'FAIL'}`);

  if (result.errors.length > 0) {
    lines.push(`  Errors: ${result.errors.join('; ')}`);
  }

  const failed = result.rules.filter((r: RuleResult) => !r.passed);
  if (failed.length > 0) {
    lines.push(`  Failed rules: ${failed.map((r: RuleResult) => r.id).join(', ')}`);
  }

  if (delta) {
    lines.push(formatDelta(delta));
  }

  lines.push('');
  return lines.join('\n');
}
