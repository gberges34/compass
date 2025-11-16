import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const repoSchema = z.object({
  repo: z.string(),
  installationId: z.number(),
  permissions: z.record(z.enum(['codex', 'cursor', 'gemini']), z.enum(['read', 'write']))
});

const configSchema = z.object({
  repos: z.array(repoSchema)
});

export type GatewayConfig = z.infer<typeof configSchema>;
export type RepoConfig = z.infer<typeof repoSchema>;

export function loadConfig(filePath = path.join(process.cwd(), 'config/github.yaml')): GatewayConfig {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return configSchema.parse(parse(raw));
  } catch (error) {
    throw new Error(`Failed to load config from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function findRepo(config: GatewayConfig, repo: string): RepoConfig {
  const repoConfig = config.repos.find(r => r.repo === repo);
  if (!repoConfig) {
    throw new Error(`repo not found: ${repo}`);
  }
  return repoConfig;
}

