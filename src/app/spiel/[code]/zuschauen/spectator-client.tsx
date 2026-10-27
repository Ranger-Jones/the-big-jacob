'use client';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChatPanel } from '@/components/game/chat';
import { ConnectionBanner } from '@/components/game/connection-banner';
import { EmojiBar } from '@/components/game/emoji-bar';
import { EmojiLayer } from '@/components/game/emoji-layer';
import { RankLadder, TeamScore } from '@/components/game/phases';
import { Seats } from '@/components/game/seats';
import { TableProvider, useTable } from '@/components/game/table-context';
import { TrickArea } from '@/components/game/trick-area';
import { useChat } from '@/hooks/use-chat';
import { useGame } from '@/hooks/use-game';
import type { DeckEntry } from '@/lib/decks';
import { useT } from '@/lib/i18n/client';
import { getSettings } from '@/lib/jakob/engine';
import { EVENT_TEXT } from '@/lib/jakob/texts';
import type { GameView } from '@/server/game-service';
import type { ProfileLite } from '@/server/social-service';
import { EVENT_ICONS, Icon } from '@/components/ui/icons';

interface Props {
  initial: GameView;
  initialProfiles: Record<string, ProfileLite>;
  initialDecks: Record<string, DeckEntry>;
  me: string;
  quickEmojis: string[];
  serverNow: number;
  felt?: string | null;
}

function Phase() {
  const t = useT();
  const { state, nameOf } = useTable();
  const present = state.order.filter((id) => !state.players.find((p) => p.id === id)?.left);
  if (state.phase === 'play') return <TrickArea />;
  const last = state.history.at(-1);
  return (
    <Card className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <h2 className="text-3xl font-bold">
        {state.phase === 'draw' ? t('Die Ränge werden ausgelost …')
          : state.phase === 'court' ? t('Hofzeremonie · Runde {round}', { round: state.round })
            : state.phase === 'tax' ? t('Steuern werden gezahlt …')
              : state.phase === 'roundEnd' ? t('Runde {round} ist vorbei', { round: last?.round ?? '' }) : t('Gleich geht es los')}
      </h2>
      {state.event && <p className="text-sm"><b><Icon name={EVENT_ICONS[state.event] ?? 'sparkles'} /> {t(EVENT_TEXT[state.event].title)}:</b> {t(EVENT_TEXT[state.event].text)}</p>}
      {state.revolution && <p className="font-bold text-wax"><Icon name={state.revolution.grand ? 'flame' : 'fist'} /> {state.revolution.grand ? t('Große Revolution von {name}!', { name: nameOf(state.revolution.by) }) : t('Revolution von {name}!', { name: nameOf(state.revolution.by) })}</p>}
      {state.teams && <TeamScore />}
      <RankLadder order={state.phase === 'roundEnd' && last ? last.finish : present} />
    </Card>
  );
}

export function SpectatorClient(props: Props) {
  const { initial, initialProfiles, initialDecks, me, quickEmojis, serverNow, felt } = props;
  const t = useT();
  const g = useGame({ initial, initialHand: { cards: [], received: [], gave: [] }, initialProfiles, initialDecks, me, serverNow });
  const chat = useChat(initial.id, me, !!g.game && getSettings(g.game.state).chat);
  if (!g.game) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="flex max-w-sm flex-col gap-3 p-7">
          <h1 className="text-4xl font-bold">{t('Der Tisch ist leer')}</h1>
          <p className="text-ink-soft">{t('Dieses Spiel gibt es nicht mehr.')}</p>
          <Link href="/" className={buttonClass('primary')}>{t('Zur Startseite')}</Link>
        </Card>
      </main>
    );
  }
  const finished = g.game.state.status === 'finished';
  return (
    <TableProvider g={g} me={me} felt={felt}>
      <ConnectionBanner connected={g.connected} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-4 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-2xl text-gold-soft"><Icon name="eye" /> {t('Du schaust zu · Runde {round}', { round: g.game.state.round })}</p>
            <Link href="/" className={buttonClass('ghost', 'sm')}>{t('Zurück')}</Link>
          </div>
          <Seats timer={null} />
          {finished ? (
            <Card className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-3xl font-bold">{t('Das Spiel ist vorbei')}</h2>
              <Link href={`/spiel/${g.game.code}/wiederholung`} className={buttonClass('primary')}><Icon name="film" /> {t('Wiederholung ansehen')}</Link>
            </Card>
          ) : <Phase />}
          <p className="text-center text-sm text-parchment/70">{t('Die Karten der Spieler bleiben für Zuschauer verdeckt. Reaktionen sehen alle.')}</p>
          <div className="flex justify-center"><EmojiBar onSend={g.sendEmoji} initialQuick={quickEmojis} /></div>
        </div>
        {getSettings(g.game.state).chat && (
          <Card className="flex max-h-[min(70dvh,36rem)] flex-col gap-2 p-4">
            <h2 className="text-2xl font-bold">{t('Chat am Tisch')}</h2>
            <ChatPanel messages={chat.messages} onSend={async () => false} className="flex-1" readOnly />
          </Card>
        )}
      </main>
      <EmojiLayer emojis={g.emojis} />
    </TableProvider>
  );
}
