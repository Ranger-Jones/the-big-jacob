import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { LOOT_ART, LootSvg } from '@/components/loot/loot-art';
import { renderSvg } from '@/server/app-api/art';
import { LOOT_BY_ID, LOOT_ITEMS, RARITY_ORDER, RARITY_WEIGHT, type LootKind, type LootRarity } from './catalog';

const count = <K extends string>(key: (i: (typeof LOOT_ITEMS)[number]) => K) =>
  LOOT_ITEMS.reduce<Record<string, number>>((acc, item) => ({ ...acc, [key(item)]: (acc[key(item)] ?? 0) + 1 }), {});

describe('loot catalogue', () => {
  it('has the planned size and distribution', () => {
    expect(LOOT_ITEMS.length).toBeGreaterThanOrEqual(100);
    expect(count((i) => i.kind)).toEqual({ rahmen: 30, wappen: 30, rueckseite: 26, filz: 20 } satisfies Record<LootKind, number>);
    expect(count((i) => i.rarity)).toEqual({ normal: 44, selten: 32, episch: 20, legendaer: 10 } satisfies Record<LootRarity, number>);
    expect(RARITY_ORDER).toEqual(['normal', 'selten', 'episch', 'legendaer']);
    expect(RARITY_ORDER.map((r) => RARITY_WEIGHT[r])).toEqual([60, 28, 10, 2]);
  });

  it('uses unique, kind-prefixed kebab-case ids', () => {
    const ids = LOOT_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of LOOT_ITEMS) {
      expect(item.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/);
      expect(item.id.startsWith(`${item.kind}-`)).toBe(true);
      expect(LOOT_BY_ID[item.id]).toBe(item);
      expect(item.name && item.nameEn && item.text).toBeTruthy();
      expect(item.text.length).toBeLessThanOrEqual(80);
    }
  });

  it('has art for every item and no stray art', () => {
    for (const item of LOOT_ITEMS) expect(LOOT_ART[item.id], item.id).toBeDefined();
    expect(Object.keys(LOOT_ART).sort()).toEqual(LOOT_ITEMS.map((i) => i.id).sort());
  });

  it('renders every item to a self-contained, Flutter-safe SVG', () => {
    const allIds = new Map<string, string>();
    for (const item of LOOT_ITEMS) {
      const svg = renderSvg(createElement(LootSvg, { id: item.id }));
      expect(svg.startsWith('<svg'), item.id).toBe(true);
      expect(svg.length, item.id).toBeGreaterThan(200);
      expect(svg.length, item.id).toBeLessThan(9000);
      for (const banned of ['<script', '<foreignObject', '<text', '<animate', 'filter=', '<filter', '<pattern', '<mask', '<image', '<use', '<style']) {
        expect(svg.includes(banned), `${item.id} contains ${banned}`).toBe(false);
      }
      expect(svg).not.toMatch(/NaN|undefined|\[object/);
      const defined = new Set([...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(defined.has(ref), `${item.id} references #${ref}`).toBe(true);
      for (const id of defined) {
        expect(id.startsWith(`${item.id}-`), `${item.id} uses unprefixed id ${id}`).toBe(true);
        expect(allIds.get(id) ?? item.id, `id ${id} is reused`).toBe(item.id);
        allIds.set(id, item.id);
      }
    }
  });

  it('renders nothing for unknown ids', () => {
    expect(renderSvg(createElement(LootSvg, { id: 'rahmen-gibt-es-nicht' }))).toBe('');
  });
});
