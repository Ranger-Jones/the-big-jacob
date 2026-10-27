/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import type { CardDesign, CardLayout, DeckDesign, Sticker } from '@/lib/decks';
import { useT } from '@/lib/i18n/client';
import type { T } from '@/lib/i18n/core';
import { JESTER } from '@/lib/jakob/cards';
import { CardArt, FullCardArt, hasArt } from './art';

/**
 * Free card layouts from the card editor. Every size is in `cqw` (percent of the card width), so one
 * layout renders identically at hand size, on the table and in the large editor canvas.
 * The card element must be a size container (`@container`).
 */

export type ElementKey = 'picture' | 'number' | 'name' | `sticker:${string}`;
export type GestureMode = 'move' | 'scale' | 'rotate' | 'pan';

/** Hooks the editor canvas attaches to the rendered elements. */
export interface EditorHooks {
  selected: ElementKey | null;
  panMode: boolean;
  onPointerDown: (e: PointerEvent<HTMLElement>, key: ElementKey, mode: GestureMode) => void;
}

const FONT_FAMILY: Record<DeckDesign['font'], string> = {
  gotisch: 'var(--font-grenze), Georgia, serif',
  klassisch: 'var(--font-cinzel), Georgia, serif',
  verspielt: 'var(--font-fredoka), system-ui, sans-serif',
};

export function numberLabel(rank: number, big = false, t: T = (s) => s): string {
  if (rank === JESTER) return big ? t('Narr') : t('N');
  return String(rank);
}

/** The layout that reproduces the deck's standard look – the editor's starting point. */
export function defaultLayout(design: DeckDesign, card: CardDesign): CardLayout {
  const fullPicture = design.photoFit === 'vollbild' && (!!card.image || hasArt(card.art));
  const drawn = !card.image && hasArt(card.art);
  return {
    background: null,
    frame: true,
    picture: {
      visible: true,
      fill: fullPicture,
      shape: drawn ? 'frei' : 'kreis',
      x: 50,
      y: 43,
      size: drawn ? 78 : 62,
      rotate: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    number: fullPicture && drawn
      ? { style: 'gross', x: 50, y: 22, size: 40, color: null }
      : { style: 'ecken', x: 13, y: 9, size: 19, color: null },
    name: { style: 'band', x: 50, y: fullPicture ? 88 : 83, size: 8.5, width: 92 },
    stickers: [],
  };
}

function place(x: number, y: number, rotate = 0): CSSProperties {
  return { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` };
}

/** Which gesture handles an element offers in the editor. */
export function elementHandles(layout: CardLayout, key: ElementKey): { scale: boolean; rotate: boolean } {
  if (key === 'picture') return { scale: true, rotate: !layout.picture.fill };
  if (key === 'number' || key === 'name') return { scale: true, rotate: false };
  return { scale: true, rotate: true };
}

function interactive(hooks: EditorHooks | undefined, k: ElementKey, mode: GestureMode = 'move') {
  if (!hooks) return {};
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => hooks.onPointerDown(e, k, mode),
    // The layer order never changes on selection; the editor draws outline and handles in its own overlay.
    className: 'touch-none cursor-move',
    'data-el': k,
  };
}

function Picture({ design, card, rank, layout, hooks }: { design: DeckDesign; card: CardDesign; rank: number; layout: CardLayout; hooks?: EditorHooks }) {
  const p = layout.picture;
  if (!p.visible) return null;
  const crop: CSSProperties = { transform: `translate(${p.panX / 2}%, ${p.panY / 2}%) scale(${p.zoom})` };
  const drawn = !card.image && hasArt(card.art);
  const mode: GestureMode = p.fill || (hooks?.panMode && !drawn) ? 'pan' : 'move';
  const ia = interactive(hooks, 'picture', mode);

  if (p.fill) {
    return (
      <span {...ia} className={cx('absolute inset-0 overflow-hidden', ia.className)}>
        {card.image ? (
          <img src={card.image} alt="" draggable={false} className="size-full object-cover" style={crop} />
        ) : drawn ? (
          <span className="block size-full" style={crop}>
            <FullCardArt id={card.art!} rank={rank} bg={design.frame} numeral={false} className="size-full" />
          </span>
        ) : (
          <span className="flex size-full items-center justify-center" style={{ fontSize: `${60 * p.zoom}cqw`, ...crop, transform: `translate(${p.panX / 2}%, ${p.panY / 2}%)` }}>
            {card.emoji}
          </span>
        )}
      </span>
    );
  }

  const framed = p.shape !== 'frei';
  return (
    <span
      {...ia}
      className={cx('absolute aspect-square', p.shape === 'kreis' && 'rounded-full', p.shape === 'abgerundet' && 'rounded-[14%]', ia.className)}
      style={{
        ...place(p.x, p.y, p.rotate),
        width: `${p.size}%`,
        ...(framed ? { backgroundColor: `${design.frame}18`, boxShadow: `inset 0 0 0 0.6cqw ${design.frame}66` } : {}),
      }}
    >
      <span className={cx('absolute inset-0 flex items-center justify-center', framed && 'overflow-hidden rounded-[inherit]')}>
        {card.image ? (
          <img src={card.image} alt="" draggable={false} className="size-full object-cover" style={crop} />
        ) : drawn ? (
          <CardArt id={card.art!} className="size-full drop-shadow-[0_2px_1px_rgb(0_0_0/0.25)]" />
        ) : (
          <span className="leading-none" style={{ fontSize: `${p.size * 0.58}cqw` }}>{card.emoji}</span>
        )}
      </span>
    </span>
  );
}

function NumberMark({ design, rank, layout, hooks }: { design: DeckDesign; rank: number; layout: CardLayout; hooks?: EditorHooks }) {
  const t = useT();
  const n = layout.number;
  if (n.style === 'aus') return null;
  const color = n.color ?? design.accent;
  const legible: CSSProperties = {
    color,
    fontFamily: FONT_FAMILY[design.font],
    WebkitTextStroke: `${Math.max(0.15, n.size / 60)}cqw ${design.ink}`,
    paintOrder: 'stroke fill',
    textShadow: `0 0.4cqw 0 ${design.paper}`,
  };
  const ia = interactive(hooks, 'number');
  if (n.style === 'gross') {
    const label = numberLabel(rank, true, t);
    return (
      <span
        {...ia}
        className={cx('absolute whitespace-nowrap font-bold leading-none', ia.className)}
        style={{ ...place(n.x, n.y), fontSize: `${rank === JESTER ? n.size * 0.55 : n.size}cqw`, ...legible }}
      >
        {label}
      </span>
    );
  }
  // Corner indices: the top-left one is edited, the bottom-right one mirrors it.
  const corner: CSSProperties = { fontSize: `${n.size}cqw`, ...legible, textShadow: 'none', WebkitTextStroke: '0' };
  return (
    <>
      <span {...ia} className={cx('absolute font-bold leading-none', ia.className)} style={{ ...place(n.x, n.y), ...corner }}>
        {numberLabel(rank, false, t)}
      </span>
      <span aria-hidden className="pointer-events-none absolute font-bold leading-none" style={{ ...place(100 - n.x, 100 - n.y, 180), ...corner }}>
        {numberLabel(rank, false, t)}
      </span>
    </>
  );
}

function NameMark({ design, card, layout, hooks }: { design: DeckDesign; card: CardDesign; layout: CardLayout; hooks?: EditorHooks }) {
  const t = useT();
  const n = layout.name;
  if (n.style === 'aus') return null;
  const ia = interactive(hooks, 'name');
  const band = n.style === 'band';
  return (
    <span
      {...ia}
      className={cx('absolute truncate text-center font-bold leading-tight', ia.className)}
      style={{
        ...place(n.x, n.y),
        width: `${n.width}%`,
        fontSize: `${n.size}cqw`,
        fontFamily: FONT_FAMILY[design.font],
        padding: band ? '0.8cqw 7%' : '0',
        ...(band
          ? { backgroundColor: design.frame, color: design.paper, clipPath: hooks ? undefined : 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)' }
          : { color: design.ink, textShadow: `0 0 1cqw ${design.paper}, 0 0 1cqw ${design.paper}` }),
      }}
    >
      {t(card.name)}
    </span>
  );
}

function StickerMark({ design, sticker, hooks }: { design: DeckDesign; sticker: Sticker; hooks?: EditorHooks }) {
  const k: ElementKey = `sticker:${sticker.id}`;
  const ia = interactive(hooks, k);
  return (
    <span
      {...ia}
      className={cx('absolute whitespace-nowrap font-bold leading-none', ia.className)}
      style={{
        ...place(sticker.x, sticker.y, sticker.rotate),
        fontSize: `${sticker.size}cqw`,
        color: sticker.color,
        fontFamily: FONT_FAMILY[design.font],
        ...(sticker.kind === 'text' ? { WebkitTextStroke: `${Math.max(0.12, sticker.size / 50)}cqw ${design.ink}`, paintOrder: 'stroke fill' } : {}),
      }}
    >
      {sticker.value}
    </span>
  );
}

/** Everything inside the card border for a card with a free layout. */
export function LayoutFace({ design, card, rank, layout, hooks, small }: {
  design: DeckDesign; card: CardDesign; rank: number; layout: CardLayout; hooks?: EditorHooks; small?: boolean;
}): ReactNode {
  const onArt = layout.picture.fill && layout.picture.visible;
  return (
    <>
      {!onArt && <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgb(255_255_255/0.5),transparent_60%)]" />}
      <Picture design={design} card={card} rank={rank} layout={layout} hooks={hooks} />
      {layout.frame && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-[4.5%] rounded-[8%] border-[1.5px]" style={{ borderColor: onArt ? `${design.paper}cc` : design.accent }} />
          {!small && (
            <>
              <span aria-hidden className="pointer-events-none absolute inset-[7.5%] rounded-[7%] border" style={{ borderColor: onArt ? `${design.paper}66` : `${design.accent}55` }} />
              {['left-[3.2%] top-[2.6%]', 'right-[3.2%] top-[2.6%]', 'left-[3.2%] bottom-[2.6%]', 'right-[3.2%] bottom-[2.6%]'].map((pos) => (
                <span key={pos} aria-hidden className={cx('pointer-events-none absolute size-[5%] rotate-45', pos)} style={{ backgroundColor: onArt ? design.paper : design.accent }} />
              ))}
            </>
          )}
        </>
      )}
      {layout.stickers.map((s) => <StickerMark key={s.id} design={design} sticker={s} hooks={hooks} />)}
      <NameMark design={design} card={card} layout={layout} hooks={hooks} />
      <NumberMark design={design} rank={rank} layout={layout} hooks={hooks} />
    </>
  );
}
