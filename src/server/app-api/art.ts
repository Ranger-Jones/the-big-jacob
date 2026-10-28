import 'server-only';
import { createElement, Fragment, isValidElement, type ReactNode } from 'react';
import { CardArt, FullCardArt, hasArt } from '@/components/deck/art';
import { JesterWord } from '@/components/deck/jester-word';
import { Icon, ICON_NAMES } from '@/components/ui/icons';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** SVG attributes that keep their camelCase name; every other camelCase prop becomes kebab-case. */
const CAMEL_ATTRS = new Set([
  'viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'patternUnits', 'patternContentUnits',
  'patternTransform', 'clipPathUnits', 'maskUnits', 'maskContentUnits', 'stdDeviation', 'baseFrequency', 'numOctaves',
  'filterUnits', 'primitiveUnits', 'markerWidth', 'markerHeight', 'refX', 'refY', 'pathLength', 'textLength',
  'lengthAdjust', 'spreadMethod', 'startOffset', 'tableValues', 'kernelMatrix', 'keyPoints', 'keyTimes', 'keySplines',
  'calcMode', 'attributeName', 'repeatCount', 'xChannelSelector', 'yChannelSelector', 'diffuseConstant',
  'specularExponent', 'surfaceScale', 'limitingConeAngle', 'edgeMode', 'targetX', 'targetY',
]);

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function attrName(prop: string): string {
  if (prop === 'className') return 'class';
  if (prop === 'xlinkHref') return 'xlink:href';
  return CAMEL_ATTRS.has(prop) ? prop : kebab(prop);
}

function styleString(style: Record<string, unknown>): string {
  return Object.entries(style).filter(([, v]) => v != null && v !== false).map(([k, v]) => `${kebab(k)}:${v}`).join(';');
}

/**
 * Minimal static SVG renderer for the card illustrations. They are pure, hook-free function components,
 * and Next.js does not allow react-dom/server in route handlers.
 */
export function renderSvg(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return escape(String(node));
  if (Array.isArray(node)) return node.map(renderSvg).join('');
  if (!isValidElement(node)) return '';
  const { type } = node;
  const props = node.props as Record<string, unknown> & { children?: ReactNode };
  if (type === Fragment) return renderSvg(props.children);
  // Client leaves cannot run on the server: the jester's name is translated there, the app is German.
  if (type === JesterWord) return 'Narr';
  if ((type as { $$typeof?: symbol }).$$typeof === Symbol.for('react.client.reference')) return '';
  if (typeof type === 'function') return renderSvg((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== 'string') return '';
  let attrs = '';
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || value == null || value === false || typeof value === 'function') continue;
    if (key === 'aria-hidden') continue;
    const v = key === 'style' && typeof value === 'object' ? styleString(value as Record<string, unknown>) : String(value);
    attrs += ` ${attrName(key)}="${escape(v)}"`;
  }
  const inner = renderSvg(props.children);
  return `<${type}${attrs}>${inner}</${type}>`;
}

/**
 * A card illustration as a standalone SVG for the app: "full" is the whole card face (100×140, with the
 * worked-in numeral), "icon" the bare motif (100×100) for medallions and card backs.
 */
export function renderArt(id: string, params: URLSearchParams): string | null {
  if (!hasArt(id)) return null;
  const kind = params.get('kind') === 'icon' ? 'icon' : 'full';
  const rank = Number(params.get('rank') ?? 1);
  const bg = params.get('bg') ?? '#3d2361';
  if (!Number.isInteger(rank) || rank < 1 || rank > 13 || !HEX.test(bg)) return null;
  const markup = kind === 'icon'
    ? renderSvg(createElement(CardArt, { id }))
    : renderSvg(createElement(FullCardArt, { id, rank, bg, numeral: params.get('numeral') !== '0' }));
  return markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** The "Hofstaat" UI icons as standalone SVGs (stroke/fill use currentColor), for the app's icon set. */
export function renderIcons(): Record<string, string> {
  return Object.fromEntries(ICON_NAMES.map((name) => [
    name,
    renderSvg(createElement(Icon, { name })).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"').replace(/ class="[^"]*"/, ''),
  ]));
}
