# x402-qai

x402 endpoint compliance scanner and payment-flow validator.

## Standards
- TypeScript strict mode, Node 22+
- Zero emojis in code
- Run lint, format:check, tsc --noEmit, build, and tests before claiming done
- Every feature ships with tests (vitest)
- Use native fetch (no axios/got)
- Zod for response validation
- Commander for CLI parsing

## Architecture
- src/cli.ts - CLI entry point
- src/scanner/http.ts - request orchestration
- src/scanner/discovery.ts - parse and validate 402 discovery response
- src/rules/*.ts - individual rule definitions
- src/reporters/text.ts - human-readable console output
- src/reporters/json.ts - machine-readable CI output
- src/types.ts - shared types and interfaces
- src/__tests__/ - test files

## Key decisions
- Default mode is non-payment (safe)
- --pay flag required for live payment tests
- Exit code 0 = pass, 1 = fail, 2 = error
- Score 0-100 across categories: Discovery, Headers, Payment Flow, Error Handling
