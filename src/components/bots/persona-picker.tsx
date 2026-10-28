'use client';
/* eslint-disable @next/next/no-img-element -- small static SVG portraits, cached by the art route */
import { Modal } from '@/components/ui/modal';
import { botArtUrl } from '@/lib/bot-art';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import { PERSONA_TIERS, PERSONAS, personaTier } from '@/lib/jakob/personas';

/** Lobby dialog: seat one of the persona bots (each one only once). */
export function PersonaPicker({ open, onClose, seated, onPick, disabled }: {
  open: boolean; onClose: () => void; seated: Set<string>; onPick: (id: string) => void; disabled?: boolean;
}) {
  const t = useT();
  const sorted = [...PERSONAS].sort((a, b) => a.elo - b.elo);
  return (
    <Modal open={open} onClose={onClose} title={t('Charakter an den Tisch holen')} wide>
      <div className="-mx-2 flex max-h-[60dvh] flex-col gap-4 overflow-y-auto px-2">
        {PERSONA_TIERS.map((tier) => (
          <section key={tier}>
            <h3 className="mb-1.5 text-xl font-bold">{t(tier)}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sorted.filter((p) => personaTier(p.elo) === tier).map((p) => {
                const taken = seated.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={taken || disabled}
                      onClick={() => onPick(p.id)}
                      className={cx('flex w-full items-center gap-2 rounded-2xl p-2 text-left ring-1 ring-line transition-colors hover:bg-white/30 disabled:opacity-45')}
                    >
                      <img src={botArtUrl(p.name)} alt="" className="size-11 shrink-0 rounded-full ring-2 ring-gold-deep" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold leading-tight">{t(p.name)}</span>
                        <span className="block text-xs text-ink-soft">{taken ? t('sitzt schon da') : `${p.elo} Elo`}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
