'use client';
import { ART_GROUPS, CardArt } from '@/components/deck/art';
import { cx } from '@/lib/cx';

/** Coats of arms are drawn from the heraldry, cosmos and treasure illustrations. */
export const CREST_IDS = ART_GROUPS.filter((g) => ['Heraldik', 'Kosmos', 'Schatzkammer'].includes(g.label)).flatMap((g) => g.ids);

export function CrestPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Wappen" className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl bg-parchment-dark/50 p-2 sm:grid-cols-8">
      {CREST_IDS.map((id) => (
        <button
          key={id} type="button" role="radio" aria-checked={value === id} aria-label={id}
          onClick={() => onChange(id)}
          className={cx('aspect-square rounded-xl bg-velvet-deep p-1 transition-transform', value === id ? 'scale-105 ring-4 ring-gold' : 'opacity-75 hover:opacity-100')}
        >
          <CardArt id={id} className="size-full" />
        </button>
      ))}
    </div>
  );
}
