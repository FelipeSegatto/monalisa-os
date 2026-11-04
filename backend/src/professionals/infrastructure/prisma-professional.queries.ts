import { Inject, Injectable } from "@nestjs/common";
import { Professional as ProfessionalRow } from "@prisma/client";
import { ApplicationError } from "../../shared/domain/application-error";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ProfessionalQueries } from "../application/professional.queries";
@Injectable()
export class PrismaProfessionalQueries extends ProfessionalQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  private async view(row: ProfessionalRow, now: Date) {
    const month = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const [upcomingAppointments, appointmentsThisMonth] = await Promise.all([
      this.db.appointment.count({
        where: {
          professionalId: row.id,
          startsAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      }),
      this.db.appointment.count({
        where: { professionalId: row.id, startsAt: { gte: month } },
      }),
    ]);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      color: row.color,
      active: row.active,
      upcomingAppointments,
      appointmentsThisMonth,
    };
  }
  async list() {
    const rows = await this.db.professional.findMany({
      orderBy: { name: "asc" },
    });
    const now = new Date();
    return {
      professionals: await Promise.all(rows.map((row) => this.view(row, now))),
    };
  }
  async detail(id: number) {
    const row = await this.db.professional.findUnique({ where: { id } });
    if (!row)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    return this.view(row, new Date());
  }
}
