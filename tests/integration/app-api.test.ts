import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/lib/decks';
import { renderArt } from '@/server/app-api/art';
import { GET, POST, PUBLIC_POST, type Ctx } from '@/server/app-api/handlers';
import { admin, createTestUser } from './helpers';

async function ctxFor(prefix: string) {
  const u = await createTestUser(prefix);
  const { data: user } = await admin.from('profiles')
    .select('id, username, avatar_url, avatar_frame, table_felt, xp, rating, loot_equipped').eq('id', u.id).single();
  return (params: string[] = [], body: Record<string, unknown> = {}, query = ''): Ctx =>
    ({ admin, user: user!, params, body, query: new URLSearchParams(query) });
}

describe('app api', () => {
  it('opens a table, plays against bots and keeps hands private', async () => {
    const host = await ctxFor('ah');
    const guest = await ctxFor('ag');
    const home = await GET.home(host());
    expect(home).toMatchObject({ ok: true, data: { active: [], friendRequests: 0 } });

    const table = await POST.table(host([], { kind: 'new' }));
    if (!table.ok) throw new Error(table.error);
    const { code } = table.data as { code: string };
    const joined = await GET.game(guest([code]));
    if (!joined.ok) throw new Error(joined.error);
    const view = (joined.data as { view: { id: string; version: number; state: { players: unknown[] } } }).view;
    expect(view.state.players).toHaveLength(2);

    const start = await POST.action(host([view.id], { action: { type: 'start' }, expected: view.version }));
    expect(start.ok).toBe(true);
    const opened = await GET.game(host([code]));
    const data = opened.ok ? opened.data as { hand: { cards: number[] }; view: { state: Record<string, unknown> }; decks: Record<string, unknown> } : null;
    expect(data?.view.state.hands).toBeUndefined();
    expect(Object.keys(data!.decks)).toHaveLength(2);
    expect(await POST.action(host([view.id], { action: { type: 'cheat' } }))).toMatchObject({ ok: false });
    expect(await POST.action(host(['nope'], { action: { type: 'pass' } }))).toMatchObject({ ok: false });
  });

  it('checks the access question and renders card art as svg', async () => {
    expect((await PUBLIC_POST.gate({ answer: ' peschel ' })).ok).toBe(true);
    expect((await PUBLIC_POST.gate({ answer: 'nein' })).ok).toBe(false);
    expect((await PUBLIC_POST.register({ answer: 'nein', email: 'x@test.local', password: 'passwort123', username: 'xyz' })).ok).toBe(false);
    const svg = renderArt('h-crown', new URLSearchParams('rank=3&bg=%23552288'));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(renderArt('constructor', new URLSearchParams())).toBeNull();
    expect(renderArt('h-crown', new URLSearchParams('bg=red'))).toBeNull();
  });

  it('runs courts, the deck gallery and profile edits', async () => {
    const lord = await ctxFor('cl');
    const vassal = await ctxFor('cv');
    const crest = ((await GET.courts(lord())) as { ok: true; data: { crests: string[] } }).data.crests[0];
    expect((await POST.court(lord([], { op: 'create', name: 'X', crest }))).ok).toBe(false);
    const created = await POST.court(lord([], { op: 'create', name: 'Wache Nord', crest }));
    if (!created.ok) throw new Error(created.error);
    const id = (created.data as { id: string }).id;
    const detail = await GET.court(lord([id]));
    const code = detail.ok ? (detail.data as { inviteCode: string }).inviteCode : '';
    expect((await POST.court(vassal([], { op: 'join', code: code.toLowerCase() }))).ok).toBe(true);
    expect((await GET.court(vassal([id]))).ok).toBe(true);
    expect((await POST.court(vassal([], { op: 'kick', id, memberId: lord().user.id }))).ok).toBe(false);

    const mine = await POST.deck(lord([], { op: 'copy', id: 'preset:hofstaat' }));
    if (!mine.ok) throw new Error(mine.error);
    const deckId = (mine.data as { id: string }).id;
    expect((await POST.deck(vassal([], { op: 'public', id: deckId, public: true }))).ok).toBe(false);
    expect((await POST.deck(lord([], { op: 'public', id: deckId, public: true }))).ok).toBe(true);
    expect(await POST.deck(vassal([], { op: 'like', id: deckId }))).toEqual({ ok: true, data: { liked: true } });
    const gallery = await GET.gallery(vassal([], {}, 'sort=neu'));
    expect(gallery.ok && (gallery.data as { decks: { id: string }[] }).decks.some((d) => d.id === deckId)).toBe(true);

    expect((await POST.profile(lord([], { op: 'rename', username: 'a b' }))).ok).toBe(false);
    expect((await POST.profile(lord([], { op: 'avatar', url: 'https://evil.example/a.png' }))).ok).toBe(false);
    expect((await POST.profile(lord([], { op: 'removeAvatar' }))).ok).toBe(true);
  });

  it('creates, edits, uploads photos for and deletes own decks', async () => {
    const owner = await ctxFor('de');
    const stranger = await ctxFor('dx');
    const design = structuredClone(PRESETS[2].design);

    expect((await POST.deck(owner([], { op: 'create', name: '', design }))).ok).toBe(false);
    expect((await POST.deck(owner([], { op: 'create', name: 'Kaputt', design: { ...design, cards: design.cards.slice(1) } }))).ok).toBe(false);
    const created = await POST.deck(owner([], { op: 'create', name: 'Mein Zoo', design }));
    if (!created.ok) throw new Error(created.error);
    const id = (created.data as { id: string }).id;
    const listed = await GET.decks(owner());
    expect(listed.ok && (listed.data as { mine: { id: string; name: string }[] }).mine).toEqual([expect.objectContaining({ id, name: 'Mein Zoo' })]);
    expect(listed.ok && (listed.data as { art: { ids: string[] }[] }).art[0].ids.length).toBeGreaterThan(0);

    // Photo upload: real JPEG/PNG bytes only, own decks only, valid slots only.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString('base64');
    expect((await POST.deckImage(stranger([], { id, slot: 3, data: jpeg }))).ok).toBe(false);
    expect((await POST.deckImage(owner([], { id, slot: 14, data: jpeg }))).ok).toBe(false);
    expect((await POST.deckImage(owner([], { id, slot: 3, data: Buffer.from('<svg onload=alert(1)>').toString('base64') }))).ok).toBe(false);
    const photo = await POST.deckImage(owner([], { id, slot: 3, data: jpeg }));
    if (!photo.ok) throw new Error(photo.error);
    const url = (photo.data as { url: string }).url;
    expect(url).toMatch(new RegExp(`/deck-art/${owner().user.id}/${id}/r3-\\d+\\.jpg$`));
    const back = await POST.deckImage(owner([], { id, slot: 'back', data: jpeg }));
    if (!back.ok) throw new Error(back.error);

    const edited = structuredClone(design);
    edited.cards[2] = { ...edited.cards[2], name: 'Bärli', image: url };
    edited.back = { ...edited.back, image: (back.data as { url: string }).url, zoom: 1.4, panX: 10, panY: -5 };
    edited.cards[0].layout = {
      background: '#ffeecc', frame: false,
      picture: { visible: true, fill: false, shape: 'abgerundet', x: 50, y: 40, size: 70, rotate: 10, zoom: 1, panX: 0, panY: 0 },
      number: { style: 'gross', x: 50, y: 22, size: 40, color: null },
      name: { style: 'schlicht', x: 50, y: 85, size: 9, width: 90 },
      stickers: [{ id: 'abc1', kind: 'emoji', value: '⭐', x: 20, y: 20, size: 16, rotate: 0, color: '#000000' }],
    };
    expect((await POST.deck(stranger([], { op: 'update', id, name: 'Geklaut', design: edited }))).ok).toBe(false);
    expect((await POST.deck(owner([], { op: 'update', id, name: 'Mein Zoo', design: { ...edited, font: 'comic' } }))).ok).toBe(false);
    const evil = structuredClone(edited);
    evil.cards[4].image = 'https://evil.example/x.jpg';
    expect((await POST.deck(owner([], { op: 'update', id, name: 'Mein Zoo', design: evil }))).ok).toBe(false);
    expect((await POST.deck(owner([], { op: 'update', id, name: 'Zoo Royal', design: edited }))).ok).toBe(true);
    const { data: row } = await admin.from('decks').select('name, design').eq('id', id).single();
    expect(row!.name).toBe('Zoo Royal');
    expect(row!.design).toMatchObject({ cards: expect.arrayContaining([expect.objectContaining({ name: 'Bärli', image: url })]) });

    expect((await POST.deck(owner([], { op: 'default', id }))).ok).toBe(true);
    expect((await POST.deck(stranger([], { op: 'delete', id }))).ok).toBe(false);
    expect((await POST.deck(owner([], { op: 'delete', id: 'preset:hofstaat' }))).ok).toBe(false);
    expect((await POST.deck(owner([], { op: 'delete', id }))).ok).toBe(true);
    const after = await GET.decks(owner());
    expect(after.ok && (after.data as { mine: unknown[]; defaultId: string }).mine).toEqual([]);
    expect(after.ok && (after.data as { defaultId: string }).defaultId).toBe(PRESETS[0].id);
    const { data: files } = await admin.storage.from('deck-art').list(`${owner().user.id}/${id}`);
    expect(files ?? []).toEqual([]);
  });
});
