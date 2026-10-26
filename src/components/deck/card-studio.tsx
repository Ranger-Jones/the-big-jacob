'use client';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { cx } from '@/lib/cx';
import {
  NAME_STYLE_LABELS, NAME_STYLES, NUMBER_STYLE_LABELS, NUMBER_STYLES, PICTURE_SHAPE_LABELS, PICTURE_SHAPES,
  type CardLayout, type DeckDesign, type Sticker,
} from '@/lib/decks';
import { EMOJI_CATALOG } from '@/lib/emojis';
import { JESTER } from '@/lib/jakob/cards';
import { hasArt } from './art';
import { defaultLayout, elementHandles, LayoutFace, type ElementKey, type GestureMode } from './card-layout';

export type HistoryMode = 'push' | 'coalesce' | 'none';
export type DesignChange = (fn: (d: DeckDesign) => DeckDesign, opts?: { history?: HistoryMode; key?: string }) => void;

interface StudioProps {
  design: DeckDesign;
  rank: number;
  change: DesignChange;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  uploading: boolean;
  onUploadPhoto: () => void;
  onPickArt: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number) => Math.round(v * 10) / 10;
const SNAP = 1.6;

function Slider({ label, value, min, max, step = 1, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1 py-1">
      <span className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="tabular text-ink-soft">{Math.round(value)}{unit}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--color-wine)]"
      />
    </label>
  );
}

function ColorRow({ label, value, onChange, onReset }: { label: string; value: string; onChange: (v: string) => void; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm font-bold">{label}</span>
      <span className="flex items-center gap-1">
        {onReset && <button type="button" onClick={onReset} className="rounded-lg px-2 py-1 text-xs font-bold text-ink-soft hover:bg-parchment-dark">Standard</button>}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-9 cursor-pointer rounded-lg border-2 border-line bg-transparent" aria-label={label} />
      </span>
    </div>
  );
}

let stickerCounter = 0;
const newStickerId = () => `${Date.now().toString(36).slice(-6)}${(stickerCounter++).toString(36)}`.slice(0, 12);

/** Interactive large card with drag/scale/rotate handles and an inspector for the selected element. */
export function CardStudio({ design, rank, change, undo, redo, canUndo, canRedo, uploading, onUploadPhoto, onPickArt }: StudioProps) {
  const card = design.cards[rank - 1];
  const layout = card.layout ?? defaultLayout(design, card);
  const custom = !!card.layout;
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyStickers, setCopyStickers] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  /** Selection overlay; its size is copied from the selected element's DOM box before paint. */
  const overlayRef = useRef<HTMLDivElement>(null);

  // Gesture bookkeeping (refs: pointer moves must not wait for React).
  const gesture = useRef<{
    key: ElementKey; mode: GestureMode | 'pinch'; startX: number; startY: number; rect: DOMRect; start: CardLayout;
    cx: number; cy: number; startDist: number; startAngle: number; pushed: boolean;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  });

  // Size the overlay to the selected element after every render (it changes while scaling).
  useLayoutEffect(() => {
    const box = overlayRef.current;
    if (!box || !selected || !canvas.current || (selected === 'picture' && layout.picture.fill)) return;
    const el = canvas.current.querySelector<HTMLElement>(`[data-el="${CSS.escape(selected)}"]`);
    box.style.width = `${(el?.offsetWidth ?? 0) + 6}px`;
    box.style.height = `${(el?.offsetHeight ?? 0) + 6}px`;
    box.style.visibility = el ? 'visible' : 'hidden';
  });

  // A different card starts with nothing selected.
  const [shownRank, setShownRank] = useState(rank);
  if (shownRank !== rank) {
    setShownRank(rank);
    setSelected(null);
    setPanMode(false);
  }

  const setLayout = (fn: (l: CardLayout) => CardLayout, opts?: { history?: HistoryMode; key?: string }) => {
    change((d) => ({
      ...d,
      cards: d.cards.map((c, i) => (i === rank - 1 ? { ...c, layout: fn(c.layout ?? defaultLayout(d, c)) } : c)),
    }), opts);
  };
  const edit = (key: string) => (fn: (l: CardLayout) => CardLayout) => setLayout(fn, { history: 'coalesce', key: `${rank}-${key}` });

  const stickerOf = (key: ElementKey | null): Sticker | undefined =>
    key?.startsWith('sticker:') ? layout.stickers.find((s) => `sticker:${s.id}` === key) : undefined;
  const updateSticker = (id: string, patch: Partial<Sticker>, history: HistoryMode = 'coalesce') =>
    setLayout((l) => ({ ...l, stickers: l.stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)) }), { history, key: `${rank}-sticker-${id}` });

  /** Current numbers for an element (position in %, size, rotation). */
  function geometry(l: CardLayout, key: ElementKey) {
    if (key === 'picture') return { x: l.picture.fill ? 50 : l.picture.x, y: l.picture.fill ? 50 : l.picture.y, size: l.picture.size, rotate: l.picture.rotate };
    if (key === 'number') return { x: l.number.x, y: l.number.y, size: l.number.size, rotate: 0 };
    if (key === 'name') return { x: l.name.x, y: l.name.y, size: l.name.size, rotate: 0 };
    const s = l.stickers.find((st) => `sticker:${st.id}` === key)!;
    return { x: s.x, y: s.y, size: s.size, rotate: s.rotate };
  }

  function applyGeometry(l: CardLayout, key: ElementKey, g: { x?: number; y?: number; size?: number; rotate?: number; zoom?: number; panX?: number; panY?: number }): CardLayout {
    if (key === 'picture') return { ...l, picture: { ...l.picture, ...g } };
    if (key === 'number') return { ...l, number: { ...l.number, ...(g.x !== undefined ? { x: g.x } : {}), ...(g.y !== undefined ? { y: g.y } : {}), ...(g.size !== undefined ? { size: clamp(g.size, 4, 90) } : {}) } };
    if (key === 'name') return { ...l, name: { ...l.name, ...(g.x !== undefined ? { x: g.x } : {}), ...(g.y !== undefined ? { y: g.y } : {}), ...(g.size !== undefined ? { size: clamp(g.size, 3, 25) } : {}) } };
    return {
      ...l,
      stickers: l.stickers.map((s) => (`sticker:${s.id}` === key
        ? { ...s, ...(g.x !== undefined ? { x: g.x } : {}), ...(g.y !== undefined ? { y: g.y } : {}), ...(g.size !== undefined ? { size: clamp(g.size, 3, 90) } : {}), ...(g.rotate !== undefined ? { rotate: g.rotate } : {}) }
        : s)),
    };
  }

  function startGesture(clientX: number, clientY: number, key: ElementKey, mode: GestureMode | 'pinch') {
    const rect = canvas.current!.getBoundingClientRect();
    const l = layoutRef.current;
    const geo = geometry(l, key);
    const cx = rect.left + (geo.x / 100) * rect.width;
    const cy = rect.top + (geo.y / 100) * rect.height;
    gesture.current = {
      key, mode, startX: clientX, startY: clientY, rect, start: l, cx, cy,
      startDist: Math.max(8, Math.hypot(clientX - cx, clientY - cy)),
      startAngle: Math.atan2(clientY - cy, clientX - cx),
      pushed: false,
    };
  }

  const hooks = {
    selected,
    panMode,
    onPointerDown: (e: PointerEvent<HTMLElement>, key: ElementKey, mode: GestureMode) => {
      e.stopPropagation();
      setSelected(key);
      if (gesture.current?.mode === 'pinch') return;
      canvas.current?.setPointerCapture(e.pointerId);
      startGesture(e.clientX, e.clientY, key, mode);
    },
  };

  function onPointerDownCapture(e: PointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && selected) {
      const [a, b] = [...pointers.current.values()];
      startGesture((a.x + b.x) / 2, (a.y + b.y) / 2, selected, 'pinch');
      const g = gesture.current!;
      g.startDist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
      g.startAngle = Math.atan2(b.y - a.y, b.x - a.x);
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const history: HistoryMode = g.pushed ? 'none' : 'push';
    g.pushed = true;
    const s = g.start;
    const geo = geometry(s, g.key);
    const dx = ((e.clientX - g.startX) / g.rect.width) * 100;
    const dy = ((e.clientY - g.startY) / g.rect.height) * 100;

    if (g.mode === 'pinch') {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts;
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / g.startDist;
      const turn = ((Math.atan2(b.y - a.y, b.x - a.x) - g.startAngle) * 180) / Math.PI;
      if (g.key === 'picture' && s.picture.fill) setLayout((l) => applyGeometry(l, 'picture', { zoom: clamp(round(s.picture.zoom * ratio), 1, 5) }), { history });
      else setLayout((l) => applyGeometry(l, g.key, { size: round(geo.size * ratio), rotate: g.key === 'picture' || g.key.startsWith('sticker:') ? Math.round(geo.rotate + turn) : undefined }), { history });
      return;
    }
    if (g.mode === 'move') {
      let x = round(clamp(geo.x + dx, -20, 120));
      let y = round(clamp(geo.y + dy, -20, 120));
      const v = Math.abs(x - 50) < SNAP;
      const h = Math.abs(y - 50) < SNAP;
      if (v) x = 50;
      if (h) y = 50;
      setGuides({ v, h });
      setLayout((l) => applyGeometry(l, g.key, { x, y }), { history });
    } else if (g.mode === 'pan') {
      const fill = s.picture.fill;
      const boxW = fill ? g.rect.width : (g.rect.width * s.picture.size) / 100;
      const boxH = fill ? g.rect.height : boxW;
      const panX = round(clamp(s.picture.panX + (2 * (e.clientX - g.startX) / boxW) * 100, -100, 100));
      const panY = round(clamp(s.picture.panY + (2 * (e.clientY - g.startY) / boxH) * 100, -100, 100));
      setLayout((l) => applyGeometry(l, 'picture', { panX, panY }), { history });
    } else if (g.mode === 'scale') {
      const ratio = Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / g.startDist;
      if (g.key === 'picture' && s.picture.fill) setLayout((l) => applyGeometry(l, 'picture', { zoom: clamp(round(s.picture.zoom * ratio), 1, 5) }), { history });
      else setLayout((l) => applyGeometry(l, g.key, { size: round(clamp(geo.size * ratio, 3, 250)) }), { history });
    } else if (g.mode === 'rotate') {
      let deg = (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI + 90;
      if (deg > 180) deg -= 360;
      const snapped = Math.round(deg / 45) * 45;
      if (Math.abs(deg - snapped) < 5) deg = snapped;
      setLayout((l) => applyGeometry(l, g.key, { rotate: Math.round(deg) }), { history });
    }
  }

  function endGesture(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.mode === 'pinch' && pointers.current.size > 0) return;
    gesture.current = null;
    setGuides({ v: false, h: false });
  }

  // Mouse wheel scales the selected element (needs a non-passive listener).
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!selected) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setLayout((l) => {
        if (selected === 'picture' && l.picture.fill) return applyGeometry(l, 'picture', { zoom: clamp(round(l.picture.zoom * factor), 1, 5) });
        return applyGeometry(l, selected, { size: round(geometry(l, selected).size * factor) });
      }, { history: 'coalesce', key: `${rank}-wheel-${selected}` });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const order = elementOrder;
      const i = selected ? order.indexOf(selected) : -1;
      setSelected(order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length]);
      return;
    }
    if (!selected) return;
    const step = e.shiftKey ? 2 : 0.5;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [mx, my] = moves[e.key];
      setLayout((l) => {
        const geo = geometry(l, selected);
        return applyGeometry(l, selected, { x: round(geo.x + mx), y: round(geo.y + my) });
      }, { history: 'coalesce', key: `${rank}-keys-${selected}` });
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.startsWith('sticker:')) {
      e.preventDefault();
      removeSticker(selected);
    } else if (e.key === 'Escape') setSelected(null);
  }

  function addSticker(kind: Sticker['kind']) {
    const sticker: Sticker = {
      id: newStickerId(), kind, value: kind === 'emoji' ? '⭐' : 'Text', x: 50, y: 50,
      size: kind === 'emoji' ? 16 : 10, rotate: 0, color: kind === 'emoji' ? '#000000' : design.accent,
    };
    if (layout.stickers.length >= 12) return;
    setLayout((l) => ({ ...l, stickers: [...l.stickers, sticker] }), { history: 'push' });
    setSelected(`sticker:${sticker.id}`);
  }

  function removeSticker(key: ElementKey) {
    setLayout((l) => ({ ...l, stickers: l.stickers.filter((s) => `sticker:${s.id}` !== key) }), { history: 'push' });
    setSelected(null);
  }

  function reorderSticker(key: ElementKey, dir: 1 | -1) {
    setLayout((l) => {
      const list = [...l.stickers];
      const i = list.findIndex((s) => `sticker:${s.id}` === key);
      const j = clamp(i + dir, 0, list.length - 1);
      [list[i], list[j]] = [list[j], list[i]];
      return { ...l, stickers: list };
    }, { history: 'push' });
  }

  function copyToAll() {
    const source = layout;
    change((d) => ({
      ...d,
      cards: d.cards.map((c) => {
        const base = c.layout ?? defaultLayout(d, c);
        return { ...c, layout: { ...source, stickers: copyStickers ? source.stickers.map((s) => ({ ...s, id: newStickerId() })) : base.stickers } };
      }),
    }), { history: 'push' });
    setCopyOpen(false);
  }

  /** Bottom to top, the same order the card draws its layers. */
  const elementOrder: ElementKey[] = ['picture', ...layout.stickers.map((s) => `sticker:${s.id}` as ElementKey), 'name', 'number'];
  const elementLabel = (key: ElementKey): string => {
    if (key === 'picture') return `🖼️ Bild${layout.picture.visible ? '' : ' (aus)'}`;
    if (key === 'number') return `🔢 Zahl${layout.number.style === 'aus' ? ' (aus)' : ''}`;
    if (key === 'name') return `🏷️ Name${layout.name.style === 'aus' ? ' (aus)' : ''}`;
    const st = stickerOf(key);
    return st ? (st.kind === 'emoji' ? st.value : `✏️ ${st.value.slice(0, 10)}`) : '';
  };

  // Selection overlay: drawn above every layer, outside the card clip, so handles are always reachable.
  let overlay: ReactNode = null;
  if (selected) {
    const fill = selected === 'picture' && layout.picture.fill;
    const geo = geometry(layout, selected);
    const { scale, rotate } = elementHandles(layout, selected);
    overlay = (
      <div
        ref={overlayRef}
        key={fill ? 'fill' : 'box'}
        aria-hidden
        className="pointer-events-none absolute z-30"
        style={fill
          ? { inset: 0 }
          : { left: `${geo.x}%`, top: `${geo.y}%`, transform: `translate(-50%, -50%) rotate(${geo.rotate}deg)` }}
      >
        <span className={cx('absolute inset-0 border-2 border-dashed border-azure', fill ? 'rounded-[10%]' : 'rounded-md')} />
        {scale && (
          <span
            onPointerDown={(e) => hooks.onPointerDown(e, selected, 'scale')}
            title={fill ? 'Zoomen' : 'Größe ändern'}
            className="pointer-events-auto absolute -bottom-3 -right-3 size-7 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-azure shadow-lg"
          />
        )}
        {rotate && (
          <span
            onPointerDown={(e) => hooks.onPointerDown(e, selected, 'rotate')}
            title="Drehen"
            className="pointer-events-auto absolute -top-9 left-1/2 flex size-7 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-white bg-gold text-sm shadow-lg"
          >
            ↻
          </span>
        )}
      </div>
    );
  }

  const sticker = stickerOf(selected);
  const hasPhoto = !!card.image;
  const drawn = !hasPhoto && hasArt(card.art);
  let inspector: ReactNode;

  if (selected === 'picture') {
    const p = layout.picture;
    const set = edit('picture');
    inspector = (
      <>
        <h3 className="text-2xl font-bold">Bild</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onUploadPhoto} disabled={uploading}>{uploading ? 'Lädt …' : hasPhoto ? '📷 Foto ändern' : '📷 Foto'}</Button>
          <Button size="sm" variant="secondary" onClick={onPickArt}>🎨 Grafik</Button>
        </div>
        <Switch label="Ganze Karte füllen" hint="Das Bild bedeckt die komplette Vorderseite." checked={p.fill} onChange={(fill) => setLayout((l) => ({ ...l, picture: { ...l.picture, fill } }), { history: 'push' })} />
        {!p.fill && (
          <>
            <Segmented label="Form" value={p.shape} options={PICTURE_SHAPES.map((s) => ({ value: s, label: PICTURE_SHAPE_LABELS[s] }))} onChange={(shape) => setLayout((l) => ({ ...l, picture: { ...l.picture, shape } }), { history: 'push' })} />
            <Slider label="Größe" value={p.size} min={10} max={160} unit=" %" onChange={(size) => set((l) => ({ ...l, picture: { ...l.picture, size } }))} />
            <Slider label="Drehung" value={p.rotate} min={-180} max={180} unit="°" onChange={(rotate) => set((l) => ({ ...l, picture: { ...l.picture, rotate } }))} />
          </>
        )}
        {(hasPhoto || p.fill) && (
          <>
            <Slider label="Zoom" value={p.zoom * 100} min={100} max={500} unit=" %" onChange={(z) => set((l) => ({ ...l, picture: { ...l.picture, zoom: z / 100 } }))} />
            <Slider label="Ausschnitt waagerecht" value={p.panX} min={-100} max={100} onChange={(panX) => set((l) => ({ ...l, picture: { ...l.picture, panX } }))} />
            <Slider label="Ausschnitt senkrecht" value={p.panY} min={-100} max={100} onChange={(panY) => set((l) => ({ ...l, picture: { ...l.picture, panY } }))} />
            {!p.fill && !drawn && <Switch label="Ausschnitt mit dem Finger verschieben" hint="Ziehen verschiebt dann das Foto im Rahmen statt den Rahmen." checked={panMode} onChange={setPanMode} />}
          </>
        )}
        <Switch label="Bild anzeigen" checked={p.visible} onChange={(visible) => setLayout((l) => ({ ...l, picture: { ...l.picture, visible } }), { history: 'push' })} />
      </>
    );
  } else if (selected === 'number') {
    const n = layout.number;
    const set = edit('number');
    inspector = (
      <>
        <h3 className="text-2xl font-bold">Zahl</h3>
        <Segmented label="Darstellung" value={n.style} options={NUMBER_STYLES.map((s) => ({ value: s, label: NUMBER_STYLE_LABELS[s] }))}
          onChange={(style) => setLayout((l) => ({
            ...l, number: style === 'gross' ? { ...l.number, style, x: 50, y: 22, size: 40 } : style === 'ecken' ? { ...l.number, style, x: 13, y: 9, size: 19 } : { ...l.number, style },
          }), { history: 'push' })} />
        {n.style !== 'aus' && (
          <>
            <Slider label="Größe" value={n.size} min={6} max={80} unit=" %" onChange={(size) => set((l) => ({ ...l, number: { ...l.number, size } }))} />
            <ColorRow label="Farbe" value={n.color ?? design.accent} onChange={(color) => set((l) => ({ ...l, number: { ...l.number, color } }))}
              onReset={n.color ? () => setLayout((l) => ({ ...l, number: { ...l.number, color: null } }), { history: 'push' }) : undefined} />
          </>
        )}
        {n.style === 'ecken' && <p className="text-sm text-ink-soft">Die Zahl unten rechts spiegelt die obere automatisch.</p>}
      </>
    );
  } else if (selected === 'name') {
    const n = layout.name;
    const set = edit('name');
    inspector = (
      <>
        <h3 className="text-2xl font-bold">Name</h3>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Text</span>
          <input
            value={card.name} maxLength={24}
            onChange={(e) => change((d) => ({ ...d, cards: d.cards.map((c, i) => (i === rank - 1 ? { ...c, name: e.target.value } : c)) }), { history: 'coalesce', key: `${rank}-nametext` })}
            className="h-10 rounded-xl bg-white/60 px-3 font-bold text-ink ring-2 ring-inset ring-line outline-none focus:ring-gold-deep"
          />
        </label>
        <Segmented label="Stil" value={n.style} options={NAME_STYLES.map((s) => ({ value: s, label: NAME_STYLE_LABELS[s] }))} onChange={(style) => setLayout((l) => ({ ...l, name: { ...l.name, style } }), { history: 'push' })} />
        {n.style !== 'aus' && (
          <>
            <Slider label="Schriftgröße" value={n.size} min={3} max={20} step={0.5} unit=" %" onChange={(size) => set((l) => ({ ...l, name: { ...l.name, size } }))} />
            <Slider label="Breite" value={n.width} min={20} max={100} unit=" %" onChange={(width) => set((l) => ({ ...l, name: { ...l.name, width } }))} />
          </>
        )}
      </>
    );
  } else if (sticker) {
    const key = `sticker:${sticker.id}` as ElementKey;
    inspector = (
      <>
        <h3 className="text-2xl font-bold">{sticker.kind === 'emoji' ? 'Sticker' : 'Text'}</h3>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">{sticker.kind === 'emoji' ? 'Emoji' : 'Text'}</span>
          <input
            value={sticker.value} maxLength={24}
            onChange={(e) => e.target.value.trim() && updateSticker(sticker.id, { value: e.target.value })}
            className="h-10 rounded-xl bg-white/60 px-3 text-lg font-bold text-ink ring-2 ring-inset ring-line outline-none focus:ring-gold-deep"
          />
        </label>
        {sticker.kind === 'emoji' && (
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATALOG.slice(0, 32).map((em) => (
              <button key={em} type="button" onClick={() => updateSticker(sticker.id, { value: em }, 'push')} className={cx('rounded-lg text-xl hover:bg-parchment-dark', sticker.value === em && 'bg-gold/40')}>{em}</button>
            ))}
          </div>
        )}
        <Slider label="Größe" value={sticker.size} min={3} max={90} unit=" %" onChange={(size) => updateSticker(sticker.id, { size })} />
        <Slider label="Drehung" value={sticker.rotate} min={-180} max={180} unit="°" onChange={(rotate) => updateSticker(sticker.id, { rotate })} />
        {sticker.kind === 'text' && <ColorRow label="Farbe" value={sticker.color} onChange={(color) => updateSticker(sticker.id, { color })} />}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => reorderSticker(key, 1)}>Nach vorne</Button>
          <Button size="sm" variant="secondary" onClick={() => reorderSticker(key, -1)}>Nach hinten</Button>
          <Button size="sm" variant="secondary" onClick={() => {
            const copy = { ...sticker, id: newStickerId(), x: sticker.x + 4, y: sticker.y + 4 };
            setLayout((l) => ({ ...l, stickers: [...l.stickers, copy] }), { history: 'push' });
            setSelected(`sticker:${copy.id}`);
          }} disabled={layout.stickers.length >= 12}>Duplizieren</Button>
          <Button size="sm" variant="danger" onClick={() => removeSticker(key)}>Löschen</Button>
        </div>
      </>
    );
  } else {
    inspector = (
      <>
        <h3 className="text-2xl font-bold">Karte {rank === JESTER ? 'Narr' : rank}</h3>
        <p className="text-sm text-ink-soft">
          Tippe ein Element auf der Karte oder oben bei „Ebenen“ an. Ziehen verschiebt, der blaue Punkt skaliert, der goldene dreht.
          Mit zwei Fingern kannst du zoomen und drehen, mit Tab zwischen den Elementen wechseln.
        </p>
        <ColorRow label="Hintergrund" value={layout.background ?? design.paper}
          onChange={(background) => edit('background')((l) => ({ ...l, background }))}
          onReset={layout.background ? () => setLayout((l) => ({ ...l, background: null }), { history: 'push' }) : undefined} />
        <Switch label="Zierrahmen" hint="Goldene Innenlinie mit Eck-Rauten." checked={layout.frame} onChange={(frame) => setLayout((l) => ({ ...l, frame }), { history: 'push' })} />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={() => setSelected('picture')}>Bild</Button>
          <Button size="sm" variant="secondary" onClick={() => setSelected('number')}>Zahl</Button>
          <Button size="sm" variant="secondary" onClick={() => setSelected('name')}>Name</Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="velvet" onClick={undo} disabled={!canUndo} aria-label="Rückgängig">↶</Button>
        <Button size="sm" variant="velvet" onClick={redo} disabled={!canRedo} aria-label="Wiederholen">↷</Button>
        <span className="mx-1 h-6 w-px bg-white/20" aria-hidden />
        <Button size="sm" variant="velvet" onClick={() => addSticker('emoji')} disabled={layout.stickers.length >= 12}>＋ Sticker</Button>
        <Button size="sm" variant="velvet" onClick={() => addSticker('text')} disabled={layout.stickers.length >= 12}>＋ Text</Button>
        <span className="mx-1 h-6 w-px bg-white/20" aria-hidden />
        <Button size="sm" variant="velvet" onClick={() => setCopyOpen(true)}>Auf alle Karten</Button>
        {custom && <Button size="sm" variant="ghost" onClick={() => { change((d) => ({ ...d, cards: d.cards.map((c, i) => (i === rank - 1 ? { ...c, layout: null } : c)) }), { history: 'push' }); setSelected(null); }}>Standard-Layout</Button>}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="toolbar" aria-label="Ebenen">
        <span className="mr-1 text-sm font-bold text-parchment/70">Ebenen:</span>
        {[...elementOrder].reverse().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            aria-pressed={selected === key}
            className={cx(
              'min-h-9 max-w-[9rem] truncate rounded-xl px-2.5 text-sm font-bold ring-2 transition-colors',
              selected === key ? 'bg-gold text-ink ring-gold' : 'bg-velvet-soft text-parchment ring-white/10 hover:bg-white/15',
            )}
          >
            {elementLabel(key)}
          </button>
        ))}
        {selected && <button type="button" onClick={() => setSelected(null)} className="min-h-9 rounded-xl px-2 text-sm font-bold text-parchment/70 hover:text-parchment">Auswahl aufheben</button>}
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <div
          ref={canvas}
          tabIndex={0}
          role="application"
          aria-label="Kartenleinwand – Elemente antippen, ziehen, skalieren und drehen"
          onKeyDown={onKeyDown}
          onPointerDownCapture={onPointerDownCapture}
          onPointerDown={() => setSelected(null)}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          className="@container relative mx-auto aspect-[5/7] w-[min(78vw,19rem)] shrink-0 touch-none select-none overflow-visible rounded-[10%] shadow-[0_10px_30px_rgb(0_0_0/0.5)] outline-none focus-visible:ring-4 focus-visible:ring-gold"
          style={{ backgroundColor: layout.background ?? design.paper, color: design.ink, border: `3px solid ${design.frame}` }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[10%]">
            <LayoutFace design={design} card={card} rank={rank} layout={layout} hooks={hooks} />
          </div>
          {/* Elements stay grabbable when they stick out of the card a bit. */}
          {guides.v && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-rose" />}
          {guides.h && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rose" />}
          {overlay}
        </div>
        <div className="parchment flex min-w-0 flex-col gap-2 rounded-2xl p-4 ring-2 ring-line">{inspector}</div>
      </div>

      <Modal open={copyOpen} onClose={() => setCopyOpen(false)} title="Layout auf alle Karten übertragen?">
        <p className="text-ink-soft">Position und Stil von Bild, Zahl und Name dieser Karte gelten dann für alle 13 Karten. Bilder, Namen und Grafiken der Karten bleiben erhalten.</p>
        <Switch label="Sticker mitkopieren" checked={copyStickers} onChange={setCopyStickers} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCopyOpen(false)}>Abbrechen</Button>
          <Button onClick={copyToAll}>Übertragen</Button>
        </div>
      </Modal>
    </div>
  );
}
