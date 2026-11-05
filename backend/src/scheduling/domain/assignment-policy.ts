import { ApplicationError } from "../../shared/domain/application-error";
export interface AssignmentCandidate {
  id: number;
  priority: number | null;
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
export class ManualAssignmentPolicy implements ProfessionalAssignmentPolicy {
  order(): number[] {
    return [];
  }
}
export function assignmentPolicy(name: string): ProfessionalAssignmentPolicy {
  if (name === "PRIORITY") return new PriorityAssignmentPolicy();
  if (name === "MANUAL") return new ManualAssignmentPolicy();
  throw new ApplicationError(
    "Política de atribuição desconhecida",
    "INVALID_INPUT",
  );
}
