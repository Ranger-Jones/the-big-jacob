'use client';
import { AnimatePresence, motion } from 'motion/react';
import { CardBack, PlayingCard } from '@/components/deck/playing-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CrownMark } from '@/components/ui/logo';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import { JESTER } from '@/lib/jakob/cards';
import { getSettings, rankTitle, teamPoints } from '@/lib/jakob/engine';
import { describeCards, EVENT_TEXT, MISSION_TEXT, TEAM_INFO } from '@/lib/jakob/texts';
import { useTable } from './table-context';
import { EVENT_ICONS, Icon, rankIcon, TEAM_ICONS } from '@/components/ui/icons';

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cx('parchment mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-[1.6rem] p-5 ring-1 ring-line shadow-[0_8px_0_rgb(0_0_0/0.4)] sm:p-7', className)}
    >
      {children}
    </motion.section>
  );
}

function Countdown({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  return <span className={cx('tabular rounded-full px-2.5 py-0.5 text-sm font-bold', seconds <= 5 ? 'bg-wax text-parchment' : 'bg-parchment-dark text-ink-soft')}><Icon name="hourglass" /> {seconds} s</span>;
}

function ReadyList({ ids }: { ids: string[] }) {
  const { state, nameOf, avatarOf, colorOf } = useTable();
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const ready = state.ready.includes(id);
        return (
          <li key={id} className={cx('flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-sm font-bold ring-2', ready ? 'bg-vert/15 ring-vert' : 'bg-white/5 ring-line text-ink-soft')}>
            <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="xs" />
            {nameOf(id, true)} {ready ? <Icon name="check" strokeWidth={2.5} /> : '…'}
          </li>
        );
      })}
    </ul>
  );
}

/** Rank ladder: who holds which title this round. */
export function RankLadder({ order, showDraws }: { order: string[]; showDraws?: boolean }) {
  const t = useT();
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
          <Icon name={rankIcon(i, order.length)} className="size-6 text-gold-deep" />
          <Avatar profile={avatarOf(id)} ring={colorOf(id)} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold leading-tight">{nameOf(id, true)}</span>
            <span className="block text-sm leading-tight text-ink-soft">{t(rankTitle(i, order.length))}</span>
          </span>
          {showDraws && state.draws[id] !== undefined && (
            <span className="text-sm font-bold text-ink-soft">{t('zog {card}', { card: state.draws[id] === JESTER ? t('Narr') : state.draws[id] })}</span>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

export function DrawPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const t = useT();
  const { state, me, g, deckOf } = useTable();
  const drawn = state.draws[me];
  const deck = deckOf(me);
  const present = state.players.filter((p) => !p.left);
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">{t('Wer wird Großer Jakob?')}</h2>
        <Countdown seconds={secondsLeft} />
      </div>
      <p className="text-ink-soft">{t('Jeder zieht eine Karte. Die kleinste Zahl besteigt den Thron, die größte schrubbt die Böden.')}</p>
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
                  label={t('Diese Karte ziehen')}
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
        {drawn === undefined ? t('Tipp auf eine Karte.') : t('Gezogen: {card}. Warte auf die anderen …', { card: drawn === JESTER ? t('ein Narr (zählt als 13)') : drawn })}
        {' '}({Object.keys(state.draws).length}/{present.length})
      </p>
    </Panel>
  );
}

export function CourtPhase({ secondsLeft, handHasBothJesters }: { secondsLeft: number | null; handHasBothJesters: boolean }) {
  const t = useT();
  const { state, me, g, nameOf, deckOf } = useTable();
  const settings = getSettings(state);
  const present = state.order.filter((id) => !state.players.find((p) => p.id === id)?.left);
  const ready = state.ready.includes(me);
  const rev = state.revolution;
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">{t('Hofzeremonie · Runde {round}', { round: state.round })}</h2>
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
            <p className="font-display text-4xl font-bold"><Icon name={rev.grand ? 'flame' : 'fist'} /> {rev.grand ? t('Große Revolution!') : t('Revolution!')}</p>
            <p className="font-bold">
              {rev.by === me ? t('Du hast beide Narren.') : t('{name} hat beide Narren.', { name: nameOf(rev.by) })}{' '}
              {rev.grand ? t('Die Rangfolge dreht sich komplett um – und Steuern gibt es keine.') : t('Diese Runde zahlt niemand Steuern.')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {state.event && (
        <div className="flex items-center gap-3 rounded-2xl bg-velvet p-3 text-parchment">
          <Icon name={EVENT_ICONS[state.event] ?? 'sparkles'} className="size-10 text-gold-soft" />
          <span>
            <span className="block font-display text-2xl font-bold text-gold-soft">{t('Hofgeflüster: {title}', { title: t(EVENT_TEXT[state.event].title) })}</span>
            <span className="block text-sm">{t(EVENT_TEXT[state.event].text)}</span>
          </span>
        </div>
      )}

      {state.audit && (
        <div className="flex items-center gap-3 rounded-2xl bg-parchment-dark/70 p-3">
          <PlayingCard rank={state.audit.card} deck={deckOf(state.audit.by)} size="sm" />
          <p className="text-sm"><b><Icon name="search" /> {t('Steuerprüfung:')}</b> {state.audit.by === me ? t('Du musst diese Karte allen zeigen.') : t('{name} muss diese Karte allen zeigen.', { name: nameOf(state.audit.by) })}</p>
        </div>
      )}

      {state.mercyRound && (
        <p className="rounded-2xl bg-azure/15 p-3 font-bold"><Icon name="dove" /> {present.at(-1) === me ? t('Du hast um Gnade gebeten – die große Steuer entfällt.') : t('{name} hat um Gnade gebeten – die große Steuer entfällt.', { name: nameOf(present.at(-1) ?? '') })}</p>
      )}
      {state.abdicated && <p className="rounded-2xl bg-gold/20 p-3 font-bold"><Icon name="throne" /> {t('Der Große Jakob hat abgedankt.')}</p>}

      <RankLadder order={present} showDraws={state.round === 1} />

      {settings.missions && g.hand.mission && (
        <p className={cx('flex items-start gap-2 rounded-2xl px-3 py-2 text-sm', g.hand.mission.done ? 'bg-vert/15' : 'bg-gold/20')}>
          <Icon name={g.hand.mission.done ? 'check-circle' : 'target'} className="mt-0.5 size-5 shrink-0 text-gold-deep" />
          <span>
            <b>{t('Deine Mission: {title}', { title: t(MISSION_TEXT[g.hand.mission.id].title) })}</b> – {t(MISSION_TEXT[g.hand.mission.id].text)}
            {g.hand.mission.done && <b className="text-vert"> {t('Erfüllt!')}</b>}
          </span>
        </p>
      )}

      {settings.mercy && !rev && !state.mercyRound && present.at(-1) === me && !state.mercyUsed.includes(me) && (
        <div className="rounded-2xl border-2 border-dashed border-azure p-3">
          <p className="mb-2 font-bold">{t('Gnadenrecht: Einmal pro Spiel kannst du die große Steuer verweigern.')}</p>
          <Button variant="secondary" onClick={() => g.dispatch({ type: 'mercy' })} disabled={g.busy}><Icon name="dove" /> {t('Um Gnade bitten')}</Button>
        </div>
      )}

      {settings.abdicate && !rev && !state.abdicated && present[0] === me && present.length >= 3 && (
        <div className="rounded-2xl border-2 border-dashed border-gold-deep p-3">
          <p className="mb-2 font-bold">{t('Abdankung: Du tauschst den Platz mit einem Bürger. Klug bei schwacher Hand – besonders, wenn der Königssturz droht.')}</p>
          <Button variant="secondary" onClick={() => g.dispatch({ type: 'abdicate' })} disabled={g.busy}><Icon name="throne" /> {t('Abdanken')}</Button>
        </div>
      )}

      {settings.revolution && !rev && handHasBothJesters && (
        <div className="rounded-2xl border-2 border-dashed border-wax p-3">
          <p className="mb-2 font-bold text-wax">{t('Du hast beide Narren! Willst du die Revolution ausrufen?')}</p>
          <p className="mb-3 text-sm text-ink-soft">
            {present.at(-1) === me
              ? t('Als Großer Knecht wäre es eine Große Revolution: Du wirst sofort Großer Jakob und niemand zahlt Steuern.')
              : t('Dann zahlt diese Runde niemand Steuern.')}
          </p>
          <Button variant="danger" onClick={() => g.dispatch({ type: 'revolution' })} disabled={g.busy}>
            <Icon name={present.at(-1) === me ? 'flame' : 'fist'} /> {present.at(-1) === me ? t('Große Revolution!') : t('Revolution ausrufen')}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => g.dispatch({ type: 'ready' })} disabled={ready || g.busy}>
          {ready ? <>{t('Bereit')} <Icon name="check" strokeWidth={2.5} /></> : t('Bereit')}
        </Button>
        <p className="text-sm text-ink-soft">{t('Schau dir deine Karten an. Es geht los, sobald alle bereit sind.')}</p>
      </div>
      <ReadyList ids={present} />
    </Panel>
  );
}

export function TaxPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const t = useT();
  const { state, me, g, nameOf, deckOf } = useTable();
  const mine = state.tax.find((x) => x.to === me);
  const paying = state.tax.find((x) => x.from === me);
  const deck = deckOf(me);
  return (
    <Panel className="max-w-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">{t('Steuern!')}</h2>
        <Countdown seconds={secondsLeft} />
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {state.tax.map((tx) => (
          <li key={tx.to} className="flex items-center gap-2">
            <Icon name={tx.done ? 'check-circle' : 'hourglass'} className="size-5" />
            <span>
              <b>{nameOf(tx.from, true)}</b>{' '}
              {tx.from === me
                ? (tx.count === 1 ? t('zahlst 1 Karte an') : t('zahlst {count} Karten an', { count: tx.count }))
                : (tx.count === 1 ? t('zahlt 1 Karte an') : t('zahlt {count} Karten an', { count: tx.count }))}{' '}
              <b>{tx.to === me ? t('dich') : nameOf(tx.to)}</b>{tx.done ? ` – ${t('erledigt')}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {mine && !mine.done && (
        <div className="rounded-2xl bg-gold/25 p-3">
          <p className="font-bold">{t('Du hast {cards} bekommen.', { cards: describeCards(g.hand.received, t) })}</p>
          <div className="my-2 flex gap-1.5">{g.hand.received.map((c, i) => <PlayingCard key={i} rank={c} deck={deckOf(mine.from)} size="sm" />)}</div>
          <p>{t('Wähle unten')} <b>{mine.count === 1 ? t('1 Karte') : t('{count} Karten', { count: mine.count })}</b>{t(', die du zurückgibst – gern deine schlechtesten.')}</p>
        </div>
      )}
      {mine?.done && <p className="font-bold text-ink-soft">{t('Erledigt. Warte auf die anderen …')}</p>}
      {paying && (
        <div className="rounded-2xl bg-parchment-dark/70 p-3">
          <p className="font-bold">{t('Du musstest deine besten Karten abgeben:')}</p>
          <div className="my-2 flex gap-1.5">{g.hand.gave.map((c, i) => <PlayingCard key={i} rank={c} deck={deck} size="sm" />)}</div>
          <p className="text-sm text-ink-soft">{paying.done ? t('Du hast dafür Karten zurückbekommen.') : t('{name} sucht gerade aus, was du zurückbekommst …', { name: nameOf(paying.to) })}</p>
        </div>
      )}
      {!mine && !paying && <p className="text-ink-soft">{t('Die Steuern werden eingetrieben. Du bist diesmal fein raus.')}</p>}
    </Panel>
  );
}

export function RoundEndPhase({ secondsLeft }: { secondsLeft: number | null }) {
  const t = useT();
  const { state, me, g, nameOf, avatarOf, colorOf } = useTable();
  const last = state.history.at(-1);
  if (!last) return null;
  const present = state.players.filter((p) => !p.left).map((p) => p.id);
  const ready = state.ready.includes(me);
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-4xl font-bold">{t('Runde {round} ist vorbei', { round: last.round })}</h2>
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
            <Icon name={rankIcon(i, last.finish.length)} className="size-6 text-gold-deep" />
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
              <span className="block text-sm leading-tight text-ink-soft">{t('wird {title}', { title: t(rankTitle(i, last.finish.length)) })}</span>
            </span>
            <span className="tabular text-right font-display text-2xl font-bold">
              +{last.points[id] ?? 0}
              <span className="block text-xs font-sans text-ink-soft">{t('{points} gesamt', { points: state.points[id] ?? 0 })}</span>
            </span>
          </motion.li>
        ))}
      </ol>
      {state.teams && <TeamScore />}
      <p className="text-sm text-ink-soft">
        {getSettings(state).goal !== null
          ? t('Gespielt wird bis {goal} Punkte.', { goal: getSettings(state).goal ?? '' })
          : getSettings(state).rounds - last.round === 1 ? t('Noch 1 Runde.') : t('Noch {count} Runden.', { count: getSettings(state).rounds - last.round })}
        {' '}{t('Gleich wird neu gemischt und gegeben.')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => g.dispatch({ type: 'ready' })} disabled={ready || g.busy}>{ready ? <>{t('Bereit')} <Icon name="check" strokeWidth={2.5} /></> : t('Nächste Runde')}</Button>
      </div>
      <ReadyList ids={present} />
    </Panel>
  );
}


/** Team totals (Adel gegen Volk). */
export function TeamScore() {
  const t = useT();
  const { state } = useTable();
  const totals = teamPoints(state);
  return (
    <div className="grid grid-cols-2 gap-2">
      {([0, 1] as const).map((team) => (
        <div key={team} className="rounded-2xl p-3 text-center text-parchment" style={{ backgroundColor: TEAM_INFO[team].color }}>
          <span className="block text-sm font-bold"><Icon name={TEAM_ICONS[team]} /> {t(TEAM_INFO[team].name)}</span>
          <span className="tabular block font-display text-3xl font-bold">{totals[team]}</span>
        </div>
      ))}
    </div>
  );
}
