import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardOverview } from "../../../lib/api";
import { appointmentStatusInfo, isMutedStatus } from "../../../lib/appointmentStatus";
import "../../../styles/appointment-list.css";

interface Props {
  overview: DashboardOverview;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaSection({ overview }: Props) {
  const [professionalId, setProfessionalId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);

  const [now] = useState(() => new Date());

  const appointments = useMemo(() => {
    return overview.appointments
      .filter((a) => professionalId === null || a.professionalId === professionalId)
      .filter((a) => !hideCompleted || a.status !== "COMPLETED");
  }, [overview.appointments, professionalId, hideCompleted]);

  const nowMarkerIndex = (() => {
    const index = appointments.findIndex((a) => a.status !== "COMPLETED" && a.status !== "NO_SHOW");
    return index === -1 ? appointments.length : index;
  })();

  return (
    <section>
      <div className="section-header">
        <span className="section-label">Agenda de hoje</span>
        <div className="agenda-filters">
          <button
            type="button"
            className={professionalId === null ? "agenda-filter is-active" : "agenda-filter"}
            onClick={() => setProfessionalId(null)}
          >
            Todos
          </button>
          {overview.professionals.map((professional) => (
            <button
              key={professional.id}
              type="button"
              className={
                professionalId === professional.id ? "agenda-filter is-active" : "agenda-filter"
              }
              onClick={() => setProfessionalId(professional.id)}
            >
              <span className="professional-mark" style={{ background: professional.color }} />
              {professional.name}
            </button>
          ))}
        </div>
      </div>

      <label className="agenda-toggle">
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={(event) => setHideCompleted(event.target.checked)}
        />
        Ocultar atendimentos realizados
      </label>

      <div className="agenda-list">
        {appointments.map((appointment, index) => {
          const status = appointmentStatusInfo(appointment.status);
          const rowClassName = isMutedStatus(appointment.status)
            ? "agenda-row is-muted"
            : "agenda-row";

          return (
            <div key={appointment.id}>
              {index === nowMarkerIndex ? (
                <div className="agenda-now-marker">
                  <span className="agenda-now-time">
                    {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ) : null}

              <div className={rowClassName}>
                <span className="agenda-time">{formatTime(appointment.startsAt)}</span>
                <div className="agenda-main">
                  <p className="agenda-customer">{appointment.customerName}</p>
                  <p className="agenda-procedure">{appointment.procedureName}</p>
                </div>
                <div className="agenda-side">
                  <span className="agenda-status">
                    <span className={`status-dot ${status.dotClass}`} />
                    {status.label}
                  </span>
                  <span className="agenda-professional">
                    <span
                      className="professional-mark"
                      style={{ background: appointment.professionalColor }}
                    />
                    {appointment.professionalName}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {nowMarkerIndex === appointments.length ? (
          <div className="agenda-now-marker">
            <span className="agenda-now-time">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ) : null}
      </div>

      <div className="agenda-footer">
        <span className="agenda-footer-count">{appointments.length} atendimentos</span>
        <Link to="/agenda" className="section-link">
          Abrir agenda completa
        </Link>
      </div>
    </section>
  );
}
