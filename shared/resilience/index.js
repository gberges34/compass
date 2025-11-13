const networkErrorCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE']);

class CircuitBreakerOpenError extends Error {
  constructor(cooldownRemainingMs) {
    super('Circuit breaker open');
    this.name = 'CircuitBreakerOpenError';
    this.cooldownRemainingMs = Math.max(0, cooldownRemainingMs);
  }
}

const defaultCircuitBreakerOptions = {
  failureThreshold: 5,
  windowMs: 60_000,
  cooldownMs: 30_000,
  halfOpenMaxInFlight: 1,
  isFailure: defaultIsFailure,
  onStateChange: undefined,
  onReject: undefined,
};

function withCircuitBreaker(fn, options = {}) {
  const config = { ...defaultCircuitBreakerOptions, ...options };
  let state = 'closed';
  let failureTimestamps = [];
  let nextAttemptAfter = 0;
  let halfOpenInFlight = 0;

  const changeState = (next) => {
    if (state !== next) {
      state = next;
      config.onStateChange?.(state);
    }
  };

  return async function circuitBreakerWrapper(...args) {
    const now = Date.now();
    failureTimestamps = failureTimestamps.filter(ts => now - ts <= config.windowMs);

    if (state === 'open') {
      const remaining = nextAttemptAfter - now;
      if (remaining > 0) {
        const error = new CircuitBreakerOpenError(remaining);
        config.onReject?.(error);
        throw error;
      }
      changeState('halfOpen');
    }

    if (state === 'halfOpen') {
      if (halfOpenInFlight >= config.halfOpenMaxInFlight) {
        const error = new CircuitBreakerOpenError(nextAttemptAfter - now);
        config.onReject?.(error);
        throw error;
      }
      halfOpenInFlight += 1;
    }

    try {
      const result = await fn(...args);
      failureTimestamps = [];
      halfOpenInFlight = 0;
      changeState('closed');
      return result;
    } catch (error) {
      if (config.isFailure?.(error)) {
        failureTimestamps.push(now);
        if (failureTimestamps.length >= config.failureThreshold) {
          nextAttemptAfter = now + config.cooldownMs;
          halfOpenInFlight = 0;
          changeState('open');
        } else if (state === 'halfOpen') {
          nextAttemptAfter = now + config.cooldownMs;
          halfOpenInFlight = 0;
          changeState('open');
        }
      } else if (state === 'halfOpen') {
        halfOpenInFlight = Math.max(halfOpenInFlight - 1, 0);
        changeState('closed');
      }
      throw error;
    } finally {
      if (state === 'halfOpen' && halfOpenInFlight > 0) {
        halfOpenInFlight -= 1;
      }
    }
  };
}

const defaultRetryOptions = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
  jitterStrategy: 'decorrelated',
  shouldRetry: defaultShouldRetry,
  onRetry: undefined,
};

function withJitteredRetry(fn, options = {}) {
  const config = { ...defaultRetryOptions, ...options };

  return async function retryWrapper(...args) {
    let lastDelay = config.baseDelayMs;
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      try {
        return await fn(...args);
      } catch (error) {
        const shouldRetry = config.shouldRetry?.(error) ?? false;
        if (!shouldRetry || attempt === config.maxRetries) {
          throw error;
        }

        let delayMs = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);
        delayMs = applyJitter(delayMs, lastDelay, config);
        lastDelay = delayMs;

        config.onRetry?.(error, attempt + 1, Math.round(delayMs));
        await sleep(delayMs);
      }
    }

    throw new Error('Retry wrapper exited unexpectedly');
  };
}

function applyJitter(delayMs, lastDelay, config) {
  switch (config.jitterStrategy) {
    case 'full':
      return Math.random() * delayMs;
    case 'equal':
      return delayMs / 2 + Math.random() * (delayMs / 2);
    case 'decorrelated': {
      const low = config.baseDelayMs;
      const high = Math.max(low, lastDelay * 3);
      return Math.min(config.maxDelayMs, low + Math.random() * (high - low));
    }
    case 'none':
    default:
      return delayMs;
  }
}

function defaultIsFailure(error) {
  if (!error || typeof error !== 'object') {
    return true;
  }

  const code = error.code || error?.response?.code;
  if (code && networkErrorCodes.has(code)) {
    return true;
  }

  const status = error.status || error?.response?.status;
  if (typeof status === 'number') {
    if (status >= 500 || status === 429) {
      return true;
    }
    if (status >= 400) {
      return false;
    }
  }

  return true;
}

function defaultShouldRetry(error) {
  return defaultIsFailure(error);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  withCircuitBreaker,
  withJitteredRetry,
  CircuitBreakerOpenError,
  defaultIsFailure,
  defaultShouldRetry,
};
