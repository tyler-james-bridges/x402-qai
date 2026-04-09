import { describe, it, expect } from 'vitest';
import { computeDelta, formatDelta, formatWatchResult, startWatch } from '../watch.js';
import type { WatchDelta } from '../watch.js';
import type { ScanResult, ScanOptions } from '../types.js';

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    url: 'https://example.com/api',
    timestamp: '2026-04-09T00:00:00.000Z',
    passed: true,
    score: {
      total: 80,
      categories: [],
    },
    rules: [
      { id: 'rule-a', title: 'Rule A', severity: 'error', passed: true, message: 'ok' },
      { id: 'rule-b', title: 'Rule B', severity: 'error', passed: true, message: 'ok' },
    ],
    discovery: null,
    errors: [],
    ...overrides,
  };
}

describe('computeDelta', () => {
  it('detects score change', () => {
    const prev = makeScanResult({ score: { total: 80, categories: [] } });
    const curr = makeScanResult({ score: { total: 90, categories: [] } });

    const delta = computeDelta(prev, curr);
    expect(delta.scoreChanged).toBe(true);
    expect(delta.previousScore).toBe(80);
    expect(delta.currentScore).toBe(90);
  });

  it('reports no change when scores match', () => {
    const prev = makeScanResult();
    const curr = makeScanResult();

    const delta = computeDelta(prev, curr);
    expect(delta.scoreChanged).toBe(false);
  });

  it('detects new failures', () => {
    const prev = makeScanResult();
    const curr = makeScanResult({
      rules: [
        { id: 'rule-a', title: 'Rule A', severity: 'error', passed: true, message: 'ok' },
        { id: 'rule-b', title: 'Rule B', severity: 'error', passed: false, message: 'fail' },
      ],
    });

    const delta = computeDelta(prev, curr);
    expect(delta.newFailures).toEqual(['rule-b']);
    expect(delta.recovered).toEqual([]);
  });

  it('detects recovered rules', () => {
    const prev = makeScanResult({
      rules: [
        { id: 'rule-a', title: 'Rule A', severity: 'error', passed: false, message: 'fail' },
        { id: 'rule-b', title: 'Rule B', severity: 'error', passed: true, message: 'ok' },
      ],
    });
    const curr = makeScanResult();

    const delta = computeDelta(prev, curr);
    expect(delta.recovered).toEqual(['rule-a']);
    expect(delta.newFailures).toEqual([]);
  });
});

describe('formatDelta', () => {
  it('shows score change with direction', () => {
    const delta: WatchDelta = {
      scoreChanged: true,
      previousScore: 70,
      currentScore: 85,
      newFailures: [],
      recovered: [],
    };

    const output = formatDelta(delta);
    expect(output).toContain('70 -> 85');
    expect(output).toContain('+15');
  });

  it('shows no change', () => {
    const delta: WatchDelta = {
      scoreChanged: false,
      previousScore: 80,
      currentScore: 80,
      newFailures: [],
      recovered: [],
    };

    const output = formatDelta(delta);
    expect(output).toContain('no change');
  });

  it('lists new failures and recovered', () => {
    const delta: WatchDelta = {
      scoreChanged: true,
      previousScore: 80,
      currentScore: 60,
      newFailures: ['rule-x'],
      recovered: ['rule-y'],
    };

    const output = formatDelta(delta);
    expect(output).toContain('New failures: rule-x');
    expect(output).toContain('Recovered: rule-y');
  });
});

describe('formatWatchResult', () => {
  it('includes iteration number and score', () => {
    const result = makeScanResult();
    const output = formatWatchResult(result, null, 1);

    expect(output).toContain('iteration #1');
    expect(output).toContain('80/100');
    expect(output).toContain('PASS');
  });

  it('includes delta when provided', () => {
    const result = makeScanResult();
    const delta: WatchDelta = {
      scoreChanged: true,
      previousScore: 70,
      currentScore: 80,
      newFailures: [],
      recovered: ['rule-a'],
    };

    const output = formatWatchResult(result, delta, 2);
    expect(output).toContain('70 -> 80');
    expect(output).toContain('Recovered: rule-a');
  });

  it('shows failed rules', () => {
    const result = makeScanResult({
      passed: false,
      rules: [{ id: 'rule-a', title: 'Rule A', severity: 'error', passed: false, message: 'bad' }],
    });

    const output = formatWatchResult(result, null, 1);
    expect(output).toContain('FAIL');
    expect(output).toContain('rule-a');
  });
});

describe('startWatch', () => {
  const defaultOpts: ScanOptions = { pay: false, timeout: 5000, format: 'text' };

  function immediateDelay(): Promise<void> {
    return Promise.resolve();
  }

  it('runs scan in a loop and stops cleanly', async () => {
    let callCount = 0;
    const scanFn = async () => {
      callCount++;
      if (callCount >= 3) {
        // stop after 3 iterations
        handle.stop();
      }
      return makeScanResult({ score: { total: 70 + callCount, categories: [] } });
    };

    const results: Array<{ iteration: number; score: number }> = [];

    const handle = startWatch({
      url: 'https://example.com/api',
      intervalSec: 10,
      scanOptions: defaultOpts,
      scanFn,
      delayFn: immediateDelay,
      onResult: (result, _delta, iteration) => {
        results.push({ iteration, score: result.score.total });
      },
    });

    await handle.stopped;
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ iteration: 1, score: 71 });
    expect(results[1]).toEqual({ iteration: 2, score: 72 });
    expect(results[2]).toEqual({ iteration: 3, score: 73 });
  });

  it('computes deltas between iterations', async () => {
    const scanResults = [
      makeScanResult({ score: { total: 80, categories: [] } }),
      makeScanResult({
        score: { total: 60, categories: [] },
        rules: [
          { id: 'rule-a', title: 'Rule A', severity: 'error', passed: false, message: 'fail' },
          { id: 'rule-b', title: 'Rule B', severity: 'error', passed: true, message: 'ok' },
        ],
      }),
    ];
    let idx = 0;

    const deltas: Array<WatchDelta | null> = [];

    const handle = startWatch({
      url: 'https://example.com/api',
      intervalSec: 5,
      scanOptions: defaultOpts,
      scanFn: async () => {
        const result = scanResults[idx];
        idx++;
        if (idx >= scanResults.length) handle.stop();
        return result;
      },
      delayFn: immediateDelay,
      onResult: (_result, delta) => {
        deltas.push(delta);
      },
    });

    await handle.stopped;
    expect(deltas[0]).toBeNull();
    expect(deltas[1]).toMatchObject({
      scoreChanged: true,
      previousScore: 80,
      currentScore: 60,
      newFailures: ['rule-a'],
    });
  });

  it('continues on scan errors', async () => {
    let callNum = 0;
    const iterations: number[] = [];

    const handle = startWatch({
      url: 'https://example.com/api',
      intervalSec: 5,
      scanOptions: defaultOpts,
      scanFn: async () => {
        callNum++;
        if (callNum === 1) throw new Error('network down');
        if (callNum >= 3) handle.stop();
        return makeScanResult();
      },
      delayFn: immediateDelay,
      onResult: (_result, _delta, iteration) => {
        iterations.push(iteration);
      },
    });

    await handle.stopped;
    // First scan threw, so onResult not called for iteration 1
    expect(iterations).toEqual([2, 3]);
  });
});
