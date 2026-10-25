'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { PRESETS, type DeckEntry } from '@/lib/decks';
import { copyDeckAction, deleteDeckAction, setDefaultDeckAction } from '@/server/deck-actions';
import { DeckFan } from './deck-fan';

function DeckTile({ deck, isDefault, children, subtitle }: { deck: DeckEntry; isDefault: boolean; children: React.ReactNode; subtitle?: string }) {
  return (
    <li>
      <Card className={cx('flex h-full flex-col gap-3 p-4', isDefault && 'ring-gold shadow-[0_6px_0_var(--color-gold-deep)]')}>
        <div className="flex h-28 items-end justify-center">
          <DeckFan deck={deck} size="sm" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-bold">{deck.name}</h3>
          <p className="text-sm text-ink-soft">{isDefault ? '⭐ Dein Standard-Deck' : subtitle ?? ' '}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">{children}</div>
      </Card>
    </li>
  );
}

export function DeckGallery({ mine, friends, defaultId }: { mine: DeckEntry[]; friends: (DeckEntry & { ownerName: string })[]; defaultId: string | null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<DeckEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const effectiveDefault = defaultId ?? PRESETS[0].id;

  async function copy(id: string, edit = true) {
    setBusy(true);
    const res = await copyDeckAction(id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Deck angelegt');
    if (edit) router.push(`/decks/${res.data.id}`);
    else router.refresh();
  }

  async function makeDefault(id: string) {
    const res = await setDefaultDeckAction(id);
    if (!res.ok) return toast.error(res.error);
    toast.success('Neue Tische startest du jetzt mit diesem Deck.');
    router.refresh();
  }

  async function remove(deck: DeckEntry) {
    setDeleting(null);
    const res = await deleteDeckAction(deck.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(`„${deck.name}“ gelöscht`);
    router.refresh();
  }

  const defaultButton = (id: string) => effectiveDefault !== id && (
    <Button size="sm" variant="ghost" onClick={() => makeDefault(id)}>⭐ Als Standard</Button>
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-12">
      <div>
        <h1 className="text-6xl font-bold">Deine Decks</h1>
        <p className="mt-1 max-w-2xl text-parchment/80">
          Gestalte eigene Karten mit Namen, Symbolen und Fotos. In der Lobby wählst du, mit welchem Deck du spielst – alle sehen deine gelegten Karten darin.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">Meine Decks</h2>
        {mine.length === 0 ? (
          <Card tone="velvet"><p>Noch kein eigenes Deck. Nimm eine Vorlage unten und mach sie zu deiner.</p></Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((d) => (
              <DeckTile key={d.id} deck={d} isDefault={effectiveDefault === d.id}>
                <Link href={`/decks/${d.id}`} className={buttonClass('primary', 'sm')}>Bearbeiten</Link>
                {defaultButton(d.id)}
                <Button size="sm" variant="ghost" onClick={() => copy(d.id, false)} disabled={busy}>Duplizieren</Button>
                <Button size="sm" variant="ghost" className="text-wax" onClick={() => setDeleting(d)}>Löschen</Button>
              </DeckTile>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-4xl font-bold">Vorlagen</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((d) => (
            <DeckTile key={d.id} deck={d} isDefault={effectiveDefault === d.id} subtitle="Vorlage">
              <Button size="sm" onClick={() => copy(d.id)} disabled={busy}>Als Vorlage nutzen</Button>
              {defaultButton(d.id)}
            </DeckTile>
          ))}
        </ul>
      </section>

      {friends.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">Decks deiner Freunde</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((d) => (
              <DeckTile key={d.id} deck={d} isDefault={false} subtitle={`von ${d.ownerName}`}>
                <Button size="sm" variant="secondary" onClick={() => copy(d.id)} disabled={busy}>Kopieren</Button>
              </DeckTile>
            ))}
          </ul>
        </section>
      )}

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Deck löschen?">
        <p className="text-ink-soft">„{deleting?.name}“ und alle hochgeladenen Kartenbilder werden gelöscht.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Behalten</Button>
          <Button variant="danger" onClick={() => deleting && remove(deleting)}>Löschen</Button>
        </div>
      </Modal>
    </main>
  );
}
