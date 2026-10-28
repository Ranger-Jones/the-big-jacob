import type { ReactNode } from 'react';
import { LOOT_BY_ID, LOOT_VIEWBOX } from '@/lib/loot/catalog';

/**
 * Hand-drawn SVG art for the loot-chest cosmetics, keyed by LootItem id. Frames (100×100) keep the circle of
 * radius 34 around the centre empty for the avatar photo; emblems are 100×100, card backs 100×140, felts 160×100.
 * Pure SVG primitives only (no text, filters, patterns, masks or <use>): the server serialises these with
 * renderSvg for the Flutter app. Every gradient/clip id is prefixed with its item id.
 */

// ---------------------------------------------------------------------------------------------
// Palette

const INK = '#2a1a10';
const GOLD = '#f4b73a';
const GOLD_L = '#ffd77a';
const GOLD_D = '#b07a12';
const PARCH = '#fbf0d9';
const WAX = '#c8323c';
const NIGHT = '#120a1f';
const VELVET = '#1b0e2e';
const PLUM = '#24143a';
const PURPLE = '#3d2361';
const RUBY = '#d42a4a';
const SAPPHIRE = '#3a7bea';
const EMERALD = '#26b07a';
const AMETHYST = '#a35ee8';
const TOPAZ = '#f39a1e';
const PEARL = '#f5ecdf';
const SILVER = '#dfe4ec';
const SILVER_D = '#7d8696';

type GemName = 'ruby' | 'sapphire' | 'emerald' | 'amethyst' | 'topaz' | 'pearl';
const GEM: Record<GemName, [string, string, string]> = {
  ruby: ['#ffb3bf', RUBY, '#5e0818'],
  sapphire: ['#b8d4ff', SAPPHIRE, '#0f2a66'],
  emerald: ['#a8f5d0', EMERALD, '#0a4430'],
  amethyst: ['#ecd2ff', AMETHYST, '#401470'],
  topaz: ['#fff0b0', TOPAZ, '#743c06'],
  pearl: ['#ffffff', PEARL, '#a39580'],
};

// ---------------------------------------------------------------------------------------------
// Geometry helpers (angles in degrees, 0 = up, clockwise)

const f = (n: number) => Math.round(n * 10) / 10;
/** Compact number for path data: one decimal, no leading zero. */
const nm = (n: number) => String(f(n)).replace(/^(-?)0\./, '$1.');
const times = <T,>(n: number, fn: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => fn(i));
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;

function xy(r: number, deg: number, cx = 50, cy = 50): [number, number] {
  return [f(cx + r * Math.cos(rad(deg))), f(cy + r * Math.sin(rad(deg)))];
}
/** "x y" of the point at radius r and angle deg. */
function pt(r: number, deg: number, cx = 50, cy = 50): string {
  const [x, y] = xy(r, deg, cx, cy);
  return `${nm(x)} ${nm(y)}`;
}
const circ = (cx: number, cy: number, r: number) =>
  `M${nm(cx - r)} ${nm(cy)}a${nm(r)} ${nm(r)} 0 1 0 ${nm(2 * r)} 0a${nm(r)} ${nm(r)} 0 1 0 ${nm(-2 * r)} 0Z`;
/** Ring between two radii (use with fillRule="evenodd"). */
const annulus = (rIn: number, rOut: number, cx = 50, cy = 50) => circ(cx, cy, rOut) + circ(cx, cy, rIn);
const arc = (r: number, a1: number, a2: number, cx = 50, cy = 50) =>
  `M${pt(r, a1, cx, cy)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${pt(r, a2, cx, cy)}`;
function sector(r1: number, r2: number, a1: number, a2: number, cx = 50, cy = 50): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${pt(r1, a1, cx, cy)}L${pt(r2, a1, cx, cy)}A${r2} ${r2} 0 ${large} 1 ${pt(r2, a2, cx, cy)}L${pt(r1, a2, cx, cy)}A${r1} ${r1} 0 ${large} 0 ${pt(r1, a1, cx, cy)}Z`;
}
/** Star polygon points. */
function star(cx: number, cy: number, r: number, inner: number, n: number, rot = 0): string {
  return times(n * 2, (i) => pt(i % 2 ? r * inner : r, rot + (i * 180) / n, cx, cy).replace(' ', ',')).join(' ');
}
const starPath = (cx: number, cy: number, r: number, inner: number, n: number, rot = 0) => `M${star(cx, cy, r, inner, n, rot).replace(/ /g, 'L').replace(/,/g, ' ')}Z`;
/** A tapered quill from (x0,y0) to the tip (x1,y1), half-width w. */
function quill(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  const m = (t: number, s: number) => `${nm(x0 + dx * t + nx * s)} ${nm(y0 + dy * t + ny * s)}`;
  return `M${m(0, 1)}Q${m(0.62, 1.25)} ${m(1, 0)}Q${m(0.62, -1.25)} ${m(0, -1)}Z`;
}
/** A pointed leaf from its stalk (x0,y0) to its tip (x1,y1), half-width w. */
function leaf(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * w * 2;
  const ny = (dx / len) * w * 2;
  const mx = x0 + dx / 2;
  const my = y0 + dy / 2;
  return `M${nm(x0)} ${nm(y0)}Q${nm(mx + nx)} ${nm(my + ny)} ${nm(x1)} ${nm(y1)}Q${nm(mx - nx)} ${nm(my - ny)} ${nm(x0)} ${nm(y0)}Z`;
}
/** Leaf growing from (x, y) towards angle deg. */
const leafTo = (x: number, y: number, deg: number, len: number, w: number) => leaf(x, y, ...xy(len, deg, x, y), w);
/** Moon disc lit for phase t (0 new, 0.5 full). */
function moon(x: number, y: number, r: number, t: number): string {
  if (t === 0.5) return circ(x, y, r);
  const waxing = t < 0.5;
  const p = waxing ? t : 1 - t;
  const k = f(Math.abs(Math.cos(2 * Math.PI * p)) * r);
  const sweep = p < 0.25 ? 0 : 1;
  const top = `${f(x)} ${f(y - r)}`;
  const bottom = `${f(x)} ${f(y + r)}`;
  return waxing
    ? `M${top}A${r} ${r} 0 0 1 ${bottom}A${k} ${r} 0 0 ${sweep} ${top}Z`
    : `M${top}A${r} ${r} 0 0 0 ${bottom}A${k} ${r} 0 0 ${1 - sweep} ${top}Z`;
}

// ---------------------------------------------------------------------------------------------
// Paint helpers

type Stops = (string | [number, string, number?])[];
function stops(cs: Stops) {
  return cs.map((c, i) => {
    const [o, col, op] = typeof c === 'string' ? [f(i / (cs.length - 1)), c, undefined] : c;
    return <stop key={i} offset={o} stopColor={col} stopOpacity={op} />;
  });
}
function Lin({ id, c, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }: { id: string; c: Stops; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{stops(c)}</linearGradient>;
}
/** Radial gradient; with `at` it is in user space around that point. */
function Rad({ id, c, at, cx = 0.5, cy = 0.5, r = 0.5 }: { id: string; c: Stops; at?: [number, number, number]; cx?: number; cy?: number; r?: number }) {
  return at
    ? <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={at[0]} cy={at[1]} r={at[2]}>{stops(c)}</radialGradient>
    : <radialGradient id={id} cx={cx} cy={cy} r={r}>{stops(c)}</radialGradient>;
}
const GOLD_STOPS: Stops = ['#fff3c4', GOLD, GOLD_D, GOLD_L, '#8a5a0e'];
const SILVER_STOPS: Stops = ['#ffffff', SILVER, SILVER_D, '#eef1f6', '#5d6575'];
const Gold = ({ id }: { id: string }) => <Lin id={id} c={GOLD_STOPS} />;
const Silver = ({ id }: { id: string }) => <Lin id={id} c={SILVER_STOPS} />;
/** Radial gem gradients `${p}-${name}` for the given gems. */
const GemDefs = ({ p, names }: { p: string; names: GemName[] }) => (
  <>{names.map((n) => <Rad key={n} id={`${p}-${n}`} cx={0.38} cy={0.32} r={0.75} c={[GEM[n][0], GEM[n][1], GEM[n][2]]} />)}</>
);

const ink = { stroke: INK, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const R = nm;

/** A cut gemstone with facets; `fill` may be a gradient url. */
function Gem({ x, y, r, c, fill, cut = 'round' }: { x: number; y: number; r: number; c?: string; fill?: string; cut?: 'round' | 'rhomb' | 'oval' }) {
  const d = cut === 'rhomb'
    ? `M${R(x)} ${R(y - r * 1.3)}L${R(x + r)} ${R(y)}L${R(x)} ${R(y + r * 1.3)}L${R(x - r)} ${R(y)}Z`
    : cut === 'oval'
      ? `M${R(x - r * 0.8)} ${R(y)}a${R(r * 0.8)} ${R(r * 1.15)} 0 1 0 ${R(r * 1.6)} 0a${R(r * 0.8)} ${R(r * 1.15)} 0 1 0 ${R(-r * 1.6)} 0Z`
      : circ(x, y, r);
  return (
    <g>
      <path d={d} fill={fill ?? c} stroke={INK} strokeWidth={R(Math.max(0.35, r * 0.18))} strokeLinejoin={cut === 'rhomb' ? 'round' : undefined} />
      {r > 2.2 && <path d={`M${R(x - r * 0.62)} ${R(y + r * 0.12)}H${R(x + r * 0.62)}L${R(x)} ${R(y + r * 0.82)}Z`} fill="#000" fillOpacity=".25" />}
      <path d={`M${R(x - r * 0.52)} ${R(y - r * 0.08)}L${R(x - r * 0.14)} ${R(y - r * 0.56)}L${R(x + r * 0.12)} ${R(y - r * 0.42)}L${R(x - r * 0.3)} ${R(y + r * 0.02)}Z`} fill="#fff" fillOpacity=".8" />
    </g>
  );
}
const GemG = ({ p, n, x, y, r, cut }: { p: string; n: GemName; x: number; y: number; r: number; cut?: 'round' | 'rhomb' | 'oval' }) => (
  <Gem x={x} y={y} r={r} fill={`url(#${p}-${n})`} cut={cut} />
);

/** Crown 40×20 units (scaled by s) with its band's bottom centre at (x, y). */
function Crown({ x, y, s = 1, fill = GOLD, gems = [RUBY, SAPPHIRE, RUBY], ball = PEARL }: { x: number; y: number; s?: number; fill?: string; gems?: string[]; ball?: string }) {
  return (
    <g transform={`translate(${R(x - 20 * s)} ${R(y - 20 * s)}) scale(${s})`}>
      <path d="M3 15 L0.5 4 L9 9.5 L12 2 L16 9 L20 0.8 L24 9 L28 2 L31 9.5 L39.5 4 L37 15 Z" fill={fill} {...ink} strokeWidth="1.2" />
      <rect x="2" y="14" width="36" height="6" rx="1.5" fill={fill} {...ink} strokeWidth="1.2" />
      <path d={[circ(1.6, 4.6, 1.6), circ(12, 3, 1.6), circ(20, 1.9, 1.8), circ(28, 3, 1.6), circ(38.4, 4.6, 1.6)].join('')} fill={ball} {...ink} strokeWidth=".8" />
      <Gem x={10} y={17} r={1.6} c={gems[0]} />
      <Gem x={20} y={17} r={2} c={gems[1]} cut="rhomb" />
      <Gem x={30} y={17} r={1.6} c={gems[2]} />
    </g>
  );
}

/** The six-armed blue Star of Life with the Rod of Asclepius, centred at (x, y), ~21 units tall at s = 1. */
function StarOfLife({ x, y, s = 1, blue = '#1f5fbf', edge = '#ffffff' }: { x: number; y: number; s?: number; blue?: string; edge?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 60, 120].map((a) => <rect key={`e${a}`} x="-3.5" y="-10.5" width="7" height="21" rx=".8" fill={edge} transform={`rotate(${a})`} />)}
      {[0, 60, 120].map((a) => <rect key={`b${a}`} x="-2.6" y="-9.6" width="5.2" height="19.2" fill={blue} transform={`rotate(${a})`} />)}
      <path d="M0 -7.2V7.2" stroke={edge} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M-1.8 5.4C1.9 4.2 1.9 2.4 0 1.5C-1.9 0.6 -1.9 -1.4 0 -2.2C1.5 -2.9 1.5 -4.5 0 -5.2" stroke={edge} strokeWidth=".9" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Fleur-de-lis, ~40 units tall at s = 1, centred at (x, y). */
function Lily({ x, y, s = 1, fill = GOLD, stroke = INK, sw = 1.4 }: { x: number; y: number; s?: number; fill?: string; stroke?: string; sw?: number }) {
  const side = 'M2.5 3.5C3.5 -5 10 -10.5 15.5 -8C19.5 -6 18.5 0 14.5 0.5C11.5 0.8 10.8 -3 13.2 -3.8C11 -5.6 7 -3.2 5.6 4Z';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d={side} />
      <path d={side} transform="scale(-1 1)" />
      <path d="M0 -20C5.5 -14 8 -7 5.6 -1C4.6 1.6 3 3 2.4 4H-2.4C-3 3 -4.6 1.6 -5.6 -1C-8 -7 -5.5 -14 0 -20Z" />
      <path d="M-2.6 8.5C-2.2 12 -1.4 15 0 17.5C1.4 15 2.2 12 2.6 8.5ZM3 8.5C6.5 9.5 9.5 12 10.5 16C7.5 15 4.8 13.5 2.5 11.5ZM-3 8.5C-6.5 9.5 -9.5 12 -10.5 16C-7.5 15 -4.8 13.5 -2.5 11.5Z" />
      <rect x="-9" y="3.5" width="18" height="5" rx="1.2" />
    </g>
  );
}

const LEAF = 'M0 -5C2.3 -2 2.3 2 0 5C-2.3 2 -2.3 -2 0 -5Z';

// ---------------------------------------------------------------------------------------------
// Rahmen — avatar frames (100×100). Nothing may be drawn inside r = 34.

function rahmenArt(): Record<string, ReactNode> {
  const art: Record<string, ReactNode> = {};

  art['rahmen-holzreif'] = (
    <g>
      <path d={annulus(35, 47)} fillRule="evenodd" fill="#9a6534" stroke="#4a2a12" strokeWidth="1" />
      <g fill="none" strokeLinecap="round">
        <circle cx="50" cy="50" r="38.2" stroke="#6e4420" strokeWidth=".8" strokeDasharray="22 5 9 4" />
        <circle cx="50" cy="50" r="41" stroke="#c48a52" strokeWidth=".7" strokeDasharray="12 6 26 5" />
        <circle cx="50" cy="50" r="43.8" stroke="#6e4420" strokeWidth=".8" strokeDasharray="30 7 6 4" />
        <path d={arc(45.6, 290, 380)} stroke="#e8bd8a" strokeOpacity=".6" strokeWidth="1.2" />
      </g>
      <path d={[45, 135, 225, 315].map((a) => circ(...xy(41, a), 1.9)).join('')} fill="#5a3518" />
      <path d={[45, 135, 225, 315].map((a) => circ(xy(41, a)[0] - 0.5, xy(41, a)[1] - 0.5, 0.7)).join('')} fill="#c48a52" />
    </g>
  );

  art['rahmen-eisenring'] = (
    <g>
      <path d={annulus(35, 46.5)} fillRule="evenodd" fill="#6f7480" stroke="#2f333b" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="37.8" fill="none" stroke="#4d525c" strokeWidth=".8" />
      <circle cx="50" cy="50" r="43.7" fill="none" stroke="#4d525c" strokeWidth=".8" />
      <path d={arc(45.2, 285, 395)} fill="none" stroke="#c3c8d2" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
      <path d={times(12, (i) => circ(...xy(40.75, i * 30 + 15), 1.8)).join('')} fill="#3d424c" />
      <path d={times(12, (i) => { const [x, y] = xy(40.75, i * 30 + 15); return circ(x - 0.45, y - 0.45, 0.9); }).join('')} fill="#c3c8d2" />
    </g>
  );

  art['rahmen-kordel'] = (
    <g>
      <path d={annulus(36, 45.5)} fillRule="evenodd" fill="#d1ad72" stroke="#6e4f22" strokeWidth="1" />
      <path d={times(36, (i) => `M${pt(36.4, i * 10)}Q${pt(40.2, i * 10 + 1)} ${pt(45.1, i * 10 + 7.5)}`).join('')} fill="none" stroke="#8a6630" strokeWidth="1.8" strokeLinecap="round" />
      <path d={times(36, (i) => `M${pt(37.4, i * 10 + 3.6)}Q${pt(40.6, i * 10 + 4.6)} ${pt(44, i * 10 + 9)}`).join('')} fill="none" stroke="#f3dcaa" strokeWidth=".7" strokeLinecap="round" />
    </g>
  );

  art['rahmen-perlen'] = (
    <g>
      <circle cx="50" cy="50" r="41" fill="none" stroke="#7d6e5c" strokeWidth=".9" />
      <path d={times(24, (i) => circ(...xy(41, i * 15), 4.9)).join('')} fill="#d6c8b0" stroke="#8f826f" strokeWidth=".6" />
      <path d={times(24, (i) => { const [x, y] = xy(41, i * 15); return circ(x - 0.6, y - 0.6, 3.9); }).join('')} fill="#f6efe3" />
      <path d={times(24, (i) => { const [x, y] = xy(41, i * 15); return circ(x - 1.6, y - 1.7, 1.2); }).join('')} fill="#fff" />
    </g>
  );

  const ivy = 'M0 1C-2 1 -4.6 0 -4.6 -2.2L-2.6 -2.7L-3.2 -5L-0.9 -4.4L0 -6.8L0.9 -4.4L3.2 -5L2.6 -2.7L4.6 -2.2C4.6 0 2 1 0 1Z';
  art['rahmen-efeu'] = (
    <g>
      <path d={annulus(36.5, 45.5)} fillRule="evenodd" fill="#1f3a1b" />
      <path d={times(72, (i) => `${i ? 'L' : 'M'}${pt(41 + 1.3 * Math.sin(i * 1.05), i * 5)}`).join('') + 'Z'} fill="none" stroke="#7a5426" strokeWidth="1.3" />
      {times(18, (i) => {
        const a = i * 20;
        const out = i % 2 === 0;
        return (
          <g key={i} transform={`translate(${pt(out ? 42 : 40.4, a)}) rotate(${out ? a + 50 : a + 130}) scale(${out ? 1 : 0.72})`}>
            <path d={ivy} fill={out ? '#5c9e3c' : '#4a8a30'} stroke="#24461a" strokeWidth=".5" strokeLinejoin="round" />
            <path d="M0 0.6V-5.2M0 -1.4L-2.8 -3M0 -1.4L2.8 -3" fill="none" stroke="#2c5a20" strokeWidth=".45" />
          </g>
        );
      })}
    </g>
  );

  art['rahmen-siegelwachs'] = (
    <g>
      <path d={times(96, (i) => `${i ? 'L' : 'M'}${pt(44.6 + 1.3 * Math.sin(i * 0.85) + 0.8 * Math.sin(i * 2.1), i * 3.75)}`).join('') + 'Z' + circ(50, 50, 35.4)} fillRule="evenodd" fill={WAX} stroke="#7a141c" strokeWidth=".7" />
      {[163, 198, 214].map((a, i) => { const [x, y] = xy(46.4 + i * 0.4, a); return <ellipse key={a} cx={x} cy={y} rx="1.8" ry={3 - i * 0.4} fill={WAX} transform={`rotate(${a} ${x} ${y})`} />; })}
      <circle cx="50" cy="50" r="36.6" fill="none" stroke="#8e1c26" strokeWidth="2" />
      <path d={arc(42.8, 295, 380)} fill="none" stroke="#f07a80" strokeOpacity=".65" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="50" cy="90.6" r="6.2" fill="#b02a33" stroke="#7a141c" strokeWidth=".8" />
      <circle cx="50" cy="90.6" r="4.6" fill="none" stroke="#e0646b" strokeWidth=".6" />
      <path d="M46.8 92.4 L46.3 88.4 L48.2 89.9 L50 87.6 L51.8 89.9 L53.7 88.4 L53.2 92.4Z" fill="#e0646b" />
    </g>
  );

  art['rahmen-schachbrett'] = (
    <g fill="none">
      <circle cx="50" cy="50" r="41" stroke="#2a2230" strokeWidth="10" />
      <circle cx="50" cy="50" r="38.5" stroke="#efe3cb" strokeWidth="5" strokeDasharray="10.08 10.08" />
      <circle cx="50" cy="50" r="43.5" stroke="#efe3cb" strokeWidth="5" strokeDasharray="11.39 11.39" transform="rotate(15 50 50)" />
      <circle cx="50" cy="50" r="35.8" stroke={GOLD_D} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="46.2" stroke={GOLD_D} strokeWidth="1.2" />
    </g>
  );

  art['rahmen-mondphasen'] = (
    <g>
      <path d={annulus(35.5, 46.5)} fillRule="evenodd" fill="#18204a" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#f3e7c4" strokeOpacity=".55" strokeWidth=".7" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#f3e7c4" strokeOpacity=".55" strokeWidth=".7" />
      <path d={times(8, (i) => circ(...xy(41, 180 + i * 45), 4.3)).join('')} fill="#2c3768" stroke="#f3e7c4" strokeOpacity=".5" strokeWidth=".4" />
      <path d={times(8, (i) => (i ? moon(...xy(41, 180 + i * 45), 4.3, i / 8) : '')).join('')} fill="#f3e7c4" />
      <path d={times(8, (i) => `M${star(...xy(41, 202.5 + i * 45), 1.6, 0.3, 4).replace(/ /g, 'L').replace(/,/g, ' ')}Z`).join('')} fill="#f3e7c4" fillOpacity=".8" />
    </g>
  );

  art['rahmen-narrenschellen'] = (
    <g>
      <circle cx="50" cy="50" r="40.5" fill="none" stroke={WAX} strokeWidth="9" />
      <circle cx="50" cy="50" r="40.5" fill="none" stroke="#2f8a55" strokeWidth="9" strokeDasharray="7.95 7.95" />
      <circle cx="50" cy="50" r="36" fill="none" stroke={INK} strokeWidth="1" />
      <circle cx="50" cy="50" r="45" fill="none" stroke={INK} strokeWidth="1" />
      {times(8, (i) => {
        const a = i * 45 + 22.5;
        return (
          <g key={i} transform={`translate(${pt(46, a)}) rotate(${a})`}>
            <circle r="3.1" fill={GOLD} {...ink} strokeWidth=".7" />
            <path d="M-2.2 0.6H2.2M0 0.6V2.6" stroke={INK} strokeWidth=".6" />
            <circle cx="-1" cy="-1.1" r=".8" fill="#fff3c4" />
          </g>
        );
      })}
    </g>
  );

  art['rahmen-kupferband'] = (
    <g>
      <path d={annulus(35.5, 46.5)} fillRule="evenodd" fill="#b8693a" stroke="#6a3216" strokeWidth="1" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#7a3e1e" strokeWidth=".6" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#7a3e1e" strokeWidth=".6" />
      <path d={times(40, (i) => `${i ? 'L' : 'M'}${pt(i % 2 ? 43 : 39, i * 9)}`).join('') + 'Z'} fill="none" stroke="#7a3e1e" strokeWidth=".9" strokeLinejoin="round" />
      <path d={times(40, (i) => `${i ? 'L' : 'M'}${pt(i % 2 ? 43.5 : 39.5, i * 9 + 0.6)}`).join('') + 'Z'} fill="none" stroke="#eaa877" strokeWidth=".45" strokeLinejoin="round" />
      <path d={times(20, (i) => circ(...xy(41, i * 18 + 9), 0.8)).join('')} fill="#7a3e1e" />
      <path d={arc(45.4, 290, 385)} fill="none" stroke="#f0b78c" strokeOpacity=".7" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );

  art['rahmen-weide'] = (
    <g fill="none">
      <circle cx="50" cy="50" r="41" stroke="#7c5a26" strokeWidth="10.5" />
      <circle cx="50" cy="50" r="38.4" stroke="#dcb26c" strokeWidth="4.4" strokeDasharray="7.6 2.45" />
      <circle cx="50" cy="50" r="43.6" stroke="#dcb26c" strokeWidth="4.4" strokeDasharray="8.6 2.8" transform="rotate(6 50 50)" />
      <circle cx="50" cy="50" r="37.7" stroke="#f4d79a" strokeWidth=".9" strokeDasharray="7.6 2.45" />
      <circle cx="50" cy="50" r="42.9" stroke="#f4d79a" strokeWidth=".9" strokeDasharray="8.6 2.8" transform="rotate(6 50 50)" />
      <circle cx="50" cy="50" r="35.8" stroke="#5a3e16" strokeWidth="1" />
      <circle cx="50" cy="50" r="46.2" stroke="#5a3e16" strokeWidth="1" />
    </g>
  );

  const runes = [
    'M0 -3.5V3.5M0 -3.5L2.4 -1.6M0 -0.9L2.4 1',
    'M-1.4 -3.5V3.5M-1.4 -2L1.6 0L-1.4 2',
    'M-1.6 3.5V-3.5L1.6 -1V3.5',
    'M0 -3.5V3.5M-2 -1.4L2 1.4',
    'M-2 -3.5L2 3.5M2 -3.5L-2 3.5',
    'M-2 3.5V-3.5L0 -1L2 -3.5V3.5',
    'M0 -3.5V3.5M-2.2 -1.2L0 -3.5L2.2 -1.2',
    'M-1.8 -3.5V3.5M-1.8 -3.5L1.8 -0.5L-1.8 1.5',
  ];
  art['rahmen-runen'] = (
    <g>
      <path d={annulus(35, 47)} fillRule="evenodd" fill="#5d5a66" stroke="#2f2c36" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="36.9" fill="none" stroke="#878392" strokeWidth=".8" />
      <circle cx="50" cy="50" r="45.1" fill="none" stroke="#878392" strokeWidth=".8" />
      {times(16, (i) => (
        <g key={i} transform={`translate(${pt(41, i * 22.5)}) rotate(${i * 22.5})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={runes[i % 8]} stroke="#a8a4b4" strokeWidth=".55" transform="translate(0.35 0.35)" />
          <path d={runes[i % 8]} stroke="#26232c" strokeWidth="1.1" />
        </g>
      ))}
    </g>
  );

  // --- selten ---

  {
    const p = 'rahmen-lorbeer';
    const leaves = (a: number, dir: 1 | -1) => {
      const [x, y] = xy(41.5, a);
      return leafTo(x, y, a + dir * 60, 9.8, 1.7) + leafTo(x, y, a + dir * 120, 8, 1.4);
    };
    const all = times(13, (i) => leaves(196 + i * 12.6, 1) + leaves(164 - i * 12.6, -1)).join('');
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-leaf`} c={['#8cc65a', '#3f7a2a', '#24481a']} />
          <Silver id={`${p}-silver`} />
        </defs>
        <circle cx="50" cy="50" r="36.2" fill="none" stroke={`url(#${p}-silver)`} strokeWidth="2" />
        <path d={arc(41.5, 192, 352) + arc(41.5, 8, 168)} fill="none" stroke="#2f5a20" strokeWidth="1.1" strokeLinecap="round" />
        <path d={all} fill={`url(#${p}-leaf)`} stroke="#1f3d14" strokeWidth=".4" />
        <path d={times(13, (i) => [196 + i * 12.6, 164 - i * 12.6].map((a) => { const [x, y] = xy(41.5, a); return `M${x} ${y}L${pt(6, a + (a > 180 ? 60 : -60), x, y)}`; }).join('')).join('')} stroke="#c8e6a0" strokeOpacity=".5" strokeWidth=".3" />
        <g fill={`url(#${p}-silver)`} stroke="#4d5565" strokeWidth=".6" strokeLinejoin="round">
          <path d="M48.5 92.5L43 99.5L45.6 99L46.6 100L51 93.5Z M51.5 92.5L57 99.5L54.4 99L53.4 100L49 93.5Z" />
          <path d="M50 91.2C45 86.6 39.5 87.6 40.6 91.4C41.4 94.6 46.4 94 50 91.2Z M50 91.2C55 86.6 60.5 87.6 59.4 91.4C58.6 94.6 53.6 94 50 91.2Z" />
          <circle cx="50" cy="91.3" r="2" />
        </g>
        <path d={[-1, 1].map((d) => circ(...xy(46.2, 180 + d * 22), 1.1) + circ(...xy(46.8, 180 + d * 28), 1)).join('')} fill="#eef1f6" stroke="#4d5565" strokeWidth=".4" />
      </g>
    );
  }

  {
    const p = 'rahmen-dornenrose';
    const thorns = times(24, (i) => {
      const a = i * 15 + 7.5;
      const out = i % 2 === 0;
      return `M${pt(41, a - 2.6)}L${pt(out ? 44.8 : 37.2, a + 1.2)}L${pt(41, a + 2.2)}Z`;
    }).join('');
    art[p] = (
      <g>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={annulus(35.8, 46.4)} fillRule="evenodd" fill="#24161a" stroke={`url(#${p}-gold)`} strokeWidth="1.1" />
        <path d={times(72, (i) => `${i ? 'L' : 'M'}${pt(41 + 1.5 * Math.sin(i * 0.52), i * 5)}`).join('') + 'Z'} fill="none" stroke="#4a6a2a" strokeWidth="1" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#5a4020" strokeWidth="1.8" />
        <path d={thorns} fill="#7a5a30" />
        {times(5, (i) => {
          const a = i * 72 + 36;
          return (
            <g key={i} transform={`translate(${pt(41, a)}) rotate(${a}) scale(1.15)`}>
              <path d={LEAF} fill="#3e7a32" stroke="#1f3d14" strokeWidth=".4" transform="translate(-6.6 0.4) rotate(-70) scale(0.85)" />
              <path d={LEAF} fill="#4f8f3a" stroke="#1f3d14" strokeWidth=".4" transform="translate(6.6 -0.4) rotate(70) scale(0.85)" />
              <circle r="5.3" fill={WAX} stroke="#6e1018" strokeWidth=".7" />
              <path d="M-4.2 -1.6C-3 -4.8 2.8 -5.4 4.4 -1.4M-3.6 2.6C-1.8 4.6 2.6 4.4 3.8 1.8" fill="none" stroke="#7a141c" strokeWidth=".7" strokeLinecap="round" />
              <path d="M-2.6 0.6C-2.6 -2.8 2.8 -2.6 2.6 0.2C2.4 2.2 -0.8 2.2 -0.8 0.2C-0.8 -0.8 0.8 -0.8 0.8 0" fill="none" stroke="#6e1018" strokeWidth=".75" strokeLinecap="round" />
              <path d="M-3.6 -2.2C-2.4 -3.8 0 -4.2 1.6 -3.6" fill="none" stroke="#f07a82" strokeWidth=".7" strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    );
  }

  {
    const p = 'rahmen-eiskristall';
    const spikes = times(24, (i) => {
      const a = i * 15;
      const tip = i % 2 ? 46 : 49.6;
      return `M${pt(40.5, a - 5)}L${pt(tip, a)}L${pt(40.5, a + 5)}L${pt(38.5, a)}Z`;
    }).join('');
    const flakes = times(6, (i) => {
      const [x, y] = xy(38.8, i * 60 + 30);
      return times(3, (k) => `M${pt(2.2, k * 60, x, y)}L${pt(2.2, k * 60 + 180, x, y)}`).join('');
    }).join('');
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-ice`} c={['#f4fbff', '#a8dcf7', '#4f97d1', '#c8ecff', '#2f6ea8']} />
          <Silver id={`${p}-silver`} />
        </defs>
        <path d={spikes} fill={`url(#${p}-ice)`} stroke="#2a5f94" strokeWidth=".5" strokeLinejoin="round" />
        <path d={times(24, (i) => `M${pt(41, i * 15)}L${pt(i % 2 ? 45.4 : 49, i * 15)}`).join('')} stroke="#fff" strokeOpacity=".75" strokeWidth=".45" />
        <path d={annulus(35.5, 42)} fillRule="evenodd" fill={`url(#${p}-ice)`} stroke="#2a5f94" strokeWidth=".7" />
        <circle cx="50" cy="50" r="36.1" fill="none" stroke={`url(#${p}-silver)`} strokeWidth="1.3" />
        <path d={flakes} stroke="#fff" strokeWidth=".55" strokeLinecap="round" />
        <path d={arc(40.6, 300, 390)} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".9" strokeLinecap="round" />
      </g>
    );
  }

  {
    const p = 'rahmen-flammen';
    const flame = (a: number, r1: number, w: number, sw: number) =>
      `M${pt(37.5, a - w)}Q${pt((37.5 + r1) / 2, a - w * 0.8 + sw)} ${pt(r1, a + sw)}Q${pt((37.5 + r1) / 2, a + w * 0.7 + sw)} ${pt(37.5, a + w)}Z`;
    art[p] = (
      <g>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={times(18, (i) => flame(i * 20, 49.4, 9, 6) + flame(i * 20 + 10, 46, 6, 4)).join('')} fill="#e0431c" />
        <path d={times(18, (i) => flame(i * 20, 46, 6.5, 4.5)).join('')} fill="#f4a21e" />
        <path d={times(18, (i) => flame(i * 20 + 1, 42.8, 4, 3)).join('')} fill="#ffe07a" />
        <path d={annulus(35.5, 39)} fillRule="evenodd" fill="#5a1408" />
        <circle cx="50" cy="50" r="35.9" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="38.9" fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".7" />
      </g>
    );
  }

  {
    const p = 'rahmen-ketten';
    art[p] = (
      <g>
        <defs><Gold id={`${p}-gold`} /><Silver id={`${p}-silver`} /></defs>
        <path d={annulus(36, 46)} fillRule="evenodd" fill={VELVET} />
        <circle cx="50" cy="50" r="36.2" fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".9" />
        <circle cx="50" cy="50" r="45.8" fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".9" />
        {times(24, (i) => {
          const a = i * 15;
          return i % 2
            ? <rect key={i} x="-4.6" y="-1.1" width="9.2" height="2.2" rx="1.1" fill="#8e97a8" stroke="#3b414d" strokeWidth=".5" transform={`translate(${pt(41, a)}) rotate(${a})`} />
            : (
              <g key={i} transform={`translate(${pt(41, a)}) rotate(${a})`} fill="none">
                <ellipse rx="5.2" ry="2.9" stroke="#4d5565" strokeWidth="2.6" />
                <ellipse rx="5.2" ry="2.9" stroke="#e3e8ef" strokeWidth=".9" />
              </g>
            );
        })}
        <path d="M46.4 90.6V88.6A3.6 3.6 0 0 1 53.6 88.6V90.6" fill="none" stroke={`url(#${p}-silver)`} strokeWidth="1.9" />
        <rect x="43.6" y="90" width="12.8" height="9" rx="1.6" fill={`url(#${p}-gold)`} {...ink} strokeWidth=".7" />
        <path d={circ(50, 93.4, 1.2) + 'M49.5 94H50.5L51 96.8H49Z'} fill={INK} />
      </g>
    );
  }

  {
    const p = 'rahmen-lebensstern';
    art[p] = (
      <g>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d={annulus(36, 46)} fillRule="evenodd" fill="#f4f4f4" />
        <path d={times(24, (i) => `M${pt(36, i * 15)}L${pt(46, i * 15 + 6)}L${pt(46, i * 15 + 13.5)}L${pt(36, i * 15 + 7.5)}Z`).join('')} fill="#d8232a" />
        <circle cx="50" cy="50" r="36" fill="none" stroke={`url(#${p}-silver)`} strokeWidth="1.4" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#${p}-silver)`} strokeWidth="1.4" />
        <circle cx="50" cy="50" r="46.8" fill="none" stroke="#3b414d" strokeWidth=".5" />
        <circle cx="50" cy="8.6" r="6.6" fill="#fff" stroke={`url(#${p}-silver)`} strokeWidth="1.2" />
        <StarOfLife x={50} y={8.6} s={0.52} edge="#fff" />
        <Gem x={8.6} y={50} r={2.6} c="#3a8cff" cut="oval" />
        <Gem x={91.4} y={50} r={2.6} c="#3a8cff" cut="oval" />
      </g>
    );
  }

  {
    const p = 'rahmen-sonnenrad';
    art[p] = (
      <g>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={times(16, (i) => `M${pt(39, i * 22.5 - 4.5)}L${pt(49.6, i * 22.5)}L${pt(39, i * 22.5 + 4.5)}Z`).join('')} fill={`url(#${p}-gold)`} stroke="#7a4e0a" strokeWidth=".5" strokeLinejoin="round" />
        <path d={times(16, (i) => { const a = i * 22.5 + 11.25; return `M${pt(39, a - 4)}Q${pt(42.5, a - 3.5)} ${pt(44, a)}Q${pt(45.5, a + 3)} ${pt(47.2, a + 1)}Q${pt(44, a + 4.5)} ${pt(39, a + 4)}Z`; }).join('')} fill={GOLD_L} stroke="#7a4e0a" strokeWidth=".45" strokeLinejoin="round" />
        <path d={annulus(35.5, 40.5)} fillRule="evenodd" fill="#8e1c26" stroke={`url(#${p}-gold)`} strokeWidth="1.2" />
        <path d={times(24, (i) => circ(...xy(38, i * 15), 0.75)).join('')} fill="#fff1b8" />
      </g>
    );
  }

  {
    const cols = [RUBY, SAPPHIRE, TOPAZ, EMERALD, AMETHYST, SAPPHIRE];
    art['rahmen-buntglas'] = (
      <g>
        {times(12, (i) => <path key={`a${i}`} d={sector(35.5, 41, i * 30, i * 30 + 30)} fill={cols[i % 6]} stroke="#1a1420" strokeWidth="1.1" strokeLinejoin="round" />)}
        {times(12, (i) => <path key={`b${i}`} d={sector(41, 47, i * 30 + 15, i * 30 + 45)} fill={cols[(i + 3) % 6]} stroke="#1a1420" strokeWidth="1.1" strokeLinejoin="round" />)}
        <path d={arc(44.5, 290, 400) + arc(38.4, 300, 380)} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="50" cy="50" r="35.6" fill="none" stroke="#1a1420" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="47" fill="none" stroke="#1a1420" strokeWidth="1.6" />
        <path d={times(24, (i) => circ(...xy(41, i * 15), 0.9)).join('')} fill={GOLD} stroke="#5a3a06" strokeWidth=".3" />
      </g>
    );
  }

  {
    const scrolls = times(12, (i) => {
      const a = i * 30;
      return `M${pt(37.8, a)}C${pt(41.5, a - 3)} ${pt(40, a + 16)} ${pt(44.2, a + 15)}M${pt(37.8, a)}C${pt(39.4, a + 4)} ${pt(41.6, a + 3)} ${pt(41.4, a + 1)}M${pt(44.2, a + 15)}C${pt(42.6, a + 11)} ${pt(40.4, a + 12)} ${pt(40.6, a + 14)}`;
    }).join('');
    art['rahmen-filigran'] = (
      <g fill="none" strokeLinecap="round">
        <path d={annulus(36, 46)} fillRule="evenodd" fill={PLUM} />
        <path d={scrolls + circ(50, 50, 37) + circ(50, 50, 45)} stroke="#5d6575" strokeWidth="2.1" />
        <path d={scrolls + circ(50, 50, 37) + circ(50, 50, 45)} stroke="#eef1f6" strokeWidth=".9" />
        <path d={times(12, (i) => circ(...xy(41.1, i * 30 + 22), 0.85)).join('')} fill={GOLD} />
        {[45, 135, 225, 315].map((a) => {
          const [x, y] = xy(47.4, a);
          return <path key={a} d={times(4, (k) => circ(...xy(1.5, k * 90 + a, x, y), 1.2)).join('') + circ(x, y, 0.9)} fill={GOLD} stroke="#7a4e0a" strokeWidth=".35" />;
        })}
      </g>
    );
  }

  // --- episch ---

  {
    const p = 'rahmen-juwelen';
    const order: GemName[] = ['ruby', 'sapphire', 'emerald', 'amethyst'];
    art[p] = (
      <g>
        <defs><Gold id={`${p}-gold`} /><GemDefs p={p} names={[...order, 'pearl']} /></defs>
        <path d={times(8, (i) => { const a = i * 45 + 22.5; return `M${pt(44, a - 6)}L${pt(49.4, a)}L${pt(44, a + 6)}Z`; }).join('')} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".5" strokeLinejoin="round" />
        <path d={annulus(35.5, 45)} fillRule="evenodd" fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".8" />
        <circle cx="50" cy="50" r="37.1" fill="none" stroke="#8a5a0e" strokeWidth=".5" />
        <circle cx="50" cy="50" r="43.4" fill="none" stroke="#8a5a0e" strokeWidth=".5" />
        <path d={times(8, (i) => circ(...xy(40.25, i * 45), 5.3)).join('')} fill="#8a5a0e" stroke="#fff1b8" strokeWidth=".5" />
        {times(8, (i) => <GemG key={i} p={p} n={order[i % 4]} x={xy(40.25, i * 45)[0]} y={xy(40.25, i * 45)[1]} r={4.1} />)}
        <path d={times(8, (i) => circ(...xy(40.25, i * 45 + 22.5), 1.5)).join('')} fill={`url(#${p}-pearl)`} stroke="#8a7a60" strokeWidth=".3" />
      </g>
    );
  }

  {
    const p = 'rahmen-drachenschuppe';
    const row = (rb: number, off: number) => times(18, (i) => {
      const a = i * 20 + off;
      return `M${pt(rb, a - 10)}C${pt(rb + 5.2, a - 9)} ${pt(rb + 5.2, a + 9)} ${pt(rb, a + 10)}Z`;
    }).join('');
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-scale`} c={['#7af5bd', '#22a56a', '#0b3d2a']} />
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-eye`} c={['#fff3a0', '#f39a1e', '#8e2a06']} />
        </defs>
        <path d={times(20, (i) => `M${pt(45, i * 18 - 3.4)}L${pt(49.6, i * 18 + 1.5)}L${pt(45, i * 18 + 3.4)}Z`).join('')} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".4" strokeLinejoin="round" />
        <path d={annulus(35.5, 46)} fillRule="evenodd" fill="#0b3d2a" />
        <path d={row(42.2, 0)} fill={`url(#${p}-scale)`} stroke="#062018" strokeWidth=".5" />
        <path d={row(38.8, 10)} fill={`url(#${p}-scale)`} stroke="#062018" strokeWidth=".5" />
        <path d={row(35.6, 0)} fill={`url(#${p}-scale)`} stroke="#062018" strokeWidth=".5" />
        <circle cx="50" cy="50" r="35.8" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".9" />
        <ellipse cx="50" cy="8.6" rx="6.6" ry="4.6" fill={`url(#${p}-gold)`} {...ink} strokeWidth=".6" />
        <ellipse cx="50" cy="8.6" rx="5.2" ry="3.4" fill={`url(#${p}-eye)`} stroke="#5a1a04" strokeWidth=".4" />
        <ellipse cx="50" cy="8.6" rx=".9" ry="3" fill={NIGHT} />
        <circle cx="48.2" cy="7.4" r=".8" fill="#fff" fillOpacity=".85" />
      </g>
    );
  }

  {
    const p = 'rahmen-sternennacht';
    const dots = times(34, (i) => circ(...xy(37.3 + ((i * 7) % 9), (i * 137.5) % 360), i % 3 ? 0.35 : 0.55)).join('');
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-sky`} at={[50, 50, 47]} c={[[0.72, '#4a2a7a'], [0.86, '#1c2266'], [1, '#090c2c']]} />
          <Gold id={`${p}-gold`} />
          <GemDefs p={p} names={['sapphire']} />
        </defs>
        {[45, 135, 225, 315].map((a) => <polygon key={a} points={star(...xy(48, a), 6, 0.42, 8, 0)} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".5" strokeLinejoin="round" />)}
        <path d={annulus(35.5, 46.5)} fillRule="evenodd" fill={`url(#${p}-sky)`} />
        {[30, 150, 260].map((a) => { const [x, y] = xy(41, a); return <ellipse key={a} cx={x} cy={y} rx="7" ry="2.6" fill="#b48cff" fillOpacity=".14" transform={`rotate(${a} ${x} ${y})`} />; })}
        <path d={dots} fill="#fff" fillOpacity=".85" />
        <path d={[20, 95, 170, 205, 280].map((a, i) => starPath(...xy(i % 2 ? 39 : 43, a), 1.9, 0.28, 4)).join('')} fill="#ffeeb0" />
        <path d={moon(...xy(41, 320), 3.4, 0.14)} fill="#ffeeb0" />
        <path d={arc(42.5, 110, 132)} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth=".7" strokeLinecap="round" />
        <circle cx="50" cy="50" r="35.8" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" />
        <circle cx="50" cy="50" r="46.3" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" />
        {[45, 135, 225, 315].map((a) => <GemG key={a} p={p} n="sapphire" x={xy(48, a)[0]} y={xy(48, a)[1]} r={2.5} />)}
      </g>
    );
  }

  {
    const p = 'rahmen-greifenschwingen';
    const tips: [number, number][] = [[17, 1.5], [10, 4], [5, 9], [1.5, 17], [0.5, 26], [1.5, 35], [3.5, 44]];
    const wing = (
      <g>
        <path d={tips.map(([x, y], i) => quill(9.5, 55 - i * 2, x, y, 4.2 - i * 0.15)).join('')} fill={`url(#${p}-feather)`} stroke="#5a3a10" strokeWidth=".5" strokeLinejoin="round" />
        <path d={tips.map(([x, y], i) => `M9.5 ${55 - i * 2}L${f(x + (9.5 - x) * 0.08)} ${f(y + (55 - i * 2 - y) * 0.08)}`).join('')} stroke="#7a5218" strokeWidth=".35" />
        <path d={tips.slice(0, 6).map(([x, y], i) => quill(9.5, 52 - i * 1.8, f(x + (9.5 - x) * 0.45), f(y + (52 - i * 1.8 - y) * 0.45), 3)).join('')} fill="#f6e3b0" stroke="#5a3a10" strokeWidth=".45" strokeLinejoin="round" />
      </g>
    );
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-feather`} x1={1} y1={1} x2={0} y2={0} c={['#fff8e6', '#f0d394', '#c9903a', '#7a5218']} />
          <Gold id={`${p}-gold`} />
          <GemDefs p={p} names={['sapphire', 'topaz']} />
        </defs>
        {wing}
        <g transform="translate(100 0) scale(-1 1)">{wing}</g>
        <path d={annulus(35.5, 42)} fillRule="evenodd" fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".8" />
        <circle cx="50" cy="50" r="38.75" fill="none" stroke="#8a5a0e" strokeWidth=".5" strokeDasharray="1.4 1.4" />
        <path d="M50 3.6C53.5 6.4 55 8.2 55 10.4C55 12.6 52.6 13.4 50 14.6C47.4 13.4 45 12.6 45 10.4C45 8.2 46.5 6.4 50 3.6Z" fill={`url(#${p}-gold)`} {...ink} strokeWidth=".6" />
        <GemG p={p} n="sapphire" x={50} y={9.8} r={2.7} cut="rhomb" />
        <GemG p={p} n="topaz" x={50} y={88.8} r={2.6} />
        <GemG p={p} n="sapphire" x={11.2} y={50} r={2.2} />
        <GemG p={p} n="sapphire" x={88.8} y={50} r={2.2} />
      </g>
    );
  }

  {
    const p = 'rahmen-amethystkrone';
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-band`} c={['#d3a8fa', '#7a3cc0', '#3d2361', '#9a62da', '#2a1650']} />
          <Gold id={`${p}-gold`} />
          <GemDefs p={p} names={['amethyst', 'pearl']} />
        </defs>
        <path d={annulus(35.5, 44)} fillRule="evenodd" fill={`url(#${p}-band)`} stroke={VELVET} strokeWidth=".8" />
        <circle cx="50" cy="50" r="35.9" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" />
        <circle cx="50" cy="50" r="43.6" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" />
        <path d={times(10, (i) => circ(...xy(39.75, 36 + i * 32), 1.1)).join('')} fill={`url(#${p}-pearl)`} />
        <path d={[60, 120, 180, 240, 300].map((a) => circ(...xy(39.75, a), 3.9)).join('')} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".5" />
        {[60, 120, 180, 240, 300].map((a) => <GemG key={a} p={p} n="amethyst" x={xy(39.75, a)[0]} y={xy(39.75, a)[1]} r={3} cut={a === 180 ? 'oval' : 'round'} />)}
        <Crown x={50} y={16} s={0.8} fill={`url(#${p}-gold)`} gems={[AMETHYST, '#c58af5', AMETHYST]} />
      </g>
    );
  }

  {
    const p = 'rahmen-korallen';
    const coral = (a: number) => `M${pt(43, a)}Q${pt(50, a - 2)} ${pt(58, a + 1)}M${pt(47.5, a - 0.6)}Q${pt(51, a - 7)} ${pt(55, a - 11)}M${pt(51.5, a - 4.5)}L${pt(55, a - 3)}M${pt(50.5, a)}Q${pt(54, a + 5)} ${pt(56, a + 10)}M${pt(53.5, a + 4.5)}L${pt(57.5, a + 4.5)}M${pt(45, a)}Q${pt(46.5, a + 6)} ${pt(48.5, a + 10)}`;
    const bubbles = [[12, 24, 1.2], [18, 13, 0.8], [27, 6, 0.6], [87, 31, 1], [84, 19, 0.7], [90, 80, 1.1], [94, 70, 0.6], [14, 84, 0.9], [8, 68, 0.7], [70, 95, 0.7]];
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-sea`} at={[50, 50, 45]} c={[[0.75, '#127a96'], [0.88, '#0a3d5c'], [1, '#041a2c']]} />
          <Lin id={`${p}-coral`} c={['#ffc0a8', '#ff6b5a', '#b3202c']} />
          <Gold id={`${p}-gold`} />
          <GemDefs p={p} names={['pearl']} />
        </defs>
        <path d={[45, 135, 225, 315].map(coral).join('')} fill="none" stroke="#6e1018" strokeWidth="3.4" strokeLinecap="round" />
        <path d={[45, 135, 225, 315].map(coral).join('')} fill="none" stroke={`url(#${p}-coral)`} strokeWidth="2.2" strokeLinecap="round" />
        <path d={annulus(35.5, 44.5)} fillRule="evenodd" fill={`url(#${p}-sea)`} />
        <path d={[20, 70, 110, 160, 200, 250, 290, 340].map((a, i) => `M${pt(44.4, a)}Q${pt(41, a + (i % 2 ? 4 : -4))} ${pt(38.6, a + (i % 2 ? 1 : -1))}`).join('')} fill="none" stroke="#1fa38a" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="35.8" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="44.3" fill="none" stroke="#7fe3f0" strokeOpacity=".55" strokeWidth=".6" />
        <path d={bubbles.map(([x, y, r]) => circ(x, y, r)).join('')} fill="none" stroke="#d6f6ff" strokeOpacity=".7" strokeWidth=".4" />
        {[0, 120, 240].map((a) => <circle key={a} cx={xy(40, a)[0]} cy={xy(40, a)[1]} r="2.8" fill={`url(#${p}-pearl)`} stroke="#8a7a60" strokeWidth=".35" />)}
        <polygon points={star(50, 89.8, 4.4, 0.45, 5)} fill={TOPAZ} stroke="#8a4a10" strokeWidth=".5" strokeLinejoin="round" />
        <path d={times(5, (k) => circ(...xy(2.2, k * 72, 50, 89.8), 0.35)).join('')} fill="#fff3c4" />
      </g>
    );
  }

  // --- legendär ---

  {
    const p = 'rahmen-drachenkoenig';
    const scales = [38.2, 41.6].map((rb, k) => times(22, (i) => { const a = i * (360 / 22) + k * 8.2; return `M${pt(rb, a - 7)}Q${pt(rb + 4, a)} ${pt(rb, a + 7)}`; }).join('')).join('');
    const spineAngles = times(24, (i) => i * 15 + 7.5).filter((a) => (a > 28 && a < 160) || (a > 200 && a < 332));
    const wing = (
      <g>
        <path d="M23 17L5 1.5Q9.5 8.5 8 12L0.8 13Q6.5 17.6 6 21.4L1.5 27.5Q11 26.5 18.5 31Z" fill={`url(#${p}-wing)`} stroke="#2a0618" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M21.5 22L5 1.5M21.5 22L0.8 13M21.5 22L1.5 27.5" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1" strokeLinecap="round" />
      </g>
    );
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 50, 72]} c={[[0.55, GOLD_L, 0.9], [1, GOLD_L, 0]]} />
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-body`} c={['#8af7c0', '#1f9a64', '#0b3d2a', '#2fb878', '#0b3d2a']} />
          <Lin id={`${p}-wing`} x1={1} y1={1} x2={0} y2={0} c={['#d23a5a', '#6e1030', '#2a0618']} />
          <GemDefs p={p} names={['ruby', 'emerald']} />
        </defs>
        <path d={times(20, (i) => `M${pt(40, i * 18 - 3)}L${pt(72, i * 18)}L${pt(40, i * 18 + 3)}Z`).join('')} fill={`url(#${p}-ray)`} />
        {wing}
        <g transform="translate(100 0) scale(-1 1)">{wing}</g>
        <path d={spineAngles.map((a) => `M${pt(43.5, a - 3)}L${pt(47.8, a + 1)}L${pt(43.5, a + 3)}Z`).join('')} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".4" strokeLinejoin="round" />
        <path d={annulus(35.5, 44)} fillRule="evenodd" fill={`url(#${p}-body)`} stroke="#062018" strokeWidth=".8" />
        <path d={scales} fill="none" stroke="#06291b" strokeOpacity=".7" strokeWidth=".6" />
        <circle cx="50" cy="50" r="36.2" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.5" strokeDasharray="2.2 0.9" />
        {[[90, 'ruby', 3.3], [270, 'ruby', 3.3], [135, 'emerald', 2.7], [225, 'emerald', 2.7]].map(([a, n, r]) => (
          <GemG key={a as number} p={p} n={n as GemName} x={xy(40, a as number)[0]} y={xy(40, a as number)[1]} r={r as number} />
        ))}
        <Crown x={50} y={16} s={0.8} fill={`url(#${p}-gold)`} gems={[EMERALD, RUBY, EMERALD]} />
        <g {...ink} strokeWidth=".6">
          <path d="M44 88.6C38 87.5 33 84.5 30.5 79.5C35 82 39.6 83.6 45.4 85.4Z M56 88.6C62 87.5 67 84.5 69.5 79.5C65 82 60.4 83.6 54.6 85.4Z" fill={`url(#${p}-gold)`} />
          <path d="M42 86.6C43.5 84.6 56.5 84.6 58 86.6C59.2 90.6 56.6 94.6 55 99.4H45C43.4 94.6 40.8 90.6 42 86.6Z" fill={`url(#${p}-body)`} />
          <path d="M43.6 88.6L48 90.4M56.4 88.6L52 90.4" fill="none" strokeWidth=".9" />
        </g>
        <path d="M45 91.2Q46.6 90 48 91.4Q46.6 92.6 45 91.2Z M55 91.2Q53.4 90 52 91.4Q53.4 92.6 55 91.2Z" fill="#ffd040" stroke={INK} strokeWidth=".3" />
        <path d="M46.6 90.6V92M53.4 90.6V92M47.8 97.4L48.6 96.6M52.2 97.4L51.4 96.6" stroke={INK} strokeWidth=".6" strokeLinecap="round" />
      </g>
    );
  }

  {
    const p = 'rahmen-phoenix';
    const tips: [number, number][] = [[27, 1], [17, 2], [9, 6], [3.5, 12.5], [1, 21], [1.5, 30]];
    const wing = (
      <g>
        <path d={tips.map(([x, y], i) => quill(40 - i * 0.7, 12.4 + i * 0.4, x, y, 2.5 - i * 0.2)).join('')} fill={`url(#${p}-wing)`} stroke="#6e0e0e" strokeWidth=".45" strokeLinejoin="round" />
        <path d={tips.slice(0, 6).map(([x, y], i) => quill(41, 12.4 + i * 0.3, f(x + (41 - x) * 0.42), f(y + (12.4 - y) * 0.42), 1.9)).join('')} fill={`url(#${p}-gold)`} stroke="#7a4e0a" strokeWidth=".4" strokeLinejoin="round" />
      </g>
    );
    const flame = (a: number, r1: number, w: number, sw: number) =>
      `M${pt(40, a - w)}Q${pt((40 + r1) / 2, a - w * 0.8 + sw)} ${pt(r1, a + sw)}Q${pt((40 + r1) / 2, a + w * 0.7 + sw)} ${pt(40, a + w)}Z`;
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 50, 72]} c={[[0.55, '#ffc24a', 0.85], [1, '#ff7a1e', 0]]} />
          <Lin id={`${p}-wing`} x1={1} y1={1} x2={0} y2={0} c={['#fff1a8', '#ffa21e', '#e8401e', '#a0101e']} />
          <Rad id={`${p}-fire`} at={[50, 50, 50]} c={[[0.78, '#fff1a8'], [0.88, '#ff9a1e'], [1, '#d8301e']]} />
          <Lin id={`${p}-body`} c={['#fff1a8', '#ff8a1e', '#c8201e']} />
          <Gold id={`${p}-gold`} />
          <GemDefs p={p} names={['ruby', 'topaz']} />
        </defs>
        <path d={times(30, (i) => `M${pt(40, i * 12 - 2)}L${pt(72, i * 12)}L${pt(40, i * 12 + 2)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <path d={times(11, (i) => flame(115 + i * 13, i % 2 ? 47.5 : 50, 7, i < 5 ? -4 : 4)).join('')} fill={`url(#${p}-fire)`} stroke="#a0101e" strokeWidth=".4" strokeLinejoin="round" />
        {wing}
        <g transform="translate(100 0) scale(-1 1)">{wing}</g>
        <path d={annulus(35.5, 41.5)} fillRule="evenodd" fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".8" />
        <circle cx="50" cy="50" r="38.5" fill="none" stroke="#8a5a0e" strokeWidth=".5" />
        <path d="M50 4.8C55.6 7 57 11.4 53.8 15.6H46.2C43 11.4 44.4 7 50 4.8Z" fill={`url(#${p}-body)`} stroke="#8e1010" strokeWidth=".5" />
        <path d="M48.6 3.4Q47 1.4 47.8 0.2Q49.4 1.6 49.6 3.2Z M51.4 3.4Q53 1.4 52.2 0.2Q50.6 1.6 50.4 3.2Z M50 3.2Q49 1.2 50 0Q51 1.2 50 3.2Z" fill="#ffd040" stroke="#a0101e" strokeWidth=".3" />
        <circle cx="50" cy="5.4" r="2.6" fill="#ff9a1e" stroke="#8e1010" strokeWidth=".5" />
        <path d="M49 6.4H51L50 8.8Z" fill={GOLD} stroke={INK} strokeWidth=".3" />
        <path d={circ(48.9, 5, 0.45) + circ(51.1, 5, 0.45)} fill={INK} />
        <GemG p={p} n="ruby" x={50} y={12} r={1.8} cut="rhomb" />
        <GemG p={p} n="ruby" x={50} y={88.5} r={2.5} />
        <GemG p={p} n="topaz" x={xy(38.5, 125)[0]} y={xy(38.5, 125)[1]} r={1.8} />
        <GemG p={p} n="topaz" x={xy(38.5, 235)[0]} y={xy(38.5, 235)[1]} r={1.8} />
      </g>
    );
  }

  {
    const p = 'rahmen-jakobskrone';
    const laurel = [115, 127, 139, 151, 209, 221, 233, 245].map((a) => leafTo(...xy(45.2, a), a < 180 ? a - 60 : a + 60, 5.2, 1.3) + leafTo(...xy(45.2, a), a < 180 ? a - 60 : a + 60, -5.2, 1.3)).join('');
    const ribbon = 'M37 88.5L20 92L24 95.4L17.5 99L39 95Z';
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 50, 72]} c={[[0.55, GOLD_L, 0.9], [1, GOLD_L, 0]]} />
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-red`} c={['#ef6a72', WAX, '#6e1018']} />
          <GemDefs p={p} names={['ruby', 'sapphire', 'emerald', 'pearl']} />
        </defs>
        <path d={times(24, (i) => `M${pt(40, i * 15 - 2.2)}L${pt(i % 2 ? 62 : 72, i * 15)}L${pt(40, i * 15 + 2.2)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <g fill={`url(#${p}-red)`} stroke="#5a0e14" strokeWidth=".6" strokeLinejoin="round">
          <path d={ribbon} />
          <path d={ribbon} transform="translate(100 0) scale(-1 1)" />
        </g>
        <path d={laurel} fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".4" />
        <path d={annulus(35.5, 44)} fillRule="evenodd" fill={`url(#${p}-gold)`} stroke="#6e4a08" strokeWidth=".8" />
        <path d={times(24, (i) => circ(...xy(37.3, i * 15 + 7.5), 1.05)).join('')} fill={`url(#${p}-pearl)`} />
        <circle cx="50" cy="50" r="38.7" fill="none" stroke="#8a5a0e" strokeWidth=".5" />
        <circle cx="50" cy="50" r="42.9" fill="none" stroke="#8a5a0e" strokeWidth=".5" />
        <path d={[60, 120, 180, 240, 300].map((a) => circ(...xy(40.8, a), 3.9)).join('')} fill="#8a5a0e" stroke="#fff1b8" strokeWidth=".4" />
        {(['sapphire', 'emerald', 'ruby', 'emerald', 'sapphire'] as GemName[]).map((n, i) => (
          <GemG key={i} p={p} n={n} x={xy(40.8, 60 + i * 60)[0]} y={xy(40.8, 60 + i * 60)[1]} r={3.1} cut={i === 2 ? 'rhomb' : 'round'} />
        ))}
        <Crown x={50} y={15.8} s={0.82} fill={`url(#${p}-gold)`} gems={[EMERALD, RUBY, EMERALD]} />
        <path d={[[8, 9], [92, 9]].map(([x, y]) => starPath(x, y, 3.2, 0.22, 4)).join('')} fill="#fff8dc" />
      </g>
    );
  }

  return art;
}

// ---------------------------------------------------------------------------------------------
// Wappen — heraldic emblems (100×100)

const HEATER = 'M14 8H86V46C86 71 67 86 50 95C33 86 14 71 14 46Z';
const ORNATE = 'M12 9C25 13 38 9 50 4C62 9 75 13 88 9V47C88 72 68 87 50 96C32 87 12 72 12 47Z';
const SMALL = 'M22 31H78V56C78 75 64 86 50 94C36 86 22 75 22 56Z';

/** Shield with clipped field; `rim` adds a metal border (gold/silver colour or gradient url). */
function Shield({ p, d = HEATER, field, rim, children }: { p: string; d?: string; field: string; rim?: string; children?: ReactNode }) {
  return (
    <g>
      <defs><clipPath id={`${p}-clip`}><path d={d} /></clipPath></defs>
      <path d={d} fill={field} />
      <g clipPath={`url(#${p}-clip)`}>{children}</g>
      {d === HEATER && <path d="M21 14H45" stroke="#fff" strokeOpacity=".3" strokeWidth="2.4" strokeLinecap="round" />}
      {rim
        ? <><path d={d} fill="none" stroke={INK} strokeWidth="5.6" strokeLinejoin="round" /><path d={d} fill="none" stroke={rim} strokeWidth="3.2" strokeLinejoin="round" /></>
        : <path d={d} fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
    </g>
  );
}

/** A stroke with a dark outline (draws the outline first). */
function Dbl({ d, w, c, o = INK }: { d: string; w: number; c: string; o?: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={o} strokeWidth={R(w + 1.8)} />
      <path d={d} stroke={c} strokeWidth={w} />
    </g>
  );
}

const ch = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Dragon head in profile facing left, in the 100×100 frame. */
function DragonHead({ fill, horn, eye = '#ffd040' }: { fill: string; horn: string; eye?: string }) {
  return (
    <g {...ch}>
      <path d="M60 30L76 12L70 32Z M66 36L88 26L74 40Z" fill={horn} />
      <path d="M72 46L82 44L76 52Z M76 58L86 58L79 64Z M79 70L89 72L81 77Z" fill={horn} />
      <path d="M68 92C70 78 70 66 66 56C62 50 56 48 50 50L44 54L30 56L33 60L24 61L18 56L22 50L18 46L30 42L38 40C44 34 50 28 58 27C68 28 74 36 76 48C78 62 80 76 84 92Z" fill={fill} />
      <path d="M22 50L42 50L46 47" fill="none" />
      <path d="M26 50L27 53M31 50L32 53M36 50L37 53M27 56L28 53.5M32 56L33 53.5" fill="none" strokeWidth=".9" />
      <path d="M44 38C47 35 53 35 55 38C52 40 47 40 44 38Z" fill={eye} strokeWidth="1" />
      <path d="M49.5 35.6V40.4" strokeWidth="1.1" />
      <path d="M40 34C45 30 53 29 58 31" fill="none" strokeWidth="1.6" />
      <path d="M22 45.5L24 44.5" strokeWidth="1.2" />
      <path d="M58 58C62 64 64 72 64 82M54 62C57 68 58 76 58 84" fill="none" strokeWidth=".9" strokeOpacity=".6" />
    </g>
  );
}

function wappenArt(): Record<string, ReactNode> {
  const art: Record<string, ReactNode> = {};

  art['wappen-turm'] = (
    <Shield p="wappen-turm" field={PURPLE}>
      <path d="M50 30V13" stroke={INK} strokeWidth="1.6" />
      <path d="M50 13.5L63 17L50 21Z" fill={WAX} {...ch} strokeWidth="1.1" />
      <path d="M34 82V44H66V82Z" fill={PARCH} {...ch} />
      <path d="M30 45V29H37V34H41.5V29H48.5V34H51.5V29H58.5V34H63V29H70V45Z" fill={PARCH} {...ch} />
      <path d="M34 56H66M34 68H66M42 45V56M58 45V56M50 56V68M40 68V82M60 68V82" stroke="#bfa57a" strokeWidth="1" />
      <path d="M44 82V71A6 6 0 0 1 56 71V82Z" fill={VELVET} {...ch} />
      <path d="M47.5 53V49.5A2.5 2.5 0 0 1 52.5 49.5V53Z" fill={VELVET} />
      <path d="M22 84H78" stroke={INK} strokeWidth="2" />
    </Shield>
  );

  art['wappen-schluessel'] = (
    <Shield p="wappen-schluessel" field={WAX}>
      <g transform="rotate(35 50 50)" {...ch} fill={GOLD}>
        <path d="M47 32H53V64H62V69H57V73H62V78H53V80H47Z" />
        <path d={circ(50, 22, 11) + circ(50, 22, 4.5)} fillRule="evenodd" />
        <path d="M44 22H56M50 16V28" stroke={GOLD_D} strokeWidth="1.2" fill="none" />
        <rect x="44" y="33" width="12" height="3.5" rx="1" />
      </g>
    </Shield>
  );

  art['wappen-eule'] = (
    <Shield p="wappen-eule" field="#1d2550">
      <path d={[[24, 22], [76, 26], [70, 14], [28, 64]].map(([x, y]) => starPath(x, y, 2.2, 0.4, 5)).join('')} fill={GOLD_L} />
      <path d="M22 79C36 75 64 75 80 80" stroke="#6b4a26" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M50 30C64 30 69 44 68 58C67 70 60 78 50 78C40 78 33 70 32 58C31 44 36 30 50 30Z" fill="#b8925a" {...ch} />
      <path d="M33 36L35 22L44 31Z M67 36L65 22L56 31Z" fill="#b8925a" {...ch} />
      <path d="M50 52C58 52 61 60 60 66C59 72 55 75 50 75C45 75 41 72 40 66C39 60 42 52 50 52Z" fill="#efe0bb" {...ch} strokeWidth="1" />
      <path d="M45 60L47 62L49 60M51 60L53 62L55 60M47 67L49 69L51 67M51 67L53 69L55 67" stroke="#a07c46" strokeWidth=".9" fill="none" />
      <path d={circ(42.5, 42, 8) + circ(57.5, 42, 8)} fill="#efe0bb" {...ch} strokeWidth="1.1" />
      <path d={circ(42.5, 42, 4.8) + circ(57.5, 42, 4.8)} fill={GOLD} stroke={INK} strokeWidth=".9" />
      <path d={circ(42.5, 42, 2.3) + circ(57.5, 42, 2.3)} fill={INK} />
      <path d={circ(41.6, 41, .8) + circ(56.6, 41, .8)} fill="#fff" />
      <path d="M48 47H52L50 52Z" fill={GOLD_D} {...ch} strokeWidth=".8" />
      <path d="M44 78L43 81M47 78L47 81M53 78L53 81M56 78L57 81" stroke={GOLD_D} strokeWidth="1.6" strokeLinecap="round" />
    </Shield>
  );

  art['wappen-hirsch'] = (
    <Shield p="wappen-hirsch" field="#2f6a3e">
      <Dbl d="M45 46C40 39 36 31 36 20M38.5 33L29 29M36.5 25L28 19M36 20L39 12M55 46C60 39 64 31 64 20M61.5 33L71 29M63.5 25L72 19M64 20L61 12" w={2.8} c="#f1e2c0" />
      <path d="M44 50L31 44L36 53Z M56 50L69 44L64 53Z" fill="#a8662a" {...ch} />
      <path d="M43 48C43 43 57 43 57 48L56 66C55 74 52 78 50 78C48 78 45 74 44 66Z" fill="#b9773a" {...ch} />
      <path d="M46 62C46 58 54 58 54 62L53 72C52 76 48 76 47 72Z" fill="#e8c69a" />
      <ellipse cx="50" cy="74" rx="3" ry="2" fill={INK} />
      <path d={circ(46, 54, 1.3) + circ(54, 54, 1.3)} fill={INK} />
      <path d="M48 46.5H52" stroke="#f1e2c0" strokeWidth="1.4" strokeLinecap="round" />
    </Shield>
  );

  art['wappen-kogge'] = (
    <Shield p="wappen-kogge" field="#7fb2e0">
      <path d="M50 60V16" stroke={INK} strokeWidth="2" />
      <path d="M50 13L60 16L50 19Z" fill={WAX} {...ch} strokeWidth=".9" />
      <path d="M36 22H64C67 34 67 46 64 56H36C33 46 33 34 36 22Z" fill={PARCH} {...ch} />
      <path d="M50 22V56M35 39H65" stroke={WAX} strokeWidth="4" />
      <path d="M24 60H76L70 74H30Z" fill="#8a5a2b" {...ch} />
      <path d="M62 60V53H74V60Z" fill="#8a5a2b" {...ch} strokeWidth="1.1" />
      <path d="M27 65H73M29 70H71" stroke="#5a3518" strokeWidth=".9" />
      <path d="M10 74Q17 69 24 74T38 74T52 74T66 74T80 74T94 74V100H10Z" fill="#22468f" stroke={INK} strokeWidth="1.2" />
      <path d="M14 82Q20 78 26 82T38 82M50 86Q56 82 62 86T74 86" stroke="#bcd6f2" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </Shield>
  );

  art['wappen-lilie'] = (
    <Shield p="wappen-lilie" field="#2f5fbf">
      <path d="M22 13H78V46C78 66 64 79 50 87C36 79 22 66 22 46Z" fill="none" stroke={GOLD} strokeOpacity=".35" strokeWidth="1" />
      <Lily x={50} y={48} s={1.25} />
    </Shield>
  );

  art['wappen-sonne'] = (
    <Shield p="wappen-sonne" field={WAX}>
      <path d={times(8, (i) => `M${pt(16, i * 45 - 8, 50, 48)}L${pt(32, i * 45, 50, 48)}L${pt(16, i * 45 + 8, 50, 48)}Z`).join('')} fill={GOLD} {...ch} strokeWidth="1.1" />
      <path d={times(8, (i) => { const a = i * 45 + 22.5; return `M${pt(16, a - 7, 50, 48)}Q${pt(21, a - 7, 50, 48)} ${pt(24, a, 50, 48)}T${pt(29, a + 2, 50, 48)}Q${pt(22, a + 8, 50, 48)} ${pt(16, a + 7, 50, 48)}Z`; }).join('')} fill={GOLD_L} {...ch} strokeWidth="1.1" />
      <circle cx="50" cy="48" r="15" fill={GOLD} {...ch} />
      <circle cx="50" cy="48" r="10.5" fill="none" stroke={GOLD_D} strokeWidth="1.2" />
      <circle cx="46" cy="44" r="3" fill="#fff3c4" fillOpacity=".7" />
    </Shield>
  );

  art['wappen-mond'] = (
    <Shield p="wappen-mond" field="#1d2550">
      <path d={moon(50, 46, 26, 0.14)} transform="rotate(90 50 46)" fill="#e9ecf2" {...ch} />
      <path d={starPath(50, 42, 7.5, 0.42, 5) + starPath(30, 20, 4.5, 0.42, 5) + starPath(70, 20, 4.5, 0.42, 5)} fill={GOLD} {...ch} strokeWidth="1" />
    </Shield>
  );

  art['wappen-kelch'] = (
    <Shield p="wappen-kelch" field="#6b1e2e">
      <path d="M32 24H68C68 42 61 53 50 53C39 53 32 42 32 24Z" fill={GOLD} {...ch} />
      <ellipse cx="50" cy="24.5" rx="17" ry="3" fill="#8e1c26" {...ch} strokeWidth="1.1" />
      <path d="M34.5 33H65.5" stroke={GOLD_D} strokeWidth="1.4" />
      <Gem x={50} y={40} r={3.4} c={RUBY} cut="rhomb" />
      <path d="M47 53H53V70H47Z" fill={GOLD} {...ch} />
      <ellipse cx="50" cy="61" rx="5" ry="2.6" fill={GOLD} {...ch} strokeWidth="1.1" />
      <path d="M35 80C35 72 65 72 65 80Z" fill={GOLD} {...ch} />
      <path d="M37 28C38 38 41 44 45 48" stroke="#fff3c4" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeOpacity=".8" />
    </Shield>
  );

  art['wappen-rabe'] = (
    <Shield p="wappen-rabe" field={PARCH}>
      <path d="M20 84H80" stroke="#6b4a26" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 70L44 83M54 70L56 83M41 83H47M53 83H59" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 36L33 31C35 26 41 24 45.5 27C50 30 50.5 36 54.5 40C62 46 70 54 80 68L71 66L73 73C64 69 58 70 52 70C44 70 38.5 63 37.5 55C36.5 48 36.5 42 33.5 38.5Z" fill="#1d1a22" {...ch} />
      <path d="M44 47C52 49 60 55 66 63M47 54C53 56 58 60 61 65" stroke="#5a5468" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="39.5" cy="31" r="1.4" fill="#fff" />
      <path d="M22 36L33 33.6" stroke="#5a5468" strokeWidth=".8" />
    </Shield>
  );

  art['wappen-anker'] = (
    <Shield p="wappen-anker" field="#22468f">
      <Dbl d={circ(50, 21, 4.5)} w={2.6} c="#e9ecf2" />
      <Dbl d="M50 26V78M37 32H63M28 58C29 72 39 79 50 79C61 79 71 72 72 58" w={4.2} c="#e9ecf2" />
      <path d="M23 61L28 52L33.5 61Z M77 61L72 52L66.5 61Z" fill="#e9ecf2" {...ch} strokeWidth="1.2" />
      <path d="M42 40C56 44 44 52 56 56C46 60 56 66 46 70" stroke={GOLD} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Shield>
  );

  art['wappen-eiche'] = (
    <Shield p="wappen-eiche" field={PARCH}>
      <path d="M14 82C30 76 70 76 86 82V100H14Z" fill="#5e8a3a" stroke={INK} strokeWidth="1.2" />
      <path d="M45 80C47 72 47 64 45 56H55C53 64 53 72 55 80L60 82H40Z" fill="#7a5226" {...ch} />
      <path d={circ(50, 36, 17) + circ(35, 45, 11.5) + circ(65, 45, 11.5) + circ(41, 28, 10.5) + circ(59, 28, 10.5)} fill="#3f7a2a" stroke={INK} strokeWidth="3.4" />
      <path d={circ(50, 36, 17) + circ(35, 45, 11.5) + circ(65, 45, 11.5) + circ(41, 28, 10.5) + circ(59, 28, 10.5)} fill="#3f7a2a" />
      <path d={circ(44, 30, 5) + circ(58, 38, 4) + circ(36, 44, 3.5)} fill="#5f9a3e" />
      {[[40, 50], [60, 52], [50, 26]].map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y + 1.5} rx="2.3" ry="3" fill={GOLD} stroke={INK} strokeWidth=".8" />
          <path d={`M${x - 2.6} ${y}H${x + 2.6}`} stroke="#6b4a26" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </Shield>
  );

  // --- selten ---

  {
    const p = 'wappen-loewe';
    art[p] = (
      <Shield p={p} field={WAX} rim={`url(#${p}-gold)`}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <polygon points={star(50, 51, 31, 0.72, 18, 10)} fill="#d08a1e" {...ch} />
        <polygon points={star(50, 51, 24, 0.75, 18)} fill="#e8a32e" stroke="#9a5a0e" strokeWidth=".8" strokeLinejoin="round" />
        <path d={circ(37, 33, 4.5) + circ(63, 33, 4.5)} fill={GOLD} {...ch} />
        <path d="M37 42C37 31 63 31 63 42C63 51 61 62 50 70C39 62 37 51 37 42Z" fill={GOLD} {...ch} />
        <path d="M41 44L47 46M59 44L53 46" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        <path d={circ(44.5, 47.2, 1.1) + circ(55.5, 47.2, 1.1)} fill={INK} />
        <path d={circ(46, 58, 4.4) + circ(54, 58, 4.4)} fill="#ffe7a8" stroke="#9a5a0e" strokeWidth=".7" />
        <path d="M46 52.5H54L50 56.5Z" fill="#6e2a10" {...ch} strokeWidth="1" />
        <path d="M47 63Q50 66.5 53 63" fill="#c8323c" {...ch} strokeWidth="1" />
        <path d="M44 38L47 41M56 38L53 41M50 39V43" stroke="#9a5a0e" strokeWidth="1" strokeLinecap="round" />
      </Shield>
    );
  }

  {
    const p = 'wappen-schwerter';
    const sword = (a: number) => (
      <g key={a} transform={`rotate(${a} 50 52)`} {...ch} strokeWidth="1.1">
        <path d="M50 11L53.2 18V66H46.8V18Z" fill={`url(#${p}-silver)`} />
        <path d="M50 19V64" stroke="#8e97a8" strokeWidth="1" />
        <rect x="37" y="65" width="26" height="4.6" rx="2.2" fill={`url(#${p}-gold)`} />
        <rect x="47.6" y="69.6" width="4.8" height="11" fill="#5a2a14" />
        <circle cx="50" cy="83.6" r="3.2" fill={`url(#${p}-gold)`} />
      </g>
    );
    art[p] = (
      <Shield p={p} field="#2f5fbf" rim={`url(#${p}-silver)`}>
        <defs><Gold id={`${p}-gold`} /><Silver id={`${p}-silver`} /></defs>
        <path d="M0 0H50V50H0ZM50 50H100V100H50Z" fill="#1d2f6e" />
        {sword(-38)}
        {sword(38)}
        <path d={starPath(50, 22, 6, 0.42, 5)} fill={`url(#${p}-gold)`} {...ch} strokeWidth="1" />
      </Shield>
    );
  }

  {
    const p = 'wappen-narr';
    art[p] = (
      <Shield p={p} field={PURPLE} rim={`url(#${p}-gold)`}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d="M50 0H100V100H50Z" fill="#2f7a4a" />
        <path d="M34 44C29 33 21 27 15 29C22 31 27 36 29 44Z" fill={WAX} {...ch} />
        <path d="M66 44C71 33 79 27 85 29C78 31 73 36 71 44Z" fill="#3a6fd8" {...ch} />
        <path d="M36 44C38 31 45 20 50 15C55 20 62 31 64 44Z" fill={`url(#${p}-gold)`} {...ch} />
        <path d={circ(15, 29, 3) + circ(85, 29, 3) + circ(50, 14, 3)} fill={`url(#${p}-gold)`} {...ch} strokeWidth="1" />
        <path d="M36 52C36 45 64 45 64 52C64 59 61.5 62 59 63.5V71H41V63.5C38.5 62 36 59 36 52Z" fill={PARCH} {...ch} />
        <rect x="33" y="41" width="34" height="6" rx="2" fill={`url(#${p}-gold)`} {...ch} />
        <path d={circ(43.5, 54, 4) + circ(56.5, 54, 4)} fill={INK} />
        <path d="M50 58.5L52 62.5H48Z" fill={INK} />
        <path d="M44 66V71M47 66V71M50 66V71M53 66V71M56 66V71M41 66H59" stroke={INK} strokeWidth="1" />
        <path d="M30 80L70 86M30 86L70 80" stroke={PARCH} strokeWidth="4.6" strokeLinecap="round" />
        <path d="M30 80L70 86M30 86L70 80" stroke="#c9b48e" strokeWidth="1" strokeLinecap="round" />
        <Gem x={50} y={44} r={2} c={RUBY} cut="rhomb" />
      </Shield>
    );
  }

  {
    const p = 'wappen-wolf';
    art[p] = (
      <Shield p={p} field="#1d2550" rim={`url(#${p}-silver)`}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <circle cx="50" cy="46" r="27" fill="#c9d3e6" fillOpacity=".18" />
        <path d={[[22, 20], [78, 22], [24, 70], [80, 64]].map(([x, y]) => circ(x, y, 0.8)).join('')} fill="#fff" />
        <path d="M50 80L39 67C33 61 31 52 32 44L29 21L42 33C46 31 54 31 58 33L71 21L68 44C69 52 67 61 61 67Z" fill="#8e97a8" {...ch} />
        <path d="M33.5 26L40 32.6L35 38Z M66.5 26L60 32.6L65 38Z" fill="#4d5565" />
        <path d="M36 52L32 60L38 58L36 64L42 62M64 52L68 60L62 58L64 64L58 62" fill="#c9d0dc" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <path d="M43 55C43 49 57 49 57 55L55 67C53 72 47 72 45 67Z" fill="#e9ecf2" {...ch} strokeWidth="1.1" />
        <path d="M46.5 64H53.5L50 68Z" fill={INK} {...ch} strokeWidth="1" />
        <path d="M39 46L46 44L45.5 48ZM61 46L54 44L54.5 48Z" fill={GOLD} {...ch} strokeWidth=".9" />
        <path d="M50 36V48M47 38L50 42L53 38" stroke="#5d6575" strokeWidth="1" fill="none" strokeLinecap="round" />
      </Shield>
    );
  }

  {
    const p = 'wappen-lebensstern';
    art[p] = (
      <Shield p={p} field="#f6f4ef" rim={`url(#${p}-silver)`}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d={HEATER} fill="none" stroke="#d8232a" strokeWidth="14" />
        <path d="M18 16L30 8M30 16L42 8M58 8L70 16M70 8L82 16" stroke="#fff" strokeWidth="3.2" />
        <path d="M0 76L22 98M10 70L32 92M100 76L78 98M90 70L68 92" stroke="#fff" strokeWidth="3.2" />
        <StarOfLife x={50} y={49} s={1.75} />
      </Shield>
    );
  }

  {
    const p = 'wappen-falke';
    const wing = 'M45 44C37 41 28 35 21 23C25 24 27 26 29 26C27 22 26.5 18.5 27.5 15C30.5 20 32.5 23 34.5 24C33.5 20 33.5 16.5 35.5 13.5C37.5 20 40.5 27 46 35Z';
    art[p] = (
      <Shield p={p} field={GOLD} rim={`url(#${p}-silver)`}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <g fill="#2a2230" {...ch} strokeWidth="1.1">
          <path d={wing} />
          <path d={wing} transform="translate(100 0) scale(-1 1)" />
          <path d="M46 72L41 85L47 81L50 87L53 81L59 85L54 72Z" />
          <path d="M50 30C57 30 60 37 59 45L62 62L56 74H44L38 62L41 45C40 37 43 30 50 30Z" />
          <circle cx="50" cy="25.5" r="6.2" />
        </g>
        <path d="M44.5 24.5L38.5 27.6L44.8 28.6Z" fill={GOLD_D} {...ch} strokeWidth=".8" />
        <circle cx="47.6" cy="24" r="1.1" fill={GOLD_L} />
        <path d="M43 48L46.5 51L50 48L53.5 51L57 48M43 56L46.5 59L50 56L53.5 59L57 56" stroke="#5a5468" strokeWidth=".9" fill="none" />
        <path d="M43 66L36 74M57 66L64 74M34 73L36 74L35 77M66 73L64 74L65 77" stroke={WAX} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Shield>
    );
  }

  {
    const p = 'wappen-springer';
    art[p] = (
      <Shield p={p} field={PURPLE} rim={`url(#${p}-gold)`}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={times(10, (j) => times(10, (i) => ((i + j) % 2 ? `M${i * 10} ${j * 10}h10v10h-10Z` : '')).join('')).join('')} fill="#4f2d7e" />
        <path d="M32 84H68V78H32Z" fill={PARCH} {...ch} />
        <path d="M63 78H37C37 70 40 65 46 59C42 59 36 61 32 57C29.5 53 31.5 49 35.5 45.5C41 40.5 43.5 31 49.5 25L51.5 18.5L56 24.5C66 28.5 70.5 40.5 68.5 56.5C67.5 66.5 64.5 72 63 78Z" fill={PARCH} {...ch} />
        <path d="M56 26C62 30 66 38 66 48M53 30C58 34 61 40 62 48" stroke="#bfa57a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="47" cy="36" r="1.6" fill={INK} />
        <path d="M34.5 52.5L36.5 51.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M37 74H63" stroke="#bfa57a" strokeWidth="1.2" />
      </Shield>
    );
  }

  {
    const p = 'wappen-salm';
    art[p] = (
      <Shield p={p} field="#2f5fbf" rim={`url(#${p}-silver)`}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d="M10 74Q18 69 26 74T42 74T58 74T74 74T90 74M10 84Q18 79 26 84T42 84T58 84T74 84T90 84" stroke="#e9ecf2" strokeWidth="3" fill="none" />
        <path d="M42 41L49 32L56 41Z M48 58L44 65L54 60Z" fill="#c9d0dc" {...ch} strokeWidth="1.1" />
        <path d="M20 54C28 43 46 38 61 44C67 46 71 46 75 42L82 33L80 48L85 58L76 53C70 56 66 60 57 62C43 66 28 63 20 54Z" fill={`url(#${p}-silver)`} {...ch} />
        <path d="M30 46C28 50 28 56 31 60" stroke={INK} strokeWidth="1.1" fill="none" />
        <circle cx="25.5" cy="50" r="1.5" fill={INK} />
        <path d="M37 50Q40 53 37 56M43 49Q46 52 43 55M49 49Q52 52 49 55M55 49Q58 52 55 55M61 49Q64 52 61 55" stroke="#8e97a8" strokeWidth=".9" fill="none" />
        <path d={circ(46, 45.5, .9) + circ(58, 46, .9) + circ(52, 58, .9)} fill={WAX} />
      </Shield>
    );
  }

  {
    const p = 'wappen-harfe';
    art[p] = (
      <Shield p={p} field="#1e6b45" rim={`url(#${p}-gold)`}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d="M37 30L62 76M40 28L63 70M44 27L64 64M48 27L65 58M52 28L66 52M56 28L67 46M60 27L68 40" stroke="#e9ecf2" strokeWidth=".9" />
        <Dbl d="M34 82C30 64 31 44 34 26C42 22 50 32 58 28C64 25 68 21 72 22C74 24 72 30 70 34L60 82Z" w={3.6} c={GOLD} />
        <path d="M34 26C31 22 32 17 36 16C39 16 40 19 38 21" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M34 26C31 22 32 17 36 16C39 16 40 19 38 21" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M30 84H64" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M30 84H64" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        <path d={times(5, (i) => circ(33.6 - i * 0.3, 36 + i * 10, 1)).join('')} fill="#fff3c4" />
      </Shield>
    );
  }

  // --- episch ---

  const corners = (p: string, n: GemName) => (
    <>
      <GemG p={p} n={n} x={14} y={11.5} r={3.2} />
      <GemG p={p} n={n} x={86} y={11.5} r={3.2} />
      <GemG p={p} n={n} x={50} y={5.4} r={2.8} cut="rhomb" />
    </>
  );

  {
    const p = 'wappen-greif';
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Lin id={`${p}-field`} c={['#4a86e8', '#1f4aa8', '#0f2560']} />
            <Gold id={`${p}-gold`} />
            <GemDefs p={p} names={['ruby']} />
          </defs>
          <path d={circ(50, 50, 30)} fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="10" />
          <g {...ch} fill={`url(#${p}-gold)`}>
            <path d="M58 54C61 42 66 28 77 15C77 23 79 25 83 21C81 31 83 33 88 31C84 42 81 49 72 58Z" />
            <path d="M66 22L64 40M75 28L70 46M83 33L74 52" fill="none" strokeWidth="1" />
            <path d="M62 94C59 80 58 68 55 59C51 52 49 47 47 43C42 43 37 45 31 47L27 43L33 37C37 32 41 28 47 26L45 17L52 22C59 21 65 27 67 36C69 47 71 62 77 75L74 94Z" />
            <path d="M33 37C29 36.5 24 39 22 45C26 42 29.5 42 33 43Z" fill={`url(#${p}-gold)`} />
            <path d="M54 34C56 44 58 54 62 62M50 40C53 48 55 56 57 64M58 64C60 72 62 80 63 90" fill="none" strokeWidth="1" />
          </g>
          <path d="M38 33.5C40 31.5 44 31.5 45 34C43 35.6 40 35.6 38 33.5Z" fill="#ffd040" stroke={INK} strokeWidth=".9" />
          <circle cx="41.6" cy="33.6" r="1" fill={INK} />
          <path d="M37 52C40 56 46 58 50 56" stroke={GOLD_L} strokeOpacity=".5" strokeWidth="1" fill="none" />
        </Shield>
        {corners(p, 'ruby')}
      </g>
    );
  }

  {
    const p = 'wappen-einhorn';
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Lin id={`${p}-field`} c={['#8e55d0', '#4a2380', '#1b0e2e']} />
            <Gold id={`${p}-gold`} />
            <Lin id={`${p}-coat`} c={['#ffffff', '#f1e9f7', '#c9b8dc']} />
            <Lin id={`${p}-mane`} x2={1} y2={1} c={['#ffd1f0', '#c08af0', '#6a3aa0']} />
            <GemDefs p={p} names={['amethyst']} />
          </defs>
          <path d={[[22, 24], [30, 62], [80, 20], [72, 30]].map(([x, y]) => starPath(x, y, 2.4, 0.3, 4)).join('')} fill="#fff3c4" />
          <path d="M56 21C67 21 77 31 79 45C81 57 87 65 90 78C82 72 77 62 75 52C73 41 67 31 56 25Z" fill={`url(#${p}-mane)`} {...ch} />
          <path d="M70 96C66 80 64 66 60 56C57 50 51 48 45 50L31 57C27 59 22 57 23 52C24 46 30 42 36 38C41 33 45 29 50 25L54 21C62 21 70 29 72 39C74 53 80 70 84 90Z" fill={`url(#${p}-coat)`} {...ch} />
          <path d="M47 26L32 5L53 22Z" fill={`url(#${p}-gold)`} {...ch} strokeWidth="1.1" />
          <path d="M45 21L50 18.6M41 16L47 13.6M38 11L43 9" stroke="#8a5a0e" strokeWidth=".9" />
          <path d="M53 22L57 11L60 22Z" fill={`url(#${p}-coat)`} {...ch} strokeWidth="1.1" />
          <path d="M60 30C68 34 72 48 74 60M64 50C66 60 68 72 72 86" stroke={`url(#${p}-mane)`} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M42 35C44 33 48 33 49 35C47 36.6 44 36.6 42 35Z" fill="#4a2380" />
          <ellipse cx="28" cy="51.5" rx="1.4" ry="1" fill="#6a5a80" />
          <path d="M26 56C29 57 32 56 34 55" stroke="#8a7aa0" strokeWidth="1" fill="none" strokeLinecap="round" />
        </Shield>
        {corners(p, 'amethyst')}
      </g>
    );
  }

  {
    const p = 'wappen-lindwurm';
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Rad id={`${p}-field`} cx={0.4} cy={0.4} r={0.8} c={['#2f8a55', '#174a30', '#08200f']} />
            <Gold id={`${p}-gold`} />
            <Lin id={`${p}-skin`} c={['#ff6a5a', '#c8323c', '#5e0818']} />
            <Lin id={`${p}-fire`} x2={1} y2={0} c={['#fff3a0', '#ffa21e', '#e0431c']} />
            <GemDefs p={p} names={['emerald']} />
          </defs>
          <path d="M20 54C15 50 13 56 9 52C11 58 6 60 4 58C8 64 14 60 17 62C14 58 19 57 21 58Z" fill={`url(#${p}-fire)`} stroke="#a0101e" strokeWidth=".8" strokeLinejoin="round" />
          <DragonHead fill={`url(#${p}-skin)`} horn={`url(#${p}-gold)`} />
        </Shield>
        {corners(p, 'emerald')}
      </g>
    );
  }

  {
    const p = 'wappen-krake';
    const arms = [
      'M41 54C33 58 25 64 25 74C25 81 32 82 33 77',
      'M45 56C41 64 37 72 39 82C40 88 46 87 45 82',
      'M55 56C59 64 63 72 61 82C60 88 54 87 55 82',
      'M59 54C67 58 75 64 75 74C75 81 68 82 67 77',
      'M38 50C30 50 22 46 20 38C19 32 25 30 27 34',
      'M62 50C70 50 78 46 80 38C81 32 75 30 73 34',
    ].join('');
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Lin id={`${p}-field`} c={['#1a7a9a', '#0a3d5c', '#03121f']} />
            <Gold id={`${p}-gold`} />
            <Lin id={`${p}-skin`} c={['#e889c8', '#a33a8e', '#4a1050']} />
            <GemDefs p={p} names={['pearl']} />
          </defs>
          <path d={[[24, 22, 1.6], [30, 16, 1], [76, 20, 1.3], [70, 60, 1], [28, 88, 1.2]].map(([x, y, r]) => circ(x, y, r)).join('')} fill="none" stroke="#d6f6ff" strokeOpacity=".6" strokeWidth=".6" />
          <path d={arms} fill="none" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
          <path d={arms} fill="none" stroke={`url(#${p}-skin)`} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M50 16C63 16 69 27 68.5 39C68 48 62 54 58 56H42C38 54 32 48 31.5 39C31 27 37 16 50 16Z" fill={`url(#${p}-skin)`} {...ch} />
          <path d="M42 22C46 20 50 20 53 21" stroke="#f6c0e4" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeOpacity=".7" />
          <path d={circ(43, 43, 4.2) + circ(57, 43, 4.2)} fill="#ffd040" stroke={INK} strokeWidth="1" />
          <path d="M42.2 43H43.8M56.2 43H57.8" stroke={INK} strokeWidth="2.4" />
          <path d={[[27, 70], [41, 76], [59, 76], [73, 70], [24, 40], [76, 40]].map(([x, y]) => circ(x, y, 0.9)).join('')} fill="#f6c0e4" />
          <circle cx="50" cy="88" r="3" fill={`url(#${p}-pearl)`} stroke={INK} strokeWidth=".6" />
        </Shield>
        {corners(p, 'pearl')}
      </g>
    );
  }

  {
    const p = 'wappen-astrolabium';
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Rad id={`${p}-field`} cx={0.5} cy={0.45} r={0.7} c={['#3d2a8a', '#1a1a5c', '#080a24']} />
            <Gold id={`${p}-gold`} />
            <GemDefs p={p} names={['sapphire']} />
          </defs>
          <path d={times(24, (i) => circ(...xy(36 + ((i * 5) % 9), i * 37, 50, 50), i % 4 ? 0.4 : 0.7)).join('')} fill="#fff" fillOpacity=".8" />
          <circle cx="50" cy="50" r="27" fill="none" stroke={INK} strokeWidth="5" />
          <circle cx="50" cy="50" r="27" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="3.4" />
          <path d={times(36, (i) => `M${pt(25.4, i * 10)}L${pt(i % 3 ? 23.4 : 22, i * 10)}`).join('')} stroke={GOLD_D} strokeWidth=".7" />
          <g fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.6">
            <ellipse cx="50" cy="50" rx="21" ry="8" transform="rotate(-25 50 50)" />
            <ellipse cx="50" cy="50" rx="21" ry="8" transform="rotate(25 50 50)" />
            <circle cx="50" cy="50" r="14" />
          </g>
          <path d="M50 26V74M26 50H74" stroke={GOLD_D} strokeWidth=".7" />
          <polygon points={star(50, 50, 13, 0.3, 8, 22.5)} fill={`url(#${p}-gold)`} {...ch} strokeWidth=".8" />
          <path d="M50 50L66 34" stroke={WAX} strokeWidth="1.6" strokeLinecap="round" />
          <GemG p={p} n="sapphire" x={50} y={50} r={3.4} />
          <path d="M44 19.5A6 6 0 0 1 56 19.5" fill="none" stroke={INK} strokeWidth="4.4" />
          <path d="M44 19.5A6 6 0 0 1 56 19.5" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="2.6" />
        </Shield>
        {corners(p, 'sapphire')}
      </g>
    );
  }

  {
    const p = 'wappen-schwan';
    art[p] = (
      <g>
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <defs>
            <Lin id={`${p}-field`} c={['#9cc8f4', '#3a7bea', '#173e8e']} />
            <Gold id={`${p}-gold`} />
            <Lin id={`${p}-white`} c={['#ffffff', '#eef1f6', '#b8c2d4']} />
            <GemDefs p={p} names={['sapphire']} />
          </defs>
          <path d="M8 74Q16 70 24 74T40 74T56 74T72 74T88 74T104 74V100H8Z" fill="#173e8e" fillOpacity=".75" />
          <path d="M14 82Q20 79 26 82T38 82M56 86Q62 83 68 86T80 86" stroke="#cfe3ff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M40 60C33 52 32 42 37 35C41 30 44 26 42 22C40 18.5 35 18.5 33.5 22.5L26 27L33 28C35 27 37 27 37.4 29C38.5 33 33 39 33 48C33 54 35 58 38 61Z" fill={`url(#${p}-white)`} {...ch} />
          <path d="M29 68C29 60 39 56 51 58C59 59 65 58 71 52C75 48 81 50 83 56C85 64 79 74 65 76H40C34 76 29 73 29 68Z" fill={`url(#${p}-white)`} {...ch} />
          <path d="M50 62C58 63 66 62 74 56M48 67C56 68 64 67 72 62M52 72C58 72 64 71 68 68" stroke="#8e97a8" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M26 27L19.5 30L26.4 30.6Z" fill="#f39a1e" {...ch} strokeWidth=".9" />
          <path d="M33.5 22.5L29.5 26.5" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="36" cy="24.4" r="1" fill={INK} />
          <Crown x={36.5} y={47} s={0.32} fill={`url(#${p}-gold)`} />
        </Shield>
        {corners(p, 'sapphire')}
      </g>
    );
  }

  // --- legendär ---

  const rays = (p: string, n: number, cy = 50) => (
    <path d={times(n, (i) => `M${pt(18, i * (360 / n) - 2.6, 50, cy)}L${pt(i % 2 ? 58 : 72, i * (360 / n), 50, cy)}L${pt(18, i * (360 / n) + 2.6, 50, cy)}Z`).join('')} fill={`url(#${p}-ray)`} />
  );

  {
    const p = 'wappen-phoenix';
    const tips: [number, number][] = [[24, 3], [15, 6], [8, 12], [4, 21], [3, 31], [5, 41]];
    const wing = (
      <g>
        <path d={tips.map(([x, y], i) => quill(44, 46 + i * 0.6, x, y, 3.4 - i * 0.2)).join('')} fill={`url(#${p}-wing)`} stroke="#6e0e0e" strokeWidth=".6" strokeLinejoin="round" />
        <path d={tips.slice(0, 5).map(([x, y], i) => quill(45, 46 + i * 0.6, f(x + (45 - x) * 0.45), f(y + (46 - y) * 0.45), 2.8)).join('')} fill={`url(#${p}-gold)`} stroke="#7a4e0a" strokeWidth=".5" strokeLinejoin="round" />
      </g>
    );
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 50, 70]} c={[[0.2, GOLD_L, 0.9], [1, GOLD_L, 0]]} />
          <Rad id={`${p}-field`} cx={0.5} cy={0.6} r={0.7} c={['#a8202e', '#5a0a18', '#1b0610']} />
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-wing`} x1={1} y1={1} x2={0} y2={0} c={['#fff1a8', '#ffa21e', '#e8401e', '#a0101e']} />
          <Lin id={`${p}-fire`} c={['#fff1a8', '#ff9a1e', '#d8301e']} />
          <GemDefs p={p} names={['ruby', 'topaz']} />
        </defs>
        {rays(p, 28)}
        <Shield p={p} d={ORNATE} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <path d="M28 96C30 84 36 82 38 74C40 82 44 80 46 70C48 80 52 80 54 70C56 80 60 82 62 74C64 82 70 84 72 96Z" fill={`url(#${p}-fire)`} fillOpacity=".85" />
        </Shield>
        {wing}
        <g transform="translate(100 0) scale(-1 1)">{wing}</g>
        <path d="M50 66L42 88L47 84L50 92L53 84L58 88Z" fill={`url(#${p}-fire)`} stroke="#8e1010" strokeWidth=".7" strokeLinejoin="round" />
        <path d="M50 30C56 34 57.5 46 54.5 58C53.5 63 51.5 68 50 72C48.5 68 46.5 63 45.5 58C42.5 46 44 34 50 30Z" fill={`url(#${p}-fire)`} stroke="#8e1010" strokeWidth=".8" />
        <path d="M48 26C44 20 44 14 46 10C47 16 49 19 50 22C51 19 53 16 54 10C56 14 56 20 52 26Z M50 22C49 16 49 11 50 6C51 11 51 16 50 22Z" fill={`url(#${p}-wing)`} stroke="#8e1010" strokeWidth=".6" strokeLinejoin="round" />
        <circle cx="50" cy="28" r="4.6" fill="#ff9a1e" stroke="#8e1010" strokeWidth=".8" />
        <path d="M48.5 29H51.5L50 33Z" fill={GOLD} stroke={INK} strokeWidth=".5" />
        <path d={circ(48.3, 27.2, .7) + circ(51.7, 27.2, .7)} fill={INK} />
        <GemG p={p} n="ruby" x={50} y={44} r={3} cut="rhomb" />
        <GemG p={p} n="topaz" x={14} y={11.5} r={3.2} />
        <GemG p={p} n="topaz" x={86} y={11.5} r={3.2} />
        <GemG p={p} n="ruby" x={50} y={94} r={2.4} />
      </g>
    );
  }

  {
    const p = 'wappen-golddrache';
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 56, 66]} c={[[0.3, GOLD_L, 0.9], [1, GOLD_L, 0]]} />
          <Rad id={`${p}-field`} cx={0.5} cy={0.5} r={0.7} c={['#4a2a7a', '#1b0e2e', '#08040f']} />
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-horn`} c={['#fbf0d9', '#d8c9a8', '#8a7a5a']} />
          <GemDefs p={p} names={['ruby', 'emerald', 'sapphire']} />
        </defs>
        {rays(p, 24, 56)}
        <Shield p={p} d={SMALL} field={`url(#${p}-field)`} rim={`url(#${p}-gold)`}>
          <path d={times(14, (i) => circ(28 + ((i * 23) % 46), 38 + ((i * 17) % 50), 0.5)).join('')} fill={GOLD_L} fillOpacity=".7" />
          <g transform="translate(88.6 24.6) scale(-.7 .7)">
            <DragonHead fill={`url(#${p}-gold)`} horn={`url(#${p}-horn)`} eye="#ff4040" />
          </g>
        </Shield>
        <Crown x={50} y={31} s={1.05} fill={`url(#${p}-gold)`} gems={[EMERALD, RUBY, EMERALD]} />
        <GemG p={p} n="ruby" x={22} y={31} r={3} />
        <GemG p={p} n="ruby" x={78} y={31} r={3} />
        <GemG p={p} n="emerald" x={50} y={94} r={2.6} />
        <GemG p={p} n="sapphire" x={23} y={60} r={2.2} />
        <GemG p={p} n="sapphire" x={77} y={60} r={2.2} />
      </g>
    );
  }

  {
    const p = 'wappen-grosser-jakob';
    const sceptre = (a: number) => (
      <g key={a} transform={`rotate(${a} 50 60)`}>
        <rect x="48.4" y="20" width="3.2" height="76" rx="1.4" fill={`url(#${p}-gold)`} stroke={INK} strokeWidth=".8" />
        <path d={circ(50, 18, 3.6)} fill={`url(#${p}-ruby)`} stroke={INK} strokeWidth=".8" />
        <path d="M45 24H55" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M45 24H55" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    );
    art[p] = (
      <g>
        <defs>
          <Rad id={`${p}-ray`} at={[50, 58, 64]} c={[[0.3, GOLD_L, 0.95], [1, GOLD_L, 0]]} />
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-pur`} c={['#7a4ab8', PURPLE, VELVET]} />
          <GemDefs p={p} names={['ruby', 'sapphire', 'emerald']} />
        </defs>
        {rays(p, 16, 58)}
        {sceptre(-42)}
        {sceptre(42)}
        <Shield p={p} d={SMALL} field={`url(#${p}-gold)`} rim={`url(#${p}-gold)`}>
          <path d="M22 31H50V62H22ZM50 62H78V94H50Z" fill={`url(#${p}-pur)`} />
          <Crown x={36} y={54} s={0.5} fill={GOLD} gems={[RUBY, SAPPHIRE, RUBY]} />
          <Lily x={64} y={47} s={0.5} fill={PURPLE} sw={1.6} />
          <path d={starPath(37, 74, 8, 0.45, 8, 22.5)} fill={WAX} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <g transform="translate(64 76) rotate(30)" fill={GOLD} stroke={INK} strokeWidth="1">
            <path d={circ(0, -8, 4.4) + circ(0, -8, 1.8)} fillRule="evenodd" />
            <path d="M-1.4 -3.8H1.4V8H4.5V10.6H1.4V12H-1.4Z" />
          </g>
          <path d="M50 31V94M22 62H78" stroke={INK} strokeWidth="1.2" />
        </Shield>
        <GemG p={p} n="ruby" x={50} y={62} r={4.2} cut="rhomb" />
        <Crown x={50} y={31} s={1.15} fill={`url(#${p}-gold)`} gems={[SAPPHIRE, RUBY, SAPPHIRE]} />
        <GemG p={p} n="emerald" x={22} y={31} r={2.8} />
        <GemG p={p} n="emerald" x={78} y={31} r={2.8} />
      </g>
    );
  }

  return art;
}

// ---------------------------------------------------------------------------------------------
// Rückseiten — card backs (100×140)

/** Transforms an absolute path made only of M/L/C/Q/Z pairs: scale s, rotate deg, then move to (dx, dy). */
function tf(d: string, s: number, deg: number, dx: number, dy: number): string {
  const c = Math.cos((deg * Math.PI) / 180) * s;
  const sn = Math.sin((deg * Math.PI) / 180) * s;
  return d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, a: string, b: string) => {
    const x = Number(a);
    const y = Number(b);
    return `${nm(x * c - y * sn + dx)} ${nm(x * sn + y * c + dy)}`;
  });
}
/** Small one-piece fleur-de-lis outline, 20 units tall around (0, 0). */
const MINI_LILY = 'M0 -10C2.5 -7 3.5 -4 2.4 -1.2L3 -1.2C3.6 -4 6 -6 8 -4.6C9.6 -3.2 8.6 -.4 6.8 -.6C7.6 -1.6 6.8 -2.8 5.6 -2.2C4.6 -1.6 4 0 3.8 1.4L5 1.4L5 3.4L1.6 3.4C2 5.6 4 6.6 5.4 8.2C3.4 8 1.6 7 0 5.4C-1.6 7 -3.4 8 -5.4 8.2C-4 6.6 -2 5.6 -1.6 3.4L-5 3.4L-5 1.4L-3.8 1.4C-4 0 -4.6 -1.6 -5.6 -2.2C-6.8 -2.8 -7.6 -1.6 -6.8 -.6C-8.6 -.4 -9.6 -3.2 -8 -4.6C-6 -6 -3.6 -4 -3 -1.2L-2.4 -1.2C-3.5 -4 -2.5 -7 0 -10Z';
/** Lobed oak leaf, 18 units tall around (0, 0), stalk at the bottom. */
const OAK_LEAF = 'M0 -9C2.4 -8.4 2.6 -5.6 1.6 -4.6C4 -4.6 4.6 -1.6 2.6 -.6C4.8 0 4.6 3.4 2.2 3.4C3 5.6 1.6 7.6 .3 8L.3 10L-.3 10L-.3 8C-1.6 7.6 -3 5.6 -2.2 3.4C-4.6 3.4 -4.8 0 -2.6 -.6C-4.6 -1.6 -4 -4.6 -1.6 -4.6C-2.6 -5.6 -2.4 -8.4 0 -9Z';
/** Pointed-arch window (lancet) between y0 (apex) and y1, centred at x with half-width w. */
const lancet = (x: number, y0: number, y1: number, w: number) =>
  `M${nm(x - w)} ${nm(y1)}L${nm(x - w)} ${nm(y0 + w * 1.2)}C${nm(x - w)} ${nm(y0 + w * 0.4)} ${nm(x - w * 0.4)} ${nm(y0)} ${nm(x)} ${nm(y0 - w * 0.3)}C${nm(x + w * 0.4)} ${nm(y0)} ${nm(x + w)} ${nm(y0 + w * 0.4)} ${nm(x + w)} ${nm(y0 + w * 1.2)}L${nm(x + w)} ${nm(y1)}Z`;

/** Card back: outer frame colour, inner field `bg`, clipped pattern children, a hairline and the emblem on top. */
function Back({ p, frame, bg, line, children, emblem }: { p: string; frame: string; bg: string; line: string; children?: ReactNode; emblem?: ReactNode }) {
  return (
    <g>
      <defs><clipPath id={`${p}-clip`}><rect x="5" y="5" width="90" height="130" rx="4" /></clipPath></defs>
      <rect width="100" height="140" rx="7" fill={frame} />
      <rect x="5" y="5" width="90" height="130" rx="4" fill={bg} />
      <g clipPath={`url(#${p}-clip)`}>{children}</g>
      <rect x="5" y="5" width="90" height="130" rx="4" fill="none" stroke={line} strokeWidth="1.2" />
      <rect x=".6" y=".6" width="98.8" height="138.8" rx="6.5" fill="none" stroke={INK} strokeOpacity=".55" strokeWidth="1.2" />
      {emblem}
    </g>
  );
}

/** Grid of positions (x0 + i*dx, y0 + j*dy), every other row shifted by dx/2 when `stagger`. */
function grid(x0: number, y0: number, dx: number, dy: number, cols: number, rows: number, stagger = false): [number, number][] {
  const out: [number, number][] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push([x0 + i * dx + (stagger && j % 2 ? dx / 2 : 0), y0 + j * dy]);
  return out;
}
const awayFrom = (cx: number, cy: number, rx: number, ry: number) => ([x, y]: [number, number]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1;

function rueckseiteArt(): Record<string, ReactNode> {
  const art: Record<string, ReactNode> = {};
  const diag = (step: number) => times(Math.ceil(240 / step), (i) => `M${i * step - 140} 0L${i * step} 140`).join('');
  const antiDiag = (step: number) => times(Math.ceil(240 / step), (i) => `M${i * step} 0L${i * step - 140} 140`).join('');

  art['rueckseite-rauten'] = (
    <Back p="rueckseite-rauten" frame={PLUM} bg={PURPLE} line={GOLD}
      emblem={<g>
        <path d="M50 46L74 70L50 94L26 70Z" fill={PLUM} stroke={GOLD} strokeWidth="1.6" />
        <path d="M50 54L66 70L50 86L34 70Z" fill="none" stroke={GOLD} strokeOpacity=".6" strokeWidth=".8" />
        <path d="M50 61L59 70L50 79L41 70Z" fill={GOLD} />
      </g>}>
      <path d={diag(10) + antiDiag(10)} stroke={GOLD} strokeOpacity=".4" strokeWidth=".7" />
      <path d={grid(10, 5, 10, 10, 9, 14).map(([x, y]) => circ(x, y, 0.8)).join('')} fill={GOLD} fillOpacity=".55" />
    </Back>
  );

  art['rueckseite-streifen'] = (
    <Back p="rueckseite-streifen" frame="#5a1018" bg={WAX} line={PARCH}
      emblem={<g>
        <circle cx="50" cy="70" r="17" fill={WAX} stroke={PARCH} strokeWidth="2.4" />
        <circle cx="50" cy="70" r="13.5" fill="none" stroke={PARCH} strokeWidth=".8" />
        <Crown x={50} y={77} s={0.5} fill={PARCH} gems={[WAX, WAX, WAX]} ball={PARCH} />
      </g>}>
      <path d={diag(12)} stroke={PARCH} strokeOpacity=".85" strokeWidth="4" />
    </Back>
  );

  art['rueckseite-schachbrett'] = (
    <Back p="rueckseite-schachbrett" frame="#141a33" bg="#2c3c72" line="#c9d3e6"
      emblem={<g>
        <circle cx="50" cy="70" r="17" fill="#e9e1cc" stroke="#141a33" strokeWidth="1.6" />
        <path d="M41 82V78H59V82Z M44 78L45 67H55L56 78Z M42 67V59H45.5V62H48.3V59H51.7V62H54.5V59H58V67Z" fill="#141a33" />
      </g>}>
      <path d={grid(5, 5, 10, 10, 9, 13).filter((_, k) => (k % 9 + Math.floor(k / 9)) % 2 === 0).map(([x, y]) => `M${x} ${y}h10v10h-10Z`).join('')} fill="#141a33" />
    </Back>
  );

  art['rueckseite-tupfen'] = (
    <Back p="rueckseite-tupfen" frame="#0e3a24" bg="#1e6b45" line={GOLD}
      emblem={<g>
        <circle cx="50" cy="70" r="15" fill="#0e3a24" stroke={GOLD} strokeWidth="1.6" />
        <path d={[0, 90, 180, 270].map((a) => circ(...xy(5, a, 50, 70), 5)).join('')} fill={GOLD} stroke="#0e3a24" strokeWidth=".8" />
        <circle cx="50" cy="70" r="2.4" fill="#0e3a24" />
      </g>}>
      <path d={grid(9, 9, 12, 10.5, 8, 13, true).filter(awayFrom(50, 70, 21, 21)).map(([x, y]) => circ(x, y, 1.7)).join('')} fill={PARCH} fillOpacity=".55" />
    </Back>
  );

  art['rueckseite-wellen'] = (
    <Back p="rueckseite-wellen" frame="#0f2448" bg="#22468f" line="#bcd6f2"
      emblem={<g>
        <circle cx="50" cy="70" r="16" fill="#e9f2fc" stroke="#0f2448" strokeWidth="1.6" />
        <path d="M37 66q3.25 -4 6.5 0t6.5 0t6.5 0t6.5 0M37 73q3.25 -4 6.5 0t6.5 0t6.5 0t6.5 0" fill="none" stroke="#22468f" strokeWidth="2" strokeLinecap="round" />
        <path d="M44 60A6 6 0 0 1 56 60Z" fill={GOLD} />
      </g>}>
      <path d={times(17, (j) => `M${j % 2 ? -6.25 : 0} ${4 + j * 8.5}q6.25 -5 12.5 0` + 't12.5 0'.repeat(8)).join('')} fill="none" stroke="#bcd6f2" strokeOpacity=".5" strokeWidth="1.3" />
    </Back>
  );

  art['rueckseite-schuppen'] = (
    <Back p="rueckseite-schuppen" frame="#1c2a40" bg="#2f4a6e" line="#c9d3e6"
      emblem={<g>
        <ellipse cx="50" cy="70" rx="20" ry="13" fill="#1c2a40" stroke="#c9d3e6" strokeWidth="1.4" />
        <path d="M34 70C40 62 52 61 60 66L67 61L66 70L67 79L60 74C52 79 40 78 34 70Z" fill="#c9d3e6" />
        <circle cx="39.5" cy="69" r="1.2" fill="#1c2a40" />
      </g>}>
      <path d={times(20, (j) => `M${j % 2 ? 0 : -5} ${2 + j * 7}` + 'a5 5 0 0 0 10 0'.repeat(11)).join('')} fill="none" stroke="#c9d3e6" strokeOpacity=".45" strokeWidth=".9" />
    </Back>
  );

  art['rueckseite-sternenzelt'] = (
    <Back p="rueckseite-sternenzelt" frame="#0b1030" bg="#1d2560" line={GOLD}
      emblem={<g>
        <circle cx="50" cy="70" r="16" fill="#0b1030" stroke={GOLD} strokeWidth="1.4" />
        <path d={starPath(50, 70, 13, 0.4, 8)} fill={GOLD} />
        <circle cx="50" cy="70" r="3" fill="#0b1030" />
      </g>}>
      <path d={times(5, (i) => `M${10 + i * 20} 0h10v140h-10Z`).join('')} fill="#141a4a" />
      <path d={grid(15, 15, 20, 18, 5, 7, true).filter(awayFrom(50, 70, 22, 22)).map(([x, y]) => starPath(x, y, 3, 0.3, 4)).join('')} fill={GOLD_L} fillOpacity=".85" />
    </Back>
  );

  art['rueckseite-tartan'] = (
    <Back p="rueckseite-tartan" frame="#0f2a1e" bg="#1f5a3c" line={GOLD}
      emblem={<g>
        <circle cx="50" cy="70" r="15" fill="#0f2a1e" stroke={GOLD} strokeWidth="1.6" />
        <path d="M41 61L59 79M59 61L41 79" stroke={WAX} strokeWidth="4" strokeLinecap="round" />
      </g>}>
      <path d={times(5, (i) => `M0 ${8 + i * 28}h100v12h-100Z`).join('') + times(4, (i) => `M${6 + i * 28} 0v140h12v-140Z`).join('')} fill="#0d1f3a" fillOpacity=".5" />
      <path d={times(5, (i) => `M0 ${14 + i * 28}H100`).join('') + times(4, (i) => `M${12 + i * 28} 0V140`).join('')} stroke={WAX} strokeWidth="1.2" />
      <path d={times(5, (i) => `M0 ${23 + i * 28}H100`).join('') + times(4, (i) => `M${25 + i * 28} 0V140`).join('')} stroke={GOLD} strokeOpacity=".7" strokeWidth=".5" />
    </Back>
  );

  art['rueckseite-mauer'] = (
    <Back p="rueckseite-mauer" frame="#34313c" bg="#6d6a75" line="#c9c4d4"
      emblem={<g>
        <path d="M36 88V64C36 52 64 52 64 64V88Z" fill="#2a2730" stroke={PARCH} strokeWidth="1.8" />
        <path d="M40 66H60M40 72H60M40 78H60M40 84H60M44 58V88M50 56V88M56 58V88" stroke="#8a8494" strokeWidth=".9" />
      </g>}>
      <path d={times(20, (j) => `M0 ${j * 7}H100` + times(8, (i) => `M${i * 14 + (j % 2 ? 7 : 0)} ${j * 7}v7`).join('')).join('')} stroke="#46434f" strokeWidth=".9" />
      <path d={times(20, (j) => `M0 ${j * 7 + 0.9}H100`).join('')} stroke="#8d8996" strokeOpacity=".5" strokeWidth=".4" />
    </Back>
  );

  art['rueckseite-zickzack'] = (
    <Back p="rueckseite-zickzack" frame="#2a0e12" bg="#4a1420" line={GOLD}
      emblem={<g>
        <path d="M50 50L70 70L50 90L30 70Z" fill="#2a0e12" stroke={GOLD} strokeWidth="1.6" />
        <Crown x={50} y={76} s={0.42} fill={GOLD} gems={[WAX, WAX, WAX]} />
      </g>}>
      <path d={times(8, (j) => `M0 ${6 + j * 18}` + 'l10 -6l10 6'.repeat(5)).join('')} fill="none" stroke={GOLD} strokeOpacity=".75" strokeWidth="2" />
      <path d={times(8, (j) => `M0 ${15 + j * 18}` + 'l10 -6l10 6'.repeat(5)).join('')} fill="none" stroke={WAX} strokeWidth="2" />
    </Back>
  );

  const pattee = (x: number, y: number, r: number) => {
    const k = r * 0.32;
    return `M${nm(x - k)} ${nm(y - r)}H${nm(x + k)}L${nm(x + k * 0.4)} ${nm(y - k * 0.4)}L${nm(x + r)} ${nm(y - k)}V${nm(y + k)}L${nm(x + k * 0.4)} ${nm(y + k * 0.4)}L${nm(x + k)} ${nm(y + r)}H${nm(x - k)}L${nm(x - k * 0.4)} ${nm(y + k * 0.4)}L${nm(x - r)} ${nm(y + k)}V${nm(y - k)}L${nm(x - k * 0.4)} ${nm(y - k * 0.4)}Z`;
  };
  art['rueckseite-kreuze'] = (
    <Back p="rueckseite-kreuze" frame="#7a1a20" bg={PARCH} line={WAX}
      emblem={<g>
        <circle cx="50" cy="70" r="16" fill={WAX} stroke="#7a1a20" strokeWidth="1.4" />
        <path d={pattee(50, 70, 11)} fill={GOLD} stroke="#7a1a20" strokeWidth=".8" strokeLinejoin="round" />
      </g>}>
      <path d={grid(14, 14, 18, 16, 5, 8, true).filter(awayFrom(50, 70, 22, 22)).map(([x, y]) => pattee(x, y, 4)).join('')} fill={WAX} fillOpacity=".7" />
    </Back>
  );

  // --- selten ---

  {
    const p = 'rueckseite-lilien';
    art[p] = (
      <Back p={p} frame="#102a6a" bg="#2f5fbf" line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="19" fill="#102a6a" stroke={`url(#${p}-gold)`} strokeWidth="2.4" />
          <circle cx="50" cy="70" r="15.6" fill="none" stroke={GOLD} strokeOpacity=".5" strokeWidth=".7" />
          <Lily x={50} y={70} s={0.6} fill={`url(#${p}-gold)`} sw={1.6} />
        </g>}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={[[24, 20], [76, 20], [50, 34], [22, 54], [78, 54], [22, 88], [78, 88], [50, 106], [24, 120], [76, 120]].map(([x, y]) => tf(MINI_LILY, 0.85, 0, x, y)).join('')} fill={GOLD} fillOpacity=".8" />
        <rect x="8.5" y="8.5" width="83" height="123" rx="2.5" fill="none" stroke={GOLD} strokeOpacity=".6" strokeWidth=".7" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-arabeske';
    art[p] = (
      <Back p={p} frame="#082424" bg="#11504e" line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="18" fill="#082424" stroke={`url(#${p}-gold)`} strokeWidth="2" />
          <path d={starPath(50, 70, 15, 0.72, 8, 22.5)} fill={`url(#${p}-gold)`} stroke="#5a3a06" strokeWidth=".6" strokeLinejoin="round" />
          <path d={starPath(50, 70, 9, 0.7, 8)} fill="#11504e" stroke="#5a3a06" strokeWidth=".6" />
          <circle cx="50" cy="70" r="3" fill={`url(#${p}-silver)`} />
        </g>}>
        <defs><Gold id={`${p}-gold`} /><Silver id={`${p}-silver`} /></defs>
        <path d={[...grid(0, 0, 20, 20, 6, 8), ...grid(10, 10, 20, 20, 5, 7)].map(([x, y]) => circ(x, y, 10)).join('')} fill="none" stroke={`url(#${p}-silver)`} strokeOpacity=".55" strokeWidth=".8" />
        <path d={[...grid(10, 0, 20, 20, 5, 8), ...grid(0, 10, 20, 20, 6, 7)].map(([x, y]) => `M${x} ${y - 2.2}L${x + 2.2} ${y}L${x} ${y + 2.2}L${x - 2.2} ${y}Z`).join('')} fill={GOLD} fillOpacity=".75" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-rosette';
    const cols = [RUBY, SAPPHIRE];
    art[p] = (
      <Back p={p} frame={VELVET} bg={PURPLE} line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="27" fill={NIGHT} stroke={`url(#${p}-gold)`} strokeWidth="2.6" />
          {times(12, (i) => <path key={i} d={circ(...xy(19, i * 30, 50, 70), 6.2)} fill={cols[i % 2]} stroke="#120a1f" strokeWidth="1.2" />)}
          <path d={times(12, (i) => `M${pt(9, i * 30, 50, 70)}L${pt(25.5, i * 30 + 15, 50, 70)}`).join('')} stroke={`url(#${p}-gold)`} strokeWidth="1.1" />
          <path d={times(6, (i) => circ(...xy(5, i * 60, 50, 70), 4.2)).join('')} fill={EMERALD} stroke="#120a1f" strokeWidth="1" />
          <circle cx="50" cy="70" r="3.4" fill={`url(#${p}-gold)`} stroke="#120a1f" strokeWidth=".8" />
          <path d={arc(23, 300, 400, 50, 70)} fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
        </g>}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={grid(14, 14, 18, 18, 5, 8, true).filter(awayFrom(50, 70, 32, 32)).map(([x, y]) => starPath(x, y, 4, 0.35, 4)).join('')} fill={GOLD} fillOpacity=".45" />
        <path d={grid(23, 23, 18, 18, 4, 7, true).filter(awayFrom(50, 70, 32, 32)).map(([x, y]) => circ(x, y, 1)).join('')} fill={GOLD} fillOpacity=".3" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-strahlenkranz';
    art[p] = (
      <Back p={p} frame={VELVET} bg="#2c1650" line={`url(#${p}-silver)`}
        emblem={<g>
          <path d={times(16, (i) => { const a = i * 22.5; return `M${pt(13, a - 7, 50, 70)}Q${pt(17, a - 4, 50, 70)} ${pt(19.5, a, 50, 70)}Q${pt(17, a + 4, 50, 70)} ${pt(13, a + 7, 50, 70)}Z`; }).join('')} fill={`url(#${p}-gold)`} stroke="#5a3a06" strokeWidth=".6" />
          <circle cx="50" cy="70" r="14" fill={`url(#${p}-gold)`} stroke={`url(#${p}-silver)`} strokeWidth="2" />
          <circle cx="50" cy="70" r="9" fill="none" stroke="#8a5a0e" strokeWidth=".8" />
          <circle cx="46.5" cy="66.5" r="3" fill="#fff" fillOpacity=".45" />
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} /><Silver id={`${p}-silver`} />
          <Rad id={`${p}-ray`} at={[50, 70, 80]} c={[[0, GOLD_L, 0.75], [1, GOLD, 0.15]]} />
        </defs>
        <path d={times(24, (i) => `M50 70L${pt(110, i * 15 - 3.5, 50, 70)}L${pt(110, i * 15 + 3.5, 50, 70)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <rect x="9" y="9" width="82" height="122" rx="2" fill="none" stroke={`url(#${p}-silver)`} strokeOpacity=".7" strokeWidth=".8" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-lebensstern';
    const band = (y: number) => times(10, (i) => `M${i * 12 - 10} ${y + 26}L${i * 12 + 4} ${y}H${i * 12 + 10}L${i * 12 - 4} ${y + 26}Z`).join('');
    art[p] = (
      <Back p={p} frame="#d8232a" bg="#fbfbfb" line={`url(#${p}-silver)`}
        emblem={<g>
          <circle cx="50" cy="70" r="22" fill="#fff" stroke={`url(#${p}-silver)`} strokeWidth="2.6" />
          <circle cx="50" cy="70" r="23.6" fill="none" stroke="#5d6575" strokeWidth=".5" />
          <StarOfLife x={50} y={70} s={1.55} />
          {[[11, 11], [89, 11], [11, 129], [89, 129]].map(([x, y]) => <Gem key={x * y} x={x} y={y} r={2.3} c="#3a8cff" />)}
        </g>}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d={band(5) + band(109)} fill="#d8232a" />
        <path d="M5 31.5H95M5 108.5H95" stroke="#5d6575" strokeWidth=".6" />
        <path d="M5 40H95M5 100H95" stroke="#d8232a" strokeWidth="2" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-windrose';
    const big = [0, 90, 180, 270];
    const pts = (r: number, a: number, w: number) => [`M50 70L${pt(w, a - 45, 50, 70)}L${pt(r, a, 50, 70)}Z`, `M50 70L${pt(w, a + 45, 50, 70)}L${pt(r, a, 50, 70)}Z`];
    art[p] = (
      <Back p={p} frame="#5a3a1a" bg="#ead8b0" line={`url(#${p}-gold)`}
        emblem={<g strokeLinejoin="round">
          <circle cx="50" cy="70" r="22" fill="none" stroke="#5a3a1a" strokeWidth=".8" />
          <circle cx="50" cy="70" r="19.5" fill="none" stroke="#5a3a1a" strokeWidth=".5" strokeDasharray="1 1.5" />
          <path d={times(8, (i) => pts(14, i * 45 + 22.5, 2.6)[0] + pts(14, i * 45 + 22.5, 2.6)[1]).join('')} fill="#7a6a4a" stroke="#3a2a10" strokeWidth=".4" />
          <path d={[45, 135, 225, 315].map((a) => pts(19, a, 4)[0]).join('')} fill={WAX} stroke="#3a2a10" strokeWidth=".5" />
          <path d={[45, 135, 225, 315].map((a) => pts(19, a, 4)[1]).join('')} fill="#f3b0b0" stroke="#3a2a10" strokeWidth=".5" />
          <path d={big.map((a) => pts(28, a, 5.5)[0]).join('')} fill="#1d2f6e" stroke="#2a1a10" strokeWidth=".6" />
          <path d={big.map((a) => pts(28, a, 5.5)[1]).join('')} fill={`url(#${p}-gold)`} stroke="#2a1a10" strokeWidth=".6" />
          <circle cx="50" cy="70" r="3" fill={`url(#${p}-gold)`} stroke="#2a1a10" strokeWidth=".6" />
          <path d="M50 37.5L47.5 33.5H52.5Z" fill={WAX} />
        </g>}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={times(16, (i) => `M50 70L${pt(110, i * 22.5, 50, 70)}`).join('')} stroke="#7a5a30" strokeOpacity=".3" strokeWidth=".5" />
        <path d="M5 30Q50 22 95 30M5 110Q50 118 95 110M30 5Q22 70 30 135M70 5Q78 70 70 135" fill="none" stroke="#7a5a30" strokeOpacity=".35" strokeWidth=".6" />
        <path d="M12 120q4 -3 8 0t8 0M72 22q4 -3 8 0t8 0M70 126q4 -3 8 0" fill="none" stroke="#3a6a9a" strokeOpacity=".6" strokeWidth=".8" />
        <rect x="8" y="8" width="84" height="124" rx="2" fill="none" stroke="#5a3a1a" strokeOpacity=".5" strokeWidth=".6" strokeDasharray="3 2" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-harlekin';
    const cells = grid(0, 0, 20, 28, 6, 6).concat(grid(10, 14, 20, 28, 5, 5));
    const diamond = ([x, y]: [number, number]) => `M${x} ${y - 14}l10 14l-10 14l-10 -14Z`;
    art[p] = (
      <Back p={p} frame={VELVET} bg={WAX} line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="19" fill={VELVET} stroke={`url(#${p}-gold)`} strokeWidth="2.2" />
          <path d="M38 74C34 66 32 62 30 58C35 60 38 64 41 70Z" fill={WAX} {...ch} strokeWidth="1" />
          <path d="M62 74C66 66 68 62 70 58C65 60 62 64 59 70Z" fill="#2f8a55" {...ch} strokeWidth="1" />
          <path d="M40 75C42 66 46 58 50 52C54 58 58 66 60 75Z" fill={`url(#${p}-gold)`} {...ch} strokeWidth="1" />
          <rect x="37" y="74" width="26" height="5" rx="1.6" fill={`url(#${p}-gold)`} {...ch} strokeWidth="1" />
          <path d={circ(30, 58, 2.2) + circ(70, 58, 2.2) + circ(50, 51, 2.2)} fill={`url(#${p}-gold)`} {...ch} strokeWidth=".8" />
        </g>}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={cells.filter((_, k) => k % 3 === 0).map(diamond).join('')} fill="#2f8a55" />
        <path d={cells.filter((_, k) => k % 3 === 1).map(diamond).join('')} fill={GOLD} />
        <path d={diag(0.1).slice(0, 0) + times(12, (i) => `M${i * 20 - 120} 0l100 140M${i * 20} 0l-100 140`).join('')} stroke={INK} strokeOpacity=".55" strokeWidth=".8" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-eichenlaub';
    const spots: [number, number][] = [[20, 18], [52, 22], [80, 16], [24, 52], [78, 56], [20, 92], [80, 90], [26, 122], [56, 120], [82, 124]];
    art[p] = (
      <Back p={p} frame="#1c3418" bg="#2f5a26" line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="19" fill="#1c3418" stroke={`url(#${p}-gold)`} strokeWidth="2" />
          <path d={times(8, (i) => tf(OAK_LEAF, 0.6, i * 45 + 90, ...xy(14, i * 45, 50, 70))).join('')} fill="#7fb05a" stroke="#1c3418" strokeWidth=".5" />
          <ellipse cx="50" cy="72" rx="5" ry="6.4" fill={`url(#${p}-gold)`} stroke={INK} strokeWidth=".8" />
          <path d="M44.5 67.5C44.5 63 55.5 63 55.5 67.5Z" fill="#7a5226" stroke={INK} strokeWidth=".8" />
          <path d="M50 63.5V60.5" stroke="#7a5226" strokeWidth="1.4" strokeLinecap="round" />
        </g>}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={spots.map(([x, y], k) => tf(OAK_LEAF, 0.9, (k * 67) % 360, x, y)).join('')} fill="#4a8a3a" fillOpacity=".7" />
        <path d={spots.map(([x, y], k) => { const [ax, ay] = xy(10, (k * 67) % 360 + 140, x, y); return circ(ax, ay, 2) + `M${nm(ax - 2.2)} ${nm(ay - 1)}H${nm(ax + 2.2)}`; }).join('')} fill={GOLD} fillOpacity=".75" stroke="#7a5226" strokeWidth=".6" />
      </Back>
    );
  }

  // --- episch ---

  {
    const p = 'rueckseite-drachenschuppe';
    art[p] = (
      <Back p={p} frame={`url(#${p}-gold)`} bg="#2a0610" line="#ffd77a"
        emblem={<g>
          <ellipse cx="50" cy="70" rx="22" ry="14" fill={`url(#${p}-gold)`} stroke={INK} strokeWidth="1" />
          <ellipse cx="50" cy="70" rx="18.5" ry="11" fill={`url(#${p}-eye)`} stroke="#5a1a04" strokeWidth=".8" />
          <ellipse cx="50" cy="70" rx="2.6" ry="10" fill={NIGHT} />
          <path d="M40 64C44 61 48 60.5 51 61" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <circle cx="44" cy="65.5" r="1.6" fill="#fff" fillOpacity=".85" />
          {[[50, 52], [50, 88], [24, 70], [76, 70]].map(([x, y]) => <GemG key={x * y} p={p} n="ruby" x={x} y={y} r={3} cut={x === 50 ? 'rhomb' : 'round'} />)}
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-scale`} c={['#ff7a6a', '#b3202c', '#4a0612']} />
          <Rad id={`${p}-eye`} c={['#fff3a0', '#f39a1e', '#8e2a06']} />
          <GemDefs p={p} names={['ruby']} />
        </defs>
        {times(15, (j) => (
          <path key={j} d={times(7, (i) => `M${nm(i * 16 - (j % 2 ? 8 : 0))} ${j * 9}c0 11 16 11 16 0Z`).join('')} fill={`url(#${p}-scale)`} stroke="#2a0408" strokeWidth=".5" />
        ))}
      </Back>
    );
  }

  {
    const p = 'rueckseite-sternbilder';
    const cons: [number, number][][] = [[[16, 18], [26, 14], [34, 22], [30, 32], [42, 36]], [[64, 112], [72, 104], [84, 108], [80, 120], [70, 124]], [[70, 18], [80, 26], [76, 36], [88, 40]], [[14, 100], [22, 112], [18, 124]]];
    art[p] = (
      <Back p={p} frame={`url(#${p}-gold)`} bg={`url(#${p}-sky)`} line={GOLD_L}
        emblem={<g>
          <circle cx="50" cy="70" r="19" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="2.4" />
          <circle cx="50" cy="70" r="15.5" fill="#0d0a2e" fillOpacity=".7" stroke={GOLD} strokeOpacity=".6" strokeWidth=".6" />
          <path d={times(24, (i) => `M${pt(19, i * 15, 50, 70)}L${pt(i % 2 ? 17.6 : 16.6, i * 15, 50, 70)}`).join('')} stroke={GOLD_D} strokeWidth=".6" />
          <path d={starPath(50, 70, 13, 0.22, 4) + starPath(50, 70, 8, 0.3, 4, 45)} fill={`url(#${p}-gold)`} stroke="#5a3a06" strokeWidth=".4" />
          <GemG p={p} n="sapphire" x={50} y={70} r={2.8} />
          <path d={moon(50, 44, 5, 0.2)} fill="#fff1c4" />
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-sky`} cx={0.5} cy={0.5} r={0.75} c={['#4a2a8a', '#1c1f66', '#070a26']} />
          <GemDefs p={p} names={['sapphire']} />
        </defs>
        <ellipse cx="50" cy="70" rx="80" ry="16" fill="#b8a0ff" fillOpacity=".08" transform="rotate(-55 50 70)" />
        <path d={times(46, (i) => circ(6 + ((i * 37) % 89), 6 + ((i * 71) % 129), i % 5 ? 0.4 : 0.75)).join('')} fill="#fff" fillOpacity=".8" />
        <path d={cons.map((c) => 'M' + c.map(([x, y]) => `${x} ${y}`).join('L')).join('')} fill="none" stroke={GOLD_L} strokeOpacity=".55" strokeWidth=".6" />
        <path d={cons.flat().map(([x, y]) => starPath(x, y, 2, 0.35, 4)).join('')} fill="#fff6d6" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-kathedrale';
    const glass = ['ruby', 'sapphire', 'emerald'] as const;
    const win = (x: number, y0: number, y1: number, k: number) => (
      <g key={`${x}-${y0}`}>
        <path d={lancet(x, y0, y1, 9)} fill={`url(#${p}-${glass[k % 3]})`} stroke="#120a1f" strokeWidth="1.6" />
        <path d={`M${x} ${y0}V${y1}M${x - 9} ${(y0 + y1) / 2 + 3}H${x + 9}`} stroke="#120a1f" strokeWidth="1.1" />
        <path d={circ(x, y0 + 7, 2.6)} fill={`url(#${p}-gold)`} stroke="#120a1f" strokeWidth=".8" />
      </g>
    );
    art[p] = (
      <Back p={p} frame={`url(#${p}-stone)`} bg="#161226" line={`url(#${p}-gold)`}
        emblem={<g>
          <circle cx="50" cy="70" r="20" fill="#120a1f" stroke={`url(#${p}-gold)`} strokeWidth="2.4" />
          {times(8, (i) => <path key={i} d={sector(7, 17.5, i * 45 + 3, i * 45 + 42, 50, 70)} fill={`url(#${p}-${glass[i % 3]})`} />)}
          <circle cx="50" cy="70" r="6" fill={`url(#${p}-sapphire)`} stroke="#120a1f" strokeWidth="1.4" />
          <path d={times(8, (i) => circ(...xy(19, i * 45 + 22.5, 50, 70), 1.3)).join('')} fill={`url(#${p}-gold)`} />
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Lin id={`${p}-stone`} c={['#a8a0b8', '#5d566e', '#2a2436']} />
          <GemDefs p={p} names={[...glass]} />
        </defs>
        {[18, 50, 82].map((x, i) => win(x, 14, 44, i))}
        {[18, 50, 82].map((x, i) => win(x, 100, 130, i + 1))}
        <path d="M5 48H95M5 96H95" stroke={`url(#${p}-gold)`} strokeWidth="1.4" />
        <path d="M14 70H30M70 70H86" stroke={GOLD} strokeOpacity=".5" strokeWidth=".8" />
        <path d={starPath(14, 70, 4, 0.3, 4) + starPath(86, 70, 4, 0.3, 4)} fill={GOLD_L} fillOpacity=".8" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-schatzkammer';
    const names: GemName[] = ['ruby', 'sapphire', 'emerald', 'amethyst'];
    const cells = grid(10, 10, 20, 24, 5, 6).concat(grid(0, 22, 20, 24, 6, 5)).filter(awayFrom(50, 70, 26, 26));
    art[p] = (
      <Back p={p} frame={`url(#${p}-gold)`} bg="#24143a" line={GOLD_L}
        emblem={<g strokeLinejoin="round">
          <path d="M50 46L66 54L74 70L66 86L50 94L34 86L26 70L34 54Z" fill={`url(#${p}-gold)`} stroke={INK} strokeWidth="1" />
          <path d="M50 51L62 57L68 70L62 83L50 89L38 83L32 70L38 57Z" fill={`url(#${p}-ruby)`} stroke={INK} strokeWidth=".8" />
          <path d="M50 58L58 63V77L50 82L42 77V63Z" fill="#ff8a9a" fillOpacity=".55" stroke="#5e0818" strokeWidth=".6" />
          <path d="M50 51V58M62 57L58 63M68 70H58M62 83L58 77M50 89V82M38 83L42 77M32 70H42M38 57L42 63" stroke="#5e0818" strokeWidth=".6" />
          <path d="M44 60L48 58.5L46 64Z" fill="#fff" fillOpacity=".85" />
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          {names.map((n) => <Lin key={n} id={`${p}-${n}`} c={[GEM[n][0], GEM[n][1], GEM[n][2]]} />)}
        </defs>
        {names.map((n, k) => (
          <path key={n} d={cells.filter((_, i) => i % 4 === k).map(([x, y]) => `M${x} ${y - 11}L${x + 8} ${y}L${x} ${y + 11}L${x - 8} ${y}Z`).join('')} fill={`url(#${p}-${n})`} stroke={GOLD} strokeWidth="1" strokeLinejoin="round" />
        ))}
        <path d={cells.map(([x, y]) => `M${x - 4.5} ${y - 1}L${x - .5} ${y - 7}L${x + .5} ${y - 4.5}Z`).join('')} fill="#fff" fillOpacity=".55" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-tiefsee';
    const arms = 'M44 76C36 84 26 90 18 88C11 86 12 78 18 79M47 78C44 90 40 102 30 108C24 111 20 106 24 102M53 78C56 90 60 102 70 108C76 111 80 106 76 102M56 76C64 84 74 90 82 88C89 86 88 78 82 79M42 72C32 70 22 64 20 54C19 48 25 47 26 51M58 72C68 70 78 64 80 54C81 48 75 47 74 51';
    art[p] = (
      <Back p={p} frame={`url(#${p}-rim)`} bg={`url(#${p}-sea)`} line="#7fe3f0"
        emblem={<g>
          <path d={arms} fill="none" stroke="#1a0620" strokeWidth="6" strokeLinecap="round" />
          <path d={arms} fill="none" stroke={`url(#${p}-skin)`} strokeWidth="4.2" strokeLinecap="round" />
          <path d="M50 46C61 46 66 55 65.5 64C65 71 60 76 56 78H44C40 76 35 71 34.5 64C34 55 39 46 50 46Z" fill={`url(#${p}-skin)`} stroke="#1a0620" strokeWidth="1.2" />
          <path d={circ(44.5, 66, 3.6) + circ(55.5, 66, 3.6)} fill="#ffd040" stroke="#1a0620" strokeWidth=".9" />
          <path d="M43.4 66H45.6M54.4 66H56.6" stroke="#1a0620" strokeWidth="2" />
          <path d="M44 52C47 50 51 50 54 51" stroke="#f6c0e4" strokeOpacity=".7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {[[18, 79], [24, 102], [76, 102], [82, 79]].map(([x, y]) => <circle key={x * y} cx={x} cy={y} r="2.2" fill={`url(#${p}-pearl)`} stroke="#1a0620" strokeWidth=".5" />)}
        </g>}>
        <defs>
          <Lin id={`${p}-sea`} c={['#1a8aa8', '#0a4a6a', '#04182c', '#02080f']} />
          <Lin id={`${p}-rim`} c={['#5ad0e0', '#0e5a7a', '#04182c']} />
          <Lin id={`${p}-skin`} c={['#e889c8', '#a33a8e', '#4a1050']} />
          <Rad id={`${p}-pearl`} cx={0.38} cy={0.32} r={0.75} c={['#ffffff', PEARL, '#a39580']} />
        </defs>
        <path d="M20 5L32 5L14 140L-6 140Z M48 5L56 5L52 140L36 140Z M78 5L88 5L104 140L84 140Z" fill="#fff" fillOpacity=".06" />
        <path d={times(4, (j) => `M${j % 2 ? -6 : 0} ${12 + j * 7}q6 -4 12 0` + 't12 0'.repeat(8)).join('')} fill="none" stroke="#9feaf5" strokeOpacity={0.4} strokeWidth=".9" />
        <path d={[[14, 48, 1.6], [20, 40, 1], [24, 33, 0.7], [84, 44, 1.3], [80, 36, 0.8], [88, 122, 1.4], [12, 126, 1.1], [50, 124, 1.2], [56, 116, 0.8], [62, 30, 1]].map(([x, y, r]) => circ(x, y, r)).join('')} fill="none" stroke="#d6f6ff" strokeOpacity=".6" strokeWidth=".5" />
        <path d="M5 128Q20 120 30 130T60 128T95 126V140H5Z" fill="#02080f" fillOpacity=".7" />
      </Back>
    );
  }

  // --- legendär ---

  {
    const p = 'rueckseite-phoenix';
    const tips: [number, number][] = [[30, 20], [20, 24], [12, 31], [8, 41], [7, 52], [9, 63]];
    const wing = (
      <g>
        <path d={tips.map(([x, y], i) => quill(44, 66 + i, x, y, 3.6 - i * 0.25)).join('')} fill={`url(#${p}-wing)`} stroke="#6e0e0e" strokeWidth=".6" strokeLinejoin="round" />
        <path d={tips.slice(0, 5).map(([x, y], i) => quill(45, 66 + i, f(x + (45 - x) * 0.45), f(y + (66 + i - y) * 0.45), 2.8)).join('')} fill={`url(#${p}-gold)`} stroke="#7a4e0a" strokeWidth=".5" strokeLinejoin="round" />
      </g>
    );
    art[p] = (
      <Back p={p} frame={`url(#${p}-gold)`} bg={`url(#${p}-bg)`} line={GOLD_L}
        emblem={<g>
          {wing}
          <g transform="translate(100 0) scale(-1 1)">{wing}</g>
          <path d={times(5, (i) => quill(50, 84, ...xy(32 - Math.abs(i - 2) * 4, 180 + (i - 2) * 14, 50, 84), 3.4)).join('')} fill={`url(#${p}-fire)`} stroke="#8e1010" strokeWidth=".6" strokeLinejoin="round" />
          <path d="M50 52C56.5 56 58 68 55 80C54 85 52 89 50 92C48 89 46 85 45 80C42 68 43.5 56 50 52Z" fill={`url(#${p}-fire)`} stroke="#8e1010" strokeWidth=".8" />
          <path d="M48 48C44 42 44 36 46 32C47 38 49 41 50 44C51 41 53 38 54 32C56 36 56 42 52 48Z M50 44C49 38 49 33 50 28C51 33 51 38 50 44Z" fill={`url(#${p}-wing)`} stroke="#8e1010" strokeWidth=".6" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="4.6" fill="#ff9a1e" stroke="#8e1010" strokeWidth=".8" />
          <path d="M48.5 51H51.5L50 55Z" fill={GOLD} stroke={INK} strokeWidth=".5" />
          <path d={circ(48.3, 49.2, .7) + circ(51.7, 49.2, .7)} fill={INK} />
          <GemG p={p} n="ruby" x={50} y={66} r={3} cut="rhomb" />
          {[[9.5, 9.5], [90.5, 9.5], [9.5, 130.5], [90.5, 130.5]].map(([x, y]) => <GemG key={x * y} p={p} n="ruby" x={x} y={y} r={3.4} />)}
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-bg`} cx={0.5} cy={0.5} r={0.7} c={['#a8202e', '#4a0814', '#12040a']} />
          <Rad id={`${p}-ray`} at={[50, 66, 90]} c={[[0, GOLD_L, 0.8], [1, GOLD_L, 0]]} />
          <Lin id={`${p}-wing`} x1={1} y1={1} x2={0} y2={0} c={['#fff1a8', '#ffa21e', '#e8401e', '#a0101e']} />
          <Lin id={`${p}-fire`} c={['#fff1a8', '#ff9a1e', '#d8301e']} />
          <GemDefs p={p} names={['ruby']} />
        </defs>
        <path d={times(32, (i) => `M50 66L${pt(110, i * 11.25 - 1.6, 50, 66)}L${pt(110, i * 11.25 + 1.6, 50, 66)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <rect x="9" y="9" width="82" height="122" rx="3" fill="none" stroke={GOLD} strokeOpacity=".7" strokeWidth=".8" />
        <path d="M30 135C32 124 38 122 40 114C42 122 46 120 48 110C50 120 54 120 56 110C58 120 62 122 64 114C66 122 70 124 72 135Z" fill={`url(#${p}-fire)`} fillOpacity=".8" />
      </Back>
    );
  }

  {
    const p = 'rueckseite-thron';
    const corner = (x: number, y: number, sx: number, sy: number) => (
      <g key={`${x}${y}`} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
        <path d="M0 0H20C15 2 12 4 9 9C4 12 2 15 0 20ZM14 5C9 6 6 9 5 14" fill={`url(#${p}-gold)`} stroke={INK} strokeWidth=".6" strokeLinejoin="round" />
      </g>
    );
    art[p] = (
      <Back p={p} frame={`url(#${p}-gold)`} bg={`url(#${p}-velvet)`} line={GOLD_L}
        emblem={<g>
          {corner(6, 6, 1, 1)}{corner(94, 6, -1, 1)}{corner(6, 134, 1, -1)}{corner(94, 134, -1, -1)}
          {[[9.6, 9.6, 'emerald'], [90.4, 9.6, 'emerald'], [9.6, 130.4, 'sapphire'], [90.4, 130.4, 'sapphire']].map(([x, y, n]) => <GemG key={`${x}${y}`} p={p} n={n as GemName} x={x as number} y={y as number} r={2.6} />)}
          <path d={times(4, (i) => `M${pt(14, i * 90 + 45, 50, 74)}L${pt(32, i * 90 + 45, 50, 74)}`).join('')} stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <path d={times(4, (i) => `M${pt(14, i * 90 + 45, 50, 74)}L${pt(32, i * 90 + 45, 50, 74)}`).join('')} stroke={`url(#${p}-gold)`} strokeWidth="2" strokeLinecap="round" />
          <path d={[45, 315].map((a) => circ(...xy(33, a, 50, 74), 2.8)).join('')} fill={`url(#${p}-ruby)`} stroke={INK} strokeWidth=".7" />
          <circle cx="50" cy="74" r="16" fill={PURPLE} stroke={`url(#${p}-gold)`} strokeWidth="2.6" />
          <path d={times(12, (i) => circ(...xy(16, i * 30 + 15, 50, 74), 1)).join('')} fill={`url(#${p}-pearl)`} />
          <circle cx="50" cy="74" r="10" fill="none" stroke={GOLD} strokeOpacity=".5" strokeWidth=".8" />
          <GemG p={p} n="amethyst" x={50} y={75} r={6.5} cut="rhomb" />
          <Crown x={50} y={56} s={0.9} fill={`url(#${p}-gold)`} gems={[EMERALD, RUBY, SAPPHIRE]} />
        </g>}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-velvet`} cx={0.5} cy={0.5} r={0.7} c={['#6a3aa0', PURPLE, NIGHT]} />
          <Rad id={`${p}-ray`} at={[50, 70, 80]} c={[[0, GOLD_L, 0.55], [1, GOLD_L, 0]]} />
          <GemDefs p={p} names={['ruby', 'emerald', 'sapphire', 'pearl', 'amethyst']} />
        </defs>
        <path d={times(16, (i) => `M50 70L${pt(110, i * 22.5 - 3.5, 50, 70)}L${pt(110, i * 22.5 + 3.5, 50, 70)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <path d={diag(14) + antiDiag(14)} stroke={GOLD} strokeOpacity=".14" strokeWidth=".6" />
        <rect x="9" y="9" width="82" height="122" rx="3" fill="none" stroke={GOLD} strokeOpacity=".75" strokeWidth=".8" />
      </Back>
    );
  }

  return art;
}

// ---------------------------------------------------------------------------------------------
// Filz — table felts (160×100). Cards lie on them, so the centre stays calm and low-contrast.

/** Felt base: a radial "lamp-lit" gradient over the whole table. */
function Felt({ p, c, children }: { p: string; c: [string, string, string]; children?: ReactNode }) {
  return (
    <g>
      <defs><Rad id={`${p}-felt`} cx={0.5} cy={0.5} r={0.72} c={c} /></defs>
      <rect width="160" height="100" fill={`url(#${p}-felt)`} />
      {children}
    </g>
  );
}

const FELT_CORNERS: [number, number, number][] = [[0, 0, 135], [160, 0, 225], [0, 100, 45], [160, 100, 315]];
const border = (inset: number) => `M${inset} ${inset}H${160 - inset}V${100 - inset}H${inset}Z`;

function filzArt(): Record<string, ReactNode> {
  const art: Record<string, ReactNode> = {};
  const scatter = (n: number, seed: number) => times(n, (i) => [f(4 + ((i * 53 + seed) % 152)), f(4 + ((i * 37 + seed * 3) % 92))] as [number, number])
    .filter(awayFrom(80, 50, 52, 30));

  art['filz-gruen'] = (
    <Felt p="filz-gruen" c={['#2f8a5c', '#1e6b45', '#0e3a24']}>
      <path d={border(6)} fill="none" stroke="#9be0b8" strokeOpacity=".22" strokeWidth=".9" />
      <path d={border(8.5)} fill="none" stroke="#9be0b8" strokeOpacity=".12" strokeWidth=".5" />
    </Felt>
  );

  art['filz-weinrot'] = (
    <Felt p="filz-weinrot" c={['#8e2a3d', '#6b1e2e', '#3d0e19']}>
      <path d={FELT_CORNERS.map(([x, y]) => { const sx = x ? -1 : 1; const sy = y ? -1 : 1; return `M${x + sx * 6} ${y + sy * 24}Q${x + sx * 6} ${y + sy * 6} ${x + sx * 24} ${y + sy * 6}M${x + sx * 10} ${y + sy * 18}Q${x + sx * 10} ${y + sy * 10} ${x + sx * 18} ${y + sy * 10}`; }).join('')} fill="none" stroke={GOLD} strokeOpacity=".28" strokeWidth=".8" />
    </Felt>
  );

  art['filz-mitternacht'] = (
    <Felt p="filz-mitternacht" c={['#2a4a9a', '#162a5e', '#0a1430']}>
      <path d={scatter(40, 7).map(([x, y], i) => circ(x, y, i % 4 ? 0.35 : 0.6)).join('')} fill="#fff" fillOpacity=".35" />
    </Felt>
  );

  art['filz-schiefer'] = (
    <Felt p="filz-schiefer" c={['#5c6272', '#3d424e', '#1e2128']}>
      <path d={times(17, (i) => `M${i * 12 - 40} 100L${i * 12 + 60} 0`).join('')} stroke="#fff" strokeOpacity=".04" strokeWidth="3" />
      <path d={border(6)} fill="none" stroke="#c9ced8" strokeOpacity=".2" strokeWidth=".8" />
    </Felt>
  );

  art['filz-moos'] = (
    <Felt p="filz-moos" c={['#6a7a34', '#4a5a22', '#262e10']}>
      <path d={FELT_CORNERS.map(([x, y, a]) => { const [bx, by] = xy(3, a, x, y); return [-28, 0, 28].map((d) => leafTo(bx, by, a + d, 14 - Math.abs(d) / 7, 2.2)).join(''); }).join('')} fill="#a8c46a" fillOpacity=".3" />
    </Felt>
  );

  art['filz-taverne'] = (
    <Felt p="filz-taverne" c={['#8a5a2e', '#6a4220', '#3a220e']}>
      <path d={border(5)} fill="none" stroke={PARCH} strokeOpacity=".35" strokeWidth=".7" strokeDasharray="2.4 1.6" />
      <path d={border(3)} fill="none" stroke="#2a1608" strokeOpacity=".5" strokeWidth="1" />
    </Felt>
  );

  art['filz-purpur'] = (
    <Felt p="filz-purpur" c={['#6a3aa0', '#4a2380', '#24103e']}>
      <path d="M80 20L130 50L80 80L30 50Z" fill="none" stroke={GOLD} strokeOpacity=".12" strokeWidth="1" />
      <path d={border(6)} fill="none" stroke={GOLD} strokeOpacity=".22" strokeWidth=".8" />
    </Felt>
  );

  art['filz-seegras'] = (
    <Felt p="filz-seegras" c={['#2a8a8a', '#1a6464', '#0a3434']}>
      <path d={[7, 11, 89, 93].map((y) => `M0 ${y}q5 -3 10 0` + 't10 0'.repeat(15)).join('')} fill="none" stroke="#a8f0e0" strokeOpacity=".2" strokeWidth=".8" />
    </Felt>
  );

  art['filz-herbst'] = (
    <Felt p="filz-herbst" c={['#b06a24', '#8a4a18', '#4a2408']}>
      <path d={FELT_CORNERS.map(([x, y, a]) => tf(OAK_LEAF, 1.2, a + 180, ...xy(13, a, x, y)) + tf(OAK_LEAF, 0.8, a + 140, ...xy(16, a + 32, x, y))).join('')} fill="#ffcf7a" fillOpacity=".2" />
    </Felt>
  );

  // --- selten ---

  {
    const p = 'filz-damast';
    art[p] = (
      <Felt p={p} c={['#a02a3a', '#7a1a2a', '#3d0a14']}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={grid(20, 18, 40, 32, 4, 3, true).map(([x, y]) => tf(MINI_LILY, 1.1, 0, x, y)).join('')} fill="#2a0610" fillOpacity=".28" />
        <path d={border(5)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.2" />
      </Felt>
    );
  }

  {
    const p = 'filz-silberborte';
    art[p] = (
      <Felt p={p} c={['#3a6fd8', '#22468f', '#0f2048']}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d={border(5)} fill="none" stroke={`url(#${p}-silver)`} strokeWidth="2.6" />
        <path d={border(5)} fill="none" stroke="#3d4656" strokeWidth="2.6" strokeDasharray="1.2 1.8" strokeOpacity=".6" />
        <path d={border(8.5)} fill="none" stroke={SILVER} strokeOpacity=".35" strokeWidth=".5" />
      </Felt>
    );
  }

  {
    const p = 'filz-sternenfeld';
    const stars = scatter(46, 11);
    art[p] = (
      <Felt p={p} c={['#2a2a6a', '#14143e', '#06061a']}>
        <path d={stars.map(([x, y], i) => circ(x, y, i % 5 ? 0.35 : 0.65)).join('')} fill="#fff" fillOpacity=".6" />
        <path d="M12 20L24 14L34 22L30 32M128 74L140 80L150 72" fill="none" stroke={SILVER} strokeOpacity=".2" strokeWidth=".5" />
        <path d={[[12, 20], [24, 14], [34, 22], [30, 32], [128, 74], [140, 80], [150, 72], [144, 16], [18, 84]].map(([x, y]) => starPath(x, y, 2, 0.3, 4)).join('')} fill={GOLD_L} fillOpacity=".7" />
      </Felt>
    );
  }

  {
    const p = 'filz-lilienborte';
    art[p] = (
      <Felt p={p} c={['#6a3aa0', '#4a2380', '#1b0e2e']}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={border(5) + border(7)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".7" />
        <path d={FELT_CORNERS.map(([x, y, a]) => tf(MINI_LILY, 0.9, a + 180, ...xy(17, a, x, y))).join('') + [[80, 9.5, 0], [80, 90.5, 180]].map(([x, y, a]) => tf(MINI_LILY, 0.55, a, x, y)).join('')} fill={`url(#${p}-gold)`} />
      </Felt>
    );
  }

  {
    const p = 'filz-leitstelle';
    const band = (y: number) => times(18, (i) => `M${i * 10 - 6} ${y + 6}L${i * 10} ${y}H${i * 10 + 5}L${i * 10 - 1} ${y + 6}Z`).join('');
    art[p] = (
      <Felt p={p} c={['#2a3444', '#1a2230', '#0a0f18']}>
        <defs><Silver id={`${p}-silver`} /></defs>
        <path d="M0 0H160V6H0ZM0 94H160V100H0Z" fill="#f2f2f2" fillOpacity=".85" />
        <path d={band(0) + band(94)} fill="#d8232a" />
        <path d="M0 6.4H160M0 93.6H160" stroke={`url(#${p}-silver)`} strokeWidth=".8" />
        <g opacity=".12"><StarOfLife x={80} y={50} s={1.6} blue="#6a9aff" edge="#c9d3e6" /></g>
      </Felt>
    );
  }

  {
    const p = 'filz-jagdgruen';
    art[p] = (
      <Felt p={p} c={['#2f6a3a', '#1e4a28', '#0c2412']}>
        <defs><Gold id={`${p}-gold`} /></defs>
        <path d={border(6)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth=".9" />
        <path d={FELT_CORNERS.map(([x, y, a]) => tf(OAK_LEAF, 0.85, a + 155, ...xy(15, a - 12, x, y)) + tf(OAK_LEAF, 0.85, a + 205, ...xy(15, a + 12, x, y))).join('')} fill={`url(#${p}-gold)`} fillOpacity=".75" />
        <path d={FELT_CORNERS.map(([x, y, a]) => circ(...xy(11.5, a, x, y), 1.6)).join('')} fill={GOLD} stroke="#5a3a10" strokeWidth=".5" />
      </Felt>
    );
  }

  // --- episch ---

  {
    const p = 'filz-drachenhort';
    const rowX = (y: number) => times(20, (i) => `M${i * 8} ${y}c0 4.6 8 4.6 8 0Z`).join('');
    const rowY = (x: number) => times(11, (j) => `M${x} ${8 + j * 8}c4.6 0 4.6 8 0 8Z`).join('');
    art[p] = (
      <Felt p={p} c={['#8a1a24', '#5a0a14', '#1e0408']}>
        <defs><Gold id={`${p}-gold`} /><GemDefs p={p} names={['ruby', 'emerald']} /></defs>
        <circle cx="80" cy="50" r="22" fill="none" stroke={GOLD} strokeOpacity=".1" strokeWidth="3" />
        <path d={starPath(80, 50, 14, 0.4, 8)} fill={GOLD} fillOpacity=".07" />
        <path d={rowX(1) + rowX(94.5).replace(/c0 4.6 8 4.6 8 0/g, 'c0 -4.6 8 -4.6 8 0') + rowY(1) + rowY(159).replace(/c4.6 0 4.6 8 0 8/g, 'c-4.6 0 -4.6 8 0 8')} fill={`url(#${p}-gold)`} stroke="#5a3a06" strokeWidth=".4" />
        <path d={border(7)} fill="none" stroke={GOLD} strokeOpacity=".5" strokeWidth=".6" />
        {[[6, 6], [154, 6], [6, 94], [154, 94]].map(([x, y]) => <GemG key={x * 1000 + y} p={p} n="ruby" x={x} y={y} r={4} />)}
        <GemG p={p} n="emerald" x={80} y={4.5} r={2.6} cut="rhomb" />
        <GemG p={p} n="emerald" x={80} y={95.5} r={2.6} cut="rhomb" />
      </Felt>
    );
  }

  {
    const p = 'filz-nordlicht';
    art[p] = (
      <g>
        <defs>
          <Lin id={`${p}-sky`} c={['#0e2a44', '#0a1a30', '#040810']} />
          <Lin id={`${p}-aurora`} x2={1} y2={0} c={[[0, '#3af0a0', 0], [0.3, '#3af0a0', 0.55], [0.65, '#3ad0e0', 0.45], [1, '#b46ef0', 0]]} />
        </defs>
        <rect width="160" height="100" fill={`url(#${p}-sky)`} />
        <path d={scatter(36, 3).map(([x, y], i) => circ(x, y, i % 4 ? 0.3 : 0.55)).join('')} fill="#fff" fillOpacity=".55" />
        <path d="M-5 22C25 4 50 30 80 14C110 0 130 22 165 8V18C130 32 110 10 80 24C50 40 25 14 -5 32Z" fill={`url(#${p}-aurora)`} opacity=".55" />
        <path d="M-5 12C30 0 55 20 85 8C115 -2 135 14 165 2V8C135 20 115 4 85 14C55 26 30 6 -5 18Z" fill={`url(#${p}-aurora)`} opacity=".35" />
        <path d="M0 100V88L14 80L24 86L38 74L52 86L64 82L80 92L96 82L110 88L124 76L138 86L150 80L160 86V100Z" fill="#02060c" fillOpacity=".7" />
      </g>
    );
  }

  {
    const p = 'filz-amethystsaal';
    const scroll = 'M0 0C10 0 18 4 20 12C21 17 16 19 13 16C11 13.5 13.5 11 15.5 12.5M0 0C0 10 4 18 12 20C17 21 19 16 16 13';
    art[p] = (
      <Felt p={p} c={['#7a3cc0', '#4a2380', '#1b0e2e']}>
        <defs><Gold id={`${p}-gold`} /><GemDefs p={p} names={['amethyst']} /></defs>
        <path d={starPath(80, 50, 20, 0.55, 8, 22.5)} fill="none" stroke={GOLD} strokeOpacity=".1" strokeWidth="1" />
        <circle cx="80" cy="50" r="10" fill="none" stroke={GOLD} strokeOpacity=".08" strokeWidth="1" />
        <path d={border(4.5)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.4" />
        {[[5, 5, 1, 1], [155, 5, -1, 1], [5, 95, 1, -1], [155, 95, -1, -1]].map(([x, y, sx, sy]) => (
          <path key={x * 1000 + y} d={scroll} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1.3" strokeLinecap="round" />
        ))}
        {[[7, 7, 3.2], [153, 7, 3.2], [7, 93, 3.2], [153, 93, 3.2], [80, 4.5, 2.4], [80, 95.5, 2.4], [4.5, 50, 2.2], [155.5, 50, 2.2]].map(([x, y, r]) => <GemG key={x * 1000 + y} p={p} n="amethyst" x={x} y={y} r={r} />)}
      </Felt>
    );
  }

  // --- legendär ---

  {
    const p = 'filz-thronsaal';
    art[p] = (
      <Felt p={p} c={['#6a3aa0', PURPLE, NIGHT]}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-ray`} at={[80, 50, 90]} c={[[0, GOLD_L, 0.16], [1, GOLD_L, 0]]} />
          <GemDefs p={p} names={['ruby', 'sapphire', 'emerald', 'pearl']} />
        </defs>
        <path d={times(24, (i) => `M80 50L${pt(100, i * 15 - 3, 80, 50)}L${pt(100, i * 15 + 3, 80, 50)}Z`).join('')} fill={`url(#${p}-ray)`} />
        <g opacity=".1"><Crown x={80} y={56} s={0.9} fill={GOLD} gems={[GOLD, GOLD, GOLD]} ball={GOLD} /></g>
        <path d={border(4)} fill="none" stroke={INK} strokeWidth="5" />
        <path d={border(4)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth="3.4" />
        <path d={border(8)} fill="none" stroke={GOLD} strokeOpacity=".5" strokeWidth=".6" />
        <path d={[...times(11, (i) => [15 + i * 13, 4] as [number, number]), ...times(11, (i) => [15 + i * 13, 96] as [number, number])].filter(([x, y]) => y > 50 || Math.abs(x - 80) > 10).map(([x, y]) => circ(x, y, 0.8)).join('')} fill={`url(#${p}-pearl)`} />
        {[[5, 5, 'ruby'], [155, 5, 'ruby'], [5, 95, 'sapphire'], [155, 95, 'sapphire'], [4, 50, 'emerald'], [156, 50, 'emerald']].map(([x, y, n]) => <GemG key={`${x}${y}`} p={p} n={n as GemName} x={x as number} y={y as number} r={3.6} />)}
        <Crown x={80} y={8.5} s={0.42} fill={`url(#${p}-gold)`} />
      </Felt>
    );
  }

  {
    const p = 'filz-phoenixnest';
    const fan = (x: number, y: number, a: number) => times(5, (i) => quill(x, y, ...xy(26 - Math.abs(i - 2) * 4, a - 40 + i * 20, x, y), 2.6)).join('');
    art[p] = (
      <Felt p={p} c={['#5a1018', '#2a060c', '#0a0204']}>
        <defs>
          <Gold id={`${p}-gold`} />
          <Rad id={`${p}-glow`} at={[80, 50, 50]} c={[[0, '#ff7a1e', 0.18], [1, '#ff7a1e', 0]]} />
          <Lin id={`${p}-fire`} c={['#fff1a8', '#ff9a1e', '#d8301e', '#6e0e0e']} />
          <GemDefs p={p} names={['ruby', 'topaz']} />
        </defs>
        <rect width="160" height="100" fill={`url(#${p}-glow)`} />
        <path d={scatter(30, 5).map(([x, y], i) => circ(x, y, i % 3 ? 0.35 : 0.6)).join('')} fill="#ffb04a" fillOpacity=".5" />
        <path d={FELT_CORNERS.map(([x, y, a]) => fan(...xy(3, a, x, y), a)).join('')} fill={`url(#${p}-fire)`} fillOpacity=".85" stroke="#6e0e0e" strokeWidth=".4" />
        <path d={border(4)} fill="none" stroke={INK} strokeWidth="4" />
        <path d={border(4)} fill="none" stroke={`url(#${p}-gold)`} strokeWidth="2.6" />
        <path d={border(7)} fill="none" stroke={GOLD} strokeOpacity=".45" strokeWidth=".5" />
        {[[4, 4], [156, 4], [4, 96], [156, 96]].map(([x, y]) => <GemG key={x * 1000 + y} p={p} n="ruby" x={x} y={y} r={3.4} />)}
        <GemG p={p} n="topaz" x={80} y={4} r={2.6} cut="rhomb" />
        <GemG p={p} n="topaz" x={80} y={96} r={2.6} cut="rhomb" />
      </Felt>
    );
  }

  return art;
}

export const LOOT_ART: Record<string, ReactNode> = {
  ...rahmenArt(),
  ...wappenArt(),
  ...rueckseiteArt(),
  ...filzArt(),
};

export function LootSvg({ id, className }: { id: string; className?: string }) {
  const item = LOOT_BY_ID[id];
  const art = LOOT_ART[id];
  if (!item || art === undefined) return null;
  return (
    <svg viewBox={LOOT_VIEWBOX[item.kind]} className={className} aria-hidden="true">
      {art}
    </svg>
  );
}
