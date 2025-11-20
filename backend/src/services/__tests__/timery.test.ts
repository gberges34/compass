import { isTogglEntryDuplicate, type PostDoLogTimeRange } from '../timery';

jest.mock('../../config/env', () => ({
  env: {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/compass',
    API_SECRET: 'test-api-secret',
    TOGGL_API_TOKEN: 'test-toggl',
    PORT: 3001,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

const toISO = (value: string) => new Date(value).toISOString();

const createLogRange = (start: string, end: string): PostDoLogTimeRange => ({
  startTime: new Date(start),
  endTime: new Date(end),
});

describe('isTogglEntryDuplicate', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true when Toggl entry overlaps with a PostDoLog range', () => {
    const togglEntry = { start: toISO('2025-01-01T10:05:00Z'), stop: toISO('2025-01-01T10:35:00Z') };
    const postDoLogs = [createLogRange('2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z')];

    expect(isTogglEntryDuplicate(togglEntry, postDoLogs)).toBe(true);
  });

  it('still detects overlap even if completionDate would imply different window', () => {
    const togglEntry = { start: toISO('2025-01-01T09:35:00Z'), stop: toISO('2025-01-01T09:45:00Z') };
    const postDoLogs = [createLogRange('2025-01-01T09:30:00Z', '2025-01-01T09:50:00Z')];

    expect(isTogglEntryDuplicate(togglEntry, postDoLogs)).toBe(true);
  });

  it('returns false when entry is outside tolerance window', () => {
    const togglEntry = { start: toISO('2025-01-01T12:30:00Z'), stop: toISO('2025-01-01T13:00:00Z') };
    const postDoLogs = [createLogRange('2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z')];

    expect(isTogglEntryDuplicate(togglEntry, postDoLogs)).toBe(false);
  });

  it('treats running Toggl entries using the current time as end', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T10:20:00Z'));

    const togglEntry = { start: toISO('2025-01-01T10:00:00Z'), stop: null };
    const postDoLogs = [createLogRange('2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z')];

    expect(isTogglEntryDuplicate(togglEntry, postDoLogs)).toBe(true);
  });
});
