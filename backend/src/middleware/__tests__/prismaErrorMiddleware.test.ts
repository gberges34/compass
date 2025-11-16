import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { normalizePrismaError } from '../prismaErrorMiddleware';
import { NotFoundError, ConflictError, BadRequestError } from '../../errors/AppError';

describe('prismaErrorExtension', () => {
  const createKnownRequestError = (
    code: string,
    meta: Record<string, unknown>
  ): PrismaClientKnownRequestError => {
    const error = new PrismaClientKnownRequestError('Simulated Prisma error', {
      code,
      clientVersion: '6.19.0',
      meta,
    });
    return error;
  };

  it('throws ConflictError for unique constraint violations', async () => {
    const duplicate = createKnownRequestError('P2002', {
      target: ['DailyPlan_date_key'],
    });

    const normalized = normalizePrismaError(duplicate, 'DailyPlan');
    expect(normalized).toBeInstanceOf(ConflictError);
    expect(normalized?.message).toContain('DailyPlan_date_key');
  });

  it('throws BadRequestError for foreign key violations', async () => {
    const fkError = createKnownRequestError('P2003', { field_name: 'taskId' });

    const normalized = normalizePrismaError(fkError, 'DailyPlan');
    expect(normalized).toBeInstanceOf(BadRequestError);
    expect(normalized?.message).toContain('taskId');
  });

  it('throws NotFoundError for record not found errors', async () => {
    const notFoundError = createKnownRequestError('P2025', {
      modelName: 'Task',
    });

    const normalized = normalizePrismaError(notFoundError, 'Task');
    expect(normalized).toBeInstanceOf(NotFoundError);
    expect(normalized?.message).toContain('Task');
  });

  it('uses provided model name when meta.modelName is missing', async () => {
    const notFoundError = createKnownRequestError('P2025', {});

    const normalized = normalizePrismaError(notFoundError, 'DailyPlan');
    expect(normalized).toBeInstanceOf(NotFoundError);
    expect(normalized?.message).toContain('DailyPlan');
  });

  it('returns null for unhandled error codes', async () => {
    const unhandledError = createKnownRequestError('P1000', {});

    const normalized = normalizePrismaError(unhandledError, 'Task');
    expect(normalized).toBeNull();
  });
});
