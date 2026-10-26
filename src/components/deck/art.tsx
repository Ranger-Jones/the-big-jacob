import type { ReactNode } from 'react';
import { PORTRAIT_IDS, PORTRAITS, portraitCard, RankNumeral, RESCUE_IDS } from './portraits';
import { MORE_PORTRAITS, OFFICE_IDS, PIRATE_IDS, UNI_IDS } from './portraits-more';

/**
 * Hand-drawn SVG illustrations for card faces and backs (viewBox 0 0 100 100).
 * Decks reference them by id; custom decks can pick any of them in the editor.
 */

// Heraldic tinctures
const OR = '#e8b33a';
const ARGENT = '#f4f1e8';
const GULES = '#c8323c';
const AZURE = '#2f5fbf';
const VERT = '#2f8a55';
const PURPURE = '#6c3a8e';
const SABLE = '#2a2230';
const LINE = '#2a1a10';

const SHIELD = 'M14 8 H86 V46 C86 71 67 86 50 95 C33 86 14 71 14 46 Z';

type Division = 'plain' | 'pale' | 'fess' | 'bend' | 'chevron' | 'quarterly' | 'chief' | 'saltire' | 'bordure';

function Shield({ id, field, division = 'plain', second, children }: {
  id: string; field: string; division?: Division; second?: string; children: ReactNode;
}) {
  const clip = `shield-${id}`;
  const c = second ?? ARGENT;
  return (
    <g>
      <defs><clipPath id={clip}><path d={SHIELD} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={field} />
        {division === 'pale' && <rect x="50" width="50" height="100" fill={c} />}
        {division === 'fess' && <rect y="52" width="100" height="48" fill={c} />}
        {division === 'bend' && <polygon points="8,8 30,8 92,70 92,92" fill={c} />}
        {division === 'chevron' && <polygon points="10,80 50,44 90,80 90,96 50,60 10,96" fill={c} />}
        {division === 'quarterly' && <><rect x="50" width="50" height="50" fill={c} /><rect y="50" width="50" height="50" fill={c} /></>}
        {division === 'chief' && <rect width="100" height="28" fill={c} />}
        {division === 'saltire' && <><polygon points="8,8 20,8 92,84 92,96 80,96 8,20" fill={c} /><polygon points="92,8 80,8 8,84 8,96 20,96 92,20" fill={c} /></>}
        {division === 'bordure' && <path d={SHIELD} fill="none" stroke={c} strokeWidth="14" />}
        {children}
      </g>
      <path d={SHIELD} fill="none" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 13 H44" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

const charge = { stroke: LINE, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Star({ cx, cy, r, fill, inner = 0.42, points = 5, rotate = -90 }: { cx: number; cy: number; r: number; fill: string; inner?: number; points?: number; rotate?: number }) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = ((rotate + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} />;
}

// ---------------------------------------------------------------------------------------------
// Heraldik

const heraldry: Record<string, ReactNode> = {
  'h-crown': (
    <Shield id="crown" field={PURPURE} division="bordure" second={OR}>
      <path d="M28 62 L26 36 L38 46 L44 28 L50 42 L56 28 L62 46 L74 36 L72 62 Z" fill={OR} {...charge} />
      <rect x="27" y="60" width="46" height="9" rx="2" fill={OR} {...charge} />
      <circle cx="50" cy="64.5" r="2.6" fill={GULES} /><circle cx="38" cy="64.5" r="2" fill={AZURE} /><circle cx="62" cy="64.5" r="2" fill={AZURE} />
      <circle cx="44" cy="27" r="2.6" fill={ARGENT} stroke={LINE} strokeWidth="1.5" /><circle cx="56" cy="27" r="2.6" fill={ARGENT} stroke={LINE} strokeWidth="1.5" />
    </Shield>
  ),
  'h-mitre': (
    <Shield id="mitre" field={ARGENT} division="pale" second={GULES}>
      <path d="M36 72 L36 44 C36 32 50 20 50 20 C50 20 64 32 64 44 L64 72 Z" fill={OR} {...charge} />
      <path d="M50 26 V70 M40 50 H60" stroke={GULES} strokeWidth="4" />
      <path d="M40 72 L36 86 M60 72 L64 86" stroke={OR} strokeWidth="4" strokeLinecap="round" />
    </Shield>
  ),
  'h-swords': (
    <Shield id="swords" field={AZURE} division="chief" second={OR}>
      <g transform="rotate(35 50 55)"><rect x="47.5" y="20" width="5" height="50" fill={ARGENT} {...charge} /><rect x="38" y="66" width="24" height="5" rx="2" fill={OR} {...charge} /><rect x="47.5" y="71" width="5" height="11" fill={SABLE} /></g>
      <g transform="rotate(-35 50 55)"><rect x="47.5" y="20" width="5" height="50" fill={ARGENT} {...charge} /><rect x="38" y="66" width="24" height="5" rx="2" fill={OR} {...charge} /><rect x="47.5" y="71" width="5" height="11" fill={SABLE} /></g>
    </Shield>
  ),
  'h-rose': (
    <Shield id="rose" field={ARGENT} division="bend" second={VERT}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={50 + 12 * Math.cos(((a - 90) * Math.PI) / 180)} cy={50 + 12 * Math.sin(((a - 90) * Math.PI) / 180)} r="11" fill={GULES} {...charge} />
      ))}
      <circle cx="50" cy="50" r="8" fill={OR} {...charge} />
    </Shield>
  ),
  'h-chalice': (
    <Shield id="chalice" field={PURPURE} division="fess" second={ARGENT}>
      <path d="M32 26 H68 C68 44 60 52 50 52 C40 52 32 44 32 26 Z" fill={OR} {...charge} />
      <rect x="47" y="52" width="6" height="16" fill={OR} {...charge} />
      <path d="M36 76 C36 68 64 68 64 76 Z" fill={OR} {...charge} />
      <circle cx="50" cy="20" r="5" fill={ARGENT} stroke={LINE} strokeWidth="1.5" />
    </Shield>
  ),
  'h-cross': (
    <Shield id="cross" field={GULES}>
      <path d="M43 18 H57 V40 H79 V54 H57 V84 H43 V54 H21 V40 H43 Z" fill={ARGENT} {...charge} />
    </Shield>
  ),
  'h-star': (
    <Shield id="star" field={AZURE} division="quarterly" second={SABLE}>
      <Star cx={50} cy={48} r={24} fill={OR} />
      <Star cx={50} cy={48} r={24} fill="none" />
      <circle cx="50" cy="48" r="4" fill={ARGENT} />
    </Shield>
  ),
  'h-tower': (
    <Shield id="tower" field={VERT} division="chief" second={ARGENT}>
      <path d="M32 80 V36 H38 V30 H45 V36 H55 V30 H62 V36 H68 V80 Z" fill={ARGENT} {...charge} />
      <path d="M44 80 V64 C44 58 56 58 56 64 V80 Z" fill={SABLE} />
      <rect x="47" y="44" width="6" height="9" rx="3" fill={SABLE} />
    </Shield>
  ),
  'h-cauldron': (
    <Shield id="cauldron" field={OR} division="saltire" second={GULES}>
      <path d="M28 48 H72 C72 66 62 74 50 74 C38 74 28 66 28 48 Z" fill={SABLE} {...charge} />
      <rect x="24" y="44" width="52" height="7" rx="3" fill={SABLE} {...charge} />
      <path d="M40 38 C36 32 44 28 40 22 M52 38 C48 32 56 28 52 22 M62 38 C58 32 66 28 62 22" stroke={ARGENT} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M36 74 L32 82 M64 74 L68 82" stroke={SABLE} strokeWidth="4" strokeLinecap="round" />
    </Shield>
  ),
  'h-crescent': (
    <Shield id="crescent" field={AZURE} division="bordure" second={ARGENT}>
      <path d="M62 28 A24 24 0 1 0 62 72 A19 19 0 1 1 62 28 Z" fill={ARGENT} {...charge} />
      <Star cx={66} cy={50} r={7} fill={OR} />
    </Shield>
  ),
  'h-hammer': (
    <Shield id="hammer" field={ARGENT} division="chevron" second={AZURE}>
      <rect x="47" y="34" width="6" height="46" rx="2" fill="#8a5a2b" {...charge} />
      <path d="M30 24 H70 V38 H30 Z" fill={SABLE} {...charge} />
      <path d="M30 24 L24 31 L30 38" fill={SABLE} {...charge} />
    </Shield>
  ),
  'h-wheel': (
    <Shield id="wheel" field={VERT} division="fess" second={OR}>
      <circle cx="50" cy="50" r="22" fill="none" stroke="#8a5a2b" strokeWidth="6" />
      <circle cx="50" cy="50" r="22" fill="none" stroke={LINE} strokeWidth="1.5" />
      {[0, 45, 90, 135].map((a) => <line key={a} x1="50" y1="28" x2="50" y2="72" stroke="#8a5a2b" strokeWidth="4" transform={`rotate(${a} 50 50)`} />)}
      <circle cx="50" cy="50" r="6" fill={OR} {...charge} />
    </Shield>
  ),
  'h-jester': (
    <Shield id="jester" field={GULES} division="pale" second={OR}>
      <path d="M26 66 C26 46 30 34 22 22 C38 26 44 40 50 48 C56 40 62 26 78 22 C70 34 74 46 74 66 Z" fill={PURPURE} {...charge} />
      <path d="M50 48 C50 36 48 26 50 16" stroke={LINE} strokeWidth="2" fill="none" />
      <path d="M50 48 C46 34 42 26 50 16 C58 26 54 34 50 48 Z" fill={VERT} {...charge} />
      <rect x="24" y="64" width="52" height="9" rx="3" fill={OR} {...charge} />
      <circle cx="22" cy="22" r="4.5" fill={OR} {...charge} /><circle cx="78" cy="22" r="4.5" fill={OR} {...charge} /><circle cx="50" cy="15" r="4.5" fill={OR} {...charge} />
    </Shield>
  ),
};

// ---------------------------------------------------------------------------------------------
// Kosmos

const NIGHT = '#17143a';
const STARLIGHT = '#fff6d6';

function Sky({ id, children, glow = '#3b2f7a' }: { id: string; children: ReactNode; glow?: string }) {
  const g = `sky-${id}`;
  return (
    <g>
      <defs>
        <radialGradient id={g} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor={glow} />
          <stop offset="1" stopColor={NIGHT} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} stroke={OR} strokeWidth="2.5" />
      {[[18, 30], [80, 24], [72, 78], [26, 74], [86, 52], [14, 54], [40, 14], [62, 88]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill={STARLIGHT} opacity="0.8" />
      ))}
      {children}
    </g>
  );
}

const cosmos: Record<string, ReactNode> = {
  'k-sun': (
    <Sky id="sun" glow="#7a3b1e">
      {Array.from({ length: 12 }, (_, i) => (
        <polygon key={i} points="50,14 54,30 46,30" fill={OR} transform={`rotate(${i * 30} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="18" fill="#ffcf4d" stroke="#e08a1e" strokeWidth="3" />
      <circle cx="44" cy="47" r="2" fill="#7a3b1e" /><circle cx="56" cy="47" r="2" fill="#7a3b1e" />
      <path d="M43 55 C47 59 53 59 57 55" stroke="#7a3b1e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Sky>
  ),
  'k-fullmoon': (
    <Sky id="fullmoon">
      <circle cx="50" cy="50" r="24" fill="#e9e4d4" />
      <circle cx="42" cy="42" r="5" fill="#cfc8b4" /><circle cx="58" cy="56" r="7" fill="#cfc8b4" /><circle cx="56" cy="38" r="3" fill="#cfc8b4" /><circle cx="40" cy="60" r="3.5" fill="#cfc8b4" />
    </Sky>
  ),
  'k-saturn': (
    <Sky id="saturn">
      <ellipse cx="50" cy="52" rx="34" ry="9" fill="none" stroke="#e8c27a" strokeWidth="4" transform="rotate(-18 50 52)" />
      <circle cx="50" cy="50" r="17" fill="#d9a35b" />
      <path d="M34 45 H66 M34 54 H66" stroke="#b97f3d" strokeWidth="3" />
      <path d="M17 60 A34 9 -18 0 0 83 44" fill="none" stroke="#e8c27a" strokeWidth="4" transform="rotate(0)" />
    </Sky>
  ),
  'k-comet': (
    <Sky id="comet">
      <path d="M30 70 L76 26 L68 40 L80 36 L62 52 Z" fill="#7fd3ff" opacity="0.55" />
      <path d="M36 66 L70 32" stroke="#c9f0ff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <circle cx="33" cy="68" r="9" fill="#e9fbff" />
    </Sky>
  ),
  'k-constellation': (
    <Sky id="constellation">
      <polyline points="22,62 36,40 52,48 64,30 78,40 70,64 52,48" fill="none" stroke="#9fb4ff" strokeWidth="1.5" strokeDasharray="3 2" />
      {[[22, 62], [36, 40], [52, 48], [64, 30], [78, 40], [70, 64]].map(([x, y]) => <Star key={`${x}${y}`} cx={x} cy={y} r={5} fill={STARLIGHT} inner={0.4} />)}
    </Sky>
  ),
  'k-crescent': (
    <Sky id="crescent">
      <path d="M58 22 A30 30 0 1 0 58 78 A40 40 0 0 1 58 22 Z" fill="#ffe7a3" />
      <Star cx={70} cy={34} r={6} fill={STARLIGHT} />
    </Sky>
  ),
  'k-earth': (
    <Sky id="earth">
      <circle cx="50" cy="50" r="24" fill="#3a7bd5" />
      <path d="M36 36 C44 32 48 40 44 46 C40 52 32 50 30 44 Z M54 30 C62 30 70 38 66 44 C60 46 56 40 54 30 Z M48 58 C56 56 64 62 58 70 C52 72 46 66 48 58 Z" fill="#3fa65b" />
      <path d="M30 40 C40 38 46 44 58 40 M28 56 C40 54 52 60 72 54" stroke="#fff" strokeWidth="2" opacity="0.6" fill="none" />
    </Sky>
  ),
  'k-northstar': (
    <Sky id="northstar" glow="#2b3f86">
      <circle cx="50" cy="50" r="20" fill={STARLIGHT} opacity="0.15" />
      <Star cx={50} cy={50} r={30} fill={STARLIGHT} inner={0.18} points={4} rotate={-90} />
      <Star cx={50} cy={50} r={14} fill="#bfe1ff" inner={0.25} points={4} rotate={-45} />
    </Sky>
  ),
  'k-galaxy': (
    <Sky id="galaxy" glow="#5a2b7a">
      <path d="M50 50 C50 40 64 40 64 52 C64 66 44 68 38 56 C30 40 50 26 66 32 C82 40 80 66 62 74 C42 82 20 70 22 48" fill="none" stroke="#d6b8ff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="50" r="5" fill={STARLIGHT} />
    </Sky>
  ),
  'k-meteors': (
    <Sky id="meteors">
      {[[26, 30], [44, 22], [62, 36], [34, 52], [56, 58]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <line x1={x} y1={y} x2={x + 16} y2={y + 16} stroke="#ffb46b" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <circle cx={x + 16} cy={y + 16} r="3" fill="#ffe2b8" />
        </g>
      ))}
    </Sky>
  ),
  'k-asteroid': (
    <Sky id="asteroid">
      <polygon points="32,40 44,26 62,28 74,42 70,62 54,74 36,68 26,54" fill="#8d8478" stroke="#5b544b" strokeWidth="2" />
      <circle cx="46" cy="44" r="6" fill="#6f675d" /><circle cx="60" cy="58" r="4" fill="#6f675d" /><circle cx="40" cy="60" r="3" fill="#6f675d" />
    </Sky>
  ),
  'k-shootingstar': (
    <Sky id="shootingstar">
      <path d="M20 76 L58 40" stroke="url(#trail)" strokeWidth="7" strokeLinecap="round" />
      <defs><linearGradient id="trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff6d6" /></linearGradient></defs>
      <Star cx={62} cy={36} r={13} fill="#ffd35c" />
    </Sky>
  ),
  'k-ufo': (
    <Sky id="ufo" glow="#1f5c4a">
      <polygon points="40,58 60,58 74,88 26,88" fill="#9effa0" opacity="0.35" />
      <ellipse cx="50" cy="40" rx="12" ry="11" fill="#bfe9ff" stroke="#3a6b7a" strokeWidth="2" />
      <ellipse cx="50" cy="52" rx="28" ry="9" fill="#a9b3c2" stroke="#4a5363" strokeWidth="2" />
      {[30, 40, 50, 60, 70].map((x) => <circle key={x} cx={x} cy="53" r="2.2" fill="#ffe066" />)}
      <circle cx="46" cy="38" r="2" fill="#2d3a40" /><circle cx="54" cy="38" r="2" fill="#2d3a40" />
    </Sky>
  ),
};

// ---------------------------------------------------------------------------------------------
// Schatzkammer (gems)

function Gem({ shape, color, light, dark }: { shape: 'diamond' | 'emerald' | 'round' | 'heart' | 'pear' | 'oval' | 'square' | 'tri' | 'hex' | 'marquise' | 'cushion' | 'baguette' | 'cabochon'; color: string; light: string; dark: string }) {
  const facet = { stroke: dark, strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  switch (shape) {
    case 'diamond':
      return <g><polygon points="22,40 34,26 66,26 78,40 50,80" fill={color} {...facet} /><polygon points="22,40 78,40 50,80" fill={dark} opacity="0.35" /><polygon points="34,26 42,40 50,26 58,40 66,26" fill={light} opacity="0.8" /><path d="M42 40 L50 80 L58 40" fill="none" {...facet} /></g>;
    case 'emerald':
      return <g><polygon points="32,20 68,20 78,30 78,70 68,80 32,80 22,70 22,30" fill={color} {...facet} /><rect x="34" y="32" width="32" height="36" fill={light} opacity="0.45" {...facet} /><path d="M22 30 L34 32 M78 30 L66 32 M22 70 L34 68 M78 70 L66 68" {...facet} /></g>;
    case 'round':
      return <g><circle cx="50" cy="50" r="30" fill={color} {...facet} /><polygon points="50,28 66,40 62,60 38,60 34,40" fill={light} opacity="0.5" {...facet} /><path d="M50 20 L50 28 M78 40 L66 40 M70 74 L62 60 M30 74 L38 60 M22 40 L34 40" {...facet} /></g>;
    case 'heart':
      return <g><path d="M50 80 C20 60 18 40 30 30 C40 22 50 30 50 38 C50 30 60 22 70 30 C82 40 80 60 50 80 Z" fill={color} {...facet} /><path d="M50 38 L42 52 L50 72 L58 52 Z" fill={light} opacity="0.5" {...facet} /></g>;
    case 'pear':
      return <g><path d="M50 18 C62 36 76 50 76 62 C76 76 64 82 50 82 C36 82 24 76 24 62 C24 50 38 36 50 18 Z" fill={color} {...facet} /><path d="M50 30 L60 58 L50 72 L40 58 Z" fill={light} opacity="0.5" {...facet} /></g>;
    case 'oval':
      return <g><ellipse cx="50" cy="50" rx="22" ry="32" fill={color} {...facet} /><ellipse cx="50" cy="50" rx="11" ry="18" fill={light} opacity="0.5" {...facet} /><path d="M50 18 L50 32 M50 68 L50 82 M28 50 L39 50 M61 50 L72 50" {...facet} /></g>;
    case 'square':
      return <g><rect x="24" y="24" width="52" height="52" fill={color} {...facet} /><polygon points="50,30 70,50 50,70 30,50" fill={light} opacity="0.5" {...facet} /><path d="M24 24 L30 50 M76 24 L70 50 M24 76 L30 50 M76 76 L70 50" {...facet} /></g>;
    case 'tri':
      return <g><polygon points="50,18 82,76 18,76" fill={color} {...facet} /><polygon points="50,40 64,66 36,66" fill={light} opacity="0.5" {...facet} /></g>;
    case 'hex':
      return <g><polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill={color} {...facet} /><polygon points="50,34 64,42 64,58 50,66 36,58 36,42" fill={light} opacity="0.5" {...facet} /></g>;
    case 'marquise':
      return <g><path d="M50 16 C68 34 68 66 50 84 C32 66 32 34 50 16 Z" fill={color} {...facet} /><path d="M50 30 C58 42 58 58 50 70 C42 58 42 42 50 30 Z" fill={light} opacity="0.5" {...facet} /></g>;
    case 'cushion':
      return <g><rect x="22" y="22" width="56" height="56" rx="16" fill={color} {...facet} /><rect x="36" y="36" width="28" height="28" rx="6" fill={light} opacity="0.5" {...facet} /></g>;
    case 'baguette':
      return <g><rect x="34" y="16" width="32" height="68" fill={color} {...facet} /><rect x="42" y="26" width="16" height="48" fill={light} opacity="0.5" {...facet} /></g>;
    case 'cabochon':
      return <g><ellipse cx="50" cy="52" rx="30" ry="24" fill={color} {...facet} /><ellipse cx="42" cy="44" rx="10" ry="6" fill="#fff" opacity="0.6" /></g>;
  }
}

function Treasure({ children }: { children: ReactNode }) {
  return (
    <g>
      <circle cx="50" cy="50" r="46" fill="#2b1b10" stroke={OR} strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={OR} strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
      {children}
      <path d="M30 26 L33 22 L36 26 L33 30 Z M70 72 L72 69 L74 72 L72 75 Z" fill="#fff" opacity="0.8" />
    </g>
  );
}

const gems: Record<string, ReactNode> = {
  'g-diamond': <Treasure><Gem shape="diamond" color="#dff4ff" light="#ffffff" dark="#6aa6c9" /></Treasure>,
  'g-ruby': <Treasure><Gem shape="heart" color="#d61f45" light="#ff8aa2" dark="#7a0f26" /></Treasure>,
  'g-sapphire': <Treasure><Gem shape="round" color="#2a5bd7" light="#8fb2ff" dark="#14306f" /></Treasure>,
  'g-emerald': <Treasure><Gem shape="emerald" color="#1fa264" light="#8ff0bd" dark="#0d5434" /></Treasure>,
  'g-amethyst': <Treasure><Gem shape="pear" color="#8d4fd1" light="#d0a8ff" dark="#4a2275" /></Treasure>,
  'g-topaz': <Treasure><Gem shape="oval" color="#f2a33a" light="#ffd89a" dark="#8a5410" /></Treasure>,
  'g-aquamarine': <Treasure><Gem shape="square" color="#4fd1d9" light="#c2fbff" dark="#1b7479" /></Treasure>,
  'g-garnet': <Treasure><Gem shape="tri" color="#9b1b30" light="#e0697d" dark="#4f0c18" /></Treasure>,
  'g-peridot': <Treasure><Gem shape="hex" color="#9ccc3a" light="#e1ff9e" dark="#557017" /></Treasure>,
  'g-citrine': <Treasure><Gem shape="marquise" color="#f3d23c" light="#fff1a3" dark="#8c7410" /></Treasure>,
  'g-opal': <Treasure><Gem shape="cushion" color="#cfe3f0" light="#ffd2f0" dark="#7a8ea0" /></Treasure>,
  'g-quartz': <Treasure><Gem shape="baguette" color="#e9e2ef" light="#ffffff" dark="#8f8799" /></Treasure>,
  'g-pebble': <Treasure><Gem shape="cabochon" color="#7d6e5f" light="#b7a896" dark="#3f362c" /></Treasure>,
};

export const ART: Record<string, ReactNode> = { ...PORTRAITS, ...MORE_PORTRAITS, ...heraldry, ...cosmos, ...gems };

export const ART_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Hofstaat', ids: PORTRAIT_IDS },
  { label: 'Rettungswache', ids: RESCUE_IDS },
  { label: 'Piraten', ids: PIRATE_IDS },
  { label: 'Uni-Leben', ids: UNI_IDS },
  { label: 'Amtsstube', ids: OFFICE_IDS },
  { label: 'Heraldik', ids: Object.keys(heraldry) },
  { label: 'Kosmos', ids: Object.keys(cosmos) },
  { label: 'Schatzkammer', ids: Object.keys(gems) },
];

export function hasArt(id: string | null | undefined): id is string {
  return typeof id === 'string' && Object.hasOwn(ART, id);
}

/** One illustration, scaled to its container. */
export function CardArt({ id, className }: { id: string; className?: string }) {
  if (!hasArt(id)) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {ART[id]}
    </svg>
  );
}

/**
 * The illustration as a full card face (viewBox 100×140): figures are scaled up into a scene,
 * other motifs sit large under the gold numeral on a background in the deck's frame colour.
 */
export function FullCardArt({ id, rank, bg, className, numeral = true }: { id: string; rank: number; bg: string; className?: string; numeral?: boolean }) {
  if (!hasArt(id)) return null;
  const portrait = portraitCard(ART[id], rank, numeral);
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {portrait ?? (
        <g>
          <defs>
            <radialGradient id={`scene-${id}`} cx="50%" cy="62%" r="70%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>
          </defs>
          <rect width="100" height="140" fill={bg} />
          <rect width="100" height="140" fill={`url(#scene-${id})`} />
          {Array.from({ length: 16 }, (_, i) => (
            <polygon key={i} points="50,88 45,-60 55,-60" fill="#ffffff" opacity="0.06" transform={`rotate(${i * 22.5} 50 88)`} />
          ))}
          <g transform="translate(15 53) scale(0.7)">{ART[id]}</g>
          {numeral && <RankNumeral rank={rank} id={id} />}
        </g>
      )}
    </svg>
  );
}
