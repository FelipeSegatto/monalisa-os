import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAgenda } from "./hooks/useAgenda";
import { useAgendaWeek } from "./hooks/useAgendaWeek";
import { useAgendaMonth } from "./hooks/useAgendaMonth";
import { useAgendaBlocks } from "./hooks/useAgendaBlocks";
import { NewAppointmentPanel } from "./NewAppointmentPanel";
import { NewAgendaBlockPanel } from "./NewAgendaBlockPanel";
import { appointmentStatusInfo, isMutedStatus } from "../../lib/appointmentStatus";
import { deleteAgendaBlock, setAppointmentStatus, type CurrentUser } from "../../lib/api";
import "../../styles/appointment-list.css";
import "./AgendaPage.css";

type View = "Dia" | "Semana" | "Mês";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function addMonthsToKey(key: string, months: number): string {
  const date = fromDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

function formatLongDate(key: string): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fromDateKey(key));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatMonthTitle(key: string): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    fromDateKey(key),
  );
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function weekDayLabel(dateKey: string): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(
    fromDateKey(dateKey),
  );
  return formatted.charAt(0).toUpperCase() + formatted.slice(1, 3);
}

const MONTH_WEEKDAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AgendaPage() {
  const user = useOutletContext<CurrentUser | null>();
  const [view, setView] = useState<View>("Dia");
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [professionalId, setProfessionalId] = useState<number | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNewBlock, setShowNewBlock] = useState(false);
  const { data, loading, error, reload } = useAgenda(dateKey);
  const blocks = useAgendaBlocks(dateKey);
  const week = useAgendaWeek(dateKey, view === "Semana");
  const month = useAgendaMonth(dateKey, view === "Mês");

  const appointments = useMemo(() => {
    if (!data) return [];
    return data.appointments.filter(
      (a) => professionalId === null || a.professionalId === professionalId,
    );
  }, [data, professionalId]);

  const dayBlocks = useMemo(() => {
    if (!blocks.data) return [];
    return blocks.data.blocks.filter(
      (b) => professionalId === null || b.professionalId === professionalId,
    );
  }, [blocks.data, professionalId]);

  function canRemoveBlock(block: { professionalId: number }): boolean {
    if (user?.role === "ADMIN") return true;
    return user?.role === "FUNCIONARIO" && user.professionalId === block.professionalId;
  }

  async function handleRemoveBlock(id: number) {
    try {
      await deleteAgendaBlock(id);
      blocks.reload();
    } catch {
      // backend ja valida permissao; falha silenciosa aqui so impede o reload da lista.
    }
  }

  async function handleConfirmAppointment(id: number) {
    try {
      await setAppointmentStatus(id, "CONFIRMED");
      reload();
    } catch {
      // backend ja valida permissao; falha silenciosa aqui so impede o reload da lista.
    }
  }

  const maxWeekCount = Math.max(1, ...(week.data?.days.map((d) => d.count) ?? [1]));

  const monthWeeks = useMemo(() => {
    if (!month.data) return [];
    const cells: (typeof month.data.days)[number][] = [
      ...Array.from({ length: month.data.monthStartWeekday }).map(() => null as never),
      ...month.data.days,
    ];
    while (cells.length % 7 !== 0) cells.push(null as never);
    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [month.data]);

  function goToDay(key: string) {
    setDateKey(key);
    setView("Dia");
  }

  function navigate(direction: 1 | -1) {
    if (view === "Dia") setDateKey((key) => addDaysToKey(key, direction));
    else if (view === "Semana") setDateKey((key) => addDaysToKey(key, direction * 7));
    else setDateKey((key) => addMonthsToKey(key, direction));
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Operação</p>
          <h1 className="page-header-title">
            {view === "Dia"
              ? formatLongDate(dateKey)
              : view === "Mês"
                ? formatMonthTitle(dateKey)
                : "Agenda"}
          </h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowNewBlock(true)}
          >
            Marcar indisponibilidade
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            onClick={() => setShowNewAppointment(true)}
          >
            Novo agendamento
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="segmented">
          {(["Dia", "Semana", "Mês"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? "segmented-item is-active" : "segmented-item"}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="agenda-date-nav">
          <button type="button" className="agenda-date-nav-button" onClick={() => navigate(-1)}>
            ← Anterior
          </button>
          <button
            type="button"
            className="agenda-date-nav-button"
            onClick={() => setDateKey(toDateKey(new Date()))}
          >
            Hoje
          </button>
          <button type="button" className="agenda-date-nav-button" onClick={() => navigate(1)}>
            Seguinte →
          </button>
        </div>
      </div>

      <section>
        {view === "Dia" ? (
          <>
            <div className="section-header">
              <span className="section-label">Filtrar por profissional</span>
              {data ? (
                <div className="agenda-filters">
                  <button
                    type="button"
                    className={professionalId === null ? "agenda-filter is-active" : "agenda-filter"}
                    onClick={() => setProfessionalId(null)}
                  >
                    Todos
                  </button>
                  {data.professionals.map((professional) => (
                    <button
                      key={professional.id}
                      type="button"
                      className={
                        professionalId === professional.id
                          ? "agenda-filter is-active"
                          : "agenda-filter"
                      }
                      onClick={() => setProfessionalId(professional.id)}
                    >
                      <span
                        className="professional-mark"
                        style={{ background: professional.color }}
                      />
                      {professional.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {loading ? <p className="page-status">Carregando…</p> : null}
            {error ? <p className="page-status">Não foi possível carregar a agenda.</p> : null}

            {data && !loading ? (
              <div className="agenda-list">
                {appointments.length === 0 && dayBlocks.length === 0 ? (
                  <p className="agenda-empty">Nenhum agendamento neste dia.</p>
                ) : (
                  [
                    ...appointments.map((appointment) => ({
                      kind: "appointment" as const,
                      startsAt: appointment.startsAt,
                      appointment,
                    })),
                    ...dayBlocks.map((block) => ({
                      kind: "block" as const,
                      startsAt: block.startsAt,
                      block,
                    })),
                  ]
                    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                    .map((item) => {
                      if (item.kind === "block") {
                        const { block } = item;
                        return (
                          <div className="agenda-row is-block" key={`block-${block.id}`}>
                            <span className="agenda-time">{formatTime(block.startsAt)}</span>
                            <div className="agenda-main">
                              <p className="agenda-customer">Indisponível</p>
                              <p className="agenda-procedure">
                                {block.reason ?? "Horário bloqueado"}
                              </p>
                            </div>
                            <div className="agenda-side">
                              <span className="agenda-professional">
                                <span
                                  className="professional-mark"
                                  style={{ background: block.professionalColor }}
                                />
                                {block.professionalName}
                              </span>
                              {canRemoveBlock(block) ? (
                                <button
                                  type="button"
                                  className="agenda-block-remove"
                                  onClick={() => handleRemoveBlock(block.id)}
                                >
                                  Remover
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      }

                      const { appointment } = item;
                      const status = appointmentStatusInfo(appointment.status);
                      const rowClassName = isMutedStatus(appointment.status)
                        ? "agenda-row is-muted"
                        : "agenda-row";

                      return (
                        <div className={rowClassName} key={appointment.id}>
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
                            {appointment.status === "SCHEDULED" ? (
                              <button
                                type="button"
                                className="agenda-block-remove"
                                onClick={() => handleConfirmAppointment(appointment.id)}
                              >
                                Confirmar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            ) : null}

            {data ? (
              <div className="agenda-footer">
                <span className="agenda-footer-count">{appointments.length} atendimentos</span>
              </div>
            ) : null}
          </>
        ) : view === "Semana" ? (
          <>
            <div className="section-header">
              <span className="section-label">
                Semana de {week.data ? formatLongDate(week.data.weekStart) : "…"}
              </span>
            </div>
            {week.loading ? <p className="page-status">Carregando…</p> : null}
            {week.error ? <p className="page-status">Não foi possível carregar a semana.</p> : null}
            {week.data ? (
              <div className="week-grid">
                {week.data.days.map((day) => (
                  <button
                    type="button"
                    className="week-grid-cell"
                    key={day.date}
                    onClick={() => goToDay(day.date)}
                  >
                    <div className="week-grid-text">
                      <b>{weekDayLabel(day.date)}</b>
                      <strong className="display">{day.count}</strong>
                      <span className="section-meta">
                        {day.count === 1 ? "atendimento" : "atendimentos"}
                      </span>
                    </div>
                    <i
                      className="week-bar"
                      style={{ height: `${Math.max(6, (day.count / maxWeekCount) * 100)}%` }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="section-header">
              <span className="section-label">{month.data ? formatMonthTitle(dateKey) : "…"}</span>
            </div>
            {month.loading ? <p className="page-status">Carregando…</p> : null}
            {month.error ? <p className="page-status">Não foi possível carregar o mês.</p> : null}
            {month.data ? (
              <div className="month-calendar">
                <div className="month-calendar-header">
                  {MONTH_WEEKDAY_HEADERS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                {monthWeeks.map((week, weekIndex) => (
                  <div className="month-calendar-row" key={weekIndex}>
                    {week.map((day, dayIndex) =>
                      day ? (
                        <button
                          type="button"
                          key={day.date}
                          className={
                            day.date === toDateKey(new Date())
                              ? "month-calendar-cell is-today"
                              : "month-calendar-cell"
                          }
                          onClick={() => goToDay(day.date)}
                        >
                          <span className="month-calendar-day">{Number(day.date.slice(8, 10))}</span>
                          {day.count > 0 ? (
                            <span className="month-calendar-count">{day.count}</span>
                          ) : null}
                        </button>
                      ) : (
                        <span key={dayIndex} className="month-calendar-cell is-empty" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {showNewAppointment ? (
        <NewAppointmentPanel
          defaultDateKey={dateKey}
          close={() => setShowNewAppointment(false)}
          onCreated={() => {
            setShowNewAppointment(false);
            setView("Dia");
            reload();
          }}
        />
      ) : null}

      {showNewBlock ? (
        <NewAgendaBlockPanel
          defaultDateKey={dateKey}
          currentUser={user}
          close={() => setShowNewBlock(false)}
          onCreated={() => {
            setShowNewBlock(false);
            setView("Dia");
            blocks.reload();
          }}
        />
      ) : null}
    </div>
  );
}
