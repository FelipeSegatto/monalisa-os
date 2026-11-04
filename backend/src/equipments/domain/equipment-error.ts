export class EquipmentError extends Error {
  constructor(
    message: string,
    readonly kind: "INVALID" | "CONFLICT" | "NOT_FOUND" = "INVALID",
  ) {
    super(message);
    this.name = "EquipmentError";
  }
}
