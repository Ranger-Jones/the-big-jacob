'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Segmented } from '@/components/ui/segmented';
import { compressImage, IMAGE_UNREADABLE, validateImageFile } from '@/lib/crop-image';
import { cx } from '@/lib/cx';
import {
  BACK_PATTERNS, DECK_FONTS, FONT_LABELS, PATTERN_LABELS, PHOTO_FIT_LABELS, PHOTO_FITS, deckDesignSchema,
  type DeckDesign, type DeckEntry,
} from '@/lib/decks';
import { copiesOf, JESTER, RANKS } from '@/lib/jakob/cards';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { updateDeckAction } from '@/server/deck-actions';
import { ART_GROUPS, CardArt, hasArt } from './art';
import { CardStudio, type DesignChange } from './card-studio';
import { CardBack, PlayingCard } from './playing-card';
import { Icon } from '@/components/ui/icons';
import { useT } from '@/lib/i18n/client';

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

const fieldClass = 'h-10 min-w-0 rounded-xl bg-white/5 px-3 text-ink ring-1 ring-inset ring-line outline-none focus:ring-gold-deep';

export function DeckEditor({ deck, me }: { deck: DeckEntry; me: string }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(deck.name);
  const [design, setDesign] = useState<DeckDesign>(deck.design);
  // Undo history: snapshots of the whole design. Slider drags and typing are coalesced into one step.
  const past = useRef<DeckDesign[]>([]);
  const future = useRef<DeckDesign[]>([]);
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  const designRef = useRef(design);
  const coalesce = useRef<{ key: string; at: number } | null>(null);
  useEffect(() => {
    designRef.current = design;
  }, [design]);
  const [active, setActive] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | 'back' | null>(null);
  const [picking, setPicking] = useState<number | 'back' | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadRank = useRef<number | 'back'>(1);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const preview: DeckEntry = { ...deck, name, design };

  const syncHistory = () => setHistorySize({ past: past.current.length, future: future.current.length });

  const change: DesignChange = useCallback((fn, opts) => {
    const mode = opts?.history ?? 'push';
    const current = designRef.current;
    const now = Date.now();
    const last = coalesce.current;
    const sameRun = mode === 'coalesce' && !!last && last.key === opts?.key && now - last.at < 900;
    if (mode === 'push' || (mode === 'coalesce' && !sameRun)) {
      past.current = [...past.current.slice(-79), current];
      future.current = [];
    }
    coalesce.current = mode === 'coalesce' ? { key: opts?.key ?? '', at: now } : null;
    const next = fn(current);
    designRef.current = next;
    setDesign(next);
    setDirty(true);
    syncHistory();
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [designRef.current, ...future.current].slice(0, 80);
    coalesce.current = null;
    designRef.current = prev;
    setDesign(prev);
    setDirty(true);
    syncHistory();
  }, []);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, designRef.current];
    coalesce.current = null;
    designRef.current = next;
    setDesign(next);
    setDirty(true);
    syncHistory();
  }, []);

  // Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z anywhere in the editor, except while typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if (target?.closest('input, textarea, [role="application"]')) return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const update = (patch: Partial<DeckDesign>, key?: string) => change((d) => ({ ...d, ...patch }), key ? { history: 'coalesce', key } : undefined);
  const updateCard = (rank: number, patch: Partial<DeckDesign['cards'][number]>, key?: string) =>
    change((d) => ({ ...d, cards: d.cards.map((c, i) => (i === rank - 1 ? { ...c, ...patch } : c)) }), key ? { history: 'coalesce', key } : undefined);

  async function upload(file: File) {
    const rank = uploadRank.current;
    const invalid = validateImageFile(file);
    if (invalid) return toast.error(t(invalid));
    setUploading(rank);
    try {
      // Backs and full-art fronts use the card's 5:7 shape, medallion photos a square.
      const tall = rank === 'back' || design.photoFit === 'vollbild';
      const image = tall ? await compressImage(file, 500, 700) : await compressImage(file, 384, 384);
      const supabase = createBrowserSupabase();
      const path = `${me}/${deck.id}/${rank === 'back' ? 'back' : `r${rank}`}-${Date.now()}.${image.ext}`;
      const { error } = await supabase.storage.from('deck-art').upload(path, image.blob, { contentType: image.contentType });
      if (error) throw error;
      const url = supabase.storage.from('deck-art').getPublicUrl(path).data.publicUrl;
      if (rank === 'back') update({ back: { ...design.back, image: url, zoom: 1, panX: 0, panY: 0 } });
      else updateCard(rank, { image: url });
      toast.success(t('Bild eingesetzt – vergiss nicht zu speichern.'));
    } catch (err) {
      toast.error(t(err instanceof Error && err.message === IMAGE_UNREADABLE ? IMAGE_UNREADABLE : 'Das Bild konnte nicht hochgeladen werden.'));
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function save() {
    const check = deckDesignSchema.safeParse(design);
    if (!check.success) return toast.error(t('Jede Karte braucht einen Namen und ein Symbol.'));
    setSaving(true);
    const res = await updateDeckAction(deck.id, name, design);
    setSaving(false);
    if (!res.ok) return toast.error(t(res.error));
    setDirty(false);
    toast.success(t('Deck gespeichert'));
    router.refresh();
  }

  const card = design.cards[active - 1];

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="order-first flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <h1 className="text-5xl font-bold">{t('Deck gestalten')}</h1>
        <Link href="/decks" className={buttonClass('velvet', 'sm')}>{t('Zur Übersicht')}</Link>
      </div>
      <Card tone="velvet" className="flex min-w-0 flex-col gap-4 max-sm:-mx-2 max-sm:px-3 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-3xl font-bold">{t('Kartenseite gestalten')}</h2>
          <p className="text-sm text-parchment/75">{t(card.name)} · {active === JESTER ? t('Narr') : t('Rang {rank}', { rank: active })}</p>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap" role="tablist" aria-label={t('Karte wählen')}>
          {RANKS.map((r) => (
            <button
              key={r} type="button" role="tab" aria-selected={active === r} onClick={() => setActive(r)} aria-label={t('Karte {rank} bearbeiten', { rank: r })}
              className={cx('shrink-0 rounded-md transition-transform', active === r ? 'ring-2 ring-gold -translate-y-1' : 'opacity-80 hover:opacity-100')}
            >
              <PlayingCard rank={r} deck={preview} size="sm" />
            </button>
          ))}
        </div>
        <CardStudio
          design={design}
          rank={active}
          change={change}
          undo={undo}
          redo={redo}
          canUndo={historySize.past > 0}
          canRedo={historySize.future > 0}
          uploading={uploading === active}
          onUploadPhoto={() => { uploadRank.current = active; fileInput.current?.click(); }}
          onPickArt={() => setPicking(active)}
        />
      </Card>

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink-soft">{t('Name des Decks')}</span>
            <input value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setDirty(true); }} className={cx(fieldClass, 'h-12 text-lg font-bold')} />
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Stil der Vorderseite')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <ColorField label={t('Rahmen')} value={design.frame} onChange={(frame) => update({ frame }, 'color-frame')} />
            <ColorField label={t('Zahlen')} value={design.accent} onChange={(accent) => update({ accent }, 'color-accent')} />
            <ColorField label={t('Papier')} value={design.paper} onChange={(paper) => update({ paper }, 'color-paper')} />
            <ColorField label={t('Schrift')} value={design.ink} onChange={(ink) => update({ ink }, 'color-ink')} />
          </div>
          <Segmented label={t('Schriftart')} value={design.font} options={DECK_FONTS.map((f) => ({ value: f, label: t(FONT_LABELS[f]) }))} onChange={(font) => update({ font })} />
          <Segmented label={t('Bilder auf der Vorderseite')} value={design.photoFit} options={PHOTO_FITS.map((f) => ({ value: f, label: t(PHOTO_FIT_LABELS[f]) }))} onChange={(photoFit) => update({ photoFit })} />
          <p className="-mt-1 text-sm text-ink-soft">{t('„Ganze Karte“: Grafiken und Fotos füllen die komplette Vorderseite – bei Grafiken wird die Zahl groß ins Bild eingearbeitet.')}</p>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Rückseite gestalten')}</h2>
          <Segmented label={t('Muster')} value={design.back.pattern} options={BACK_PATTERNS.map((p) => ({ value: p, label: t(PATTERN_LABELS[p]) }))}
            onChange={(pattern) => update({ back: { ...design.back, pattern } })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <ColorField label={t('Grundfarbe')} value={design.back.a} onChange={(a) => update({ back: { ...design.back, a } }, 'back-a')} />
            <ColorField label={t('Musterfarbe')} value={design.back.b} onChange={(b) => update({ back: { ...design.back, b } }, 'back-b')} />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-parchment-dark/60 px-3 py-2">
            <span className="font-bold">{t('Wappen (Emoji oder Kürzel)')}</span>
            <input value={design.back.emblem} maxLength={8} onChange={(e) => update({ back: { ...design.back, emblem: e.target.value } }, 'back-emblem')} className={cx(fieldClass, 'w-24 text-center text-xl')} />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-parchment-dark/60 px-3 py-2">
            <span className="font-bold">{t('Wappen-Grafik')}</span>
            <span className="flex items-center gap-1">
              {hasArt(design.back.art) && <CardArt id={design.back.art} className="size-9" />}
              <Button size="sm" variant="secondary" onClick={() => setPicking('back')}><Icon name="palette" /> {hasArt(design.back.art) ? t('Ändern') : t('Wählen')}</Button>
              {design.back.art && <Button size="sm" variant="ghost" onClick={() => update({ back: { ...design.back, art: null } })} aria-label={t('Wappen-Grafik entfernen')}><Icon name="close" /></Button>}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-parchment-dark/60 px-3 py-2">
            <span>
              <span className="block font-bold">{t('Foto über die ganze Rückseite')}</span>
              <span className="block text-sm text-ink-soft">{t('Ersetzt Muster und Wappen.')}</span>
            </span>
            <span className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading !== null}
                onClick={() => { uploadRank.current = 'back'; fileInput.current?.click(); }}
              >
                {uploading === 'back' ? t('Lädt …') : <><Icon name="camera" /> {design.back.image ? t('Ändern') : t('Foto')}</>}
              </Button>
              {design.back.image && <Button size="sm" variant="ghost" onClick={() => update({ back: { ...design.back, image: null } })} aria-label={t('Rückseitenfoto entfernen')}><Icon name="close" /></Button>}
            </span>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">{t('Die 13 Karten')}</h2>
          <p className="text-sm text-ink-soft">{t('Name und Symbol pro Karte, dazu wahlweise eine gezeichnete Grafik oder ein Foto. Die Zahl bestimmt den Rang und bleibt fest.')}</p>
          <ul className="flex flex-col gap-2">
            {RANKS.map((rank) => {
              const c = design.cards[rank - 1];
              return (
                <li
                  key={rank}
                  className={cx('flex flex-wrap items-center gap-2 rounded-2xl p-2 ring-2', active === rank ? 'bg-gold/20 ring-gold-deep/50' : 'bg-parchment-dark/40 ring-transparent')}
                  onFocusCapture={() => setActive(rank)}
                >
                  <button type="button" onClick={() => setActive(rank)} className="shrink-0" aria-label={t('Karte {rank} in der Vorschau zeigen', { rank })}>
                    <PlayingCard rank={rank} deck={preview} size="xs" />
                  </button>
                  <span className="w-14 shrink-0 text-xs font-bold text-ink-soft">{rank === JESTER ? t('Narr') : t('Rang {rank}', { rank })}<br />×{copiesOf(rank)}</span>
                  <input aria-label={t('Name Karte {rank}', { rank })} value={c.name} maxLength={24} onChange={(e) => updateCard(rank, { name: e.target.value }, `${rank}-name`)} className={cx(fieldClass, 'flex-1 basis-32 font-bold')} />
                  <input aria-label={t('Symbol Karte {rank}', { rank })} value={c.emoji} maxLength={8} onChange={(e) => updateCard(rank, { emoji: e.target.value }, `${rank}-emoji`)} className={cx(fieldClass, 'w-16 text-center text-xl')} />
                  <span className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => { setActive(rank); setPicking(rank); }} aria-label={t('Grafik für Karte {rank} wählen', { rank })}>
                      {hasArt(c.art) ? <CardArt id={c.art} className="size-6" /> : <Icon name="palette" className="size-5" />}
                    </Button>
                    {c.art && <Button size="sm" variant="ghost" onClick={() => updateCard(rank, { art: null })} aria-label={t('Grafik von Karte {rank} entfernen', { rank })}><Icon name="close" /></Button>}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={uploading !== null}
                      onClick={() => { uploadRank.current = rank; setActive(rank); fileInput.current?.click(); }}
                    >
                      {uploading === rank ? t('Lädt …') : <><Icon name="camera" /> {c.image ? t('Ändern') : t('Foto')}</>}
                    </Button>
                    {c.image && <Button size="sm" variant="ghost" onClick={() => updateCard(rank, { image: null })} aria-label={t('Foto von Karte {rank} entfernen', { rank })}><Icon name="close" /></Button>}
                  </span>
                </li>
              );
            })}
          </ul>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </Card>

        <Modal open={picking !== null} onClose={() => setPicking(null)} title={picking === 'back' ? t('Wappen-Grafik wählen') : t('Grafik für Karte {rank}', { rank: picking === JESTER ? t('Narr') : String(picking) })} wide>
          <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto pr-1">
            {ART_GROUPS.map((group) => (
              <section key={group.label}>
                <h3 className="mb-1 text-xl font-bold">{t(group.label)}</h3>
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                  {group.ids.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (picking === 'back') update({ back: { ...design.back, art: id } });
                        else if (picking !== null) updateCard(picking, { art: id, image: null });
                        setPicking(null);
                      }}
                      className="rounded-xl p-1 hover:bg-parchment-dark"
                      aria-label={t('Grafik {id}', { id })}
                    >
                      <CardArt id={id} className="w-full" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setPicking(null)}>{t('Abbrechen')}</Button>
        </Modal>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
        <Card tone="velvet" className="flex flex-col items-center gap-3">
          <h2 className="self-start text-3xl font-bold">{t('Rückseite')}</h2>
          <CardBack design={design} size="xl" />
          {design.back.image && (
            <div className="parchment w-full rounded-2xl p-3 ring-1 ring-line">
              <p className="mb-1 font-bold">{t('Foto-Ausschnitt')}</p>
              {([['Zoom', 'zoom', 100, 500, 100], ['Waagerecht', 'panX', -100, 100, 1], ['Senkrecht', 'panY', -100, 100, 1]] as const).map(([label, key, min, max, factor]) => (
                <label key={key} className="flex flex-col gap-1 py-1">
                  <span className="text-sm font-bold">{t(label)}</span>
                  <input
                    type="range" min={min} max={max}
                    value={(design.back[key] ?? (key === 'zoom' ? 1 : 0)) * factor}
                    onChange={(e) => update({ back: { ...design.back, [key]: Number(e.target.value) / factor } }, `back-${key}`)}
                    className="h-2 w-full cursor-pointer accent-[var(--color-wine)]"
                  />
                </label>
              ))}
            </div>
          )}
        </Card>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-white/10 bg-velvet-deep/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="text-sm text-parchment/75">{dirty ? t('Ungespeicherte Änderungen') : t('Alles gespeichert')}</p>
          <Button onClick={save} disabled={saving || !dirty}>{saving ? t('Speichert …') : t('Deck speichern')}</Button>
        </div>
      </div>
    </main>
  );
}
