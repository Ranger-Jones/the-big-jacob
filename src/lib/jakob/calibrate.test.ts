import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PERSONAS } from './personas';
import { simulateGame } from './simulate';
import { DUEL_GOAL } from './types';

/**
 * Bot calibration (not part of the normal test run): CALIBRATE=1 pnpm exec vitest run src/lib/jakob/calibrate.test.ts
 * Every persona plays duels and four-player games against the plain "sly" bot (1150 Elo); the win
 * rate gives its Elo. Copy the printed values into personas.ts.
 */
describe.skipIf(!process.env.CALIBRATE)('bot calibration', () => {
  it('measures every persona against the sly bot', () => {
    const games = Number(process.env.GAMES ?? 60);
    const rows: string[] = [];
    const only = process.env.ONLY?.split(',');
    for (const persona of PERSONAS.filter((p) => !only || only.includes(p.id))) {
      let score = 0;
      let n = 0;
      for (let i = 0; i < games; i++) {
        const host = i % 2 === 0;
        const duel = simulateGame(host ? [persona.id, 'sly'] : ['sly', persona.id], { duel: true, goal: DUEL_GOAL }, 1000 + i);
        const mine = duel.places[host ? 0 : 1];
        score += mine === 1 ? (duel.places[0] === duel.places[1] ? 0.5 : 1) : 0;
        n++;
        const table = simulateGame(host ? [persona.id, 'sly', 'sly', 'sly'] : ['sly', persona.id, 'sly', 'sly'], { rounds: 5 }, 5000 + i);
        const place = table.places[host ? 0 : 1];
        // Pairwise against the three others: ahead = 1, behind = 0.
        score += table.places.filter((p, j) => j !== (host ? 0 : 1)).reduce((s, p) => s + (place < p ? 1 : place === p ? 0.5 : 0), 0) / 3;
        n++;
      }
      const p = Math.min(0.97, Math.max(0.03, score / n));
      const elo = Math.round(1150 + 400 * Math.log10(p / (1 - p)));
      rows.push(`${persona.id.padEnd(10)} ${(p * 100).toFixed(1).padStart(5)} %  ->  ${elo}`);
    }
    writeFileSync(process.env.CALIBRATE_OUT ?? 'calibration.txt', `${rows.join('\n')}\n`);
  }, 3_600_000);
});
