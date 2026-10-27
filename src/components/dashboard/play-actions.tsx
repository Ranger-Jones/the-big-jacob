'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createGameAction, joinGameAction } from '@/server/game-actions';
import { useT } from '@/lib/i18n/client';

function CreateButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? t('Tisch wird gedeckt …') : t('Neuen Tisch eröffnen')}</Button>;
}

/** One panel for both ways into a game: open a table, or join with a code. */
export function PlayActions() {
  const t = useT();
  const [state, join, pending] = useActionState(joinGameAction, {});
  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <form action={createGameAction}>
        <CreateButton />
      </form>
      <form action={join} className="flex w-full gap-2">
        <input
          name="code" required maxLength={6} size={6} autoCapitalize="characters" autoComplete="off" spellCheck={false}
          placeholder={t('Code')} aria-label={t('Raum-Code')}
          className="h-12 min-w-0 flex-1 rounded-2xl bg-parchment-dark/70 px-4 font-display text-2xl font-bold uppercase tracking-[0.25em] text-ink ring-1 ring-inset ring-line outline-none placeholder:text-ink-soft/50 focus:bg-white/10 focus:ring-gold-deep"
        />
        <Button type="submit" variant="secondary" className="min-h-12" disabled={pending}>{t('Beitreten')}</Button>
      </form>
      {state.error && <p role="alert" className="text-sm font-bold text-wax">{t(state.error)}</p>}
    </Card>
  );
}
