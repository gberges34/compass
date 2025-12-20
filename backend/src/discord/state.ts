export interface GamingState {
  currentGame: string | null;
  gamingActive: boolean;
  startTimer: NodeJS.Timeout | null;
  stopTimer: NodeJS.Timeout | null;
  stopEffectiveAt: Date | null;
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
      stopEffectiveAt: null,
    },
    social: {
      socialActive: false,
      inCall: false,
      stopTimer: null,
    },
  };
}
