'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, type AvatarProfile } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { FELTS, FRAMES, type CosmeticStats } from '@/lib/cosmetics';
import { cx } from '@/lib/cx';
import { setCosmeticsAction } from '@/server/profile-actions';
import { Icon } from '@/components/ui/icons';
import { useT } from '@/lib/i18n/client';

/** Pick an unlocked table felt and avatar frame; locked ones show what unlocks them. */
export function CosmeticsPicker({ stats, profile, felt }: { stats: CosmeticStats; profile: AvatarProfile; felt: string | null }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const currentFelt = felt ?? 'wein';
  const currentFrame = profile.avatar_frame ?? 'none';

  async function choose(choice: { felt?: string; frame?: string }) {
    setBusy(true);
    const res = await setCosmeticsAction(choice);
    setBusy(false);
    if (!res.ok) return toast.error(t(res.error));
    toast.success(t('Gespeichert'));
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl font-bold">{t('Dein Tischfilz')}</h2>
        <p className="text-sm text-ink-soft">{t('So sieht der Spieltisch für dich aus.')}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FELTS.map((f) => {
          const open = f.unlocked(stats);
          const active = f.id === currentFelt;
          return (
            <li key={f.id}>
              <button
                type="button"
                disabled={!open || busy || active}
                onClick={() => choose({ felt: f.id })}
                className={cx('flex w-full flex-col items-center gap-1.5 rounded-2xl p-2 ring-2 transition', active ? 'bg-gold/25 ring-gold-deep' : 'ring-line hover:bg-white/10', !open && 'opacity-50 grayscale')}
              >
                <span
                  className="block h-12 w-full rounded-[50%/45%] border-4 border-[#5c3519]"
                  style={{ background: `radial-gradient(ellipse at 50% 35%, ${f.colors[0]}, ${f.colors[1]} 50%, ${f.colors[2]})` }}
                  aria-hidden
                />
                <span className="text-sm font-bold">{!open && <Icon name="lock" className="mr-1" />}{t(f.name)}</span>
                <span className="text-xs text-ink-soft">{active ? t('Aktiv') : open ? t('Wählen') : t(f.hint)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div>
        <h2 className="text-3xl font-bold">{t('Dein Avatar-Rahmen')}</h2>
        <p className="text-sm text-ink-soft">{t('Alle am Hof sehen ihn neben deinem Namen.')}</p>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {FRAMES.map((f) => {
          const open = f.unlocked(stats);
          const active = f.id === currentFrame;
          return (
            <li key={f.id}>
              <button
                type="button"
                disabled={!open || busy || active}
                onClick={() => choose({ frame: f.id })}
                className={cx('flex w-full flex-col items-center gap-2 rounded-2xl px-1 pb-2 pt-4 ring-2 transition', active ? 'bg-gold/25 ring-gold-deep' : 'ring-line hover:bg-white/10', !open && 'opacity-50 grayscale')}
              >
                <Avatar profile={{ ...profile, avatar_frame: f.id === 'none' ? null : f.id }} size="md" />
                <span className="text-xs font-bold leading-tight">{!open && <Icon name="lock" className="mr-1" />}{t(f.name)}</span>
                <span className="text-[0.65rem] leading-tight text-ink-soft">{active ? t('Aktiv') : open ? t('Wählen') : t(f.hint)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
