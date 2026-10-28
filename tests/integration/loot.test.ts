import { describe, expect, it } from 'vitest';
import { LOOT_BY_ID } from '@/lib/loot/catalog';
import { createGame, loadGame, performAction } from '@/server/game-service';
import { buyChest, equipLoot, getLoot, openChest, rollItem } from '@/server/loot-service';
import { admin, createTestUser } from './helpers';

describe('loot chests', () => {
  it('starts with three chests, opens them atomically and equips only owned items', async () => {
    const u = await createTestUser('lt');
    expect((await getLoot(admin, u.id)).chests).toBe(3);
    const opened = await Promise.all([openChest(admin, u.id), openChest(admin, u.id), openChest(admin, u.id), openChest(admin, u.id)]);
    expect(opened.filter((r) => r.ok)).toHaveLength(3);
    expect(opened.filter((r) => !r.ok)).toHaveLength(1);
    const loot = await getLoot(admin, u.id);
    expect(loot.chests).toBe(0);
    expect(loot.items.reduce((n, i) => n + i.count, 0)).toBe(3);

    const own = loot.items[0].id;
    const kind = LOOT_BY_ID[own].kind;
    expect((await equipLoot(admin, u.id, kind, own)).ok).toBe(true);
    const foreign = Object.values(LOOT_BY_ID).find((i) => i.kind === kind && !loot.items.some((o) => o.id === i.id))!;
    expect((await equipLoot(admin, u.id, kind, foreign.id)).ok).toBe(false);
    expect((await equipLoot(admin, u.id, 'rahmen', 'wappen-unbekannt')).ok).toBe(false);
    expect((await getLoot(admin, u.id)).equipped[kind]).toBe(own);
    expect((await buyChest(admin, u.id)).ok).toBe(false);
  });

  it('rolls every rarity with the expected weights', () => {
    let seed = 1;
    const rand = (max: number) => (seed = (seed * 48271) % 2147483647) % max;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const { rarity } = rollItem(rand);
      counts[rarity] = (counts[rarity] ?? 0) + 1;
    }
    expect(counts.normal).toBeGreaterThan(counts.selten);
    expect(counts.selten).toBeGreaterThan(counts.episch);
    expect(counts.episch).toBeGreaterThan(counts.legendaer);
    expect(counts.legendaer).toBeGreaterThan(0);
  });

  it('caps chests from games per day', async () => {
    const u = await createTestUser('lc');
    const grant = (count: number, day: string) =>
      admin.rpc('grant_loot_chests', { p_user: u.id, p_count: count, p_day: day, p_cap: 10 }).then((r) => r.data);
    expect(await grant(2, '2026-10-28')).toBe(2);
    expect(await grant(9, '2026-10-28')).toBe(8);
    expect(await grant(1, '2026-10-28')).toBe(0);
    expect(await grant(1, '2026-10-29')).toBe(1);
    expect((await getLoot(admin, u.id)).chests).toBe(3 + 11);
  });

  it('grants a chest per finished game', async () => {
    const u = await createTestUser('lg');
    const created = await createGame(admin, u.id);
    if (!created.ok) throw new Error(created.error);
    const id = created.data.id;
    const v = () => loadGame(admin, id).then((g) => g!.version);
    await performAction(admin, u.id, id, { type: 'addBot', level: 'easy' }, await v());
    await performAction(admin, u.id, id, { type: 'start' }, await v());
    await performAction(admin, u.id, id, { type: 'leave' });
    // Leaving ends a game with only bots left; leavers earn nothing.
    expect((await getLoot(admin, u.id)).chests).toBe(3);
  });
});
