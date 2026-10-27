'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CREST_IDS } from '@/components/courts/crest';
import { CrestPicker } from '@/components/courts/crest-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/client';
import { createCourtAction, joinCourtAction } from '@/server/court-actions';

export function CourtForms({ initialCode, first }: { initialCode: string; first: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [crest, setCrest] = useState(CREST_IDS[0]);

  const join = () => start(async () => {
    const res = await joinCourtAction(code);
    if (!res.ok) return void toast.error(t(res.error));
    router.push(`/hoefe/${res.data.id}`);
  });
  const create = () => start(async () => {
    const res = await createCourtAction({ name, crest });
    if (!res.ok) return void toast.error(t(res.error));
    toast.success(t('Hof gegründet. Teile jetzt den Einladungscode.'));
    router.push(`/hoefe/${res.data.id}`);
  });

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{t('Hof beitreten')}</h2>
        <form onSubmit={(e) => { e.preventDefault(); join(); }} className="flex flex-col gap-3">
          <Input
            label={t('Einladungscode')} value={code} maxLength={8} autoCapitalize="characters" autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('z. B. K7QM2XPA')} className="tabular tracking-[0.2em]"
          />
          <Button type="submit" variant="velvet" disabled={pending || code.trim().length !== 8}>{t('Beitreten')}</Button>
        </form>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold">{first ? t('Deinen ersten Hof gründen') : t('Neuen Hof gründen')}</h2>
        <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex flex-col gap-3">
          <Input label={t('Name')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t('z. B. Wache Süd')} />
          <span className="text-sm font-bold text-ink-soft">{t('Wappen')}</span>
          <CrestPicker value={crest} onChange={setCrest} />
          <Button type="submit" disabled={pending || name.trim().length < 2}>{t('Hof gründen')}</Button>
        </form>
      </Card>
    </div>
  );
}
