'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CrestPicker } from '@/components/courts/crest-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { leaveCourtAction, removeCourtMemberAction, updateCourtAction } from '@/server/court-actions';
import type { ProfileLite } from '@/server/social-service';
import { Icon } from '@/components/ui/icons';

export function InviteBox({ code }: { code: string }) {
  const share = async () => {
    const url = `${location.origin}/hoefe?code=${code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Komm an meinen Hof', text: `Tritt meinem Hof bei. Code: ${code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Einladungslink kopiert.');
      }
    } catch {
      // Share sheet dismissed.
    }
  };
  return (
    <Card tone="velvet" className="flex flex-wrap items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-bold text-gold-soft">Einladungscode</span>
        <span className="tabular block font-sans text-3xl font-bold tracking-[0.25em] text-gold-soft">{code}</span>
      </span>
      <Button onClick={share}>Einladen</Button>
    </Card>
  );
}

export function KickButton({ courtId, member }: { courtId: string; member: ProfileLite }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-xl text-ink-soft hover:bg-wax/15 hover:text-wax" aria-label={`${member.username} verbannen`}><Icon name="close" className="size-4" strokeWidth={2.2} /></button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${member.username} verbannen?`}>
        <p>{member.username} verliert den Platz am Hof und kann nur mit dem Code wieder beitreten.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => {
            const res = await removeCourtMemberAction(courtId, member.id);
            if (!res.ok) return void toast.error(res.error);
            setOpen(false);
            router.refresh();
          })}>Verbannen</Button>
        </div>
      </Modal>
    </>
  );
}

export function CourtAdmin({ courtId, owner, name, crest }: { courtId: string; owner: boolean; name: string; crest: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [draft, setDraft] = useState({ name, crest });

  return (
    <div className="flex flex-wrap gap-2">
      {owner && <Button variant="velvet" onClick={() => setEditing(true)}>Name und Wappen ändern</Button>}
      <Button variant="ghost" className="text-parchment" onClick={() => setLeaving(true)}>Hof verlassen</Button>

      <Modal open={editing} onClose={() => setEditing(false)} title="Hof bearbeiten">
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateCourtAction(courtId, draft);
            if (!res.ok) return void toast.error(res.error);
            setEditing(false);
            router.refresh();
          });
        }}>
          <Input label="Name" value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <CrestPicker value={draft.crest} onChange={(c) => setDraft({ ...draft, crest: c })} />
          <Button type="submit" disabled={pending || draft.name.trim().length < 2}>Speichern</Button>
        </form>
      </Modal>

      <Modal open={leaving} onClose={() => setLeaving(false)} title="Hof verlassen?">
        <p>{owner ? 'Die Hofherrschaft geht an das dienstälteste Mitglied. Bist du das letzte Mitglied, wird der Hof aufgelöst.' : 'Deine Spiele bleiben gezählt, falls du zurückkommst.'}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLeaving(false)}>Bleiben</Button>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => {
            const res = await leaveCourtAction(courtId);
            if (!res.ok) return void toast.error(res.error);
            router.push('/hoefe');
          })}>Verlassen</Button>
        </div>
      </Modal>
    </div>
  );
}
