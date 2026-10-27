'use client';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renameAction } from '@/server/profile-actions';
import { useT } from '@/lib/i18n/client';

export function RenameForm({ current }: { current: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(renameAction, {});
  if (!open) {
    return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{t('Benutzername ändern')}</Button>;
  }
  return (
    <form action={action} className="parchment flex w-full max-w-sm flex-col gap-2 rounded-2xl p-4 ring-1 ring-line">
      <Input label={t('Neuer Benutzername')} name="username" defaultValue={current} required minLength={3} maxLength={20} error={state.error && t(state.error)} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{t('Speichern')}</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t('Abbrechen')}</Button>
      </div>
    </form>
  );
}
