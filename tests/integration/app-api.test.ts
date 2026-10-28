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
});
