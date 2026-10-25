'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CrownMark } from '@/components/ui/logo';
import { fireConfetti } from '@/lib/confetti';
import { cx } from '@/lib/cx';
import { placements } from '@/lib/jakob/engine';
import { EMPTY_STATS } from '@/lib/jakob/types';
import { playSound } from '@/lib/sound';
import { rematchAction } from '@/server/game-actions';
import { useTable } from './table-context';

const PODIUM = [
  { place: 2, height: 'h-20', color: '#c9c9d6', medal: '🥈' },
  { place: 1, height: 'h-28', color: '#f4b73a', medal: '🥇' },
  { place: 3, height: 'h-14', color: '#c98a52', medal: '🥉' },
];

export function Results() {
  const router = useRouter();
  const { g, state, me, nameOf, avatarOf, colorOf } = useTable();
  const game = g.game!;
  const [busy, setBusy] = useState(false);
  const places = placements(state);
  const ranked = [...state.players].sort((a, b) => (places[a.id] ?? 99) - (places[b.id] ?? 99));
  const iWon = places[me] === 1;

  useEffect(() => {
    if (iWon) {
      void fireConfetti('win');
      playSound('crown');
    }
  }, [iWon]);

  async function rematch() {
    setBusy(true);
    const res = await rematchAction(game.id);
    setBusy(false);
    if (res.ok) router.push(`/spiel/${res.data.code}`);
    else toast.error(res.error);
  }

  const stat = (id: string) => state.stats[id] ?? EMPTY_STATS;
  const highlights = [
    { label: 'Meiste Kronen', emoji: '👑', key: 'crowns' as const },
    { label: 'Revolutionen', emoji: '✊', key: 'revolutions' as const },
    { label: 'Große Revolutionen', emoji: '🔥', key: 'grandRevolutions' as const },
    { label: 'Bomben', emoji: '💣', key: 'bombs' as const },
    { label: 'Aufstiege', emoji: '🪜', key: 'rises' as const },
  ].map((h) => {
    const best = [...state.players].sort((a, b) => stat(b.id)[h.key] - stat(a.id)[h.key])[0];
    return best && stat(best.id)[h.key] > 0 ? { ...h, id: best.id, value: stat(best.id)[h.key] } : null;
  }).filter(Boolean) as { label: string; emoji: string; id: string; value: number }[];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-12">
      <div className="text-center">
        <CrownMark className="mx-auto size-14" />
        <h1 className="gold-text text-6xl font-bold">{iWon ? 'Lang lebe Jakob – also du!' : `${nameOf(ranked[0]?.id ?? '')} regiert!`}</h1>
        <p className="mt-1 text-parchment/80">Nach {state.history.length} {state.history.length === 1 ? 'Runde' : 'Runden'} steht der Hof fest.</p>
      </div>

      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {PODIUM.map((slot, i) => {
          const p = ranked.find((x) => places[x.id] === slot.place && !x.left);
          if (!p) return <div key={slot.place} className="w-24" />;
          return (
            <motion.div
              key={slot.place}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 200, damping: 18 }}
              className="flex w-24 flex-col items-center gap-1 sm:w-32"
            >
              <Avatar profile={avatarOf(p.id)} ring={colorOf(p.id)} size={slot.place === 1 ? 'lg' : 'md'} />
              <span className="w-full truncate text-center font-bold">{nameOf(p.id, true)}</span>
              <span className="tabular font-display text-2xl text-gold-soft">{state.points[p.id] ?? 0} P.</span>
              <span className={cx('flex w-full items-start justify-center rounded-t-xl pt-2 text-3xl shadow-[inset_0_-6px_0_rgb(0_0_0/0.2)]', slot.height)} style={{ backgroundColor: slot.color }}>
                {slot.medal}
              </span>
            </motion.div>
          );
        })}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[30rem] text-left">
          <thead>
            <tr className="text-sm text-ink-soft">
              <th scope="col" className="px-4 py-3 font-bold">Platz</th>
              <th scope="col" className="py-3 font-bold">Spieler</th>
              {state.history.map((r) => <th key={r.round} scope="col" className="py-3 text-center font-bold">R{r.round}</th>)}
              <th scope="col" className="px-4 py-3 text-right font-bold">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => (
              <tr key={p.id} className={cx('border-t border-line', p.id === me && 'bg-gold/15', p.left && 'opacity-50')}>
                <td className="tabular px-4 py-2.5 font-display text-2xl font-bold">{p.left ? '–' : places[p.id]}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-2 font-bold">
                    <Avatar profile={avatarOf(p.id)} ring={colorOf(p.id)} size="xs" />
                    <span className="truncate">{nameOf(p.id, true)}</span>
                  </span>
                </td>
                {state.history.map((r) => {
                  const pos = r.finish.indexOf(p.id);
                  return (
                    <td key={r.round} className="tabular py-2.5 text-center text-sm" title={pos >= 0 ? `${pos + 1}. Platz` : 'nicht dabei'}>
                      {pos === 0 ? '👑' : pos >= 0 ? `+${r.points[p.id] ?? 0}` : '·'}
                    </td>
                  );
                })}
                <td className="tabular px-4 py-2.5 text-right font-display text-2xl font-bold">{state.points[p.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {highlights.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((h) => (
            <li key={h.label} className="flex items-center gap-3 rounded-2xl bg-velvet-deep/70 p-3 ring-2 ring-white/10">
              <span className="text-3xl" aria-hidden>{h.emoji}</span>
              <span className="min-w-0">
                <span className="block text-xs text-parchment/70">{h.label}</span>
                <span className="block truncate font-bold">{nameOf(h.id, true)} · {h.value}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={rematch} disabled={busy}>{game.rematchGameId ? 'Zur Revanche' : 'Revanche'}</Button>
        <Link href="/" className={buttonClass('velvet', 'lg')}>Zur Startseite</Link>
      </div>
    </main>
  );
}
