'use client';
import { useT } from '@/lib/i18n/client';

/** The jester's name inside SVG art ("Narr" / "Jester"); a client leaf so the art itself stays server-safe. */
export function JesterWord() {
  const t = useT();
  return <>{t('Narr')}</>;
}
