import { randomInt } from 'node:crypto';
import type { AdminClient } from '@/lib/supabase/admin';
import { CODE_ALPHABET } from './game-service';
import { fail, ok, type ServiceResult } from './result';
import type { ProfileLite } from './social-service';

/** A player may belong to this many courts at once. */
export const MAX_COURTS = 5;
export const MAX_MEMBERS = 40;
const PROFILE_COLS = 'id, username, avatar_url, avatar_frame';

export interface CourtSummary { id: string; name: string; crest: string; members: number; owner: boolean }
export interface CourtStanding { profile: ProfileLite; games: number; wins: number; points: number; owner: boolean }
export interface CourtDetail {
  id: string; name: string; crest: string; inviteCode: string; ownerId: string; createdAt: string;
  standings: CourtStanding[]; courtGames: number;
}

function inviteCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

async function membershipCount(admin: AdminClient, userId: string) {
  const { count, error } = await admin.from('court_members').select('court_id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

export async function createCourt(admin: AdminClient, userId: string, name: string, crest: string): Promise<ServiceResult<{ id: string }>> {
  if (await membershipCount(admin, userId) >= MAX_COURTS) return fail(`Du bist schon in ${MAX_COURTS} Höfen.`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin.from('courts').insert({ name, crest, owner_id: userId, invite_code: inviteCode() }).select('id').single();
    if (error) {
      if (error.code === '23505') continue;
      throw error;
    }
    const { error: e2 } = await admin.from('court_members').insert({ court_id: data.id, user_id: userId });
    if (e2) {
      await admin.from('courts').delete().eq('id', data.id);
      throw e2;
    }
    return ok({ id: data.id });
  }
  return fail('Konnte keinen Einladungscode erzeugen. Bitte nochmal versuchen.');
}

export async function joinCourt(admin: AdminClient, userId: string, code: string): Promise<ServiceResult<{ id: string }>> {
  const { data: court } = await admin.from('courts').select('id').eq('invite_code', code).maybeSingle();
  if (!court) return fail('Kein Hof mit diesem Code gefunden.');
  const { data: already } = await admin.from('court_members').select('court_id').eq('court_id', court.id).eq('user_id', userId).maybeSingle();
  if (already) return ok({ id: court.id });
  if (await membershipCount(admin, userId) >= MAX_COURTS) return fail(`Du bist schon in ${MAX_COURTS} Höfen.`);
  const { count } = await admin.from('court_members').select('user_id', { count: 'exact', head: true }).eq('court_id', court.id);
  if ((count ?? 0) >= MAX_MEMBERS) return fail('Dieser Hof ist voll.');
  const { error } = await admin.from('court_members').insert({ court_id: court.id, user_id: userId });
  if (error && error.code !== '23505') throw error;
  return ok({ id: court.id });
}

/** Leaving hands the court to the longest-serving member; the last one out dissolves it. */
export async function leaveCourt(admin: AdminClient, userId: string, courtId: string): Promise<ServiceResult> {
  const { data: court } = await admin.from('courts').select('owner_id').eq('id', courtId).maybeSingle();
  if (!court) return fail('Hof nicht gefunden.');
  await admin.from('court_members').delete().eq('court_id', courtId).eq('user_id', userId);
  const { data: rest } = await admin.from('court_members').select('user_id').eq('court_id', courtId).order('joined_at').limit(1);
  if (!rest || rest.length === 0) {
    await admin.from('courts').delete().eq('id', courtId);
  } else if (court.owner_id === userId) {
    await admin.from('courts').update({ owner_id: rest[0].user_id }).eq('id', courtId);
  }
  return ok(undefined);
}

export async function removeCourtMember(admin: AdminClient, ownerId: string, courtId: string, memberId: string): Promise<ServiceResult> {
  if (ownerId === memberId) return fail('Du kannst dich nicht selbst verbannen.');
  const { data: court } = await admin.from('courts').select('owner_id').eq('id', courtId).maybeSingle();
  if (!court || court.owner_id !== ownerId) return fail('Nur der Hofherr darf verbannen.');
  await admin.from('court_members').delete().eq('court_id', courtId).eq('user_id', memberId);
  return ok(undefined);
}

export async function renameCourt(admin: AdminClient, ownerId: string, courtId: string, name: string, crest: string): Promise<ServiceResult> {
  const { data, error } = await admin.from('courts').update({ name, crest }).eq('id', courtId).eq('owner_id', ownerId).select('id');
  if (error) throw error;
  return data.length > 0 ? ok(undefined) : fail('Nur der Hofherr darf den Hof ändern.');
}

export async function listMyCourts(admin: AdminClient, userId: string): Promise<CourtSummary[]> {
  const { data, error } = await admin.from('court_members')
    .select('courts!inner(id, name, crest, owner_id, court_members(count))').eq('user_id', userId).order('joined_at');
  if (error) throw error;
  return (data as unknown as { courts: { id: string; name: string; crest: string; owner_id: string; court_members: { count: number }[] } }[])
    .map(({ courts: c }) => ({ id: c.id, name: c.name, crest: c.crest, members: c.court_members[0]?.count ?? 0, owner: c.owner_id === userId }));
}

/** Court details for a member: the table counts only finished normal games with at least two members. */
export async function getCourt(admin: AdminClient, userId: string, courtId: string): Promise<CourtDetail | null> {
  const { data: court } = await admin.from('courts').select('id, name, crest, invite_code, owner_id, created_at').eq('id', courtId).maybeSingle();
  if (!court) return null;
  const { data: members, error } = await admin.from('court_members')
    .select(`user_id, joined_at, profiles(${PROFILE_COLS})`).eq('court_id', courtId).order('joined_at');
  if (error) throw error;
  if (!members.some((m) => m.user_id === userId)) return null;
  const ids = members.map((m) => m.user_id);

  const { data: rows, error: e2 } = await admin.from('game_players')
    .select('game_id, user_id, place, points, games!inner(status, mode, finished_at)')
    .in('user_id', ids).eq('left_game', false).eq('games.status', 'finished').eq('games.mode', 'normal')
    .gte('games.finished_at', court.created_at);
  if (e2) throw e2;
  const perGame = new Map<string, typeof rows>();
  for (const r of rows) perGame.set(r.game_id, [...(perGame.get(r.game_id) ?? []), r]);

  const standings = new Map<string, CourtStanding>(members.map((m) => [m.user_id, {
    profile: m.profiles as ProfileLite, games: 0, wins: 0, points: 0, owner: m.user_id === court.owner_id,
  }]));
  let courtGames = 0;
  for (const players of perGame.values()) {
    if (players.length < 2) continue;
    courtGames += 1;
    // Best placed court member wins the court duel even if a stranger took the crown.
    const best = Math.min(...players.map((p) => p.place ?? 99));
    for (const p of players) {
      const s = standings.get(p.user_id)!;
      s.games += 1;
      s.points += p.points ?? 0;
      if ((p.place ?? 99) === best) s.wins += 1;
    }
  }
  return {
    id: court.id, name: court.name, crest: court.crest, inviteCode: court.invite_code, ownerId: court.owner_id,
    createdAt: court.created_at, courtGames,
    standings: [...standings.values()].sort((a, b) => b.wins - a.wins || b.points - a.points || b.games - a.games),
  };
}
