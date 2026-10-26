/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import { JESTER } from '@/lib/jakob/cards';
import { cx } from '@/lib/cx';
import { cardDesign, type BackPattern, type DeckDesign, type DeckEntry, type DeckFont } from '@/lib/decks';
import { CardArt, FullCardArt, hasArt } from './art';
import { LayoutFace } from './card-layout';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const WIDTH: Record<CardSize, string> = {
  xs: 'w-9', sm: 'w-[3.4rem]', md: 'w-[4.6rem]', lg: 'w-[6.2rem]', xl: 'w-[8.5rem]',
};
const CORNER: Record<CardSize, string> = {
  xs: 'text-[0.7rem]', sm: 'text-base', md: 'text-xl', lg: 'text-2xl', xl: 'text-4xl',
};
const MEDAL: Record<CardSize, string> = {
  xs: 'text-sm', sm: 'text-xl', md: 'text-[1.9rem]', lg: 'text-[2.6rem]', xl: 'text-[3.6rem]',
};
const NAME: Record<CardSize, string> = {
  xs: 'hidden', sm: 'hidden', md: 'text-[0.55rem]', lg: 'text-[0.66rem]', xl: 'text-[0.8rem]',
};
/** Long names (e.g. "Der Große Jakob") get a smaller banner font so they fit. */
const NAME_LONG: Record<CardSize, string> = {
  xs: 'hidden', sm: 'hidden', md: 'text-[0.48rem]', lg: 'text-[0.56rem]', xl: 'text-[0.7rem]',
};

export const FONT_CLASS: Record<DeckFont, string> = {
  gotisch: 'font-display', klassisch: 'font-classic', verspielt: 'font-playful',
};

export function cornerLabel(rank: number) {
  return rank === JESTER ? 'N' : String(rank);
}

interface FaceProps {
  rank: number;
  deck: DeckEntry;
  size?: CardSize;
  selected?: boolean;
  dimmed?: boolean;
  marked?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  label?: string;
}

/** The face of a card in a given deck design. */
export function PlayingCard({ rank, deck, size = 'md', selected, dimmed, marked, className, style, onClick, label }: FaceProps) {
  const d = deck.design;
  const card = cardDesign(deck, rank);
  // "Ganze Karte": photos and drawn art fill the whole face; the number becomes part of the art.
  const fullPhoto = !!card.image && d.photoFit === 'vollbild';
  const fullDrawing = !card.image && hasArt(card.art) && d.photoFit === 'vollbild';
  const fullArt = fullPhoto || fullDrawing;
  // On full-art cards the numbers sit on small paper tabs so they stay readable on any photo.
  const cornerStyle = fullArt
    ? { color: d.accent, backgroundColor: d.paper, padding: '0.1em 0.18em', borderRadius: '0.25em', boxShadow: '0 1px 2px rgb(0 0 0 / 0.35)' }
    : { color: d.accent };
  const content: ReactNode = card.layout ? (
    <LayoutFace design={d} card={card} rank={rank} layout={card.layout} small={size === 'xs' || size === 'sm'} />
  ) : (
    <>
      {fullPhoto ? (
        <img src={card.image!} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      ) : fullDrawing ? (
        <FullCardArt id={card.art!} rank={rank} bg={d.frame} className="absolute inset-0 size-full" />
      ) : (
        <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgb(255_255_255/0.55),transparent_60%)]" />
      )}
      {/* Double inner frame with small diamonds in the corners */}
      <span
        className="absolute inset-[4.5%] rounded-[8%] border-[1.5px]"
        style={{ borderColor: fullArt ? `${d.paper}cc` : d.accent }}
        aria-hidden
      />
      {size !== 'xs' && size !== 'sm' && (
        <>
          <span className="absolute inset-[7.5%] rounded-[7%] border" style={{ borderColor: fullArt ? `${d.paper}66` : `${d.accent}55` }} aria-hidden />
          {['left-[3.2%] top-[2.6%]', 'right-[3.2%] top-[2.6%]', 'left-[3.2%] bottom-[2.6%]', 'right-[3.2%] bottom-[2.6%]'].map((pos) => (
            <span key={pos} aria-hidden className={cx('absolute size-[5%] rotate-45', pos)} style={{ backgroundColor: fullArt ? d.paper : d.accent }} />
          ))}
        </>
      )}
      {!fullDrawing && (
        <span className={cx('absolute left-[9%] top-[5%] font-bold leading-none', CORNER[size], FONT_CLASS[d.font])} style={cornerStyle}>
          {cornerLabel(rank)}
        </span>
      )}
      {size !== 'xs' && !fullDrawing && (
        <span className={cx('absolute bottom-[5%] right-[9%] rotate-180 font-bold leading-none', CORNER[size], FONT_CLASS[d.font])} style={cornerStyle}>
          {cornerLabel(rank)}
        </span>
      )}
      {!fullArt && hasArt(card.art) && !card.image && (
        <CardArt id={card.art} className="absolute left-1/2 top-[43%] w-[78%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_1px_rgb(0_0_0/0.25)]" />
      )}
      {!fullArt && (card.image || !hasArt(card.art)) && (
        <span
          className={cx('absolute left-1/2 top-[44%] flex aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full', MEDAL[size])}
          style={{ backgroundColor: `${d.frame}18`, boxShadow: `inset 0 0 0 2px ${d.frame}55` }}
          aria-hidden
        >
          {card.image ? <img src={card.image} alt="" className="size-full object-cover" draggable={false} /> : <span className="leading-none">{card.emoji}</span>}
        </span>
      )}
      <span
        className={cx('absolute inset-x-[4%] truncate px-[7%] py-[1.5%] text-center font-bold leading-tight', fullArt ? 'bottom-[7%]' : 'bottom-[12.5%]', card.name.length > (d.font === 'klassisch' ? 8 : 12) ? NAME_LONG[size] : NAME[size], FONT_CLASS[d.font])}
        style={{
          backgroundColor: d.frame,
          color: d.paper,
          // Banner with notched ends
          clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
          boxShadow: `inset 0 -2px 0 rgb(0 0 0 / 0.25)`,
        }}
      >
        {card.name}
      </span>
    </>
  );
  const classes = cx(
    '@container relative block aspect-[5/7] shrink-0 select-none overflow-hidden rounded-[10%] text-left transition-[transform,box-shadow,filter] duration-150',
    WIDTH[size],
    selected && '-translate-y-3 shadow-[0_0_0_3px_var(--color-gold),0_10px_18px_rgb(0_0_0/0.45)]',
    !selected && !marked && 'shadow-[0_3px_0_rgb(0_0_0/0.35)]',
    !selected && marked && 'shadow-[0_0_0_3px_var(--color-azure),0_3px_0_rgb(0_0_0/0.35)]',
    dimmed && 'brightness-[0.6] saturate-50',
    className,
  );
  const surface: CSSProperties = { backgroundColor: card.layout?.background ?? d.paper, color: d.ink, border: `3px solid ${d.frame}`, ...style };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(classes, 'cursor-pointer')} style={surface} aria-pressed={selected} aria-label={label ?? `${card.name} (${cornerLabel(rank)})`}>
        {content}
      </button>
    );
  }
  return (
    <span className={classes} style={surface} role="img" aria-label={label ?? `${card.name} (${cornerLabel(rank)})`}>
      {content}
    </span>
  );
}

function patternFor(pattern: BackPattern, a: string, b: string, id: string) {
  switch (pattern) {
    case 'rauten':
      return <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill={a} /><path d="M8 0L16 8 8 16 0 8z" fill={b} /></pattern>;
    case 'streifen':
      return <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill={a} /><rect width="6" height="12" fill={b} /></pattern>;
    case 'punkte':
      return <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill={a} /><circle cx="6" cy="6" r="2.6" fill={b} /></pattern>;
    case 'wellen':
      return <pattern id={id} width="20" height="10" patternUnits="userSpaceOnUse"><rect width="20" height="10" fill={a} /><path d="M0 5 Q5 0 10 5 T20 5" stroke={b} strokeWidth="2.5" fill="none" /></pattern>;
    case 'sterne':
      return <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill={a} /><path d="M9 3l1.6 3.6 3.9.4-2.9 2.6.9 3.9L9 11.5 5.5 13.5l.9-3.9L3.5 7l3.9-.4z" fill={b} /></pattern>;
    case 'schach':
      return <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill={a} /><rect width="7" height="7" fill={b} /><rect x="7" y="7" width="7" height="7" fill={b} /></pattern>;
  }
}

/** The back of a card – used for opponents' hands and the draw. */
export function CardBack({ design, size = 'md', className, style, onClick, label }: {
  design: DeckDesign; size?: CardSize; className?: string; style?: CSSProperties; onClick?: () => void; label?: string;
}) {
  const id = `back-${design.back.pattern}-${design.back.a.slice(1)}-${design.back.b.slice(1)}`;
  const inner = design.back.image ? (
    <>
      <img
        src={design.back.image} alt="" className="absolute inset-0 size-full object-cover" draggable={false}
        style={{ transform: `translate(${(design.back.panX ?? 0) / 2}%, ${(design.back.panY ?? 0) / 2}%) scale(${design.back.zoom ?? 1})` }}
      />
      <span className="absolute inset-[7%] rounded-[8%] border-2" style={{ borderColor: `${design.paper}cc` }} aria-hidden />
    </>
  ) : (
    <>
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>{patternFor(design.back.pattern, design.back.a, design.back.b, id)}</defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <span className="absolute inset-[7%] rounded-[8%] border-2" style={{ borderColor: design.accent }} aria-hidden />
      <span
        className={cx('absolute left-1/2 top-1/2 flex aspect-square w-[52%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full', MEDAL[size])}
        style={{ backgroundColor: design.paper, boxShadow: `0 0 0 3px ${design.accent}` }}
        aria-hidden
      >
        {hasArt(design.back.art) ? <CardArt id={design.back.art} className="size-[88%]" /> : design.back.emblem}
      </span>
    </>
  );
  const classes = cx('relative block aspect-[5/7] shrink-0 overflow-hidden rounded-[10%] shadow-[0_3px_0_rgb(0_0_0/0.35)]', WIDTH[size], className);
  const surface: CSSProperties = { border: `3px solid ${design.frame}`, backgroundColor: design.back.a, ...style };
  if (onClick) {
    return <button type="button" onClick={onClick} className={cx(classes, 'cursor-pointer transition-transform hover:-translate-y-1')} style={surface} aria-label={label ?? 'Karte ziehen'}>{inner}</button>;
  }
  return <span className={classes} style={surface} aria-hidden>{inner}</span>;
}
