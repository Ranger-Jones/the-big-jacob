'use client';
import { cx } from '@/lib/cx';

export function Switch({
  checked, onChange, label, hint, disabled,
}: { checked: boolean; onChange?: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex items-start justify-between gap-3 py-2', disabled ? 'cursor-default' : 'cursor-pointer')}>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm leading-snug text-ink-soft">{hint}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-label={label}
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="block h-7 w-12 rounded-full bg-ink-soft/30 ring-2 ring-inset ring-line transition-colors peer-checked:bg-vert peer-checked:ring-vert peer-focus-visible:outline-3 peer-focus-visible:outline-gold peer-disabled:opacity-60" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-parchment shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
