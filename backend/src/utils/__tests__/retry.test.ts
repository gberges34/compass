// backend/src/utils/__tests__/retry.test.ts
import { withRetry } from '../retry';

describe('withRetry', () => {
  it('should succeed on first attempt when no error', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error and eventually succeed', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ECONNRESET' })
      .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should retry on 5xx server error', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx client error', async () => {
    const mockFn = jest.fn()
      .mockRejectedValue({ status: 400, message: 'Bad Request' });

    await expect(withRetry(mockFn)).rejects.toEqual({
      status: 400,
      message: 'Bad Request',
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw after max attempts', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ECONNRESET' });

    await expect(withRetry(mockFn, { maxRetries: 2 })).rejects.toEqual({
      code: 'ECONNRESET',
    });

    expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should use exponential backoff delays', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ETIMEDOUT' });
    const startTime = Date.now();

    try {
      await withRetry(mockFn, { maxRetries: 3, initialDelay: 50 });
    } catch (error) {
      // Expected to throw
    }

    const elapsed = Date.now() - startTime;

    // Total expected delay: 50 + 100 + 200 = 350ms
    // Allow some tolerance for execution time
    expect(elapsed).toBeGreaterThanOrEqual(350);
    expect(elapsed).toBeLessThan(500);
    expect(mockFn).toHaveBeenCalledTimes(4); // initial + 3 retries
  });
});
