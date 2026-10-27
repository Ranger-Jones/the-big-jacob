'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CrestPicker } from '@/components/courts/crest-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useT } from '@/lib/i18n/client';
import { leaveCourtAction, removeCourtMemberAction, updateCourtAction } from '@/server/court-actions';
import type { ProfileLite } from '@/server/social-service';
import { Icon } from '@/components/ui/icons';

export function InviteBox({ code }: { code: string }) {
  const t = useT();
  const share = async () => {
    const url = `${location.origin}/hoefe?code=${code}`;
    try {
      if (navigator.share) await navigator.share({ title: t('Komm an meinen Hof'), text: t('Tritt meinem Hof bei. Code: {code}', { code }), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('Einladungslink kopiert.'));
      }
    } catch {
      // Share sheet dismissed.
    }
  };
  return (
    <Card tone="velvet" className="flex flex-wrap items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-bold text-gold-soft">{t('Einladungscode')}</span>
        <span className="tabular block font-sans text-3xl font-bold tracking-[0.25em] text-gold-soft">{code}</span>
      </span>
      <Button onClick={share}>{t('Einladen')}</Button>
    </Card>
  );
}

export function KickButton({ courtId, member }: { courtId: string; member: ProfileLite }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-xl text-ink-soft hover:bg-wax/15 hover:text-wax" aria-label={t('{name} verbannen', { name: member.username })}><Icon name="close" className="size-4" strokeWidth={2.2} /></button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('{name} verbannen?', { name: member.username })}>
        <p>{t('{name} verliert den Platz am Hof und kann nur mit dem Code wieder beitreten.', { name: member.username })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>{t('Abbrechen')}</Button>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => {
            const res = await removeCourtMemberAction(courtId, member.id);
            if (!res.ok) return void toast.error(t(res.error));
            setOpen(false);
            router.refresh();
          })}>{t('Verbannen')}</Button>
        </div>
      </Modal>
    </>
  );
}

export function CourtAdmin({ courtId, owner, name, crest }: { courtId: string; owner: boolean; name: string; crest: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [draft, setDraft] = useState({ name, crest });

  return (
    <div className="flex flex-wrap gap-2">
      {owner && <Button variant="velvet" onClick={() => setEditing(true)}>{t('Name und Wappen ändern')}</Button>}
      <Button variant="ghost" className="text-parchment" onClick={() => setLeaving(true)}>{t('Hof verlassen')}</Button>

      <Modal open={editing} onClose={() => setEditing(false)} title={t('Hof bearbeiten')}>
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateCourtAction(courtId, draft);
            if (!res.ok) return void toast.error(t(res.error));
            setEditing(false);
            router.refresh();
          });
        }}>
          <Input label={t('Name')} value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <CrestPicker value={draft.crest} onChange={(c) => setDraft({ ...draft, crest: c })} />
          <Button type="submit" disabled={pending || draft.name.trim().length < 2}>{t('Speichern')}</Button>
        </form>
      </Modal>

      <Modal open={leaving} onClose={() => setLeaving(false)} title={t('Hof verlassen?')}>
        <p>{owner ? t('Die Hofherrschaft geht an das dienstälteste Mitglied. Bist du das letzte Mitglied, wird der Hof aufgelöst.') : t('Deine Spiele bleiben gezählt, falls du zurückkommst.')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLeaving(false)}>{t('Bleiben')}</Button>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => {
            const res = await leaveCourtAction(courtId);
            if (!res.ok) return void toast.error(t(res.error));
            router.push('/hoefe');
          })}>{t('Verlassen')}</Button>
        </div>
      </Modal>
    </div>
  );
}
