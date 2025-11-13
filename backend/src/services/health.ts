import axios from 'axios';
import { performance } from 'node:perf_hooks';
import { prisma } from '../prisma';
import { env } from '../config/env';

const TODOIST_HEALTH_URL = 'https://api.todoist.com/rest/v2/projects?limit=1';

export type DependencyName = 'database' | 'todoist' | 'healthKit' | 'toggl';

export type DependencyStatus = 'up' | 'down' | 'unknown';

export interface DependencyProbeResult {
  status: DependencyStatus;
  error?: string;
}

export interface DependencyResult extends DependencyProbeResult {
  latencyMs: number;
}

export interface DependencyCheck {
  name: DependencyName;
  required: boolean;
  timeoutMs: number;
  run: () => Promise<DependencyProbeResult>;
}

export interface RunHealthChecksOptions {
  overrides?: Partial<Record<DependencyName, Partial<DependencyCheck>>>;
  logger?: Pick<Console, 'warn'>;
}

export interface HealthCheckSummary {
  overallStatus: 'ok' | 'fail';
  dependencies: Record<DependencyName, DependencyResult>;
}

const baseChecks: DependencyCheck[] = [
  {
    name: 'database',
    required: true,
    timeoutMs: 500,
    run: checkDatabase,
  },
  {
    name: 'todoist',
    required: false,
    timeoutMs: 1500,
    run: checkTodoist,
  },
  {
    name: 'healthKit',
    required: false,
    timeoutMs: 1500,
    run: checkHealthKit,
  },
  {
    name: 'toggl',
    required: false,
    timeoutMs: 1500,
    run: checkToggl,
  },
];

export async function runHealthChecks(
  options: RunHealthChecksOptions = {}
): Promise<HealthCheckSummary> {
  const { overrides, logger = console } = options;

  const checks = baseChecks.map((check) => ({
    ...check,
    ...(overrides?.[check.name] ?? {}),
  }));

  const executions = await Promise.all(
    checks.map((check) => executeCheck(check, logger))
  );

  const dependencies = executions.reduce<Record<DependencyName, DependencyResult>>(
    (acc, { name, result }) => {
      acc[name] = result;
      return acc;
    },
    {} as Record<DependencyName, DependencyResult>
  );

  const overallStatus = checks.every((check) =>
    check.required ? dependencies[check.name]?.status === 'up' : true
  )
    ? 'ok'
    : 'fail';

  return { overallStatus, dependencies };
}

async function executeCheck(
  check: DependencyCheck,
  logger: Pick<Console, 'warn'>
) {
  const start = performance.now();

  try {
    const probe = await withTimeout(check.run(), check.timeoutMs);
    const latencyMs = Math.round(performance.now() - start);
    const result: DependencyResult = { ...probe, latencyMs };

    if (
      probe.status !== 'up' ||
      latencyMs > Math.max(50, check.timeoutMs * 0.8)
    ) {
      logger.warn?.(
        `[health] ${check.name} status=${probe.status} latency=${latencyMs}ms ${
          probe.error ? `error=${probe.error}` : ''
        }`
      );
    }

    return { name: check.name, result };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const errMessage =
      error instanceof Error ? error.message : 'Unknown error during health check';
    logger.warn?.(
      `[health] ${check.name} failed after ${latencyMs}ms: ${errMessage}`
    );

    return {
      name: check.name,
      result: {
        status: 'down',
        latencyMs,
        error: errMessage,
      },
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

async function checkDatabase(): Promise<DependencyProbeResult> {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'up' };
}

async function checkTodoist(): Promise<DependencyProbeResult> {
  if (!env.TODOIST_API_TOKEN) {
    return {
      status: 'unknown',
      error: 'TODOIST_API_TOKEN not configured',
    };
  }

  await axios.get(TODOIST_HEALTH_URL, {
    headers: {
      Authorization: `Bearer ${env.TODOIST_API_TOKEN}`,
    },
  });

  return { status: 'up' };
}

async function checkHealthKit(): Promise<DependencyProbeResult> {
  return {
    status: 'unknown',
    error: 'HealthKit integration not implemented',
  };
}

async function checkToggl(): Promise<DependencyProbeResult> {
  if (!env.TOGGL_API_TOKEN) {
    return {
      status: 'unknown',
      error: 'TOGGL_API_TOKEN not configured',
    };
  }

  return {
    status: 'unknown',
    error: 'Toggl integration not implemented',
  };
}
