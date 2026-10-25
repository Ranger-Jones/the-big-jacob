'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeckFan } from '@/components/deck/deck-fan';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cx } from '@/lib/cx';
import { PRESETS, resolveDeck, type DeckEntry } from '@/lib/decks';
import { MAX_PLAYERS } from '@/lib/jakob/types';
import { inviteAction } from '@/server/game-actions';
import type { ProfileLite } from '@/server/social-service';
import { SettingsPanel } from './settings-panel';
import { useTable } from './table-context';

export function Lobby({ friends, myDecks }: { friends: ProfileLite[]; myDecks: DeckEntry[] }) {
  const router = useRouter();
  const { g, state, me, isHost, nameOf, avatarOf, deckOf, colorOf } = useTable();
  const game = g.game!;
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inGame = new Set(state.players.map((p) => p.id));
  const invitable = friends.filter((f) => !inGame.has(f.id));
  const full = state.players.length >= MAX_PLAYERS;
  const myDeckId = state.players.find((p) => p.id === me)?.deckId ?? null;
  const myDeck = resolveDeck(myDeckId, { ...g.decks, ...Object.fromEntries(myDecks.map((d) => [d.id, d])) });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/spiel/${game.code}`);
      toast.success('Link kopiert. Schick ihn deinen Freunden.');
    } catch {
      toast(`Code: ${game.code}`);
    }
  }

  async function invite(friend: ProfileLite) {
    const res = await inviteAction(game.id, friend.id);
    if (res.ok) {
      setInvited((s) => new Set(s).add(friend.id));
      toast.success(`Einladung an ${friend.username} gesendet`);
    } else toast.error(res.error);
  }

  async function leave() {
    if (await g.dispatch({ type: 'leave' })) router.push('/');
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-5 px-4 pb-12 lg:grid-cols-[1.35fr_1fr]">
      <Card className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold">Der Tisch wird gedeckt</h1>
            <p className="mt-1 text-ink-soft">Mit diesem Code kommen deine Freunde an den Hof.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copyLink}>Link kopieren</Button>
        </div>

        <div className="flex gap-1.5 sm:gap-2" aria-label={`Raum-Code ${game.code.split('').join(' ')}`}>
          {game.code.split('').map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-wine font-display text-4xl font-bold text-gold-soft shadow-[0_4px_0_var(--color-wine-deep)] sm:h-16 sm:text-5xl"
              style={{ rotate: `${i % 2 ? 2 : -2}deg` }}
            >
              {ch}
            </span>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: MAX_PLAYERS }, (_, seat) => {
            const p = state.players[seat];
            if (!p) {
              return (
                <li key={`free-${seat}`} className="flex min-h-[4.5rem] items-center justify-center rounded-2xl border-2 border-dashed border-line p-3 text-sm font-bold text-ink-soft/60">
                  freier Platz
                </li>
              );
            }
            const deck = deckOf(p.id);
            return (
              <li key={p.id} className="relative flex items-center gap-2.5 rounded-2xl bg-parchment-dark/70 p-2.5 ring-2 ring-line">
                <span className="relative">
                  <Avatar profile={avatarOf(p.id)} ring={colorOf(p.id)} size="md" />
                  {!p.bot && (
                    <span
                      className={cx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-parchment', g.online.has(p.id) ? 'bg-vert' : 'bg-ink-soft/40')}
                      title={g.online.has(p.id) ? 'online' : 'offline'}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold leading-tight">{nameOf(p.id)}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {p.id === state.hostId ? '👑 Host' : p.bot ? (p.bot.level === 'sly' ? '🦊 Gerissener Bot' : '🙂 Einfacher Bot') : p.id === me ? 'Du' : 'Höfling'}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">🎴 {deck.name}</span>
                </span>
                {isHost && p.id !== me && (
                  <button
                    type="button"
                    aria-label={`${nameOf(p.id)} entfernen`}
                    onClick={() => (p.bot ? void g.dispatch({ type: 'removePlayer', playerId: p.id }, { versioned: true }) : setRemoving(p.id))}
                    className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full text-lg leading-none text-ink-soft hover:bg-white/60 hover:text-wax"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {isHost && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink-soft">Bot an den Tisch holen:</span>
            <Button size="sm" variant="secondary" disabled={full} onClick={() => g.dispatch({ type: 'addBot', level: 'easy' })}>🙂 Einfach</Button>
            <Button size="sm" variant="secondary" disabled={full} onClick={() => g.dispatch({ type: 'addBot', level: 'sly' })}>🦊 Gerissen</Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line pt-5">
          {isHost ? (
            <Button size="lg" onClick={() => g.dispatch({ type: 'start' }, { versioned: true })} disabled={g.busy || state.players.length < 2}>
              Spiel starten
            </Button>
          ) : (
            <p className="font-bold text-ink-soft">Warte auf den Host …</p>
          )}
          <Button variant="secondary" className="lg:hidden" onClick={() => setSettingsOpen(true)}>Regeln & Kniffe</Button>
          <Button variant="ghost" onClick={leave}>Tisch verlassen</Button>
          {state.players.length < 4 && <p className="w-full text-sm text-ink-soft">Ab 4 Spielern wird es richtig höfisch – fehlende Plätze kannst du mit Bots füllen.</p>}
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Dein Deck</h2>
          <div className="flex items-center gap-4">
            <DeckFan deck={myDeck} size="sm" className="pl-2" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label htmlFor="deck-select" className="text-sm font-bold text-ink-soft">Mit diesem Deck spielst du</label>
              <select
                id="deck-select"
                value={myDeckId ?? PRESETS[0].id}
                onChange={(e) => g.dispatch({ type: 'setDeck', deckId: e.target.value })}
                className="h-11 w-full rounded-xl bg-parchment-dark/70 px-3 font-bold text-ink ring-2 ring-inset ring-line outline-none focus:ring-gold-deep"
              >
                <optgroup label="Vorlagen">
                  {PRESETS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
                {myDecks.length > 0 && (
                  <optgroup label="Meine Decks">
                    {myDecks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )}
              </select>
              <Link href="/decks" className="text-sm font-bold text-wine hover:underline">Eigenes Deck gestalten</Link>
            </div>
          </div>
          <p className="text-sm text-ink-soft">Alle sehen deine gelegten Karten in deinem Deck.</p>
        </Card>

        <Card className="hidden flex-col gap-2 lg:flex">
          <h2 className="text-3xl font-bold">Regeln & Kniffe</h2>
          <SettingsPanel />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Freunde einladen</h2>
          {friends.length === 0 ? (
            <p className="text-ink-soft">
              Du hast noch keine Freunde hinzugefügt. <Link href="/freunde" className="font-bold text-wine hover:underline">Freunde finden</Link>
            </p>
          ) : invitable.length === 0 ? (
            <p className="text-ink-soft">Alle deine Freunde sitzen schon am Tisch.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invitable.map((f) => (
                <li key={f.id} className="flex items-center gap-3">
                  <Avatar profile={f} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-bold">{f.username}</span>
                  <Button size="sm" variant="secondary" disabled={invited.has(f.id) || full} onClick={() => invite(f)}>
                    {invited.has(f.id) ? 'Eingeladen' : 'Einladen'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Regeln & Kniffe" wide>
        <div className="max-h-[60dvh] overflow-y-auto pr-1"><SettingsPanel /></div>
        <Button onClick={() => setSettingsOpen(false)}>Fertig</Button>
      </Modal>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title={`${nameOf(removing ?? '')} entfernen?`}>
        <p className="text-ink-soft">Wer entfernt wird, kann diesem Tisch nicht wieder beitreten.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Abbrechen</Button>
          <Button
            variant="danger"
            onClick={async () => {
              const id = removing;
              setRemoving(null);
              if (id) await g.dispatch({ type: 'removePlayer', playerId: id }, { versioned: true });
            }}
          >
            Entfernen
          </Button>
        </div>
      </Modal>
    </main>
  );
}
