'use client';
/* eslint-disable @next/next/no-img-element -- small static SVG portraits, cached by the art route */
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { botArtUrl } from '@/lib/bot-art';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import { DUEL_VARIANTS } from '@/lib/jakob/duel';
import { PERSONA_TIERS, personaTier, type Persona } from '@/lib/jakob/personas';
import { startDuelAction } from '@/server/solo-actions';

export type ArenaBot = Omit<Persona, 'quips'> & { greeting: string; played: number; won: number; openCode: string | null };

const TIER_HINT: Record<(typeof PERSONA_TIERS)[number], string> = {
  'Anfänger': 'Zum Warmwerden – sie machen noch Fehler.',
  'Fortgeschritten': 'Solide Spieler mit eigenem Stil.',
  'Meister': 'Zählen Karten und planen voraus.',
  'Königlich': 'Rechnen jede Runde durch. Viel Glück.',
};

/** "Gegen Bots spielen": pick a character, a rule set, and duel them one on one. */
export function BotArena({ bots }: { bots: ArenaBot[] }) {
  const t = useT();
  const firstUnbeaten = bots.find((b) => b.won === 0) ?? bots[bots.length - 1];
  const [chosenId, setChosenId] = useState(firstUnbeaten.id);
  const [variant, setVariant] = useState(DUEL_VARIANTS[0].id);
  const [pending, start] = useTransition();
  const stage = useRef<HTMLDivElement>(null);
  const bot = bots.find((b) => b.id === chosenId) ?? bots[0];
  const beaten = bots.filter((b) => b.won > 0).length;

  function choose(id: string) {
    setChosenId(id);
    if (window.matchMedia('(max-width: 1023px)').matches) stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function play() {
    start(async () => {
      const res = await startDuelAction(bot.id, variant);
      if (res?.error) toast.error(t(res.error));
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
      <div>
        <h1 className="gold-text text-6xl font-bold">{t('Gegen Bots spielen')}</h1>
        <p className="mt-1 max-w-2xl text-parchment/80">
          {t('Fordere die Leute vom Hof zum Duell: zu zweit, mit je 15 Karten und einem verdeckten Hofstapel. Jeder spielt anders – und ganz oben wartet der König.')}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-velvet-deep/70 px-4 py-1.5 font-bold ring-2 ring-gold/40">
          <Icon name="trophy" className="text-gold-soft" /> {t('{n} von {total} besiegt', { n: beaten, total: bots.length })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
        <div ref={stage} className="scroll-mt-4 lg:sticky lg:top-4">
          <Card className="flex flex-col gap-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="relative">
                  <img src={botArtUrl(bot.name)} alt="" className="size-36 rounded-full ring-[6px] ring-gold shadow-[0_8px_0_var(--color-gold-deep)]" />
                  {bot.won > 0 && (
                    <span className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full bg-vert text-parchment ring-4 ring-parchment" title={t('Besiegt')}>
                      <Icon name="check" className="size-6" strokeWidth={2.6} />
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-bold leading-tight">{t(bot.name)}</h2>
                  <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-wine px-3 py-0.5 text-sm font-bold text-parchment">
                    {t(personaTier(bot.elo))} · {bot.elo} Elo
                  </p>
                </div>
                <p className="relative w-full rounded-2xl bg-velvet-deep/10 px-4 py-3 text-lg font-bold italic ring-1 ring-line">
                  „{t(bot.greeting)}“
                </p>
                <p className="text-ink-soft">{t(bot.bio)}</p>
                <p className="text-sm font-bold">
                  {bot.played === 0
                    ? t('Noch nie gegeneinander gespielt')
                    : t('Deine Bilanz: {won} Siege aus {played} Duellen', { won: bot.won, played: bot.played })}
                </p>
              </motion.div>
            </AnimatePresence>

            <fieldset className="flex flex-col gap-2 border-t-2 border-dashed border-line pt-4">
              <legend className="mb-2 font-bold">{t('Spielart')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {DUEL_VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={variant === v.id}
                    disabled={!!bot.openCode}
                    onClick={() => setVariant(v.id)}
                    className={cx(
                      'rounded-2xl px-3 py-2 text-left ring-2 transition-colors disabled:opacity-50',
                      variant === v.id ? 'bg-wine text-parchment ring-wine-deep' : 'ring-line hover:bg-white/30',
                    )}
                  >
                    <span className="block font-bold">{t(v.name)}</span>
                    <span className={cx('block text-xs leading-snug', variant === v.id ? 'text-parchment/85' : 'text-ink-soft')}>{t(v.description)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Button size="lg" onClick={play} disabled={pending}>
              <Icon name="sword" /> {pending ? t('Tisch wird gedeckt …') : bot.openCode ? t('Duell fortsetzen') : t('Duell beginnen')}
            </Button>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {PERSONA_TIERS.map((tier) => {
            const members = bots.filter((b) => personaTier(b.elo) === tier);
            if (members.length === 0) return null;
            return (
              <section key={tier} aria-labelledby={`tier-${tier}`}>
                <h3 id={`tier-${tier}`} className="text-3xl font-bold">{t(tier)}</h3>
                <p className="mb-3 text-sm text-parchment/70">{t(TIER_HINT[tier])}</p>
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                  {members.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => choose(b.id)}
                        aria-pressed={b.id === bot.id}
                        className={cx(
                          'group flex w-full flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-all',
                          b.id === bot.id ? 'bg-gold/20 ring-2 ring-gold' : 'ring-1 ring-white/10 hover:bg-white/5',
                        )}
                      >
                        <span className="relative">
                          <img src={botArtUrl(b.name)} alt="" className={cx('size-16 rounded-full ring-[3px] transition-transform group-hover:-translate-y-0.5 sm:size-20', b.id === bot.id ? 'ring-gold' : 'ring-gold-deep/70')} />
                          {b.won > 0 && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-vert text-parchment ring-2 ring-velvet-deep">
                              <Icon name="check" className="size-4" strokeWidth={2.6} />
                            </span>
                          )}
                          {b.openCode && (
                            <span className="absolute -left-1 -top-1 flex size-6 items-center justify-center rounded-full bg-gold text-[#2b1a12] ring-2 ring-velvet-deep" title={t('Duell läuft')}>
                              <Icon name="hourglass" className="size-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-2 min-h-[2.5em] w-full text-sm font-bold leading-tight [overflow-wrap:anywhere]">{t(b.name)}</span>
                        <span className="tabular text-xs font-bold text-gold-soft">{b.elo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
