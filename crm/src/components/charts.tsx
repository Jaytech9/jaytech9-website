// Small hand-built SVG charts: one series each, brand blue, thin marks, hover tooltips, and a hidden table for screen readers.
import { useLayoutEffect, useRef, useState } from 'react';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

export interface Point { label: string; value: number; detail?: string }

function DataTable({ data, caption, format }: { data: Point[]; caption: string; format: (n: number) => string }) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.detail ?? d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
    </table>
  );
}

export function AreaChart({ data, caption, format = String, height = 220 }: { data: Point[]; caption: string; format?: (n: number) => string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length < 2 ? iw / 2 : (i * iw) / (data.length - 1));
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join('');
  const area = `${line}L${x(data.length - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`;
  const ticks = [0, max / 2, max];
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 70)));
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover !== null ? data[hover] : null;
  return (
    <div ref={ref} className="chart">
      <svg width={w} height={height} role="img" aria-label={caption}>
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % every === 0 || i === data.length - 1) && (
          <text key={d.label + i} x={x(i)} y={height - 8} textAnchor="middle" className="chart__tick">{d.label}</text>
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="chart__cross" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && hover !== null && (
        <div className="chart__tip" style={{ left: Math.min(w - 150, Math.max(0, x(hover) - 70)), top: Math.max(0, y(h.value) - 62) }}>
          <span>{h.detail ?? h.label}</span><strong>{format(h.value)}</strong>
        </div>
      )}
      <DataTable data={data} caption={caption} format={format} />
    </div>
  );
}

export function BarChart({ data, caption, format = String, height = 220, highlightLast = true }: { data: Point[]; caption: string; format?: (n: number) => string; height?: number; highlightLast?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 56, r: 8, t: 12, b: 28 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const band = iw / data.length;
  const bw = Math.min(36, band * 0.6);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  return (
    <div ref={ref} className="chart">
      <svg width={w} height={height} role="img" aria-label={caption}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + band * i + band / 2;
          const top = y(d.value);
          const hgt = Math.max(0, pad.t + ih - top);
          const r = Math.min(4, hgt);
          const x0 = cx - bw / 2;
          const path = hgt > 0 ? `M${x0},${pad.t + ih}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${pad.t + ih}Z` : '';
          const isLast = highlightLast && i === data.length - 1;
          return (
            <g key={d.label + i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
              {path && <path d={path} fill="var(--chart)" opacity={hover === null || hover === i ? (isLast ? 1 : 0.55) : 0.3} />}
              <text x={cx} y={height - 8} textAnchor="middle" className="chart__tick">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart__tip" style={{ left: Math.min(w - 150, Math.max(0, pad.l + band * hover + band / 2 - 70)), top: Math.max(0, y(data[hover].value) - 62) }}>
          <span>{data[hover].detail ?? data[hover].label}</span><strong>{format(data[hover].value)}</strong>
        </div>
      )}
      <DataTable data={data} caption={caption} format={format} />
    </div>
  );
}

// Ranked horizontal bars with the label above each bar and the value at the end. Good for "by service".
export function RankBars({ data, format = String, total }: { data: Point[]; format?: (n: number) => string; total?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  return (
    <ul className="rank">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${format(d.value)}`}>
          <div className="rank__row"><span className="rank__label">{d.label}</span><span className="rank__val">{format(d.value)}<small>{sum ? ` · ${Math.round((d.value / sum) * 100)}%` : ''}</small></span></div>
          <div className="rank__track"><span style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96, h = 32;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i * w) / Math.max(1, values.length - 1)},${h - 3 - ((v - min) / (max - min || 1)) * (h - 6)}`).join(' ');
  return (
    <svg width={w} height={h} role="img" aria-label={label} className="spark">
      <polyline points={pts} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
