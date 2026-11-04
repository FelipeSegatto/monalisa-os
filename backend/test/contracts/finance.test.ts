import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";

test("venda mantém contrato e recebimento rejeita excedente, protege autoria e calcula saldo", async () => {
  const app = await contractApp();
  try {
    const sale = {
      id: 1,
      customerId: 3,
      professionalId: 2,
      discount: "20",
      commissionPercent: null,
      cancelled: false,
      createdAt: new Date("2030-01-01T12:00:00Z"),
      customer: { name: "Cliente fictícia" },
      professional: { name: "Profissional" },
      items: [
        {
          id: 1,
          procedureId: 4,
          description: "Tratamento",
          sessions: 2,
          unitPrice: "100",
          finalPrice: "200",
        },
      ],
      payments: [
        {
          id: 1,
          paidAt: new Date("2030-01-01T12:00:00Z"),
          method: "PIX",
          installments: null,
          amount: "50",
        },
      ],
    };
    let locks = 0;
    app.db.sale.findUnique = async () => sale;
    app.db.salePayment.create = async ({ data }: any) => {
      sale.payments.push({ id: 2, paidAt: new Date(), ...data });
      return data;
    };
    app.db.$transaction = async (callback: any) =>
      callback({
        ...app.db,
        $queryRaw: async () => {
          locks++;
          return [{ id: 1 }];
        },
      });
    await app.start();
    const detail = await app.request("/api/v1/finance/sales/1");
    assert.equal(detail.status, 200);
    const data: any = await detail.json();
    assert.equal(data.total, 180);
    assert.equal(data.received, 50);
    assert.equal(data.balance, 130);
    assert.equal(data.status, "PARTIAL");
    assert.equal(data.items[0].unitPrice, 100);
    assert.equal(data.payments[0].amount, 50);
    assert.equal(
      (await app.request("/api/v1/finance/sales/1", { role: "FUNCIONARIO" }))
        .status,
      403,
    );
    const body = { amount: 131, method: "PIX", installments: null };
    assert.equal(
      (
        await app.request("/api/v1/finance/sales/1/payments", {
          method: "POST",
          body,
        })
      ).status,
      409,
    );
    assert.equal(sale.payments.length, 1);
    const accepted = await app.request("/api/v1/finance/sales/1/payments", {
      method: "POST",
      body: { ...body, amount: 130 },
    });
    assert.equal(accepted.status, 201);
    const paid: any = await accepted.json();
    assert.equal(paid.status, "PAID");
    assert.equal(paid.balance, 0);
    assert.equal(paid.received, 180);
    assert.equal(locks, 2);
  } finally {
    await app.close();
  }
});
