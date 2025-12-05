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
