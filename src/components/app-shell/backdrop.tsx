/** Throne-room atmosphere behind every page: torch light, vignette and (on wide screens) hanging banners. */
function Banner({ side, color, trim }: { side: 'left' | 'right'; color: string; trim: string }) {
  return (
    <svg
      viewBox="0 0 120 420"
      className={`banner-sway absolute top-0 hidden h-[min(60vh,28rem)] w-auto min-[1600px]:block ${side === 'left' ? 'left-4 origin-top' : 'right-4 origin-top [animation-delay:-3s]'}`}
      aria-hidden
    >
      <rect x="4" y="6" width="112" height="10" rx="5" fill="#8a5a2e" />
      <circle cx="6" cy="11" r="7" fill="#f4b73a" /><circle cx="114" cy="11" r="7" fill="#f4b73a" />
      <path d="M14 16 H106 V380 L60 350 L14 380 Z" fill={color} />
      <path d="M14 16 H106 V380 L60 350 L14 380 Z" fill="none" stroke={trim} strokeWidth="4" />
      <path d="M24 16 V360 M96 16 V360" stroke={trim} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 6" />
      <g transform="translate(60 150)">
        <path d="M-30 18 L-32 -12 L-18 0 L-10 -22 L0 -4 L10 -22 L18 0 L32 -12 L30 18 Z" fill={trim} stroke="#3a2208" strokeWidth="2" strokeLinejoin="round" />
        <rect x="-31" y="16" width="62" height="10" rx="2" fill={trim} stroke="#3a2208" strokeWidth="2" />
        <circle cx="0" cy="21" r="3.5" fill="#c8323c" />
      </g>
      <path d="M40 230 H80 M46 246 H74" stroke={trim} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Torch light from the upper corners and a warm haze over the hall */}
      <div className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(255_170_80/0.22),transparent_65%)]" />
      <div className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(255_170_80/0.22),transparent_65%)]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgb(255_200_120/0.08),transparent)]" />
      {/* Stone floor fading into darkness */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgb(10_4_20/0.75),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgb(8_2_16/0.65)_100%)]" />
      <Banner side="left" color="#6b1e2e" trim="#f4b73a" />
      <Banner side="right" color="#1f3a7a" trim="#f4b73a" />
    </div>
  );
}
