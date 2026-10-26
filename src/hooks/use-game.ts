'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { DeckEntry } from '@/lib/decks';
import { parseDesign, presetById } from '@/lib/decks';
import { isAllowedEmoji } from '@/lib/emojis';
import { removeCards } from '@/lib/jakob/cards';
import { botToMove, type GameAction, type PrivateHand, type PublicState } from '@/lib/jakob/engine';
import { judgePlay } from '@/lib/jakob/rules';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { gameAction } from '@/server/game-actions';
import type { GameView } from '@/server/game-service';
import { STALE } from '@/server/result';
import type { ProfileLite } from '@/server/social-service';

export interface EmojiEvent { id: string; emoji: string; from: string }
export interface HandState extends PrivateHand { version: number }

type Row = { id: string; code: string; version: number; state: unknown; rematch_game_id: string | null };
const toView = (r: Row): GameView => ({
  id: r.id, code: r.code, version: r.version, state: r.state as PublicState, rematchGameId: r.rematch_game_id,
});

interface Options {
  initial: GameView;
  initialHand: PrivateHand;
  initialProfiles: Record<string, ProfileLite>;
  initialDecks: Record<string, DeckEntry>;
  me: string;
  serverNow: number;
}

export function useGame({ initial, initialHand, initialProfiles, initialDecks, me, serverNow }: Options) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [game, setGame] = useState<GameView | null>(initial);
  const [hand, setHand] = useState<HandState>({ ...initialHand, version: initial.version });
  const [profiles, setProfiles] = useState(initialProfiles);
  const [decks, setDecks] = useState(initialDecks);
  const [online, setOnline] = useState<Set<string>>(() => new Set([me]));
  const [connected, setConnected] = useState(true);
  const [emojis, setEmojis] = useState<EmojiEvent[]>([]);
  const [kickNotice, setKickNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  // Server clock minus local clock, so countdowns match the server's deadline checks.
  const [clockOffset] = useState(() => serverNow - Date.now());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const gameRef = useRef(game);
  const handRef = useRef(hand);
  const lastEmoji = useRef(0);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  const apply = useCallback((next: GameView) => {
    setGame((cur) => (!cur || next.version > cur.version || next.rematchGameId !== cur.rematchGameId ? next : cur));
  }, []);
  const applyHand = useCallback((next: PrivateHand, version: number) => {
    setHand((cur) => (version >= cur.version ? { ...next, version } : cur));
  }, []);

  const refetch = useCallback(async () => {
    const [{ data }, { data: own }] = await Promise.all([
      supabase.from('games').select('id, code, version, state, rematch_game_id').eq('id', initial.id).maybeSingle(),
      supabase.from('game_hands').select('hand, version').eq('game_id', initial.id).eq('user_id', me).maybeSingle(),
    ]);
    if (data) {
      // Replaces optimistic state at the same version, but never a newer realtime update.
      const view = toView(data);
      setGame((cur) => (!cur || view.version >= cur.version ? view : cur));
      if (own) applyHand(own.hand as unknown as PrivateHand, own.version);
    } else setGame(null);
  }, [applyHand, initial.id, me, supabase]);

  // Load profiles of newly joined players.
  const playerIds = game?.state.players.filter((p) => !p.bot).map((p) => p.id).join(',') ?? '';
  useEffect(() => {
    const missing = playerIds.split(',').filter((id) => id && !profiles[id]);
    if (missing.length === 0) return;
    supabase.from('profiles').select('id, username, avatar_url, avatar_frame').in('id', missing).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x])) }));
    });
  }, [playerIds, profiles, supabase]);

  // Load custom decks chosen at the table.
  const deckIds = game?.state.players.map((p) => p.deckId).filter(Boolean).join(',') ?? '';
  useEffect(() => {
    const missing = deckIds.split(',').filter((id) => id && !presetById(id) && !decks[id]);
    if (missing.length === 0) return;
    supabase.from('decks').select('id, owner_id, name, design').in('id', missing).then(({ data }) => {
      if (!data) return;
      const loaded: Record<string, DeckEntry> = {};
      for (const d of data) {
        const design = parseDesign(d.design);
        if (design) loaded[d.id] = { id: d.id, ownerId: d.owner_id, name: d.name, design };
      }
      setDecks((cur) => ({ ...cur, ...loaded }));
    });
  }, [deckIds, decks, supabase]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Private channels need the access token before subscribing.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const ch = supabase.channel(`game:${initial.id}`, { config: { private: true, presence: { key: me } } });
      channel = ch;
      channelRef.current = ch;
      ch
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
          (payload) => {
            const row = payload.new as Partial<Row>;
            // Unchanged large columns (the state) are left out of the event, e.g. when only the rematch link changes.
            if (!row.state) {
              setGame((cur) => (cur ? { ...cur, rematchGameId: row.rematch_game_id ?? cur.rematchGameId } : cur));
              return;
            }
            apply(toView(row as Row));
          })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'games', filter: `id=eq.${initial.id}` },
          () => setGame(null))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_hands', filter: `game_id=eq.${initial.id}` },
          (payload) => {
            const row = payload.new as { user_id?: string; hand?: PrivateHand; version?: number } | null;
            if (row?.user_id === me && row.hand) applyHand(row.hand, row.version ?? 0);
          })
        .on('broadcast', { event: 'emoji' }, ({ payload }) => {
          const e = payload as Partial<EmojiEvent> | null;
          const isPlayer = gameRef.current?.state.players.some((p) => p.id === e?.from && !p.left);
          if (!e || typeof e.id !== 'string' || !isAllowedEmoji(e.emoji) || !isPlayer) return;
          setEmojis((list) => [...list.slice(-15), { id: e.id!, emoji: e.emoji!, from: e.from! }]);
        })
        .on('broadcast', { event: 'kicked' }, ({ payload }) => {
          if ((payload as { userId?: string } | null)?.userId !== me) return;
          // Only a hint – verified by refetching, since broadcasts could come from fellow players.
          setKickNotice(true);
          void refetch();
        })
        .on('presence', { event: 'sync' }, () => {
          const ids = new Set(Object.keys(ch.presenceState()));
          ids.add(me);
          setOnline(ids);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            await ch.track({ at: Date.now() });
            await refetch();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnected(false);
          }
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [apply, applyHand, initial.id, me, refetch, supabase]);

  // Re-sync when the tab comes back (phones suspend websockets in the background).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetch]);

  /** Optimistic view of my own play or pass, so the table reacts before the server answers. */
  const optimistic = useCallback((action: GameAction) => {
    const cur = gameRef.current;
    if (!cur || cur.state.phase !== 'play' || cur.state.turn !== me) return;
    const s = cur.state;
    if (action.type === 'play') {
      const verdict = judgePlay(action.cards, s.trick, { settings: s.settings, event: s.event });
      if (!verdict.ok) return;
      const next: PublicState = {
        ...s,
        trick: { cards: [...action.cards].sort((a, b) => a - b), rank: verdict.rank, count: action.cards.length, by: me, seq: s.moveSeq + 1 },
        turn: null,
        handCounts: { ...s.handCounts, [me]: (s.handCounts[me] ?? 0) - action.cards.length },
      };
      setGame({ ...cur, state: next });
      setHand((h) => ({ ...h, cards: removeCards(h.cards, action.cards) }));
    } else if (action.type === 'pass') {
      setGame({ ...cur, state: { ...s, passed: [...s.passed, me], turn: null } });
    }
  }, [me]);

  /**
   * versioned: only valid for exactly this game version (lobby actions).
   * move: only valid for this move sequence (moves in a running game) – protects against double clicks.
   * silent: no error toast (automatic actions like timeouts and bot nudges).
   */
  const dispatch = useCallback(async (action: GameAction, opts: { versioned?: boolean; move?: boolean; silent?: boolean } = {}) => {
    const cur = gameRef.current;
    if (!cur) return false;
    const expected = opts.move ? { moveSeq: cur.state.moveSeq } : opts.versioned ? cur.version : undefined;
    if (!opts.silent) setBusy(true);
    optimistic(action);
    try {
      const res = await gameAction(cur.id, action, expected);
      if (res.ok) {
        setGame((g) => (!g || res.data.version >= g.version ? { ...(g ?? cur), version: res.data.version, state: res.data.state } : g));
        applyHand(res.data.hand, res.data.version);
        return true;
      }
      // Outdated view (e.g. a missed realtime update): refetch quietly so the next click works.
      await refetch();
      if (res.error !== STALE && !opts.silent) toast.error(res.error);
      return false;
    } catch {
      await refetch();
      if (!opts.silent) toast.error('Keine Verbindung zum Hof. Bitte nochmal versuchen.');
      return false;
    } finally {
      if (!opts.silent) setBusy(false);
    }
  }, [applyHand, optimistic, refetch]);

  const sendEmoji = useCallback((emoji: string) => {
    if (Date.now() - lastEmoji.current < 700) return;
    lastEmoji.current = Date.now();
    const payload: EmojiEvent = { id: crypto.randomUUID(), emoji, from: me };
    setEmojis((e) => [...e.slice(-15), payload]);
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload });
  }, [me]);

  // The first online human at the table drives bots and expired timers; others step in later as a fallback.
  const state = game?.state;
  const humansOnline = state?.players.filter((p) => !p.bot && !p.left && online.has(p.id)).map((p) => p.id) ?? [];
  const driverRank = humansOnline.indexOf(me);
  const bot = state ? botToMove(state) : null;
  const moveSeq = state?.moveSeq ?? -1;
  useEffect(() => {
    if (!bot || driverRank < 0) return;
    const delay = 850 + Math.random() * 600 + driverRank * 2500;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      void dispatch({ type: 'botMove' }, { move: true, silent: true }).then((okay) => {
        // A lost request must not freeze the table: nudge again while the bot is still on turn.
        if (!okay && gameRef.current?.state.moveSeq === moveSeq) retry = setTimeout(fire, 2500);
      });
    };
    const t = setTimeout(fire, delay);
    return () => {
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [bot, moveSeq, driverRank, dispatch]);

  const deadline = state?.deadline ? Date.parse(state.deadline) : null;
  const status = state?.status;
  useEffect(() => {
    if (!deadline || status !== 'playing' || driverRank < 0) return;
    const wait = deadline - (Date.now() + clockOffset) + 1200 + driverRank * 2000;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      void dispatch({ type: 'timeout' }, { move: true, silent: true }).then((okay) => {
        // The server may see the deadline a little later than we do: try again shortly.
        if (!okay && gameRef.current?.state.moveSeq === moveSeq) retry = setTimeout(fire, 2000);
      });
    };
    const t = setTimeout(fire, Math.max(0, wait));
    return () => {
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [deadline, moveSeq, status, driverRank, clockOffset, dispatch]);

  return { game, hand, profiles, decks, online, connected, emojis, kickNotice, busy, clockOffset, sendEmoji, dispatch, refetch };
}

export type UseGame = ReturnType<typeof useGame>;
