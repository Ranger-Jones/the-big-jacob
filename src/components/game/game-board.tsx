'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useNow } from '@/hooks/use-now';
import { cx } from '@/lib/cx';
import { countBy, JESTER } from '@/lib/jakob/cards';
import { canSkip as skipAllowed, getSettings, taxSecondsFor, turnSecondsFor, waitingOn } from '@/lib/jakob/engine';
import { judgePlay, legalPlays } from '@/lib/jakob/rules';
import { describeCards } from '@/lib/jakob/texts';
import { isMuted, onMutedChange, setMuted } from '@/lib/sound';
import { MusicToggle } from '@/components/app-shell/music-toggle';
import { CardTracker } from './card-tracker';
import { DealOverlay } from './deal-overlay';
import { Hand, selectedCards, type Selection } from './hand';
import { CourtPhase, DrawPhase, RoundEndPhase, TaxPhase } from './phases';
import { deadlineFraction, Seats } from './seats';
import { useTable } from './table-context';
import { TrickArea } from './trick-area';
import { TurnBanner } from './turn-banner';
import { Icon } from '@/components/ui/icons';
import { MissionCard } from './mission-card';

const DRAW_SECONDS = 30;
const COURT_SECONDS = 20;
const ROUND_END_SECONDS = 20;

function useMuted() {
  return useSyncExternalStore(onMutedChange, isMuted, () => false);
}


export function GameBoard({ emojiBar, chat, chatButton }: { emojiBar: ReactNode; chat: ReactNode; chatButton: ReactNode }) {
  const router = useRouter();
  const { g, state, me, nameOf, deckOf } = useTable();
  const settings = getSettings(state);
  const muted = useMuted();
  const now = useNow(g.clockOffset, !!state.deadline || !!state.waitSince);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionFlip, setMissionFlip] = useState(false);
  const mission = g.hand.mission ?? null;
  const gameId = g.game?.id ?? '';

  // Reveal the secret mission once per game, right after the seating draw, as a card that turns over.
  const showMission = settings.missions && !!mission && state.phase !== null && state.phase !== 'draw';
  useEffect(() => {
    if (!showMission || !gameId) return;
    const key = `jakob-mission-seen:${gameId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      // Without storage the reveal may simply show again after a reload.
    }
    const t = setTimeout(() => {
      setMissionFlip(true);
      setMissionOpen(true);
    }, 700);
    return () => clearTimeout(t);
  }, [showMission, gameId]);

  const hand = g.hand.cards;
  const phaseKey = `${state.round}-${state.phase}`;
  // The selection belongs to one phase and never holds more cards than the hand has.
  const [stored, setStored] = useState<{ key: string; sel: Selection }>({ key: phaseKey, sel: {} });
  const selection = useMemo(() => {
    if (stored.key !== phaseKey) return {};
    const counts = countBy(hand);
    const next: Selection = {};
    for (const [rank, n] of Object.entries(stored.sel)) {
      const keep = Math.min(n, counts.get(Number(rank)) ?? 0);
      if (keep > 0) next[Number(rank)] = keep;
    }
    return next;
  }, [stored, phaseKey, hand]);
  const setSelection = (sel: Selection) => setStored({ key: phaseKey, sel });

  const ctx = useMemo(() => ({ settings, event: state.event }), [settings, state.event]);
  const myTurn = state.phase === 'play' && state.turn === me;
  const picked = selectedCards(selection);
  const verdict = picked.length > 0 ? judgePlay(picked, state.trick, ctx) : null;
  const playable = useMemo(() => {
    if (state.phase !== 'play' || !state.trick) return null;
    return new Set(legalPlays(hand, state.trick, ctx).flat());
  }, [hand, state.phase, state.trick, ctx]);
  const pendingTax = state.phase === 'tax' ? state.tax.find((t) => t.to === me && !t.done) : undefined;
  const bothJesters = hand.filter((c) => c === JESTER).length >= 2;

  const totalSeconds = state.phase === 'draw' ? DRAW_SECONDS
    : state.phase === 'court' ? COURT_SECONDS
      : state.phase === 'roundEnd' ? ROUND_END_SECONDS
        : state.phase === 'tax' ? taxSecondsFor(state)
          : turnSecondsFor(state);
  const fraction = deadlineFraction(now, totalSeconds, state.deadline);
  const secondsLeft = state.deadline ? Math.max(0, Math.ceil((Date.parse(state.deadline) - now) / 1000)) : null;

  const waiting = waitingOn(state).filter((id) => id !== me);
  const canSkip = waiting.length > 0 && skipAllowed(state, now);
  const deck = deckOf(me);
  const myIndex = state.order.indexOf(me);

  async function play() {
    if (!verdict?.ok) return;
    const cards = picked;
    setSelection({});
    await g.dispatch({ type: 'play', cards }, { move: true });
  }

  async function giveBack() {
    if (!pendingTax || picked.length !== pendingTax.count) return;
    const cards = picked;
    setSelection({});
    await g.dispatch({ type: 'taxReturn', cards });
  }

  let status: string;
  if (state.phase === 'play') {
    if (state.finished.includes(me) || state.shamed.includes(me)) status = 'Du bist raus – schau zu, wer Knecht wird';
    else if (myTurn) status = state.trick ? `Du bist dran · schlage ${describeCards(state.trick.cards)}` : 'Du bist dran · spiel aus';
    else status = `${nameOf(state.turn ?? '', true)} ist dran`;
  } else if (pendingTax) status = `Wähle ${pendingTax.count} ${pendingTax.count === 1 ? 'Karte' : 'Karten'} zum Zurückgeben.`;
  else status = '';

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 px-4 pb-2 pt-2 sm:gap-3 sm:pb-6 sm:pt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5">
      <div className="flex min-w-0 flex-col gap-3">
        {/* Game toolbar: on phones it stays pinned right below the status bar while the page scrolls. */}
        <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 flex items-center justify-between gap-2 bg-velvet/80 px-4 py-1.5 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <p className="min-w-0 truncate font-display text-2xl text-gold-soft">
            {state.mode === 'campaign' && <span className="mr-2 rounded-lg bg-velvet-soft px-2 font-sans text-sm text-parchment"><Icon name="sword" /> Station {state.modeRef}</span>}
            {state.mode === 'daily' && <span className="mr-2 rounded-lg bg-velvet-soft px-2 font-sans text-sm text-parchment"><Icon name="calendar" /> Tagesaufgabe</span>}
            {state.phase === 'draw' ? 'Auslosung' : (
              <>
                <span className="sm:hidden">R{state.round}{settings.goal === null ? `/${settings.rounds}` : ''}</span>
                <span className="hidden sm:inline">
                  Runde {state.round}{settings.goal === null ? ` von ${settings.rounds}` : ` · Ziel ${settings.goal} P.`}
                </span>
              </>
            )}
            {myIndex >= 0 && <span className="ml-2 hidden font-sans text-sm text-parchment/70 sm:inline">· {state.points[me] ?? 0} Punkte</span>}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {g.spectators.length > 0 && (
              <span className="rounded-xl bg-velvet-soft px-2 py-1 text-sm font-bold" title={`Es schauen zu: ${g.spectators.map((id) => g.profiles[id]?.username ?? '…').join(', ')}`}>
                <Icon name="eye" /> {g.spectators.length}
              </span>
            )}
            {chatButton}
            {settings.missions && mission && (
              <Button
                variant="velvet"
                size="sm"
                onClick={() => { setMissionFlip(false); setMissionOpen(true); }}
                aria-label="Deine Mission"
                className={cx(mission.done ? 'ring-gold' : 'animate-pulse-ring')}
              >
                <Icon name={mission.done ? 'check-circle' : 'target'} className="size-5" />
                <span className="hidden sm:inline">Mission</span>
              </Button>
            )}
            {settings.tracker && state.phase === 'play' && (
              <Button variant="velvet" size="sm" onClick={() => setTrackerOpen(true)} aria-label="Kartengedächtnis"><Icon name="book" className="size-5" /></Button>
            )}
            <Button variant="velvet" size="sm" onClick={() => setMuted(!muted)} aria-label={muted ? 'Ton an' : 'Ton aus'}><Icon name={muted ? 'volume-off' : 'volume'} className="size-5" /></Button>
<MusicToggle className="bg-velvet-soft ring-2 ring-inset ring-white/10" />
            <Link href="/regeln" target="_blank" className="flex min-h-9 items-center rounded-xl bg-velvet-soft px-3 text-sm font-bold ring-2 ring-inset ring-white/10" aria-label="Regeln"><Icon name="scroll" className="size-5" /></Link>
            {canSkip && (
              <Button variant="velvet" size="sm" onClick={() => setSkipping(true)} aria-label="Überspringen">
                <Icon name="skip" className="size-5" /><span className="hidden sm:inline">Überspringen</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setLeaving(true)}>Gehen</Button>
          </div>
        </div>

        <Seats timer={state.phase === 'play' ? fraction : null} />
        <DealOverlay round={state.round} seats={state.order.length} mySeat={state.order.indexOf(me)} design={deck.design} />

        {state.phase === 'draw' && <DrawPhase secondsLeft={secondsLeft} />}
        {state.phase === 'court' && <CourtPhase secondsLeft={secondsLeft} handHasBothJesters={bothJesters} />}
        {state.phase === 'tax' && <TaxPhase secondsLeft={secondsLeft} />}
        {state.phase === 'roundEnd' && <RoundEndPhase secondsLeft={secondsLeft} />}
        {state.phase === 'play' && <TrickArea />}
        {state.phase === 'play' && <TurnBanner text={status} mine={myTurn} seconds={secondsLeft} fraction={fraction} />}

        {state.phase !== 'draw' && state.phase !== 'roundEnd' && (
          <section
            className={cx(
              'z-10 -mx-4 flex flex-col gap-2 rounded-t-[1.6rem] border-t border-gold/30 bg-velvet-deep/95 px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur sm:mx-0 sm:gap-3 sm:rounded-[1.6rem] sm:border sm:border-gold/20 sm:pb-4',
              myTurn && 'shadow-[0_-10px_34px_rgb(244_183_58/0.14)]',
            )}
            aria-label="Deine Hand"
          >
            {state.phase !== 'play' && status && (
              <p className="pt-2 text-sm font-bold text-gold-soft sm:text-base" aria-live="polite">{status}</p>
            )}
            {myTurn && verdict && !verdict.ok && <p className="-mt-1 text-sm font-bold text-wax brightness-150">{verdict.error}</p>}
            {myTurn && verdict?.ok && verdict.bomb && <p className="-mt-1 text-sm font-bold text-gold-soft"><Icon name="bomb" /> Bombe! Damit gewinnst du den Stich sofort.</p>}
            {myTurn && verdict?.ok && verdict.snap && <p className="-mt-1 text-sm font-bold text-gold-soft"><Icon name="bolt" /> Schnapp! Der Nächste muss aussetzen.</p>}
            <Hand
              key={state.round}
              cards={hand}
              deck={deck}
              selection={selection}
              onChange={setSelection}
              mode={pendingTax ? 'tax' : state.phase === 'play' ? 'play' : 'view'}
              trick={state.trick}
              taxCount={pendingTax?.count}
              playable={myTurn ? playable : null}
              received={state.phase === 'tax' || state.phase === 'play' ? g.hand.received : []}
            />
            <div className="flex items-center gap-2">
              {picked.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelection({})}>Abwählen</Button>}
              {state.phase === 'play' && myTurn && state.trick && (
                <Button variant="secondary" className="flex-1" onClick={() => { setSelection({}); void g.dispatch({ type: 'pass' }, { move: true }); }} disabled={g.busy}>
                  Passen
                </Button>
              )}
              {state.phase === 'play' && (
                <Button className="flex-[1.5]" onClick={play} disabled={!myTurn || !verdict?.ok || g.busy}>
                  {picked.length > 0 ? `${describeCards(picked)} legen` : myTurn ? 'Karten wählen' : 'Warte auf deinen Zug'}
                </Button>
              )}
              {pendingTax && (
                <Button className="flex-1" onClick={giveBack} disabled={picked.length !== pendingTax.count || g.busy}>
                  Zurückgeben ({picked.length}/{pendingTax.count})
                </Button>
              )}
            </div>
            <div className="flex justify-center">{emojiBar}</div>
          </section>
        )}
        {(state.phase === 'draw' || state.phase === 'roundEnd') && <div className="flex justify-center">{emojiBar}</div>}
      </div>

      <aside className="hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:flex-col">{chat}</aside>

      <Modal open={trackerOpen} onClose={() => setTrackerOpen(false)} title="Kartengedächtnis" wide>
        <CardTracker hand={hand} />
        <Button onClick={() => setTrackerOpen(false)}>Schließen</Button>
      </Modal>

      <Modal open={leaving} onClose={() => setLeaving(false)} title="Den Tisch verlassen?">
        <p className="text-ink-soft">Deine Karten verfallen und du kannst diesem Spiel nicht wieder beitreten. Die anderen spielen ohne dich weiter.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setLeaving(false)}>Bleiben</Button>
          <Button
            variant="danger"
            onClick={async () => {
              setLeaving(false);
              if (await g.dispatch({ type: 'leave' })) router.push('/');
            }}
          >
            Verlassen
          </Button>
        </div>
      </Modal>

      <Modal open={skipping} onClose={() => setSkipping(false)} title="Hängt jemand fest?">
        <p className="text-ink-soft">
          <b>Einmal überspringen:</b> Für {waiting.map((id) => nameOf(id)).join(', ')} wird jetzt automatisch entschieden.
        </p>
        <p className="text-ink-soft">
          <b>Bot übernimmt:</b> Ein Bot spielt dauerhaft weiter, bis die Person zurück am Tisch ist.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setSkipping(false)}>Abbrechen</Button>
          <Button variant="secondary" onClick={async () => { setSkipping(false); await g.dispatch({ type: 'skip' }, { move: true }); }}>Einmal überspringen</Button>
          {waiting.filter((id) => !state.players.find((p) => p.id === id)?.bot).map((id) => (
            <Button key={id} onClick={async () => { setSkipping(false); await g.dispatch({ type: 'takeover', playerId: id }, { move: true }); }}>
              <Icon name="bot" /> Bot für {nameOf(id)}
            </Button>
          ))}
        </div>
      </Modal>

      <Modal open={missionOpen} onClose={() => setMissionOpen(false)} title="Deine geheime Mission">
        {mission && <MissionCard key={`${missionFlip}`} mission={mission} flip={missionFlip} />}
        <p className="text-center text-sm text-ink-soft">Nur du kennst sie – die anderen sehen deine Mission erst am Spielende. Du findest sie jederzeit oben unter der Zielscheibe.</p>
        <Button onClick={() => setMissionOpen(false)}>Verstanden</Button>
      </Modal>
    </main>
  );
}
