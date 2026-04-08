import type { ScanResult, RuleResult, CategoryScore } from '../types.js';

const noColor = Boolean(process.env['NO_COLOR']);

const GREEN = noColor ? '' : '\x1b[32m';
const RED = noColor ? '' : '\x1b[31m';
const YELLOW = noColor ? '' : '\x1b[33m';
const DIM = noColor ? '' : '\x1b[2m';
const BOLD = noColor ? '' : '\x1b[1m';
const RESET = noColor ? '' : '\x1b[0m';

function pass(text: string): string {
  return `${GREEN}[PASS]${RESET} ${text}`;
}

function fail(text: string): string {
  return `${RED}[FAIL]${RESET} ${text}`;
}

function warn(text: string): string {
  return `${YELLOW}[WARN]${RESET} ${text}`;
}

function formatRule(rule: RuleResult): string {
  const lines: string[] = [];

  if (rule.passed) {
    lines.push(pass(rule.title));
  } else if (rule.severity === 'warn') {
    lines.push(warn(rule.title));
  } else {
    lines.push(fail(rule.title));
  }

  lines.push(`  ${DIM}${rule.message}${RESET}`);

  if (!rule.passed && rule.suggestion) {
    lines.push(`  ${YELLOW}-> ${rule.suggestion}${RESET}`);
  }

  return lines.join('\n');
}

function formatCategory(cat: CategoryScore): string {
  const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
  const color = pct >= 80 ? GREEN : pct >= 50 ? YELLOW : RED;
  return `  ${cat.category.padEnd(16)} ${color}${cat.score}/${cat.maxScore}${RESET} (${pct}%)`;
}

export function formatText(result: ScanResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}x402-scan report${RESET}`);
  lines.push(`${DIM}URL: ${result.url}${RESET}`);
  lines.push(`${DIM}Time: ${result.timestamp}${RESET}`);
  lines.push('');

  // Rules
  lines.push(`${BOLD}Rules${RESET}`);
  for (const rule of result.rules) {
    lines.push(formatRule(rule));
  }

  // Errors
  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`${RED}${BOLD}Errors${RESET}`);
    for (const err of result.errors) {
      lines.push(`  ${RED}${err}${RESET}`);
    }
  }

  // Score breakdown
  lines.push('');
  lines.push(`${BOLD}Score Breakdown${RESET}`);
  for (const cat of result.score.categories) {
    lines.push(formatCategory(cat));
  }

  // Summary
  lines.push('');
  const totalColor = result.score.total >= 80 ? GREEN : result.score.total >= 50 ? YELLOW : RED;
  const verdict = result.passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  lines.push(`${BOLD}Overall: ${totalColor}${result.score.total}/100${RESET} ${verdict}`);
  lines.push('');

  return lines.join('\n');
}
