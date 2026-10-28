import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ART, CardArt, FullCardArt } from '@/components/deck/art';
import { renderSvg } from './art';

const normalize = (s: string) => s.replace(/ aria-hidden="true"/g, '');

describe('app art renderer', () => {
  it('renders every illustration exactly like react-dom', () => {
    for (const id of Object.keys(ART)) {
      for (const el of [createElement(CardArt, { id }), createElement(FullCardArt, { id, rank: 7, bg: '#552288' })]) {
        expect(renderSvg(el), id).toBe(normalize(renderToStaticMarkup(el)));
      }
    }
  });
});
