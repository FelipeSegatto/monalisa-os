import { Payment } from "../commercial/domain/payment";
import { CommercialService } from "../commercial/application/commercial.service";
import { randomUUID } from "node:crypto";
import {
  Inject,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Admin } from "../auth/auth.guard";
import {
  dayRange,
  expenseLabels,
  iso,
  money,
  parse,
  required,
  requiredId,
} from "../common/util";
import { z } from "zod";
import { saleTotal, canPay } from "../domain/sale-policy";
const PM = z.enum(["PIX", "CASH", "CARD"]);
const saleInput = z.object({
  requestKey: z.string().uuid(),
  discountReason: z.string().trim().max(1000).optional(),
  customerId: z.number().int().positive(),
  professionalId: z.number().int().positive().nullable(),
  discount: z.number().finite().nonnegative(),
  commissionPercent: z.number().min(0).max(100).nullable(),
  items: z
    .array(
      z.object({
        procedureId: z.number().int().positive(),
        procedurePriceVariationId: z.number().int().positive().nullable(),
        description: z.string().trim().min(1).max(255),
        sessions: z.number().int().min(1),
        unitPrice: z.number().nonnegative(),
        finalPrice: z.number().nonnegative(),
        discountReason: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1),
  initialPayment: z
    .object({
      amount: z.number().positive(),
      method: PM,
      installments: z.number().int().min(1).nullable(),
    })
    .nullable(),
});
const paymentInput = z.object({
  requestKey: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: PM,
  installments: z.number().int().positive().nullable(),
});
const expenseInput = z.object({
  description: z.string().trim().min(2).max(255),
  category: z.enum([
    "INSUMOS",
    "EQUIPAMENTOS_MANUTENCAO",
    "MARKETING",
    "ALUGUEL_ESTRUTURA",
    "SERVICOS",
    "PESSOAL",
    "OUTROS",
  ]),
  supplier: z.string().nullable(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paid: z.boolean(),
  paidAt: z.string().nullable(),
  method: PM.nullable(),
  recurrence: z.enum(["ONCE", "RECURRING"]),
});
const decimal = (n: any) => money(n);
function toSale(s: any, withDetails = false) {
  const subtotal = money(
    (s.items || []).reduce((a: number, i: any) => a + decimal(i.finalPrice), 0),
  );
  const total = money(Math.max(0, subtotal - decimal(s.discount)));
  const received = money(
    (s.payments || []).reduce(
      (a: number, p: any) => a + (p.reversal ? 0 : decimal(p.amount)),
      0,
    ),
  );
  const balance = money(Math.max(0, total - received));
  const status = s.cancelled
    ? "CANCELLED"
    : balance === 0
      ? "PAID"
      : received === 0
        ? "PENDING"
        : "PARTIAL";
  const core = {
    id: s.id,
    customerId: s.customerId,
    customerName: s.customer?.name || "",
    professionalId: s.professionalId,
    professionalName: s.professional?.name || null,
    discount: decimal(s.discount),
    commissionPercent:
      s.commissionPercent === null ? null : decimal(s.commissionPercent),
    cancelled: s.cancelled,
    createdAt: iso(s.createdAt),
    subtotal,
    total,
    received,
    balance,
    status,
  };
  return withDetails
    ? {
        ...core,
        items: (s.items || []).map((i: any) => ({
          ...i,
          unitPrice: decimal(i.unitPrice),
          finalPrice: decimal(i.finalPrice),
        })),
        payments: (s.payments || []).map((p: any) => ({
          ...p,
          paidAt: iso(p.paidAt),
          amount: decimal(p.amount),
        })),
      }
    : core;
}
function toExpense(x: any) {
  return {
    ...x,
    amount: decimal(x.amount),
    dueDate: x.dueDate.toISOString().slice(0, 10),
    paidAt: iso(x.paidAt),
    createdAt: iso(x.createdAt),
    categoryLabel: expenseLabels[x.category] || x.category,
  };
}
const range = (start?: string, end?: string) => {
  const now = new Date();
  const s = dayRange(start || now.toISOString().slice(0, 10)).start,
    e = dayRange(
      end || new Date(now.getTime() + 86400000).toISOString().slice(0, 10),
    ).start;
  if (e <= s) throw new BadRequestException("Período inválido");
  return { gte: s, lt: e };
};
const includeSale = {
  customer: true,
  professional: true,
  items: true,
  payments: {
    include: { reversal: true },
    orderBy: { paidAt: "desc" as const },
  },
};
@Controller("api/v1")
export class FinanceController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(CommercialService) private readonly commercial: CommercialService,
  ) {}
  @Get("finance/sales") async sales(
    @Query("start") start?: string,
    @Query("end") end?: string,
    @Req() req?: any,
  ) {
    const data = await this.db.sale.findMany({
      where: {
        createdAt: range(start, end),
        ...(req?.actor?.role === "FUNCIONARIO"
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: includeSale,
      orderBy: { createdAt: "desc" },
    });
    return { sales: data.map((s) => toSale(s)) };
  }
  @Get("customers/:id/sales") async customerSales(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const data = await this.db.sale.findMany({
      where: {
        customerId: requiredId(id),
        ...(req.actor.role === "FUNCIONARIO"
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: includeSale,
      orderBy: { createdAt: "desc" },
    });
    return { sales: data.map((s) => toSale(s)) };
  }
  @Get("finance/sales/:id") async sale(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const s = required(
      await this.db.sale.findUnique({
        where: { id: requiredId(id) },
        include: includeSale,
      }),
    );
    if (
      req.actor.role === "FUNCIONARIO" &&
      s.professionalId !== req.actor.professionalId
    )
      throw new ForbiddenException("Venda de outro profissional");
    return toSale(s, true);
  }
  @Post("finance/sales") async createSale(
    @Body() body: unknown,
    @Req() req: any,
  ) {
    return this.commercial.legacyCreate(parse(saleInput, body), req.actor);
  }
  @Post("finance/sales/:id/payments") async pay(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(paymentInput, body);
    new Payment(p.amount, p.method, p.installments);
    const saleId = requiredId(id);
    const current = required(
      await this.db.sale.findUnique({ where: { id: saleId } }),
    );
    if (current.commercialModel === "V1") {
      if (!p.requestKey)
        throw new BadRequestException("Chave da operação obrigatória");
      return this.commercial.payment(
        saleId,
        { ...p, requestKey: p.requestKey },
        req.actor,
      );
    }
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Sale WHERE id = ${saleId} FOR UPDATE`;
      const s = required(
        await tx.sale.findUnique({
          where: { id: saleId },
          include: { items: true, payments: { include: { reversal: true } } },
        }),
      );
      if (
        req.actor.role === "FUNCIONARIO" &&
        s.professionalId !== req.actor.professionalId
      )
        throw new ForbiddenException("Venda de outro profissional");
      if (s.cancelled) throw new BadRequestException("Venda cancelada");
      if (p.requestKey) {
        const previous = await tx.salePayment.findUnique({
          where: { requestKey: p.requestKey },
        });
        if (previous) {
          if (
            previous.saleId !== saleId ||
            Number(previous.amount) !== p.amount ||
            previous.method !== p.method ||
            previous.installments !== p.installments ||
            previous.actorId !== req.actor.id
          )
            throw new ConflictException("Chave já utilizada");
          return;
        }
      }
      const total = money(
          s.items.reduce((n, i) => n + Number(i.finalPrice), 0) -
            Number(s.discount),
        ),
        paid = money(
          s.payments.reduce(
            (n, x) => n + (x.reversal ? 0 : Number(x.amount)),
            0,
          ),
        );
      if (!canPay(total, paid, p.amount))
        throw new ConflictException("Pagamento supera o saldo devedor");
      await tx.salePayment.create({
        data: {
          saleId,
          amount: p.amount,
          method: p.method,
          installments: p.installments,
          actorId: req.actor.id,
          requestKey: p.requestKey ?? randomUUID(),
        },
      });
    });
    return this.sale(id, req);
  }
  @Admin() @Post("finance/sales/:id/cancel") async cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({ reason: z.string().trim().min(3).max(1000) }),
      body,
    );
    return this.commercial.cancelSale(requiredId(id), p.reason, req.actor);
  }
  @Get("finance/expenses") async expenses(
    @Query("start") start?: string,
    @Query("end") end?: string,
    @Req() req?: any,
  ) {
    if (req?.actor?.role === "FUNCIONARIO") return { expenses: [] };
    const data = await this.db.expense.findMany({
      where: { dueDate: range(start, end) },
      orderBy: { dueDate: "desc" },
    });
    return { expenses: data.map(toExpense) };
  }
  @Admin() @Get("finance/expenses/:id") async expense(@Param("id") id: string) {
    return toExpense(
      required(
        await this.db.expense.findUnique({ where: { id: requiredId(id) } }),
      ),
    );
  }
  @Admin() @Post("finance/expenses") async createExpense(
    @Body() body: unknown,
  ) {
    const p = parse(expenseInput, body);
    if (p.paid && !p.method)
      throw new BadRequestException("Método obrigatório para despesa paga");
    const data = await this.db.expense.create({
      data: {
        ...p,
        dueDate: new Date(p.dueDate + "T12:00:00Z"),
        paidAt: p.paid ? (p.paidAt ? new Date(p.paidAt) : new Date()) : null,
      },
    });
    return toExpense(data);
  }
  @Admin() @Post("finance/expenses/:id/pay") async payExpense(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const p = parse(z.object({ method: PM, paidAt: z.string() }), body);
    const expense = required(
      await this.db.expense.findUnique({ where: { id: requiredId(id) } }),
    );
    if (expense.cancelled) throw new BadRequestException("Despesa cancelada");
    if (expense.paid) throw new ConflictException("Despesa já está paga");
    return toExpense(
      await this.db.expense.update({
        where: { id: expense.id },
        data: { paid: true, method: p.method, paidAt: new Date(p.paidAt) },
      }),
    );
  }
  @Get("finance/summary") async summary(
    @Query("start") start?: string,
    @Query("end") end?: string,
    @Req() req?: any,
  ) {
    const [sales, expenses] = await Promise.all([
      this.db.sale.findMany({
        where: {
          createdAt: range(start, end),
          cancelled: false,
          ...(req?.actor?.role === "FUNCIONARIO"
            ? { professionalId: req.actor.professionalId }
            : {}),
        },
        include: includeSale,
      }),
      this.db.expense.findMany({
        where: { dueDate: range(start, end), cancelled: false },
      }),
    ]);
    const values = sales.map((s) => toSale(s));
    const sold = money(values.reduce((x, s) => x + s.total, 0)),
      received = money(values.reduce((x, s) => x + s.received, 0)),
      paid = money(
        (req?.actor?.role === "FUNCIONARIO" ? [] : expenses)
          .filter((e) => e.paid)
          .reduce((x, e) => x + Number(e.amount), 0),
      );
    return {
      sales: sold,
      received,
      receivable: money(sold - received),
      expensesPaid: paid,
      flow: money(received - paid),
      ticketMedio: values.length ? money(sold / values.length) : 0,
    };
  }
  @Get("finance/pendencias") async pending(@Req() req: any) {
    const sales = await this.db.sale.findMany({
      where: {
        cancelled: false,
        ...(req.actor.role === "FUNCIONARIO"
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: includeSale,
    });
    const expenses = await this.db.expense.findMany({
      where: { paid: false, cancelled: false },
      orderBy: { dueDate: "asc" },
    });
    return {
      receivable: sales.map((s) => toSale(s)).filter((s) => s.balance > 0),
      payable: req.actor.role === "FUNCIONARIO" ? [] : expenses.map(toExpense),
    };
  }
  @Get("finance/evolution") async evolution(
    @Query("months") months = "6",
    @Req() req?: any,
  ) {
    const n = Math.max(1, Math.min(12, Number(months) || 6));
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = d.toISOString().slice(0, 7);
      const next = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1),
      );
      const sales = await this.db.sale.findMany({
        where: {
          createdAt: { gte: d, lt: next },
          cancelled: false,
          ...(req?.actor?.role === "FUNCIONARIO"
            ? { professionalId: req.actor.professionalId }
            : {}),
        },
        include: includeSale,
      });
      const expenses =
        req?.actor?.role === "FUNCIONARIO"
          ? []
          : await this.db.expense.findMany({
              where: {
                paidAt: { gte: d, lt: next },
                paid: true,
                cancelled: false,
              },
            });
      const rows = sales.map((s) => toSale(s));
      out.push({
        month: key,
        sales: money(rows.reduce((a, s) => a + s.total, 0)),
        received: money(rows.reduce((a, s) => a + s.received, 0)),
        expenses: money(expenses.reduce((a, e) => a + Number(e.amount), 0)),
      });
    }
    return { evolution: out };
  }
  @Get("finance/composition") async composition(
    @Query("start") start?: string,
    @Query("end") end?: string,
    @Req() req?: any,
  ) {
    const rows = await this.db.sale.findMany({
      where: {
        createdAt: range(start, end),
        cancelled: false,
        ...(req?.actor?.role === "FUNCIONARIO"
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: includeSale,
    });
    const sums = new Map<
      string,
      {
        procedureId: number;
        procedureName: string;
        revenue: number;
        sessions: number;
      }
    >();
    for (const sale of rows) {
      const total = Number(
        sale.items.reduce((n, i) => n + Number(i.finalPrice), 0),
      );
      for (const item of sale.items) {
        const name = item.description;
        const key = String(item.procedureId);
        const v = sums.get(key) || {
          procedureId: item.procedureId,
          procedureName: name,
          revenue: 0,
          sessions: 0,
        };
        v.revenue +=
          total > 0
            ? Number(item.finalPrice) * (1 - Number(sale.discount) / total)
            : 0;
        v.sessions += item.sessions;
        sums.set(key, v);
      }
    }
    const procedureRevenue = [...sums.values()]
      .map((x) => ({
        ...x,
        revenue: money(x.revenue),
        ticket: x.sessions ? money(x.revenue / x.sessions) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    const sum = procedureRevenue.reduce((a, x) => a + x.revenue, 0);
    return {
      composition: procedureRevenue.map((x) => ({
        categoryId: x.procedureId,
        categoryName: x.procedureName,
        total: x.revenue,
        percentage: sum ? money((x.revenue / sum) * 100) : 0,
      })),
      procedureRevenue,
    };
  }
}
