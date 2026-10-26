'use client';
import { AnimatePresence, motion } from 'motion/react';
import { CardBack, PlayingCard } from '@/components/deck/playing-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CrownMark } from '@/components/ui/logo';
import { cx } from '@/lib/cx';
import { JESTER } from '@/lib/jakob/cards';
import { getSettings, rankEmoji, rankTitle, teamPoints } from '@/lib/jakob/engine';
import { describeCards, EVENT_TEXT, TEAM_INFO } from '@/lib/jakob/texts';
import { useTable } from './table-context';

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cx('parchment mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-[1.6rem] p-5 ring-2 ring-line shadow-[0_8px_0_rgb(0_0_0/0.4)] sm:p-7', className)}
    >
      {children}
    </motion.section>
  );
}

function Countdown({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  return <span className={cx('tabular rounded-full px-2.5 py-0.5 text-sm font-bold', seconds <= 5 ? 'bg-wax text-parchment' : 'bg-parchment-dark text-ink-soft')}>⏳ {seconds} s</span>;
}

function ReadyList({ ids }: { ids: string[] }) {
  const { state, nameOf, avatarOf, colorOf } = useTable();
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const ready = state.ready.includes(id);
        return (
          <li key={id} className={cx('flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-sm font-bold ring-2', ready ? 'bg-vert/15 ring-vert' : 'bg-white/40 ring-line text-ink-soft')}>
            <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="xs" />
            {nameOf(id, true)} {ready ? '✓' : '…'}
          </li>
        );
      })}
    </ul>
  );
}

/** Rank ladder: who holds which title this round. */
export function RankLadder({ order, showDraws }: { order: string[]; showDraws?: boolean }) {
  const { state, nameOf, avatarOf, colorOf } = useTable();
  return (
    <ol className="flex flex-col gap-1.5">
      {order.map((id, i) => (
        <motion.li
          key={id}
          layout
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className={cx('flex items-center gap-3 rounded-2xl px-3 py-1.5', i === 0 ? 'bg-gold/30 ring-2 ring-gold-deep/50' : 'bg-parchment-dark/60')}
        >
          <span className="w-7 text-center text-xl" aria-hidden>{rankEmoji(i, order.length)}</span>
          <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold leading-tight">{nameOf(id, true)}</span>
            <span className="block text-sm leading-tight text-ink-soft">{rankTitle(i, order.length)}</span>
          </span>
          {showDraws && state.draws[id] !== undefined && (
            <span className="text-sm font-bold text-ink-soft">zog {state.draws[id] === JESTER ? 'Narr' : state.draws[id]}</span>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

export function DrawPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const { state, me, g, deckOf } = useTable();
  const drawn = state.draws[me];
  const deck = deckOf(me);
  const present = state.players.filter((p) => !p.left);
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">Wer wird Großer Jakob?</h2>
        <Countdown seconds={secondsLeft} />
      </div>
      <p className="text-ink-soft">Jeder zieht eine Karte. Die kleinste Zahl besteigt den Thron, die größte schrubbt die Böden.</p>
      <div className="flex min-h-[8rem] items-center justify-center">
        <AnimatePresence mode="wait">
          {drawn === undefined ? (
            <motion.div key="spread" exit={{ opacity: 0, scale: 0.9 }} className="flex flex-wrap justify-center">
              {Array.from({ length: 7 }, (_, i) => (
                <CardBack
                  key={i}
                  design={deck.design}
                  size="md"
                  className="-ml-6 first:ml-0"
                  style={{ rotate: `${(i - 3) * 6}deg`, translate: `0 ${Math.abs(i - 3) * 4}px` }}
                  onClick={() => g.dispatch({ type: 'draw' })}
                  label="Diese Karte ziehen"
                />
              ))}
            </motion.div>
          ) : (
            <motion.div key="drawn" initial={{ rotateY: 90, scale: 0.8 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
              <PlayingCard rank={drawn} deck={deck} size="xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-center font-bold text-ink-soft">
        {drawn === undefined ? 'Tipp auf eine Karte.' : `Gezogen: ${drawn === JESTER ? 'ein Narr (zählt als 13)' : drawn}. Warte auf die anderen …`}
        {' '}({Object.keys(state.draws).length}/{present.length})
      </p>
    </Panel>
  );
}

export function CourtPhase({ secondsLeft, handHasBothJesters }: { secondsLeft: number | null; handHasBothJesters: boolean }) {
  const { state, me, g, nameOf, deckOf } = useTable();
  const settings = getSettings(state);
  const present = state.order.filter((id) => !state.players.find((p) => p.id === id)?.left);
  const ready = state.ready.includes(me);
  const rev = state.revolution;
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">Hofzeremonie · Runde {state.round}</h2>
        <Countdown seconds={secondsLeft} />
      </div>

      <AnimatePresence>
        {rev && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="rounded-2xl bg-wax p-4 text-center text-parchment shadow-[0_5px_0_#7f1a22]"
          >
            <p className="font-display text-4xl font-bold">{rev.grand ? '🔥 Große Revolution!' : '✊ Revolution!'}</p>
            <p className="font-bold">
              {nameOf(rev.by, true)} {rev.by === me ? 'hast' : 'hat'} beide Narren.{' '}
              {rev.grand ? 'Die Rangfolge dreht sich komplett um – und Steuern gibt es keine.' : 'Diese Runde zahlt niemand Steuern.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {state.event && (
        <div className="flex items-center gap-3 rounded-2xl bg-velvet p-3 text-parchment">
          <span className="text-4xl" aria-hidden>{EVENT_TEXT[state.event].emoji}</span>
          <span>
            <span className="block font-display text-2xl font-bold text-gold-soft">Hofgeflüster: {EVENT_TEXT[state.event].title}</span>
            <span className="block text-sm">{EVENT_TEXT[state.event].text}</span>
          </span>
        </div>
      )}

      {state.audit && (
        <div className="flex items-center gap-3 rounded-2xl bg-parchment-dark/70 p-3">
          <PlayingCard rank={state.audit.card} deck={deckOf(state.audit.by)} size="sm" />
          <p className="text-sm"><b>🔍 Steuerprüfung:</b> {nameOf(state.audit.by, true)} {state.audit.by === me ? 'musst' : 'muss'} diese Karte allen zeigen.</p>
        </div>
      )}

      {state.mercyRound && (
        <p className="rounded-2xl bg-azure/15 p-3 font-bold">🙏 {nameOf(present.at(-1) ?? '', true)} hat um Gnade gebeten – die große Steuer entfällt.</p>
      )}
      {state.abdicated && <p className="rounded-2xl bg-gold/20 p-3 font-bold">🪑 Der Große Jakob hat abgedankt.</p>}

      <RankLadder order={present} showDraws={state.round === 1} />

      {settings.mercy && !rev && !state.mercyRound && present.at(-1) === me && !state.mercyUsed.includes(me) && (
        <div className="rounded-2xl border-2 border-dashed border-azure p-3">
          <p className="mb-2 font-bold">Gnadenrecht: Einmal pro Spiel kannst du die große Steuer verweigern.</p>
          <Button variant="secondary" onClick={() => g.dispatch({ type: 'mercy' })} disabled={g.busy}>🙏 Um Gnade bitten</Button>
        </div>
      )}

      {settings.abdicate && !rev && !state.abdicated && present[0] === me && present.length >= 3 && (
        <div className="rounded-2xl border-2 border-dashed border-gold-deep p-3">
          <p className="mb-2 font-bold">Abdankung: Du tauschst den Platz mit einem Bürger. Klug bei schwacher Hand – besonders, wenn der Königssturz droht.</p>
          <Button variant="secondary" onClick={() => g.dispatch({ type: 'abdicate' })} disabled={g.busy}>🪑 Abdanken</Button>
        </div>
      )}

      {settings.revolution && !rev && handHasBothJesters && (
        <div className="rounded-2xl border-2 border-dashed border-wax p-3">
          <p className="mb-2 font-bold text-wax">Du hast beide Narren! Willst du die Revolution ausrufen?</p>
          <p className="mb-3 text-sm text-ink-soft">
            {present.at(-1) === me
              ? 'Als Großer Knecht wäre es eine Große Revolution: Du wirst sofort Großer Jakob und niemand zahlt Steuern.'
              : 'Dann zahlt diese Runde niemand Steuern.'}
          </p>
          <Button variant="danger" onClick={() => g.dispatch({ type: 'revolution' })} disabled={g.busy}>
            {present.at(-1) === me ? '🔥 Große Revolution!' : '✊ Revolution ausrufen'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => g.dispatch({ type: 'ready' })} disabled={ready || g.busy}>
          {ready ? 'Bereit ✓' : 'Bereit'}
        </Button>
        <p className="text-sm text-ink-soft">Schau dir deine Karten an. Es geht los, sobald alle bereit sind.</p>
      </div>
      <ReadyList ids={present} />
    </Panel>
  );
}

export function TaxPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const { state, me, g, nameOf, deckOf } = useTable();
  const mine = state.tax.find((t) => t.to === me);
  const paying = state.tax.find((t) => t.from === me);
  const deck = deckOf(me);
  return (
    <Panel className="max-w-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">Steuern!</h2>
        <Countdown seconds={secondsLeft} />
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {state.tax.map((t) => (
          <li key={t.to} className="flex items-center gap-2">
            <span aria-hidden>{t.done ? '✅' : '⏳'}</span>
            <span><b>{nameOf(t.from, true)}</b> {t.from === me ? 'zahlst' : 'zahlt'} {t.count} {t.count === 1 ? 'Karte' : 'Karten'} an <b>{nameOf(t.to, true)}</b>{t.done ? ' – erledigt' : ''}</span>
          </li>
        ))}
      </ul>
      {mine && !mine.done && (
        <div className="rounded-2xl bg-gold/25 p-3">
          <p className="font-bold">Du hast {describeCards(g.hand.received)} bekommen.</p>
          <div className="my-2 flex gap-1.5">{g.hand.received.map((c, i) => <PlayingCard key={i} rank={c} deck={deckOf(mine.from)} size="sm" />)}</div>
          <p>Wähle unten <b>{mine.count} {mine.count === 1 ? 'Karte' : 'Karten'}</b>, die du zurückgibst – gern deine schlechtesten.</p>
        </div>
      )}
      {mine?.done && <p className="font-bold text-ink-soft">Erledigt. Warte auf die anderen …</p>}
      {paying && (
        <div className="rounded-2xl bg-parchment-dark/70 p-3">
          <p className="font-bold">Du musstest deine besten Karten abgeben:</p>
          <div className="my-2 flex gap-1.5">{g.hand.gave.map((c, i) => <PlayingCard key={i} rank={c} deck={deck} size="sm" />)}</div>
          <p className="text-sm text-ink-soft">{paying.done ? 'Du hast dafür Karten zurückbekommen.' : `${nameOf(paying.to)} sucht gerade aus, was du zurückbekommst …`}</p>
        </div>
      )}
      {!mine && !paying && <p className="text-ink-soft">Die Steuern werden eingetrieben. Du bist diesmal fein raus.</p>}
    </Panel>
  );
}

export function RoundEndPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const { state, me, g, nameOf, avatarOf, colorOf } = useTable();
  const last = state.history.at(-1);
  if (!last) return null;
  const present = state.players.filter((p) => !p.left).map((p) => p.id);
  const ready = state.ready.includes(me);
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">Runde {last.round} ist vorbei</h2>
        <Countdown seconds={secondsLeft} />
      </div>
      <ol className="flex flex-col gap-1.5">
        {last.finish.map((id, i) => (
          <motion.li
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            className={cx('flex items-center gap-3 rounded-2xl px-3 py-1.5', i === 0 ? 'bg-gold/30 ring-2 ring-gold-deep/50' : 'bg-parchment-dark/60')}
          >
            <span className="w-7 text-center text-xl" aria-hidden>{rankEmoji(i, last.finish.length)}</span>
            <span className="relative">
              <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="sm" />
              {i === 0 && (
                <motion.span
                  className="absolute -top-5 left-1/2 -translate-x-1/2"
                  initial={{ y: -140, rotate: -40, opacity: 0 }}
                  animate={{ y: 0, rotate: -8, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 11 }}
                  aria-hidden
                >
                  <CrownMark className="size-7 drop-shadow-[0_2px_4px_rgb(244_183_58/0.8)]" />
                </motion.span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold leading-tight">{nameOf(id, true)}</span>
              <span className="block text-sm leading-tight text-ink-soft">wird {rankTitle(i, last.finish.length)}</span>
            </span>
            <span className="tabular text-right font-display text-2xl font-bold">
              +{last.points[id] ?? 0}
              <span className="block text-xs font-sans text-ink-soft">{state.points[id] ?? 0} gesamt</span>
            </span>
          </motion.li>
        ))}
      </ol>
      {state.teams && <TeamScore />}
      <p className="text-sm text-ink-soft">
        {getSettings(state).goal !== null
          ? `Gespielt wird bis ${getSettings(state).goal} Punkte.`
          : `Noch ${getSettings(state).rounds - last.round} ${getSettings(state).rounds - last.round === 1 ? 'Runde' : 'Runden'}.`}
        {' '}Gleich wird neu gemischt und gegeben.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => g.dispatch({ type: 'ready' })} disabled={ready || g.busy}>{ready ? 'Bereit ✓' : 'Nächste Runde'}</Button>
      </div>
      <ReadyList ids={present} />
    </Panel>
  );
}


/** Team totals (Adel gegen Volk). */
export function TeamScore() {
  const { state } = useTable();
  const totals = teamPoints(state);
  return (
    <div className="grid grid-cols-2 gap-2">
      {([0, 1] as const).map((t) => (
        <div key={t} className="rounded-2xl p-3 text-center text-parchment" style={{ backgroundColor: TEAM_INFO[t].color }}>
          <span className="block text-sm font-bold">{TEAM_INFO[t].emoji} {TEAM_INFO[t].name}</span>
          <span className="tabular block font-display text-3xl font-bold">{totals[t]}</span>
        </div>
      ))}
    </div>
  );
}
