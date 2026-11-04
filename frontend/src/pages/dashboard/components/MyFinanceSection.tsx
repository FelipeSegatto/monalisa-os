import { Link } from "react-router-dom";
import type { DashboardOverview } from "../../../lib/api";
import { formatPrice } from "../../../lib/format";
import "./PeriodPerformanceSection.css";

interface Props {
  overview: DashboardOverview;
}

function formatMonthLabel(month: string): { title: string; range: string } {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    title,
    range: `1 a ${lastDay} de ${monthName} · dados registrados no sistema`,
  };
}

export function MyFinanceSection({ overview }: Props) {
  const { period, myFinance } = overview;
  const { title, range } = formatMonthLabel(period.month);
  const weekSales = myFinance?.weekSales ?? 0;
  const monthSales = myFinance?.monthSales ?? 0;

  return (
    <>
      <div className="management-intro">
        <p className="section-label">Minhas vendas</p>
        <h2 className="management-title">Como estão suas vendas?</h2>
        <p className="period-range management-period">
          {title} <span>{range}</span>
        </p>
      </div>

      <section className="management-section">
        <div className="section-header">
          <span className="section-label">Financeiro</span>
          <Link to="/financeiro" className="section-link">
            Ver minhas vendas →
          </Link>
        </div>
        <div className="finance-editorial">
          <div className="finance-editorial-primary">
            <span className="section-meta">Vendas este mês</span>
            <strong className="display">{formatPrice(monthSales)}</strong>
            <span className="section-meta">Total das vendas que você registrou</span>
          </div>
          <div className="finance-editorial-values">
            <div>
              <span className="section-meta">Esta semana</span>
              <b>{formatPrice(weekSales)}</b>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
