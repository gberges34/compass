let isTogglEntryDuplicate: typeof import('../timery').isTogglEntryDuplicate;

const toISO = (value: string) => new Date(value).toISOString();

const createLogRange = (start: string, end: string) => ({
  startTime: new Date(start),
  endTime: new Date(end),
});

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/compass';
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-anthropic';
  process.env.TOGGL_API_TOKEN = process.env.TOGGL_API_TOKEN || 'test-toggl';

  ({ isTogglEntryDuplicate } = await import('../timery'));
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
