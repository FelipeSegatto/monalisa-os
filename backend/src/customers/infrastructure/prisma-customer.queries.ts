import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import {
  CustomerQueries,
  CustomerFilter,
} from "../application/customer.queries";
import { acquisitionLabels } from "../domain/customer";
import { BirthDate } from "../domain/birth-date";
type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: { procedure: true; professional: true };
}>;
@Injectable()
export class PrismaCustomerQueries extends CustomerQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  private profile(row: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    birthDate: Date | null;
    acquisitionSource: keyof typeof acquisitionLabels;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      birthDate: row.birthDate
        ? BirthDate.fromStorage(row.birthDate).toString()
        : null,
      acquisitionSource: row.acquisitionSource,
      acquisitionSourceLabel: acquisitionLabels[row.acquisitionSource],
      createdAt: row.createdAt.toISOString(),
    };
  }
  private appointment(row: AppointmentRow) {
    return {
      id: row.id,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      procedureName: row.procedure.name,
      professionalName: row.professional.name,
    };
  }
  async list(filter: CustomerFilter) {
    const rows = await this.db.customer.findMany({
      where: {
        name: { contains: filter.search || "" },
        ...(filter.source && filter.source !== "ALL"
          ? { acquisitionSource: filter.source }
          : {}),
      },
      orderBy: { name: "asc" },
      include: { appointments: { orderBy: { startsAt: "desc" }, take: 60 } },
    });
    const now = new Date();
    return {
      customers: rows.map((row) => ({
        ...this.profile(row),
        lastAppointmentAt:
          row.appointments
            .find((a) => a.startsAt < now)
            ?.startsAt.toISOString() ?? null,
        nextAppointmentAt:
          [...row.appointments]
            .reverse()
            .find((a) => a.startsAt >= now && a.status !== "CANCELLED")
            ?.startsAt.toISOString() ?? null,
      })),
    };
  }
  async detail(id: number) {
    const row = await this.db.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { procedure: true, professional: true },
          orderBy: { startsAt: "desc" },
        },
      },
    });
    if (!row)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    const now = new Date();
    return {
      ...this.profile(row),
      nextAppointment:
        row.appointments
          .filter((a) => a.startsAt >= now && a.status !== "CANCELLED")
          .sort((a, b) => +a.startsAt - +b.startsAt)
          .map((a) => this.appointment(a))[0] ?? null,
      history: row.appointments.map((a) => this.appointment(a)),
    };
  }
  async notes(customerId: number) {
    const rows = await this.db.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    return {
      notes: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
