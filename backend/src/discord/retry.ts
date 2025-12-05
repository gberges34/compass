export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

export async function callWithRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 200;

  let attempt = 0;
  let delay = initialDelayMs;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        // eslint-disable-next-line no-console
        console.error(`[${label}] failed after ${attempt} attempts`, error);
        throw error;
      }
      // eslint-disable-next-line no-console
      console.warn(`[${label}] attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
