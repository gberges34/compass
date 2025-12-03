import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { prismaErrorExtension } from './middleware/prismaErrorMiddleware';
import { env } from './config/env';

// Singleton pattern for Prisma Client and Pool
const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
  pool: Pool;
};

// Create Prisma client with error handling extension
const createPrismaClient = () => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Store pool reference for cleanup
  globalForPrisma.pool = pool;

  // Apply error handling extension (Prisma 6 style)
  return client.$extends(prismaErrorExtension);
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export pool for cleanup (may be undefined if prisma was already initialized)
export const pool: Pool | undefined = globalForPrisma.pool;

/**
 * Gracefully closes the database pool and disconnects Prisma client.
 * Should be called during application shutdown.
 * Disconnects Prisma first to ensure all pending operations complete,
 * then closes the connection pool.
 * Accesses the pool dynamically to handle cases where prisma was already initialized.
 */
export async function disconnect(): Promise<void> {
  // First disconnect Prisma client to complete any pending operations
  await prisma.$disconnect();
  // Then close the pool to terminate all connections
  // Access dynamically to handle cases where createPrismaClient() wasn't called
  const poolToClose = globalForPrisma.pool;
  if (poolToClose) {
    await poolToClose.end();
  }
}
