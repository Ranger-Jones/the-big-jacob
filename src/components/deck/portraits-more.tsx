import type { ReactNode } from 'react';
import { GLASSES, GOLD, INK, outline, Portrait, SKIN } from './portraits';

/**
 * More drawn decks built from the shared portrait figure: pirates, university life and the
 * public office ("Amtsstube"). Small reusable parts keep each figure to a few lines.
 */

// --- Hair ---------------------------------------------------------------------------------------
const hairShort = (c: string) => <path d="M36.5 44 C36 30 64 30 63.5 44 C60 36 40 36 36.5 44 Z" fill={c} {...outline} />;
const hairBuzz = (c: string) => <path d="M36.5 46 C36 34 64 34 63.5 46 C60 40 40 40 36.5 46 Z" fill={c} {...outline} />;
const hairSide = (c: string) => <path d="M36.5 48 C35 42 36 38 38 37 L39 46 Z M63.5 48 C65 42 64 38 62 37 L61 46 Z" fill={c} {...outline} />;
const hairMessy = (c: string) => <path d="M36 44 L34 34 L40 37 L42 28 L47 34 L51 26 L54 34 L59 28 L60 36 L66 33 L64 44 C58 36 42 36 36 44 Z" fill={c} {...outline} />;
const hairLongBack = (c: string) => <path d="M33 46 C30 30 40 24 50 24 C60 24 70 30 67 46 C70 60 66 68 62 70 L38 70 C34 68 30 60 33 46 Z" fill={c} {...outline} />;
const hairFringe = (c: string) => <path d="M36.5 46 C35 28 64 26 63.5 44 C58 34 46 34 36.5 46 Z" fill={c} {...outline} />;
const ponytail = (c: string) => <path d="M60 32 C78 32 78 58 70 68 C72 54 70 44 62 40 Z" fill={c} {...outline} />;
const bun = (c: string) => <circle cx="50" cy="22" r="7" fill={c} {...outline} />;
const beard = (c: string) => <path d="M37 48 C37 66 63 66 63 48 C60 57 54 56 50 58 C46 56 40 57 37 48 Z" fill={c} {...outline} />;
const stubble = (c: string) => <path d="M40 55 C43 61 57 61 60 55" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="1 1.5" />;
const moustache = (c: string) => <path d="M42 52 C45 49.5 48 50.5 50 51.5 C52 50.5 55 49.5 58 52 C55 53 53 52.5 50 53.5 C47 52.5 45 53 42 52 Z" fill={c} />;
const freckles = <path d="M41 49 h.1 M43 50.5 h.1 M57 49 h.1 M59 50.5 h.1" stroke="#a0522d" strokeWidth="1.6" strokeLinecap="round" />;
const tired = <path d="M42 48.5 Q45 50 48 48.5 M52 48.5 Q55 50 58 48.5" fill="none" stroke="#6b4c8a" strokeWidth="1.2" opacity="0.7" />;
const eyepatch = <><path d="M37 40 L63 50" stroke={INK} strokeWidth="1.5" /><ellipse cx="55" cy="46" rx="4.2" ry="3.6" fill={INK} /></>;

// --- Hats ---------------------------------------------------------------------------------------
const tricorne = (c: string, trim = GOLD) => (
  <>
    <path d="M26 34 C34 18 66 18 74 34 C64 30 36 30 26 34 Z" fill={c} {...outline} />
    <path d="M30 32 C40 28 60 28 70 32" fill="none" stroke={trim} strokeWidth="2" />
  </>
);
const bandana = (c: string) => (
  <>
    <path d="M35 40 C35 26 65 26 65 40 C60 34 40 34 35 40 Z" fill={c} {...outline} />
    <path d="M65 36 L72 40 L68 44 Z" fill={c} {...outline} />
    {[42, 50, 58].map((x) => <circle key={x} cx={x} cy="32" r="1.2" fill="#fbf7ee" />)}
  </>
);
const cap = (c: string) => (
  <>
    <path d="M35 36 C36 24 64 24 65 36 Z" fill={c} {...outline} />
    <path d="M34 36 H70 C68 40 60 40 56 39 L34 39 Z" fill={c} {...outline} />
  </>
);
const beanie = (c: string) => (
  <>
    <path d="M35 40 C34 22 66 22 65 40 Z" fill={c} {...outline} />
    <rect x="34" y="36" width="32" height="6" rx="2" fill={c} {...outline} />
    <circle cx="50" cy="20" r="4" fill="#fbf7ee" {...outline} />
  </>
);
const mortarboard = (
  <>
    <path d="M30 28 L50 20 L70 28 L50 36 Z" fill="#1c1a2a" {...outline} />
    <path d="M40 31 V36 C44 39 56 39 60 36 V31" fill="#1c1a2a" {...outline} />
    <path d="M70 28 V38" stroke={GOLD} strokeWidth="1.8" />
    <circle cx="70" cy="39" r="1.8" fill={GOLD} />
  </>
);
const toque = <path d="M38 38 L38 28 C28 24 32 10 42 14 C44 4 56 4 58 14 C68 10 72 24 62 28 L62 38 Z" fill="#fbf7ee" {...outline} />;
const partyHat = (
  <>
    <path d="M40 34 L50 6 L60 34 Z" fill="#e46aa0" {...outline} />
    <path d="M43 26 L57 26 M46 18 L54 18" stroke="#f4b73a" strokeWidth="2.5" />
    <circle cx="50" cy="6" r="3" fill="#3fa9ff" {...outline} />
  </>
);
const visor = (
  <>
    <path d="M34 36 C36 30 64 30 66 36 L70 40 L30 40 Z" fill="#2f9e62" fillOpacity="0.75" {...outline} />
  </>
);
const featherHat = (c: string) => (
  <>
    <ellipse cx="50" cy="34" rx="22" ry="5" fill={c} {...outline} />
    <path d="M40 34 C40 24 60 24 60 34 Z" fill={c} {...outline} />
    <path d="M58 28 C66 14 78 12 82 16 C74 16 68 22 62 32 Z" fill="#2f9e62" {...outline} />
  </>
);

// --- Items (held on the right) ------------------------------------------------------------------
const cutlass = (
  <>
    <path d="M82 100 L82 74 C82 64 88 58 90 52" fill="none" stroke="#d6dde3" strokeWidth="4" strokeLinecap="round" />
    <path d="M74 76 C76 70 88 70 90 76" fill="none" stroke={GOLD} strokeWidth="3" />
  </>
);
const shipWheel = (
  <g transform="translate(78 82)">
    <circle r="12" fill="none" stroke="#8a5a2b" strokeWidth="4" />
    {[0, 45, 90, 135].map((a) => <line key={a} x1="-16" y1="0" x2="16" y2="0" stroke="#8a5a2b" strokeWidth="3" transform={`rotate(${a})`} strokeLinecap="round" />)}
    <circle r="3.5" fill={GOLD} {...outline} />
  </g>
);
const scroll = (
  <>
    <rect x="66" y="74" width="20" height="18" fill="#efe2c4" {...outline} />
    <path d="M70 80 L82 80 M70 85 L80 85" stroke="#8a5a2b" strokeWidth="1.2" />
    <path d="M76 82 l2 2 l2 -2" stroke="#c8323c" strokeWidth="1.4" fill="none" />
    <rect x="64" y="72" width="24" height="4" rx="2" fill="#c9a06a" {...outline} />
  </>
);
const compass = (
  <g transform="translate(77 84)">
    <circle r="10" fill="#c9a06a" {...outline} />
    <circle r="7" fill="#fbf7ee" stroke={INK} strokeWidth="1" />
    <path d="M0 -6 L2 0 L0 6 L-2 0 Z" fill="#c8323c" />
  </g>
);
const cannonball = (
  <>
    <circle cx="76" cy="86" r="10" fill="#2a2230" {...outline} />
    <circle cx="72" cy="82" r="2.5" fill="#fff" opacity="0.3" />
    <path d="M80 77 C84 70 88 72 86 66" fill="none" stroke="#8a5a2b" strokeWidth="1.6" />
    <path d="M86 66 l-2 -3 l3 1 l1 -3 l1 3 l3 -1 Z" fill="#ffb02e" />
  </>
);
const whistle = <path d="M44 72 C46 82 54 82 56 72 M50 84 L50 90" fill="none" stroke={GOLD} strokeWidth="1.6" />;
const bottle = (
  <>
    <path d="M72 70 H78 V76 C84 78 84 82 84 86 V98 H66 V86 C66 82 66 78 72 76 Z" fill="#2f9e62" fillOpacity="0.85" {...outline} />
    <rect x="72" y="66" width="6" height="5" fill="#8a5a2b" {...outline} />
    <rect x="69" y="84" width="12" height="8" fill="#fbf7ee" />
    <path d="M75 85 V91 M72 88 H78" stroke="#c8323c" strokeWidth="1.6" />
  </>
);
const drumstick = (
  <>
    <ellipse cx="80" cy="76" rx="9" ry="7" fill="#b5652a" transform="rotate(-30 80 76)" {...outline} />
    <path d="M74 82 L66 94" stroke="#fbf7ee" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="65" cy="96" r="2.5" fill="#fbf7ee" {...outline} />
  </>
);
const telescope = (
  <>
    <path d="M64 92 L90 66" stroke="#8a5a2b" strokeWidth="7" strokeLinecap="round" />
    <path d="M80 76 L90 66" stroke={GOLD} strokeWidth="8" strokeLinecap="round" />
    <path d="M70 86 L72 84" stroke={GOLD} strokeWidth="9" />
  </>
);
const ropeCoil = (
  <g transform="translate(77 86)">
    {[11, 8, 5].map((r) => <circle key={r} r={r} fill="none" stroke="#c9a06a" strokeWidth="3" />)}
  </g>
);
const mop = (
  <>
    <path d="M78 58 L78 92" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
    <path d="M70 92 L86 92 L88 102 L68 102 Z" fill="#d9cdb4" {...outline} />
  </>
);
const bucket = <path d="M66 80 H88 L85 100 H69 Z M66 80 C66 72 88 72 88 80" fill="#9aa3ad" {...outline} />;
const parrot = (
  <g transform="translate(70 62)">
    <path d="M0 10 C-2 0 6 -6 12 -2 C16 2 14 10 10 16 C8 22 2 24 0 18 Z" fill="#c8323c" {...outline} />
    <path d="M12 -2 L18 0 L13 4 Z" fill="#f4b73a" {...outline} />
    <circle cx="9" cy="1" r="1.3" fill={INK} />
    <path d="M2 14 C-4 18 -2 26 4 24" fill="#3a6fd8" {...outline} />
    <path d="M6 18 L4 30" stroke="#2f9e62" strokeWidth="3" />
  </g>
);
const coffee = (
  <>
    <path d="M68 76 L70 96 H82 L84 76 Z" fill="#fbf7ee" {...outline} />
    <rect x="67" y="73" width="18" height="4" rx="1.5" fill="#6b4c30" {...outline} />
    <path d="M84 82 C90 82 90 90 83 90" fill="none" stroke={INK} strokeWidth="1.6" />
    <path d="M73 70 C71 66 75 64 73 60 M79 70 C77 66 81 64 79 60" fill="none" stroke="#fbf7ee" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
  </>
);
const clipboard = (
  <>
    <rect x="68" y="72" width="17" height="23" rx="1.5" fill="#6b4c30" {...outline} />
    <rect x="70" y="76" width="13" height="17" fill="#fbf7ee" />
    <path d="M72 80 l2 2 l4 -4 M72 86 l2 2 l4 -4" stroke="#2f9e62" strokeWidth="1.4" fill="none" />
    <rect x="73" y="70" width="7" height="4" rx="1" fill="#9aa3ad" {...outline} />
  </>
);
const books = (
  <>
    <rect x="64" y="88" width="24" height="7" fill="#3a6fd8" {...outline} />
    <rect x="66" y="81" width="22" height="7" fill="#c8323c" {...outline} />
    <rect x="65" y="74" width="21" height="7" fill="#2f9e62" {...outline} />
  </>
);
const ladle = (
  <>
    <path d="M80 100 L78 66" stroke="#9aa3ad" strokeWidth="3" strokeLinecap="round" />
    <path d="M70 60 C70 70 86 70 86 60 Z" fill="#c9ced4" {...outline} />
  </>
);
const keys = (
  <g transform="translate(76 84)">
    <circle r="7" fill="none" stroke="#9aa3ad" strokeWidth="2.4" />
    {[-40, 10, 60].map((a) => (
      <g key={a} transform={`rotate(${a})`}>
        <path d="M7 0 H18 M14 0 V4 M17 0 V3" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    ))}
  </g>
);
const campusMap = (
  <>
    <path d="M64 74 L72 72 L80 74 L88 72 V94 L80 96 L72 94 L64 96 Z" fill="#efe2c4" {...outline} />
    <path d="M72 72 V94 M80 74 V96" stroke={INK} strokeWidth="1" />
    <circle cx="76" cy="84" r="2.5" fill="#c8323c" />
  </>
);
const guitar = (
  <>
    <path d="M86 52 L72 84" stroke="#6b4c30" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M60 86 C58 78 68 74 72 80 C78 78 84 84 78 92 C74 100 60 98 60 86 Z" fill="#c98a52" {...outline} />
    <circle cx="70" cy="88" r="3" fill="#2a1a10" />
  </>
);
const stamp = (c: string) => (
  <>
    <path d="M74 66 C70 66 70 74 74 74 H80 C84 74 84 66 80 66 Z" fill="#6b4c30" {...outline} />
    <rect x="75" y="74" width="4" height="8" fill="#6b4c30" {...outline} />
    <rect x="68" y="82" width="18" height="6" rx="1.5" fill={c} {...outline} />
  </>
);
const paperStack = (
  <>
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={65 + (i % 2)} y={96 - i * 5} width="22" height="5" fill="#fbf7ee" {...outline} />)}
  </>
);
const partyHorn = (
  <>
    <path d="M66 88 L84 80 L86 86 Z" fill="#3fa9ff" {...outline} />
    <path d="M86 83 C92 82 92 74 98 76" fill="none" stroke="#f4b73a" strokeWidth="2" />
    {[[70, 70, '#e46aa0'], [84, 68, '#2f9e62'], [78, 62, '#f4b73a'], [90, 92, '#3fa9ff']].map(([x, y, c]) => (
      <rect key={`${x}${y}`} x={x as number} y={y as number} width="3" height="3" fill={c as string} transform={`rotate(30 ${x} ${y})`} />
    ))}
  </>
);
const briefcase = (
  <>
    <rect x="64" y="80" width="26" height="18" rx="2" fill="#6b3a1e" {...outline} />
    <path d="M72 80 V76 H82 V80" fill="none" stroke={INK} strokeWidth="1.8" />
    <rect x="75" y="86" width="4" height="4" fill={GOLD} />
  </>
);
const coinBag = (
  <>
    <path d="M70 76 C62 86 64 100 77 100 C90 100 92 86 84 76 Z" fill="#c9a06a" {...outline} />
    <path d="M70 76 H84" stroke="#8a5a2b" strokeWidth="2" />
    <text x="77" y="93" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6b4508">€</text>
  </>
);
const envelope = (
  <>
    <rect x="64" y="76" width="24" height="16" fill="#fbf7ee" {...outline} />
    <path d="M64 76 L76 86 L88 76" fill="none" stroke={INK} strokeWidth="1.6" />
    <circle cx="76" cy="86" r="2.5" fill="#c8323c" />
  </>
);
const form = (
  <>
    <rect x="66" y="66" width="20" height="30" fill="#fbf7ee" {...outline} />
    {[71, 75, 79, 83, 87, 91].map((y) => <path key={y} d={`M69 ${y} H83`} stroke="#9aa3ad" strokeWidth="1" />)}
    <rect x="69" y="69" width="3" height="3" fill="none" stroke={INK} strokeWidth="0.8" />
  </>
);
const ticket = (
  <>
    <rect x="66" y="78" width="20" height="13" rx="1.5" fill="#fbf7ee" {...outline} />
    <text x="76" y="88" textAnchor="middle" fontSize="7" fontWeight="700" fill="#c8323c">W-523</text>
  </>
);
const folders = (
  <>
    <rect x="64" y="78" width="22" height="20" fill="#e09b1a" {...outline} />
    <rect x="66" y="74" width="22" height="20" fill="#3a6fd8" {...outline} />
    <rect x="68" y="70" width="22" height="20" fill="#2f9e62" {...outline} />
  </>
);
const sweat = <path d="M62 38 C60 42 64 44 64 40 Z" fill="#9fe3ff" stroke={INK} strokeWidth="0.8" />;
const lanyard = <><path d="M42 72 L48 86 M58 72 L52 86" stroke="#3a6fd8" strokeWidth="2" /><rect x="46" y="86" width="8" height="10" rx="1" fill="#fbf7ee" {...outline} /></>;
const tie = (c: string) => <path d="M48 72 L52 72 L54 76 L52 96 L50 99 L48 96 L46 76 Z" fill={c} {...outline} />;
const collarWhite = <path d="M40 72 L50 80 L60 72 L58 70 L50 76 L42 70 Z" fill="#fbf7ee" {...outline} />;
const stripes = (a: string, b: string) => (
  <>
    {[78, 86, 94, 102].map((y) => <path key={y} d={`M14 ${y} H86`} stroke={y % 16 === 14 ? a : b} strokeWidth="4" />)}
  </>
);
const chain = (
  <>
    <path d="M34 76 C40 90 60 90 66 76" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="3 2" />
    <circle cx="50" cy="90" r="5" fill={GOLD} {...outline} />
  </>
);
const apron = <path d="M36 82 H64 V104 H36 Z" fill="#fbf7ee" {...outline} />;
const overall = (c: string) => <><path d="M38 82 H62 V104 H38 Z" fill={c} {...outline} /><path d="M38 82 L34 72 M62 82 L66 72" stroke={c} strokeWidth="3" /></>;
const cardigan = <path d="M50 72 V104" stroke={INK} strokeWidth="1.5" />;
const horseMask = (
  <>
    <path d="M34 50 C30 26 40 14 50 14 C60 14 70 26 66 50 C66 64 60 70 50 70 C40 70 34 64 34 50 Z" fill="#f4f1ea" {...outline} />
    <path d="M38 22 L36 10 L44 18 Z M62 22 L64 10 L56 18 Z" fill="#f4f1ea" {...outline} />
    <path d="M50 14 C46 20 44 26 44 32 M50 14 C54 18 58 22 58 30" fill="none" stroke="#b9b4ac" strokeWidth="3" />
    <ellipse cx="50" cy="60" rx="10" ry="7" fill="#e3ddd0" {...outline} />
    <circle cx="46" cy="60" r="1.6" fill={INK} /><circle cx="54" cy="60" r="1.6" fill={INK} />
    <circle cx="42" cy="40" r="2" fill={INK} /><circle cx="58" cy="40" r="2" fill={INK} />
    <path d="M42 66 Q50 70 58 66" fill="none" stroke={INK} strokeWidth="1.4" />
  </>
);

export const MORE_PORTRAITS: Record<string, ReactNode> = {
  // Piraten ----------------------------------------------------------------------------------
  'pi-kapitaenin': <Portrait id="pi-kapitaenin" bg="#1e2a3a" skin={SKIN.mid} garment="#a8232f" brows="proud" smile="smirk"
    back={hairLongBack('#2a1a10')} collar={collarWhite} face={eyepatch} hat={tricorne('#1c1a2a')} item={cutlass} />,
  'pi-steuermann': <Portrait id="pi-steuermann" bg="#2f4560" skin={SKIN.tan} garment="#3a5f94" brows="calm" smile="flat"
    face={beard('#3a2414')} hat={bandana('#c8323c')} item={shipWheel} />,
  'pi-quartiermeister': <Portrait id="pi-quartiermeister" bg="#5a4a2a" skin={SKIN.light} garment="#6b4c30" brows="raised" smile="smile"
    hair={hairSide('#c9c6c0')} face={GLASSES} item={scroll} />,
  'pi-navigatorin': <Portrait id="pi-navigatorin" bg="#1f5c6b" skin={SKIN.deep} garment="#2e6b4f" brows="calm" smile="smile"
    back={ponytail('#1c140e')} hair={hairFringe('#1c140e')} hat={tricorne('#6b3a1e', '#c9a06a')} item={compass} />,
  'pi-kanonier': <Portrait id="pi-kanonier" bg="#4a2a2a" skin={SKIN.light} garment="#3f4a5e" brows="proud" smile="grin"
    face={<><path d="M40 50 C42 52 44 50 46 52 M55 52 C57 50 59 52 61 50" stroke="#2a2230" strokeWidth="2" opacity="0.5" /></>}
    hat={bandana('#2a2230')} item={cannonball} />,
  'pi-bootsmann': <Portrait id="pi-bootsmann" bg="#2f4560" skin={SKIN.mid} garment="#1e2a3a" brows="proud" smile="flat"
    collar={whistle} face={beard('#8a8a8a')} hat={cap('#1e2a3a')} />,
  'pi-schiffsaerztin': <Portrait id="pi-schiffsaerztin" bg="#3f6b5a" skin={SKIN.light} garment="#efe2c4" brows="raised" smile="smile"
    hair={hairFringe('#b5532a')} face={GLASSES} item={bottle} />,
  'pi-smutje': <Portrait id="pi-smutje" bg="#8a5a2a" skin={SKIN.tan} garment="#fbf7ee" brows="raised" smile="grin"
    collar={apron} face={moustache('#3a2414')} hat={bandana('#e09b1a')} item={drumstick} />,
  'pi-ausguck': <Portrait id="pi-ausguck" bg="#3a6fd8" skin={SKIN.light} garment="#c8323c" brows="raised" smile="smile"
    hair={hairMessy('#e8c25a')} face={freckles} item={telescope} />,
  'pi-matrosin': <Portrait id="pi-matrosin" bg="#1f4fb4" skin={SKIN.mid} garment="#fbf7ee" brows="calm" smile="smile"
    back={ponytail('#7a4424')} collar={stripes('#1f4fb4', '#fbf7ee')} hair={hairFringe('#7a4424')} item={ropeCoil} />,
  'pi-schiffsjunge': <Portrait id="pi-schiffsjunge" bg="#5a6b7a" skin={SKIN.light} garment="#8a5a2b" brows="raised" smile="grin"
    face={freckles} hat={cap('#3a5f94')} item={mop} />,
  'pi-landratte': <Portrait id="pi-landratte" bg="#4f7a3a" skin="#c9e0a0" garment="#d9cdb4" brows="raised" smile="flat"
    hair={hairShort('#c8673a')} face={<path d="M44 55 Q50 52 56 55" fill="none" stroke={INK} strokeWidth="1.4" />} item={bucket} />,
  'pi-papagei': <Portrait id="pi-papagei" bg="#5a1a6b" skin={SKIN.light} garment="#e09b1a" brows="raised" smile="grin"
    face={moustache('#2a1a10')} hat={featherHat('#c8323c')} item={parrot} />,

  // Uni-Leben --------------------------------------------------------------------------------
  'u-praesidentin': <Portrait id="u-praesidentin" bg="#2e2a5e" skin={SKIN.light} garment="#4a2275" brows="calm" smile="smile"
    collar={chain} hair={hairFringe('#b9b4ac')} back={<path d="M35 46 C33 34 38 28 50 28 C62 28 67 34 65 46 C66 54 62 58 60 58 L40 58 C38 58 34 54 35 46 Z" fill="#b9b4ac" {...outline} />} />,
  'u-dekan': <Portrait id="u-dekan" bg="#4a2a5e" skin={SKIN.mid} garment="#1c1a2a" brows="proud" smile="flat"
    collar={<path d="M40 72 L50 82 L60 72" fill="none" stroke="#c8323c" strokeWidth="4" />} face={beard('#d9d4cc')} hat={mortarboard} />,
  'u-professorin': <Portrait id="u-professorin" bg="#2f6b5a" skin={SKIN.deep} garment="#c8673a" brows="raised" smile="smile"
    hair={<>{hairShort('#1c140e')}{bun('#1c140e')}</>} face={GLASSES}
    item={<><path d="M70 100 L86 62" stroke="#8a5a2b" strokeWidth="2.4" strokeLinecap="round" /><rect x="64" y="86" width="5" height="10" fill="#fbf7ee" {...outline} /></>} />,
  'u-doktorand': <Portrait id="u-doktorand" bg="#3f4a5e" skin={SKIN.light} garment="#5c6b7a" brows="raised" smile="flat"
    hair={hairMessy('#7a4424')} face={tired} item={coffee} />,
  'u-tutorin': <Portrait id="u-tutorin" bg="#c8673a" skin={SKIN.mid} garment="#3a6fd8" brows="raised" smile="grin"
    back={ponytail('#e8c25a')} hair={hairFringe('#e8c25a')} item={clipboard} />,
  'u-bibliothekar': <Portrait id="u-bibliothekar" bg="#6b4c30" skin={SKIN.light} garment="#8a6a2a" brows="calm" smile="flat"
    collar={cardigan} hair={hairSide('#9a9a9a')} face={GLASSES} item={books} />,
  'u-mensakoch': <Portrait id="u-mensakoch" bg="#b07a12" skin={SKIN.tan} garment="#fbf7ee" brows="raised" smile="grin"
    face={moustache('#2a1a10')} hat={toque} item={ladle} />,
  'u-hausmeister': <Portrait id="u-hausmeister" bg="#5a6b7a" skin={SKIN.light} garment="#3a5f94" brows="calm" smile="smile"
    collar={overall('#3a5f94')} face={moustache('#8a8a8a')} hat={cap('#2a2230')} item={keys} />,
  'u-erstie': <Portrait id="u-erstie" bg="#2f9e62" skin={SKIN.light} garment="#e46aa0" brows="raised" smile="grin"
    collar={<path d="M30 78 L38 104 M70 78 L62 104" stroke="#2a2230" strokeWidth="3" />} hair={hairFringe('#3a2414')} face={freckles} item={campusMap} />,
  'u-langzeitstudent': <Portrait id="u-langzeitstudent" bg="#6b5a4a" skin={SKIN.mid} garment="#4f7a3a" brows="calm" smile="smirk"
    face={beard('#6b3a1e')} hat={beanie('#c8323c')} item={guitar} />,
  'u-pruefungsamt': <Portrait id="u-pruefungsamt" bg="#3f3f4f" skin={SKIN.light} garment="#6f7882" brows="proud" smile="flat"
    hair={<>{hairShort('#5c4a3a')}{bun('#5c4a3a')}</>} face={GLASSES} item={stamp('#c8323c')} />,
  'u-hiwi': <Portrait id="u-hiwi" bg="#3a6fd8" skin={SKIN.deep} garment="#f2c14e" brows="raised" smile="flat"
    hair={hairBuzz('#1c140e')} face={tired} item={paperStack} />,
  'u-partyloewe': <Portrait id="u-partyloewe" bg="#5a1a6b" skin={SKIN.light} garment="#2f9e62" brows="raised" smile="grin"
    hair={hairMessy('#e8c25a')} hat={partyHat} item={partyHorn} />,

  // Amtsstube --------------------------------------------------------------------------------
  'a-amtsleiterin': <Portrait id="a-amtsleiterin" bg="#1f3a6b" skin={SKIN.light} garment="#2a2230" brows="proud" smile="smirk"
    collar={<><path d="M42 72 L50 84 L58 72" fill="#fbf7ee" {...outline} /><circle cx="50" cy="88" r="2" fill="#fbf7ee" /></>}
    hair={<>{hairShort('#8a4a24')}{bun('#8a4a24')}</>} item={stamp(GOLD)} />,
  'a-referent': <Portrait id="a-referent" bg="#2f4560" skin={SKIN.tan} garment="#3f4a5e" brows="calm" smile="smile"
    collar={<>{collarWhite}{tie('#c8323c')}</>} hair={hairShort('#1c140e')} item={briefcase} />,
  'a-sachbearbeiter': <Portrait id="a-sachbearbeiter" bg="#4f7a3a" skin={SKIN.light} garment="#d9cdb4" brows="calm" smile="flat"
    collar={tie('#3a5f94')} hair={hairSide('#6b4c30')} hat={visor} item={stamp('#3a6fd8')} />,
  'a-pfoertner': <Portrait id="a-pfoertner" bg="#5a4a2a" skin={SKIN.mid} garment="#1e2a3a" brows="proud" smile="flat"
    face={moustache('#3a2414')} hat={cap('#1e2a3a')}
    item={<><circle cx="72" cy="78" r="6" fill="none" stroke={GOLD} strokeWidth="3" /><path d="M76 82 L88 94 M84 90 L87 87 M86 92 L89 89" stroke={GOLD} strokeWidth="3" strokeLinecap="round" /></>} />,
  'a-registratorin': <Portrait id="a-registratorin" bg="#7a4a2a" skin={SKIN.light} garment="#8fc3e8" brows="raised" smile="smile"
    collar={<path d="M40 50 C38 62 44 72 50 74 C56 72 62 62 60 50" fill="none" stroke={GOLD} strokeWidth="1" />}
    hair={hairFringe('#c9c6c0')} face={GLASSES} item={folders} />,
  'a-kassenwart': <Portrait id="a-kassenwart" bg="#2f6b5a" skin={SKIN.light} garment="#6b4c30" brows="raised" smile="smirk"
    collar={collarWhite} hair={hairSide('#3a2414')} face={moustache('#3a2414')} item={coinBag} />,
  'a-bote': <Portrait id="a-bote" bg="#c8673a" skin={SKIN.deep} garment="#c8323c" brows="raised" smile="grin"
    face={stubble('#2a1a10')} hat={cap('#f2c14e')} item={envelope} />,
  'a-antragsteller': <Portrait id="a-antragsteller" bg="#6b5a4a" skin={SKIN.light} garment="#9aa3ad" brows="raised" smile="flat"
    hair={hairShort('#5c4a3a')} face={sweat} item={form} />,
  'a-wartender': <Portrait id="a-wartender" bg="#4a4a6a" skin={SKIN.tan} garment="#2f8a55" brows="calm" smile="flat"
    hair={hairBuzz('#2a1a10')} face={tired} item={ticket} />,
  'a-praktikantin': <Portrait id="a-praktikantin" bg="#e09b1a" skin={SKIN.mid} garment="#fbf7ee" brows="raised" smile="grin"
    back={ponytail('#3a2414')} collar={lanyard} hair={hairFringe('#3a2414')} item={coffee} />,
  'a-archivar': <Portrait id="a-archivar" bg="#5a5a4a" skin={SKIN.light} garment="#8a6a2a" brows="calm" smile="flat"
    collar={cardigan} hair={hairSide('#d9d4cc')} face={<>{GLASSES}{beard('#d9d4cc')}</>} item={scroll} />,
  'a-kopierer': <Portrait id="a-kopierer" bg="#3f4a5e" skin={SKIN.tan} garment="#3a5f94" brows="raised" smile="grin"
    collar={tie('#2f9e62')} hair={hairMessy('#1c140e')} item={paperStack} />,
  'a-amtsschimmel': <Portrait id="a-amtsschimmel" bg="#5a1a6b" skin={SKIN.light} garment="#3f4a5e" brows="calm" smile="flat"
    collar={<>{collarWhite}{tie('#c8323c')}</>} hat={horseMask} item={stamp('#c8323c')} />,
};

export const PIRATE_IDS = Object.keys(MORE_PORTRAITS).filter((id) => id.startsWith('pi-'));
export const UNI_IDS = Object.keys(MORE_PORTRAITS).filter((id) => id.startsWith('u-'));
export const OFFICE_IDS = Object.keys(MORE_PORTRAITS).filter((id) => id.startsWith('a-'));
