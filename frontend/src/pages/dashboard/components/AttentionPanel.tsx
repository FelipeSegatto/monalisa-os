import { Link } from "react-router-dom";
import type { AttentionGroup, DashboardOverview } from "../../../lib/api";
import "./AttentionPanel.css";

interface Props {
  overview: DashboardOverview;
}

const TYPE_LABELS: Record<
  AttentionGroup["type"],
  { title: string; action: string; to: string }
> = {
  awaiting_confirmation: {
    title: "Agendamentos aguardando confirmação",
    action: "Confirmar →",
    to: "/agenda",
  },
  low_stock: {
    title: "Itens com estoque baixo",
    action: "Ver estoque →",
    to: "/estoque",
  },
  expired_stock: {
    title: "Conferir entradas com validade vencida",
    action: "Ver estoque →",
    to: "/estoque",
  },
  expiring_stock: {
    title: "Conferir próximas validades",
    action: "Ver estoque →",
    to: "/estoque",
  },
};

function describe(group: AttentionGroup): string {
  if (group.type === "low_stock") {
    return group.count === 1
      ? "1 item abaixo do mínimo"
      : `${group.count} itens abaixo do mínimo`;
  }
  if (group.type === "expired_stock") {
    return group.count === 1
      ? "1 insumo para conferir no estoque"
      : `${group.count} insumos para conferir no estoque`;
  }
  if (group.type === "expiring_stock") {
    return group.count === 1
      ? "1 insumo com entrada que vence em até 30 dias"
      : `${group.count} insumos com entradas que vencem em até 30 dias`;
  }

  const todayCount = group.items.filter((item) => item.isToday).length;
  const laterCount = group.count - todayCount;

  if (todayCount > 0 && laterCount > 0) {
    return `${todayCount} hoje, ${laterCount} nos próximos dias`;
  }
  if (todayCount > 0) {
    return todayCount === 1 ? "1 ainda hoje" : `${todayCount} ainda hoje`;
  }
  return "Nos próximos dias";
}

export function AttentionPanel({ overview }: Props) {
  const { attention } = overview;

  if (attention.length === 0) {
    return null;
  }

  const totalItems = attention.reduce((sum, group) => sum + group.count, 0);

  return (
    <section>
      <div className="section-header">
        <span className="section-label">Precisa de atenção</span>
        <span className="section-meta">
          {totalItems} {totalItems === 1 ? "item" : "itens"}
        </span>
      </div>

      <div className="attention-list">
        {attention.map((group) => {
          const labels = TYPE_LABELS[group.type];
          return (
            <div className="attention-row" key={group.type}>
              <p className="attention-count">{group.count}</p>
              <div className="attention-main">
                <p className="attention-title">
                  {group.severity === "wait" ? (
                    <span className="status-dot is-wait" />
                  ) : null}
                  {labels.title}
                  {group.severity === "urgent" ? (
                    <span className="attention-tag">
                      <span className="status-dot is-urgent" />
                      HOJE
                    </span>
                  ) : null}
                </p>
                <p className="attention-detail">{describe(group)}</p>
              </div>
              <Link to={labels.to} className="attention-action">
                {labels.action}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
