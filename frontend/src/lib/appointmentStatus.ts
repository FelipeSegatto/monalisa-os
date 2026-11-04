import type { AppointmentStatus } from "./api";

export function appointmentStatusInfo(
  status: AppointmentStatus,
): { dotClass: string; label: string } {
  switch (status) {
    case "COMPLETED":
      return { dotClass: "is-done", label: "Realizado" };
    case "CONFIRMED":
      return { dotClass: "is-ok", label: "Confirmado" };
    case "NO_SHOW":
      return { dotClass: "is-done", label: "Não compareceu" };
    case "CANCELLED":
      return { dotClass: "is-done", label: "Cancelado" };
    default:
      return { dotClass: "is-wait", label: "Aguardando confirmação" };
  }
}

/** Status cujas linhas ja aconteceram/nao vao mais acontecer - exibidas esmaecidas. */
export function isMutedStatus(status: AppointmentStatus): boolean {
  return status === "COMPLETED" || status === "NO_SHOW" || status === "CANCELLED";
}
