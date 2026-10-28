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
    && /^\/storage\/v1\/object\/public\/deck-art\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.(webp|jpg|png)$/.test(url.pathname);
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

/** Same limit as the deck-art bucket. */
export const MAX_ART_BYTES = 2 * 1024 * 1024;

/** The real image type from the file's first bytes; anything else is refused. */
function artType(bytes: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; contentType: string } | null {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: 'png', contentType: 'image/png' };
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { ext: 'webp', contentType: 'image/webp' };
  return null;
}

/**
 * Stores a card photo (slot 1–13) or the back photo of an own deck in the deck-art bucket, for clients
 * that do not upload to storage themselves (the app). Returns the public URL to put into the design;
 * the file is only kept if a later save uses it (see cleanArt).
 */
export async function uploadDeckArt(
  admin: AdminClient, userId: string, deckId: string, slot: unknown, bytes: Uint8Array,
): Promise<ServiceResult<{ url: string }>> {
  if (!(await ownDeck(admin, userId, deckId))) return fail('Deck nicht gefunden.');
  const rank = Number(slot);
  if (slot !== 'back' && !(Number.isInteger(rank) && rank >= 1 && rank <= 13)) return fail('Ungültige Karte.');
  if (bytes.length === 0 || bytes.length > MAX_ART_BYTES) return fail('Das Bild ist zu groß (höchstens 2 MB).');
  const type = artType(bytes);
  if (!type) return fail('Bitte ein JPEG-, PNG- oder WebP-Bild wählen.');
  const path = `${userId}/${deckId}/${slot === 'back' ? 'back' : `r${rank}`}-${Date.now()}.${type.ext}`;
  const bucket = admin.storage.from('deck-art');
  const { error } = await bucket.upload(path, bytes, { contentType: type.contentType });
  if (error) throw error;
  return ok({ url: bucket.getPublicUrl(path).data.publicUrl });
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

export type GallerySort = 'beliebt' | 'neu';
export interface GalleryDeck extends DeckEntry { ownerName: string; likes: number; liked: boolean; isPublic: boolean }

/** Own decks that are shared in the gallery. */
export async function publicDeckIds(admin: AdminClient, userId: string): Promise<string[]> {
  const { data, error } = await admin.from('decks').select('id').eq('owner_id', userId).eq('public', true);
  if (error) throw error;
  return data.map((d) => d.id);
}

export async function setDeckPublic(admin: AdminClient, userId: string, id: string, isPublic: boolean): Promise<ServiceResult> {
  if (!(await ownDeck(admin, userId, id))) return fail('Deck nicht gefunden.');
  const { error } = await admin.from('decks').update({ public: isPublic }).eq('id', id);
  if (error) throw error;
  return ok(undefined);
}

/** Likes count for public decks only; liking your own deck is not possible. */
export async function toggleDeckLike(admin: AdminClient, userId: string, id: string): Promise<ServiceResult<{ liked: boolean }>> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail('Deck nicht gefunden.');
  const { data: deck } = await admin.from('decks').select('owner_id, public').eq('id', id).maybeSingle();
  if (!deck || !deck.public) return fail('Deck nicht gefunden.');
  if (deck.owner_id === userId) return fail('Eigene Decks kannst du nicht liken.');
  const { data: removed, error } = await admin.from('deck_likes').delete().eq('deck_id', id).eq('user_id', userId).select('deck_id');
  if (error) throw error;
  if (removed.length > 0) return ok({ liked: false });
  const { error: e2 } = await admin.from('deck_likes').insert({ deck_id: id, user_id: userId });
  if (e2 && e2.code !== '23505') throw e2;
  return ok({ liked: true });
}

export async function listGallery(admin: AdminClient, userId: string, sort: GallerySort, limit = 36): Promise<GalleryDeck[]> {
  const { data, error } = await admin.from('decks')
    .select(`${COLS}, updated_at, profiles!decks_owner_id_fkey(username), deck_likes(user_id)`)
    .eq('public', true).order('updated_at', { ascending: false }).limit(200);
  if (error) throw error;
  const decks = data.map((r) => {
    const likes = (r.deck_likes as { user_id: string }[]) ?? [];
    return {
      ...toEntry(r), ownerName: (r.profiles as { username: string } | null)?.username ?? '?',
      likes: likes.length, liked: likes.some((l) => l.user_id === userId), isPublic: true,
    };
  });
  if (sort === 'beliebt') decks.sort((a, b) => b.likes - a.likes);
  return decks.slice(0, limit);
}
