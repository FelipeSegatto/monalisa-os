import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";

test("listagens validam datas reais, intervalos, status e categoria antes de consultar", async () => {
  const app = await contractApp();
  try {
    let reads = 0;
    app.db.$queryRaw = async () => {
      reads++;
      return [];
    };
    await app.start();
    for (const path of [
      "/api/v1/commercial/sales?start=2026-02-30",
      "/api/v1/commercial/sales?start=2026-12-01&end=2026-11-01",
      "/api/v1/commercial/sales?categoryId=-1",
      "/api/v1/commercial/sales?status=UNKNOWN",
      "/api/v1/finance/expenses?dueStart=2026-02-30",
      "/api/v1/finance/expenses?dueStart=2026-12-01&dueEnd=2026-11-01",
      "/api/v1/finance/expenses?category=UNKNOWN",
      "/api/v1/finance/expenses?status=PARTIAL",
    ])
      assert.equal((await app.request(path)).status, 400, path);
    assert.equal(reads, 0);
    assert.equal(
      (
        await app.request("/api/v1/finance/expenses?category=INSUMOS", {
          role: "FUNCIONARIO",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request(
          "/api/v1/commercial/sales?start=2026-11-01&end=2026-11-01&status=PAID",
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await app.request(
          "/api/v1/finance/expenses?dueStart=2026-11-01&dueEnd=2026-11-01&category=INSUMOS",
        )
      ).status,
      200,
    );
    assert.equal(reads, 2);
  } finally {
    await app.close();
  }
});

test("paginação conserva filtros e devolve cursor pelo último registro exibido", async () => {
  const app = await contractApp();
  try {
    const ids = Array.from({ length: 51 }, (_, index) => ({ id: 100 - index }));
    app.db.$queryRaw = async () => ids;
    app.db.sale.findMany = async ({ where }: any) =>
      where.id.in.map((id: number) => ({
        id,
        discount: 0,
        items: [],
        payments: [],
        commissionPercent: null,
      }));
    await app.start();
    const response = await app.request("/api/v1/commercial/sales?status=PAID");
    assert.equal(response.status, 200);
    const data: any = await response.json();
    assert.equal(data.sales.length, 50);
    assert.equal(data.nextCursor, 51);
    assert.equal(data.sales.at(-1).id, 51);
  } finally {
    await app.close();
  }
});
