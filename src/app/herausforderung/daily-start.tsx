'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { startDailyAction } from '@/server/solo-actions';

export function DailyStart() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      className="self-start"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await startDailyAction();
        if (res?.error) toast.error(res.error);
      })}
    >
      {pending ? 'Karten werden gemischt …' : 'Heute spielen'}
    </Button>
  );
}
