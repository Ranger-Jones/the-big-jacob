'use client';
import { motion } from 'motion/react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CAMPAIGN, campaignTitle } from '@/lib/campaign';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import { startCampaignAction } from '@/server/solo-actions';
import { Icon, STAGE_ICONS } from '@/components/ui/icons';

/** "Vom Bauern zum König": a winding path of stages; one new stage can be conquered per day. */
export function CampaignMap({ level, lockedToday }: { level: number; lockedToday: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<number | null>(null);
  const next = Math.min(level + 1, CAMPAIGN.length);

  function play(stage: number) {
    setChosen(stage);
    start(async () => {
      const res = await startCampaignAction(stage);
      if (res?.error) toast.error(t(res.error));
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <div>
        <h1 className="gold-text text-6xl font-bold">{t('Vom Bauern zum König')}</h1>
        <p className="mt-1 text-parchment/80">
          {t('{n} Stationen gegen immer gerissenere Bots. Gewinne eine Station, um die nächste freizuschalten – eine neue Station pro Tag.', { n: CAMPAIGN.length })}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-velvet-deep/70 px-4 py-1.5 font-bold ring-2 ring-gold/40">
          {t('Dein Titel:')} <span className="text-gold-soft">{t(campaignTitle(level))}</span> · {level}/{CAMPAIGN.length}
        </p>
      </div>

      <ol className="relative flex flex-col gap-5">
        <span aria-hidden className="absolute bottom-6 left-9 top-6 w-1.5 rounded-full bg-[repeating-linear-gradient(180deg,#e8b33a_0_10px,transparent_10px_18px)] opacity-60 sm:left-1/2 sm:-ml-[3px]" />
        {CAMPAIGN.map((stage, i) => {
          const done = stage.level <= level;
          const open = stage.level <= next;
          const current = stage.level === next && level < CAMPAIGN.length;
          return (
            <motion.li
              key={stage.level}
              initial={{ opacity: 0, x: i % 2 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cx('relative flex items-start gap-4 sm:w-1/2', i % 2 ? 'sm:ml-auto sm:pl-10' : 'sm:flex-row-reverse sm:pr-10 sm:text-right')}
            >
              <span
                className={cx(
                  'relative z-10 flex size-[4.5rem] shrink-0 items-center justify-center rounded-full text-4xl ring-4 sm:absolute sm:top-2',
                  i % 2 ? 'sm:-left-9' : 'sm:-right-9',
                  done ? 'bg-gold ring-gold-deep' : current ? 'animate-pulse-ring bg-parchment ring-gold' : open ? 'bg-parchment ring-line' : 'bg-velvet-soft ring-white/10 grayscale',
                )}
              >
                <Icon name={open ? STAGE_ICONS[stage.level] ?? 'star' : 'lock'} className="size-[1em]" />
                {done && <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-vert text-sm text-parchment ring-2 ring-parchment"><Icon name="check" className="size-4" strokeWidth={2.5} /></span>}
              </span>
              <div className={cx('parchment flex-1 rounded-[1.4rem] p-4 ring-2', current ? 'ring-gold shadow-[0_6px_0_var(--color-gold-deep)]' : 'ring-line shadow-[0_6px_0_rgb(0_0_0/0.35)]', !open && 'opacity-60')}>
                <p className="text-sm font-bold text-ink-soft">{t('Station {n}', { n: stage.level })} · {t(stage.twist)}</p>
                <h2 className="text-3xl font-bold">{t(stage.place)}</h2>
                <p className="text-sm">{open ? t(stage.story) : t('Gewinne die vorige Station, um weiterzukommen.')}</p>
                <p className="mt-1 text-xs text-ink-soft">{t('{n} Gegner · Titel: {title}', { n: stage.bots.length, title: t(stage.title) })}</p>
                {current && lockedToday ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-velvet-deep/40 px-3 py-1.5 text-sm font-bold"><Icon name="hourglass" /> {t('Diese Station öffnet morgen.')}</p>
                ) : open && (
                  <Button size="sm" className="mt-3" onClick={() => play(stage.level)} disabled={pending}>
                    {pending && chosen === stage.level ? t('Tisch wird gedeckt …') : done ? t('Nochmal spielen') : t('Herausfordern')}
                  </Button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
      {level >= CAMPAIGN.length && (
        <p className="rounded-2xl bg-gold/20 p-4 text-center font-display text-3xl text-gold-soft ring-2 ring-gold"><Icon name="crown" /> {t('Du hast die Kampagne gemeistert – lang lebe der Große Jakob!')}</p>
      )}
    </main>
  );
}
