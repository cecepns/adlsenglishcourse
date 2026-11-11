import { useState } from "react";

export function LineAreaChart({ labels = [], series = [], height = 210, formatValue = (v) => v }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 560;
  const L = 40;
  const R = 16;
  const T = 16;
  const B = 28;

  const allVals = series.flatMap((s) => s.data);
  const maxVal = Math.max(4, ...allVals) * 1.15;
  const xPos = (i) => L + (labels.length < 2 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const yPos = (v) => T + (height - T - B) * (1 - v / maxVal);

  const ticks = [0, 1, 2, 3, 4].map((i) => (maxVal * i) / 4);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full overflow-visible">
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={s.name} id={`area-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={yPos(v)} y2={yPos(v)} stroke="#e2e8f0" strokeDasharray={i === 0 ? "" : "3 3"} />
            <text x={L - 8} y={yPos(v) + 3.5} fontSize="10" fill="#94a3b8" textAnchor="end">
              {formatValue(Math.round(v))}
            </text>
          </g>
        ))}

        {labels.map((lb, i) => (
          <text key={lb + i} x={xPos(i)} y={height - 6} fontSize="10.5" fontWeight="600" fill="#64748b" textAnchor="middle">
            {lb}
          </text>
        ))}

        {hoverIdx !== null && labels[hoverIdx] !== undefined && (
          <line x1={xPos(hoverIdx)} x2={xPos(hoverIdx)} y1={T} y2={height - B} stroke="#cbd5e1" strokeDasharray="3 3" />
        )}

        {series.map((s, idx) => {
          if (!s.data.length) return null;
          const pts = s.data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
          const areaPts = `${xPos(0)},${height - B} ${pts} ${xPos(s.data.length - 1)},${height - B}`;
          return (
            <g key={s.name}>
              <polygon points={areaPts} fill={`url(#area-grad-${idx})`} />
              <polyline fill="none" stroke={s.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
              {s.data.map((v, i) => (
                <circle
                  key={i}
                  cx={xPos(i)}
                  cy={yPos(v)}
                  r={hoverIdx === i ? 5.5 : 3.8}
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth="2.5"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <title>{`${s.name} (${labels[i]}): ${formatValue(v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {hoverIdx !== null && labels[hoverIdx] !== undefined && (
        <div className="mt-1 flex flex-wrap items-center gap-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white">
          <span className="font-bold text-slate-300">{labels[hoverIdx]}</span>
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}: <b>{formatValue(s.data[hoverIdx] ?? 0)}</b>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart({ labels = [], series = [], height = 210, formatValue = (v) => v }) {
  const [hover, setHover] = useState(null);
  const W = 560;
  const L = 48;
  const R = 14;
  const T = 16;
  const B = 28;

  const allVals = series.flatMap((s) => s.data);
  const maxVal = Math.max(4, ...allVals) * 1.15;
  const yPos = (v) => T + (height - T - B) * (1 - v / maxVal);
  const groupW = labels.length ? (W - L - R) / labels.length : W - L - R;
  const barW = Math.min(26, (groupW * 0.68) / Math.max(1, series.length));
  const ticks = [0, 1, 2, 3, 4].map((i) => (maxVal * i) / 4);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full overflow-visible">
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={yPos(v)} y2={yPos(v)} stroke="#e2e8f0" strokeDasharray={i === 0 ? "" : "3 3"} />
            <text x={L - 8} y={yPos(v) + 3.5} fontSize="10" fill="#94a3b8" textAnchor="end">
              {formatValue(Math.round(v))}
            </text>
          </g>
        ))}

        {labels.map((lb, i) => {
          const cx = L + groupW * i + groupW / 2;
          return (
            <g key={lb + i}>
              {series.map((s, k) => {
                const val = s.data[i] || 0;
                const x = cx - (barW * series.length) / 2 + k * barW;
                const yy = yPos(val);
                const barH = Math.max(2, height - B - yy);
                return (
                  <rect
                    key={s.name}
                    x={x}
                    y={val === 0 ? height - B - 2 : yy}
                    width={Math.max(4, barW - 3)}
                    height={barH}
                    rx="4"
                    fill={s.color}
                    opacity={hover && hover.i === i && hover.k === k ? 1 : 0.88}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHover({ i, k, label: lb, name: s.name, val })}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>{`${s.name} (${lb}): ${formatValue(val)}`}</title>
                  </rect>
                );
              })}
              <text x={cx} y={height - 6} fontSize="10.5" fontWeight="600" fill="#64748b" textAnchor="middle">
                {lb}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white">
          <span className="font-semibold text-slate-300">{hover.label}</span>
          <span>{hover.name}: <b>{formatValue(hover.val)}</b></span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({ items = [], formatValue = (v) => v, max, emptyText = "Belum ada data" }) {
  if (!items.length) return <div className="py-8 text-center text-sm text-slate-400">{emptyText}</div>;
  const maxVal = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => (
        <div key={item.label + idx}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">{item.label}</span>
            <span className="text-xs font-semibold text-slate-500">
              {formatValue(item.value)}
              {item.sub ? ` · ${item.sub}` : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (item.value * 100) / maxVal)}%`,
                background: item.gradient || (item.color === "#2a5885" || !item.color ? "linear-gradient(90deg, #1e3a5f, #2a5885, #0369a1)" : item.color),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ segments = [], centerValue = "0%", centerLabel = "Total" }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const size = 148;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative flex shrink-0 items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((seg) => {
              const len = (seg.value / total) * circ;
              const dashArray = `${len} ${circ - len}`;
              const dashOffset = -offset;
              offset += len;
              if (!seg.value) return null;
              return (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                >
                  <title>{`${seg.label}: ${seg.value}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="absolute text-center">
          <div className="text-2xl font-extrabold text-slate-900">{centerValue}</div>
          <div className="text-[11px] font-semibold text-slate-400">{centerLabel}</div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-2.5">
        {segments.map((seg) => (
          <div key={seg.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-800">{seg.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

