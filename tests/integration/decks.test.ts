import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/lib/decks';
import { canUseDeck, copyDeck, createDeck, deleteDeck, getDefaultDeckId, setDefaultDeck, updateDeck } from '@/server/deck-service';
import { admin, createTestUser } from './helpers';

describe('decks', () => {
  it('creates, validates, copies and deletes decks', async () => {
    const owner = await createTestUser('d');
    const other = await createTestUser('o');
    const design = structuredClone(PRESETS[1].design);
    const created = await createDeck(admin, owner.id, 'Meine Wache', design);
    expect(created.ok).toBe(true);
    const id = created.ok ? created.data.id : '';

    expect((await createDeck(admin, owner.id, '', design)).ok).toBe(false);
    expect((await updateDeck(admin, owner.id, id, 'X', { ...design, cards: design.cards.slice(1) })).ok).toBe(false);
    const evil = structuredClone(design);
    evil.cards[0].image = 'https://evil.example/x.webp';
    expect((await updateDeck(admin, owner.id, id, 'X', evil)).ok).toBe(false);
    expect((await updateDeck(admin, other.id, id, 'X', design)).ok).toBe(false);

    // Anyone signed in may read decks (they appear at the table).
    const { data } = await other.client.from('decks').select('name').eq('id', id).single();
    expect(data!.name).toBe('Meine Wache');

    expect(await canUseDeck(admin, other.id, id)).toBe(false);
    const copy = await copyDeck(admin, other.id, id);
    expect(copy.ok).toBe(true);
    if (copy.ok) expect(await canUseDeck(admin, other.id, copy.data.id)).toBe(true);

    expect((await setDefaultDeck(admin, owner.id, id)).ok).toBe(true);
    expect(await getDefaultDeckId(admin, owner.id)).toBe(id);
    expect((await deleteDeck(admin, owner.id, id)).ok).toBe(true);
    expect(await getDefaultDeckId(admin, owner.id)).toBeNull();
    expect((await setDefaultDeck(admin, owner.id, 'preset:tierreich')).ok).toBe(true);
    expect(await getDefaultDeckId(admin, owner.id)).toBe('preset:tierreich');
  });
});

describe('deck gallery', () => {
  it('shares decks, counts likes once and refuses self-likes and private decks', async () => {
    const { listGallery, setDeckPublic, toggleDeckLike } = await import('@/server/deck-service');
    const artist = await createTestUser('ga');
    const fan = await createTestUser('gf');
    const created = await createDeck(admin, artist.id, 'Galeriestück', structuredClone(PRESETS[2].design));
    if (!created.ok) throw new Error(created.error);
    const id = created.data.id;

    expect((await toggleDeckLike(admin, fan.id, id)).ok).toBe(false);
    expect((await setDeckPublic(admin, fan.id, id, true)).ok).toBe(false);
    expect((await setDeckPublic(admin, artist.id, id, true)).ok).toBe(true);
    expect((await toggleDeckLike(admin, artist.id, id)).ok).toBe(false);
    expect(await toggleDeckLike(admin, fan.id, id)).toEqual({ ok: true, data: { liked: true } });

    const entry = (await listGallery(admin, fan.id, 'beliebt')).find((d) => d.id === id)!;
    expect(entry).toMatchObject({ likes: 1, liked: true, ownerName: artist.username });
    expect(await toggleDeckLike(admin, fan.id, id)).toEqual({ ok: true, data: { liked: false } });

    await setDeckPublic(admin, artist.id, id, false);
    expect((await listGallery(admin, fan.id, 'neu')).some((d) => d.id === id)).toBe(false);
  });
});
