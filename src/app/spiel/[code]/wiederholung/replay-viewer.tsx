'use client';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PlayingCard } from '@/components/deck/playing-card';
import { Avatar, type AvatarProfile } from '@/components/ui/avatar';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import { resolveDeck, type DeckEntry } from '@/lib/decks';
import { countBy, removeCards } from '@/lib/jakob/cards';
import { rankTitle, type Player, type ReplayRound, type RoundResult } from '@/lib/jakob/engine';
import { describeCards, EVENT_TEXT } from '@/lib/jakob/texts';
import { seatColor } from '@/lib/player-colors';
import type { ProfileLite } from '@/server/social-service';
import { EVENT_ICONS, Icon, rankIcon } from '@/components/ui/icons';

interface Props {
  code: string;
  players: Player[];
  rounds: ReplayRound[];
  history: RoundResult[];
  profiles: Record<string, ProfileLite>;
  decks: Record<string, DeckEntry>;
}

interface Snapshot {
  hands: Record<string, number[]>;
  trick: { cards: number[]; by: string } | null;
  passed: Set<string>;
  out: string[];
  text: string;
  actor: string | null;
}

/** Re-plays the recorded moves of one round up to `step`. */
function snapshotAt(round: ReplayRound, step: number, name: (id: string) => string): Snapshot {
  const hands = structuredClone(round.hands);
  let trick: Snapshot['trick'] = null;
  let passed = new Set<string>();
  const out: string[] = [];
  let text = `Runde ${round.round} beginnt – ${name(round.order[0])} spielt aus.`;
  let actor: string | null = null;
  for (const move of round.moves.slice(0, step)) {
    if (move.k === 'p') {
      hands[move.by] = removeCards(hands[move.by] ?? [], move.c);
      trick = { cards: move.c, by: move.by };
      actor = move.by;
      text = `${name(move.by)} legt ${describeCards(move.c)}.`;
      if ((hands[move.by] ?? []).length === 0 && !out.includes(move.by)) {
        out.push(move.by);
        text += ` – ${name(move.by)} ist raus!`;
      }
    } else if (move.k === 'x') {
      passed.add(move.by);
      actor = move.by;
      text = `${name(move.by)} passt.`;
    } else {
      trick = null;
      passed = new Set();
      actor = move.by;
      text = move.by ? `Stich vorbei – ${name(move.by)} spielt neu aus.` : 'Stich vorbei.';
    }
  }
  return { hands, trick, passed, out, text, actor };
}

export function ReplayViewer({ code, players, rounds, history, profiles, decks }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const round = rounds[roundIndex];
  const byId = useMemo(() => new Map(players.map((p, i) => [p.id, { p, i }])), [players]);
  const name = (id: string) => byId.get(id)?.p.bot?.name ?? profiles[id]?.username ?? '…';
  const avatar = (id: string): AvatarProfile => {
    const p = byId.get(id)?.p;
    if (p?.bot) return { username: p.bot.name, avatar_url: null, emoji: p.bot.emoji };
    return profiles[id] ?? { username: '…', avatar_url: null };
  };
  const deckOf = (id: string) => resolveDeck(byId.get(id)?.p.deckId, decks);
  const snap = snapshotAt(round, step, name);
  const total = round.moves.length;
  const result = history.find((h) => h.round === round.round);

  // Auto-play: advance one move per tick and stop at the end of the round.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= total) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(t);
  }, [playing, speed, total]);

  function goRound(i: number) {
    setRoundIndex(i);
    setStep(0);
    setPlaying(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-5xl font-bold"><Icon name="film" className="text-gold-soft" /> Wiederholung</h1>
          <p className="text-parchment/75">Alle Karten offen – so lief das Spiel {code}.</p>
        </div>
        <Link href={`/spiel/${code}`} className={buttonClass('velvet', 'sm')}>Zum Ergebnis</Link>
      </div>

      <nav className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="Runde wählen">
        {rounds.map((r, i) => (
          <button
            key={r.round}
            type="button"
            onClick={() => goRound(i)}
            className={cx('shrink-0 rounded-xl px-3 py-1.5 font-bold', i === roundIndex ? 'bg-gold text-ink' : 'bg-velvet-deep/70 text-parchment/80 hover:bg-white/10')}
          >
            Runde {r.round}
          </button>
        ))}
      </nav>

      {round.event && (
        <p className="rounded-2xl bg-velvet-deep/70 p-2 text-center text-sm ring-2 ring-gold/30">
          <Icon name={EVENT_ICONS[round.event] ?? 'sparkles'} className="text-gold-soft" /> <b>{EVENT_TEXT[round.event].title}:</b> {EVENT_TEXT[round.event].text}
        </p>
      )}

      <Card tone="velvet" className="flex flex-col items-center gap-3">
        <div className="flex min-h-[7.5rem] items-center justify-center">
          <AnimatePresence mode="popLayout">
            {snap.trick ? (
              <motion.div key={`${step}-${snap.trick.by}`} className="flex" initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                {snap.trick.cards.map((c, i) => (
                  <PlayingCard key={i} rank={c} deck={deckOf(snap.trick!.by)} size="md" className="-ml-6 first:ml-0" style={{ rotate: `${(i - 1) * 6}deg` }} />
                ))}
              </motion.div>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-display text-2xl text-parchment/70">Der Tisch ist leer</motion.p>
            )}
          </AnimatePresence>
        </div>
        <p className="text-center font-bold" aria-live="polite">{snap.text}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="velvet" size="sm" onClick={() => setStep(0)} aria-label="Zum Anfang"><Icon name="skip-back" className="size-5" /></Button>
          <Button variant="velvet" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label="Zug zurück">◀</Button>
          <Button size="sm" onClick={() => { if (step >= total) setStep(0); setPlaying((p) => !p); }}>{playing ? <><Icon name="pause" /> Pause</> : <><Icon name="play" /> Abspielen</>}</Button>
          <Button variant="velvet" size="sm" onClick={() => setStep((s) => Math.min(total, s + 1))} aria-label="Zug vor">▶</Button>
          <Button variant="velvet" size="sm" onClick={() => setStep(total)} aria-label="Zum Ende"><Icon name="skip" className="size-5" /></Button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Tempo"
            className="h-9 rounded-xl bg-velvet-soft px-2 text-sm font-bold text-parchment ring-2 ring-inset ring-white/10"
          >
            <option value={1500}>Langsam</option>
            <option value={900}>Normal</option>
            <option value={400}>Schnell</option>
          </select>
        </div>
        <input
          type="range" min={0} max={total} value={step}
          onChange={(e) => { setStep(Number(e.target.value)); setPlaying(false); }}
          aria-label="Zug"
          className="w-full max-w-xl accent-[#f4b73a]"
        />
        <p className="tabular text-sm text-parchment/70">Zug {step} von {total}</p>
      </Card>

      <ul className="flex flex-col gap-2">
        {round.order.map((id, index) => {
          const hand = snap.hands[id] ?? [];
          const groups = [...countBy(hand)].sort((a, b) => a[0] - b[0]);
          const outPlace = snap.out.indexOf(id);
          return (
            <li key={id}>
              <Card className={cx('flex flex-col gap-2 p-3 sm:flex-row sm:items-center', snap.actor === id && 'ring-gold shadow-[0_4px_0_var(--color-gold-deep)]')}>
                <div className="flex w-full shrink-0 items-center gap-2 sm:w-52">
                  <Avatar profile={avatar(id)} ring={seatColor(byId.get(id)?.i ?? 0)} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{name(id)}</span>
                    <span className="block text-xs text-ink-soft"><Icon name={rankIcon(index, round.order.length)} /> {rankTitle(index, round.order.length)} · {hand.length} Karten</span>
                  </span>
                  {snap.passed.has(id) && <span className="ml-auto rounded-full bg-parchment-dark px-2 text-xs font-bold">passt</span>}
                  {outPlace >= 0 && <span className="ml-auto rounded-full bg-gold px-2 text-xs font-bold">{outPlace + 1}. raus</span>}
                </div>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {groups.map(([rank, n]) => (
                    <span key={rank} className="relative">
                      <PlayingCard rank={rank} deck={deckOf(id)} size="xs" />
                      {n > 1 && <span className="absolute -bottom-1 -right-1 rounded-full bg-velvet-deep px-1 text-[0.6rem] font-bold text-parchment">×{n}</span>}
                    </span>
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {result && step >= total && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Ergebnis von Runde {result.round}</h2>
          <ol className="flex flex-col gap-1">
            {result.finish.map((id, i) => (
              <li key={id} className="flex items-center gap-2">
                <Icon name={rankIcon(i, result.finish.length)} className="size-6 text-gold-soft" />
                <span className="flex-1 font-bold">{name(id)}</span>
                <span className="tabular font-display text-xl font-bold">+{result.points[id] ?? 0}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </main>
  );
}
