'use client';
import { useSyncExternalStore } from 'react';
import { cx } from '@/lib/cx';
import { isMusicOn, onMusicChange, startMusic, stopMusic, wantsMusic } from '@/lib/music';
import { Icon } from '@/components/ui/icons';
import { useT } from '@/lib/i18n/client';

/** Lute music on/off. Browsers need a tap before audio may start, so a remembered "on" pulses until tapped. */
export function MusicToggle({ className }: { className?: string }) {
  const t = useT();
  const on = useSyncExternalStore(onMusicChange, isMusicOn, () => false);
  const wanted = useSyncExternalStore(onMusicChange, wantsMusic, () => false);
  return (
    <button
      type="button"
      onClick={() => (on ? stopMusic() : startMusic())}
      aria-label={on ? t('Musik aus') : t('Musik an')}
      title={!on && wanted ? t('Tippen, um die Musik fortzusetzen') : on ? t('Musik aus') : t('Musik an')}
      className={cx('flex min-h-9 min-w-9 items-center justify-center rounded-xl text-lg transition-colors hover:bg-white/10', !on && wanted && 'animate-pulse', className)}
    >
      <Icon name={on ? 'music' : 'music-off'} className="size-5" />
    </button>
  );
}
