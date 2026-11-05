import { Inject, Injectable } from "@nestjs/common";
import { ShotLedgerRepository, ShotPosting } from "./shot-ledger.repository";
@Injectable()
export class ShotLedgerService {
  constructor(
    @Inject(ShotLedgerRepository) private readonly repo: ShotLedgerRepository,
  ) {}
  correct(
    id: number,
    quantity: number,
    reason: string,
    key: string,
    actorId: number,
  ) {
    return this.repo.correct(id, quantity, reason, key, actorId);
  }
  post(input: ShotPosting) {
    return this.repo.post(input);
  }
  reverse(id: number, reason: string, key: string, actorId: number) {
    return this.repo.reverse(id, reason, key, actorId);
  }
  counters(id: number) {
    return this.repo.counters(id);
  }
  entries(id: number, cursor?: number) {
    return this.repo.entries(id, cursor);
  }
}
