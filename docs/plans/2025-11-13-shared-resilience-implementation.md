# Shared Resilience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce reusable circuit breaker and jittered retry helpers in the shared layer and adopt them in the backend’s external service clients.

**Architecture:** Ship a pure TypeScript/JavaScript helper module under `shared/resilience` that exposes `withCircuitBreaker` and `withJitteredRetry`, then compose them inside backend services (Toggl + LLM) via a small wrapper that centralizes Axios calls. Backend builds continue to run `ts-jest`/`tsc`; shared helpers are authored in TS with declarations so both runtimes can consume them without extra build steps.

**Tech Stack:** TypeScript, Jest, Axios, Node timers, shared module exports, existing backend build/test scripts.

---

### Task 1: Create shared resilience helpers

**Files:**
- Create: `shared/resilience/index.ts`
- Create: `shared/resilience/index.d.ts`
- Modify: `backend/tsconfig.json` (type roots + module resolution stays compatible)

**Step 1: Define types and exports**
```ts
export type CircuitBreakerState = 'closed' | 'open' | 'halfOpen';
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  windowMs?: number;
  cooldownMs?: number;
  halfOpenMaxInFlight?: number;
  isFailure?: (error: unknown) => boolean;
  onStateChange?: (state: CircuitBreakerState) => void;
  onReject?: (error: CircuitBreakerOpenError) => void;
}
export class CircuitBreakerOpenError extends Error {
  constructor(public readonly cooldownRemainingMs: number) {
    super('Circuit breaker open');
  }
}
```
Expected: file compiles with no lint errors.

**Step 2: Implement `withCircuitBreaker`**
```ts
export function withCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: CircuitBreakerOptions = {}
) {
  const config = { failureThreshold: 5, windowMs: 60_000, cooldownMs: 30_000, halfOpenMaxInFlight: 1, isFailure: defaultIsFailure, ...options };
  let state: CircuitBreakerState = 'closed';
  let failures: number[] = [];
  let halfOpenInFlight = 0;
  let nextAttemptAfter = 0;
  async function breaker(...args: TArgs): Promise<TResult> {
    const now = Date.now();
    failures = failures.filter((ts) => now - ts <= config.windowMs);
    if (state === 'open') {
      const remaining = nextAttemptAfter - now;
      if (remaining > 0) {
        const err = new CircuitBreakerOpenError(remaining);
        config.onReject?.(err);
        throw err;
      }
      state = 'halfOpen';
      config.onStateChange?.(state);
    }
    if (state === 'halfOpen' && halfOpenInFlight >= config.halfOpenMaxInFlight) {
      const err = new CircuitBreakerOpenError(nextAttemptAfter - now);
      config.onReject?.(err);
      throw err;
    }
    if (state === 'halfOpen') halfOpenInFlight += 1;
    try {
      const result = await fn(...args);
      if (state !== 'closed') {
        state = 'closed';
        failures = [];
        halfOpenInFlight = 0;
        config.onStateChange?.(state);
      }
      return result;
    } catch (error) {
      if (config.isFailure?.(error)) {
        failures.push(now);
        if (failures.length >= config.failureThreshold) {
          state = 'open';
          nextAttemptAfter = now + config.cooldownMs;
          halfOpenInFlight = 0;
          config.onStateChange?.(state);
        }
      }
      throw error;
    } finally {
      if (state === 'halfOpen' && halfOpenInFlight > 0) {
        halfOpenInFlight -= 1;
      }
    }
  }
  return breaker;
}
```
Expected: TypeScript satisfied; placeholder helper `defaultIsFailure` defined below returning `true` for network, 5xx, 429 errors.

**Step 3: Implement jittered retry helper**
```ts
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterStrategy?: 'none' | 'full' | 'equal' | 'decorrelated';
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}
export function withJitteredRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
) {
  const config = { maxRetries: 4, baseDelayMs: 500, maxDelayMs: 5_000, jitterStrategy: 'decorrelated', shouldRetry: defaultShouldRetry, ...options };
  return async function execute(...args: TArgs): Promise<TResult> {
    let lastDelay = config.baseDelayMs;
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      try {
        return await fn(...args);
      } catch (error) {
        const should = config.shouldRetry?.(error) ?? false;
        if (!should || attempt === config.maxRetries) {
          throw error;
        }
        let backoff = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);
        if (config.jitterStrategy === 'full') backoff = Math.random() * backoff;
        else if (config.jitterStrategy === 'equal') backoff = backoff / 2 + Math.random() * (backoff / 2);
        else if (config.jitterStrategy === 'decorrelated') {
          const low = config.baseDelayMs;
          const high = Math.max(low, lastDelay * 3);
          backoff = Math.min(config.maxDelayMs, low + Math.random() * (high - low));
        }
        lastDelay = backoff;
        config.onRetry?.(error, attempt + 1, Math.round(backoff));
        await new Promise((resolve) => setTimeout(resolve, Math.round(backoff)));
      }
    }
    throw new Error('Unreachable');
  };
}
```
Expected: Helper compiles and exports both wrappers plus the error class.

**Step 4: Export declarations**
```ts
export { CircuitBreakerOpenError, withCircuitBreaker, withJitteredRetry };
```
Also add matching signatures to `shared/resilience/index.d.ts` for TypeScript consumers.

---

### Task 2: Cover helpers with Jest tests

**Files:**
- Create: `backend/tests/resilience/circuitBreaker.test.ts`
- Create: `backend/tests/resilience/jitteredRetry.test.ts`
- Modify: `backend/jest.config.js` (add `<rootDir>/../shared` to roots so ts-jest transpiles shared TS if needed)

**Step 1: Write circuit breaker tests**
```ts
import { withCircuitBreaker, CircuitBreakerOpenError } from '../../../shared/resilience';

describe('withCircuitBreaker', () => {
  it('opens after consecutive failures and rejects new calls', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const wrapped = withCircuitBreaker(failing, { failureThreshold: 2, cooldownMs: 1000, windowMs: 10_000 });
    await expect(wrapped()).rejects.toThrow('boom');
    await expect(wrapped()).rejects.toThrow('boom');
    await expect(wrapped()).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('recovers after cooldown with successful half-open probe', async () => {
    jest.useFakeTimers();
    let shouldFail = true;
    const fn = jest.fn().mockImplementation(() => shouldFail ? Promise.reject(new Error('fail')) : Promise.resolve('ok'));
    const wrapped = withCircuitBreaker(fn, { failureThreshold: 1, cooldownMs: 500, windowMs: 1 });
    await expect(wrapped()).rejects.toThrow('fail');
    await expect(wrapped()).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    jest.advanceTimersByTime(500);
    shouldFail = false;
    await expect(wrapped()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
```
Run: `cd backend && npm test -- tests/resilience/circuitBreaker.test.ts` expecting PASS.

**Step 2: Write jittered retry tests**
```ts
import { withJitteredRetry } from '../../../shared/resilience';

describe('withJitteredRetry', () => {
  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    jest.useFakeTimers();
  });
  afterEach(() => {
    (Math.random as jest.Mock).mockRestore();
    jest.useRealTimers();
  });
  it('retries until success with jittered backoff', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('net'), { code: 'ECONNRESET' }))
      .mockResolvedValue('ok');
    const wrapped = withJitteredRetry(fn, { baseDelayMs: 100, maxRetries: 2, jitterStrategy: 'equal' });
    const promise = wrapped();
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('validation'));
    const wrapped = withJitteredRetry(fn, { shouldRetry: () => false });
    await expect(wrapped()).rejects.toThrow('validation');
  });
});
```
Run: `cd backend && npm test -- tests/resilience/jitteredRetry.test.ts` expecting PASS.

---

### Task 3: Replace backend retry utility and integrate helpers

**Files:**
- Delete: `backend/src/utils/retry.ts`
- Delete: `backend/src/utils/__tests__/retry.test.ts`
- Modify: `backend/src/services/llm.ts`
- Modify: `backend/src/services/timery.ts`
- Modify: `backend/src/services/__tests__/llm.test.ts`

**Step 1: Update imports**
```ts
import { withCircuitBreaker, withJitteredRetry } from '../../shared/resilience';
```
Expected: previous `withRetry` import removed.

**Step 2: Compose wrappers for LLM client**
```ts
const anthropicCall = withCircuitBreaker(
  withJitteredRetry(async (payload: MessagesCreateParams) => {
    return anthropic.messages.create(payload);
  }, {
    maxRetries: 3,
    baseDelayMs: 750,
    jitterStrategy: 'decorrelated',
  }),
  {
    failureThreshold: 3,
    cooldownMs: 15_000,
  }
);
```
Then replace direct `withRetry` usage with `anthropicCall` to keep code clean.

**Step 3: Compose wrappers for Toggl service**
```ts
const resilientTogglRequest = withCircuitBreaker(
  withJitteredRetry(<T = any>(config: AxiosRequestConfig) => togglAPI.request<T>(config), {
    maxRetries: 4,
    baseDelayMs: 500,
    jitterStrategy: 'decorrelated',
    shouldRetry: isAxiosRetryable,
  }),
  {
    failureThreshold: 5,
    windowMs: 60_000,
    cooldownMs: 30_000,
    onStateChange: (state) => console.warn(`[toggl] circuit ${state}`),
  }
);
const togglGet = <T = any>(url: string, config?: AxiosRequestConfig) =>
  resilientTogglRequest({ method: 'GET', url, ...config });
```
Update every `togglAPI.get`/`patch` to go through `togglGet` or similar, ensuring retries occur before breaker increments. Add helper `isAxiosRetryable` replicating previous logic.

**Step 4: Adjust LL.M tests**
- Mock `withCircuitBreaker` / `withJitteredRetry` combo by spying on shared module to return passthrough.
- Ensure tests assert that wrappers are invoked and that non-retryable errors bubble up immediately.
Run: `cd backend && npm test -- src/services/__tests__/llm.test.ts` expecting PASS.

**Step 5: Add focused Timery tests (optional)**
If time permits, add integration-style unit tests around new helper to ensure duplicate detection still works under circuit breaker errors (mock `resilientTogglRequest`).

---

### Task 4: Document resilience usage

**Files:**
- Modify: `CLAUDE.md` (update external API guidance)
- Create: `docs/resilience.md`

**Step 1: Update CLAUDE.md**
Add snippet showing `withCircuitBreaker(withJitteredRetry(() => api.call()))` as the mandated pattern for external services.

**Step 2: Write docs page**
Outline default options, how to tune thresholds per integration, and testing tips for simulating open breakers (use fake timers + jest mocks). Keep doc under 250 lines.

**Verification:**
- `cd backend && npm test`
- `npm run lint` (if configured) or at least `npm run build` to ensure `tsc` succeeds.
- Manual smoke: run `npm run start:backend` and hit `/api/health` to ensure no regressions.
