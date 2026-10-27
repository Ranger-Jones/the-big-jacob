'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { PlayingCard } from '@/components/deck/playing-card';
import { Hand, selectedCards, type Selection } from '@/components/game/hand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';
import type { DeckEntry } from '@/lib/decks';
import { legalPlays } from '@/lib/jakob/rules';
import { checkLesson, LESSON_CTX, LESSONS, lessonTrick, type Verdict } from '@/lib/tutorial';

/** Seven short, interactive lessons; each one is checked by the real rules. */
export function Lessons({ deck, onDone }: { deck: DeckEntry; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const lesson = LESSONS[index];
  const trick = lessonTrick(lesson);
  const last = index === LESSONS.length - 1;
  const playable = lesson.kind === 'play' ? new Set(legalPlays(lesson.hand, trick, LESSON_CTX).flat()) : null;

  const go = (next: number) => {
    setIndex(next);
    setSelection({});
    setVerdict(null);
  };
  const answer = (a: Parameters<typeof checkLesson>[1]) => setVerdict(checkLesson(lesson, a));

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-1.5" aria-label="Lektionen">
        {LESSONS.map((l, i) => (
          <li key={l.id}>
            <button
              type="button" onClick={() => go(i)} aria-current={i === index ? 'step' : undefined}
              className={cx('flex size-9 items-center justify-center rounded-full font-bold transition-colors',
                i === index ? 'bg-gold text-[#2b1a12]' : i < index ? 'bg-gold/30 text-gold-soft' : 'bg-white/10 text-parchment/70 hover:bg-white/20')}
              aria-label={`Lektion ${i + 1}: ${l.title}`}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={lesson.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-4xl font-bold">{lesson.title}</h2>
              <p className="mt-1 max-w-prose text-ink-soft">{lesson.text}</p>
            </div>
            <p className="rounded-2xl bg-gold/15 px-4 py-3 font-bold text-gold-soft ring-1 ring-gold/40">{lesson.task}</p>

            {lesson.kind !== 'tax' && lesson.kind !== 'quiz' && (
              <div className="flex min-h-36 items-center justify-center rounded-3xl bg-[radial-gradient(ellipse_at_center,#2f6b45,#173b27)] p-4 ring-4 ring-[#6b4423] shadow-inner">
                {trick ? (
                  <div className="flex -space-x-6">
                    {trick.cards.map((c, i) => <PlayingCard key={i} rank={c} deck={deck} size="sm" style={{ rotate: `${(i - (trick.cards.length - 1) / 2) * 6}deg` }} />)}
                  </div>
                ) : <p className="font-display text-2xl text-parchment/80">Der Tisch ist leer, du eröffnest.</p>}
              </div>
            )}

            {lesson.kind === 'quiz' ? (
              <div className="flex flex-col gap-2">
                <Hand cards={lesson.hand} deck={deck} selection={{}} onChange={() => undefined} mode="view" />
                {lesson.quiz!.map((o, i) => (
                  <Button key={o.label} variant="velvet" className="justify-start text-left" disabled={verdict?.ok} onClick={() => answer({ option: i })}>{o.label}</Button>
                ))}
              </div>
            ) : (
              <>
                <Hand
                  cards={lesson.hand} deck={deck} selection={selection} trick={trick}
                  onChange={(s) => { setSelection(s); setVerdict(null); }}
                  mode={lesson.kind === 'tax' ? 'tax' : 'play'} taxCount={lesson.taxCount} playable={playable}
                  received={lesson.kind === 'tax' ? [1, 2] : []}
                />
                <div className="flex flex-wrap gap-2">
                  {lesson.kind === 'tax'
                    ? <Button onClick={() => answer({ cards: selectedCards(selection) })} disabled={verdict?.ok}>Zurückgeben</Button>
                    : <Button onClick={() => answer({ cards: selectedCards(selection) })} disabled={verdict?.ok}>Legen</Button>}
                  {lesson.kind !== 'tax' && <Button variant="velvet" onClick={() => answer({ pass: true })} disabled={verdict?.ok}>Passen</Button>}
                </div>
              </>
            )}

            <div aria-live="polite">
              {verdict && (
                <motion.p
                  key={verdict.message} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={cx('rounded-2xl px-4 py-3 font-bold', verdict.ok ? 'bg-vert/25 text-[#9be3b8] ring-1 ring-vert/60' : 'bg-wax/20 text-[#ffb3b8] ring-1 ring-wax/60')}
                >
                  {verdict.ok ? '✓ ' : ''}{verdict.message}
                </motion.p>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>Zurück</Button>
              {verdict?.ok && (last
                ? <Button size="lg" onClick={onDone}>Übungsspiel starten</Button>
                : <Button onClick={() => go(index + 1)}>Nächste Lektion</Button>)}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
