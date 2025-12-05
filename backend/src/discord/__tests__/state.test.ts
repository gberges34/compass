import { createInitialDiscordState } from '../state';

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
