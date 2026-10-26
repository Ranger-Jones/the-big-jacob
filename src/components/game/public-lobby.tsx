'use client';
import { useNow } from '@/hooks/use-now';
import { PUBLIC_FILL_THRESHOLD, PUBLIC_FILL_TO, PUBLIC_MAX_HUMANS, PUBLIC_WAIT_SECONDS } from '@/lib/jakob/types';
import { useTable } from './table-context';

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Countdown and fill-up rule of the open online lobby. */
export function PublicLobbyBanner() {
  const { g, state } = useTable();
  const now = useNow(g.clockOffset, true, 500);
  const humans = state.players.filter((p) => !p.bot).length;
  const startAt = state.autoStartAt ? Date.parse(state.autoStartAt) : now;
  const left = startAt - now;
  const fraction = Math.min(1, Math.max(0, left / (PUBLIC_WAIT_SECONDS * 1000)));
  const willFill = humans <= PUBLIC_FILL_THRESHOLD;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-velvet p-4 text-parchment ring-2 ring-gold/40">
      <span
        className="relative flex size-20 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(var(--color-gold) ${fraction * 360}deg, rgb(255 255 255 / 0.12) 0)` }}
        aria-hidden
      >
        <span className="flex size-[4.1rem] items-center justify-center rounded-full bg-velvet-deep font-display text-2xl font-bold text-gold-soft tabular">
          {left > 0 ? clock(left) : '…'}
        </span>
      </span>
      <span className="min-w-0" aria-live="polite">
        <span className="block font-display text-2xl font-bold text-gold-soft">
          {humans} von {PUBLIC_MAX_HUMANS} Spielern da
        </span>
        <span className="block text-sm text-parchment/80">
          {left <= 0
            ? 'Die Karten werden gemischt …'
            : willFill
              ? `Kommen bis dahin nicht mehr als ${PUBLIC_FILL_THRESHOLD}, füllen Bots auf ${PUBLIC_FILL_TO} Plätze auf.`
              : 'Genug Mitspieler – es geht ohne Bots los, sobald die Zeit um ist oder der Tisch voll ist.'}
        </span>
      </span>
    </div>
  );
}

/** Fixed rules of the open lobby, shown instead of the host's settings. */
export function PublicRules() {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li>⚖️ <b>Gewertet:</b> Elo und Erfahrung für alle Plätze.</li>
      <li>🔁 <b>5 Runden</b>, ⏳ <b>30 Sekunden</b> Zugzeit.</li>
      <li>💰 Normale Steuern, ✊ Revolution an, 🧠 Kartengedächtnis an.</li>
      <li>🤖 Bots: <b>Einfach</b> und <b>Gerissen</b> füllen leere Plätze, wenn wenige da sind.</li>
      <li>🚪 Wer mitten im Spiel geht, landet auf dem letzten Platz – auch in der Wertung.</li>
      <li>🛡️ Niemand kann hier rausgeworfen werden.</li>
    </ul>
  );
}
