import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import { ProcedureQueries } from "../application/procedure.queries";
import { ProcedureMapper } from "./procedure.mapper";
@Injectable()
export class PrismaProcedureQueries extends ProcedureQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async categories(publicOnly = false) {
    const rows = await this.db.procedureCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        procedures: {
          orderBy: { name: "asc" },
          include: { variations: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    const categories = rows.map((category) => ({
      id: category.id,
      name: category.name,
      procedures: category.procedures
        .filter((p) => !publicOnly || p.active)
        .map((p) => ProcedureMapper.toView({ ...p, category })),
    }));
    return {
      categories: publicOnly
        ? categories.filter((c) => c.procedures.length)
        : categories,
    };
  }
  async detail(id: number) {
    const row = await this.db.procedure.findUnique({
      where: { id },
      include: {
        category: true,
        variations: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!row)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    return ProcedureMapper.toView(row);
  }
  async materials(procedureId: number) {
    const rows = await this.db.procedureMaterial.findMany({
      where: { procedureId },
      include: { stockItem: true },
    });
    return {
      materials: rows.map((row) => ({
        stockItemId: row.stockItemId,
        itemName: row.stockItem.name,
        unit: row.stockItem.unit,
        quantity: String(row.quantity),
      })),
    };
  }
}
