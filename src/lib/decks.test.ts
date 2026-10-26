import { describe, expect, it } from 'vitest';
import { defaultLayout } from '@/components/deck/card-layout';
import { DEFAULT_DECK, PRESETS, parseDesign } from './decks';

describe('card layouts', () => {
  it('old designs without layouts still parse', () => {
    expect(parseDesign(PRESETS[3].design)).not.toBeNull();
  });

  it('accepts a free layout with stickers', () => {
    const design = structuredClone(DEFAULT_DECK.design);
    const layout = defaultLayout(design, design.cards[0]);
    layout.stickers.push({ id: 'abc1', kind: 'text', value: 'Hoch!', x: 30, y: 70, size: 10, rotate: -15, color: '#ffffff' });
    design.cards[0] = { ...design.cards[0], layout };
    design.back = { ...design.back, zoom: 1.5, panX: -20, panY: 10 };
    const parsed = parseDesign(design);
    expect(parsed?.cards[0].layout?.stickers[0].value).toBe('Hoch!');
    expect(parsed?.back.zoom).toBe(1.5);
  });

  it('rejects out-of-range values and too many stickers', () => {
    const design = structuredClone(DEFAULT_DECK.design);
    const layout = defaultLayout(design, design.cards[0]);
    expect(parseDesign({ ...design, cards: design.cards.map((c, i) => (i === 0 ? { ...c, layout: { ...layout, picture: { ...layout.picture, zoom: 9 } } } : c)) })).toBeNull();
    const many = Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, kind: 'emoji' as const, value: '⭐', x: 50, y: 50, size: 10, rotate: 0, color: '#000000' }));
    expect(parseDesign({ ...design, cards: design.cards.map((c, i) => (i === 0 ? { ...c, layout: { ...layout, stickers: many } } : c)) })).toBeNull();
  });

  it('the default layout mirrors the deck look', () => {
    const design = DEFAULT_DECK.design;
    const layout = defaultLayout(design, design.cards[0]);
    expect(layout.picture.fill).toBe(true);
    expect(layout.number.style).toBe('gross');
    const tier = PRESETS.find((p) => p.id === 'preset:tierreich')!.design;
    expect(defaultLayout(tier, tier.cards[0]).number.style).toBe('ecken');
  });
});
