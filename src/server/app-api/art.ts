import 'server-only';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardArt, FullCardArt, hasArt } from '@/components/deck/art';

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * A card illustration as a standalone SVG for the app: "full" is the whole card face (100×140, with the
 * worked-in numeral), "icon" the bare motif (100×100) for medallions and card backs.
 */
export function renderArt(id: string, params: URLSearchParams): string | null {
  if (!hasArt(id)) return null;
  const kind = params.get('kind') === 'icon' ? 'icon' : 'full';
  const rank = Number(params.get('rank') ?? 1);
  const bg = params.get('bg') ?? '#3d2361';
  if (!Number.isInteger(rank) || rank < 1 || rank > 13 || !HEX.test(bg)) return null;
  const markup = kind === 'icon'
    ? renderToStaticMarkup(createElement(CardArt, { id }))
    : renderToStaticMarkup(createElement(FullCardArt, { id, rank, bg, numeral: params.get('numeral') !== '0' }));
  return markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/ aria-hidden="true"/, '');
}
