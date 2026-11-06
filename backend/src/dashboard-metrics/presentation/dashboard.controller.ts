import { isExpiredReservation } from "../../scheduling/domain/reservation-hold";
import { Inject, Controller, Get, Req } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import {
  dateKey,
  dayRange,
  expenseLabels,
  iso,
  money,
} from "../../common/util";
import { nearestExpiry } from "../../inventory/domain/stock-expiry";
@Controller("api/v1")
export class DashboardController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Get("dashboard") async overview(@Req() req: any) {
    const now = new Date(),
      today = dateKey(now),
      day = dayRange(today);
    const month = today.slice(0, 7),
      monthStart = dayRange(month + "-01").start;
    const monthEnd = dayRange(
      new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1),
      )
        .toISOString()
        .slice(0, 10),
    ).start;
    const isAdmin = req.actor.role === "ADMIN",
      professionalId = req.actor.professionalId;
    const filter = !isAdmin && professionalId ? { professionalId } : {};
    const [
      profs,
      rawAppointments,
      customers,
      attended,
      stock,
      sales,
      expenses,
    ] = await Promise.all([
      this.db.professional.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      this.db.appointment.findMany({
        where: { startsAt: { gte: day.start, lt: day.end }, ...filter },
        include: { customer: true, professional: true, procedure: true },
        orderBy: { startsAt: "asc" },
      }),
      this.db.customer.findMany({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      this.db.appointment.findMany({
        where: {
          startsAt: { gte: monthStart, lt: monthEnd },
          status: "COMPLETED",
          ...filter,
        },
        select: { customerId: true },
      }),
      this.db.stockItem.findMany({
        where: { active: true },
        include: {
          movements: {
            where: { type: "IN", expiresAt: { not: null } },
            select: { expiresAt: true, reversal: { select: { id: true } } },
          },
        },
      }),
      this.db.sale.findMany({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
          cancelled: false,
        },
        include: {
          items: { include: { procedure: true } },
          payments: { include: { reversal: true } },
          professional: true,
        },
      }),
      this.db.expense.findMany({
        where: { dueDate: { gte: monthStart, lt: monthEnd }, cancelled: false },
      }),
    ]);
    const appointments = rawAppointments.filter(
      (a) => !isExpiredReservation(a.status, a.expiresAt, now),
    );
    const ap = appointments.map((a) => ({
      id: a.id,
      startsAt: iso(a.startsAt),
      endsAt: iso(a.endsAt),
      status: a.status,
      customerName: a.customer.name,
      procedureName: a.procedure.name,
      professionalId: a.professionalId,
      professionalName: a.professional.name,
      professionalColor: a.professional.color,
    }));
    const next = appointments.find(
      (a) =>
        a.startsAt > now &&
        a.status !== "CANCELLED" &&
        a.status !== "COMPLETED",
    );
    const pending = appointments.filter((a) => a.status === "SCHEDULED");
    const low = stock.filter(
      (s) => Number(s.quantity) <= Number(s.minQuantity),
    );
    const attention: any[] = [];
    if (pending.length)
      attention.push({
        type: "awaiting_confirmation",
        count: pending.length,
        severity: "wait",
        items: pending.slice(0, 5).map((a) => ({
          id: a.id,
          customerName: a.customer.name,
          procedureName: a.procedure.name,
          startsAt: iso(a.startsAt),
          isToday: true,
        })),
      });
    if (low.length && isAdmin)
      attention.push({
        type: "low_stock",
        count: low.length,
        severity: "urgent",
        items: low.slice(0, 5).map((s) => ({
          id: s.id,
          name: s.name,
          unit: s.unit,
          quantity: String(s.quantity),
          minQuantity: String(s.minQuantity),
        })),
      });
    const expired: {
      id: number;
      name: string;
      unit: string;
      expiresAt: string;
    }[] = [];
    const expiring: typeof expired = [];
    for (const s of stock) {
      if (Number(s.quantity) <= 0) continue;
      const expiry = nearestExpiry(s.movements, today);
      if (!expiry) continue;
      const row = {
        id: s.id,
        name: s.name,
        unit: s.unit,
        expiresAt: expiry.date,
      };
      (expiry.status === "EXPIRED" ? expired : expiring).push(row);
    }
    if (expired.length && isAdmin)
      attention.push({
        type: "expired_stock",
        count: expired.length,
        severity: "urgent",
        items: expired.slice(0, 5),
      });
    if (expiring.length && isAdmin)
      attention.push({
        type: "expiring_stock",
        count: expiring.length,
        severity: "wait",
        items: expiring.slice(0, 5),
      });
    const counts = new Map<string, number>();
    for (const c of customers)
      counts.set(
        c.acquisitionSource,
        (counts.get(c.acquisitionSource) || 0) + 1,
      );
    const bySource = [...counts].map(([source, count]) => ({
      source,
      label:
        (
          {
            INDICACAO: "Indicação",
            INSTAGRAM: "Instagram",
            WHATSAPP: "WhatsApp",
            GOOGLE: "Google",
            OUTRO: "Outro",
          } as any
        )[source] || source,
      count,
    }));
    const attendanceIds = new Set(attended.map((x) => x.customerId));
    const returning = await this.db.appointment.findMany({
      where: {
        customerId: { in: [...attendanceIds] },
        startsAt: { lt: monthStart },
        status: "COMPLETED",
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });
    const core: any = {
      referenceDate: today,
      professionals: profs.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
      today: {
        date: today,
        updatedAt: new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Maceio",
          hour: "2-digit",
          minute: "2-digit",
        }).format(now),
        totalAppointments: appointments.filter((a) => a.status !== "CANCELLED")
          .length,
        completedAppointments: appointments.filter(
          (a) => a.status === "COMPLETED",
        ).length,
        upcomingAppointments: appointments.filter(
          (a) =>
            a.startsAt > now &&
            a.status !== "CANCELLED" &&
            a.status !== "COMPLETED",
        ).length,
        nextAppointment: next
          ? {
              time: new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Maceio",
                hour: "2-digit",
                minute: "2-digit",
              }).format(next.startsAt),
              customerName: next.customer.name,
              procedureName: next.procedure.name,
              professionalName: next.professional.name,
            }
          : null,
        awaitingConfirmation: {
          count: pending.length,
          times: pending.map((a) =>
            new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Maceio",
              hour: "2-digit",
              minute: "2-digit",
            }).format(a.startsAt),
          ),
        },
      },
      appointments: ap,
      attention,
      period: {
        month,
        totalNewCustomers: customers.length,
        newCustomersBySource: bySource,
        attendedCustomers: attendanceIds.size,
        returningCustomers: returning.length,
      },
      observations: {
        referralPercentage: customers.length
          ? Math.round(
              ((counts.get("INDICACAO") || 0) / customers.length) * 100,
            )
          : null,
      },
    };
    const employeeSales = professionalId
      ? sales.filter((s) => s.professionalId === professionalId)
      : [];
    core.myFinance = {
      weekSales: money(
        employeeSales.reduce(
          (v, s) =>
            v +
            (s.createdAt >= new Date(now.getTime() - 7 * 86400000)
              ? s.items.reduce((sum, i) => sum + Number(i.finalPrice), 0) -
                Number(s.discount)
              : 0),
          0,
        ),
      ),
      monthSales: money(
        employeeSales.reduce(
          (v, s) =>
            v +
            s.items.reduce((sum, i) => sum + Number(i.finalPrice), 0) -
            Number(s.discount),
          0,
        ),
      ),
    };
    if (isAdmin) {
      const totals = sales.map((s) => {
        const subtotal = s.items.reduce((n, i) => n + Number(i.finalPrice), 0),
          total = money(Math.max(0, subtotal - Number(s.discount))),
          received = money(
            s.payments.reduce(
              (n, x) => n + (x.reversal ? 0 : Number(x.amount)),
              0,
            ),
          );
        return { total, received };
      });
      const salesSum = money(totals.reduce((n, x) => n + x.total, 0)),
        received = money(totals.reduce((n, x) => n + x.received, 0)),
        spent = money(
          expenses
            .filter((e) => e.paid)
            .reduce((n, e) => n + Number(e.amount), 0),
        );
      core.finance = {
        sales: salesSum,
        received,
        receivable: money(salesSum - received),
        expensesPaid: spent,
        flow: money(received - spent),
        ticketMedio: sales.length ? money(salesSum / sales.length) : 0,
      };
      const topMap = new Map<
        string,
        {
          procedureId: number;
          procedureName: string;
          revenue: number;
          sessions: number;
        }
      >();
      for (const s of sales) {
        const sub = s.items.reduce((n, i) => n + Number(i.finalPrice), 0);
        for (const i of s.items) {
          const k = String(i.procedureId);
          const x = topMap.get(k) || {
            procedureId: i.procedureId,
            procedureName: i.procedure.name,
            revenue: 0,
            sessions: 0,
          };
          x.revenue +=
            i.netAmount != null
              ? Number(i.netAmount)
              : sub > 0
                ? Number(i.finalPrice) * (1 - Number(s.discount) / sub)
                : 0;
          x.sessions += i.sessions;
          topMap.set(k, x);
        }
      }
      const top = [...topMap.values()]
        .map((p) => ({
          ...p,
          revenue: money(p.revenue),
          ticket: p.sessions ? money(p.revenue / p.sessions) : 0,
          previousRevenue: 0,
          changePercent: null,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      const expMap = new Map<string, number>();
      for (const e of expenses.filter((e) => e.paid))
        expMap.set(
          e.category,
          (expMap.get(e.category) || 0) + Number(e.amount),
        );
      const expTop = [...expMap]
        .map(([category, amount]) => ({
          category,
          categoryLabel: expenseLabels[category] || category,
          amount: money(amount),
          previousAmount: 0,
          changePercent: null,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      core.procedureRevenue = top;
      core.monthlyInsights = {
        procedures: { top, topMover: null, topDecline: null },
        expenses: { top: expTop },
      };
    }
    return core;
  }
}
