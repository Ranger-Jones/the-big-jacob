'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PlayingCard } from '@/components/deck/playing-card';
import { Hand, selectedCards, type Selection } from '@/components/game/hand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import type { T } from '@/lib/i18n/core';
import type { DeckEntry } from '@/lib/decks';
import { chooseBotPlay } from '@/lib/jakob/bots';
import { countBy, JESTER } from '@/lib/jakob/cards';
import { applyAction, placements, privateHand, rankTitle, type GameAction, type GameState } from '@/lib/jakob/engine';
import { legalPlays, worstCards } from '@/lib/jakob/rules';
import { describeCards, describeLog } from '@/lib/jakob/texts';
import { ctxOf, newPracticeGame as newGame, PRACTICE_ME as ME, practiceRand as rand } from '@/lib/tutorial';

const BOT_DELAY = 750;

const cardsWord = (n: number, t: T) => (n === 1 ? t('eine Karte') : t('{n} Karten', { n }));

/** What the coach says about the current situation. */
function coach(s: GameState, name: (id: string) => string, t: T): string {
  const pos = s.order.indexOf(ME);
  const title = pos >= 0 ? t(rankTitle(pos, s.order.length)) : '';
  switch (s.phase) {
    case 'draw': return t('Zuerst zieht jeder eine Karte. Die kleinste Zahl wird Großer Jakob und sitzt ganz oben.');
    case 'court': {
      const jesters = (s.hands[ME] ?? []).filter((c) => c === JESTER).length;
      if (jesters === 2 && !s.revolution) return t('Du hältst beide Narren! Als {title} kannst du jetzt eine Revolution ausrufen, dann fallen alle Steuern aus.', { title });
      return t('Neue Runde. Du bist {title}. Gleich werden die Steuern fällig: Die Knechte geben ihre besten Karten an die Jakobs.', { title });
    }
    case 'tax': {
      const pair = s.tax.find((t) => t.to === ME && !t.done);
      if (pair) return t('Du hast {cards} Steuer bekommen (gelb markiert). Gib {cards} zurück, am besten deine schwächsten, also hohe Zahlen.', { cards: cardsWord(pair.count, t) });
      return t('Die Steuern werden ausgetauscht …');
    }
    case 'play': {
      if (s.turn !== ME) return t('{name} ist am Zug.', { name: name(s.turn ?? '') });
      if (!s.trick) return t('Du eröffnest. Leg eine Gruppe gleicher Karten, gern viele schwache auf einmal.');
      const plays = legalPlays(s.hands[ME], s.trick, ctxOf(s));
      if (plays.length === 0) return t('Auf dem Tisch liegt {cards}. Du hast nichts Passendes, also passe.', { cards: describeCards(s.trick.cards, t) });
      return t('Schlag {cards}: genau {count} mit einer kleineren Zahl als {rank}. Oder passe und spar dir deine Karten.', { cards: describeCards(s.trick.cards, t), count: cardsWord(s.trick.count, t), rank: s.trick.rank });
    }
    case 'roundEnd': return t('Runde vorbei! Wer zuerst alle Karten los ist, wird nächste Runde Großer Jakob.');
    default: return '';
  }
}

/** A full game against three bots that runs entirely in the browser, with hints from a bot brain. */
export function Practice({ deck, onExit }: { deck: DeckEntry; onExit: () => void }) {
  const t = useT();
  const [state, setState] = useState<GameState>(newGame);
  const [selection, setSelection] = useState<Selection>({});
  const [message, setMessage] = useState<{ text: string; good?: boolean } | null>(null);

  const botName = (id: string) => t(state.players.find((p) => p.id === id)?.bot?.name ?? '?');
  const name = (id: string) => (id === ME ? t('Du') : botName(id));
  const act = (actor: string, action: GameAction) => {
    const res = applyAction(state, actor, action, rand);
    if (!res.ok) {
      if (actor === ME) setMessage({ text: t(res.error) });
      return false;
    }
    setState(res.state);
    setSelection({});
    if (actor === ME) setMessage(null);
    return true;
  };

  // Bots and bot tax returns move on their own, slightly delayed so the table stays readable.
  useEffect(() => {
    if (state.status !== 'playing') return;
    let next: (() => GameState | null) | null = null;
    if (state.phase === 'play' && state.turn && state.turn !== ME) {
      next = () => { const r = applyAction(state, ME, { type: 'botMove' }, rand); return r.ok ? r.state : null; };
    } else if (state.phase === 'tax') {
      const pair = state.tax.find((t) => !t.done && t.to !== ME);
      if (pair) {
        next = () => {
          const r = applyAction(state, pair.to, { type: 'taxReturn', cards: worstCards(state.hands[pair.to], pair.count, ctxOf(state)) }, rand);
          return r.ok ? r.state : null;
        };
      }
    }
    if (!next) return;
    const run = next;
    const timer = setTimeout(() => { const s = run(); if (s) setState(s); }, BOT_DELAY);
    return () => clearTimeout(timer);
  }, [state]);

  const hand = state.hands[ME] ?? [];
  const myTurn = state.phase === 'play' && state.turn === ME;
  const myTax = state.phase === 'tax' ? state.tax.find((t) => t.to === ME && !t.done) : undefined;
  const ctx = ctxOf(state);
  const playable = myTurn ? new Set(legalPlays(hand, state.trick, ctx).flat()) : null;
  const log = state.log.map((e, i) => ({ key: `${e.seq}-${i}`, text: describeLog(e, botName, t, ME) })).slice(-5).filter((e) => e.text);
  const others = state.order.length ? state.order.filter((id) => id !== ME) : state.players.filter((p) => p.id !== ME).map((p) => p.id);

  const hint = () => {
    if (myTax) {
      const cards = worstCards(hand, myTax.count, ctx);
      setSelection(Object.fromEntries([...countBy(cards)]));
      return setMessage({ text: t('Tipp: Gib {cards} zurück, das sind deine schwächsten Karten.', { cards: describeCards(cards, t) }) });
    }
    const choice = chooseBotPlay(hand, state.trick, ctx, 'sly', rand, {
      handCounts: state.order.filter((id) => id !== ME && !state.finished.includes(id)).map((id) => state.hands[id]?.length ?? 0),
      jesterBan: state.settings.jesterBan,
    });
    if (!choice) return setMessage({ text: t('Tipp: Passen. Deine passenden Karten sind zu wertvoll, um sie hier zu verbrauchen.') });
    setSelection(Object.fromEntries([...countBy(choice)]));
    setMessage({ text: t('Tipp: Leg {cards}. Die Auswahl ist schon markiert.', { cards: describeCards(choice, t) }) });
  };

  if (state.status === 'finished') {
    const places = placements(state);
    const mine = places[ME];
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <Icon name={mine === 1 ? 'crown' : 'medal'} className="size-16 text-gold-soft" />
        <h2 className="text-5xl font-bold">{mine === 1 ? t('Du bist der Große Jakob!') : t('Platz {place}. Gut geübt!', { place: mine })}</h2>
        <ol className="flex flex-col gap-1">
          {Object.entries(places).sort((a, b) => a[1] - b[1]).map(([id, place]) => (
            <li key={id} className={cx('tabular', id === ME && 'font-bold text-gold-soft')}>{place}. {name(id)}: {t('{points} Punkte', { points: state.points[id] ?? 0 })}</li>
          ))}
        </ol>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => { setState(newGame()); setMessage(null); }}>{t('Nochmal üben')}</Button>
          <Button variant="velvet" onClick={onExit}>{t('Zurück zu den Lektionen')}</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-2xl">{t('Übungsspiel · Runde {round} von {rounds}', { round: state.round, rounds: state.settings.rounds })}</p>
        <Button size="sm" variant="ghost" onClick={onExit}>{t('Beenden')}</Button>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {others.map((id) => {
          const p = state.players.find((x) => x.id === id);
          const pos = state.order.indexOf(id);
          return (
            <li key={id} className={cx('flex flex-col items-center gap-0.5 rounded-2xl bg-velvet-deep/70 p-2 text-center ring-2 transition-colors', state.turn === id ? 'ring-gold' : 'ring-white/10', state.passed.includes(id) && 'opacity-60')}>
              <span className="text-3xl" aria-hidden>{p?.bot?.emoji}</span>
              <span className="w-full truncate font-bold">{name(id)}</span>
              {pos >= 0 && <span className="text-xs text-parchment/70">{t(rankTitle(pos, state.order.length))}</span>}
              <span className="tabular text-sm">{state.finished.includes(id) ? <><Icon name="check" /> {t('fertig')}</> : state.passed.includes(id) ? t('passt') : <><Icon name="cards" /> {state.hands[id]?.length ?? 0}</>}</span>
            </li>
          );
        })}
      </ul>

      <div className="relative flex min-h-40 items-center justify-center rounded-[2rem] bg-[radial-gradient(ellipse_at_center,#2f6b45,#173b27)] p-4 ring-4 ring-[#6b4423] shadow-inner">
        <AnimatePresence mode="popLayout">
          {state.trick ? (
            <motion.div key={state.trick.seq} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-1">
              <div className="flex -space-x-6">
                {state.trick.cards.map((c, i) => <PlayingCard key={i} rank={c} deck={deck} size="sm" style={{ rotate: `${(i - (state.trick!.cards.length - 1) / 2) * 6}deg` }} />)}
              </div>
              <span className="rounded-full bg-black/30 px-3 text-sm">{t('von {name}', { name: name(state.trick.by) })}</span>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl text-parchment/75">
              {state.phase === 'play' ? (state.turn === ME ? t('Du eröffnest') : t('{name} eröffnet', { name: name(state.turn ?? '') })) : t('Der Tisch ist leer')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Card className="flex flex-col gap-3">
        <p className="flex gap-2 rounded-2xl bg-gold/15 px-4 py-3 text-gold-soft ring-1 ring-gold/40">
          <Icon name="info" className="mt-0.5 size-5 shrink-0" /><span>{coach(state, name, t)}</span>
        </p>
        {message && <p className={cx('rounded-xl px-3 py-2 font-bold', message.good ? 'bg-vert/25' : 'bg-white/10')} aria-live="polite">{message.text}</p>}

        {state.phase === 'draw' && <Button onClick={() => act(ME, { type: 'draw' })}>{t('Karte ziehen')}</Button>}
        {state.phase === 'court' && (
          <div className="flex flex-wrap gap-2">
            {hand.filter((c) => c === JESTER).length === 2 && !state.revolution && (
              <Button variant="danger" onClick={() => act(ME, { type: 'revolution' })}>{t('Revolution ausrufen')}</Button>
            )}
            <Button onClick={() => act(ME, { type: 'ready' })} disabled={state.ready.includes(ME)}>{t('Weiter zu den Steuern')}</Button>
          </div>
        )}
        {state.phase === 'roundEnd' && (
          <div className="flex flex-col gap-2">
            <ol className="text-sm">
              {(state.history.at(-1)?.finish ?? []).map((id, i) => <li key={id} className={cx(id === ME && 'font-bold text-gold-soft')}>{i + 1}. {name(id)}</li>)}
            </ol>
            <Button onClick={() => act(ME, { type: 'ready' })} disabled={state.ready.includes(ME)}>{t('Nächste Runde')}</Button>
          </div>
        )}

        {hand.length > 0 && state.phase !== 'draw' && (
          <Hand
            cards={hand} deck={deck} selection={selection} trick={state.trick}
            onChange={(s) => { setSelection(s); setMessage(null); }}
            mode={myTax ? 'tax' : myTurn ? 'play' : 'view'} taxCount={myTax?.count} playable={playable}
            received={state.phase === 'tax' || state.phase === 'play' ? privateHand(state, ME).received : []}
          />
        )}
        {(myTurn || myTax) && (
          <div className="flex flex-wrap gap-2">
            {myTurn && <Button onClick={() => act(ME, { type: 'play', cards: selectedCards(selection) })} disabled={selectedCards(selection).length === 0}>{t('Legen')}</Button>}
            {myTurn && state.trick && <Button variant="velvet" onClick={() => act(ME, { type: 'pass' })}>{t('Passen')}</Button>}
            {myTax && <Button onClick={() => act(ME, { type: 'taxReturn', cards: selectedCards(selection) })} disabled={selectedCards(selection).length !== myTax.count}>{t('Zurückgeben')}</Button>}
            <Button variant="ghost" onClick={hint}><Icon name="sparkles" /> {t('Tipp')}</Button>
          </div>
        )}

        {log.length > 0 && (
          <ul className="flex flex-col gap-0.5 border-t border-line/60 pt-2 text-sm text-ink-soft" aria-label={t('Verlauf')}>
            {log.map((e) => <li key={e.key}>{e.text}</li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
