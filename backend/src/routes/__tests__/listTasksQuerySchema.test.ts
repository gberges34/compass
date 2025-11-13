import { listTasksQuerySchema } from '../tasks';

describe('listTasksQuerySchema', () => {
  it('applies sane defaults when no filters are provided', () => {
    const parsed = listTasksQuerySchema.parse({});

    expect(parsed.limit).toBe(50);
    expect(parsed.cursor).toBeUndefined();
    expect(parsed.status).toBeUndefined();
  });

  it('coerces and validates known filter values', () => {
    const parsed = listTasksQuerySchema.parse({
      status: 'NEXT',
      priority: 'MUST',
      category: 'ADMIN',
      limit: '10',
    });

    expect(parsed).toMatchObject({
      status: 'NEXT',
      priority: 'MUST',
      category: 'ADMIN',
      limit: 10,
    });
  });

  it('rejects malformed cursor values', () => {
    expect(() => listTasksQuerySchema.parse({ cursor: 'not-a-uuid' })).toThrow();
  });
});
