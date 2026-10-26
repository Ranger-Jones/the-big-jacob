'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AvatarProfile } from '@/components/ui/avatar';
import type { UseGame } from '@/hooks/use-game';
import { feltById, type Felt } from '@/lib/cosmetics';
import { resolveDeck, type DeckEntry } from '@/lib/decks';
import type { Player, PublicState } from '@/lib/jakob/engine';
import { seatColor } from '@/lib/player-colors';

export interface TableApi {
  g: UseGame;
  state: PublicState;
  me: string;
  isHost: boolean;
  player: (id: string) => Player | undefined;
  /** Display name; "Du" for yourself when `you` is set. */
  nameOf: (id: string, you?: boolean) => string;
  avatarOf: (id: string) => AvatarProfile;
  deckOf: (id: string) => DeckEntry;
  colorOf: (id: string) => string;
  /** The viewer's chosen table felt. */
  felt: Felt;
}

const TableContext = createContext<TableApi | null>(null);

export function TableProvider({ g, me, felt, children }: { g: UseGame; me: string; felt?: string | null; children: ReactNode }) {
  const state = g.game!.state;
  const api = useMemo<TableApi>(() => {
    const byId = new Map(state.players.map((p, i) => [p.id, { p, i }]));
    const player = (id: string) => byId.get(id)?.p;
    return {
      g,
      state,
      me,
      isHost: state.hostId === me,
      player,
      nameOf: (id, you) => {
        if (you && id === me) return 'Du';
        const p = player(id);
        return p?.bot?.name ?? g.profiles[id]?.username ?? '…';
      },
      avatarOf: (id) => {
        const p = player(id);
        if (p?.bot) return { username: p.bot.name, avatar_url: null, emoji: p.bot.emoji };
        return g.profiles[id] ?? { username: '…', avatar_url: null };
      },
      deckOf: (id) => resolveDeck(player(id)?.deckId, g.decks),
      colorOf: (id) => seatColor(byId.get(id)?.i ?? 0),
      felt: feltById(felt),
    };
  }, [g, state, me, felt]);
  return <TableContext.Provider value={api}>{children}</TableContext.Provider>;
}

export function useTable(): TableApi {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable outside TableProvider');
  return ctx;
}
