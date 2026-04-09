import { execFile } from 'child_process';
import { promisify } from 'util';
import type { LintResult, LintIssue } from '../types.js';

const execFileAsync = promisify(execFile);

export async function checkLintAvailable(): Promise<boolean> {
  try {
    await execFileAsync('npx', ['x402-lint', '--version'], { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

export async function runLint(targetDir?: string): Promise<LintResult> {
  const available = await checkLintAvailable();
  if (!available) {
    return {
      available: false,
      ran: false,
      passed: false,
      issues: [],
      error: 'x402-lint is not installed. Install with: npm install -g x402-lint',
    };
  }

  try {
    const args = ['x402-lint', '--json'];
    if (targetDir) {
      args.push(targetDir);
    }

    const { stdout } = await execFileAsync('npx', args, { timeout: 60000 });
    return parseLintOutput(stdout);
  } catch (err) {
    // x402-lint may exit non-zero when issues are found
    if (err && typeof err === 'object' && 'stdout' in err) {
      const stdout = (err as { stdout: string }).stdout;
      if (stdout && stdout.trim().length > 0) {
        return parseLintOutput(stdout);
      }
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      available: true,
      ran: false,
      passed: false,
      issues: [],
      error: `x402-lint execution failed: ${message}`,
    };
  }
}

function parseLintOutput(stdout: string): LintResult {
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const rawIssues = Array.isArray(parsed['issues']) ? parsed['issues'] : [];

    const issues: LintIssue[] = rawIssues
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item: Record<string, unknown>) => ({
        file: String(item['file'] ?? ''),
        line: typeof item['line'] === 'number' ? item['line'] : undefined,
        rule: String(item['rule'] ?? ''),
        message: String(item['message'] ?? ''),
        severity: item['severity'] === 'warning' ? ('warning' as const) : ('error' as const),
      }));

    const hasErrors = issues.some((i) => i.severity === 'error');

    return {
      available: true,
      ran: true,
      passed: !hasErrors,
      issues,
    };
  } catch {
    return {
      available: true,
      ran: true,
      passed: false,
      issues: [],
      error: 'Failed to parse x402-lint JSON output',
    };
  }
}
