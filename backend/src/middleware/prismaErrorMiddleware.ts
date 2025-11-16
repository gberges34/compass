import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/AppError';

export const normalizePrismaError = (
  error: PrismaClientKnownRequestError,
  model?: string
) => {
  if (error.code === 'P2025') {
    const modelName = (error.meta?.modelName as string) || model || 'Record';
    return new NotFoundError(modelName);
  }

  if (error.code === 'P2002') {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? (target as string[]).join(', ')
      : (target as string) || 'fields';
    return new ConflictError(`A record with the same ${fields} already exists`, {
      target,
    });
  }

  if (error.code === 'P2003') {
    const field = (error.meta?.field_name as string) || 'field';
    return new BadRequestError(`Foreign key constraint failed on ${field}`);
  }

  return null;
};

/**
 * Prisma extension to convert P2025 errors to NotFoundError
 *
 * P2025 = "An operation failed because it depends on one or more records
 * that were required but not found"
 *
 * This catches not-found errors at the Prisma level, including within transactions.
 *
 * Prisma 6 uses client extensions instead of the deprecated $use middleware.
 */
export const prismaErrorExtension = Prisma.defineExtension({
  name: 'errorHandling',
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        try {
          return await query(args);
        } catch (error: unknown) {
          if (error instanceof PrismaClientKnownRequestError) {
            const normalizedError = normalizePrismaError(error, model);
            if (normalizedError) {
              throw normalizedError;
            }
          }

          // Re-throw other errors
          throw error;
        }
      },
    },
  },
});
