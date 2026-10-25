'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { cropToSquareWebp, validateImageFile } from '@/lib/crop-image';
import { cx } from '@/lib/cx';
import {
  BACK_PATTERNS, DECK_FONTS, FONT_LABELS, PATTERN_LABELS, deckDesignSchema,
  type DeckDesign, type DeckEntry,
} from '@/lib/decks';
import { copiesOf, JESTER, RANKS } from '@/lib/jakob/cards';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { updateDeckAction } from '@/server/deck-actions';
import { CardBack, PlayingCard } from './playing-card';

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-parchment-dark/60 px-3 py-2">
      <span className="font-bold">{label}</span>
      <span className="flex items-center gap-2">
        <span className="tabular text-xs text-ink-soft">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-9 cursor-pointer rounded-lg border-2 border-line bg-transparent" />
      </span>
    </label>
  );
}

const fieldClass = 'h-10 min-w-0 rounded-xl bg-white/60 px-3 text-ink ring-2 ring-inset ring-line outline-none focus:ring-gold-deep';

export function DeckEditor({ deck, me }: { deck: DeckEntry; me: string }) {
  const router = useRouter();
  const [name, setName] = useState(deck.name);
  const [design, setDesign] = useState<DeckDesign>(deck.design);
  const [active, setActive] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadRank = useRef<number>(1);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const preview: DeckEntry = { ...deck, name, design };
  const update = (patch: Partial<DeckDesign>) => {
    setDesign((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const updateCard = (rank: number, patch: Partial<DeckDesign['cards'][number]>) => {
    setDesign((d) => ({ ...d, cards: d.cards.map((c, i) => (i === rank - 1 ? { ...c, ...patch } : c)) }));
    setDirty(true);
  };

  async function upload(file: File) {
    const rank = uploadRank.current;
    const invalid = validateImageFile(file);
    if (invalid) return toast.error(invalid);
    setUploading(rank);
    try {
      const blob = await cropToSquareWebp(file, 384);
      const supabase = createBrowserSupabase();
      const path = `${me}/${deck.id}/r${rank}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from('deck-art').upload(path, blob, { contentType: 'image/webp' });
      if (error) throw error;
      updateCard(rank, { image: supabase.storage.from('deck-art').getPublicUrl(path).data.publicUrl });
      toast.success('Bild eingesetzt – vergiss nicht zu speichern.');
    } catch {
      toast.error('Das Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function save() {
    const check = deckDesignSchema.safeParse(design);
    if (!check.success) return toast.error('Jede Karte braucht einen Namen und ein Symbol.');
    setSaving(true);
    const res = await updateDeckAction(deck.id, name, design);
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    setDirty(false);
    toast.success('Deck gespeichert');
    router.refresh();
  }

  const card = design.cards[active - 1];

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="order-first flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <h1 className="text-5xl font-bold">Deck gestalten</h1>
        <Link href="/decks" className={buttonClass('velvet', 'sm')}>Zur Übersicht</Link>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink-soft">Name des Decks</span>
            <input value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setDirty(true); }} className={cx(fieldClass, 'h-12 text-lg font-bold')} />
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Stil der Vorderseite</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <ColorField label="Rahmen" value={design.frame} onChange={(frame) => update({ frame })} />
            <ColorField label="Zahlen" value={design.accent} onChange={(accent) => update({ accent })} />
            <ColorField label="Papier" value={design.paper} onChange={(paper) => update({ paper })} />
            <ColorField label="Schrift" value={design.ink} onChange={(ink) => update({ ink })} />
          </div>
          <Segmented label="Schriftart" value={design.font} options={DECK_FONTS.map((f) => ({ value: f, label: FONT_LABELS[f] }))} onChange={(font) => update({ font })} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Rückseite</h2>
          <Segmented label="Muster" value={design.back.pattern} options={BACK_PATTERNS.map((p) => ({ value: p, label: PATTERN_LABELS[p] }))}
            onChange={(pattern) => update({ back: { ...design.back, pattern } })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <ColorField label="Grundfarbe" value={design.back.a} onChange={(a) => update({ back: { ...design.back, a } })} />
            <ColorField label="Musterfarbe" value={design.back.b} onChange={(b) => update({ back: { ...design.back, b } })} />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-parchment-dark/60 px-3 py-2">
            <span className="font-bold">Wappen (Emoji oder Kürzel)</span>
            <input value={design.back.emblem} maxLength={8} onChange={(e) => update({ back: { ...design.back, emblem: e.target.value } })} className={cx(fieldClass, 'w-24 text-center text-xl')} />
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Die 13 Karten</h2>
          <p className="text-sm text-ink-soft">Name, Symbol und optional ein Foto pro Karte. Die Zahl bestimmt den Rang und bleibt fest.</p>
          <ul className="flex flex-col gap-2">
            {RANKS.map((rank) => {
              const c = design.cards[rank - 1];
              return (
                <li
                  key={rank}
                  className={cx('flex flex-wrap items-center gap-2 rounded-2xl p-2 ring-2', active === rank ? 'bg-gold/20 ring-gold-deep/50' : 'bg-parchment-dark/40 ring-transparent')}
                  onFocusCapture={() => setActive(rank)}
                >
                  <button type="button" onClick={() => setActive(rank)} className="shrink-0" aria-label={`Karte ${rank} in der Vorschau zeigen`}>
                    <PlayingCard rank={rank} deck={preview} size="xs" />
                  </button>
                  <span className="w-14 shrink-0 text-xs font-bold text-ink-soft">{rank === JESTER ? 'Narr' : `Rang ${rank}`}<br />×{copiesOf(rank)}</span>
                  <input aria-label={`Name Karte ${rank}`} value={c.name} maxLength={24} onChange={(e) => updateCard(rank, { name: e.target.value })} className={cx(fieldClass, 'flex-1 basis-32 font-bold')} />
                  <input aria-label={`Symbol Karte ${rank}`} value={c.emoji} maxLength={8} onChange={(e) => updateCard(rank, { emoji: e.target.value })} className={cx(fieldClass, 'w-16 text-center text-xl')} />
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={uploading !== null}
                      onClick={() => { uploadRank.current = rank; setActive(rank); fileInput.current?.click(); }}
                    >
                      {uploading === rank ? 'Lädt …' : c.image ? '📷 Ändern' : '📷 Foto'}
                    </Button>
                    {c.image && <Button size="sm" variant="ghost" onClick={() => updateCard(rank, { image: null })} aria-label={`Foto von Karte ${rank} entfernen`}>✕</Button>}
                  </span>
                </li>
              );
            })}
          </ul>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </Card>
      </div>

      <aside className="order-first flex flex-col gap-4 lg:order-none lg:sticky lg:top-4">
        <Card tone="velvet" className="flex flex-col items-center gap-4">
          <h2 className="self-start text-3xl font-bold">Vorschau</h2>
          <div className="flex items-end gap-3">
            <PlayingCard rank={active} deck={preview} size="xl" className="max-lg:!w-[6.5rem]" />
            <CardBack design={design} size="lg" className="max-lg:!w-[4.6rem]" />
          </div>
          <p className="text-center text-sm text-parchment/75">{card.name} · {active === JESTER ? 'Narr' : `Rang ${active}`}</p>
          <div className="flex flex-wrap justify-center gap-1">
            {RANKS.map((r) => (
              <button key={r} type="button" onClick={() => setActive(r)} aria-label={`Karte ${r} zeigen`} className={cx('rounded-md', active === r && 'ring-2 ring-gold')}>
                <PlayingCard rank={r} deck={preview} size="xs" />
              </button>
            ))}
          </div>
        </Card>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-white/10 bg-velvet-deep/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="text-sm text-parchment/75">{dirty ? 'Ungespeicherte Änderungen' : 'Alles gespeichert'}</p>
          <Button onClick={save} disabled={saving || !dirty}>{saving ? 'Speichert …' : 'Deck speichern'}</Button>
        </div>
      </div>
    </main>
  );
}
