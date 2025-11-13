# Resilience Helpers

Compass centralizes retry and circuit-breaker logic under `shared/resilience`. Import these helpers anywhere you call an external dependency so behavior stays consistent across backend services (and the frontend once it consumes runtime helpers).

## Module Exports

```ts
import {
  withCircuitBreaker,
  withJitteredRetry,
  CircuitBreakerOpenError,
  defaultShouldRetry,
} from '../../../shared/resilience';
```

### `withJitteredRetry(fn, options)`
Wraps any async function and retries it with exponential backoff plus jitter. Options:

- `maxRetries` (default 4) – number of retry attempts.
- `baseDelayMs` / `maxDelayMs` – starting delay and cap.
- `jitterStrategy` – `'full'`, `'equal'`, `'decorrelated'`, or `'none'`.
- `shouldRetry(error)` – predicate deciding if an error is retryable (defaults to `defaultShouldRetry`, which handles Axios/network failures, 5xx, and 429s).
- `onRetry(error, attempt, delayMs)` – optional logger hook.

### `withCircuitBreaker(fn, options)`
Adds failure-window tracking so unhealthy dependencies fail fast:

- `failureThreshold` – number of failures inside `windowMs` before opening (default 5).
- `windowMs` – lookback window for counting failures (default 60s).
- `cooldownMs` – how long to stay open before half-open probe (default 30s).
- `halfOpenMaxInFlight` – concurrent half-open calls (default 1).
- `isFailure(error)` – classifier (defaults to `defaultIsFailure`).
- `onStateChange(state)` / `onReject(error)` – telemetry hooks.

`CircuitBreakerOpenError` includes `cooldownRemainingMs` so callers can surface better UX.

## Composition Pattern

Wrap retries inside the breaker so jittered backoff happens before the breaker increments:

```ts
const performAnthropicCall = withCircuitBreaker(
  withJitteredRetry((payload) => anthropic.messages.create(payload), {
    maxRetries: 3,
    baseDelayMs: 750,
    jitterStrategy: 'decorrelated',
  }),
  {
    failureThreshold: 3,
    cooldownMs: 30_000,
  }
);

const response = await performAnthropicCall({ ...payload });
```

Timery uses the same pattern but wraps the Axios request config so all `GET`/`PATCH` calls share the breaker state.

## Testing Notes

- **Unit tests:** mock `Math.random` and use Jest fake timers to assert jittered backoff without waiting in real time (see `backend/tests/resilience/*.test.ts`).
- **Circuit breaker tests:** set low `failureThreshold`/`cooldownMs`, advance fake timers, and assert `CircuitBreakerOpenError` is thrown.
- **Service tests:** mock `shared/resilience` to return identity functions (`jest.fn((fn) => fn)`) when you don't want retry logic during unit tests (see `backend/src/services/__tests__/llm.test.ts`).
- **Manual verification:** enable verbose logs by passing `onRetry`/`onStateChange` callbacks; they'll emit `[toggl] retry ...` style output in development.

## When To Tune

- High-volume integrations (LLM, Toggl) should prefer `decorrelated` jitter to avoid synchronized retries.
- For rate-limited APIs with strict quotas, lower `maxRetries` and raise `cooldownMs` so the breaker backs off sooner.
- If an API distinguishes validation vs. transient errors, pass a custom `shouldRetry` predicate that inspects error codes.

Document any non-default tuning inside the owning service so future contributors know why the numbers differ.
