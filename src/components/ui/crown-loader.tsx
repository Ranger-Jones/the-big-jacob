import { CrownMark } from './logo';

export function CrownLoader({ label = 'Der Hof versammelt sich …' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-parchment/80">
      <CrownMark className="size-14 animate-bounce" />
      <p className="font-display text-2xl">{label}</p>
    </div>
  );
}
