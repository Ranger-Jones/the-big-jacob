'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { useT } from '@/lib/i18n/client';
import { EMOJI_CATALOG, QUICK_EMOJI_COUNT } from '@/lib/emojis';
import { setQuickEmojisAction } from '@/server/profile-actions';
import { Icon } from '@/components/ui/icons';

/** Six favourites plus a picker; the favourites are saved in the account. */
export function EmojiBar({ onSend, initialQuick }: { onSend: (emoji: string) => void; initialQuick: string[] }) {
  const t = useT();
  const [quick, setQuick] = useState(initialQuick);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string[] | null>(null);

  async function save() {
    if (!editing || editing.length !== QUICK_EMOJI_COUNT) return;
    const res = await setQuickEmojisAction(editing);
    if (!res.ok) return toast.error(t(res.error));
    setQuick(editing);
    setEditing(null);
    toast.success(t('Schnellwahl gespeichert'));
  }

  return (
    <>
      <div role="group" aria-label={t('Reaktion senden')} className="flex items-center gap-0.5 rounded-full bg-velvet-deep/80 p-1 ring-2 ring-white/10">
        {quick.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSend(e)}
            className="flex size-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 hover:bg-white/10 active:scale-90 sm:size-11 sm:text-2xl"
            aria-label={t('{emoji} senden', { emoji: e })}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-full text-lg font-bold text-parchment/80 hover:bg-white/10 sm:size-11 sm:text-xl"
          aria-label={t('Mehr Reaktionen')}
        >
          <Icon name="plus" className="size-5" strokeWidth={2.2} />
        </button>
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? t('Schnellwahl anpassen') : t('Reaktion senden')}>
        {editing && <p className="text-sm text-ink-soft">{t('Wähle genau {count} Emojis ({picked}/{count}).', { count: QUICK_EMOJI_COUNT, picked: editing.length })}</p>}
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
          {EMOJI_CATALOG.map((e) => {
            const picked = editing?.includes(e);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={editing ? picked : undefined}
                onClick={() => {
                  if (!editing) {
                    onSend(e);
                    setOpen(false);
                  } else if (picked) setEditing(editing.filter((x) => x !== e));
                  else if (editing.length < QUICK_EMOJI_COUNT) setEditing([...editing, e]);
                }}
                className={cx('flex aspect-square items-center justify-center rounded-xl text-2xl hover:bg-parchment-dark', picked && 'bg-gold/40 ring-2 ring-gold-deep')}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('Abbrechen')}</Button>
              <Button onClick={save} disabled={editing.length !== QUICK_EMOJI_COUNT}>{t('Speichern')}</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setEditing([...quick])}>{t('Schnellwahl anpassen')}</Button>
          )}
        </div>
      </Modal>
    </>
  );
}
