// backend/src/utils/retry.ts

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 4,
  initialDelay: 1000,
  shouldRetry: defaultShouldRetry,
};

function defaultShouldRetry(error: any): boolean {
  // Retry on network errors
  const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
  if (error.code && networkErrors.includes(error.code)) {
    return true;
  }

  // Retry on 5xx server errors
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }

  // Retry on 429 rate limit
  if (error.status === 429) {
    return true;
  }

  // Don't retry 4xx client errors
  if (error.status && error.status >= 400 && error.status < 500) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry(error);
      const isLastAttempt = attempt === opts.maxRetries;

      if (!shouldRetry || isLastAttempt) {
        // Don't retry, throw immediately
        if (!shouldRetry) {
          console.error('[Retry] Non-retryable error:', error);
        } else {
          console.error(`[Retry] All ${opts.maxRetries} retries exhausted`);
        }
        throw error;
      }

      // Calculate exponential backoff delay
      const delayMs = opts.initialDelay * Math.pow(2, attempt);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. ` +
        `Retrying in ${delayMs}ms...`,
        { error: error.message || error.code }
      );

      await delay(delayMs);
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError;
}
