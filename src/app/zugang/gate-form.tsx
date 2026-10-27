'use client';
import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CrownMark } from '@/components/ui/logo';
import { GATE_QUESTION } from '@/lib/gate';
import { unlockAction } from '@/server/gate-actions';
import { useT } from '@/lib/i18n/client';

export function GateForm({ next }: { next: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(unlockAction, {});
  useEffect(() => {
    if (state.next) window.location.assign(state.next);
  }, [state.next]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="relative w-full max-w-sm p-7 pt-12">
        <span className="absolute -top-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-wax shadow-[0_4px_0_#7f1a22] ring-4 ring-parchment" aria-hidden>
          <CrownMark className="size-9" />
        </span>
        <h1 className="mb-1 text-center text-4xl font-bold">{t('Halt! Wer da?')}</h1>
        <p className="mb-6 text-center text-ink-soft">{t('Die Wache lässt nur ein, wer die Losung kennt.')}</p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Input label={GATE_QUESTION} name="answer" autoComplete="off" autoCapitalize="words" required autoFocus />
          {state.error && <p role="alert" className="rounded-xl bg-wax/10 px-3 py-2 text-sm font-bold text-wax">{t(state.error)}</p>}
          <Button type="submit" size="lg" disabled={pending || !!state.next} className="mt-2 w-full">{t('Tor öffnen')}</Button>
        </form>
      </Card>
    </main>
  );
}
