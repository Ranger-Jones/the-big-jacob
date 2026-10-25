'use client';
import { cx } from '@/lib/cx';

export function Segmented<T extends string | number | null>({
  value, options, onChange, label, disabled,
}: { value: T; options: { value: T; label: string }[]; onChange?: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="font-bold">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-parchment-dark/70 p-1 ring-2 ring-inset ring-line">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            disabled={disabled}
            onClick={() => onChange?.(o.value)}
            className={cx(
              'min-h-9 flex-1 rounded-xl px-2.5 text-sm font-bold transition-colors',
              o.value === value ? 'bg-wine text-parchment shadow-[0_2px_0_var(--color-wine-deep)]' : 'text-ink-soft hover:bg-white/50',
              disabled && 'cursor-default',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
