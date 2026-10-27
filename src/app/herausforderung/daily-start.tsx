'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import { startDailyAction } from '@/server/solo-actions';

export function DailyStart() {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      className="self-start"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await startDailyAction();
        if (res?.error) toast.error(t(res.error));
      })}
    >
      {pending ? t('Karten werden gemischt …') : t('Heute spielen')}
    </Button>
  );
}
