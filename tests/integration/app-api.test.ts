import { describe, expect, it } from 'vitest';
import { renderArt } from '@/server/app-api/art';
import { GET, POST, PUBLIC_POST, type Ctx } from '@/server/app-api/handlers';
import { admin, createTestUser } from './helpers';

async function ctxFor(prefix: string) {
  const u = await createTestUser(prefix);
  const { data: user } = await admin.from('profiles')
    .select('id, username, avatar_url, avatar_frame, table_felt, xp, rating').eq('id', u.id).single();
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
});
