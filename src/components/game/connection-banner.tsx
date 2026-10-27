'use client';
import { useT } from '@/lib/i18n/client';

export function ConnectionBanner({ connected }: { connected: boolean }) {
  const t = useT();
  if (connected) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-gold px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-center text-sm font-bold text-[#2b1a12]">
      {t('Verbindung zum Hof wird wiederhergestellt …')}
    </div>
  );
}
