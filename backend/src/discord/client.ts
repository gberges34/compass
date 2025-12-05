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

function parseCommaSeparated(value?: string): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function buildDeps(): EngineBridgeDeps {
  const denylist = parseCommaSeparated(env.DISCORD_DENYLIST_APPS);

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
  const inAllowedGuild = allowedGuilds.size === 0 || (guildId ? allowedGuilds.has(guildId) : false);
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

  if (!env.DISCORD_TOKEN || !env.DISCORD_USER_ID) {
    console.warn('Discord bot enabled but DISCORD_TOKEN or DISCORD_USER_ID missing; skipping init.');
    return;
  }

  if (client) {
    return;
  }

  const allowedGuilds = parseCommaSeparated(env.DISCORD_GUILD_IDS);

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
      if (!isAllowedGuild(newPresence.guild?.id, allowedGuilds)) return;
      const normalized = normalizePresence(newPresence, deps.denylistedApps);
      await handlePresenceUpdate(normalized, state, deps);
    } catch (error) {
      console.error('Error in presenceUpdate handler', error);
    }
  });

  client.on('voiceStateUpdate', async (_oldState, newState) => {
    try {
      if (!newState || newState.id !== env.DISCORD_USER_ID) return;
      const normalized = normalizeVoiceState(newState, allowedGuilds);
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
