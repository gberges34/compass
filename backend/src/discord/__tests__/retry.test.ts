import { callWithRetry } from '../retry';

describe('callWithRetry', () => {
  it('retries failing operation and eventually succeeds', async () => {
    let calls = 0;

    const fn = jest.fn(async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error('temporary');
      }
      return 'ok';
    });

    const result = await callWithRetry('test-op', fn, {
      maxAttempts: 5,
      initialDelayMs: 10,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
