import { ART_GROUPS, CardArt } from '@/components/deck/art';
import { cx } from '@/lib/cx';

/** Coats of arms are drawn from the heraldry, cosmos and treasure illustrations. */
export const CREST_IDS = ART_GROUPS.filter((g) => ['Heraldik', 'Kosmos', 'Schatzkammer'].includes(g.label)).flatMap((g) => g.ids);

const SIZES = { sm: 'size-12', md: 'size-20', lg: 'size-32' } as const;

/** A court's coat of arms: any card illustration on a velvet medallion. */
export function Crest({ id, size = 'md', className }: { id: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_40%_30%,var(--color-velvet-soft),var(--color-velvet-deep))] ring-4 ring-gold shadow-[0_6px_18px_rgba(0,0,0,.45)]', SIZES[size], className)}>
      <CardArt id={id} className="size-[82%]" />
    </span>
  );
}
