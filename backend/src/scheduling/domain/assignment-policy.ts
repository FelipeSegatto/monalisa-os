import { ApplicationError } from "../../shared/domain/application-error";
export interface AssignmentCandidate {
  id: number;
  priority: number | null;
  reservedMinutes?: number;
}
export interface ProfessionalAssignmentPolicy {
  order(candidates: readonly AssignmentCandidate[]): number[];
}
export class PriorityAssignmentPolicy implements ProfessionalAssignmentPolicy {
  order(candidates: readonly AssignmentCandidate[]): number[] {
    return candidates
      .filter((p) => p.priority !== null)
      .sort((a, b) => a.priority! - b.priority! || a.id - b.id)
      .map((p) => p.id);
  }
}
/** Workload first; ties rotate through stable professional IDs after the last automatic choice. */
export class BalancedAssignmentPolicy implements ProfessionalAssignmentPolicy {
  constructor(private readonly lastProfessionalId: number | null = null) {}
  order(candidates: readonly AssignmentCandidate[]): number[] {
    if (
      candidates.some(
        (p) =>
          p.reservedMinutes === undefined ||
          !Number.isFinite(p.reservedMinutes) ||
          p.reservedMinutes < 0,
      )
    )
      throw new ApplicationError("Carga de agenda inválida", "INVALID_INPUT");
    const rank = (id: number) =>
      this.lastProfessionalId === null || id > this.lastProfessionalId ? 0 : 1;
    return [...candidates]
      .sort(
        (a, b) =>
          a.reservedMinutes! - b.reservedMinutes! ||
          rank(a.id) - rank(b.id) ||
          a.id - b.id,
      )
      .map((p) => p.id);
  }
}
export class ManualAssignmentPolicy implements ProfessionalAssignmentPolicy {
  order(): number[] {
    return [];
  }
}
export function assignmentPolicy(
  name: string,
  lastProfessionalId: number | null = null,
): ProfessionalAssignmentPolicy {
  if (name === "PRIORITY") return new PriorityAssignmentPolicy();
  if (name === "BALANCED")
    return new BalancedAssignmentPolicy(lastProfessionalId);
  if (name === "MANUAL") return new ManualAssignmentPolicy();
  throw new ApplicationError(
    "Política de atribuição desconhecida",
    "INVALID_INPUT",
  );
}
