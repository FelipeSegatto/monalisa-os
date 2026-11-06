import { Inject, Injectable } from "@nestjs/common";
import { ExpenseQueries, ExpenseRepository } from "./expense.ports";
@Injectable()
export class ExpenseService {
  constructor(
    @Inject(ExpenseQueries) private readonly queries: ExpenseQueries,
    @Inject(ExpenseRepository) private readonly repo: ExpenseRepository,
  ) {}
  list(...a: Parameters<ExpenseQueries["list"]>) {
    return this.queries.list(...a);
  }
  records(...a: Parameters<ExpenseQueries["records"]>) {
    return this.queries.records(...a);
  }
  detail(...a: Parameters<ExpenseQueries["detail"]>) {
    return this.queries.detail(...a);
  }
  performance(...a: Parameters<ExpenseQueries["performance"]>) {
    return this.queries.performance(...a);
  }
  series(...a: Parameters<ExpenseQueries["series"]>) {
    return this.queries.series(...a);
  }
  create(...a: Parameters<ExpenseRepository["create"]>) {
    return this.repo.create(...a);
  }
  revise(...a: Parameters<ExpenseRepository["revise"]>) {
    return this.repo.revise(...a);
  }
  pay(...a: Parameters<ExpenseRepository["pay"]>) {
    return this.repo.pay(...a);
  }
  reversePayment(...a: Parameters<ExpenseRepository["reversePayment"]>) {
    return this.repo.reversePayment(...a);
  }
  cancel(...a: Parameters<ExpenseRepository["cancel"]>) {
    return this.repo.cancel(...a);
  }
}
