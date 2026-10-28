# Buggy Order Service — RepoMedic Deterministic Verification Fixture

This fixture is a deterministic TypeScript order invoice calculation library with 8 Vitest unit tests (`tests/pricing.test.ts`).

## Known Regression
In `src/pricing.ts`, `resolveTaxRatePercent` uses `taxRatePercent || defaultRatePercent` instead of nullish coalescing (`??`). When a tax-exempt B2B order explicitly passes `taxRatePercent: 0`, `0` is treated as falsy and falls back to `8.5%`, causing test #5 (`5. honors explicit 0% tax rate for tax-exempt B2B orders`) to fail with:
- Expected `taxRatePercent`: `0`, Received: `8.5`
- Expected `taxCents`: `0`, Received: `1700`
