import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

function buildProgram(): Command {
  const program = new Command();
  program
    .name('x402-scan')
    .description('Test x402 endpoints before your users do.')
    .version('0.1.0')
    .argument('[url]', 'URL of the x402 endpoint to scan')
    .option('--pay', 'enable live payment flow testing', false)
    .option('--json', 'output machine-readable JSON')
    .option('--ci', 'strict mode: exit 1 on score < 70')
    .option('--max-amount <n>', 'maximum payment amount (e.g. 0.01)')
    .option('--file <path>', 'file containing URLs to scan (one per line)')
    .option('--timeout <ms>', 'request timeout in milliseconds', '10000');
  return program;
}

describe('CLI argument parsing', () => {
  it('parses a URL positional argument', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com/api']);
    expect(program.args[0]).toBe('https://example.com/api');
  });

  it('parses --pay flag', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com', '--pay']);
    expect(program.opts().pay).toBe(true);
  });

  it('defaults --pay to false', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com']);
    expect(program.opts().pay).toBe(false);
  });

  it('parses --json flag', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com', '--json']);
    expect(program.opts().json).toBe(true);
  });

  it('parses --ci flag', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com', '--ci']);
    expect(program.opts().ci).toBe(true);
  });

  it('parses --max-amount with value', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com', '--max-amount', '0.05']);
    expect(program.opts().maxAmount).toBe('0.05');
  });

  it('parses --timeout with value', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com', '--timeout', '5000']);
    expect(program.opts().timeout).toBe('5000');
  });

  it('defaults --timeout to 10000', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', 'https://example.com']);
    expect(program.opts().timeout).toBe('10000');
  });

  it('parses --file with path', () => {
    const program = buildProgram();
    program.parse(['node', 'x402-scan', '--file', 'urls.txt']);
    expect(program.opts().file).toBe('urls.txt');
  });

  it('parses multiple flags together', () => {
    const program = buildProgram();
    program.parse([
      'node',
      'x402-scan',
      'https://example.com',
      '--pay',
      '--json',
      '--ci',
      '--max-amount',
      '0.01',
    ]);
    const opts = program.opts();
    expect(opts.pay).toBe(true);
    expect(opts.json).toBe(true);
    expect(opts.ci).toBe(true);
    expect(opts.maxAmount).toBe('0.01');
  });
});
