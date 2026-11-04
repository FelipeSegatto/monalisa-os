export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type EquipmentEventType =
  | "CREATED"
  | "UPDATED"
  | "COMPONENT_CREATED"
  | "COMPONENT_UPDATED"
  | "STATUS_CHANGED"
  | "MAINTENANCE_SCHEDULED"
  | "MAINTENANCE_COMPLETED"
  | "PROCEDURE_COMPATIBILITY";
/** Domain fact; actor and persistence timestamp are attached by the repository. */
export class EquipmentEvent {
  private readonly data: Record<string, JsonValue>;
  constructor(
    readonly type: EquipmentEventType,
    details: object,
    readonly reason: string | null = null,
    readonly componentCode: string | null = null,
    readonly occurredOn: string | null = null,
  ) {
    this.data = JSON.parse(JSON.stringify(details));
    Object.freeze(this);
  }
  get details(): Record<string, JsonValue> {
    return structuredClone(this.data);
  }
}
