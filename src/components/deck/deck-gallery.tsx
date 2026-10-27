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
import { copyDeckAction, deleteDeckAction, setDeckPublicAction, setDefaultDeckAction, toggleDeckLikeAction } from '@/server/deck-actions';
import type { GalleryDeck, GallerySort } from '@/server/deck-service';
import { DeckFan } from './deck-fan';
import { Icon } from '@/components/ui/icons';

function DeckTile({ deck, isDefault, children, subtitle }: { deck: DeckEntry; isDefault: boolean; children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <li>
      <Card className={cx('flex h-full flex-col gap-3 p-4', isDefault && 'ring-gold shadow-[0_6px_0_var(--color-gold-deep)]')}>
        <div className="flex h-28 items-end justify-center">
          <DeckFan deck={deck} size="sm" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-bold">{deck.name}</h3>
          <p className="text-sm text-ink-soft">{isDefault ? <><Icon name="star" className="text-gold-deep" /> Dein Standard-Deck</> : subtitle ?? '\u00a0'}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">{children}</div>
      </Card>
    </li>
  );
}

function LikeButton({ deck }: { deck: GalleryDeck }) {
  const router = useRouter();
  const [state, setState] = useState({ liked: deck.liked, likes: deck.likes });
  const toggle = async () => {
    const next = { liked: !state.liked, likes: state.likes + (state.liked ? -1 : 1) };
    setState(next);
    const res = await toggleDeckLikeAction(deck.id);
    if (!res.ok) {
      setState({ liked: deck.liked, likes: deck.likes });
      return void toast.error(res.error);
    }
    router.refresh();
  };
  return (
    <button
      type="button" onClick={toggle} aria-pressed={state.liked} aria-label={state.liked ? 'Gefällt mir nicht mehr' : 'Gefällt mir'}
      className={cx('tabular inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors', state.liked ? 'bg-wax text-parchment' : 'bg-parchment-dark text-ink hover:bg-wax/20')}
    >
      <span aria-hidden className={cx(state.liked && 'animate-[pop_0.3s_ease-out]')}><Icon name="heart" className={cx('size-5', state.liked ? 'text-wax [&_path]:fill-current [&_path]:[fill-opacity:1]' : 'text-ink-soft')} /></span>{state.likes}
    </button>
  );
}

export function DeckGallery({ me, mine, friends, defaultId, gallery, sort, shared }: {
  me: string; mine: DeckEntry[]; friends: (DeckEntry & { ownerName: string })[]; defaultId: string | null;
  gallery: GalleryDeck[]; sort: GallerySort; shared: string[];
}) {
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

  async function share(deck: DeckEntry, isPublic: boolean) {
    const res = await setDeckPublicAction(deck.id, isPublic);
    if (!res.ok) return toast.error(res.error);
    toast.success(isPublic ? `„${deck.name}“ hängt jetzt in der Galerie.` : `„${deck.name}“ ist wieder privat.`);
    router.refresh();
  }

  const sharedSet = new Set(shared);
  const friendIds = new Set(friends.map((d) => d.id));
  const sortTab = (active: boolean) => cx('rounded-xl px-3 py-1.5 text-sm font-bold', active ? 'bg-gold text-ink' : 'bg-velvet-deep/60 text-parchment/80 hover:bg-white/10');

  const defaultButton = (id: string) => effectiveDefault !== id && (
    <Button size="sm" variant="ghost" onClick={() => makeDefault(id)}><Icon name="star" /> Als Standard</Button>
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
              <DeckTile key={d.id} deck={d} isDefault={effectiveDefault === d.id} subtitle={sharedSet.has(d.id) ? <><Icon name="image" /> In der Galerie</> : undefined}>
                <Link href={`/decks/${d.id}`} className={buttonClass('primary', 'sm')}>Bearbeiten</Link>
                <Button size="sm" variant="ghost" onClick={() => share(d, !sharedSet.has(d.id))}>{sharedSet.has(d.id) ? 'Aus Galerie nehmen' : <><Icon name="image" /> Teilen</>}</Button>
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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-4xl font-bold">Galerie</h2>
            <p className="text-parchment/75">Decks, die andere Spieler geteilt haben. Gefällt dir eins, kopiere es und mach es zu deinem.</p>
          </div>
          <nav className="flex gap-1.5" aria-label="Sortierung">
            <Link href="/decks" scroll={false} className={sortTab(sort === 'beliebt')} aria-current={sort === 'beliebt' ? 'page' : undefined}>Beliebt</Link>
            <Link href="/decks?galerie=neu" scroll={false} className={sortTab(sort === 'neu')} aria-current={sort === 'neu' ? 'page' : undefined}>Neu</Link>
          </nav>
        </div>
        {gallery.length === 0 ? (
          <Card tone="velvet"><p>Noch hängt nichts in der Galerie. Teile eins deiner Decks mit „Teilen“ und sei der Erste.</p></Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((d) => (
              <DeckTile key={d.id} deck={d} isDefault={false} subtitle={`von ${d.ownerName}${friendIds.has(d.id) ? ' · Freund' : ''}`}>
                <LikeButton deck={d} />
                <Button size="sm" variant="secondary" onClick={() => copy(d.id)} disabled={busy || d.ownerId === me}>Kopieren</Button>
              </DeckTile>
            ))}
          </ul>
        )}
      </section>

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
