import type { ReactNode, SVGProps } from 'react';
import { cx } from '@/lib/cx';
import { MedalFrame } from './medal-frame';

/**
 * "Hofstaat" icon set: drawn on a 24-unit grid with round 1.75 strokes in the current text colour,
 * plus a soft duotone fill (`F`) for the main shape. Use <Icon name="crown" /> – it sizes to 1em.
 */

/** Duotone body: a translucent fill of the current colour. */
const F = { fill: 'currentColor', fillOpacity: 0.2 } as const;
/** Solid detail. */
const S = { fill: 'currentColor', stroke: 'none' } as const;

const ICONS = {
  // Ranks ----------------------------------------------------------------------------------------
  crown: (
    <>
      <path d="M3.5 8.5 7.6 12 12 5.5l4.4 6.5 4.1-3.5-1.7 9.7H5.2Z" {...F} />
      <path d="M5 21h14" />
      <circle cx="12" cy="4" r="1.3" {...S} />
      <circle cx="3.3" cy="7.6" r="1.1" {...S} />
      <circle cx="20.7" cy="7.6" r="1.1" {...S} />
    </>
  ),
  coronet: (
    <>
      <path d="M5 16.5 6 9.5l3 3 3-4.5 3 4.5 3-3 1 7Z" {...F} />
      <path d="M5 19.5h14" />
      <circle cx="12" cy="13.5" r="1" {...S} />
    </>
  ),
  basket: (
    <>
      <path d="M3.5 10.5h17l-1.8 9H5.3Z" {...F} />
      <path d="M7.5 10.5a4.5 4.5 0 0 1 9 0" />
      <path d="M9 13.5v3.5M12 13.5v3.5M15 13.5v3.5" />
    </>
  ),
  bucket: (
    <>
      <path d="M5 9.5h14l-1.6 10.5H6.6Z" {...F} />
      <path d="M5.5 9.5c0-5 13-5 13 0" />
      <path d="M6 13.5h12" />
    </>
  ),
  broom: (
    <>
      <path d="M19 3 12.4 10.6" />
      <path d="m9.6 9.4 4.9 4.6-4.1 6.3c-2.4.7-5.5-.7-6.9-3.7Z" {...F} />
      <path d="m10.4 10.2 3.3 3.1M8.3 14.6 5.6 19M10.9 16.4l-2.2 3.8" />
    </>
  ),

  // Navigation -----------------------------------------------------------------------------------
  cards: (
    <>
      <rect x="3.5" y="5" width="10" height="14" rx="2" transform="rotate(-12 8.5 12)" {...F} />
      <rect x="10" y="4" width="10" height="14" rx="2" transform="rotate(9 15 11)" />
      <path d="m15.4 8.4.8 2.2 2.2.4-1.7 1.5.4 2.2-2-1.1-1.9 1 .5-2.2-1.6-1.6 2.2-.3Z" {...S} transform="rotate(9 15 11)" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="8" r="3.2" {...F} />
      <path d="M3 19.5c0-3.4 2.7-5.3 6-5.3s6 1.9 6 5.3" />
      <circle cx="16.8" cy="9" r="2.6" />
      <path d="M15.3 14.5c3-.5 5.7 1 5.7 4.2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3.5h10V9a5 5 0 0 1-10 0Z" {...F} />
      <path d="M7 5.5H4.5a2.7 2.7 0 0 0 2.8 4.5M17 5.5h2.5a2.7 2.7 0 0 1-2.8 4.5" />
      <path d="M12 14v3M9.5 17h5M8 20.5h8" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 6.5A2.5 2.5 0 0 1 8.5 4H19v13.5a2.5 2.5 0 0 1-2.5 2.5H7" {...F} />
      <path d="M6 6.5V18a2 2 0 0 0 4 0v-1h9" />
      <path d="M10.5 8h5M10.5 11h5M10.5 14h3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.2" {...F} />
      <path d="m11 12 8.5-8.5M16 7l2.2 2.2M13.7 9.3l2 2" />
      <circle cx="8" cy="15" r="1.2" {...S} />
    </>
  ),
  castle: (
    <>
      <path d="M4 20.5V8h2.6v2.2h2.2V8h2.4v2.2h1.6V8h2.4v2.2h2.2V8H20v12.5Z" {...F} />
      <path d="M10 20.5v-4a2 2 0 0 1 4 0v4M3 20.5h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" {...F} />
      <path d="M4 20.5c0-4.2 3.6-6.3 8-6.3s8 2.1 8 6.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2.2H4Z" {...F} />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4Z" {...F} />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" {...F} />
      <path d="m3.5 7 8.5 6.5L20.5 7" />
    </>
  ),

  // Table & game ---------------------------------------------------------------------------------
  chat: (
    <>
      <path d="M4 5h16v11H9.5L4 20Z" {...F} />
      <circle cx="8.5" cy="10.5" r="1" {...S} />
      <circle cx="12" cy="10.5" r="1" {...S} />
      <circle cx="15.5" cy="10.5" r="1" {...S} />
    </>
  ),
  book: (
    <>
      <path d="M3 5.5c2.6-1 5.6-1 9 .6 3.4-1.6 6.4-1.6 9-.6V19c-2.6-1-5.6-1-9 .6-3.4-1.6-6.4-1.6-9-.6Z" {...F} />
      <path d="M12 6.1v13.5" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9h4l5-4.5v15L8 15H4Z" {...F} />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M4 9h4l5-4.5v15L8 15H4Z" {...F} />
      <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6.5L19 4v12" />
      <circle cx="6.8" cy="18" r="2.6" {...F} />
      <circle cx="16.8" cy="16" r="2.6" {...F} />
      <path d="M9 10 19 7.5" />
    </>
  ),
  'music-off': (
    <>
      <path d="M9 18V6.5L19 4v12" />
      <circle cx="6.8" cy="18" r="2.6" {...F} />
      <circle cx="16.8" cy="16" r="2.6" {...F} />
      <path d="m3 3 18 18" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5.5 14 12l-9 6.5Z" {...F} />
      <path d="M18 5.5v13" />
    </>
  ),
  exit: (
    <>
      <path d="M5 20.5V5a1 1 0 0 1 1-1h8v16.5Z" {...F} />
      <path d="M3.5 20.5h12M15 12h6.5M18.5 9l3 3-3 3" />
      <circle cx="11.5" cy="12.5" r=".9" {...S} />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...F} />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1.2" {...S} />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" {...F} />
      <circle cx="12" cy="12" r="1.6" {...S} />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" {...F} />
      <path d="m7.8 12.3 2.9 2.9 5.5-5.7" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6.5 3h11M6.5 21h11" />
      <path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
      <path d="M9.5 19.5c1-1.8 4-1.8 5 0Z" {...S} />
    </>
  ),
  bot: (
    <>
      <rect x="4.5" y="8" width="15" height="11.5" rx="3" {...F} />
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1.2" {...S} />
      <circle cx="9.2" cy="13" r="1.3" {...S} />
      <circle cx="14.8" cy="13" r="1.3" {...S} />
      <path d="M9.5 16.5h5M2.5 12.5v3M21.5 12.5v3" />
    </>
  ),
  fox: (
    <>
      <path d="M4 4.5 8.5 10h7L20 4.5l-1 9-7 6.5-7-6.5Z" {...F} />
      <circle cx="9.3" cy="12.8" r="1" {...S} />
      <circle cx="14.7" cy="12.8" r="1" {...S} />
      <path d="M11 16.3h2l-1 1.2Z" {...S} />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" {...F} />
      <circle cx="9" cy="10" r="1.1" {...S} />
      <circle cx="15" cy="10" r="1.1" {...S} />
      <path d="M8.3 14.2a4.5 4.5 0 0 0 7.4 0" />
    </>
  ),
  jester: (
    <>
      <path d="M4.5 17.5c.6-5.5-.5-8.5-2.5-10.5 4 0 6.2 2.2 7.2 5.2.8-4 1.8-6.8 2.8-8.2 1 1.4 2 4.2 2.8 8.2 1-3 3.2-5.2 7.2-5.2-2 2-3.1 5-2.5 10.5Z" {...F} />
      <path d="M4.5 17.5h15V20h-15Z" />
      <circle cx="2.4" cy="7" r="1.3" {...S} />
      <circle cx="12" cy="3.8" r="1.3" {...S} />
      <circle cx="21.6" cy="7" r="1.3" {...S} />
    </>
  ),
  sword: (
    <>
      <path d="m20.5 3.5-1 4-9.8 9.8-3-3 9.8-9.8Z" {...F} />
      <path d="m5 13 6 6M6.8 17.2 3.5 20.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5.5c0 4.6-3.3 8.2-7 9.5-3.7-1.3-7-4.9-7-9.5V6Z" {...F} />
      <path d="M12 7.5v9M8 11.5h8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" {...F} />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <rect x="12.5" y="13" width="4" height="4" rx=".8" {...S} />
    </>
  ),
  flame: (
    <path d="M12 2.8c1 4 6.3 6 6.3 11.2a6.3 6.3 0 0 1-12.6 0c0-3 2-4.6 2-7.2 2 1 3.3 3 3.3 4.7.2-3.4-.1-6.4 1-8.7Z" {...F} />
  ),
  fist: (
    <>
      <path d="M7 11.5V8a1.5 1.5 0 0 1 3 0v1.5M10 9.5V6.5a1.5 1.5 0 0 1 3 0v3M13 9.5V7a1.5 1.5 0 0 1 3 0v2.5" />
      <path d="M16 9.5a1.5 1.5 0 0 1 3 0V14c0 3-2.2 5-5.2 5h-1.6C8.7 19 6 16.6 6 13.5c0-1.2.4-2 1-2h4.5a1.8 1.8 0 0 1 0 3.5H9" {...F} />
      <path d="M9 19v2.5h6V19" />
    </>
  ),
  bomb: (
    <>
      <circle cx="10" cy="14" r="6.5" {...F} />
      <path d="m14.5 9.5 2-2M16.2 7.3c1-1.8 2.8-2 3.8-1" />
      <path d="M20 2.5V4M22 4.5l-1.2.7M18 3.6l.8 1" />
      <path d="M7.5 12a3 3 0 0 1 2.5-1.8" />
    </>
  ),
  bolt: <path d="M13.5 2 5 13.5h6.2L10 22l9-12.2h-6.2Z" {...F} />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.2" {...F} />
      <path d="m15.2 15.2 5.3 5.3" />
    </>
  ),
  dove: (
    <>
      <path d="M2.5 13.5c3.8 1.2 7.2-.4 9.4-4.7 1.2 3 3.3 4.4 6.3 4.4l3.3-2.2-1.6 4.3c-1.9 3.6-6 5.3-10 4.3l-3.1 2 .8-3.1c-2.6-1-4.3-2.7-5.1-5Z" {...F} />
      <path d="M11.9 8.8c.3-2.6 1.8-4.6 4.3-5.8-.3 2.4.2 4.3 1.6 6" />
      <circle cx="17.6" cy="11.4" r=".9" {...S} />
    </>
  ),
  throne: (
    <>
      <path d="M7 3.5h10V11H7Z" {...F} />
      <path d="M5 11h14v3.5H5ZM6.5 14.5V21M17.5 14.5V21" />
      <path d="m10 6 2-1.5L14 6" />
    </>
  ),
  ladder: <path d="M7 3v18M17 3v18M7 7h10M7 11h10M7 15h10M7 19h10" />,
  medal: (
    <>
      <path d="M7.5 2.5 10.5 9M16.5 2.5 13.5 9" />
      <circle cx="12" cy="15" r="6.2" {...F} />
      <path d="m12 11.8 1 2.1 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3Z" {...S} />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...F} />
      <path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5Z" {...F} />,
  pause: <path d="M7 5h3.5v14H7ZM13.5 5H17v14h-3.5Z" {...F} />,
  'skip-back': (
    <>
      <path d="M19 5.5 10 12l9 6.5Z" {...F} />
      <path d="M6 5.5v13" />
    </>
  ),
  swap: <path d="M6 8h13l-3.5-3.5M18 16H5l3.5 3.5" />,
  flip: <path d="M12 3v18M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5" />,
  sparkles: (
    <>
      <path d="m11 3 1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8Z" {...F} />
      <path d="M19 14.5v5M16.5 17h5" />
    </>
  ),
  party: (
    <>
      <path d="m3.5 20.5 4.2-11.2 7 7Z" {...F} />
      <path d="M13 3.5c.6 1.4.5 2.7-.3 4M20.5 11c-1.4-.6-2.7-.5-4 .3M17 6.5l-2 2" />
      <circle cx="17.5" cy="3.5" r="1" {...S} />
      <circle cx="20.5" cy="7" r="1" {...S} />
      <circle cx="9.5" cy="5.5" r="1" {...S} />
      <circle cx="19" cy="15.5" r="1" {...S} />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" {...F} />
      <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4M5 14v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
    </>
  ),
  rat: (
    <>
      <path d="M5 15.5c0-4 3.7-7 8.5-7 3.2 0 6 2 6 5 0 1.8-1.6 3-3.6 3H6.2c-.7 0-1.2-.4-1.2-1Z" {...F} />
      <circle cx="16" cy="9.3" r="1.8" />
      <circle cx="17.6" cy="12.8" r=".8" {...S} />
      <path d="M5 15.5c-1.8 1.8-1 4 1.4 4H19" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11.5" rx="1.5" {...F} />
      <path d="M3 9h18v3.5H3ZM12 9v11.5M12 9C10 4.5 6.5 5.5 7.8 7.8 8.6 9 12 9 12 9Zm0 0c2-4.5 5.5-3.5 4.2-1.2C15.4 9 12 9 12 9Z" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" {...F} />,
  wheat: (
    <>
      <path d="M12 21V8" />
      {[[-1, 10], [1, 10], [-1, 14], [1, 14], [-1, 6], [1, 6]].map(([side, y]) => (
        <ellipse key={`${side}${y}`} cx={12 + side * 2.2} cy={y} rx="1.6" ry="2.6" transform={`rotate(${side * 35} ${12 + side * 2.2} ${y})`} {...F} />
      ))}
      <ellipse cx="12" cy="3.6" rx="1.4" ry="2.2" {...F} />
    </>
  ),
  hammer: (
    <>
      <path d="M13.5 5.5 18.5 10.5 16 13l-5-5Z" {...F} />
      <path d="M12.5 9.5 4 18a1.4 1.4 0 0 0 2 2l8.5-8.5M15.5 4l2-1.5 4 4L20 8.5" />
    </>
  ),
  church: (
    <>
      <path d="M6 21V11l6-5 6 5v10Z" {...F} />
      <path d="M12 2v4M10 3.8h4M10 21v-4a2 2 0 0 1 4 0v4M3.5 21h17" />
    </>
  ),
  mug: (
    <>
      <path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" {...F} />
      <path d="M15 11h2a2.5 2.5 0 0 1 0 5h-2M5 8c0-2.2 2-3.2 3.5-2.2 1-1.6 3.6-1.6 4.6 0 1.4-.9 1.9.6 1.9 2.2" />
    </>
  ),
  bricks: (
    <>
      <path d="M3 5h18v14H3Z" {...F} />
      <path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" />
    </>
  ),

  // Editing --------------------------------------------------------------------------------------
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10.5" rx="2" {...F} />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3.2l1.8-3h6l1.8 3H20v11.5H4Z" {...F} />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-2 2-2h2a4 4 0 0 0 4-4C21 6.1 17 3 12 3Z" {...F} />
      <circle cx="7.5" cy="11" r="1.2" {...S} />
      <circle cx="10" cy="7" r="1.2" {...S} />
      <circle cx="14.5" cy="7" r="1.2" {...S} />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...F} />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="m3.5 17.5 5-5 4 4 3-3 5 5" />
    </>
  ),
  hash: <path d="M9.5 3 7.5 21M16.5 3l-2 18M4 8.5h17M3 15.5h17" />,
  tag: (
    <>
      <path d="M3 12V3.5h8.5l9.5 9.5-8.5 8.5Z" {...F} />
      <circle cx="7.5" cy="7.5" r="1.5" {...S} />
    </>
  ),
  pencil: (
    <>
      <path d="m4 20 1.2-5L16 4.2 19.8 8 9 18.8Z" {...F} />
      <path d="m14 6.2 3.8 3.8" />
    </>
  ),
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  rotate: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.8v4.7h-4.7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8Z" {...F} />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" {...F} />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="1.1" {...S} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, className, title, strokeWidth = 1.75, ...rest }: {
  name: IconName; className?: string; title?: string; strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Default to the surrounding text size unless the caller sets a size.
      className={cx('inline-block shrink-0 align-[-0.2em]', !/(^|\s)(size|w|h)-/.test(className ?? '') && 'size-[1.15em]', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  );
}

// Semantic mappings (game data keeps its emoji fields; the UI shows these icons instead) ----------

/** Icon for a seat in the rank order (Großer Jakob … Großer Knecht). */
export function rankIcon(index: number, count: number): IconName {
  if (index === 0) return 'crown';
  if (index === count - 1) return 'broom';
  if (count >= 4 && index === 1) return 'coronet';
  if (count >= 4 && index === count - 2) return 'bucket';
  return 'basket';
}

export const EVENT_ICONS: Record<string, IconName> = {
  holiday: 'party', taxHike: 'coins', reversed: 'flip', doublePoints: 'sparkles', jesterFreedom: 'jester',
  pest: 'rat', audit: 'search', coronation: 'crown', charity: 'gift',
};

export const MISSION_ICONS: Record<string, IconName> = {
  twelveTrick: 'wheat', bigPlay: 'bricks', loneJester: 'jester', crownTwice: 'crown', neverServant: 'broom',
  fiveTricks: 'cards', revolutionary: 'fist', climber: 'ladder',
};

export const BADGE_ICONS: Record<string, IconName> = {
  'first-game': 'cards', 'first-win': 'trophy', 'ten-wins': 'castle', crowns: 'crown', servant: 'broom',
  revolution: 'fist', grand: 'flame', bomb: 'bomb', rise: 'ladder', cards: 'jester',
};

/** Campaign stations by level. */
export const STAGE_ICONS: Record<number, IconName> = {
  1: 'wheat', 2: 'mug', 3: 'basket', 4: 'hammer', 5: 'shield', 6: 'church', 7: 'coronet', 8: 'crown',
  9: 'lock', 10: 'coins', 11: 'bomb', 12: 'book', 13: 'sword', 14: 'jester', 15: 'target', 16: 'swap', 17: 'fox', 18: 'castle',
  19: 'hourglass', 20: 'flame', 21: 'dove', 22: 'key', 23: 'sparkles', 24: 'friends', 25: 'flame', 26: 'eye', 27: 'hammer', 28: 'trophy',
  29: 'scroll', 30: 'coins', 31: 'sword', 32: 'gift', 33: 'flip', 34: 'shield', 35: 'star', 36: 'church', 37: 'medal', 38: 'throne',
};

/** Icons in front of table log lines (the texts themselves come without emojis then). */
export const LOG_ICONS: Record<string, IconName> = {
  bomb: 'bomb', timeout: 'hourglass', out: 'sparkles', snap: 'bolt', revolution: 'fist', grandRevolution: 'flame',
  left: 'exit', jesterOut: 'jester', unbeatable: 'crown', kingFall: 'crown', mission: 'target', swap: 'swap',
  takeover: 'bot', mercy: 'dove', abdicate: 'throne', audit: 'search',
};

/** Removes leading emoji (and the space after them) from a text that now gets an icon instead. */
export function stripEmoji(text: string): string {
  return text.replace(/^(?:[\p{Extended_Pictographic}\uFE0F\u200D]\s*)+/u, '');
}

export const TEAM_ICONS: Record<0 | 1, IconName> = { 0: 'crown', 1: 'wheat' };

const MEDAL_COLORS = ['#f4b73a', '#c9cdd8', '#c98a52'];

/** Gold, silver or bronze medal for places 1–3; plain number otherwise. */
export function Medal({ place, className }: { place: number; className?: string }) {
  if (place < 1 || place > 3) return <span className={cx('tabular', className)}>{place}</span>;
  return (
    <MedalFrame place={place} color={MEDAL_COLORS[place - 1]} className={cx('inline-flex', className)}>
      <Icon name="medal" className="size-[1.3em]" strokeWidth={2} />
    </MedalFrame>
  );
}
