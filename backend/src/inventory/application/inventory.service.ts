import { Inject, Injectable } from "@nestjs/common";
import { InventoryRepository, StockPosting } from "./inventory.repository";
@Injectable()
export class InventoryService {
  constructor(
    @Inject(InventoryRepository) private readonly repo: InventoryRepository,
  ) {}
  post(id: number, input: StockPosting) {
    return this.repo.post(id, input);
  }
  reverse(id: number, reason: string, key: string, actorId: number) {
    return this.repo.reverse(id, reason, key, actorId);
  }
}
