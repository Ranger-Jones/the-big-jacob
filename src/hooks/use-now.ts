'use client';
import { useEffect, useState } from 'react';

/** Current server-adjusted time, re-rendering every `interval` ms while `active`. */
export function useNow(offset: number, active = true, interval = 250) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now() + offset);
    // Refresh right away: the stored value may be stale from while the clock was paused.
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, interval);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [offset, active, interval]);
  return now;
}
