import { test } from "node:test";
import assert from "node:assert/strict";
import { Payment } from "../../src/commercial/domain/payment";
import { ReceivableSchedule } from "../../src/commercial/domain/receivable-schedule";
import { PrismaCommercialSales } from "../../src/commercial/infrastructure/prisma-commercial-sales";
test("card installments and clinic receivables have independent meanings and exact balances", () => {
  new Payment(200, "CARD", 2);
  assert.throws(() => new Payment(200, "PIX", 2));
  assert.throws(() => new Payment(0, "PIX", null));
  assert.throws(() => new Payment(0.001, "PIX", null));
  const schedule = ReceivableSchedule.forBalance(
    60000,
    [
      { amount: 300, dueOn: "2026-11-10" },
      { amount: 300, dueOn: "2026-12-10" },
    ],
    "2026-11-01",
  );
  assert.equal(schedule.snapshot().length, 2);
  assert.throws(() =>
    ReceivableSchedule.forBalance(
      60000,
      [{ amount: 599.99, dueOn: "2026-11-10" }],
      "2026-11-01",
    ),
  );
  assert.throws(() =>
    ReceivableSchedule.forBalance(
      60000,
      [{ amount: 600, dueOn: "2026-02-30" }],
      "2026-11-01",
    ),
  );
  assert.deepEqual(
    ReceivableSchedule.forBalance(0, [], "2026-11-01").snapshot(),
    [],
  );
});
test("payment reversal is append-only and recreates the unallocated initial-payment receivable", async () => {
  const payments: any[] = [
      { id: 1, saleId: 2, amount: 200, allocations: [], reversal: null },
    ],
    reversals: any[] = [],
    plan: any[] = [],
    events: any[] = [];
  const db: any = {
    $queryRaw: async () => [{ id: 2 }],
    salePayment: {
      findUnique: async () => ({
        ...payments[0],
        reversal: reversals[0] ?? null,
      }),
    },
    paymentReversal: {
      findUnique: async ({ where }: any) =>
        reversals.find((r) => r.requestKey === where.requestKey) ?? null,
      create: async ({ data }: any) => {
        const r = { id: 1, ...data };
        reversals.push(r);
        return r;
      },
    },
    receivableInstallment: {
      findFirst: async () => ({ number: 1 }),
      create: async ({ data }: any) => {
        plan.push(data);
        return data;
      },
    },
    commercialEvent: {
      create: async ({ data }: any) => {
        events.push(data);
        return data;
      },
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  const repo = new PrismaCommercialSales(db, {} as any, {} as any);
  repo.detail = async () => ({ id: 2 });
  const actor = {
    id: 7,
    name: "Admin",
    role: "ADMIN" as const,
    professionalId: null,
  };
  await repo.reversePayment(1, "Refund authorized", "key", actor);
  assert.equal(reversals.length, 1);
  assert.equal(payments[0].amount, 200);
  assert.equal(plan[0].amount, 200);
  assert.equal(plan[0].number, 2);
  assert.equal(events[0].actorId, 7);
  await repo.reversePayment(1, "Refund authorized", "key", actor);
  assert.equal(reversals.length, 1);
  assert.equal(plan.length, 1);
  await assert.rejects(
    () => repo.reversePayment(1, "Another refund", "another-key", actor),
    /já estornado/,
  );
});
