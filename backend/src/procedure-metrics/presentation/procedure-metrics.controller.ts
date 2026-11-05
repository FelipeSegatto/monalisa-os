import { Controller, Get, Inject, Query } from "@nestjs/common";
import { z } from "zod";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, dateKey } from "../../common/util";
import { ProcedureMetricsQueries } from "../application/procedure-metrics.queries";
@Controller("api/v1/procedure-metrics")
export class ProcedureMetricsController {
  constructor(
    @Inject(ProcedureMetricsQueries)
    private readonly queries: ProcedureMetricsQueries,
  ) {}
  @Admin() @Get() monthly(@Query("month") month?: string) {
    const m = parse(
      z.string().regex(/^20\d\d-(0[1-9]|1[0-2])$/),
      month ?? dateKey(new Date()).slice(0, 7),
    );
    return this.queries.monthly(m);
  }
}
