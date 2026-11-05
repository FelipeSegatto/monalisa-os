import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { required } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { Actor } from "../../auth/domain/actor";
import { ExpenseRepository } from "../application/expense.ports";
import { ExpenseRevisionInput } from "../domain/expense.types";
import { Expense } from "../domain/expense";
import { ExpenseDistribution } from "../domain/expense-distribution";
import { Money } from "../../shared/domain/money";
import { viewExpense } from "./expense.mapper";
export const expenseInclude = {
  revisions: {
    orderBy: { version: "desc" as const },
    include: { allocations: true },
  },
  payments: {
    include: { reversal: true },
    orderBy: { id: "desc" as const },
  },
  events: { orderBy: { id: "desc" as const }, take: 200 },
};
function admin(actor: Actor) {
  if (actor.role !== "ADMIN")
    throw new ApplicationError(
      "Operação exclusiva de administrador",
      "FORBIDDEN",
    );
}
async function resolveAllocationNames(
  tx: Prisma.TransactionClient,
  procedureIds: readonly number[],
) {
  if (!procedureIds.length) return new Map<number, string>();
  const rows = await tx.procedure.findMany({
    where: { id: { in: [...new Set(procedureIds)] } },
    select: { id: true, name: true },
  });
  if (rows.length !== new Set(procedureIds).size)
    throw new ApplicationError(
      "Procedimento da distribuição não encontrado",
      "INVALID_INPUT",
    );
  return new Map(rows.map((r) => [r.id, r.name]));
}
@Injectable()
export class PrismaExpenseRepository extends ExpenseRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  private async detail(id: number) {
    const x = required(
      await this.db.expense.findUnique({ where: { id }, include: expenseInclude }),
    );
    return viewExpense(x);
  }
  async create(input: ExpenseRevisionInput, actor: Actor) {
    admin(actor);
    Expense.assertRevisionInput({ ...input, reason: input.reason });
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const requestKey = `create:${hash}:${actor.id}`;
    const existingEvent = await this.db.expenseEvent.findFirst({
      where: { requestKey },
    });
    if (existingEvent) return this.detail(existingEvent.expenseId);
    let id: number;
    try {
      id = await this.db.$transaction(
        async (tx) => {
          const distribution = ExpenseDistribution.compute(
            input.amount,
            input.destination,
            input.basis,
            input.allocations,
            input.allocationNote,
          );
          const names = await resolveAllocationNames(
            tx,
            distribution.lines.flatMap((l) =>
              l.procedureId !== null ? [l.procedureId] : [],
            ),
          );
          const expense = await tx.expense.create({
            data: {
              description: input.description.trim(),
              category: input.category,
              supplier: input.supplier?.trim() || null,
              amount: input.amount,
              dueDate: new Date(input.dueDate + "T12:00:00Z"),
              recurrence: input.recurrence,
              expenseModel: "V1",
              competenceMonth: input.competenceMonth,
              allocationRevision: 1,
              actorId: actor.id,
            },
          });
          const revision = await tx.expenseRevision.create({
            data: {
              expenseId: expense.id,
              version: 1,
              description: input.description.trim(),
              category: input.category,
              supplier: input.supplier?.trim() || null,
              amount: input.amount,
              dueDate: new Date(input.dueDate + "T12:00:00Z"),
              competenceMonth: input.competenceMonth,
              recurrence: input.recurrence,
              destination: input.destination,
              basis: input.basis,
              allocationNote: input.allocationNote.trim(),
              reason: input.reason.trim(),
              actorId: actor.id,
            },
          });
          for (const line of distribution.lines)
            await tx.expenseAllocation.create({
              data: {
                revisionId: revision.id,
                procedureId: line.procedureId,
                procedureName:
                  line.procedureId !== null
                    ? (names.get(line.procedureId) ?? null)
                    : null,
                inputValue: line.inputValue,
                amount: line.amountCents / 100,
              },
            });
          await tx.expenseEvent.create({
            data: {
              expenseId: expense.id,
              type: "EXPENSE_CREATED",
              actorId: actor.id,
              reason: input.reason.trim(),
              requestKey,
              requestHash: hash,
              details: { amount: input.amount, destination: input.destination },
            },
          });
          return expense.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay = await this.db.expenseEvent.findFirst({
          where: { requestKey },
        });
        if (replay) return this.detail(replay.expenseId);
      }
      throw error;
    }
    return this.detail(id);
  }
  async revise(id: number, input: ExpenseRevisionInput, actor: Actor) {
    admin(actor);
    Expense.assertRevisionInput(input);
    const hash = createHash("sha256")
      .update(JSON.stringify({ id, input }))
      .digest("hex");
    const requestKey = `revise:${id}:${hash}:${actor.id}`;
    const existingEvent = await this.db.expenseEvent.findFirst({
      where: { requestKey },
    });
    if (existingEvent) return this.detail(existingEvent.expenseId);
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Expense WHERE id=${id} FOR UPDATE`;
        const expense = required(
          await tx.expense.findUnique({
            where: { id },
            include: {
              revisions: { orderBy: { version: "desc" }, take: 1 },
              payments: { include: { reversal: true } },
            },
          }),
        );
        if (expense.cancelled)
          throw new ApplicationError("Despesa cancelada", "CONFLICT");
        const hasActivePayment = expense.payments.some(
          (p) => p.type === "PAYMENT" && !p.reversal,
        );
        Expense.assertRevisable(hasActivePayment);
        const currentVersion = expense.revisions[0]?.version ?? 0;
        const distribution = ExpenseDistribution.compute(
          input.amount,
          input.destination,
          input.basis,
          input.allocations,
          input.allocationNote,
        );
        const names = await resolveAllocationNames(
          tx,
          distribution.lines.flatMap((l) =>
            l.procedureId !== null ? [l.procedureId] : [],
          ),
        );
        const revision = await tx.expenseRevision.create({
          data: {
            expenseId: id,
            version: currentVersion + 1,
            description: input.description.trim(),
            category: input.category,
            supplier: input.supplier?.trim() || null,
            amount: input.amount,
            dueDate: new Date(input.dueDate + "T12:00:00Z"),
            competenceMonth: input.competenceMonth,
            recurrence: input.recurrence,
            destination: input.destination,
            basis: input.basis,
            allocationNote: input.allocationNote.trim(),
            reason: input.reason.trim(),
            actorId: actor.id,
          },
        });
        for (const line of distribution.lines)
          await tx.expenseAllocation.create({
            data: {
              revisionId: revision.id,
              procedureId: line.procedureId,
              procedureName:
                line.procedureId !== null
                  ? (names.get(line.procedureId) ?? null)
                  : null,
              inputValue: line.inputValue,
              amount: line.amountCents / 100,
            },
          });
        await tx.expense.update({
          where: { id },
          data: {
            description: input.description.trim(),
            category: input.category,
            supplier: input.supplier?.trim() || null,
            amount: input.amount,
            dueDate: new Date(input.dueDate + "T12:00:00Z"),
            recurrence: input.recurrence,
            competenceMonth: input.competenceMonth,
            allocationRevision: currentVersion + 1,
          },
        });
        await tx.expenseEvent.create({
          data: {
            expenseId: id,
            type: "EXPENSE_REVISED",
            actorId: actor.id,
            reason: input.reason.trim(),
            requestKey,
            requestHash: hash,
            details: { version: currentVersion + 1, amount: input.amount },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id);
  }
  async pay(
    id: number,
    input: {
      amount: number;
      method: "PIX" | "CASH" | "CARD";
      paidAt: string;
      requestKey: string;
    },
    actor: Actor,
  ) {
    admin(actor);
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Expense WHERE id=${id} FOR UPDATE`;
        const expense = required(
          await tx.expense.findUnique({
            where: { id },
            include: {
              revisions: { orderBy: { version: "desc" }, take: 1 },
              payments: { include: { reversal: true } },
            },
          }),
        );
        const previous = await tx.expensePayment.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (previous) {
          if (
            previous.expenseId !== id ||
            Number(previous.amount) !== input.amount ||
            previous.method !== input.method ||
            previous.actorId !== actor.id
          )
            throw new ApplicationError(
              "Chave já utilizada com outro conteúdo",
              "CONFLICT",
            );
          return;
        }
        if (expense.cancelled)
          throw new ApplicationError("Despesa cancelada", "CONFLICT");
        const currentRevision = required(
          expense.revisions[0],
          "Despesa sem revisão (modelo legado); registre uma revisão antes de pagar",
        );
        const hasActivePayment = expense.payments.some(
          (p) => p.type === "PAYMENT" && !p.reversal,
        );
        Expense.assertPayment(
          input.amount,
          Money.from(currentRevision.amount.toString()).cents,
          hasActivePayment,
        );
        await tx.expensePayment.create({
          data: {
            expenseId: id,
            revisionId: currentRevision.id,
            type: "PAYMENT",
            source: "SYSTEM",
            amount: input.amount,
            method: input.method,
            occurredAt: new Date(input.paidAt),
            actorId: actor.id,
            requestKey: input.requestKey,
          },
        });
        await tx.expense.update({
          where: { id },
          data: {
            paid: true,
            method: input.method,
            paidAt: new Date(input.paidAt),
          },
        });
        await tx.expenseEvent.create({
          data: {
            expenseId: id,
            type: "PAYMENT_RECEIVED",
            actorId: actor.id,
            requestKey: `payment-event:${input.requestKey}`,
            requestHash: createHash("sha256")
              .update(JSON.stringify(input))
              .digest("hex"),
            details: { amount: input.amount, method: input.method },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id);
  }
  async reversePayment(
    id: number,
    paymentId: number,
    reason: string,
    requestKey: string,
    actor: Actor,
  ) {
    admin(actor);
    if (reason.trim().length < 3)
      throw new ApplicationError("Informe o motivo do estorno", "INVALID_INPUT");
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Expense WHERE id=${id} FOR UPDATE`;
        const payment = required(
          await tx.expensePayment.findUnique({
            where: { id: paymentId },
            include: { reversal: true },
          }),
        );
        if (payment.expenseId !== id)
          throw new ApplicationError(
            "Pagamento não pertence a esta despesa",
            "INVALID_INPUT",
          );
        const previous = await tx.expensePayment.findUnique({
          where: { requestKey },
        });
        if (previous) {
          if (previous.reversesId !== paymentId || previous.actorId !== actor.id)
            throw new ApplicationError("Chave já utilizada", "CONFLICT");
          return;
        }
        Expense.assertReversal(
          payment.type === "PAYMENT",
          Boolean(payment.reversal),
        );
        await tx.expensePayment.create({
          data: {
            expenseId: id,
            revisionId: payment.revisionId,
            type: "REVERSAL",
            source: "SYSTEM",
            amount: payment.amount,
            method: payment.method,
            occurredAt: new Date(),
            actorId: actor.id,
            reason: reason.trim(),
            requestKey,
            reversesId: paymentId,
          },
        });
        await tx.expense.update({
          where: { id },
          data: { paid: false, method: null, paidAt: null },
        });
        await tx.expenseEvent.create({
          data: {
            expenseId: id,
            type: "PAYMENT_REVERSED",
            actorId: actor.id,
            reason: reason.trim(),
            requestKey: `reversal-event:${requestKey}`,
            requestHash: createHash("sha256")
              .update(JSON.stringify({ paymentId, reason }))
              .digest("hex"),
            details: { paymentId, amount: Number(payment.amount) },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id);
  }
  async cancel(id: number, reason: string, actor: Actor) {
    admin(actor);
    if (reason.trim().length < 3)
      throw new ApplicationError(
        "Informe o motivo do cancelamento",
        "INVALID_INPUT",
      );
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Expense WHERE id=${id} FOR UPDATE`;
        const expense = required(
          await tx.expense.findUnique({
            where: { id },
            include: { payments: { include: { reversal: true } } },
          }),
        );
        if (expense.cancelled) return;
        const hasActivePayment = expense.payments.some(
          (p) => p.type === "PAYMENT" && !p.reversal,
        );
        Expense.assertCancellation(hasActivePayment);
        await tx.expense.update({ where: { id }, data: { cancelled: true } });
        await tx.expenseEvent.create({
          data: {
            expenseId: id,
            type: "EXPENSE_CANCELLED",
            actorId: actor.id,
            reason: reason.trim(),
            requestKey: `cancel:${id}:${actor.id}:${Date.now()}`,
            requestHash: createHash("sha256").update(reason).digest("hex"),
            details: {},
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id);
  }
}
