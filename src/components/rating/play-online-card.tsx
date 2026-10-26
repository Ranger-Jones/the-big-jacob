import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { levelProgress, levelTitle, PROVISIONAL_GAMES, tierFor } from '@/lib/jakob/rating';
import { PUBLIC_FILL_THRESHOLD, PUBLIC_FILL_TO, PUBLIC_WAIT_SECONDS } from '@/lib/jakob/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { playOnlineAction } from '@/server/game-actions';
import { publicLobbyStats } from '@/server/matchmaking-service';
import { getRatingSummary } from '@/server/rating-service';

/** Dashboard: Elo, level and the button into the open online lobby. */
export async function PlayOnlineCard({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const [summary, lobby] = await Promise.all([getRatingSummary(admin, userId), publicLobbyStats(admin)]);
  if (!summary) return null;
  const tier = tierFor(summary.rating);
  const level = levelProgress(summary.xp);
  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden p-6 ring-gold shadow-[0_6px_0_var(--color-gold-deep)] sm:flex-row sm:items-center">
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-10 text-[9rem] opacity-[0.07]">🌍</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-4xl font-bold">Online spielen</h2>
        <p className="text-ink-soft">
          Ab in die offene Lobby – gegen Spieler aus dem ganzen Hof, gewertet mit Elo. Nach {PUBLIC_WAIT_SECONDS / 60} Minuten geht es los;
          sind bis dahin höchstens {PUBLIC_FILL_THRESHOLD} da, füllen Bots auf {PUBLIC_FILL_TO} Plätze auf.
        </p>
        <p className="text-sm font-bold text-ink-soft">
          {lobby.waiting > 0 ? `🟢 ${lobby.waiting} ${lobby.waiting === 1 ? 'Spieler wartet' : 'Spieler warten'} gerade` : 'Gerade wartet niemand – eröffne die Lobby!'}
          {lobby.playing > 0 && ` · ${lobby.playing} ${lobby.playing === 1 ? 'Tisch läuft' : 'Tische laufen'}`}
        </p>
        <form action={playOnlineAction} className="mt-1">
          <Button type="submit" size="lg">🌍 Lobby suchen</Button>
        </form>
      </div>
      <div className="flex shrink-0 flex-col gap-2 rounded-2xl bg-parchment-dark/70 p-4 ring-2 ring-line sm:w-64">
        <span className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>{tier.emoji}</span>
          <span>
            <span className="block font-display text-3xl font-bold leading-none tabular">
              {summary.rating}{summary.ratedGames < PROVISIONAL_GAMES ? '?' : ''}
            </span>
            <span className="text-sm font-bold text-ink-soft">{tier.name} · Elo</span>
          </span>
        </span>
        <span className="text-sm font-bold">Level {level.level} · {levelTitle(level.level)}</span>
        <span className="relative h-2.5 overflow-hidden rounded-full bg-ink-soft/20" aria-label={`${level.current} von ${level.needed} XP`}>
          <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${level.fraction * 100}%` }} />
        </span>
        <span className="text-xs text-ink-soft">{level.current} / {level.needed} XP bis Level {level.level + 1}</span>
      </div>
    </Card>
  );
}
