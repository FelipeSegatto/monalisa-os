import { ApplicationError } from "../../shared/domain/application-error";
import { ExecutionInput } from "./attendance";
interface ProcedureContext {
  id: number;
  name: string;
  active: boolean;
  requiresEquipment: boolean;
  technology: string;
  equipmentReviewedAt: Date | null;
}
interface ExecutionContext {
  procedure: ProcedureContext;
  variation: {
    id: number;
    procedureId: number;
    name: string;
    active: boolean;
  } | null;
  equipment: {
    id: number;
    status: string;
    shotTracking: string;
    compatible: boolean;
  } | null;
  expectedMaterialIds: number[];
  materials: { id: number; name: string; active: boolean }[];
}
/** Immutable record of what was performed; technical rules do not depend on catalog names. */
export class ProcedureExecution {
  private constructor(
    private readonly data: ExecutionInput,
    private readonly context: ExecutionContext,
  ) {}
  static record(input: ExecutionInput, context: ExecutionContext) {
    const fail = (message: string) => {
      throw new ApplicationError(message, "CONFLICT");
    };
    const { procedure: p, variation: v, equipment: eq } = context;
    if (!p.active) fail("Procedimento inativo");
    if (v && (!v.active || v.procedureId !== p.id))
      fail("Opção não pertence ao procedimento ou está inativa");
    if (p.requiresEquipment && !eq) fail("Equipamento obrigatório");
    if (eq) {
      if (eq.status !== "ACTIVE" || !eq.compatible || !p.equipmentReviewedAt)
        fail("Equipamento incompatível, indisponível ou não revisado");
      if (p.technology === "HIFU" && eq.shotTracking !== "COMPONENT")
        fail("HIFU exige contagem por cartucho");
      if (p.technology !== "GENERAL" && eq.shotTracking === "NONE")
        fail("Procedimento exige controle de disparos");
      if (eq.shotTracking !== "NONE" && !input.shots.length)
        fail("Informe os disparos utilizados");
      if (eq.shotTracking === "NONE" && input.shots.length)
        fail("Equipamento não controla disparos");
      if (
        input.shots.some(
          (s) => (eq.shotTracking === "COMPONENT") !== Boolean(s.componentId),
        )
      )
        fail("Informe o contador correto do equipamento");
    } else if (input.shots.length) fail("Disparos exigem equipamento");
    if (
      context.expectedMaterialIds.some(
        (id) => !input.materials.some((m) => m.stockItemId === id),
      )
    )
      fail(
        "Confirme o uso de todos os materiais previstos: usado, pouca quantidade ou não usado",
      );
    if (
      new Set(input.materials.map((m) => m.stockItemId)).size !==
      input.materials.length
    )
      fail("Material repetido");
    for (const m of input.materials) {
      const item = context.materials.find((i) => i.id === m.stockItemId);
      if (
        !item ||
        !["USED", "SMALL", "NOT_USED"].includes(m.usage) ||
        (!item.active && m.usage !== "NOT_USED")
      )
        fail("Material não encontrado, inativo ou resposta inválida");
    }
    return new ProcedureExecution(
      structuredClone(input),
      structuredClone(context),
    );
  }
  snapshot() {
    const { procedure: p, variation: v, equipment: eq } = this.context;
    return {
      procedureId: p.id,
      variationId: v?.id,
      professionalId: this.data.professionalId,
      equipmentId: eq?.id,
      procedureName: p.name,
      variationName: v?.name,
      technology: p.technology as
        "GENERAL" | "HIFU" | "LASER_HAIR_REMOVAL" | "TATTOO_REMOVAL",
      materials: this.data.materials.map((m) => ({
        stockItemId: m.stockItemId,
        materialName: this.context.materials.find(
          (i) => i.id === m.stockItemId,
        )!.name,
        usage: m.usage,
      })),
    };
  }
}
