import { useMemo, useState } from "react";
import "./LineSeriesChart.css";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  months: string[];
  series: ChartSeries[];
  formatValue: (value: number) => string;
  height?: number;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(key: string): string {
  const [, month] = key.split("-").map(Number);
  return MONTH_LABELS[month - 1];
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

export function LineSeriesChart({ months, series, formatValue, height = 220 }: Props) {
  const width = 720;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 16;
  const padBottom = 28;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const m = Math.max(0, ...all);
    return niceMax(m * 1.1 || 1);
  }, [series]);

  const stepX = months.length > 1 ? innerW / (months.length - 1) : 0;
  const x = (i: number) => padLeft + i * stepX;
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  function pathFor(values: number[]): string {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = (event.target as SVGRectElement).getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const ratio = months.length > 1 ? relX / rect.width : 0;
    const index = Math.round(ratio * (months.length - 1));
    setHoverIndex(Math.max(0, Math.min(months.length - 1, index)));
  }

  const activeIndex = hoverIndex ?? months.length - 1;

  return (
    <div className="linechart">
      {series.length >= 2 ? (
        <div className="linechart-legend">
          {series.map((s) => (
            <span className="linechart-legend-item" key={s.key}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={series.map((s) => s.label).join(", ")}
        className="linechart-svg"
      >
        {gridLines.map((g) => (
          <line
            key={g}
            x1={padLeft}
            x2={width - padRight}
            y1={padTop + innerH * (1 - g)}
            y2={padTop + innerH * (1 - g)}
            className="linechart-grid"
          />
        ))}
        {series.map((s) => (
          <path key={s.key} d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {series.map((s) =>
          s.values.map((v, i) =>
            i === activeIndex ? (
              <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="var(--white)" strokeWidth={2} />
            ) : null,
          ),
        )}
        {hoverIndex !== null ? (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={padTop}
            y2={padTop + innerH}
            className="linechart-crosshair"
          />
        ) : null}
        {months.map((m, i) => (
          <text key={m} x={x(i)} y={height - 8} textAnchor="middle" className="linechart-axis-label">
            {monthLabel(m)}
          </text>
        ))}
        <rect
          x={padLeft}
          y={padTop}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>
      {hoverIndex !== null ? (
        <div
          className="linechart-tooltip"
          style={{
            left: `${(x(hoverIndex) / width) * 100}%`,
          }}
        >
          <p className="linechart-tooltip-month">{monthLabel(months[hoverIndex])}</p>
          {series.map((s) => (
            <p key={s.key} className="linechart-tooltip-row">
              <i style={{ background: s.color }} />
              <b>{formatValue(s.values[hoverIndex])}</b>
              <span>{s.label}</span>
            </p>
          ))}
        </div>
      ) : (
        <div className="linechart-endlabels">
          {series.map((s) => (
            <span key={s.key} className="linechart-endlabel">
              {s.label}: <b>{formatValue(s.values[s.values.length - 1])}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
