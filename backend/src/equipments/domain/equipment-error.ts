import { ApplicationError } from "../../shared/domain/application-error";
export class EquipmentError extends ApplicationError {
  constructor(
    message: string,
    readonly kind: "INVALID" | "CONFLICT" | "NOT_FOUND" = "INVALID",
  ) {
    super(message, kind === "INVALID" ? "INVALID_INPUT" : kind);
    this.name = "EquipmentError";
  }
}
