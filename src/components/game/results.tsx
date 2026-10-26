'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GameRatingResult } from '@/components/rating/game-rating-result';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CrownMark } from '@/components/ui/logo';
import { fireConfetti } from '@/lib/confetti';
import { cx } from '@/lib/cx';
import { placements, teamPoints } from '@/lib/jakob/engine';
import { MISSION_TEXT, TEAM_INFO } from '@/lib/jakob/texts';
import { EMPTY_STATS } from '@/lib/jakob/types';
import { playSound } from '@/lib/sound';
import { CAMPAIGN } from '@/lib/campaign';
import { playOnlineAction, rematchAction } from '@/server/game-actions';
import { startCampaignAction } from '@/server/solo-actions';
import { useTable } from './table-context';
import { Icon, type IconName, Medal, MISSION_ICONS, STAGE_ICONS, TEAM_ICONS } from '@/components/ui/icons';

const PODIUM = [
  { place: 2, height: 'h-20', color: '#c9c9d6' },
  { place: 1, height: 'h-28', color: '#f4b73a' },
  { place: 3, height: 'h-14', color: '#c98a52' },
];

/** End of a campaign stage or the daily challenge. */
function SoloOutcome({ won }: { won: boolean }) {
  const { state, g, me } = useTable();
  const [pending, setPending] = useState(false);
  const code = g.game!.code;
  if (state.mode === 'daily') {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-bold">Dein Tagesergebnis: {state.points[me] ?? 0} Punkte</h2>
        <p className="text-ink-soft">Schau nach, wie du im Vergleich zu deinen Freunden abschneidest.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/herausforderung" className={buttonClass('primary', 'lg')}>Zur Tagesrangliste</Link>
          <Link href={`/spiel/${code}/wiederholung`} className={buttonClass('secondary', 'lg')}><Icon name="film" /> Wiederholung</Link>
        </div>
      </Card>
    );
  }
  const level = Number(state.modeRef);
  const stage = CAMPAIGN.find((s) => s.level === level);
  const nextStage = CAMPAIGN.find((s) => s.level === level + 1);
  async function play(target: number) {
    setPending(true);
    const res = await startCampaignAction(target);
    setPending(false);
    if (res?.error) toast.error(res.error);
  }
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-4xl font-bold">{won ? <><Icon name={stage ? STAGE_ICONS[stage.level] ?? 'trophy' : 'trophy'} className="text-gold-soft" /> {stage?.place ?? 'Station'} gemeistert!</> : 'Diesmal nicht …'}</h2>
      <p className="text-ink-soft">
        {won
          ? nextStage ? `Neuer Titel: ${stage?.title}. Als Nächstes wartet: ${nextStage.place}.` : 'Du hast die ganze Kampagne gewonnen. Lang lebe der Große Jakob!'
          : 'Nur ein Sieg bringt dich weiter. Neue Karten, neues Glück!'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {won && nextStage && <Button size="lg" onClick={() => play(nextStage.level)} disabled={pending}>Weiter: {nextStage.place}</Button>}
        {!won && <Button size="lg" onClick={() => play(level)} disabled={pending}>Nochmal versuchen</Button>}
        <Link href="/kampagne" className={buttonClass('secondary', 'lg')}>Zur Kampagne</Link>
      </div>
    </Card>
  );
}

export function Results() {
  const router = useRouter();
  const { g, state, me, nameOf, avatarOf, colorOf } = useTable();
  const game = g.game!;
  const [busy, setBusy] = useState(false);
  const places = placements(state);
  const ranked = [...state.players].sort((a, b) => (places[a.id] ?? 99) - (places[b.id] ?? 99));
  const iWon = places[me] === 1;
  const totals = teamPoints(state);
  const winningTeam: 0 | 1 | null = !state.teams ? null : totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;

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
    { label: 'Meiste Kronen', icon: 'crown' as IconName, key: 'crowns' as const },
    { label: 'Revolutionen', icon: 'fist' as IconName, key: 'revolutions' as const },
    { label: 'Große Revolutionen', icon: 'flame' as IconName, key: 'grandRevolutions' as const },
    { label: 'Bomben', icon: 'bomb' as IconName, key: 'bombs' as const },
    { label: 'Aufstiege', icon: 'ladder' as IconName, key: 'rises' as const },
  ].map((h) => {
    const best = [...state.players].sort((a, b) => stat(b.id)[h.key] - stat(a.id)[h.key])[0];
    return best && stat(best.id)[h.key] > 0 ? { ...h, id: best.id, value: stat(best.id)[h.key] } : null;
  }).filter(Boolean) as { label: string; icon: IconName; id: string; value: number }[];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-12">
      <div className="text-center">
        <CrownMark className="mx-auto size-14" />
        <h1 className="gold-text text-6xl font-bold">
          {state.teams
            ? `${winningTeam === null ? 'Unentschieden!' : `${TEAM_INFO[winningTeam].name} gewinnt!`}`
            : iWon ? 'Lang lebe Jakob – also du!' : `${nameOf(ranked[0]?.id ?? '')} regiert!`}
        </h1>
        <p className="mt-1 text-parchment/80">
          {state.throneWinner
            ? `Thronfolge: ${nameOf(state.throneWinner, true)} ${state.throneWinner === me ? 'warst' : 'war'} dreimal in Folge Großer Jakob.`
            : `Nach ${state.history.length} ${state.history.length === 1 ? 'Runde' : 'Runden'} steht der Hof fest.`}
        </p>
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
                <Medal place={slot.place} className="text-[1.6rem]" />
              </span>
            </motion.div>
          );
        })}
      </div>

      <GameRatingResult gameId={game.id} me={me} />

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
                      {pos === 0 ? <Icon name="crown" className="text-gold-soft" /> : pos >= 0 ? `+${r.points[p.id] ?? 0}` : '·'}
                    </td>
                  );
                })}
                <td className="tabular px-4 py-2.5 text-right font-display text-2xl font-bold">{state.points[p.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {state.teams && (
        <div className="grid grid-cols-2 gap-3">
          {([0, 1] as const).map((t) => (
            <div key={t} className={cx('rounded-2xl p-4 text-center text-parchment ring-4', winningTeam === t ? 'ring-gold' : 'ring-transparent')} style={{ backgroundColor: TEAM_INFO[t].color }}>
              <span className="block font-bold"><Icon name={TEAM_ICONS[t]} /> {TEAM_INFO[t].name}</span>
              <span className="tabular block font-display text-5xl font-bold">{totals[t]}</span>
              <span className="block text-sm">{state.players.filter((p) => state.teams?.[p.id] === t).map((p) => nameOf(p.id, true)).join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {state.missionsRevealed && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Die geheimen Missionen</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {state.players.filter((p) => state.missionsRevealed?.[p.id]).map((p) => {
              const m = state.missionsRevealed![p.id];
              return (
                <li key={p.id} className={cx('flex items-center gap-3 rounded-xl p-2', m.done ? 'bg-vert/15' : 'bg-parchment-dark/60')}>
                  <Icon name={MISSION_ICONS[m.id] ?? 'target'} className="size-7 text-gold-soft" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{nameOf(p.id, true)}: {MISSION_TEXT[m.id].title}</span>
                    <span className="block text-sm text-ink-soft">{MISSION_TEXT[m.id].text}</span>
                  </span>
                  <span className="font-bold">{m.done ? <><Icon name="check-circle" /> +3</> : <Icon name="close" />}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {highlights.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((h) => (
            <li key={h.label} className="flex items-center gap-3 rounded-2xl bg-velvet-deep/70 p-3 ring-2 ring-white/10">
              <Icon name={h.icon} className="size-8 text-gold-soft" />
              <span className="min-w-0">
                <span className="block text-xs text-parchment/70">{h.label}</span>
                <span className="block truncate font-bold">{nameOf(h.id, true)} · {h.value}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {state.mode === 'normal' || state.mode === 'public' ? (
        <div className="flex flex-wrap justify-center gap-3">
          {state.mode === 'public' && (
            <form action={playOnlineAction}>
              <Button type="submit" size="lg"><Icon name="castle" /> Neue Online-Runde</Button>
            </form>
          )}
          <Button size="lg" variant={state.mode === 'public' ? 'velvet' : 'primary'} onClick={rematch} disabled={busy}>
            {game.rematchGameId ? 'Zur Revanche' : state.mode === 'public' ? 'Revanche (privat)' : 'Revanche'}
          </Button>
          <Link href={`/spiel/${game.code}/wiederholung`} className={buttonClass('secondary', 'lg')}><Icon name="film" /> Wiederholung</Link>
          <Link href="/" className={buttonClass('velvet', 'lg')}>Zur Startseite</Link>
        </div>
      ) : (
        <SoloOutcome won={iWon} />
      )}
    </main>
  );
}
