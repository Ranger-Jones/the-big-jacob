/* eslint-disable @next/next/no-img-element */
import { cx } from '@/lib/cx';
import { nameColor } from '@/lib/player-colors';

export interface AvatarProfile { username: string; avatar_url: string | null; emoji?: string; avatar_frame?: string | null }

const SIZES = { xs: 'size-7 text-xs', sm: 'size-9 text-sm', md: 'size-12 text-base', lg: 'size-20 text-2xl', xl: 'size-28 text-4xl' };
const EMOJI_SIZES = { xs: 'text-base', sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl', xl: 'text-6xl' };

/** Decorative frame earned through achievements (see lib/cosmetics). */
function FrameDecor({ frame }: { frame: string }) {
  switch (frame) {
    case 'silber':
      return <span aria-hidden className="pointer-events-none absolute -inset-[3px] rounded-full border-[3px] border-[#d6dde3] shadow-[0_0_0_1px_#6f7882]" />;
    case 'gold':
      return <span aria-hidden className="pointer-events-none absolute -inset-[3px] rounded-full border-[3px] border-gold shadow-[0_0_10px_rgb(244_183_58/0.7)]" />;
    case 'krone':
      return (
        <>
          <span aria-hidden className="pointer-events-none absolute -inset-[3px] rounded-full border-[3px] border-gold" />
          <svg aria-hidden viewBox="0 0 40 24" className="pointer-events-none absolute -top-[38%] left-1/2 w-[70%] -translate-x-1/2 drop-shadow">
            <path d="M3 22 L2 6 L11 13 L20 2 L29 13 L38 6 L37 22 Z" fill="#f4b73a" stroke="#6b4508" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="20" cy="16" r="2.4" fill="#c8323c" />
          </svg>
        </>
      );
    case 'flamme':
      return <span aria-hidden className="frame-flame pointer-events-none absolute -inset-[4px] rounded-full" />;
    case 'lorbeer':
      return (
        <svg aria-hidden viewBox="-60 -60 120 120" className="pointer-events-none absolute -inset-[22%] size-[144%]">
          {[-1, 1].map((side) => (
            <g key={side} transform={`scale(${side} 1)`}>
              {[100, 122, 144, 166, 188, 210, 232].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x = 50 * Math.cos(rad);
                const y = -50 * Math.sin(rad);
                return <ellipse key={deg} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="5" ry="10" fill="#3f8a4a" stroke="#1c3b22" strokeWidth="1.2" transform={`rotate(${(90 - deg).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`} />;
              })}
            </g>
          ))}
        </svg>
      );
    default:
      return null;
  }
}

export function Avatar({
  profile, size = 'md', ring, className,
}: { profile: AvatarProfile | undefined; size?: keyof typeof SIZES; ring?: string; className?: string }) {
  const name = profile?.username ?? '?';
  const color = ring ?? nameColor(name);
  return (
    <span
      className={cx('relative inline-flex shrink-0 rounded-full font-display font-bold text-parchment', SIZES[size], className)}
      style={{ boxShadow: `0 0 0 3px ${ring ?? 'transparent'}` }}
      title={name}
    >
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: color }}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
        ) : profile?.emoji ? (
          <span aria-hidden className={EMOJI_SIZES[size]}>{profile.emoji}</span>
        ) : (
          <span aria-hidden>{name.slice(0, 2).toUpperCase()}</span>
        )}
      </span>
      {profile?.avatar_frame && <FrameDecor frame={profile.avatar_frame} />}
    </span>
  );
}
