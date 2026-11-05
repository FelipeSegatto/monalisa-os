import { ApplicationError } from "../../shared/domain/application-error";
export class ProcedureQualifications {
  readonly procedureIds: readonly number[];
  constructor(ids: readonly number[]) {
    if (
      ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
      new Set(ids).size !== ids.length
    )
      throw new ApplicationError(
        "Habilitações inválidas ou repetidas",
        "INVALID_INPUT",
      );
    this.procedureIds = Object.freeze([...ids]);
  }
  assertQualified(procedureId: number) {
    if (!this.procedureIds.includes(procedureId))
      throw new ApplicationError(
        "Profissional não habilitado para este procedimento",
        "CONFLICT",
      );
  }
}
