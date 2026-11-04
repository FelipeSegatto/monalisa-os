import type { FinanceEvolutionPoint } from "../../lib/api";
import { formatPrice } from "../../lib/format";

interface Props {
  points: FinanceEvolutionPoint[];
}

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function monthLabel(key: string): string {
  const [, month] = key.split("-").map(Number);
  return MONTH_LABELS[month - 1];
}

function buildPath(values: number[], max: number, width: number, height: number): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = max > 0 ? height - (value / max) * height : height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function FinanceChart({ points }: Props) {
  const width = 640;
  const height = 150;
  const max = Math.max(1, ...points.flatMap((p) => [p.sales, p.received, p.expenses]));

  const salesPath = buildPath(
    points.map((p) => p.sales),
    max,
    width,
    height,
  );
  const receivedPath = buildPath(
    points.map((p) => p.received),
    max,
    width,
    height,
  );
  const expensesPath = buildPath(
    points.map((p) => p.expenses),
    max,
    width,
    height,
  );

  const totalSales = points.reduce((sum, p) => sum + p.sales, 0);

  return (
    <div className="finance-chart">
      <div className="chart-label">
        <span>Receita</span>
        <span>{formatPrice(totalSales)}</span>
      </div>
      <div className="chart-legend">
        <span>
          <i className="chart-legend-dot chart-legend-sales" />
          Vendas
        </span>
        <span>
          <i className="chart-legend-dot chart-legend-received" />
          Recebimentos
        </span>
        <span>
          <i className="chart-legend-dot chart-legend-expenses" />
          Despesas
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Evolução de vendas, recebimentos e despesas"
        preserveAspectRatio="none"
      >
        <path className="chart-line chart-line-sales" d={salesPath} />
        <path className="chart-line chart-line-received" d={receivedPath} />
        <path className="chart-line chart-line-expenses" d={expensesPath} />
      </svg>
      <div className="chart-months">
        {points.map((p) => (
          <span key={p.month}>{monthLabel(p.month)}</span>
        ))}
      </div>
    </div>
  );
}
