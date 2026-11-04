import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";

test("contratos de procedimentos e estoque preservam envelopes, preços numéricos e quantidades string", async () => {
  const app = await contractApp();
  try {
    const procedure = {
      id: 1,
      name: "Depilação a laser",
      categoryId: 1,
      description: null,
      coverImageUrl: null,
      detailImageUrl: null,
      durationMinutes: 30,
      price: "100.00",
      active: true,
      category: { id: 1, name: "Laser" },
      variations: [
        {
          id: 2,
          groupName: "Corpo",
          name: "Axilas",
          reference: null,
          price: "90.00",
          active: true,
          sortOrder: 0,
        },
      ],
    };
    app.db.procedureCategory.findMany = async () => [
      { id: 1, name: "Laser", procedures: [procedure] },
    ];
    app.db.procedure.findUnique = async () => procedure;
    app.db.procedureMaterial.findMany = async () => [
      {
        stockItemId: 3,
        quantity: "1.5",
        stockItem: { name: "Gel", unit: "ml" },
      },
    ];
    app.db.stockItem.findMany = async () => [
      {
        id: 3,
        name: "Gel",
        unit: "ml",
        quantity: "8.25",
        minQuantity: "10",
        active: true,
      },
    ];
    await app.start();
    assert.equal(
      (await app.request("/api/v1/procedures/1", { role: "ANONYMOUS" })).status,
      401,
    );
    const catalog = await app.request("/api/v1/public/catalog", {
      role: "ANONYMOUS",
    });
    assert.equal(catalog.status, 200);
    const publicData: any = await catalog.json();
    assert.equal(publicData.categories[0].procedures[0].displayPrice, 90);
    const response = await app.request("/api/v1/procedures/1");
    assert.equal(response.status, 200);
    const data: any = await response.json();
    assert.equal(data.categoryName, "Laser");
    assert.equal(data.hasVariations, true);
    assert.equal(data.variations[0].price, 90);
    assert.equal(data.price, 100);
    const materials: any = await (
      await app.request("/api/v1/procedures/1/materials")
    ).json();
    assert.deepEqual(materials, {
      materials: [
        { stockItemId: 3, itemName: "Gel", unit: "ml", quantity: "1.5" },
      ],
    });
    const stock: any = await (await app.request("/api/v1/stock/items")).json();
    assert.equal(stock.items[0].quantity, "8.25");
    assert.equal(stock.items[0].minQuantity, "10");
    assert.equal(stock.items[0].isLow, true);
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/materials", {
          method: "PUT",
          role: "FUNCIONARIO",
          body: [],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request("/api/v1/stock/items", {
          method: "POST",
          role: "FUNCIONARIO",
          body: {},
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
