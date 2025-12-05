# Discord Time Engine Bot Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed a single-user Discord bot into the Compass backend that turns Discord rich presence and voice state into reliable Time Engine `TimeSlice` writes for Gaming (`PRIMARY` + `SEGMENT`) and Discord Social (`SOCIAL`), respecting Health Sleep, Focus, debouncing, and retries.

**Architecture:** The Discord bot runs inside the existing `backend` Node/Express service as a long-lived Discord gateway client. It listens for presence and voice events for one configured user across selected guilds, performs in-memory debouncing and conflict checks, and then calls the Time Engine service layer (`backend/src/services/timeEngine.ts`) directly. Health Sleep remains authoritative in `PRIMARY`, Focus and other sources still talk to `/api/engine`, and the bot enforces rules using category-aware start/stop calls plus a short retry wrapper.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, Discord.js (gateway client), Jest (unit/integration tests), Railway (backend hosting).

---

### Task 1: Add Discord configuration and dependency

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `backend/src/config/env.ts`
- (Optional docs) Modify: `backend/README.md`

**Step 1: Add Discord.js dependency**

In `backend/package.json`, under `"dependencies"`, add `discord.js`:

```json
"dependencies": {
  "...": "...",
  "discord.js": "^14.16.3"
}
```

From the repo root, install dependencies (this will update `backend/package-lock.json`):

```bash
cd backend
npm install
```

Expected: `discord.js` appears in `backend/package-lock.json` and `npm install` exits successfully.

**Step 2: Extend env schema with Discord settings**

Edit `backend/src/config/env.ts` to add optional Discord-related env vars. Keep existing required vars unchanged and append these inside `envSchema`:

```ts
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
  DISCORD_BOT_ENABLED: z
    .string()
    .optional(), // treat as truthy/falsey at runtime
  DISCORD_TOKEN: z.string().optional(),
  DISCORD_USER_ID: z.string().optional(),
  DISCORD_GUILD_IDS: z.string().optional(), // comma-separated guild IDs
  DISCORD_DENYLIST_APPS: z.string().optional(), // comma-separated app names/IDs (e.g. "Spotify")
});
```

Make sure `Env` type stays `z.infer<typeof envSchema>` and no other code breaks.

**Step 3: Document env variables (optional but recommended)**

In `backend/README.md`, add a short section describing the Discord bot env vars:

- `DISCORD_BOT_ENABLED`: `"true"` to start the embedded Discord bot, anything else or unset disables it.
- `DISCORD_TOKEN`: Discord bot token.
- `DISCORD_USER_ID`: Discord user ID to track (your account).
- `DISCORD_GUILD_IDS`: Comma-separated guild IDs where the bot should listen.
- `DISCORD_DENYLIST_APPS`: Comma-separated list of app names/IDs that should never count as games (start with `Spotify`).

No code changes required in this step; this is documentation only.

**Step 4: Quick env sanity check**

Run:

```bash
cd backend
NODE_ENV=test node -e "require('./dist/app.js')"
```

Expected: process exits without env validation errors, confirming the new fields are treated as optional.

---

### Task 2: Create Discord state module for Gaming and Social

**Files:**
- Create: `backend/src/discord/state.ts`
- Test: `backend/src/discord/__tests__/state.test.ts`

**Step 1: Write failing unit test for state initialization**

Create `backend/src/discord/__tests__/state.test.ts`:

```ts
import { createInitialDiscordState } from '../../discord/state';

describe('Discord state', () => {
  it('initializes gaming and social state to inactive', () => {
    const state = createInitialDiscordState();

    expect(state.gaming.currentGame).toBeNull();
    expect(state.gaming.gamingActive).toBe(false);
    expect(state.gaming.startTimer).toBeNull();
    expect(state.gaming.stopTimer).toBeNull();

    expect(state.social.socialActive).toBe(false);
    expect(state.social.inCall).toBe(false);
    expect(state.social.stopTimer).toBeNull();
  });
});
```

Run:

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/state.test.ts
```

Expected: test fails because `state.ts` does not exist or exports are missing.

**Step 2: Implement minimal state module**

Create `backend/src/discord/state.ts`:

```ts
export interface GamingState {
  currentGame: string | null;
  gamingActive: boolean;
  startTimer: NodeJS.Timeout | null;
  stopTimer: NodeJS.Timeout | null;
}

export interface SocialState {
  socialActive: boolean;
  inCall: boolean;
  stopTimer: NodeJS.Timeout | null;
}

export interface DiscordTrackingState {
  gaming: GamingState;
  social: SocialState;
}

export function createInitialDiscordState(): DiscordTrackingState {
  return {
    gaming: {
      currentGame: null,
      gamingActive: false,
      startTimer: null,
      stopTimer: null,
    },
    social: {
      socialActive: false,
      inCall: false,
      stopTimer: null,
    },
  };
}
```

**Step 3: Re-run state tests**

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/state.test.ts
```

Expected: tests pass.

---

### Task 3: Implement pure engineBridge logic (TDD) for presence and voice

**Files:**
- Create: `backend/src/discord/engineBridge.ts`
- Test: `backend/src/discord/__tests__/engineBridge.test.ts`

**Step 1: Define test harness types and basic scenarios (failing tests)**

Create `backend/src/discord/__tests__/engineBridge.test.ts` with a minimal scaffolding to test presence and voice behavior via dependency injection:

```ts
import { createInitialDiscordState } from '../../discord/state';
import {
  handlePresenceUpdate,
  handleVoiceStateUpdate,
  type EngineBridgeDeps,
  type NormalizedPresence,
  type NormalizedVoiceState,
} from '../../discord/engineBridge';

function createDeps(overrides: Partial<EngineBridgeDeps> = {}): {
  deps: EngineBridgeDeps;
  calls: {
    startedSlices: any[];
    stoppedSlices: any[];
  };
} {
  const calls = {
    startedSlices: [] as any[],
    stoppedSlices: [] as any[],
  };

  const base: EngineBridgeDeps = {
    async startSlice(input) {
      calls.startedSlices.push(input);
    },
    async stopSlice(input) {
      calls.stoppedSlices.push(input);
    },
    async stopSliceIfExists(_input) {
      // track if needed
    },
    async isSleepingNow() {
      return false;
    },
    getNow() {
      return new Date();
    },
    log: console,
    denylistedApps: new Set(['Spotify']),
  };

  return { deps: { ...base, ...overrides }, calls };
}

describe('engineBridge presence handling', () => {
  it('starts Gaming and SEGMENT after 120s of continuous game presence', async () => {
    const state = createInitialDiscordState();
    const { deps, calls } = createDeps();

    const presence: NormalizedPresence = {
      hasGame: true,
      gameName: 'Hades',
      isOnlyDenylisted: false,
    };

    // First presence tick should not start anything yet
    await handlePresenceUpdate(presence, state, deps);
    expect(calls.startedSlices).toHaveLength(0);

    // Simulate timer firing after 120s via explicit call
    await handlePresenceUpdate(
      { ...presence, forceStartNow: true },
      state,
      deps
    );

    expect(calls.startedSlices).toEqual([
      { category: 'Gaming', dimension: 'PRIMARY', source: 'API' },
      { category: 'Hades', dimension: 'SEGMENT', source: 'API' },
    ]);
  });

  it('ignores Spotify-only presence as non-gaming', async () => {
    const state = createInitialDiscordState();
    const { deps, calls } = createDeps();

    const presence: NormalizedPresence = {
      hasGame: false,
      gameName: null,
      isOnlyDenylisted: true,
    };

    await handlePresenceUpdate(presence, state, deps);
    expect(calls.startedSlices).toHaveLength(0);
    expect(calls.stoppedSlices).toHaveLength(0);
  });
});

describe('engineBridge voice handling', () => {
  it('starts SOCIAL Discord Call immediately on join', async () => {
    const state = createInitialDiscordState();
    const { deps, calls } = createDeps();

    const voice: NormalizedVoiceState = {
      inTrackedVoice: true,
      forceStartNow: true,
    };

    await handleVoiceStateUpdate(voice, state, deps);

    expect(calls.startedSlices).toEqual([
      { category: 'Discord Call', dimension: 'SOCIAL', source: 'API' },
    ]);
  });
});
```

Notes:
- The `forceStartNow`/`forceStopNow` flags are test-only hooks to simulate debounced timers firing without using real timers.
- For now, tests only cover “happy path” starts; later tests can be added for debounced stops, Sleep guard, and Focus interactions.

Run:

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/engineBridge.test.ts
```

Expected: tests fail because `engineBridge.ts` and types are missing.

**Step 2: Implement engineBridge with debounced logic (minimal to satisfy tests)**

Create `backend/src/discord/engineBridge.ts`:

```ts
import type { DiscordTrackingState } from './state';
import type { StartSliceInput, StopSliceInput } from '../services/timeEngine';

export interface EngineBridgeDeps {
  startSlice(input: StartSliceInput): Promise<void>;
  stopSlice(input: StopSliceInput): Promise<void>;
  stopSliceIfExists(input: StopSliceInput): Promise<void>;
  isSleepingNow(): Promise<boolean>;
  getNow(): Date;
  log: Pick<Console, 'info' | 'warn' | 'error'>;
  denylistedApps: Set<string>;
}

export interface NormalizedPresence {
  hasGame: boolean;
  gameName: string | null;
  isOnlyDenylisted: boolean;
  forceStartNow?: boolean; // test helper
}

export interface NormalizedVoiceState {
  inTrackedVoice: boolean;
  forceStartNow?: boolean; // test helper
}

const GAMING_START_DEBOUNCE_MS = 120_000;
const GAMING_STOP_DEBOUNCE_MS = 60_000;
const SOCIAL_STOP_DEBOUNCE_MS = 30_000;

export async function handlePresenceUpdate(
  presence: NormalizedPresence,
  state: DiscordTrackingState,
  deps: EngineBridgeDeps
): Promise<void> {
  if (presence.isOnlyDenylisted) {
    return;
  }

  // No game present: schedule stop if active
  if (!presence.hasGame || !presence.gameName) {
    if (state.gaming.gamingActive && !presence.forceStartNow) {
      if (state.gaming.stopTimer) {
        clearTimeout(state.gaming.stopTimer);
      }
      state.gaming.stopTimer = setTimeout(async () => {
        try {
          await deps.stopSlice({ dimension: 'PRIMARY', category: 'Gaming' });
          await deps.stopSliceIfExists({ dimension: 'SEGMENT' });
          state.gaming.gamingActive = false;
          state.gaming.currentGame = null;
        } catch (error) {
          deps.log.error('Failed to stop Gaming slice', error);
        }
      }, GAMING_STOP_DEBOUNCE_MS);
    }
    return;
  }

  // Game present: schedule start
  const gameName = presence.gameName;

  const startNow = presence.forceStartNow === true;

  const scheduleStart = async () => {
    if (await deps.isSleepingNow()) {
      deps.log.info('Skipping Gaming start due to Sleep');
      return;
    }

    await deps.startSlice({
      category: 'Gaming',
      dimension: 'PRIMARY',
      source: 'API',
    });

    await deps.startSlice({
      category: gameName,
      dimension: 'SEGMENT',
      source: 'API',
    });

    state.gaming.gamingActive = true;
    state.gaming.currentGame = gameName;
  };

  if (startNow) {
    await scheduleStart();
    return;
  }

  if (state.gaming.startTimer) {
    clearTimeout(state.gaming.startTimer);
  }

  state.gaming.startTimer = setTimeout(() => {
    scheduleStart().catch((error) => deps.log.error('Failed to start Gaming slice', error));
  }, GAMING_START_DEBOUNCE_MS);
}

export async function handleVoiceStateUpdate(
  voice: NormalizedVoiceState,
  state: DiscordTrackingState,
  deps: EngineBridgeDeps
): Promise<void> {
  if (voice.inTrackedVoice) {
    // Joining call
    state.social.inCall = true;
    if (!state.social.socialActive || voice.forceStartNow) {
      await deps.startSlice({
        category: 'Discord Call',
        dimension: 'SOCIAL',
        source: 'API',
      });
      state.social.socialActive = true;
    }
    if (state.social.stopTimer) {
      clearTimeout(state.social.stopTimer);
      state.social.stopTimer = null;
    }
    return;
  }

  // Leaving all tracked voice channels: debounce stop
  state.social.inCall = false;

  if (state.social.stopTimer) {
    clearTimeout(state.social.stopTimer);
  }

  state.social.stopTimer = setTimeout(async () => {
    try {
      await deps.stopSlice({
        dimension: 'SOCIAL',
        category: 'Discord Call',
      });
      state.social.socialActive = false;
    } catch (error) {
      deps.log.error('Failed to stop Discord Call slice', error);
    }
  }, SOCIAL_STOP_DEBOUNCE_MS);
}
```

This implementation:
- Uses `forceStartNow` from tests to bypass real timers and debounce, while keeping timers for production use.
- Implements the “no game” path and Social join/leave path in a straightforward way.
- Defers Sleep vs Gaming vs Focus nuances to later tests and refinements if needed.

**Step 3: Re-run engineBridge tests**

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/engineBridge.test.ts
```

Expected: tests pass.

---

### Task 4: Implement a Discord client that normalizes events and calls engineBridge

**Files:**
- Create: `backend/src/discord/client.ts`
- Modify: `backend/src/index.ts`

**Step 1: Implement Discord client initializer**

Create `backend/src/discord/client.ts`:

```ts
import { Client, GatewayIntentBits, Partials, type Presence, type VoiceState } from 'discord.js';
import { env } from '../config/env';
import { prisma } from '../prisma';
import { createInitialDiscordState } from './state';
import { handlePresenceUpdate, handleVoiceStateUpdate } from './engineBridge';
import type { EngineBridgeDeps, NormalizedPresence, NormalizedVoiceState } from './engineBridge';

let client: Client | null = null;

function buildDeps(): EngineBridgeDeps {
  const denylist = new Set(
    (env.DISCORD_DENYLIST_APPS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return {
    async startSlice(input) {
      const { startSlice } = await import('../services/timeEngine');
      await startSlice(input);
    },
    async stopSlice(input) {
      const { stopSlice } = await import('../services/timeEngine');
      await stopSlice(input);
    },
    async stopSliceIfExists(input) {
      const { stopSliceIfExists } = await import('../services/timeEngine');
      await stopSliceIfExists(input);
    },
    async isSleepingNow() {
      const now = new Date();
      const sleep = await prisma.timeSlice.findFirst({
        where: {
          category: 'Sleep',
          dimension: 'PRIMARY',
          isLocked: true,
          start: { lte: now },
          OR: [{ end: null }, { end: { gte: now } }],
        },
      });
      return Boolean(sleep);
    },
    getNow() {
      return new Date();
    },
    log: console,
    denylistedApps: denylist,
  };
}

function normalizePresence(p: Presence, deps: EngineBridgeDeps): NormalizedPresence {
  const activities = p.activities || [];

  const playing = activities.filter((a) => a.type === 0); // Playing
  const hasAnyPlaying = playing.length > 0;

  const hasNonDenylistedGame = playing.some(
    (a) => a.name && !deps.denylistedApps.has(a.name)
  );

  const gameName = hasNonDenylistedGame
    ? playing.find((a) => a.name && !deps.denylistedApps.has(a.name))?.name || null
    : null;

  const isOnlyDenylisted = hasAnyPlaying && !hasNonDenylistedGame;

  return {
    hasGame: !!gameName,
    gameName,
    isOnlyDenylisted,
  };
}

function normalizeVoiceState(v: VoiceState): NormalizedVoiceState {
  const inTrackedVoice = Boolean(v.channelId);
  return {
    inTrackedVoice,
  };
}

export async function initDiscordBot(): Promise<void> {
  if (!env.DISCORD_BOT_ENABLED || env.DISCORD_BOT_ENABLED.toLowerCase() !== 'true') {
    return;
  }

  if (!env.DISCORD_TOKEN || !env.DISCORD_USER_ID) {
    console.warn('Discord bot enabled but DISCORD_TOKEN or DISCORD_USER_ID missing; skipping init.');
    return;
  }

  if (client) {
    return;
  }

  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ];

  client = new Client({
    intents,
    partials: [Partials.GuildMember],
  });

  const state = createInitialDiscordState();
  const deps = buildDeps();

  client.on('ready', () => {
    console.log(`Discord bot logged in as ${client?.user?.tag}`);
  });

  client.on('presenceUpdate', async (_oldPresence, newPresence) => {
    try {
      if (!newPresence || newPresence.userId !== env.DISCORD_USER_ID) return;
      const normalized = normalizePresence(newPresence, deps);
      await handlePresenceUpdate(normalized, state, deps);
    } catch (error) {
      console.error('Error in presenceUpdate handler', error);
    }
  });

  client.on('voiceStateUpdate', async (_oldState, newState) => {
    try {
      if (!newState || newState.id !== env.DISCORD_USER_ID) return;
      const normalized = normalizeVoiceState(newState);
      await handleVoiceStateUpdate(normalized, state, deps);
    } catch (error) {
      console.error('Error in voiceStateUpdate handler', error);
    }
  });

  await client.login(env.DISCORD_TOKEN);
}

export async function shutdownDiscordBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
  }
}
```

This client:
- Guards on `DISCORD_BOT_ENABLED === 'true'`.
- Normalizes presence (filtering denylisted apps) and voice (any channel = “in call”) into simple types used by `engineBridge`.
- Uses Prisma to enforce the Sleep guard.

**Step 2: Wire Discord bot into backend startup**

Edit `backend/src/index.ts` to initialize and shut down the Discord bot alongside the HTTP server:

```ts
import { app } from './app';
import { env } from './config/env';
import { disconnect } from './prisma';
import { initDiscordBot, shutdownDiscordBot } from './discord/client';

const PORT = env.PORT;

if (env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Compass API server running on port ${PORT}`);
  });

  // Initialize Discord bot asynchronously; log errors but don't crash API
  initDiscordBot().catch((error) => {
    console.error('Failed to initialize Discord bot', error);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('HTTP server closed.');
          resolve();
        });
      });

      await shutdownDiscordBot();
      console.log('Discord bot shut down.');

      await disconnect();
      console.log('Database connections closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

**Step 3: Manual smoke test locally**

With `DISCORD_BOT_ENABLED=false` or unset, run:

```bash
cd backend
npm run dev
```

Expected: server starts as before, no Discord bot logs, no crashes.

Then set up `.env` for local Discord testing (using a bot in a test server) and verify logs show the bot login message when `DISCORD_BOT_ENABLED=true`.

---

### Task 5: Add basic retry wrapper (optional enhancement)

**Files:**
- Create: `backend/src/discord/retry.ts`
- Modify: `backend/src/discord/client.ts`

**Step 1: Write failing unit test for retry helper**

Create `backend/src/discord/__tests__/retry.test.ts`:

```ts
import { callWithRetry } from '../../discord/retry';

describe('callWithRetry', () => {
  it('retries failing operation and eventually succeeds', async () => {
    let calls = 0;

    const fn = jest.fn(async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error('temporary');
      }
      return 'ok';
    });

    const result = await callWithRetry('test-op', fn, {
      maxAttempts: 5,
      initialDelayMs: 10,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

Run:

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/retry.test.ts
```

Expected: test fails because `retry.ts` is missing.

**Step 2: Implement retry helper**

Create `backend/src/discord/retry.ts`:

```ts
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

export async function callWithRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 200;

  let attempt = 0;
  let delay = initialDelayMs;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        // Final failure
        // eslint-disable-next-line no-console
        console.error(`[${label}] failed after ${attempt} attempts`, error);
        throw error;
      }
      // eslint-disable-next-line no-console
      console.warn(
        `[${label}] attempt ${attempt} failed, retrying in ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
```

Re-run the retry test:

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/retry.test.ts
```

Expected: tests pass.

**Step 3: Use retry wrapper in Discord client deps**

Update `buildDeps()` in `backend/src/discord/client.ts` to wrap Time Engine calls:

```ts
import { callWithRetry } from './retry';

function buildDeps(): EngineBridgeDeps {
  const denylist = new Set(...);

  return {
    async startSlice(input) {
      await callWithRetry('discord-startSlice', async () => {
        const { startSlice } = await import('../services/timeEngine');
        await startSlice(input);
      });
    },
    async stopSlice(input) {
      await callWithRetry('discord-stopSlice', async () => {
        const { stopSlice } = await import('../services/timeEngine');
        await stopSlice(input);
      });
    },
    async stopSliceIfExists(input) {
      await callWithRetry('discord-stopSliceIfExists', async () => {
        const { stopSliceIfExists } = await import('../services/timeEngine');
        await stopSliceIfExists(input);
      });
    },
    // ...rest unchanged
  };
}
```

Run all Discord-related tests:

```bash
cd backend
npm test -- src/discord/__tests__
```

Expected: all pass.

---

### Task 6: End-to-end verification and monitoring

**Files:**
- Existing: `backend/src/services/timeEngine.ts`
- Existing: `backend/src/routes/engine.ts`
- (Optional) New: `backend/src/discord/status.ts` and a debug route (only if needed)

**Step 1: Manual E2E verification in local/dev environment**

1. Configure `.env` in `backend` with:
   - `DISCORD_BOT_ENABLED=true`
   - `DISCORD_TOKEN=...`
   - `DISCORD_USER_ID=...`
   - `DISCORD_GUILD_IDS=...`
   - `DISCORD_DENYLIST_APPS=Spotify`
2. Run the backend and watch logs:

```bash
cd backend
npm run dev
```

3. From your Discord client:
   - Start playing a game on a tracked guild and stay in it for > 2 minutes.
   - Confirm logs show Gaming start, and `/api/engine/slices` shows new PRIMARY `Gaming` and SEGMENT `<game>` slices.
   - Stop playing the game and wait > 60s, confirm PRIMARY Gaming and SEGMENT slices close.
   - Join a voice channel on a tracked guild, confirm SOCIAL `Discord Call` is started; leave for > 30s, confirm it stops.

**Step 2: Sleep interaction check**

1. Use your existing Health sleep-sync shortcut to push a Sleep block that overlaps a Gaming period.
2. Confirm:
   - A locked `PRIMARY: Sleep` slice is present and overlapping.
   - Future Gaming attempts during Sleep are skipped (no new Gaming slices).
   - Discord Social slices still appear if you join calls during Sleep.

**Step 3: Add minimal monitoring hooks (optional)**

Optionally, create a tiny diagnostic helper `backend/src/discord/status.ts` that exports a function returning the current `DiscordTrackingState`, and wire it into a development-only route (e.g. `/api/debug/discord-status`) so you can introspect `gamingActive`, `currentGame`, and `socialActive` while debugging.

No changes to Time Engine routes are required; the bot only calls existing service functions.

---

Plan complete and saved to `docs/plans/2025-12-05-discord-time-engine-bot.md`. To implement this, use the **superpowers:executing-plans** skill and follow the tasks step-by-step, writing tests first where specified and verifying behavior with both automated tests and manual Discord sessions.

