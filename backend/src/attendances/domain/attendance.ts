import { ApplicationError } from "../../shared/domain/application-error";
export interface ExecutionInput {
  entitlementId?: number | null;
  procedureId: number;
  variationId?: number | null;
  professionalId: number;
  equipmentId?: number | null;
  materials: { stockItemId: number; usage: "USED" | "SMALL" | "NOT_USED" }[];
  shots: { componentId?: number | null; quantity: number }[];
}
export class Attendance {
  constructor(
    readonly startedAt: Date,
    private status: string,
  ) {}
  cancel(reason: string): string {
    if (this.status !== "IN_PROGRESS")
      throw new ApplicationError(
        "Só é possível cancelar atendimento em andamento",
        "CONFLICT",
      );
    if (reason.trim().length < 3 || reason.trim().length > 1000)
      throw new ApplicationError(
        "Informe o motivo do cancelamento",
        "INVALID_INPUT",
      );
    this.status = "CANCELLED";
    return reason.trim();
  }
  complete(executions: readonly ExecutionInput[], completedAt: Date) {
    if (this.status !== "IN_PROGRESS")
      throw new ApplicationError("Atendimento já concluído", "CONFLICT");
    if (
      !Number.isFinite(+completedAt) ||
      completedAt < this.startedAt ||
      completedAt > new Date()
    )
      throw new ApplicationError(
        "Horário de conclusão inválido",
        "INVALID_INPUT",
      );
    if (!executions.length)
      throw new ApplicationError(
        "Informe ao menos uma execução",
        "INVALID_INPUT",
      );
    for (const e of executions) {
      if (
        new Set(e.materials.map((m) => m.stockItemId)).size !==
        e.materials.length
      )
        throw new ApplicationError("Material repetido", "INVALID_INPUT");
      if (
        new Set(e.shots.map((s) => s.componentId ?? null)).size !==
        e.shots.length
      )
        throw new ApplicationError(
          "Contador repetido na execução",
          "INVALID_INPUT",
        );
      if (
        e.shots.some(
          (s) =>
            !Number.isInteger(s.quantity) ||
            s.quantity <= 0 ||
            s.quantity > 2147483647,
        )
      )
        throw new ApplicationError("Disparos inválidos", "INVALID_INPUT");
    }
    this.status = "COMPLETED";
  }
}
