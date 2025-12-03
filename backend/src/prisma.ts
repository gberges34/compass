import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { prismaErrorExtension } from './middleware/prismaErrorMiddleware';
import { env } from './config/env';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> };

// Create Prisma client with error handling extension
const createPrismaClient = () => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Apply error handling extension (Prisma 6 style)
  return client.$extends(prismaErrorExtension);
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
