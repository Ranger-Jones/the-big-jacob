import type { ReactNode } from 'react';
import { BOT_ART_IDS } from '@/lib/bot-art';
import { GOLD, INK, jewel, outline, Portrait, SKIN } from './portraits';

/**
 * Portraits for the computer players (viewBox 0 0 100 100), one per bot name in BOT_NAMES of the engine.
 * Same family as the court portraits, so bots look like they belong at the table.
 */
const BOTS: Record<string, { art: ReactNode }> = {
  'Hofnarr Hugo': {
    art: (
      <Portrait
        id="bot-hugo" bg="#6b2a8e" skin={SKIN.light} garment="#c8323c" brows="raised" smile="grin"
        collar={<path d="M28 78 L36 72 L42 80 L50 72 L58 80 L64 72 L72 78 L70 86 L30 86 Z" fill={GOLD} {...outline} />}
        hat={<>
          <path d="M34 38 C30 26 20 22 14 26 C22 28 28 32 30 40 Z" fill="#c8323c" {...outline} />
          <path d="M66 38 C70 26 80 22 86 26 C78 28 72 32 70 40 Z" fill="#3a6fd8" {...outline} />
          <path d="M36 38 C38 22 46 10 50 8 C54 10 62 22 64 38 Z" fill={GOLD} {...outline} />
          <rect x="34" y="34" width="32" height="6" rx="2" fill="#2a1a10" {...outline} />
          <circle cx="14" cy="26" r="3" fill={GOLD} {...outline} />
          <circle cx="86" cy="26" r="3" fill={GOLD} {...outline} />
          <circle cx="50" cy="8" r="3" fill="#c8323c" {...outline} />
        </>}
        item={<>
          <circle cx="16" cy="70" r="5" fill="#3a6fd8" {...outline} />
          <circle cx="24" cy="58" r="5" fill={GOLD} {...outline} />
          <circle cx="84" cy="66" r="5" fill="#2f9e62" {...outline} />
        </>}
      />
    ),
  },
  'Gräfin Gisela': {
    art: (
      <Portrait
        id="bot-gisela" bg="#2e3f7a" skin={SKIN.light} garment="#8b4fc7" brows="proud" smile="smirk"
        back={<path d="M32 44 C28 26 40 20 50 20 C60 20 72 26 68 44 C72 62 68 74 62 76 L38 76 C32 74 28 62 32 44 Z" fill="#e8c46a" {...outline} />}
        collar={<>
          <path d="M34 80 C42 88 58 88 66 80" fill="none" stroke="#fbf7ee" strokeWidth="3.2" strokeDasharray="0.1 4.4" strokeLinecap="round" />
          {jewel(50, 87, '#3a6fd8', 2.6)}
        </>}
        hair={<path d="M36.5 44 C35 28 65 28 63.5 44 C58 34 42 34 36.5 44 Z" fill="#e8c46a" {...outline} />}
        hat={<>
          <path d="M38 30 L42 22 L46 27 L50 18 L54 27 L58 22 L62 30 Z" fill={GOLD} {...outline} />
          {jewel(50, 24, '#c8323c', 1.6)}
        </>}
        item={<path d="M70 98 L78 72 L90 76 Z M78 72 L84 74 M78 72 L88 80" fill="#fbf7ee" {...outline} />}
      />
    ),
  },
  'Bauer Bernd': {
    art: (
      <Portrait
        id="bot-bernd" bg="#5e7a2e" skin={SKIN.tan} garment="#3f6fa8" brows="calm" smile="grin"
        collar={<path d="M38 72 L38 104 M62 72 L62 104" stroke="#a8662a" strokeWidth="3" />}
        face={<path d="M38 50 C38 68 62 68 62 50 C58 58 54 57 50 58 C46 57 42 58 38 50 Z" fill="#a8662a" {...outline} />}
        hat={<>
          <ellipse cx="50" cy="33" rx="26" ry="6" fill="#e8c46a" {...outline} />
          <path d="M38 33 C38 20 62 20 62 33 Z" fill="#e8c46a" {...outline} />
          <path d="M38 30 H62" stroke="#c8323c" strokeWidth="2.5" />
        </>}
        item={<>
          <path d="M84 100 L84 56" stroke="#8a5a2e" strokeWidth="3" strokeLinecap="round" />
          <path d="M77 56 V44 M84 56 V42 M91 56 V44 M77 56 H91" fill="none" stroke="#9aa3ad" strokeWidth="2.4" strokeLinecap="round" />
        </>}
      />
    ),
  },
  'Ritter Rüdiger': {
    art: (
      <Portrait
        id="bot-ruediger" bg="#7a1c2c" skin={SKIN.mid} garment="#9aa3ad" brows="proud" smile="flat"
        collar={<path d="M30 78 H70 L66 92 H34 Z" fill="#c9cdd8" {...outline} />}
        hat={<>
          <path d="M34 46 C33 24 67 24 66 46 L62 42 H38 Z" fill="#c9cdd8" {...outline} />
          <path d="M50 26 V42" stroke={INK} strokeWidth="1.4" />
          <path d="M50 26 C46 14 56 6 64 10 C58 12 56 18 50 26 Z" fill="#c8323c" {...outline} />
        </>}
        item={<>
          <path d="M14 66 C14 60 28 60 28 66 L28 80 C28 88 21 92 21 92 C21 92 14 88 14 80 Z" fill="#2f5fbf" {...outline} />
          <path d="M21 64 V90 M15 74 H27" stroke={GOLD} strokeWidth="2" />
        </>}
      />
    ),
  },
  'Köchin Klara': {
    art: (
      <Portrait
        id="bot-klara" bg="#a8662a" skin={SKIN.light} garment="#f4b73a" brows="raised" smile="smile"
        collar={<path d="M36 76 H64 L66 104 H34 Z" fill="#fbf7ee" {...outline} />}
        hair={<path d="M36.5 46 C35 32 65 32 63.5 46 C58 38 42 38 36.5 46 Z" fill="#6b3a1e" {...outline} />}
        hat={<>
          <path d="M37 34 C30 30 32 18 40 20 C42 10 58 10 60 20 C68 18 70 30 63 34 Z" fill="#fbf7ee" {...outline} />
          <rect x="37" y="30" width="26" height="6" rx="1.5" fill="#fbf7ee" {...outline} />
        </>}
        item={<>
          <path d="M82 100 L82 64" stroke="#9aa3ad" strokeWidth="3" strokeLinecap="round" />
          <path d="M74 60 C74 52 90 52 90 60 C90 66 74 66 74 60 Z" fill="#c9cdd8" {...outline} />
        </>}
      />
    ),
  },
  'Mönch Matthias': {
    art: (
      <Portrait
        id="bot-matthias" bg="#3f4a2e" skin={SKIN.mid} garment="#7a4a24" brows="calm" smile="smile"
        back={<path d="M26 104 C24 62 34 40 50 40 C66 40 76 62 74 104 Z" fill="#5e3a1e" {...outline} />}
        hair={<path d="M36.5 44 C36 38 38 34 40 33 C40 38 60 38 60 33 C62 34 64 38 63.5 44 C60 40 40 40 36.5 44 Z" fill="#8a7a6a" {...outline} />}
        collar={<path d="M44 74 C46 82 54 82 56 74" fill="none" stroke="#e8c46a" strokeWidth="2.2" />}
        item={<>
          <rect x="70" y="68" width="18" height="22" rx="2" fill="#7a1c2c" {...outline} />
          <path d="M79 72 V86 M74 77 H84" stroke={GOLD} strokeWidth="2" />
        </>}
      />
    ),
  },
  'Baronin Berta': {
    art: (
      <Portrait
        id="bot-berta" bg="#1f6b6b" skin={SKIN.deep} garment="#c8323c" brows="proud" smile="smirk"
        hair={<>
          <path d="M36.5 44 C35 28 65 28 63.5 44 C58 34 42 34 36.5 44 Z" fill="#2a1a10" {...outline} />
          <circle cx="50" cy="22" r="8" fill="#2a1a10" {...outline} />
        </>}
        collar={<>
          <path d="M32 78 C40 72 60 72 68 78" fill="none" stroke={GOLD} strokeWidth="3" />
          {jewel(50, 80, '#2f9e62', 2.4)}
        </>}
        face={<circle cx="56" cy="46" r="3.6" fill="none" stroke={GOLD} strokeWidth="1.4" />}
        item={<path d="M82 64 L90 72 L82 84 L74 72 Z M74 72 H90 M82 64 L80 72 L82 84 L84 72 Z" fill="#cfe3f0" {...outline} />}
      />
    ),
  },
  'Schäferin Sina': {
    art: (
      <Portrait
        id="bot-sina" bg="#4f8a3a" skin={SKIN.light} garment="#e46aa0" brows="raised" smile="smile"
        back={<path d="M34 42 C32 30 42 26 50 26 C58 26 68 30 66 42 L68 70 L58 66 L42 66 L32 70 Z" fill="#c68642" {...outline} />}
        hat={<path d="M34 40 C34 24 66 24 66 40 C60 32 40 32 34 40 Z" fill="#fbf7ee" {...outline} />}
        collar={<path d="M40 76 L50 84 L60 76" fill="none" stroke="#fbf7ee" strokeWidth="2.4" />}
        item={<>
          <path d="M18 100 L18 46" stroke="#8a5a2e" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 46 C18 36 30 36 30 44" fill="none" stroke="#8a5a2e" strokeWidth="3" strokeLinecap="round" />
        </>}
      />
    ),
  },
  'Steinmetz Stefan': {
    art: (
      <Portrait
        id="bot-stefan" bg="#6b6258" skin={SKIN.tan} garment="#8a7a6a" brows="calm" smile="flat"
        face={<path d="M41 52 C44 49 48 50 50 51.5 C52 50 56 49 59 52 C56 53 53 52.5 50 53.5 C47 52.5 44 53 41 52 Z" fill="#4a3424" />}
        hat={<path d="M35 36 C35 24 65 24 65 36 L70 38 C60 36 40 36 30 38 Z" fill="#3f4a5e" {...outline} />}
        collar={<path d="M36 76 H64 L64 104 H36 Z" fill="#a8662a" {...outline} />}
        item={<>
          <path d="M80 100 L86 68" stroke="#8a5a2e" strokeWidth="3" strokeLinecap="round" />
          <rect x="78" y="60" width="16" height="8" rx="1.5" fill="#9aa3ad" {...outline} transform="rotate(12 86 64)" />
        </>}
      />
    ),
  },
  'Näherin Nora': {
    art: (
      <Portrait
        id="bot-nora" bg="#8a3a5e" skin={SKIN.mid} garment="#3a6fd8" brows="raised" smile="smile"
        back={<>
          <path d="M34 44 C32 58 30 66 32 74" fill="none" stroke="#c8323c" strokeWidth="5" strokeLinecap="round" />
          <path d="M66 44 C68 58 70 66 68 74" fill="none" stroke="#c8323c" strokeWidth="5" strokeLinecap="round" />
        </>}
        hair={<path d="M36.5 46 C35 30 65 30 63.5 46 C58 36 42 36 36.5 46 Z" fill="#c8323c" {...outline} />}
        collar={<path d="M36 78 C44 84 56 84 64 78" fill="none" stroke="#fbf7ee" strokeWidth="2.4" strokeDasharray="2 2.4" />}
        item={<>
          <rect x="74" y="74" width="12" height="16" rx="2" fill="#e8c46a" {...outline} />
          <path d="M74 80 H86 M74 84 H86" stroke="#c8323c" strokeWidth="1.6" />
          <path d="M84 72 L92 54" stroke="#c9cdd8" strokeWidth="1.8" strokeLinecap="round" />
        </>}
      />
    ),
  },
  'Erzbischof Egon': {
    art: (
      <Portrait
        id="bot-egon" bg="#4a2e6b" skin={SKIN.light} garment="#8b4fc7" brows="calm" smile="flat"
        collar={<path d="M44 72 L42 104 H58 L56 72 Z" fill={GOLD} {...outline} />}
        face={<path d="M39 52 C40 64 60 64 61 52 C57 58 43 58 39 52 Z" fill="#fbf7ee" {...outline} />}
        hat={<>
          <path d="M37 35 C37 20 50 8 50 8 C50 8 63 20 63 35 Z" fill="#8b4fc7" {...outline} />
          <path d="M50 12 V34 M43 22 H57" stroke={GOLD} strokeWidth="2.6" />
          <rect x="37" y="31" width="26" height="5" fill={GOLD} {...outline} />
        </>}
        item={<>
          <path d="M84 100 L80 48" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <path d="M80 48 C82 36 70 32 69 40 C68 46 76 47 76 42" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        </>}
      />
    ),
  },
  'Marschall Max': {
    art: (
      <Portrait
        id="bot-max" bg="#24305e" skin={SKIN.deep} garment="#2f5fbf" brows="proud" smile="smirk"
        collar={<>
          <path d="M18 82 C24 74 32 72 36 74 L34 82 Z M82 82 C76 74 68 72 64 74 L66 82 Z" fill={GOLD} {...outline} />
          {jewel(44, 88, '#c8323c', 2.2)}{jewel(56, 88, GOLD, 2.2)}
        </>}
        face={<path d="M41 52 C44 49 48 50 50 51.5 C52 50 56 49 59 52 C56 53 53 52.5 50 53.5 C47 52.5 44 53 41 52 Z" fill="#1c1a2a" />}
        hat={<>
          <path d="M20 34 C30 14 70 14 80 34 C66 28 34 28 20 34 Z" fill="#1c1a2a" {...outline} />
          <circle cx="50" cy="24" r="3" fill={GOLD} {...outline} />
        </>}
        item={<path d="M16 96 L26 70" stroke="#c8323c" strokeWidth="5" strokeLinecap="round" />}
      />
    ),
  },
  'König Peschel': {
    art: (
      <Portrait
        id="bot-peschel" bg="#9c1c32" skin={SKIN.mid} garment="#5b2a86" brows="calm" smile="smirk"
        back={<circle cx="50" cy="34" r="30" fill={GOLD} opacity="0.22" />}
        collar={<>
          <path d="M45 80 H55 V104 H45 Z" fill={GOLD} {...outline} />
          <path d="M19 92 C23 78 34 71 50 71 C66 71 77 78 81 92 C73 86 62 83 50 83 C38 83 27 86 19 92 Z" fill="#fbf7ee" {...outline} />
          {[[26, 83], [34, 77], [42, 75], [58, 75], [66, 77], [74, 83]].map(([x, y]) => (
            <path key={x} d={`M${x} ${y} c-1.2 1.6 -1.2 3 0 4 c1.2 -1 1.2 -2.4 0 -4 Z`} fill={INK} />
          ))}
          {jewel(50, 89, '#c8323c', 2.8)}{jewel(50, 96, '#3a6fd8', 2)}
        </>}
        hair={<path d="M36.5 44 C36 32 64 32 63.5 44 C60 38 40 38 36.5 44 Z" fill="#5a3a22" {...outline} />}
        face={<>
          <path d="M39 52 C40 63 60 63 61 52 C57 57.5 54 57 50 58 C46 57 43 57.5 39 52 Z" fill="#5a3a22" {...outline} />
          <path d="M41 52 C44 49 48 50 50 51.5 C52 50 56 49 59 52 C56 53 53 52.5 50 53.5 C47 52.5 44 53 41 52 Z" fill="#5a3a22" />
        </>}
        hat={<>
          <path d="M36 31 C36 15 64 15 64 31 Z" fill="#5b2a86" {...outline} />
          <path d="M33 32 L30 15 L38 23 L42 11 L46 21 L50 8 L54 21 L58 11 L62 23 L70 15 L67 32 Z" fill={GOLD} {...outline} />
          <rect x="32" y="29" width="36" height="7" rx="1.5" fill={GOLD} {...outline} />
          {jewel(38, 32.5, '#3a6fd8')}{jewel(44, 32.5, '#2f9e62')}{jewel(50, 32.5, '#c8323c', 2.4)}{jewel(56, 32.5, '#2f9e62')}{jewel(62, 32.5, '#3a6fd8')}
          {jewel(30, 15, '#fbf7ee', 1.6)}{jewel(42, 11, '#fbf7ee', 1.6)}{jewel(58, 11, '#fbf7ee', 1.6)}{jewel(70, 15, '#fbf7ee', 1.6)}
          {jewel(50, 9, '#c8323c', 2.4)}{jewel(50, 24, '#3a6fd8', 1.8)}
        </>}
        item={<>
          <path d="M80 100 L85 60" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M85.5 45 L90.5 53 L85.5 61 L80.5 53 Z" fill={GOLD} {...outline} />
          {jewel(85.5, 53, '#3a6fd8', 2)}{jewel(85.5, 44, '#fbf7ee', 1.6)}
        </>}
      />
    ),
  },
  'Gräfin Charlotta': {
    art: (
      <Portrait
        id="bot-charlotta" bg="#5e2456" skin={SKIN.deep} garment="#1f8a7a" brows="proud" smile="smirk"
        back={<path d="M33 46 C28 32 32 14 50 10 C68 14 72 32 67 46 C64 40 36 40 33 46 Z" fill="#1c140e" {...outline} />}
        collar={<>
          <path d="M38 71 C40 84 60 84 62 71" fill="none" stroke={GOLD} strokeWidth="2.2" />
          <path d="M41 74 C44 81 56 81 59 74" fill="none" stroke="#fbf7ee" strokeWidth="3" strokeDasharray="0.1 3.4" strokeLinecap="round" />
          {jewel(50, 82, '#2f9e62', 2.4)}
        </>}
        hair={<path d="M36.5 44 C35 28 65 28 63.5 44 C60 34 50 32 44 36 C40 38 38 40 36.5 44 Z" fill="#1c140e" {...outline} />}
        face={<>{jewel(36.8, 52, '#fbf7ee', 1.5)}{jewel(63.2, 52, '#fbf7ee', 1.5)}</>}
        hat={<>
          <path d="M36 27 C44 20 56 20 64 27" fill="none" stroke="#fbf7ee" strokeWidth="2.8" strokeDasharray="0.1 3.4" strokeLinecap="round" />
          {jewel(50, 16, '#2f9e62', 2.6)}
        </>}
        item={<>
          <path d="M75 88 L62.1 72.7 A20 20 0 0 1 85 70.7 Z" fill="#fbf7ee" {...outline} />
          <path d="M75 88 L67.3 69.5 A20 20 0 0 1 73.3 68.1 Z M75 88 L79.3 68.5 A20 20 0 0 1 85 70.7 Z" fill="#1f8a7a" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        </>}
      />
    ),
  },
  'Hofmeister Paul': {
    art: (
      <Portrait
        id="bot-paul" bg="#b08a3a" skin={SKIN.light} garment="#2f5a3a" brows="calm" smile="smile"
        collar={<>
          <path d="M41 76 H59 V104 H41 Z" fill="#6b4c30" {...outline} />
          <path d="M44 71 L50 79 L56 71 Z" fill="#fbf7ee" {...outline} />
          <path d="M30 79 C36 92 64 92 70 79" fill="none" stroke={INK} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M30 79 C36 92 64 92 70 79" fill="none" stroke={GOLD} strokeWidth="2.6" strokeDasharray="2.6 1.2" />
          <circle cx="50" cy="91" r="4.2" fill={GOLD} {...outline} />
          <circle cx="50" cy="91" r="1.8" fill="#2f5a3a" />
        </>}
        hair={<>
          <path d="M36 46 C34 27 66 27 64 46 C61 38 52 35 45 35.5 C41 37 38 41 36 46 Z" fill="#2a1a10" {...outline} />
          <path d="M44.5 31.5 C44.6 33 45 34.5 45.3 35.6" fill="none" stroke="#6b4c30" strokeWidth="1.2" strokeLinecap="round" />
        </>}
        face={<path d="M42 52 C45 49.5 48 50.5 50 51.5 C52 50.5 55 49.5 58 52 C59 51 60 50 61 50.5 C60 53 57 53.5 55 53 C53 52.8 51.5 53 50 53.5 C48.5 53 47 52.8 45 53 C43 53.5 40 53 39 50.5 C40 50 41 51 42 52 Z" fill="#2a1a10" />}
        item={<>
          <circle cx="75" cy="62" r="5.5" fill="none" stroke={INK} strokeWidth="4.2" />
          <circle cx="75" cy="62" r="5.5" fill="none" stroke={GOLD} strokeWidth="2.4" />
          <path d="M72.5 70 L71 82 M71.4 78.5 H68 M71 81.5 H68 M79 70.5 L80.5 82 M80.1 78.5 H83.5 M80.5 81.5 H83.5" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M72.5 70 L71 82 M71.4 78.5 H68 M71 81.5 H68 M79 70.5 L80.5 82 M80.1 78.5 H83.5 M80.5 81.5 H83.5" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="72.5" cy="68" r="2.6" fill={GOLD} {...outline} />
          <circle cx="79" cy="68.5" r="2.6" fill={GOLD} {...outline} />
        </>}
      />
    ),
  },
  'Wissenschaftlerin Maxi': {
    art: (
      <Portrait
        id="bot-maxi" bg="#2f8a8a" skin={SKIN.tan} garment="#24407e" brows="raised" smile="grin"
        back={<>
          {[[35, 36], [41, 28], [50, 25], [59, 28], [65, 36], [33, 46], [67, 46]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6.5" fill="#b5532a" {...outline} />)}
        </>}
        collar={<>
          <path d="M43 71 L50 80 L57 71 Z" fill="#fbf7ee" {...outline} />
          {jewel(42, 86, '#c9a06a', 1.8)}{jewel(42, 94, '#c9a06a', 1.8)}
        </>}
        hair={<path d="M36.5 44 C35 34 39 31 43 32 L45.5 37 L48.5 32 L51.5 37 L54.5 32 L57 37 C61 34 64 38 63.5 44 C60 39 40 39 36.5 44 Z" fill="#b5532a" {...outline} />}
        hat={<>
          <path d="M35 35 C40 27 60 27 65 35" fill="none" stroke="#6b4c30" strokeWidth="3" strokeLinecap="round" />
          <circle cx="44" cy="30" r="5.5" fill="#c9a06a" {...outline} />
          <circle cx="56" cy="30" r="5.5" fill="#c9a06a" {...outline} />
          <circle cx="44" cy="30" r="3.4" fill="#9fe3ff" stroke={INK} strokeWidth="0.8" />
          <circle cx="56" cy="30" r="3.4" fill="#9fe3ff" stroke={INK} strokeWidth="0.8" />
          <path d="M42.5 28.5 L44 27.5 M54.5 28.5 L56 27.5" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
        </>}
        item={<>
          <path d="M73 62 L67 76 C66 78 67 80 69 80 H81 C83 80 84 78 83 76 L77 62 Z" fill="#dff4ff" {...outline} />
          <path d="M69.6 70 H80.4 L83 76 C84 78 83 80 81 80 H69 C67 80 66 78 67 76 Z" fill="#5ad06a" {...outline} />
          <rect x="71.5" y="55" width="7" height="3" rx="1" fill="#c9a06a" {...outline} />
          <path d="M73 58 V62 M77 58 V62" stroke={INK} strokeWidth="1.8" />
          <circle cx="74" cy="74" r="1.2" fill="#fbf7ee" />
          <circle cx="78" cy="76.5" r="0.9" fill="#fbf7ee" />
          <circle cx="76" cy="66" r="1.2" fill="#5ad06a" stroke={INK} strokeWidth="0.6" />
          <circle cx="78.5" cy="51" r="1.4" fill="#5ad06a" stroke={INK} strokeWidth="0.6" />
        </>}
      />
    ),
  },
  'Leibwächter Ali': {
    art: (
      <Portrait
        id="bot-ali" bg="#4a5a6e" skin={SKIN.mid} garment="#9aa3ad" brows="proud" smile="flat"
        collar={<>
          <path d="M14 90 C16 76 28 70 38 73 L37 82 C30 82 22 86 14 90 Z M86 90 C84 76 72 70 62 73 L63 82 C70 82 78 86 86 90 Z" fill="#b8c0c8" {...outline} />
          <path d="M35 80 H65 L67 104 H33 Z" fill="#c8323c" {...outline} />
          <path d="M43 94 L42 86 L46 89 L50 84 L54 89 L58 86 L57 94 Z" fill={GOLD} {...outline} />
          <path d="M38 70 C40 77 60 77 62 70 L66 75 C60 84 40 84 34 75 Z" fill="#c9cdd8" {...outline} />
          <circle cx="40" cy="78" r="0.9" fill={INK} /><circle cx="60" cy="78" r="0.9" fill={INK} />
        </>}
        face={<>
          <path d="M37 48 C37 66 63 66 63 48 C60 56 55 56 50 57 C45 56 40 56 37 48 Z" fill="#2a1a10" {...outline} />
          <path d="M41 52 C44 49 48 50 50 51.5 C52 50 56 49 59 52 C56 53 53 52.5 50 53.5 C47 52.5 44 53 41 52 Z" fill="#2a1a10" />
        </>}
        hat={<>
          <path d="M37 34 C37 17 63 17 63 34 Z" fill="#b8c0c8" {...outline} />
          <path d="M50 18.5 V31" stroke="#6f7882" strokeWidth="1.5" />
          <ellipse cx="50" cy="34.5" rx="21" ry="4" fill="#c9cdd8" {...outline} />
        </>}
        item={<>
          <path d="M18 100 L22.5 36" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
          <path d="M21.5 30 L23.5 39 L20.5 39 Z" fill="#c9cdd8" {...outline} />
          <path d="M21.6 43 C13 41 10 50 12 59 C15 55 19 54 21 53 Z" fill="#c9cdd8" {...outline} />
          <path d="M22.4 45 L29 43 L22.2 49 Z" fill="#c9cdd8" {...outline} />
        </>}
      />
    ),
  },
};

/** Generic courtier for extra bots beyond the named ones ("Höfling 9"). */
const COURTIER = (
  <Portrait
    id="bot-hoefling" bg="#3d2361" skin={SKIN.mid} garment="#6b1e2e" brows="raised" smile="smirk"
    hat={<path d="M32 36 C34 22 66 22 68 36 L60 34 C54 26 46 26 40 34 Z" fill="#1c1a2a" {...outline} />}
    collar={<path d="M34 78 C42 72 58 72 66 78" fill="none" stroke={GOLD} strokeWidth="2.6" />}
  />
);

/** Art ids for the bot portraits, served like card art. */
export const BOT_ART: Record<string, ReactNode> = {
  ...Object.fromEntries(Object.entries(BOTS).map(([name, b]) => [BOT_ART_IDS[name], b.art])),
  'bot-hoefling': COURTIER,
};
