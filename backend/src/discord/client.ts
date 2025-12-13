import {
  Client,
  GatewayIntentBits,
  Partials,
  type Presence,
  type VoiceState,
} from 'discord.js';
import { env } from '../config/env';
import { prisma } from '../prisma';
import { createInitialDiscordState } from './state';
import {
  handlePresenceUpdate,
  handleVoiceStateUpdate,
  type EngineBridgeDeps,
  type NormalizedPresence,
  type NormalizedVoiceState,
} from './engineBridge';
import { callWithRetry } from './retry';

let client: Client | null = null;
let debugInterval: NodeJS.Timeout | null = null;
const loggedVoiceMismatches = new Set<string>();
const loggedPresenceMismatches = new Set<string>();

function normalizeEnvString(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseCommaSeparated(value?: string): Set<string> {
  const normalized = normalizeEnvString(value);
  if (!normalized) return new Set();
  return new Set(
    normalized
      .split(',')
      .map((s) => s.trim())
      .map((s) => normalizeEnvString(s) || '')
      .filter(Boolean)
  );
}

function buildDeps(): EngineBridgeDeps {
  const denylist = parseCommaSeparated(env.DISCORD_DENYLIST_APPS);

  return {
    async startSlice(input) {
      await callWithRetry('discord-startSlice', async () => {
        const { startSlice } = await import('../services/timeEngine');
        const slice = await startSlice(input);
        if (input.dimension === 'PRIMARY') {
          const { syncPrimaryStart } = await import('../services/togglProjection');
          syncPrimaryStart(slice).catch((error) =>
            console.error('Toggl projection failed (discord PRIMARY start)', error)
          );
        }
      });
    },
    async stopSlice(input) {
      await callWithRetry('discord-stopSlice', async () => {
        const { stopSlice } = await import('../services/timeEngine');
        const slice = await stopSlice(input);
        if (input.dimension === 'PRIMARY') {
          const { syncPrimaryStop } = await import('../services/togglProjection');
          syncPrimaryStop(slice).catch((error) =>
            console.error('Toggl projection failed (discord PRIMARY stop)', error)
          );
        }
      });
    },
    async stopSliceIfExists(input) {
      await callWithRetry('discord-stopSliceIfExists', async () => {
        const { stopSliceIfExists } = await import('../services/timeEngine');
        const slice = await stopSliceIfExists(input);
        if (input.dimension === 'PRIMARY') {
          const { syncPrimaryStop } = await import('../services/togglProjection');
          syncPrimaryStop(slice).catch((error) =>
            console.error('Toggl projection failed (discord PRIMARY stopIfExists)', error)
          );
        }
      });
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

function normalizePresence(
  presence: Presence,
  denylist: Set<string>
): NormalizedPresence {
  const activities = presence.activities || [];

  const playing = activities.filter((a) => a.type === 0); // Playing
  const hasAnyPlaying = playing.length > 0;

  const hasNonDenylistedGame = playing.some(
    (a) => a.name && !denylist.has(a.name)
  );

  const gameName = hasNonDenylistedGame
    ? playing.find((a) => a.name && !denylist.has(a.name))?.name || null
    : null;

  const isOnlyDenylisted = hasAnyPlaying && !hasNonDenylistedGame;

  return {
    hasGame: !!gameName,
    gameName,
    isOnlyDenylisted,
  };
}

function normalizeVoiceState(
  voice: VoiceState,
  allowedGuilds: Set<string>
): NormalizedVoiceState {
  const guildId = voice.guild?.id;
  const inAllowedGuild =
    allowedGuilds.size === 0 || (guildId ? allowedGuilds.has(guildId) : false);
  const inTrackedVoice = inAllowedGuild && Boolean(voice.channelId);
  return {
    inTrackedVoice,
  };
}

function isAllowedGuild(guildId: string | undefined, allowed: Set<string>): boolean {
  if (!guildId) return false;
  if (allowed.size === 0) return true;
  return allowed.has(guildId);
}

export async function initDiscordBot(): Promise<void> {
  if (!env.DISCORD_BOT_ENABLED || env.DISCORD_BOT_ENABLED.toLowerCase() !== 'true') {
    return;
  }

  const discordToken = normalizeEnvString(env.DISCORD_TOKEN);
  const trackedUserId = normalizeEnvString(env.DISCORD_USER_ID);

  if (!discordToken || !trackedUserId) {
    console.warn('Discord bot enabled but DISCORD_TOKEN or DISCORD_USER_ID missing; skipping init.');
    return;
  }

  if (client) {
    return;
  }

  const allowedGuilds = parseCommaSeparated(env.DISCORD_GUILD_IDS);

  console.info('[discord] init', {
    trackedUserIdLength: trackedUserId.length,
    allowedGuildCount: allowedGuilds.size,
    allowedGuilds: Array.from(allowedGuilds.values()),
    denylist: Array.from(parseCommaSeparated(env.DISCORD_DENYLIST_APPS).values()),
  });

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

  const counters = {
    presenceEvents: 0,
    presenceInAllowedGuild: 0,
    presenceForTrackedUser: 0,
    presenceUserMismatch: 0,
    presenceDroppedGuild: 0,
    voiceEvents: 0,
    voiceInAllowedGuild: 0,
    voiceForTrackedUser: 0,
    voiceUserMismatch: 0,
    voiceDroppedGuild: 0,
    voiceInTrackedVoice: 0,
  };

  debugInterval = setInterval(() => {
    console.info('[discord] heartbeat', { ...counters });
    counters.presenceEvents = 0;
    counters.presenceInAllowedGuild = 0;
    counters.presenceForTrackedUser = 0;
    counters.presenceUserMismatch = 0;
    counters.presenceDroppedGuild = 0;
    counters.voiceEvents = 0;
    counters.voiceInAllowedGuild = 0;
    counters.voiceForTrackedUser = 0;
    counters.voiceUserMismatch = 0;
    counters.voiceDroppedGuild = 0;
    counters.voiceInTrackedVoice = 0;
  }, 60_000);

  client.on('ready', () => {
    console.log(`Discord bot logged in as ${client?.user?.tag}`);
  });

  client.on('presenceUpdate', async (_oldPresence, newPresence) => {
    try {
      counters.presenceEvents += 1;
      if (!newPresence) return;
      if (!isAllowedGuild(newPresence.guild?.id, allowedGuilds)) {
        counters.presenceDroppedGuild += 1;
        return;
      }
      counters.presenceInAllowedGuild += 1;
      const presenceUserId = normalizeEnvString(newPresence.userId);
      if (!presenceUserId || presenceUserId !== trackedUserId) {
        counters.presenceUserMismatch += 1;
        if (
          presenceUserId &&
          !loggedPresenceMismatches.has(presenceUserId) &&
          newPresence.activities?.some((a) => a.type === 0)
        ) {
          loggedPresenceMismatches.add(presenceUserId);
          console.warn('[discord] presence user mismatch', {
            eventUserId: presenceUserId,
            trackedUserId,
            guildId: newPresence.guild?.id,
          });
        }
        return;
      }
      counters.presenceForTrackedUser += 1;
      const normalized = normalizePresence(newPresence, deps.denylistedApps);
      await handlePresenceUpdate(normalized, state, deps);
    } catch (error) {
      console.error('Error in presenceUpdate handler', error);
    }
  });

  client.on('voiceStateUpdate', async (_oldState, newState) => {
    try {
      counters.voiceEvents += 1;
      if (!newState) return;
      if (!isAllowedGuild(newState.guild?.id, allowedGuilds)) {
        counters.voiceDroppedGuild += 1;
        return;
      }
      counters.voiceInAllowedGuild += 1;
      const voiceUserId = normalizeEnvString(newState.id);
      if (!voiceUserId || voiceUserId !== trackedUserId) {
        counters.voiceUserMismatch += 1;
        if (voiceUserId && newState.channelId && !loggedVoiceMismatches.has(voiceUserId)) {
          loggedVoiceMismatches.add(voiceUserId);
          console.warn('[discord] voice user mismatch', {
            eventUserId: voiceUserId,
            trackedUserId,
            guildId: newState.guild?.id,
            channelId: newState.channelId,
          });
        }
        return;
      }
      counters.voiceForTrackedUser += 1;
      const normalized = normalizeVoiceState(newState, allowedGuilds);
      if (normalized.inTrackedVoice) {
        counters.voiceInTrackedVoice += 1;
      }
      await handleVoiceStateUpdate(normalized, state, deps);
    } catch (error) {
      console.error('Error in voiceStateUpdate handler', error);
    }
  });

  await client.login(discordToken);
}

export async function shutdownDiscordBot(): Promise<void> {
  if (debugInterval) {
    clearInterval(debugInterval);
    debugInterval = null;
  }
  if (client) {
    await client.destroy();
    client = null;
  }
}
