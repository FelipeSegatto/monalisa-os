import { Controller, Get, Inject, Query } from "@nestjs/common";
import { Admin } from "../../auth/presentation/auth.decorators";
import { OccupancyQueries } from "../application/occupancy.queries";
@Controller("api/v1/dashboard")
export class OccupancyController {
  constructor(
    @Inject(OccupancyQueries) private readonly queries: OccupancyQueries,
  ) {}
  @Admin() @Get("occupancy") series(@Query("months") months: string | undefined) {
    return this.queries.series(Number(months) || 6);
  }
}
