import { randomInt } from 'node:crypto';
import type { GameState } from '@/lib/jakob/engine';
import { placements } from '@/lib/jakob/engine';
import { LOOT_BY_ID, LOOT_ITEMS, RARITY_ORDER, RARITY_WEIGHT, type LootItem, type LootKind, type LootRarity } from '@/lib/loot/catalog';
import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, type ServiceResult } from './result';

/** Dukaten for a duplicate, by rarity – rarer duplicates are worth more. */
export const DUPE_DUKATEN: Record<LootRarity, number> = { normal: 5, selten: 12, episch: 30, legendaer: 80 };
/** Price of one chest in Dukaten. */
export const CHEST_PRICE = 60;
const KINDS: LootKind[] = ['rahmen', 'wappen', 'rueckseite', 'filz'];

export type Equipped = Partial<Record<LootKind, string>>;

/** Rarity by weight, then a uniform item of that rarity. */
export function rollItem(rand: (max: number) => number = randomInt): LootItem {
  const total = RARITY_ORDER.reduce((sum, r) => sum + RARITY_WEIGHT[r], 0);
  let roll = rand(total);
  let rarity: LootRarity = RARITY_ORDER[0];
  for (const r of RARITY_ORDER) {
    if (roll < RARITY_WEIGHT[r]) {
      rarity = r;
      break;
    }
    roll -= RARITY_WEIGHT[r];
  }
  const pool = LOOT_ITEMS.filter((i) => i.rarity === rarity);
  return pool[rand(pool.length)];
}

export interface LootState {
  chests: number;
  dukaten: number;
  equipped: Equipped;
  items: { id: string; count: number; firstAt: string }[];
  chestPrice: number;
}

export async function getLoot(admin: AdminClient, userId: string): Promise<LootState> {
  const [{ data: profile, error }, { data: items, error: e2 }] = await Promise.all([
    admin.from('profiles').select('chests, dukaten, loot_equipped').eq('id', userId).single(),
    admin.from('loot_items').select('item_id, count, first_at').eq('user_id', userId).order('first_at', { ascending: false }),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  return {
    chests: profile.chests,
    dukaten: profile.dukaten,
    equipped: (profile.loot_equipped ?? {}) as Equipped,
    items: (items ?? []).filter((i) => LOOT_BY_ID[i.item_id]).map((i) => ({ id: i.item_id, count: i.count, firstAt: i.first_at })),
    chestPrice: CHEST_PRICE,
  };
}

/** Opens one chest: the database spends it and books the item atomically. */
export async function openChest(admin: AdminClient, userId: string): Promise<ServiceResult<{ item: LootItem; count: number; dukatenGained: number; loot: LootState }>> {
  const item = rollItem();
  const { data: count, error } = await admin.rpc('open_loot_chest', { p_user: userId, p_item: item.id, p_dupe_dukaten: DUPE_DUKATEN[item.rarity] });
  if (error) {
    if (error.message.includes('no_chests')) return fail('Du hast keine Truhe mehr. Spiel eine Runde, um neue zu verdienen.');
    throw error;
  }
  return ok({ item, count, dukatenGained: count > 1 ? DUPE_DUKATEN[item.rarity] : 0, loot: await getLoot(admin, userId) });
}

export async function buyChest(admin: AdminClient, userId: string): Promise<ServiceResult<LootState>> {
  const { error } = await admin.rpc('buy_loot_chest', { p_user: userId, p_cost: CHEST_PRICE });
  if (error) {
    if (error.message.includes('not_enough_dukaten')) return fail(`Dafür brauchst du ${CHEST_PRICE} Dukaten.`);
    throw error;
  }
  return ok(await getLoot(admin, userId));
}

/** Equips an owned item in its slot, or clears the slot with null. */
export async function equipLoot(admin: AdminClient, userId: string, kind: unknown, itemId: unknown): Promise<ServiceResult<Equipped>> {
  if (!KINDS.includes(kind as LootKind)) return fail('Unbekannter Platz.');
  const slot = kind as LootKind;
  if (itemId !== null) {
    const item = typeof itemId === 'string' ? LOOT_BY_ID[itemId] : undefined;
    if (!item || item.kind !== slot) return fail('Dieses Stück passt hier nicht.');
    const { data: owned } = await admin.from('loot_items').select('item_id').eq('user_id', userId).eq('item_id', item.id).maybeSingle();
    if (!owned) return fail('Dieses Stück besitzt du noch nicht.');
  }
  const { data: profile, error } = await admin.from('profiles').select('loot_equipped').eq('id', userId).single();
  if (error) throw error;
  const equipped: Equipped = { ...((profile.loot_equipped ?? {}) as Equipped) };
  if (itemId === null) delete equipped[slot];
  else equipped[slot] = itemId as string;
  const { error: e2 } = await admin.from('profiles').update({ loot_equipped: equipped }).eq('id', userId);
  if (e2) throw e2;
  return ok(equipped);
}

/** Every finished game earns a chest, the winner gets a second one. */
export async function grantGameChests(admin: AdminClient, state: GameState) {
  const places = placements(state);
  await Promise.all(state.players.filter((p) => !p.bot && !p.left).map((p) =>
    admin.rpc('grant_loot_chests', { p_user: p.id, p_count: places[p.id] === 1 ? 2 : 1 })));
}
