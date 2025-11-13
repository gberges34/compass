import {
  withCircuitBreaker,
  CircuitBreakerOpenError,
} from '../../../shared/resilience';

describe('withCircuitBreaker', () => {
  it('opens the circuit after hitting the failure threshold', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const wrapped = withCircuitBreaker(failing, {
      failureThreshold: 2,
      cooldownMs: 1_000,
      windowMs: 10_000,
    });

    await expect(wrapped()).rejects.toThrow('boom');
    await expect(wrapped()).rejects.toThrow('boom');
    await expect(wrapped()).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('recovers after cooldown with a successful half-open probe', async () => {
    jest.useFakeTimers();

    let shouldFail = true;
    const fn = jest.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error('fail');
      }
      return 'ok';
    });

    const wrapped = withCircuitBreaker(fn, {
      failureThreshold: 1,
      cooldownMs: 500,
      windowMs: 1,
    });

    await expect(wrapped()).rejects.toThrow('fail');
    await expect(wrapped()).rejects.toBeInstanceOf(CircuitBreakerOpenError);

    jest.advanceTimersByTime(500);
    shouldFail = false;

    await expect(wrapped()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
