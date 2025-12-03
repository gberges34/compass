import { Prisma } from '@prisma/client';
import { normalizePrismaError } from '../prismaErrorMiddleware';
import { ConflictError, BadRequestError } from '../../errors/AppError';

describe('prismaErrorExtension', () => {
  const createKnownRequestError = (
    code: string,
    meta: Record<string, unknown>
  ): Prisma.PrismaClientKnownRequestError => {
    // Pass arguments as a config object for Prisma 6.x
    const error = new Prisma.PrismaClientKnownRequestError(
      'Simulated Prisma error',
      {
        code,
        clientVersion: '7.1.0'
      }
    );
    (error as any).meta = meta;
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
