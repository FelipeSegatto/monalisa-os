export interface StockPosting {
  type: "IN" | "ADJUSTMENT" | "CONSUMPTION";
  quantity: number;
  note: string;
  requestKey: string;
  actorId: number;
}
export abstract class InventoryRepository {
  abstract post(id: number, input: StockPosting): Promise<unknown>;
  abstract reverse(
    id: number,
    reason: string,
    requestKey: string,
    actorId: number,
  ): Promise<unknown>;
}
