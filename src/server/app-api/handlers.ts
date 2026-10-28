import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { z } from 'zod';
import { CAMPAIGN, campaignLockedToday, campaignTitle } from '@/lib/campaign';
import { berlinDay } from '@/lib/daily';
import { PRESETS, resolveDeck } from '@/lib/decks';
import { isCorrectGateAnswer } from '@/lib/gate';
import { privateHand } from '@/lib/jakob/engine';
import { monthOf, monthTitle } from '@/lib/months';
import { createAdminClient, type AdminClient } from '@/lib/supabase/admin';
import { sendChatMessage } from '../chat-service';
import { CREST_IDS } from '@/components/courts/crest';
import { createCourt, getCourt, joinCourt, leaveCourt, listMyCourts, removeCourtMember, renameCourt } from '../court-service';
import {
  copyDeck, getDecksByIds, getDefaultDeckId, listDecks, listGallery, publicDeckIds, setDeckPublic, setDefaultDeck, toggleDeckLike,
} from '../deck-service';
import { runGameAction, uuid } from '../game-commands';
import { createGame, joinGame, loadGameByCode, requestRematch, toView } from '../game-service';
import { findOrCreatePublicLobby, publicLobbyStats } from '../matchmaking-service';
import {
  badgesFor, getDetailedStats, getHistory, getKingOfWeek, getLeaderboard, getMonthlyChampions,
  getMonthlyLeaderboard, getQuickEmojis, getRivalries, getStatsByUsername, listActiveGames,
  isUsernameTaken, removeAvatar, renameUser, setAvatarUrl, USERNAME_RE,
} from '../profile-service';
import { buyChest, equipLoot, getLoot, openChest } from '../loot-service';
import { sendPush } from '../push-service';
import { LOOT_ITEMS } from '@/lib/loot/catalog';
import { getRatingLeaderboard, getRatingSummary } from '../rating-service';
import { fail, ok, type ServiceResult } from '../result';
import {
  inviteFriendToTable, inviteToGame, listFriends, listPendingInvites, removeFriend, respondFriendRequest,
  respondInvite, searchProfiles, sendFriendRequest,
} from '../social-service';
import { botRoster, startCampaign, startDaily, startDuel } from '../solo-service';
import { DUEL_VARIANTS } from '@/lib/jakob/duel';
import type { AppUser } from './auth';

export interface Ctx { admin: AdminClient; user: AppUser; params: string[]; body: Record<string, unknown>; query: URLSearchParams }
type Handler = (ctx: Ctx) => Promise<ServiceResult<unknown>>;

const name = z.string().trim().min(1).max(40);
const courtInput = z.object({
  name: z.string().trim().min(2, 'Der Name braucht mindestens 2 Zeichen.').max(40, 'Höchstens 40 Zeichen.'),
  crest: z.string().refine((id) => CREST_IDS.includes(id), 'Unbekanntes Wappen.'),
});

async function gameCode(admin: AdminClient, gameId: string) {
  return (await admin.from('games').select('code').eq('id', gameId).single()).data?.code;
}

/** Everything the app needs to open a table (joins like the web page does). */
async function openGame({ admin, user, params }: Ctx) {
  const code = params[0] ?? '';
  let game = await loadGameByCode(admin, code);
  if (!game) return fail('Kein Spiel mit diesem Code gefunden.');
  if (!game.state.players.some((p) => p.id === user.id)) {
    const joined = await joinGame(admin, user.id, code);
    if (!joined.ok) return joined;
    game = await loadGameByCode(admin, code);
    if (!game) return fail('Kein Spiel mit diesem Code gefunden.');
  }
  const humanIds = game.state.players.filter((p) => !p.bot).map((p) => p.id);
  const deckIds = game.state.players.map((p) => p.deckId).filter((d): d is string => !!d);
  const [{ data: profiles }, friends, custom, myDecks, quickEmojis] = await Promise.all([
    admin.from('profiles').select('id, username, avatar_url, avatar_frame, loot_equipped').in('id', humanIds),
    listFriends(admin, user.id),
    getDecksByIds(admin, deckIds),
    listDecks(admin, user.id),
    getQuickEmojis(admin, user.id),
  ]);
  const decks = Object.fromEntries(game.state.players.map((p) => [p.id, resolveDeck(p.deckId, custom)]));
  return ok({
    view: toView(game),
    hand: privateHand(game.state, user.id),
    profiles: Object.fromEntries((profiles ?? []).map((p) => [p.id, p])),
    decks,
    friends: friends.friends.map((f) => f.profile),
    myDecks: [...PRESETS, ...myDecks],
    quickEmojis,
    serverNow: Date.now(),
  });
}

export const GET: Record<string, Handler> = {
  async me({ admin, user }) {
    const [stats, rating] = await Promise.all([getStatsByUsername(admin, user.username), getRatingSummary(admin, user.id)]);
    return ok({ profile: user, stats, rating });
  },

  async home({ admin, user }) {
    const [friends, active, invites, progress, daily, lobby, rating, defaultDeck] = await Promise.all([
      listFriends(admin, user.id),
      listActiveGames(admin, user.id),
      listPendingInvites(admin, user.id),
      admin.from('profiles').select('campaign_level, chests').eq('id', user.id).maybeSingle(),
      admin.from('daily_results').select('points, place').eq('day', berlinDay()).eq('user_id', user.id).maybeSingle(),
      publicLobbyStats(admin),
      getRatingSummary(admin, user.id),
      getDefaultDeckId(admin, user.id),
    ]);
    const king = await getKingOfWeek(admin, [user.id, ...friends.friends.map((f) => f.profile.id)]);
    const level = progress.data?.campaign_level ?? 0;
    return ok({
      profile: user, rating, active, invites, king,
      friendRequests: friends.incoming.length,
      chests: progress.data?.chests ?? 0,
      campaign: { level, title: campaignTitle(level), stages: CAMPAIGN.length },
      daily: daily.data ?? null,
      lobby,
      deck: defaultDeck ?? PRESETS[0].id,
    });
  },

  async game(ctx) {
    return openGame(ctx);
  },

  async campaign({ admin, user }) {
    const { data } = await admin.from('profiles').select('campaign_level, campaign_won_on').eq('id', user.id).maybeSingle();
    const level = data?.campaign_level ?? 0;
    return ok({
      level, title: campaignTitle(level), lockedToday: campaignLockedToday(data?.campaign_won_on, berlinDay()),
      stages: CAMPAIGN.map((s) => ({ level: s.level, place: s.place, title: s.title, emoji: s.emoji, story: s.story, twist: s.twist, bots: s.bots.length })),
    });
  },

  async friends({ admin, user }) {
    return ok(await listFriends(admin, user.id));
  },

  /** The persona bots with the player's record, and the duel rule sets. */
  async bots({ admin, user }) {
    const bots = await botRoster(admin, user.id);
    return ok({ bots: bots.map(({ quips, ...b }) => ({ ...b, greeting: quips.greet[0] })), variants: DUEL_VARIANTS });
  },

  async search({ admin, user, query }) {
    const q = name.safeParse(query.get('q') ?? '');
    return ok(q.success ? await searchProfiles(admin, user.id, q.data) : []);
  },

  async leaderboard({ admin, query }) {
    const tab = query.get('tab');
    if (tab === 'elo') return ok({ tab, rows: await getRatingLeaderboard(admin) });
    if (tab === 'monat') {
      const month = monthOf(new Date());
      return ok({ tab, title: monthTitle(month), rows: await getMonthlyLeaderboard(admin, month) });
    }
    return ok({ tab: 'gesamt', rows: await getLeaderboard(admin) });
  },

  async profile({ admin, params }) {
    const stats = await getStatsByUsername(admin, params[0] ?? '');
    if (!stats) return fail('Profil nicht gefunden.');
    const [history, champions, rivals, detailed, rating] = await Promise.all([
      getHistory(admin, stats.user_id, 15), getMonthlyChampions(admin, 12), getRivalries(admin, stats.user_id),
      getDetailedStats(admin, stats.user_id), getRatingSummary(admin, stats.user_id),
    ]);
    const titles = champions.filter((c) => c.champion.user_id === stats.user_id).map((c) => monthTitle(c.month));
    return ok({ stats, badges: badgesFor(stats), history, rivals, detailed, rating, titles });
  },

  async decks({ admin, user }) {
    const [mine, defaultId] = await Promise.all([listDecks(admin, user.id), getDefaultDeckId(admin, user.id)]);
    return ok({ presets: PRESETS, mine, defaultId: defaultId ?? PRESETS[0].id });
  },

  async gallery({ admin, user, query }) {
    const sort = query.get('sort') === 'neu' ? 'neu' : 'beliebt';
    const [decks, shared] = await Promise.all([listGallery(admin, user.id, sort), publicDeckIds(admin, user.id)]);
    return ok({ sort, decks: decks.filter((d) => d.ownerId !== user.id), shared });
  },

  async loot({ admin, user }) {
    return ok({ ...(await getLoot(admin, user.id)), catalog: LOOT_ITEMS });
  },

  async courts({ admin, user }) {
    return ok({ courts: await listMyCourts(admin, user.id), crests: CREST_IDS });
  },

  async court({ admin, user, params }) {
    if (!uuid.safeParse(params[0]).success) return fail('Hof nicht gefunden.');
    const court = await getCourt(admin, user.id, params[0]);
    return court ? ok({ ...court, crests: CREST_IDS }) : fail('Hof nicht gefunden.');
  },
};

export const POST: Record<string, Handler> = {
  async table({ admin, user, body }) {
    const deck = await getDefaultDeckId(admin, user.id);
    switch (body.kind) {
      case 'new': return createGame(admin, user.id, deck);
      case 'online': return findOrCreatePublicLobby(admin, user.id, deck);
      case 'join': return joinGame(admin, user.id, String(body.code ?? ''));
      case 'campaign': return startCampaign(admin, user.id, Number(body.level));
      case 'daily': return startDaily(admin, user.id);
      case 'duel': return startDuel(admin, user.id, String(body.persona ?? ''), String(body.variant ?? 'klassisch'));
      default: return fail('Ungültige Aktion.');
    }
  },

  async action({ admin, user, params, body }) {
    return runGameAction(admin, user, params[0], body.action, body.expected);
  },

  async rematch({ admin, user, params }) {
    if (!uuid.safeParse(params[0]).success) return fail('Ungültige Aktion.');
    return requestRematch(admin, user.id, params[0]);
  },

  async chat({ admin, user, params, body }) {
    if (!uuid.safeParse(params[0]).success || typeof body.body !== 'string') return fail('Ungültige Nachricht.');
    return sendChatMessage(admin, user.id, params[0], body.body);
  },

  async invite({ admin, user, params, body }) {
    const friendId = String(body.friendId ?? '');
    if (!uuid.safeParse(friendId).success) return fail('Ungültige Aktion.');
    // With a table id: invite to that lobby; without: to my lobby or a fresh table.
    if (params[0]) {
      if (!uuid.safeParse(params[0]).success) return fail('Ungültige Aktion.');
      const res = await inviteToGame(admin, user.id, params[0], friendId);
      if (res.ok) {
        const code = await gameCode(admin, params[0]);
        after(() => sendPush(admin, [friendId], {
          title: '🎴 Einladung an den Tisch', body: `${user.username} lädt dich zum Großen Jakob ein.`, url: `/spiel/${code}`, tag: `invite-${params[0]}`,
        }));
      }
      return res;
    }
    const res = await inviteFriendToTable(admin, user.id, friendId, await getDefaultDeckId(admin, user.id));
    if (res.ok && !res.data.alreadyThere) {
      after(() => sendPush(admin, [friendId], {
        title: '🎴 Einladung an den Tisch', body: `${user.username} lädt dich zum Großen Jakob ein.`,
        url: `/spiel/${res.data.code}`, tag: `invite-${res.data.gameId}`,
      }));
    }
    return res;
  },

  async friends({ admin, user, body }) {
    const id = String(body.id ?? '');
    switch (body.op) {
      case 'request': {
        const q = name.safeParse(body.username);
        if (!q.success) return fail('Benutzer nicht gefunden.');
        const res = await sendFriendRequest(admin, user.id, q.data);
        if (res.ok && res.data.status === 'pending') {
          const { data: target } = await admin.from('profiles').select('id').eq('username', q.data).maybeSingle();
          if (target) {
            after(() => sendPush(admin, [target.id], {
              title: '🤝 Freundschaftsanfrage', body: `${user.username} möchte mit dir befreundet sein.`, url: '/freunde', tag: `friend-${user.id}`,
            }));
          }
        }
        return res;
      }
      case 'respond':
        if (!uuid.safeParse(id).success) return fail('Anfrage nicht gefunden.');
        return respondFriendRequest(admin, user.id, id, body.accept === true);
      case 'remove':
        if (!uuid.safeParse(id).success) return fail('Freundschaft nicht gefunden.');
        return removeFriend(admin, user.id, id);
      case 'invite':
        if (!uuid.safeParse(id).success) return fail('Einladung nicht gefunden.');
        return respondInvite(admin, user.id, id, body.accept === true);
      default:
        return fail('Ungültige Aktion.');
    }
  },

  async deck({ admin, user, body }) {
    const id = body.id === null ? null : String(body.id ?? '');
    if (id !== null && (id.length < 1 || id.length > 64)) return fail('Deck nicht gefunden.');
    switch (body.op ?? 'default') {
      case 'default': return setDefaultDeck(admin, user.id, id);
      case 'copy': return id ? copyDeck(admin, user.id, id) : fail('Deck nicht gefunden.');
      case 'like': return uuid.safeParse(id).success ? toggleDeckLike(admin, user.id, id!) : fail('Deck nicht gefunden.');
      case 'public': return uuid.safeParse(id).success ? setDeckPublic(admin, user.id, id!, body.public === true) : fail('Deck nicht gefunden.');
      default: return fail('Ungültige Aktion.');
    }
  },

  async court({ admin, user, body }) {
    const id = String(body.id ?? '');
    const input = courtInput.safeParse({ name: body.name, crest: body.crest });
    switch (body.op) {
      case 'create':
        if (!input.success) return fail(input.error.issues[0].message);
        return createCourt(admin, user.id, input.data.name, input.data.crest);
      case 'join': {
        const code = String(body.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return code.length === 8 ? joinCourt(admin, user.id, code) : fail('Der Einladungscode hat 8 Zeichen.');
      }
      case 'leave':
        return uuid.safeParse(id).success ? leaveCourt(admin, user.id, id) : fail('Hof nicht gefunden.');
      case 'kick': {
        const member = String(body.memberId ?? '');
        if (!uuid.safeParse(id).success || !uuid.safeParse(member).success) return fail('Mitglied nicht gefunden.');
        return removeCourtMember(admin, user.id, id, member);
      }
      case 'update':
        if (!uuid.safeParse(id).success) return fail('Hof nicht gefunden.');
        if (!input.success) return fail(input.error.issues[0].message);
        return renameCourt(admin, user.id, id, input.data.name, input.data.crest);
      default:
        return fail('Ungültige Aktion.');
    }
  },

  async loot({ admin, user, body }) {
    switch (body.op) {
      case 'open': return openChest(admin, user.id);
      case 'buy': return buyChest(admin, user.id);
      case 'equip': return equipLoot(admin, user.id, body.kind, body.id ?? null);
      default: return fail('Ungültige Aktion.');
    }
  },

  async profile({ admin, user, body }) {
    switch (body.op) {
      case 'rename': return renameUser(admin, user.id, String(body.username ?? ''));
      case 'avatar': return typeof body.url === 'string' ? setAvatarUrl(admin, user.id, body.url) : fail('Ungültige Bild-URL.');
      case 'removeAvatar': return removeAvatar(admin, user.id);
      default: return fail('Ungültige Aktion.');
    }
  },
};

/** Registration and the access question work without a session. */
export const PUBLIC_POST: Record<string, (body: Record<string, unknown>) => Promise<ServiceResult<unknown>>> = {
  async gate(body) {
    return isCorrectGateAnswer(body.answer) ? ok({ open: true }) : fail('Das ist leider falsch. Die Wache lässt dich nicht durch.');
  },

  /** Same rules as the web sign-up; returns the session so the app is signed in right away. */
  async register(body) {
    if (!isCorrectGateAnswer(body.answer)) return fail('Bitte zuerst die Zugangsfrage beantworten.');
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { email, password, username } = parsed.data;
    const admin = createAdminClient();
    if (await isUsernameTaken(admin, username)) return fail('Benutzername ist schon vergeben.');
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) return fail('Diese E-Mail ist schon registriert.');
      return fail('Registrierung fehlgeschlagen. Bitte nochmal versuchen.');
    }
    if (!data.session) return ok({ session: null });
    return ok({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  },
};

const signUpSchema = z.object({
  email: z.email('Bitte eine gültige E-Mail eingeben.'),
  password: z.string().min(8, 'Passwort: mindestens 8 Zeichen.'),
  username: z.string().trim().regex(USERNAME_RE, 'Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen und _.'),
});
