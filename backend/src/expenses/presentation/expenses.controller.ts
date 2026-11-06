import { expenseListInput } from "./expense.schemas";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, requiredId, dateKey } from "../../common/util";
import { ExpenseService } from "../application/expense.service";
import {
  expenseCancellationInput,
  expensePaymentInput,
  expenseReversalInput,
  expenseRevisionInput,
} from "./expense.schemas";
@Controller("api/v1/finance")
export class ExpensesController {
  constructor(
    @Inject(ExpenseService) private readonly service: ExpenseService,
  ) {}
  @Admin() @Get("expenses") list(@Query() query: unknown, @Req() req: any) {
    return this.service.list(parse(expenseListInput, query), req.actor);
  }
  @Admin() @Get("expense-records") records(@Req() req: any) {
    return this.service.records(req.actor);
  }
  @Admin() @Get("expense-performance") performance(
    @Query("month") month: string | undefined,
    @Req() req: any,
  ) {
    return this.service.performance(
      month ?? dateKey(new Date()).slice(0, 7),
      req.actor,
    );
  }
  @Admin() @Get("expense-series") series(
    @Query("months") months: string | undefined,
    @Req() req: any,
  ) {
    return this.service.series(Number(months) || 6, req.actor);
  }
  @Admin() @Get("expenses/:id") detail(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.service.detail(requiredId(id), req.actor);
  }
  @Admin() @Post("expenses") create(@Body() body: unknown, @Req() req: any) {
    return this.service.create(parse(expenseRevisionInput, body), req.actor);
  }
  @Admin() @Post("expenses/:id/revisions") revise(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    return this.service.revise(
      requiredId(id),
      parse(expenseRevisionInput, body),
      req.actor,
    );
  }
  @Admin() @Post("expenses/:id/pay") pay(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    return this.service.pay(
      requiredId(id),
      parse(expensePaymentInput, body),
      req.actor,
    );
  }
  @Admin() @Post("expenses/:id/payments/:paymentId/reversal") reversePayment(
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(expenseReversalInput, body);
    return this.service.reversePayment(
      requiredId(id),
      requiredId(paymentId),
      p.reason,
      p.requestKey,
      req.actor,
    );
  }
  @Admin() @Post("expenses/:id/cancellation") cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(expenseCancellationInput, body);
    return this.service.cancel(requiredId(id), p.reason, req.actor);
  }
}
