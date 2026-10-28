import { describe, expect, it } from 'vitest';
import { CAMPAIGN, campaignTitle, stageSettings } from './campaign';
import { seededRand } from './jakob/cards';
import { applyAction, createGameState } from './jakob/engine';

describe('campaign', () => {
  it('has 38 stations numbered without gaps', () => {
    expect(CAMPAIGN.map((s) => s.level)).toEqual(Array.from({ length: 38 }, (_, i) => i + 1));
    expect(campaignTitle(38)).toBe('Kaiser');
  });

  it('every station starts with its bots and rules', () => {
    for (const stage of CAMPAIGN) {
      const rand = seededRand(stage.level);
      let state = createGameState('me', stageSettings(stage));
      for (const level of stage.bots) {
        const res = applyAction(state, 'me', { type: 'addBot', level }, rand);
        expect(res.ok, `station ${stage.level}: ${res.ok ? '' : res.error}`).toBe(true);
        if (res.ok) state = res.state;
      }
      const started = applyAction(state, 'me', { type: 'start' }, rand);
      expect(started.ok, `station ${stage.level}: ${started.ok ? '' : started.error}`).toBe(true);
    }
  });
});
