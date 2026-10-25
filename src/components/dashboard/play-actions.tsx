'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createGameAction, joinGameAction } from '@/server/game-actions';

function CreateButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" disabled={pending}>{pending ? 'Tisch wird gedeckt …' : 'Neuen Tisch eröffnen'}</Button>;
}

export function PlayActions() {
  const [state, join, pending] = useActionState(joinGameAction, {});
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-4xl font-bold">Neues Spiel</h2>
        <p className="text-ink-soft">Du eröffnest den Tisch, lädst Freunde ein oder füllst mit Bots auf.</p>
        <form action={createGameAction} className="mt-auto">
          <CreateButton />
        </form>
      </Card>
      <Card className="flex flex-col items-start gap-3 p-6">
        <h2 className="text-4xl font-bold">Mit Code beitreten</h2>
        <p className="text-ink-soft">Jemand hat dir einen 6-stelligen Code geschickt?</p>
        <form action={join} className="mt-auto flex w-full gap-2">
          <input
            name="code" required maxLength={6} size={6} autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="ABC234" aria-label="Raum-Code"
            className="h-14 min-w-0 flex-1 rounded-2xl bg-parchment-dark/70 px-4 font-display text-3xl font-bold uppercase tracking-[0.2em] text-ink ring-2 ring-inset ring-line outline-none placeholder:text-ink-soft/40 focus:bg-white/60 focus:ring-gold-deep"
          />
          <Button type="submit" size="lg" variant="secondary" disabled={pending}>Beitreten</Button>
        </form>
        {state.error && <p role="alert" className="text-sm font-bold text-wax">{state.error}</p>}
      </Card>
    </div>
  );
}
