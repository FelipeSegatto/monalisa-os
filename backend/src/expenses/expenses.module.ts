import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { ExpenseService } from "./application/expense.service";
import { ExpenseQueries, ExpenseRepository } from "./application/expense.ports";
import { PrismaExpenseQueries } from "./infrastructure/prisma-expense.queries";
import { PrismaExpenseRepository } from "./infrastructure/prisma-expense.repository";
import { ExpensesController } from "./presentation/expenses.controller";
@Module({
  imports: [PrismaModule],
  controllers: [ExpensesController],
  providers: [
    ExpenseService,
    { provide: ExpenseQueries, useClass: PrismaExpenseQueries },
    { provide: ExpenseRepository, useClass: PrismaExpenseRepository },
  ],
  exports: [ExpenseService],
})
export class ExpensesModule {}
