import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Court portraits for the default "Hofstaat" deck (viewBox 0 0 100 100).
 * Every figure shares one body, head and face so the set reads as a family; headwear, garment,
 * hair and the item each figure holds tell them apart.
 */

const INK = '#2a1a10';
const GOLD = '#e8b33a';
const GOLD_DARK = '#a8741a';
const SKIN = { light: '#f2c9a0', mid: '#e0a87c', tan: '#c68642', deep: '#8d5524' } as const;

const outline = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export interface PortraitSpec {
  id: string;
  bg: string;
  skin: string;
  garment: string;
  /** Behind the head (long hair, veils, cloaks). */
  back?: ReactNode;
  /** Over the garment (collars, aprons, chains). */
  collar?: ReactNode;
  /** Beards, braids, moustaches – drawn over the face. */
  face?: ReactNode;
  hair?: ReactNode;
  hat?: ReactNode;
  /** The item the figure holds, drawn last. */
  item?: ReactNode;
  smile?: 'smile' | 'grin' | 'flat' | 'smirk';
  brows?: 'calm' | 'proud' | 'raised';
  /** disc: round medallion (viewBox 100×100); card: full card face (viewBox 100×140). */
  mode?: 'disc' | 'card';
  /** Card mode: rank shown as the big numeral behind the figure. */
  rank?: number;
}

/** Big gold numeral worked into full-card art; the figure's headwear overlaps it slightly. */
export function RankNumeral({ rank, id }: { rank: number; id: string }) {
  const grad = `numeral-${id}`;
  const label = rank === 13 ? null : String(rank);
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_DARK} />
        </linearGradient>
      </defs>
      <path d="M10 26 H30 M70 26 H90 M14 31 H28 M72 31 H86" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M30 26 l3 -3 l3 3 l-3 3 Z M64 26 l3 -3 l3 3 l-3 3 Z" fill={GOLD} opacity="0.9" />
      {label ? (
        <text
          x="50" y="45" textAnchor="middle" fontSize={label.length > 1 ? 44 : 50} fontWeight="700"
          fill={`url(#${grad})`} stroke={INK} strokeWidth="1.6" paintOrder="stroke"
          style={{ fontFamily: 'var(--font-grenze), Georgia, serif' }}
        >
          {label}
        </text>
      ) : (
        <text x="50" y="38" textAnchor="middle" fontSize="20" fontWeight="700" fill={`url(#${grad})`} stroke={INK} strokeWidth="1.2" paintOrder="stroke" style={{ fontFamily: 'var(--font-grenze), Georgia, serif' }}>
          Narr
        </text>
      )}
    </g>
  );
}

function Portrait(p: PortraitSpec) {
  if (p.mode === 'card') return <CardPortrait {...p} />;
  const clip = `portrait-${p.id}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="46" /></clipPath>
        <radialGradient id={`${clip}-bg`} cx="50%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={p.bg} />
      <g clipPath={`url(#${clip})`}>
        <circle cx="50" cy="50" r="46" fill={`url(#${clip}-bg)`} />
        {Array.from({ length: 12 }, (_, i) => (
          <polygon key={i} points="50,50 46,0 54,0" fill="#ffffff" opacity="0.06" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <Figure {...p} />
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke={GOLD} strokeWidth="3" />
      <circle cx="50" cy="50" r="42.5" fill="none" stroke={GOLD_DARK} strokeWidth="0.8" opacity="0.7" />
    </g>
  );
}

/** Full card face: scene, rays, big numeral and the figure scaled up so the shoulders meet the bottom edge. */
function CardPortrait(p: PortraitSpec) {
  const id = `card-${p.id}`;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="100" height="140" fill={p.bg} />
      <rect width="100" height="140" fill={`url(#${id}-bg)`} />
      {Array.from({ length: 16 }, (_, i) => (
        <polygon key={i} points="50,78 45,-60 55,-60" fill="#ffffff" opacity="0.07" transform={`rotate(${i * 22.5} 50 78)`} />
      ))}
      <circle cx="50" cy="80" r="38" fill="#ffffff" opacity="0.08" />
      <RankNumeral rank={p.rank ?? 1} id={p.id} />
      <g transform="translate(-7.5 27) scale(1.15)">
        <Figure {...p} />
      </g>
    </g>
  );
}

function Figure(p: PortraitSpec) {
  const mouth = {
    smile: 'M45.5 54 Q50 57.5 54.5 54',
    grin: 'M44 53 Q50 60 56 53 Z',
    flat: 'M46 55 H54',
    smirk: 'M45 55 Q51 57 55.5 53',
  }[p.smile ?? 'smile'];
  const brows = {
    calm: 'M42 41.5 Q45 40 48 41.5 M52 41.5 Q55 40 58 41.5',
    proud: 'M42 42 L48 40.5 M52 40.5 L58 42',
    raised: 'M42 40 Q45 37.5 48 40 M52 40 Q55 37.5 58 40',
  }[p.brows ?? 'calm'];
  return (
    <g>
      {p.back}
      <path d="M14 104 C16 80 30 70 50 70 C70 70 84 80 86 104 Z" fill={p.garment} {...outline} />
      <rect x="45" y="55" width="10" height="16" fill={p.skin} {...outline} />
      {p.collar}
      <circle cx="36.8" cy="47" r="3.2" fill={p.skin} {...outline} />
      <circle cx="63.2" cy="47" r="3.2" fill={p.skin} {...outline} />
      <ellipse cx="50" cy="45" rx="13.5" ry="15.5" fill={p.skin} {...outline} />
      {p.hair}
      <circle cx="41" cy="51" r="2.6" fill="#e8846b" opacity="0.45" />
      <circle cx="59" cy="51" r="2.6" fill="#e8846b" opacity="0.45" />
      <circle cx="45" cy="46" r="1.7" fill={INK} />
      <circle cx="55" cy="46" r="1.7" fill={INK} />
      <circle cx="45.6" cy="45.4" r="0.55" fill="#fff" />
      <circle cx="55.6" cy="45.4" r="0.55" fill="#fff" />
      <path d={brows} fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 47 Q48.6 51 50.4 51.6" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d={mouth} fill={p.smile === 'grin' ? '#7a2a22' : 'none'} stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {p.face}
      {p.hat}
      {p.item}
    </g>
  );
}

const jewel = (cx: number, cy: number, fill: string, r = 1.8) => <circle cx={cx} cy={cy} r={r} fill={fill} stroke={INK} strokeWidth="0.8" />;

/** Reflective safety stripes of a German rescue uniform. */
const RESCUE_STRIPES = (
  <>
    <path d="M19 88 H81" stroke="#d9dee3" strokeWidth="3.5" />
    <path d="M18 93 H82" stroke="#d8ff3a" strokeWidth="2.5" />
  </>
);

const STETHOSCOPE = (
  <>
    <path d="M38 72 C36 86 46 92 50 92 C54 92 64 86 62 72" fill="none" stroke="#3f4a5e" strokeWidth="2.4" />
    <circle cx="50" cy="93" r="3.2" fill="#9aa3ad" stroke={INK} strokeWidth="1" />
  </>
);

const GLASSES = (
  <>
    <circle cx="45" cy="46" r="4" fill="#ffffff" fillOpacity="0.15" stroke={INK} strokeWidth="1.3" />
    <circle cx="55" cy="46" r="4" fill="#ffffff" fillOpacity="0.15" stroke={INK} strokeWidth="1.3" />
    <path d="M49 46 H51 M41 45 L37 44 M59 45 L63 44" stroke={INK} strokeWidth="1.2" />
  </>
);

function Star5({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke={INK} strokeWidth="1" strokeLinejoin="round" />;
}

/** Blue six-armed cross with the staff of Asclepius. */
function StarOfLife({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const w = r * 0.36;
  return (
    <g>
      {[0, 60, 120].map((a) => (
        <rect key={a} x={cx - w / 2} y={cy - r} width={w} height={r * 2} rx={w * 0.12} fill="#1f5fc8" transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <path d={`M${cx} ${cy - r * 0.7} V${cy + r * 0.72}`} stroke="#fbf7ee" strokeWidth={Math.max(1, r * 0.08)} strokeLinecap="round" />
      <path
        d={`M${cx - r * 0.15} ${cy - r * 0.45} C${cx + r * 0.25} ${cy - r * 0.35} ${cx + r * 0.25} ${cy - r * 0.1} ${cx} ${cy}
            C${cx - r * 0.25} ${cy + r * 0.1} ${cx - r * 0.25} ${cy + r * 0.35} ${cx + r * 0.12} ${cy + r * 0.45}`}
        fill="none" stroke="#fbf7ee" strokeWidth={Math.max(0.8, r * 0.06)} strokeLinecap="round"
      />
    </g>
  );
}

export const PORTRAITS: Record<string, ReactNode> = {
  'p-jakob': (
    <Portrait
      id="jakob" bg="#3b1f5e" skin={SKIN.light} garment="#6c2a8e" brows="proud" smile="smirk"
      back={<path d="M22 104 C20 70 30 52 50 52 C70 52 80 70 78 104 Z" fill="#a8232f" {...outline} />}
      collar={<>
        <path d="M24 80 C34 70 66 70 76 80 L76 88 C66 79 34 79 24 88 Z" fill="#fbf7ee" {...outline} />
        {[30, 38, 46, 54, 62, 70].map((x) => <path key={x} d={`M${x} 80 l1 3 l1 -3`} fill={INK} />)}
        <path d="M42 90 L50 100 L58 90" fill="none" stroke={GOLD} strokeWidth="2.5" />
        <circle cx="50" cy="96" r="3" fill={GOLD} {...outline} />
      </>}
      hair={<path d="M36.5 44 C36 30 64 30 63.5 44 C60 36 40 36 36.5 44 Z" fill="#6b3a1e" {...outline} />}
      face={<path d="M37 48 C37 68 63 68 63 48 C60 58 54 56 50 58 C46 56 40 58 37 48 Z" fill="#7a4424" {...outline} />}
      hat={<>
        <path d="M34 34 L33 18 L40 25 L45 13 L50 22 L55 13 L60 25 L67 18 L66 34 Z" fill={GOLD} {...outline} />
        <rect x="33" y="31" width="34" height="6" rx="1.5" fill={GOLD} {...outline} />
        {jewel(50, 34, '#c8323c', 2.2)}{jewel(41, 34, '#3a6fd8')}{jewel(59, 34, '#3a6fd8')}
        {jewel(45, 13, '#fbf7ee', 1.6)}{jewel(55, 13, '#fbf7ee', 1.6)}
      </>}
      item={<>
        <path d="M80 100 L84 60" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="84.5" cy="56" r="5" fill={GOLD} {...outline} />
        <path d="M84.5 49 V53 M82.5 51 H86.5" stroke={INK} strokeWidth="1.5" />
      </>}
    />
  ),
  'p-erzbischof': (
    <Portrait
      id="erzbischof" bg="#7a1c2c" skin={SKIN.mid} garment="#f1ead6" brows="calm" smile="flat"
      collar={<>
        <path d="M44 72 L42 104 H58 L56 72 Z" fill="#c8323c" {...outline} />
        <path d="M50 78 V96 M45 84 H55" stroke={GOLD} strokeWidth="2.5" />
      </>}
      face={<path d="M39 52 C40 64 60 64 61 52 C57 58 43 58 39 52 Z" fill="#d9d4cc" {...outline} />}
      hat={<>
        <path d="M37 35 C37 20 50 6 50 6 C50 6 63 20 63 35 Z" fill="#fbf7ee" {...outline} />
        <path d="M50 10 V34" stroke={GOLD} strokeWidth="3" />
        <path d="M43 20 H57" stroke={GOLD} strokeWidth="3" />
        <rect x="37" y="31" width="26" height="5" fill={GOLD} {...outline} />
      </>}
      item={<>
        <path d="M18 100 L22 46" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        <path d="M22 46 C20 34 32 30 33 38 C34 44 26 45 26 40" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      </>}
    />
  ),
  'p-marschall': (
    <Portrait
      id="marschall" bg="#1f3a6b" skin={SKIN.tan} garment="#24305e" brows="proud" smile="flat"
      collar={<>
        <path d="M18 82 C24 74 32 72 36 74 L34 82 Z M82 82 C76 74 68 72 64 74 L66 82 Z" fill={GOLD} {...outline} />
        {[78, 86, 94].map((y) => <circle key={y} cx="50" cy={y} r="1.8" fill={GOLD} stroke={INK} strokeWidth="0.8" />)}
        <path d="M30 86 L44 100" stroke="#c8323c" strokeWidth="4" />
      </>}
      hair={<path d="M36.5 46 C36 34 64 34 63.5 46 C60 40 40 40 36.5 46 Z" fill="#2a2230" {...outline} />}
      face={<path d="M41 52 C44 49 48 50 50 51.5 C52 50 56 49 59 52 C56 53 53 52.5 50 53.5 C47 52.5 44 53 41 52 Z" fill="#2a2230" />}
      hat={<>
        <path d="M22 32 C32 16 68 16 78 32 C64 27 36 27 22 32 Z" fill="#1c1a2a" {...outline} />
        <circle cx="50" cy="24" r="3.2" fill="#c8323c" {...outline} />
        <path d="M50 22 C46 12 52 6 58 8 C54 10 54 16 50 22 Z" fill="#fbf7ee" {...outline} />
      </>}
      item={<path d="M74 98 L86 72" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />}
    />
  ),
  'p-baronin': (
    <Portrait
      id="baronin" bg="#2e6b4f" skin={SKIN.light} garment="#1f8a5c" brows="raised" smile="smile"
      back={<path d="M33 44 C30 30 38 22 50 22 C62 22 70 30 67 44 C68 56 64 64 60 66 L40 66 C36 64 32 56 33 44 Z" fill="#8a4a24" {...outline} />}
      collar={<>
        <path d="M30 78 C40 86 60 86 70 78" fill="none" stroke="#fbf7ee" strokeWidth="3" strokeDasharray="0.1 4.5" strokeLinecap="round" />
        <path d="M40 72 C44 80 56 80 60 72" fill="none" stroke="#fbf7ee" strokeWidth="2.6" strokeDasharray="0.1 3.6" strokeLinecap="round" />
        {jewel(50, 82, '#c8323c', 2.4)}
      </>}
      hair={<>
        <path d="M36.5 44 C36 28 64 28 63.5 44 C58 34 42 34 36.5 44 Z" fill="#8a4a24" {...outline} />
        <circle cx="50" cy="20" r="7" fill="#8a4a24" {...outline} />
      </>}
      hat={<>
        <path d="M39 30 C42 23 58 23 61 30" fill="none" stroke={GOLD} strokeWidth="2.5" />
        <path d="M46 27 L50 21 L54 27" fill={GOLD} {...outline} />
        {jewel(50, 24, '#3a6fd8', 1.4)}
      </>}
      item={<>
        <path d="M66 96 L72 76 L84 82 Z" fill="#f4b73a" {...outline} />
        <path d="M66 96 L74 78 M66 96 L78 80 M66 96 L81 81" stroke={INK} strokeWidth="1" />
      </>}
    />
  ),
  'p-aebtissin': (
    <Portrait
      id="aebtissin" bg="#4a4a6a" skin={SKIN.mid} garment="#2a2632" brows="calm" smile="smile"
      back={<path d="M28 104 C26 60 32 26 50 24 C68 26 74 60 72 104 Z" fill="#1c1a24" {...outline} />}
      collar={<path d="M38 70 C40 80 60 80 62 70 L62 76 C58 86 42 86 38 76 Z" fill="#fbf7ee" {...outline} />}
      hair={<path d="M35 52 C33 34 40 27 50 27 C60 27 67 34 65 52 C63 40 58 34 50 34 C42 34 37 40 35 52 Z" fill="#fbf7ee" {...outline} />}
      item={<>
        <path d="M34 82 C40 96 60 96 66 82" fill="none" stroke="#c9a06a" strokeWidth="2.8" strokeDasharray="0.1 4" strokeLinecap="round" />
        <path d="M50 92 V100 M47 95 H53" stroke={GOLD} strokeWidth="2.2" />
      </>}
    />
  ),
  'p-ritter': (
    <Portrait
      id="ritter" bg="#6b2e1e" skin={SKIN.light} garment="#9aa3ad" brows="proud" smile="flat"
      collar={<>
        <path d="M22 104 C24 84 34 76 50 76 C66 76 76 84 78 104" fill="none" stroke="#6f7882" strokeWidth="1.4" strokeDasharray="2 2" />
        <path d="M38 80 H62 V104 H38 Z" fill="#c8323c" {...outline} />
        <path d="M50 84 V100 M43 90 H57" stroke={GOLD} strokeWidth="3" />
      </>}
      hat={<>
        <path d="M34 44 C34 22 66 22 66 44 L66 40 C60 36 40 36 34 40 Z" fill="#b8c0c8" {...outline} />
        <path d="M34 44 C34 22 66 22 66 44" fill="none" {...outline} />
        <path d="M50 24 V40" stroke="#6f7882" strokeWidth="1.5" />
        <path d="M48.5 40 H51.5 V52 H48.5 Z" fill="#b8c0c8" {...outline} />
        <path d="M58 26 C62 10 74 10 76 16 C70 14 66 20 62 30 Z" fill="#c8323c" {...outline} />
      </>}
      item={<>
        <path d="M80 102 L80 70" stroke="#d6dde3" strokeWidth="4" strokeLinecap="round" />
        <path d="M72 72 H88" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="80" cy="66" r="2.6" fill={GOLD} {...outline} />
      </>}
    />
  ),
  'p-naeherin': (
    <Portrait
      id="naeherin" bg="#b5654a" skin={SKIN.deep} garment="#f2c14e" brows="raised" smile="grin"
      collar={<path d="M36 74 C42 82 58 82 64 74 L60 72 C56 76 44 76 40 72 Z" fill="#fbf7ee" {...outline} />}
      hair={<path d="M36.5 46 C36 36 64 36 63.5 46 C60 42 40 42 36.5 46 Z" fill="#2a1a10" {...outline} />}
      hat={<>
        <path d="M34 42 C34 24 66 24 66 42 C60 34 40 34 34 42 Z" fill="#c8323c" {...outline} />
        <circle cx="66" cy="34" r="3.5" fill="#c8323c" {...outline} />
        {[42, 50, 58].map((x) => <circle key={x} cx={x} cy="31" r="1.3" fill="#fbf7ee" />)}
      </>}
      item={<>
        <rect x="65" y="76" width="12" height="15" rx="2" fill="#3a6fd8" {...outline} />
        <path d="M64 76 H78 M64 91 H78" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M71 76 C67 66 77 60 73 52" fill="none" stroke="#3a6fd8" strokeWidth="1.4" />
        <path d="M73 52 L77 40" stroke="#d6dde3" strokeWidth="2" strokeLinecap="round" />
      </>}
    />
  ),
  'p-maurer': (
    <Portrait
      id="maurer" bg="#5a6b7a" skin={SKIN.tan} garment="#3a5f94" brows="calm" smile="grin"
      collar={<>
        <path d="M40 72 L50 82 L60 72" fill="none" {...outline} />
        <path d="M30 88 H70" stroke="#2e4a74" strokeWidth="2" />
      </>}
      face={<path d="M40 56 C44 60 56 60 60 56" fill="none" stroke="#5b3b1e" strokeWidth="1.2" strokeDasharray="1 1.6" />}
      hat={<>
        <path d="M35 36 C37 26 63 26 65 36 Z" fill="#7a5a3a" {...outline} />
        <path d="M34 36 H72 C70 40 62 40 58 39 L34 39 Z" fill="#6b4c30" {...outline} />
      </>}
      item={<>
        <path d="M70 76 L86 64 L84 80 Z" fill="#c9ced4" {...outline} />
        <path d="M70 76 L64 84" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />
        <rect x="16" y="86" width="16" height="9" fill="#b8553a" {...outline} />
        <rect x="20" y="78" width="16" height="9" fill="#c8673a" {...outline} />
      </>}
    />
  ),
  'p-koechin': (
    <Portrait
      id="koechin" bg="#b07a12" skin={SKIN.light} garment="#e3783c" brows="raised" smile="grin"
      collar={<path d="M34 104 V82 C40 78 60 78 66 82 V104 Z" fill="#fbf7ee" {...outline} />}
      hair={<path d="M36.5 46 C36 38 64 38 63.5 46 C60 44 40 44 36.5 46 Z" fill="#c8673a" {...outline} />}
      hat={<path d="M38 38 L38 28 C28 24 32 10 42 14 C44 4 56 4 58 14 C68 10 72 24 62 28 L62 38 Z" fill="#fbf7ee" {...outline} />}
      item={<>
        <path d="M80 100 L78 66" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 60 C70 70 86 70 86 60 Z" fill="#c9ced4" {...outline} />
      </>}
    />
  ),
  'p-schaeferin': (
    <Portrait
      id="schaeferin" bg="#3f7a3a" skin={SKIN.mid} garment="#8fc3e8" brows="raised" smile="smile"
      back={<>
        <path d="M37 48 C30 60 32 74 36 82" fill="none" stroke="#e8c25a" strokeWidth="5" strokeLinecap="round" />
        <path d="M63 48 C70 60 68 74 64 82" fill="none" stroke="#e8c25a" strokeWidth="5" strokeLinecap="round" />
      </>}
      collar={<path d="M40 72 C44 80 56 80 60 72" fill="#fbf7ee" {...outline} />}
      hair={<path d="M36.5 46 C36 34 64 34 63.5 46 C58 38 42 38 36.5 46 Z" fill="#e8c25a" {...outline} />}
      hat={<>
        <ellipse cx="50" cy="34" rx="27" ry="6" fill="#e2b85c" {...outline} />
        <path d="M38 34 C38 22 62 22 62 34 Z" fill="#e2b85c" {...outline} />
        <path d="M38 31 H62" stroke="#c8323c" strokeWidth="3" />
      </>}
      item={<>
        <path d="M20 102 L22 50" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M22 50 C22 40 32 40 32 48" fill="none" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="68" cy="84" r="7" fill="#fbf7ee" {...outline} />
        <circle cx="72.5" cy="81" r="3.6" fill="#fbf7ee" {...outline} />
        <circle cx="62" cy="80" r="4" fill="#2a2230" />
        <circle cx="61" cy="79" r="0.9" fill="#fff" />
      </>}
    />
  ),
  'p-steinmetz': (
    <Portrait
      id="steinmetz" bg="#6b5a4a" skin={SKIN.deep} garment="#d9cdb4" brows="calm" smile="flat"
      collar={<path d="M36 76 H64 V104 H36 Z" fill="#8a5a2b" {...outline} />}
      hair={<path d="M36.5 44 C36 30 64 30 63.5 44 C58 36 42 36 36.5 44 Z" fill="#b9b4ac" {...outline} />}
      face={<path d="M40 52 C42 62 58 62 60 52 C56 57 44 57 40 52 Z" fill="#b9b4ac" {...outline} />}
      item={<>
        <path d="M70 92 L84 70" stroke="#c9ced4" strokeWidth="3" strokeLinecap="round" />
        <path d="M84 70 L87 64" stroke="#c9ced4" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="14" y="70" width="14" height="9" rx="1.5" fill="#6f7882" {...outline} />
        <path d="M21 79 L26 100" stroke="#8a5a2b" strokeWidth="3.5" strokeLinecap="round" />
      </>}
    />
  ),
  'p-bauer': (
    <Portrait
      id="bauer" bg="#8a6a2a" skin={SKIN.light} garment="#4f7a3a" brows="raised" smile="grin"
      collar={<>
        <path d="M38 80 H62 V104 H38 Z" fill="#5c4a8a" {...outline} />
        <path d="M38 80 L34 72 M62 80 L66 72" stroke="#5c4a8a" strokeWidth="3" />
      </>}
      hair={<path d="M36.5 46 C36 38 64 38 63.5 46 C60 42 40 42 36.5 46 Z" fill="#c8673a" {...outline} />}
      face={<path d="M55 55 L64 51" stroke="#e8c25a" strokeWidth="1.6" strokeLinecap="round" />}
      hat={<>
        <ellipse cx="50" cy="36" rx="25" ry="5.5" fill="#e2b85c" {...outline} />
        <path d="M38 36 C38 26 62 26 62 36 Z" fill="#e2b85c" {...outline} />
        <path d="M27 36 l-3 2 M31 39 l-2 3 M69 39 l2 3 M73 36 l3 2" stroke="#a8741a" strokeWidth="1.2" />
      </>}
      item={<>
        <path d="M80 102 L80 58" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M73 58 V48 M80 58 V46 M87 58 V48 M73 58 H87" stroke="#9aa3ad" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </>}
    />
  ),
  'p-narr': (
    <Portrait
      id="narr" bg="#5a1a6b" skin={SKIN.light} garment="#c8323c" brows="raised" smile="grin"
      back={<path d="M50 70 L50 104 L86 104 C84 82 70 70 50 70 Z" fill="#f2c14e" />}
      collar={<>
        <path d="M30 76 L36 84 L42 76 L48 84 L54 76 L60 84 L66 76 L72 84 L70 74 C60 70 40 70 30 74 Z" fill="#3a6fd8" {...outline} />
        {[36, 48, 60].map((x) => <circle key={x} cx={x} cy="86" r="2.2" fill={GOLD} {...outline} />)}
      </>}
      face={<circle cx="50" cy="50" r="2.4" fill="#e8463c" />}
      hat={<>
        <path d="M36 38 C30 26 20 26 16 34 C22 30 28 32 36 40 Z" fill="#3a6fd8" {...outline} />
        <path d="M64 38 C70 26 80 26 84 34 C78 30 72 32 64 40 Z" fill="#f2c14e" {...outline} />
        <path d="M40 34 C40 20 46 10 50 6 C54 10 60 20 60 34 Z" fill="#c8323c" {...outline} />
        <rect x="35" y="33" width="30" height="6" rx="2" fill="#f2c14e" {...outline} />
        {jewel(16, 34, GOLD, 2.6)}{jewel(84, 34, GOLD, 2.6)}{jewel(50, 6, GOLD, 2.6)}
      </>}
      item={<>
        <path d="M20 102 L24 70" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24.5" cy="65" r="5" fill="#f2c14e" {...outline} />
        <path d="M21 62 L19 58 M28 62 L30 58" stroke={INK} strokeWidth="1.4" />
      </>}
    />
  ),
  // Rettungswache ------------------------------------------------------------------------------
  'r-peschel': (
    <Portrait
      id="peschel" bg="#1f4fb4" skin={SKIN.light} garment="#e8412c" brows="proud" smile="grin"
      back={<path d="M16 104 C14 76 26 62 50 60 C74 62 86 76 84 104 Z" fill="#163a8a" {...outline} />}
      collar={<>
        {RESCUE_STRIPES}
        <circle cx="50" cy="83" r="8" fill="#fbf7ee" {...outline} />
        <StarOfLife cx={50} cy={83} r={6.5} />
      </>}
      hair={<path d="M36.5 44 C35 28 52 26 63.5 40 C60 34 50 33 44 36 C40 38 38 40 36.5 44 Z" fill="#3a2414" {...outline} />}
      hat={<Star5 cx={66} cy={22} r={6} fill={GOLD} />}
      item={<>
        <rect x="70" y="80" width="16" height="13" rx="2.5" fill="#2f9e62" {...outline} />
        <path d="M78 83 V90 M74.5 86.5 H81.5" stroke="#fbf7ee" strokeWidth="2.2" />
        <path d="M73 80 C73 75 83 75 83 80" fill="none" {...outline} />
      </>}
    />
  ),
  'r-lna': (
    <Portrait
      id="lna" bg="#2f6b5a" skin={SKIN.mid} garment="#f4f6f8" brows="calm" smile="smile"
      collar={<>
        <path d="M44 72 L50 86 L56 72" fill="#3a6fd8" {...outline} />
        {STETHOSCOPE}
      </>}
      hair={<path d="M36.5 44 C36 30 64 30 63.5 44 C60 36 40 36 36.5 44 Z" fill="#c9c6c0" {...outline} />}
      face={GLASSES}
      item={<>
        <rect x="68" y="74" width="16" height="22" rx="1.5" fill="#c9a06a" {...outline} />
        <rect x="70" y="78" width="12" height="16" fill="#fbf7ee" />
        <path d="M72 82 H80 M72 86 H80 M72 90 H77" stroke={INK} strokeWidth="1" />
        <rect x="73" y="72" width="6" height="4" rx="1" fill="#9aa3ad" {...outline} />
      </>}
    />
  ),
  'r-notaerztin': (
    <Portrait
      id="notaerztin" bg="#7a1c2c" skin={SKIN.light} garment="#f4f6f8" brows="raised" smile="smile"
      back={<path d="M60 36 C74 38 74 60 66 70 C70 56 66 46 60 44 Z" fill="#b5532a" {...outline} />}
      collar={<>
        <path d="M44 72 L50 84 L56 72" fill="#c8323c" {...outline} />
        <path d="M38 72 C36 86 46 92 50 92 C54 92 64 86 62 72" fill="none" stroke="#c8323c" strokeWidth="2.4" />
        <circle cx="50" cy="93" r="3" fill="#9aa3ad" {...outline} />
      </>}
      hair={<path d="M36.5 46 C35 28 64 26 63.5 44 C58 34 46 34 36.5 46 Z" fill="#b5532a" {...outline} />}
      item={<>
        <rect x="68" y="78" width="18" height="6" rx="2" fill="#dff4ff" {...outline} />
        <path d="M86 81 H92 M64 81 H68" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="71" y="79" width="8" height="4" fill="#3a6fd8" opacity="0.6" />
      </>}
    />
  ),
  'r-wachleiter': (
    <Portrait
      id="wachleiter" bg="#5a6b7a" skin={SKIN.tan} garment="#c8323c" brows="proud" smile="flat"
      collar={RESCUE_STRIPES}
      face={<path d="M42 52 C45 49.5 48 50.5 50 51.5 C52 50.5 55 49.5 58 52 C55 53 53 52.5 50 53.5 C47 52.5 45 53 42 52 Z" fill="#3a2414" />}
      hat={<>
        <path d="M35 36 C36 24 64 24 65 36 Z" fill="#1c2340" {...outline} />
        <path d="M34 36 H68 C66 40 58 40 54 39 L34 39 Z" fill="#14182c" {...outline} />
        <circle cx="50" cy="30" r="3" fill={GOLD} {...outline} />
      </>}
      item={<>
        <rect x="68" y="72" width="17" height="23" rx="1.5" fill="#6b4c30" {...outline} />
        <rect x="70" y="76" width="13" height="17" fill="#fbf7ee" />
        <path d="M72 80 l2 2 l4 -4 M72 86 l2 2 l4 -4" stroke="#2f9e62" strokeWidth="1.4" fill="none" />
      </>}
    />
  ),
  'r-praxisanleiterin': (
    <Portrait
      id="praxisanleiterin" bg="#6c3a8e" skin={SKIN.deep} garment="#c8323c" brows="raised" smile="smile"
      back={<path d="M33 46 C30 30 40 24 50 24 C60 24 70 30 67 46 C70 58 66 66 62 68 L38 68 C34 66 30 58 33 46 Z" fill="#1c140e" {...outline} />}
      collar={RESCUE_STRIPES}
      hair={<path d="M36.5 46 C36 30 64 30 63.5 46 C58 36 42 36 36.5 46 Z" fill="#1c140e" {...outline} />}
      face={GLASSES}
      hat={<>
        <path d="M30 28 L50 20 L70 28 L50 36 Z" fill="#1c1a2a" {...outline} />
        <path d="M40 31 V36 C44 39 56 39 60 36 V31" fill="#1c1a2a" {...outline} />
        <path d="M70 28 V38" stroke={GOLD} strokeWidth="1.8" />
        <circle cx="70" cy="39" r="1.8" fill={GOLD} />
      </>}
      item={<>
        <rect x="66" y="76" width="20" height="16" rx="1.5" fill="#3a6fd8" {...outline} />
        <path d="M76 76 V92" stroke={INK} strokeWidth="1.2" />
        <path d="M71 81 V87 M68 84 H74" stroke="#fbf7ee" strokeWidth="2" />
      </>}
    />
  ),
  'r-notsan': (
    <Portrait
      id="notsan" bg="#c8323c" skin={SKIN.light} garment="#e8412c" brows="calm" smile="grin"
      collar={RESCUE_STRIPES}
      hair={<path d="M36.5 46 C36 34 64 34 63.5 46 C60 40 40 40 36.5 46 Z" fill="#7a4424" {...outline} />}
      face={<path d="M40 55 C43 61 57 61 60 55" fill="none" stroke="#7a4424" strokeWidth="1.2" strokeDasharray="1 1.5" />}
      item={<>
        <rect x="64" y="78" width="24" height="16" rx="3" fill="#c8323c" {...outline} />
        <path d="M70 78 C70 72 82 72 82 78" fill="none" {...outline} />
        <rect x="72" y="81" width="8" height="10" fill="#fbf7ee" />
        <path d="M76 82.5 V89.5 M72.8 86 H79.2" stroke="#c8323c" strokeWidth="2.2" />
      </>}
    />
  ),
  'r-rettsan': (
    <Portrait
      id="rettsan" bg="#e09b1a" skin={SKIN.mid} garment="#e8412c" brows="raised" smile="smile"
      back={<path d="M60 30 C78 30 78 56 70 68 C72 54 70 42 62 38 Z" fill="#e8c25a" {...outline} />}
      collar={RESCUE_STRIPES}
      hair={<path d="M36.5 46 C36 28 64 28 63.5 44 C58 34 44 34 36.5 46 Z" fill="#e8c25a" {...outline} />}
      item={<>
        <rect x="70" y="66" width="11" height="30" rx="5" fill="#fbf7ee" {...outline} />
        <rect x="70" y="66" width="11" height="9" rx="4" fill="#2f9e62" {...outline} />
        <rect x="73" y="61" width="5" height="6" fill="#9aa3ad" {...outline} />
      </>}
    />
  ),
  'r-retthelfer': (
    <Portrait
      id="retthelfer" bg="#2f8a55" skin={SKIN.tan} garment="#e8412c" brows="raised" smile="grin"
      collar={RESCUE_STRIPES}
      hat={<>
        <path d="M35 38 C36 26 64 26 65 38 Z" fill="#c8323c" {...outline} />
        <path d="M30 38 H48 V41 H30 Z" fill="#a8232f" {...outline} />
      </>}
      item={<>
        <circle cx="76" cy="84" r="9" fill="#fbf7ee" {...outline} />
        <circle cx="76" cy="84" r="3.5" fill="#e3dccb" {...outline} />
        <path d="M76 75 C86 75 90 66 84 60" fill="none" stroke="#fbf7ee" strokeWidth="4" strokeLinecap="round" />
      </>}
    />
  ),
  'r-disponentin': (
    <Portrait
      id="disponentin" bg="#1f3a6b" skin={SKIN.deep} garment="#3f4a5e" brows="calm" smile="smile"
      back={<>
        {[[34, 36], [40, 28], [50, 25], [60, 28], [66, 36], [32, 46], [68, 46]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill="#1c140e" {...outline} />)}
      </>}
      collar={<path d="M40 72 C44 78 56 78 60 72" fill="none" stroke="#9aa3ad" strokeWidth="3" />}
      hair={<path d="M36.5 44 C36 32 64 32 63.5 44 C60 38 40 38 36.5 44 Z" fill="#1c140e" {...outline} />}
      hat={<>
        <path d="M35 46 C33 26 67 26 65 46" fill="none" stroke="#2a2230" strokeWidth="3" />
        <rect x="31" y="41" width="7" height="11" rx="3" fill="#2a2230" {...outline} />
        <rect x="62" y="41" width="7" height="11" rx="3" fill="#2a2230" {...outline} />
        <path d="M34 51 C34 60 40 60 44 58" fill="none" stroke="#2a2230" strokeWidth="2" />
        <circle cx="45" cy="58" r="2" fill="#c8323c" />
      </>}
      item={<>
        <rect x="66" y="72" width="22" height="15" rx="1.5" fill="#2a2230" {...outline} />
        <rect x="68" y="74" width="18" height="11" fill="#3fb7e8" />
        <path d="M70 80 L74 77 L78 81 L84 76" stroke="#fbf7ee" strokeWidth="1.2" fill="none" />
        <path d="M74 87 L72 94 H82 L80 87" fill="#2a2230" />
      </>}
    />
  ),
  'r-desinfektor': (
    <Portrait
      id="desinfektor" bg="#3f8a8a" skin={SKIN.light} garment="#eef2f5" brows="calm" smile="flat"
      collar={<path d="M44 72 L50 78 L56 72" fill="none" stroke="#9aa3ad" strokeWidth="2" />}
      hair={<path d="M35 44 C34 26 66 26 65 44 C60 36 40 36 35 44 Z" fill="#eef2f5" {...outline} />}
      face={<>
        <path d="M40 52 C42 60 58 60 60 52 C56 54 44 54 40 52 Z" fill="#dfe8ee" {...outline} />
        <path d="M37 50 L40 52 M63 50 L60 52" stroke={INK} strokeWidth="1" />
        <rect x="39" y="41" width="22" height="8" rx="4" fill="#9fe3ff" fillOpacity="0.45" {...outline} />
      </>}
      item={<>
        <rect x="70" y="76" width="12" height="20" rx="3" fill="#2f9e62" {...outline} />
        <path d="M72 76 V71 H82 L86 74" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M88 70 l3 -2 M88 74 l4 0 M88 78 l3 2" stroke="#9fe3ff" strokeWidth="1.4" strokeLinecap="round" />
      </>}
    />
  ),
  'r-azubi': (
    <Portrait
      id="azubi" bg="#8a6a2a" skin={SKIN.mid} garment="#e8412c" brows="raised" smile="grin"
      collar={<>
        {RESCUE_STRIPES}
        <path d="M30 78 L38 104 M70 78 L62 104" stroke="#2a2230" strokeWidth="3" />
      </>}
      hair={<path d="M36 44 L34 34 L40 37 L42 28 L47 34 L51 26 L54 34 L59 28 L60 36 L66 33 L64 44 C58 36 42 36 36 44 Z" fill="#3a2414" {...outline} />}
      item={<>
        <rect x="64" y="74" width="20" height="24" rx="1.5" fill="#3a6fd8" {...outline} />
        <path d="M68 74 V98" stroke={INK} strokeWidth="1.2" />
        <path d="M72 80 H80 M72 84 H80" stroke="#fbf7ee" strokeWidth="1.6" />
      </>}
    />
  ),
  'r-praktikant': (
    <Portrait
      id="praktikant" bg="#6b5a4a" skin={SKIN.light} garment="#c8323c" brows="raised" smile="flat"
      collar={RESCUE_STRIPES}
      hair={<path d="M36.5 44 C36 32 64 32 63.5 44 C56 36 44 40 36.5 44 Z" fill="#e8c25a" {...outline} />}
      face={<path d="M42 44 H48 M52 44 H58" stroke={INK} strokeWidth="1.2" opacity="0.5" />}
      item={<>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${66 + (i % 2) * 6} ${86 - i * 9})`}>
            <path d="M0 0 L2 10 H10 L12 0 Z" fill="#fbf7ee" {...outline} />
            <rect x="-0.5" y="-2" width="13" height="2.5" rx="1" fill="#6b4c30" {...outline} />
          </g>
        ))}
        <path d="M74 56 C72 52 76 50 74 46 M79 56 C77 52 81 50 79 46" fill="none" stroke="#fbf7ee" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      </>}
    />
  ),
  'r-blaulicht': (
    <Portrait
      id="blaulicht" bg="#14183a" skin={SKIN.light} garment="#e8412c" brows="raised" smile="grin"
      back={<>
        <polygon points="50,20 4,0 4,40" fill="#3fa9ff" opacity="0.35" />
        <polygon points="50,20 96,0 96,40" fill="#3fa9ff" opacity="0.35" />
      </>}
      collar={RESCUE_STRIPES}
      hat={<>
        <rect x="38" y="30" width="24" height="6" rx="2" fill="#9aa3ad" {...outline} />
        <path d="M40 30 C40 14 60 14 60 30 Z" fill="#3fa9ff" {...outline} />
        <path d="M45 18 C47 16 50 15 52 16" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M32 18 L26 14 M68 18 L74 14 M30 26 L22 26 M70 26 L78 26" stroke="#9fe3ff" strokeWidth="2" strokeLinecap="round" />
      </>}
      item={<>
        <path d="M66 76 L84 70 L84 90 L66 84 Z" fill="#fbf7ee" {...outline} />
        <rect x="62" y="76" width="5" height="8" fill="#9aa3ad" {...outline} />
        <path d="M88 74 C92 78 92 84 88 88 M92 70 C98 76 98 86 92 92" fill="none" stroke="#fbf7ee" strokeWidth="1.6" strokeLinecap="round" />
      </>}
    />
  ),
  /** Back emblem of the rescue deck: the Star of Life. */
  'r-star': (
    <g>
      <circle cx="50" cy="50" r="46" fill="#fbf7ee" stroke="#c8323c" strokeWidth="4" />
      <StarOfLife cx={50} cy={50} r={36} />
    </g>
  ),
  /** Back emblem: crown above two crossed sceptres in a laurel wreath. */
  'p-wappen': (
    <g>
      <circle cx="50" cy="50" r="46" fill="#3b1f5e" stroke={GOLD} strokeWidth="3" />
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(50 52) scale(${side} 1)`}>
          <path d="M-8 34 A34 34 0 0 1 -30 -18" fill="none" stroke="#2f6b3a" strokeWidth="1.6" />
          {[100, 118, 136, 154, 172, 190, 208].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 34 * Math.cos(rad);
            const y = 34 * Math.sin(rad) * -1 + 0;
            return (
              <ellipse key={deg} cx={x.toFixed(1)} cy={(-y).toFixed(1)} rx="3.2" ry="6.5" fill="#3f8a4a" stroke={INK} strokeWidth="0.8"
                transform={`rotate(${(-deg + 180).toFixed(0)} ${x.toFixed(1)} ${(-y).toFixed(1)})`} />
            );
          })}
        </g>
      ))}
      <path d="M32 76 L68 30 M68 76 L32 30" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="31" cy="29" r="4" fill={GOLD} {...outline} />
      <circle cx="69" cy="29" r="4" fill={GOLD} {...outline} />
      <path d="M34 60 L33 42 L41 50 L46 36 L50 46 L54 36 L59 50 L67 42 L66 60 Z" fill={GOLD} {...outline} />
      <rect x="33" y="58" width="34" height="7" rx="1.5" fill={GOLD} {...outline} />
      {jewel(50, 61.5, '#c8323c', 2.4)}
    </g>
  ),
};

export const PORTRAIT_IDS = Object.keys(PORTRAITS).filter((id) => id.startsWith('p-'));
export const RESCUE_IDS = Object.keys(PORTRAITS).filter((id) => id.startsWith('r-'));

/** The portrait as a full card face, or null if the id is not a figure. */
export function portraitCard(id: string, rank: number): ReactNode | null {
  const el = PORTRAITS[id];
  if (!isValidElement(el) || el.type !== Portrait) return null;
  return cloneElement(el as ReactElement<PortraitSpec>, { mode: 'card', rank });
}
