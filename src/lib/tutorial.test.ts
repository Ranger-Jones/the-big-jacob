import { describe, expect, it } from 'vitest';
import { JESTER } from './jakob/cards';
import { checkLesson, LESSONS } from './tutorial';

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;

describe('tutorial lessons', () => {
  it('every lesson can be solved with its own hand', () => {
    const answers: Record<string, Parameters<typeof checkLesson>[1]> = {
      rang: { cards: [7] }, anzahl: { cards: [5, 5] }, narr: { cards: [4, 4, JESTER] }, eroeffnen: { cards: [12, 12, 12] },
      passen: { pass: true }, steuern: { cards: [11, 12] }, revolution: { option: 0 },
    };
    for (const l of LESSONS) expect(checkLesson(l, answers[l.id]).ok, l.id).toBe(true);
  });

  it('rejects wrong answers with an explanation', () => {
    expect(checkLesson(lesson('rang'), { cards: [10] })).toMatchObject({ ok: false });
    expect(checkLesson(lesson('anzahl'), { cards: [6] })).toMatchObject({ ok: false, message: expect.stringContaining('2 Karten') });
    expect(checkLesson(lesson('narr'), { cards: [12, 12, 12] }).ok).toBe(false);
    expect(checkLesson(lesson('passen'), { cards: [2] }).ok).toBe(false);
    expect(checkLesson(lesson('steuern'), { cards: [1, 2] }).ok).toBe(false);
    expect(checkLesson(lesson('revolution'), { option: 1 }).ok).toBe(false);
  });
});

describe('practice game', () => {
  it('plays a full local game against three bots', async () => {
    const { applyAction } = await import('./jakob/engine');
    const { chooseBotPlay } = await import('./jakob/bots');
    const { worstCards } = await import('./jakob/rules');
    const { seededRand } = await import('./jakob/cards');
    const { ctxOf, newPracticeGame, PRACTICE_ME: me } = await import('./tutorial');
    const rand = seededRand(7);
    let s = newPracticeGame(rand);
    expect(s.players).toHaveLength(4);
    for (let i = 0; i < 5000 && s.status !== 'finished'; i++) {
      const step = (actor: string, action: Parameters<typeof applyAction>[2]) => {
        const r = applyAction(s, actor, action, rand);
        if (!r.ok) throw new Error(`${s.phase}: ${r.error}`);
        s = r.state;
      };
      if (s.phase === 'draw') step(me, { type: 'draw' });
      else if (s.phase === 'court' || s.phase === 'roundEnd') step(me, { type: 'ready' });
      else if (s.phase === 'tax') {
        const pair = s.tax.find((t) => !t.done)!;
        step(pair.to, { type: 'taxReturn', cards: worstCards(s.hands[pair.to], pair.count, ctxOf(s)) });
      } else if (s.turn !== me) step(me, { type: 'botMove' });
      else {
        const choice = chooseBotPlay(s.hands[me], s.trick, ctxOf(s), 'sly', rand, { handCounts: [5], jesterBan: false });
        step(me, choice ? { type: 'play', cards: choice } : { type: 'pass' });
      }
    }
    expect(s.status).toBe('finished');
    expect(s.history).toHaveLength(3);
  });
});
