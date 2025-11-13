import { withJitteredRetry } from '../../../shared/resilience';

describe('withJitteredRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    (Math.random as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  it('retries until the wrapped function succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('net'), { code: 'ECONNRESET' }))
      .mockResolvedValue('ok');

    const wrapped = withJitteredRetry(fn, {
      baseDelayMs: 100,
      maxRetries: 2,
      jitterStrategy: 'equal',
    });

    const promise = wrapped();
    await Promise.resolve();
    jest.advanceTimersByTime(1_000);

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('validation'));
    const wrapped = withJitteredRetry(fn, {
      shouldRetry: () => false,
      maxRetries: 3,
    });

    await expect(wrapped()).rejects.toThrow('validation');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
