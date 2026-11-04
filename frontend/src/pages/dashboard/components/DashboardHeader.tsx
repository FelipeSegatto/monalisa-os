import { useState } from "react";
import type { CurrentUser } from "../../../lib/api";

function formatLongDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

interface Props {
  onNewAppointment: () => void;
  user: CurrentUser | null;
}

export function DashboardHeader({ onNewAppointment, user }: Props) {
  const [now] = useState(() => new Date());

  return (
    <header className="page-header">
      <div>
        <p className="page-header-eyebrow">{formatLongDate(now)}</p>
        <h1 className="page-header-title">
          {greetingForHour(now.getHours())}
          {user ? `, ${user.firstName}` : ""}.
        </h1>
      </div>
      <button
        type="button"
        className="primary-button primary-button-link"
        onClick={onNewAppointment}
      >
        Novo agendamento
      </button>
    </header>
  );
}
