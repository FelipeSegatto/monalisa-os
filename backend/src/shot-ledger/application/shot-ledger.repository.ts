export interface ShotPosting {
  equipmentId: number;
  componentId: number | null;
  executionId?: number;
  quantityDelta: number;
  type: "CONSUMPTION" | "OPENING" | "ADJUSTMENT" | "REVERSAL";
  actorId: number;
  reason?: string;
  requestKey: string;
  reversesId?: number;
  replacesId?: number;
}
export abstract class ShotLedgerRepository {
  abstract correct(
    id: number,
    quantity: number,
    reason: string,
    requestKey: string,
    actorId: number,
  ): Promise<unknown>;
  abstract post(input: ShotPosting): Promise<unknown>;
  abstract reverse(
    id: number,
    reason: string,
    requestKey: string,
    actorId: number,
  ): Promise<unknown>;
  abstract counters(equipmentId: number): Promise<unknown>;
  abstract entries(equipmentId: number, cursor?: number): Promise<unknown>;
}
