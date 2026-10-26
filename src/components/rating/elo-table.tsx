import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { cx } from '@/lib/cx';
import { levelFromXp, PROVISIONAL_GAMES, tierFor } from '@/lib/jakob/rating';
import type { RatingRow } from '@/server/rating-service';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Elo leaderboard table (rendered inside the leaderboard card). */
export function EloTable({ rows, me }: { rows: RatingRow[]; me: string }) {
  if (rows.length === 0) {
    return <p className="p-6 text-ink-soft">Noch keine gewerteten Spiele. Spiel online oder mit Freunden – jede Partie zählt.</p>;
  }
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-sm text-ink-soft">
          <th scope="col" className="px-3 py-3 font-bold sm:px-5">Platz</th>
          <th scope="col" className="py-3 font-bold">Spieler</th>
          <th scope="col" className="py-3 text-right font-bold">Elo</th>
          <th scope="col" className="hidden py-3 text-right font-bold sm:table-cell">Rang</th>
          <th scope="col" className="px-3 py-3 text-right font-bold sm:px-0">Lv</th>
          <th scope="col" className="hidden px-5 py-3 text-right font-bold sm:table-cell">Spiele</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const tier = tierFor(r.rating);
          return (
            <tr key={r.user_id} className={cx('border-t border-line', r.user_id === me && 'bg-gold/20')}>
              <td className="tabular px-3 py-3 font-display text-2xl font-bold sm:px-5">{i < 3 ? MEDALS[i] : i + 1}</td>
              <td className="py-3">
                <Link href={`/profil/${r.username}`} className="flex min-w-0 items-center gap-2 font-bold hover:underline sm:gap-3">
                  <Avatar profile={r} size="sm" />
                  <span className="truncate">{r.username}</span>
                </Link>
              </td>
              <td className="tabular py-3 text-right font-display text-xl font-bold" title={`Bestwert ${r.peak_rating}`}>
                {r.rating}{r.rated_games < PROVISIONAL_GAMES ? '?' : ''}
              </td>
              <td className="hidden py-3 text-right sm:table-cell"><span aria-hidden>{tier.emoji}</span> {tier.name}</td>
              <td className="tabular px-3 py-3 text-right sm:px-0">{levelFromXp(r.xp)}</td>
              <td className="tabular hidden px-5 py-3 text-right sm:table-cell">{r.rated_games}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
