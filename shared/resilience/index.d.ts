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
  readonly cooldownRemainingMs: number;
  constructor(cooldownRemainingMs: number);
}

export function withCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: CircuitBreakerOptions
): (...args: TArgs) => Promise<TResult>;

export type JitterStrategy = 'none' | 'full' | 'equal' | 'decorrelated';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterStrategy?: JitterStrategy;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export function withJitteredRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: RetryOptions
): (...args: TArgs) => Promise<TResult>;

export function defaultIsFailure(error: unknown): boolean;
export function defaultShouldRetry(error: unknown): boolean;
