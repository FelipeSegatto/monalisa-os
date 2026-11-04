import type { DashboardOverview } from "../../../lib/api";
import { DayTimeline } from "./DayTimeline";
import "./TodaySection.css";

interface Props {
  overview: DashboardOverview;
}

export function TodaySection({ overview }: Props) {
  const { today } = overview;

  return (
    <section>
      <div className="section-header">
        <span className="section-label">Hoje</span>
        <span className="section-meta">Atualizado às {today.updatedAt}</span>
      </div>

      <div className="today-stats">
        <div className="today-stats-grid">
          <div className="today-stat">
            <p className="today-stat-value">{today.totalAppointments}</p>
            <p className="today-stat-label">Total de atendimentos</p>
            <p className="today-stat-detail">
              {today.completedAppointments} realizados, {today.upcomingAppointments} a seguir
            </p>
          </div>

          <div className="today-stat">
            <p className="today-stat-value">{today.nextAppointment?.time ?? "—"}</p>
            <p className="today-stat-label">Horário do próximo</p>
            <p className="today-stat-detail">
              {today.nextAppointment
                ? `${today.nextAppointment.customerName}, ${today.nextAppointment.procedureName} com ${today.nextAppointment.professionalName}`
                : "Nenhum atendimento restante hoje"}
            </p>
          </div>

          <div className="today-stat">
            <p className="today-stat-value">{today.awaitingConfirmation.count}</p>
            <p className="today-stat-label">
              <span className="status-dot is-wait" /> Aguardando confirmação
            </p>
            <p className="today-stat-detail">
              {today.awaitingConfirmation.times.length > 0
                ? today.awaitingConfirmation.times.join(", ")
                : "Nenhum"}
            </p>
          </div>
        </div>
      </div>

      <DayTimeline overview={overview} />
    </section>
  );
}
