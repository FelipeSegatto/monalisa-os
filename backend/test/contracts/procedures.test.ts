import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";
test("procedimento mantém opções por ID, política obrigatória e revisão de materiais em HTTP", async () => {
  const app = await contractApp();
  try {
    let row: any = {
      id: 1,
      categoryId: 1,
      name: "Ultrassom Microfocado",
      description: null,
      coverImageUrl: null,
      detailImageUrl: null,
      durationMinutes: 60,
      price: 900,
      active: false,
      technology: "HIFU",
      requiresEquipment: true,
      equipmentReviewedAt: null,
      materialsReviewedAt: null,
      category: { id: 1, name: "Ultrassom" },
      variations: [
        {
          id: 10,
          procedureId: 1,
          groupName: "Região",
          name: "Face",
          reference: null,
          price: 900,
          active: true,
          sortOrder: 0,
          kind: "AREA",
        },
      ],
      materials: [],
    };
    let equipmentStatus = "MAINTENANCE";
    app.db.procedure.findUnique = async ({ where }: any) =>
      where.id === 1 ? row : null;
    app.db.procedure.findUniqueOrThrow = async () => structuredClone(row);
    app.db.procedure.update = async ({ data }: any) => {
      Object.assign(row, data);
      return row;
    };
    app.db.procedureEquipment.findMany = async () => [{ equipmentId: 1 }];
    app.db.procedureVariation.updateMany = async ({ where, data }: any) => {
      const found = row.variations.find(
        (v: any) => v.id === where.id && v.procedureId === where.procedureId,
      );
      if (!found) return { count: 0 };
      Object.assign(found, data);
      return { count: 1 };
    };
    app.db.procedureVariation.create = async ({ data }: any) => {
      const option = { id: 11, ...data };
      row.variations.push(option);
      return option;
    };
    app.db.stockItem.findUnique = async () => ({ id: 2 });
    app.db.procedureMaterial.deleteMany = async () => {
      row.materials = [];
    };
    app.db.procedureMaterial.createMany = async ({ data }: any) => {
      row.materials = data;
    };
    app.db.procedureMaterial.findMany = async () =>
      row.materials.map((m: any) => ({
        ...m,
        stockItem: { name: "Gel", unit: "ml" },
      }));
    app.db.$transaction = async (work: any) => {
      const before = structuredClone(row);
      try {
        return await work({
          ...app.db,
          $queryRaw: async (strings: TemplateStringsArray) =>
            strings.join("").includes("Equipment")
              ? [{ id: 1, status: equipmentStatus }]
              : [{ id: 1 }],
        });
      } catch (error) {
        row = before;
        throw error;
      }
    };
    await app.start();
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/active", {
          method: "PATCH",
          body: { active: true },
        })
      ).status,
      409,
    );
    row.equipmentReviewedAt = new Date();
    equipmentStatus = "ACTIVE";
    const activated = await app.request("/api/v1/procedures/1/active", {
      method: "PATCH",
      body: { active: true },
    });
    assert.equal(activated.status, 200);
    assert.equal(((await activated.json()) as any).active, true);
    const body = {
      categoryId: 1,
      name: "HIFU revisado",
      description: null,
      durationMinutes: 60,
      price: 950,
      active: true,
      variations: [
        {
          id: 10,
          groupName: "Região",
          name: "Face completa",
          reference: null,
          price: 950,
          active: true,
        },
      ],
    };
    const saved = await app.request("/api/v1/procedures/1", {
      method: "PUT",
      body,
    });
    assert.equal(saved.status, 200);
    const data: any = await saved.json();
    assert.equal(data.requiresEquipment, true);
    assert.equal(data.technology, "HIFU");
    assert.equal(data.variations[0].id, 10);
    assert.equal(data.variations[0].kind, "AREA");
    assert.equal(data.variations[0].name, "Face completa");
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/resource-policy", {
          method: "PATCH",
          body: { technology: "HIFU", requiresEquipment: false },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/resource-policy", {
          method: "PATCH",
          role: "FUNCIONARIO",
          body: { technology: "HIFU", requiresEquipment: true },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request("/api/v1/procedures/1", {
          method: "PUT",
          body: { ...body, variations: [{ ...body.variations[0], id: 999 }] },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/materials", {
          method: "PUT",
          body: [{ stockItemId: 2, quantity: 1.5 }],
        })
      ).status,
      200,
    );
    assert.ok(row.materialsReviewedAt);
    const materials: any = await (
      await app.request("/api/v1/procedures/1/materials")
    ).json();
    assert.equal(materials.materials[0].quantity, "1.5");
    const omitted = await app.request("/api/v1/procedures/1", {
      method: "PUT",
      body: { ...body, variations: [] },
    });
    assert.equal(omitted.status, 200);
    assert.equal(row.variations[0].active, false);
    assert.equal(row.variations[0].id, 10);
  } finally {
    await app.close();
  }
});
