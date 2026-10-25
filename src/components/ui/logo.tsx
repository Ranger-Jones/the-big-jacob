import { cx } from '@/lib/cx';

export function CrownMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="crown-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe6a3" />
          <stop offset="0.55" stopColor="#f4b73a" />
          <stop offset="1" stopColor="#b07a12" />
        </linearGradient>
      </defs>
      <path d="M4 14l10 9 10-17 10 17 10-9-4 22H8z" fill="url(#crown-gold)" stroke="#6b4508" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="8" y="32" width="32" height="5" rx="1.5" fill="#b07a12" />
      <circle cx="4" cy="12" r="3" fill="#c8323c" />
      <circle cx="24" cy="5" r="3.4" fill="#3a6fd8" />
      <circle cx="44" cy="12" r="3" fill="#c8323c" />
      <circle cx="24" cy="26" r="2.6" fill="#fbf0d9" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-display text-2xl font-bold leading-none tracking-wide', className)}>
      <CrownMark className="size-9 -rotate-6 drop-shadow-[0_2px_0_rgb(0_0_0/0.4)]" />
      <span className="gold-text">{compact ? 'Jakob' : 'Der Große Jakob'}</span>
    </span>
  );
}
