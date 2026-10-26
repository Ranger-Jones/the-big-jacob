import type { Season } from '@/lib/season';

/** Deterministic pseudo-random numbers so server and client render the same decoration. */
function spread(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Falling({ count, render, duration }: { count: number; render: (i: number) => React.ReactNode; duration: [number, number] }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="season-fall absolute -top-8"
          style={{
            left: `${spread(i, 1) * 100}%`,
            animationDuration: `${duration[0] + spread(i, 2) * (duration[1] - duration[0])}s`,
            animationDelay: `${-spread(i, 3) * duration[1]}s`,
            ['--drift' as string]: `${(spread(i, 4) - 0.5) * 120}px`,
          }}
        >
          {render(i)}
        </span>
      ))}
    </>
  );
}

function Snow() {
  return <Falling count={45} duration={[9, 18]} render={(i) => <span className="block rounded-full bg-white/80" style={{ width: 3 + spread(i, 5) * 4, height: 3 + spread(i, 5) * 4, filter: 'blur(0.5px)' }} />} />;
}

function Petals() {
  return (
    <Falling count={22} duration={[10, 20]} render={(i) => (
      <svg width="14" height="10" viewBox="0 0 14 10" style={{ transform: `rotate(${spread(i, 6) * 360}deg)` }}>
        <ellipse cx="7" cy="5" rx="6" ry="3.5" fill={i % 3 ? '#f7b5cf' : '#fde2ec'} opacity="0.85" />
      </svg>
    )} />
  );
}

function Fireflies() {
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="season-float absolute size-1.5 rounded-full bg-[#fff3a0] shadow-[0_0_10px_4px_rgb(255_235_120/0.6)]"
          style={{ left: `${spread(i, 7) * 100}%`, top: `${30 + spread(i, 8) * 65}%`, animationDelay: `${-spread(i, 9) * 8}s`, animationDuration: `${6 + spread(i, 10) * 6}s` }}
        />
      ))}
    </>
  );
}

function Garland() {
  const bulbs = 18;
  return (
    <svg className="absolute inset-x-0 top-0 h-10 w-full" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
      <path d="M0 6 Q 55 30 111 6 T 222 6 T 333 6 T 444 6 T 555 6 T 666 6 T 777 6 T 888 6 T 1000 6" fill="none" stroke="#2f6b3a" strokeWidth="3" />
      {Array.from({ length: bulbs }, (_, i) => {
        const x = 28 + (i * 944) / (bulbs - 1);
        const y = 6 + 14 * Math.abs(Math.sin(((x / 111) * Math.PI)));
        return <circle key={i} cx={x} cy={y + 6} r="5" className="season-blink" style={{ animationDelay: `${(i % 4) * 0.4}s` }} fill={['#c8323c', '#f4b73a', '#3a6fd8', '#2f9e62'][i % 4]} />;
      })}
    </svg>
  );
}

/** Muted autumn leaves in rust and old gold – quiet enough to sit behind the game. */
const LEAF_COLORS = ['#a8461f', '#c9822c', '#8a3a24', '#b8892f'];

function Leaves() {
  return (
    <Falling count={16} duration={[14, 26]} render={(i) => (
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: `rotate(${spread(i, 11) * 360}deg)`, opacity: 0.35 + spread(i, 12) * 0.3 }}>
        <path d="M8 1 C11 4 14 6 14 9 C14 12 11 15 8 15 C5 15 2 12 2 9 C2 6 5 4 8 1 Z" fill={LEAF_COLORS[i % LEAF_COLORS.length]} />
        <path d="M8 3 V14" stroke="rgb(0 0 0 / 0.25)" strokeWidth="0.8" />
      </svg>
    )} />
  );
}

function Halloween() {
  return (
    <>
      <Leaves />
      {[0, 1].map((i) => (
        <svg
          key={i}
          className="season-bat absolute h-5 w-8 text-black/45"
          style={{ top: `${10 + i * 16}%`, animationDelay: `${-i * 9}s`, animationDuration: `${24 + i * 6}s` }}
          viewBox="0 0 40 20"
          aria-hidden
        >
          <path d="M20 8 C16 2 10 2 2 6 C8 8 9 12 8 16 C12 12 16 13 20 18 C24 13 28 12 32 16 C31 12 32 8 38 6 C30 2 24 2 20 8 Z" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

/** Seasonal decoration layer behind the content (decorative only). */
export function SeasonalDecor({ season }: { season: Season }) {
  if (season === 'none') return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {(season === 'winter' || season === 'christmas') && <Snow />}
      {season === 'christmas' && <Garland />}
      {season === 'halloween' && <Halloween />}
      {season === 'spring' && <Petals />}
      {season === 'summer' && <Fireflies />}
    </div>
  );
}
