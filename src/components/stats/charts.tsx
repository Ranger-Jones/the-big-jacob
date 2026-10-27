'use client';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useIntlLocale, useT } from '@/lib/i18n/client';

/** Single-series mark colour, validated (dataviz checks, dark mode) against the velvet panel surface. */
const MARK = '#c0842a';
const MARK_HOVER = '#d99a35';
const GRID = 'var(--color-line)';
const SURFACE = '#1b0e2e';

function niceMax(v: number): number {
  if (v <= 4) return Math.max(1, v);
  const step = 10 ** Math.floor(Math.log10(v));
  const n = v / step;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * step;
}

/** Rendered width of the chart box: charts draw at true pixel size, so marks keep their spec on any screen. */
function useWidth(ref: RefObject<HTMLDivElement | null>, fallback: number) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Gridline values: halves for larger ranges, whole numbers for small ones (never a repeated label). */
function ticks(min: number, max: number): number[] {
  const range = max - min;
  if (range <= 4) return Array.from({ length: range + 1 }, (_, i) => min + i);
  return [min, min + range / 2, max];
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-[#120a1f] px-3 py-1.5 text-sm text-[#f6ead2] shadow-lg ring-1 ring-gold/40"
      style={{ left: x, top: y - 8 }}
    >
      {children}
    </div>
  );
}

function TableToggle({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const t = useT();
  return (
    <details className="mt-1 text-sm">
      <summary className="w-fit cursor-pointer text-ink-soft hover:text-ink">{t('Als Tabelle')}</summary>
      <table className="mt-2 w-full text-left">
        <thead className="text-ink-soft"><tr>{head.map((h) => <th key={h} className="py-1 pr-3 font-bold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line/60">{r.map((c, j) => <td key={j} className="tabular py-1 pr-3">{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  );
}

/** Unit text with an {n} placeholder, e.g. ['{n} Spiel', '{n} Spiele'] (functions can't cross to the client). */
export type Unit = [one: string, many: string];
const fmt = ([one, many]: Unit, n: number, locale: string) => (n === 1 ? one : many).replace('{n}', n.toLocaleString(locale));

export interface Column { label: string; short: string; value: number }

/**
 * Columns from one baseline with a hover/focus tooltip. `labelAll` puts every value on its cap,
 * otherwise only the largest column is labelled.
 */
export function ColumnChart({ data, unit, labelAll = false, tableHead }: { data: Column[]; unit: Unit; labelAll?: boolean; tableHead: [string, string] }) {
  const locale = useIntlLocale();
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = useWidth(box, 280);
  const slot = width / data.length;
  const top = 22;
  const plot = 120;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const bar = Math.min(24, slot - 10);
  const y = (v: number) => top + plot - (v / max) * plot;
  const tipPos = (i: number) => ({ x: i * slot + slot / 2, y: y(data[i].value) });

  return (
    <div>
      <div ref={box} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={top + plot + 22} className="block" role="img" aria-label={data.map((d) => `${d.label}: ${fmt(unit, d.value, locale)}`).join(', ')}>
          {ticks(0, max).map((v) => (
            <line key={v} x1={0} x2={width} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
          ))}
          {data.map((d, i) => {
            const cx = i * slot + slot / 2;
            const h = Math.max(0, top + plot - y(d.value));
            const r = Math.min(4, h);
            const x0 = cx - bar / 2;
            const yTop = top + plot - h;
            const showValue = d.value > 0 && (labelAll || i === peak);
            return (
              <g key={d.label}>
                {h > 0 && (
                  <path
                    d={`M${x0},${top + plot} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + bar - r} Q${x0 + bar},${yTop} ${x0 + bar},${yTop + r} V${top + plot} Z`}
                    fill={hover === i ? MARK_HOVER : MARK}
                  />
                )}
                {showValue && <text x={cx} y={yTop - 5} textAnchor="middle" className="fill-ink text-[11px] font-bold">{d.value}</text>}
                <text x={cx} y={top + plot + 15} textAnchor="middle" className="fill-ink-soft text-[11px]">{d.short}</text>
                <rect
                  x={i * slot} y={0} width={slot} height={top + plot + 22} fill="transparent" tabIndex={0}
                  aria-label={`${d.label}: ${fmt(unit, d.value, locale)}`}
                  onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  className="outline-none focus-visible:stroke-gold-deep focus-visible:[stroke-width:2]"
                />
              </g>
            );
          })}
          <line x1={0} x2={width} y1={top + plot} y2={top + plot} stroke="var(--color-ink-soft)" strokeWidth={1} />
        </svg>
        {hover !== null && (
          <Tooltip {...tipPos(hover)}>
            <b className="tabular">{fmt(unit, data[hover].value, locale)}</b> <span className="text-[#b8a7c8]">{data[hover].label}</span>
          </Tooltip>
        )}
      </div>
      <TableToggle head={tableHead} rows={data.map((d) => [d.label, d.value])} />
    </div>
  );
}

export interface LinePoint { label: string; value: number; detail: string }

/** One line with a 10% wash, a crosshair that snaps to the nearest game and an end label. */
export function LineChart({ data, unit, tableHead }: { data: LinePoint[]; unit: Unit; tableHead: [string, string, string] }) {
  const t = useT();
  const locale = useIntlLocale();
  const box = useRef<HTMLDivElement>(null);
  const gradient = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = useWidth(box, 280);
  const top = 18;
  const plot = 140;
  const pad = 14;
  const min = Math.min(0, ...data.map((d) => d.value));
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const x = (i: number) => pad + (data.length === 1 ? (width - 2 * pad) / 2 : (i / (data.length - 1)) * (width - 2 * pad - 30));
  const y = (v: number) => top + plot - ((v - min) / (max - min || 1)) * plot;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const last = data.length - 1;

  const pick = (clientX: number) => {
    const el = box.current;
    if (!el || data.length === 0) return;
    const rect = el.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    data.forEach((_, i) => { if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i; });
    setHover(best);
  };

  return (
    <div>
      <div
        ref={box} className="relative touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-gold-deep" tabIndex={0}
        aria-label={t('Formkurve, mit Pfeiltasten durch die Spiele')}
        onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setHover((h) => Math.min(last, (h ?? -1) + 1));
          if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? last + 1) - 1));
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={top + plot + 10} className="block" role="img" aria-label={t('Punkte der letzten {n} Spiele', { n: data.length })}>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={MARK} stopOpacity="0.14" />
              <stop offset="1" stopColor={MARK} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {ticks(min, max).map((v) => {
            return (
              <g key={v}>
                <line x1={0} x2={width} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
                <text x={width} y={y(v) - 4} textAnchor="end" className="fill-ink-soft text-[11px]">{Math.round(v)}</text>
              </g>
            );
          })}
          {data.length > 1 && <path d={`${path} L${x(last)},${y(min)} L${x(0)},${y(min)} Z`} fill={`url(#${gradient})`} />}
          <path d={path} fill="none" stroke={MARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top - 6} y2={top + plot} stroke="var(--color-ink-soft)" strokeWidth={1} />}
          {[hover ?? last].map((i) => (
            <circle key={i} cx={x(i)} cy={y(data[i].value)} r={5} fill={MARK} stroke={SURFACE} strokeWidth={2} />
          ))}
          {hover === null && <text x={x(last) + 9} y={y(data[last].value) + 4} className="fill-ink text-[12px] font-bold">{data[last].value}</text>}
        </svg>
        {hover !== null && (
          <Tooltip x={x(hover)} y={y(data[hover].value)}>
            <b className="tabular">{fmt(unit, data[hover].value, locale)}</b> <span className="text-[#b8a7c8]">{data[hover].detail}</span>
          </Tooltip>
        )}
      </div>
      <TableToggle head={tableHead} rows={data.map((d) => [d.label, d.detail, d.value])} />
    </div>
  );
}
