import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { normalizePrismaError } from '../prismaErrorMiddleware';
import { ConflictError, BadRequestError } from '../../errors/AppError';

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
});

