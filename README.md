# x402-qai

Test x402 endpoints before your users do.

x402-qai is a compliance scanner and payment-flow validator for the [x402 protocol](https://www.x402.org/). It checks discovery responses, headers, pricing, error handling, and optionally validates live payment flows.

## Install

```bash
npm install -g x402-qai
```

## Quick Start

Scan a single endpoint:

```bash
x402-qai https://your-api.com/protected-resource
```

Scan multiple endpoints from a file:

```bash
x402-qai --file urls.txt
```

Run in CI with a minimum score threshold:

```bash
x402-qai --file urls.txt --ci --threshold 80
```

## CLI Reference

```
Usage: x402-qai [url] [options]

Arguments:
  url                    URL of the x402 endpoint to scan

Options:
  --pay                  Enable live payment flow testing (default: false)
  --json                 Output machine-readable JSON
  --ci                   Strict mode: exit 1 on score below threshold
  --threshold <n>        Score threshold for --ci mode (default: 70)
  --max-amount <n>       Maximum payment amount (e.g. 0.01)
  --file <path>          File containing URLs to scan (one per line)
  --timeout <ms>         Request timeout in milliseconds (default: 10000)
  --watch <seconds>      Watch mode: re-scan every N seconds (single URL only)
  -V, --version          Output the version number
  -h, --help             Display help
```

### URL File Format

```
# endpoints.txt
# Lines starting with # are comments
https://api.example.com/v1/data
https://api.example.com/v1/premium

# Empty lines are ignored
https://other-api.com/resource
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0    | All checks passed |
| 1    | One or more checks failed (or score below threshold in --ci mode) |
| 2    | Scanner error (network failure, invalid input) |

## Example Output

```
x402-qai report
URL: https://api.example.com/v1/data
Time: 2026-04-08T12:00:00.000Z

Rules
[PASS] Endpoint returns 402 without payment
  Endpoint correctly returns 402 Payment Required.
[PASS] Discovery payload is valid JSON
  Response body is valid JSON.
[PASS] Required fields present
  All required x402 fields are present.
[FAIL] Price amount is valid and positive
  Amount "abc" is not a valid positive number.
  -> Set amount to a positive numeric string (e.g. "0.01").

Score Breakdown
  discovery        40/40 (100%)
  headers          15/20 (75%)
  paymentFlow      20/25 (80%)
  errorHandling    10/15 (67%)

Overall: 85/100 PASS
```

## Batch Output

When scanning multiple URLs, a summary is appended:

```
Batch Summary

  PASS  85/100  https://api.example.com/v1/data
  FAIL  45/100  https://api.example.com/v1/broken

1/2 passed, average score: 65/100
```

## Watch Mode

Monitor an endpoint continuously and see changes over time:

```bash
x402-qai https://your-api.com/protected-resource --watch 30
```

Watch mode re-scans the endpoint every N seconds (default 30) and prints timestamped results with deltas showing score changes, new failures, and recovered passes. Press Ctrl+C to stop.

Watch mode only works with a single URL (not batch mode).

```
--- [2026-04-09T12:00:00.000Z] iteration #1 ---
  URL: https://your-api.com/protected-resource
  Score: 85/100  PASS

--- [2026-04-09T12:00:30.000Z] iteration #2 ---
  URL: https://your-api.com/protected-resource
  Score: 85/100  PASS
  Score: 85 (no change)

--- [2026-04-09T12:01:00.000Z] iteration #3 ---
  URL: https://your-api.com/protected-resource
  Score: 70/100  FAIL
  Failed rules: price-valid, amount-positive
  Score: 85 -> 70 (-15)
  New failures: price-valid, amount-positive
```

## GitHub Actions

Use x402-qai as a GitHub Action in your CI pipeline:

```yaml
name: x402 Compliance
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan x402 endpoint
        uses: tyler-james-bridges/x402-qai@main
        with:
          url: https://your-api.com/protected-resource
          threshold: 80
```

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | No* | | Endpoint URL to scan |
| `urls-file` | No* | | Path to file with URLs (one per line) |
| `threshold` | No | `70` | Minimum passing score (0-100) |
| `pay` | No | `false` | Enable payment testing |
| `max-amount` | No | `0.01` | Maximum payment amount in USD |

*At least one of `url` or `urls-file` is required.

### Batch scanning in CI

```yaml
      - name: Scan multiple endpoints
        uses: tyler-james-bridges/x402-qai@main
        with:
          urls-file: endpoints.txt
          threshold: 75
```

### Payment flow testing in CI

```yaml
      - name: Scan with payment testing
        uses: tyler-james-bridges/x402-qai@main
        with:
          url: https://your-api.com/protected-resource
          pay: true
          max-amount: '0.005'
```

## Scoring

Endpoints are scored 0-100 across four categories:

- **Discovery** - correct 402 status, valid JSON payload, required fields
- **Headers** - proper content-type, cache headers
- **Payment Flow** - valid scheme, network, asset, amount
- **Error Handling** - meaningful error responses, timeout behavior

## Part of QAI

x402-qai is part of the QAI ecosystem of quality assurance tools for Web3 protocols.

## License

MIT
