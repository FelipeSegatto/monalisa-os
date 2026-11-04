import { useEffect, useState } from "react";
import type { Appointment, DashboardOverview } from "../../../lib/api";
import "./DayTimeline.css";

interface Props {
  overview: DashboardOverview;
}

// Horario de funcionamento ainda nao e configuravel (nao existe modulo de
// configuracao da clinica) - fallback fixo conforme a especificacao.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 19;
const TOTAL_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60;

function minutesSinceOpening(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - OPEN_HOUR * 60;
}

function percent(minutes: number): number {
  return Math.min(100, Math.max(0, (minutes / TOTAL_MINUTES) * 100));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function blockClassName(status: Appointment["status"]): string {
  if (status === "SCHEDULED") return "day-timeline-block is-awaiting";
  if (status === "COMPLETED" || status === "NO_SHOW") return "day-timeline-block is-done";
  return "day-timeline-block is-confirmed";
}

const AXIS_HOURS = [8, 10, 12, 14, 16, 18];

export function DayTimeline({ overview }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowPercent = percent(minutesSinceOpening(now));
  const showNowMarker = nowPercent > 0 && nowPercent < 100;

  if (overview.professionals.length === 0) {
    return null;
  }

  return (
    <div className="day-timeline">
      {overview.professionals.map((professional) => {
        const appointments = overview.appointments.filter(
          (appointment) => appointment.professionalId === professional.id,
        );

        return (
          <div className="day-timeline-row" key={professional.id}>
            <div className="day-timeline-professional">
              <span
                className="professional-mark"
                style={{ background: professional.color }}
              />
              <span>{professional.name}</span>
            </div>
            <div className="day-timeline-track">
              {appointments.map((appointment) => {
                const start = percent(minutesSinceOpening(new Date(appointment.startsAt)));
                const end = percent(minutesSinceOpening(new Date(appointment.endsAt)));
                return (
                  <div
                    key={appointment.id}
                    className={blockClassName(appointment.status)}
                    style={{ left: `${start}%`, width: `calc(${end - start}% - 3px)` }}
                    title={`${formatTime(appointment.startsAt)} · ${appointment.customerName} · ${appointment.procedureName}`}
                  />
                );
              })}
              {showNowMarker ? (
                <div className="day-timeline-now" style={{ left: `${nowPercent}%` }} />
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="day-timeline-axis">
        <div className="day-timeline-professional" aria-hidden="true" />
        <div className="day-timeline-axis-track">
          {AXIS_HOURS.map((hour) => (
            <span
              key={hour}
              className="day-timeline-axis-label"
              style={{ left: `${percent((hour - OPEN_HOUR) * 60)}%` }}
            >
              {String(hour).padStart(2, "0")}h
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
