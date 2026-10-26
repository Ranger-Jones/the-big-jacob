import { DEFAULT_DECK, isPresetId, parseDesign, presetById, type DeckDesign, type DeckEntry } from '@/lib/decks';
import type { AdminClient } from '@/lib/supabase/admin';
import { fail, ok, type ServiceResult } from './result';

export const MAX_DECKS = 20;
const COLS = 'id, owner_id, name, design';

type Row = { id: string; owner_id: string; name: string; design: unknown };
const toEntry = (r: Row): DeckEntry => ({ id: r.id, ownerId: r.owner_id, name: r.name, design: parseDesign(r.design) ?? DEFAULT_DECK.design });

export async function listDecks(admin: AdminClient, ownerId: string): Promise<DeckEntry[]> {
  const { data, error } = await admin.from('decks').select(COLS).eq('owner_id', ownerId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(toEntry);
}

export async function listDecksOf(admin: AdminClient, ownerIds: string[]): Promise<(DeckEntry & { ownerName: string })[]> {
  if (ownerIds.length === 0) return [];
  const { data, error } = await admin.from('decks').select(`${COLS}, profiles!decks_owner_id_fkey(username)`)
    .in('owner_id', ownerIds).order('updated_at', { ascending: false }).limit(60);
  if (error) throw error;
  return data.map((r) => ({ ...toEntry(r), ownerName: (r.profiles as { username: string } | null)?.username ?? '?' }));
}

export async function getDeck(admin: AdminClient, id: string): Promise<DeckEntry | null> {
  const preset = presetById(id);
  if (preset) return preset;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await admin.from('decks').select(COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toEntry(data) : null;
}

export async function getDecksByIds(admin: AdminClient, ids: string[]): Promise<Record<string, DeckEntry>> {
  const custom = [...new Set(ids)].filter((id) => !isPresetId(id) && /^[0-9a-f-]{36}$/.test(id));
  if (custom.length === 0) return {};
  const { data, error } = await admin.from('decks').select(COLS).in('id', custom);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.id, toEntry(r)]));
}

/** Card art must live in our own deck-art bucket (any owner, so copied decks keep their pictures). */
function isDeckArtUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  return url.origin === origin && !raw.includes('%') && !url.search && !url.hash
    && /^\/storage\/v1\/object\/public\/deck-art\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.webp$/.test(url.pathname);
}

function validate(name: unknown, design: unknown): ServiceResult<{ name: string; design: DeckDesign }> {
  const n = typeof name === 'string' ? name.trim() : '';
  if (n.length < 1 || n.length > 40) return fail('Der Deck-Name braucht 1–40 Zeichen.');
  const parsed = parseDesign(design);
  if (!parsed) return fail('Das Deck ist unvollständig – prüf Namen und Symbole aller Karten.');
  if (parsed.cards.some((c) => c.image && !isDeckArtUrl(c.image))) return fail('Ungültiges Kartenbild.');
  if (parsed.back.image && !isDeckArtUrl(parsed.back.image)) return fail('Ungültiges Rückseitenbild.');
  return ok({ name: n, design: parsed });
}

export async function createDeck(admin: AdminClient, userId: string, name: unknown, design: unknown): Promise<ServiceResult<{ id: string }>> {
  const v = validate(name, design);
  if (!v.ok) return v;
  const { count } = await admin.from('decks').select('id', { count: 'exact', head: true }).eq('owner_id', userId);
  if ((count ?? 0) >= MAX_DECKS) return fail(`Du hast schon ${MAX_DECKS} Decks. Lösch erst eins.`);
  const { data, error } = await admin.from('decks').insert({ owner_id: userId, name: v.data.name, design: v.data.design as never }).select('id').single();
  if (error) throw error;
  return ok({ id: data.id });
}

async function ownDeck(admin: AdminClient, userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await admin.from('decks').select(COLS).eq('id', id).maybeSingle();
  return data && data.owner_id === userId ? data : null;
}

/** Removes uploaded art of this deck that is no longer used. */
async function cleanArt(admin: AdminClient, userId: string, deckId: string, keep: DeckDesign | null) {
  const folder = `${userId}/${deckId}`;
  const { data } = await admin.storage.from('deck-art').list(folder, { limit: 100 });
  const images = [...(keep?.cards ?? []).map((c) => c.image), keep?.back.image];
  const used = new Set(images.map((url) => url?.split('/').pop()).filter(Boolean));
  const stale = (data ?? []).filter((f) => !used.has(f.name)).map((f) => `${folder}/${f.name}`);
  if (stale.length > 0) await admin.storage.from('deck-art').remove(stale);
}

export async function updateDeck(admin: AdminClient, userId: string, id: string, name: unknown, design: unknown): Promise<ServiceResult> {
  if (!(await ownDeck(admin, userId, id))) return fail('Deck nicht gefunden.');
  const v = validate(name, design);
  if (!v.ok) return v;
  const { error } = await admin.from('decks')
    .update({ name: v.data.name, design: v.data.design as never, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  await cleanArt(admin, userId, id, v.data.design);
  return ok(undefined);
}

export async function deleteDeck(admin: AdminClient, userId: string, id: string): Promise<ServiceResult> {
  if (!(await ownDeck(admin, userId, id))) return fail('Deck nicht gefunden.');
  const { error } = await admin.from('decks').delete().eq('id', id);
  if (error) throw error;
  await cleanArt(admin, userId, id, null);
  return ok(undefined);
}

export async function copyDeck(admin: AdminClient, userId: string, sourceId: string): Promise<ServiceResult<{ id: string }>> {
  const source = await getDeck(admin, sourceId);
  if (!source) return fail('Deck nicht gefunden.');
  const name = `${source.name.slice(0, 33)} (Kopie)`;
  return createDeck(admin, userId, name, source.design);
}

export async function setDefaultDeck(admin: AdminClient, userId: string, id: string | null): Promise<ServiceResult> {
  if (!(await canUseDeck(admin, userId, id))) return fail('Deck nicht gefunden.');
  const { error } = await admin.from('profiles').update({ default_deck: id }).eq('id', userId);
  if (error) throw error;
  return ok(undefined);
}

/** The user's default deck, if it still exists. */
export async function getDefaultDeckId(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await admin.from('profiles').select('default_deck').eq('id', userId).maybeSingle();
  const id = data?.default_deck ?? null;
  return id && (await canUseDeck(admin, userId, id)) ? id : null;
}

/** A player may bring a preset or one of their own decks to the table. */
export async function canUseDeck(admin: AdminClient, userId: string, id: string | null): Promise<boolean> {
  if (id === null || isPresetId(id)) return true;
  return !!(await ownDeck(admin, userId, id));
}
