import { createInitialDiscordState } from '../state';
import {
  handlePresenceUpdate,
  handleVoiceStateUpdate,
  type EngineBridgeDeps,
  type NormalizedPresence,
  type NormalizedVoiceState,
} from '../engineBridge';

function createDeps(overrides: Partial<EngineBridgeDeps> = {}) {
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
      // no-op in tests
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

    await handlePresenceUpdate(presence, state, deps);
    expect(calls.startedSlices).toHaveLength(0);

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
