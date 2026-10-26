'use client';
import { useSyncExternalStore } from 'react';
import { cx } from '@/lib/cx';
import { isMusicOn, onMusicChange, startMusic, stopMusic, wantsMusic } from '@/lib/music';

/** Lute music on/off. Browsers need a tap before audio may start, so a remembered "on" pulses until tapped. */
export function MusicToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(onMusicChange, isMusicOn, () => false);
  const wanted = useSyncExternalStore(onMusicChange, wantsMusic, () => false);
  return (
    <button
      type="button"
      onClick={() => (on ? stopMusic() : startMusic())}
      aria-label={on ? 'Musik aus' : 'Musik an'}
      title={!on && wanted ? 'Tippen, um die Musik fortzusetzen' : on ? 'Musik aus' : 'Musik an'}
      className={cx('flex min-h-9 min-w-9 items-center justify-center rounded-xl text-lg transition-colors hover:bg-white/10', !on && wanted && 'animate-pulse', className)}
    >
      {on ? '🎵' : '🎶'}
    </button>
  );
}
