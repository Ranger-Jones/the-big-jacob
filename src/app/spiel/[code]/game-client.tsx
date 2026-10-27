'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChatPanel } from '@/components/game/chat';
import { ConnectionBanner } from '@/components/game/connection-banner';
import { EmojiBar } from '@/components/game/emoji-bar';
import { EmojiLayer } from '@/components/game/emoji-layer';
import { GameBoard } from '@/components/game/game-board';
import { Lobby } from '@/components/game/lobby';
import { Results } from '@/components/game/results';
import { TableProvider } from '@/components/game/table-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useChat, type ChatMessage } from '@/hooks/use-chat';
import { useGame } from '@/hooks/use-game';
import { fireConfetti } from '@/lib/confetti';
import type { DeckEntry } from '@/lib/decks';
import { useT } from '@/lib/i18n/client';
import { getSettings, type PrivateHand, type PublicState } from '@/lib/jakob/engine';
import { describeCards } from '@/lib/jakob/texts';
import { playSound } from '@/lib/sound';
import type { GameView } from '@/server/game-service';
import type { ProfileLite } from '@/server/social-service';
import { Icon } from '@/components/ui/icons';

interface Props {
  initial: GameView;
  initialHand: PrivateHand;
  initialProfiles: Record<string, ProfileLite>;
  initialDecks: Record<string, DeckEntry>;
  me: string;
  friends: ProfileLite[];
  myDecks: DeckEntry[];
  quickEmojis: string[];
  serverNow: number;
  felt?: string | null;
}

/** Sounds, toasts and confetti for what just happened at the table. */
function useTableEffects(state: PublicState | undefined, me: string, name: (id: string) => string, received: number[]) {
  const t = useT();
  const prev = useRef<PublicState | undefined>(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!before || !state) return;
    if (state.trick && state.trick.seq !== before.trick?.seq && state.trick.by !== me) playSound('card');
    if (!state.trick && before.trick && state.round === before.round && state.phase === 'play') playSound('clear');
    if (state.phase === 'play' && state.turn === me && before.turn !== me) {
      playSound('turn');
      navigator.vibrate?.(30);
    }
    if (state.passed.length > before.passed.length && state.passed.at(-1) !== me) playSound('pass');
    if (state.revolution && !before.revolution) {
      playSound('revolution');
      void fireConfetti('revolution');
    }
    if (state.round !== before.round || (state.phase === 'court' && before.phase === 'draw')) playSound('deal');
    const lastBefore = before.history.at(-1)?.round;
    const last = state.history.at(-1);
    if (last && last.round !== lastBefore) {
      if (last.finish[0] === me) {
        playSound('crown');
        void fireConfetti('crown');
        toast.success(t('Du bist der neue Große Jakob!'), { icon: <Icon name="crown" className="size-5 text-gold-deep" /> });
      } else toast(t('{name} ist der neue Große Jakob', { name: name(last.finish[0]) }), { icon: <Icon name="crown" className="size-5 text-gold-deep" /> });
    }
    // Special plays: the table shows a burst, here we add the sound.
    const known = new Set(before.log.map((e) => `${e.kind}-${e.seq}`));
    for (const e of state.log.slice(-3)) {
      if (known.has(`${e.kind}-${e.seq}`)) continue;
      if (e.kind === 'snap') playSound('snap');
      else if (e.kind === 'bomb') playSound('bomb');
      else if (e.kind === 'unbeatable') playSound('crown');
      else if (e.kind === 'mission' && e.by === me) {
        playSound('crown');
        void fireConfetti('crown');
        toast.success(t('Mission erfüllt! +3 Punkte'), { icon: <Icon name="target" className="size-5 text-gold-deep" /> });
      } else if (e.kind === 'throne') void fireConfetti('win');
    }
    if (before.phase === 'tax' && state.phase === 'play' && received.length > 0 && before.tax.some((x) => x.from === me)) {
      toast(t('Du hast {cards} zurückbekommen.', { cards: describeCards(received, t) }));
    }
  }, [state, me, name, received, t]);
}

/** Pest / court swap: tell me what I passed on and what I got (arrives with my hand). */
function useSwapNotice(hand: PrivateHand & { version: number }, phase: PublicState['phase'], round: number) {
  const t = useT();
  const shown = useRef<string>('');
  useEffect(() => {
    if (phase !== 'play' || !hand.swapGot?.length || !hand.swapGave?.length) return;
    const key = `${round}`;
    if (shown.current === key) return;
    shown.current = key;
    toast(t('Weitergereicht: {gave} – bekommen: {got}', { gave: describeCards(hand.swapGave, t), got: describeCards(hand.swapGot, t) }), { icon: <Icon name="swap" className="size-5 text-gold-deep" /> });
  }, [hand, phase, round, t]);
}

export function GameClient(props: Props) {
  const { initial, initialHand, initialProfiles, initialDecks, me, friends, myDecks, quickEmojis, serverNow, felt } = props;
  const router = useRouter();
  const t = useT();
  const g = useGame({ initial, initialHand, initialProfiles, initialDecks: { ...initialDecks, ...Object.fromEntries(myDecks.map((d) => [d.id, d])) }, me, serverNow });
  const { game } = g;
  const amActive = !!game?.state.players.some((p) => p.id === me && !p.left);
  const removed = !!game && game.state.status !== 'finished' && !amActive;
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatEnabled = !!game && getSettings(game.state).chat;

  const nameOf = useCallback((id: string) => {
    const bot = game?.state.players.find((p) => p.id === id)?.bot;
    return (bot ? t(bot.name) : g.profiles[id]?.username) ?? '…';
  }, [game?.state.players, g.profiles, t]);

  const onIncoming = useCallback((m: ChatMessage) => {
    playSound('chat');
    if (!chatOpen && !window.matchMedia('(min-width: 1024px)').matches) {
      setUnread((n) => n + 1);
      toast(`${nameOf(m.user_id)}: ${m.body.slice(0, 80)}`, { duration: 2500 });
    }
  }, [chatOpen, nameOf]);
  const chat = useChat(initial.id, me, chatEnabled, onIncoming);

  useTableEffects(game?.state, me, nameOf, g.hand.received);
  useSwapNotice(g.hand, game?.state.phase ?? null, game?.state.round ?? 0);

  // Back at the table after a bot stood in: take over again.
  const onAutopilot = !!game?.state.players.find((p) => p.id === me)?.autopilot;
  const { dispatch, connected } = g;
  useEffect(() => {
    if (onAutopilot && connected) {
      void dispatch({ type: 'resume' }, { silent: true }).then((ok) => { if (ok) toast(t('Willkommen zurück – du spielst wieder selbst.'), { icon: <Icon name="sparkles" className="size-5 text-gold-deep" /> }); });
    }
  }, [onAutopilot, connected, dispatch, t]);

  useEffect(() => {
    if (!game) {
      toast(g.kickNotice ? t('Der Host hat dich vom Tisch entfernt.') : t('Der Tisch wurde aufgelöst.'));
      router.replace('/');
    } else if (removed) {
      toast(g.kickNotice ? t('Der Host hat dich vom Tisch entfernt.') : t('Du sitzt nicht mehr an diesem Tisch.'));
      router.replace('/');
    }
  }, [game, removed, router, g.kickNotice, t]);

  if (!game || removed) return null;

  const chatPanel = chatEnabled ? (
    <Card className="flex max-h-[min(70dvh,36rem)] flex-col gap-2 p-4">
      <h2 className="text-2xl font-bold">{t('Hofgeflüster-Chat')}</h2>
      <ChatPanel messages={chat.messages} onSend={chat.send} className="flex-1" />
    </Card>
  ) : null;

  const chatButton = chatEnabled ? (
    <Button
      variant="velvet"
      size="sm"
      className="relative lg:hidden"
      onClick={() => { setChatOpen(true); setUnread(0); }}
      aria-label={unread ? (unread === 1 ? t('Chat, 1 neue Nachricht') : t('Chat, {count} neue Nachrichten', { count: unread })) : t('Chat')}
    >
      <Icon name="chat" className="size-5" />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-wax text-xs font-bold">{unread}</span>}
    </Button>
  ) : null;

  const emojiBar = <EmojiBar onSend={g.sendEmoji} initialQuick={quickEmojis} />;

  return (
    <TableProvider g={g} me={me} felt={felt}>
      <ConnectionBanner connected={g.connected} />
      {game.state.status === 'lobby' && (
        <>
          <Lobby friends={friends} myDecks={myDecks} />
          {chatEnabled && (
            <div className="mx-auto w-full max-w-6xl px-4 pb-10">{chatPanel}</div>
          )}
        </>
      )}
      {game.state.status === 'playing' && <GameBoard emojiBar={emojiBar} chat={chatPanel} chatButton={chatButton} />}
      {game.state.status === 'finished' && (
        <>
          <Results />
          {chatEnabled && <div className="mx-auto w-full max-w-4xl px-4 pb-10">{chatPanel}</div>}
        </>
      )}
      <EmojiLayer emojis={g.emojis} />
      <Modal open={chatOpen} onClose={() => setChatOpen(false)} title={t('Chat')} wide>
        <ChatPanel messages={chat.messages} onSend={chat.send} className="h-[55dvh]" />
        <Button variant="secondary" onClick={() => setChatOpen(false)}>{t('Schließen')}</Button>
      </Modal>
    </TableProvider>
  );
}
