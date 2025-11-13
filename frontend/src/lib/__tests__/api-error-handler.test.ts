import { getUserFriendlyError } from '../apiErrorUtils';

describe('getUserFriendlyError', () => {
  it('returns server-provided message for 400 errors', () => {
    expect(getUserFriendlyError(400, { error: 'Bad request' })).toBe('Bad request');
  });

  it('falls back to default text for 401 errors without server message', () => {
    expect(getUserFriendlyError(401)).toBe('Authentication required. Please log in again.');
  });

  it('maps 404 errors to not-found message', () => {
    expect(getUserFriendlyError(404)).toBe('The requested resource was not found.');
  });

  it('handles 429 errors with rate-limit guidance', () => {
    expect(getUserFriendlyError(429)).toBe('Too many requests. Please slow down and retry shortly.');
  });

  it('uses generic fallback when status missing', () => {
    expect(getUserFriendlyError(undefined, { message: 'Server exploded' })).toBe(
      'Server exploded'
    );
  });
});
