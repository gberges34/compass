import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NotFoundError } from '../errors/AppError';

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
          // Convert Prisma P2025 to NotFoundError
          if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
              // Extract model name from error meta
              const modelName = error.meta?.modelName || model || 'Record';
              throw new NotFoundError(modelName as string);
            }

            // P2002 = Unique constraint violation
            if (error.code === 'P2002') {
              const fields = (error.meta?.target as string[])?.join(', ') || 'fields';
              throw new Error(`A record with the same ${fields} already exists`);
            }

            // P2003 = Foreign key constraint violation
            if (error.code === 'P2003') {
              const field = error.meta?.field_name || 'field';
              throw new Error(`Foreign key constraint failed on ${field}`);
            }
          }

          // Re-throw other errors
          throw error;
        }
      },
    },
  },
});
