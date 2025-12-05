// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required variables
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  API_SECRET: z.string().min(1, 'API_SECRET is required'),

  // Optional with defaults
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Optional (for features)
  TODOIST_API_TOKEN: z.string().optional(),
  TOGGL_API_TOKEN: z.string().optional(),
  HEALTHKIT_API_KEY: z.string().optional(),
  
  // Optional (for Prisma migrations)
  SHADOW_DATABASE_URL: z.string().url().optional(),

  // Optional (for Discord bot)
  DISCORD_BOT_ENABLED: z.string().optional(),
  DISCORD_TOKEN: z.string().optional(),
  DISCORD_USER_ID: z.string().optional(),
  DISCORD_GUILD_IDS: z.string().optional(), // comma-separated
  DISCORD_DENYLIST_APPS: z.string().optional(), // comma-separated
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables.
 * Server will fail on startup if any required variables are missing or invalid.
 */
export const env = envSchema.parse(process.env);
