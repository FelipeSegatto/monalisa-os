import { test } from "node:test";
import assert from "node:assert/strict";
import { contractApp } from "./app-harness";

test("commercial HTTP preserves offer snapshots, audits discounts, creates session rights and prevents double commitment of the last session", async () => {
  const app = await contractApp();
  let state: any = {
    sales: [],
    items: [],
    purchases: [],
    discounts: [],
    rights: [],
    payments: [],
    receivables: [],
    allocations: [],
    events: [],
    redemptions: [],
    reservations: [],
  };
  const customer = { id: 3, name: "Synthetic customer" },
    pro = { id: 1, name: "Synthetic professional", active: true };
  const version: any = {
    id: 20,
    offerId: 1,
    version: 1,
    name: "Laser 10 sessions",
    startsOn: new Date("2020-01-01"),
    endsOn: null,
    sessionValidityDays: 365,
    price: "850",
    referenceAmount: "1000",
    items: [
      {
        id: 21,
        procedureId: 4,
        variationId: 8,
        procedureName: "Laser snapshot",
        variationName: "Area snapshot",
        sessions: 10,
        referenceUnitPrice: "100",
      },
    ],
  };
  const assemble = (s: any) =>
    s
      ? {
          ...s,
          customer,
          professional: pro,
          items: state.items.filter((i: any) => i.saleId === s.id),
          offerPurchases: state.purchases
            .filter((i: any) => i.saleId === s.id)
            .map((p: any) => ({ ...p, version })),
          payments: state.payments
            .filter((i: any) => i.saleId === s.id)
            .map((p: any) => ({
              ...p,
              reversal: null,
              allocations: state.allocations.filter(
                (a: any) => a.paymentId === p.id,
              ),
            })),
          discountRecords: state.discounts.filter(
            (i: any) => i.saleId === s.id,
          ),
          receivables: state.receivables
            .filter((r: any) => r.saleId === s.id)
            .map((r: any) => ({
              ...r,
              allocations: state.allocations
                .filter((a: any) => a.receivableId === r.id)
                .map((a: any) => ({ ...a, payment: { reversal: null } })),
            })),
          events: state.events.filter((i: any) => i.saleId === s.id),
          entitlements: state.rights
            .filter((i: any) => i.saleId === s.id)
            .map((e: any) => ({
              ...e,
              redemptions: state.redemptions
                .filter((r: any) => r.entitlementId === e.id)
                .map((r: any) => ({ ...r, reversal: null })),
            })),
        }
      : null;
  const create =
    (table: string) =>
    async ({ data }: any) => {
      const row = {
        id: state[table].length + 1,
        createdAt: new Date(),
        ...data,
      };
      state[table].push(row);
      return row;
    };
  app.db.customer.findUnique = async () => customer;
  app.db.professional.findUnique = async () => pro;
  app.db.procedure.findUnique = async () => ({
    id: 4,
    name: "Laser current",
    active: true,
    price: "100",
    variations: [{ id: 8, name: "Area current", active: true, price: "100" }],
  });
  app.db.commercialOfferVersion.findMany = async () => [version];
  app.db.commercialOfferVersion.findUnique = async () => ({
    ...version,
    offer: { id: 1, active: true, versions: [version] },
  });
  app.db.sale.findUnique = async ({ where }: any) =>
    assemble(
      state.sales.find((s: any) =>
        where.requestKey
          ? s.requestKey === where.requestKey
          : s.id === where.id,
      ),
    );
  app.db.sale.findMany = async () => state.sales.map(assemble);
  app.db.sale.create = create("sales");
  app.db.saleItem.create = create("items");
  app.db.saleOfferPurchase.create = create("purchases");
  app.db.saleDiscount.create = create("discounts");
  app.db.commercialEvent.create = create("events");
  app.db.sessionEntitlement.create = create("rights");
  app.db.sessionEntitlement.findMany = async ({ where }: any) =>
    state.rights.filter((r: any) =>
      where.customerId
        ? r.customerId === where.customerId
        : where.id?.in
          ? where.id.in.includes(r.id)
          : true,
    );
  app.db.sessionEntitlement.findUnique = async ({ where }: any) => {
    const e = state.rights.find((e: any) => e.id === where.id);
    return e
      ? {
          ...e,
          sale: assemble(state.sales.find((s: any) => s.id === e.saleId)),
        }
      : null;
  };
  app.db.salePayment.create = create("payments");
  app.db.salePayment.findUnique = async ({ where }: any) =>
    state.payments.find((p: any) => p.requestKey === where.requestKey) ?? null;
  app.db.receivableInstallment.create = create("receivables");
  app.db.paymentAllocation.create = create("allocations");
  app.db.sessionRedemption.aggregate = async ({ where }: any) => ({
    _sum: {
      quantityDelta: state.redemptions
        .filter((r: any) => r.entitlementId === where.entitlementId)
        .reduce((n: number, r: any) => n + r.quantityDelta, 0),
    },
  });
  app.db.sessionReservation.count = async ({ where }: any) =>
    state.reservations.filter(
      (r: any) =>
        r.entitlementId === where.entitlementId &&
        r.status === "ACTIVE" &&
        r.appointmentId !== where.appointmentId?.not,
    ).length;
  app.db.sessionReservation.findUnique = async ({ where }: any) =>
    state.reservations.find(
      (r: any) => r.appointmentId === where.appointmentId,
    ) ?? null;
  app.db.sessionReservation.upsert = async ({ where, create, update }: any) => {
    const old = state.reservations.find(
      (r: any) => r.appointmentId === where.appointmentId,
    );
    if (old) return Object.assign(old, update);
    const row = {
      id: state.reservations.length + 1,
      status: "ACTIVE",
      ...create,
    };
    state.reservations.push(row);
    return row;
  };
  app.db.appointment.findUnique = async ({ where }: any) => ({
    id: where.id,
    customerId: 3,
    procedureId: 4,
    professionalId: 1,
    status: "CONFIRMED",
    startsAt: new Date(Date.now() + 3600000),
    expiresAt: null,
  });
  app.db.$transaction = async (work: any) => {
    const old = structuredClone(state);
    try {
      return await work({ ...app.db, $queryRaw: async () => [{ id: 1 }] });
    } catch (e) {
      state = old;
      throw e;
    }
  };
  try {
    await app.start();
    const body = {
      customerId: 3,
      professionalId: 1,
      allowUnpaidUse: false,
      requestKey: "6471ab53-67dc-4acb-bd58-4dce912f2544",
      lines: [{ offerVersionId: 20, quantity: 1 }],
      discount: {
        type: "FIXED",
        value: 50,
        reason: "Approved commercial negotiation",
      },
    };
    const response = await app.request("/api/v1/commercial/sales", {
      method: "POST",
      body,
    });
    assert.equal(response.status, 201);
    const sale: any = await response.json();
    assert.equal(sale.total, 800);
    assert.equal(sale.items[0].referenceAmount, 1000);
    assert.equal(sale.items[0].promotionalDiscount, 150);
    assert.equal(sale.items[0].netAmount, 800);
    assert.equal(sale.items[0].variationId, 8);
    assert.equal(sale.offerPurchases[0].offerName, "Laser 10 sessions");
    assert.equal(state.rights[0].quantity, 10);
    assert.equal(state.discounts.length, 2);
    assert.equal(state.discounts[1].actorId, 7);
    assert.equal(state.discounts[1].reason, body.discount.reason);
    assert.equal(
      (await app.request("/api/v1/commercial/sales", { method: "POST", body }))
        .status,
      201,
    );
    assert.equal(state.sales.length, 1);
    const rightsWriter = app.db.sessionEntitlement.create;
    app.db.sessionEntitlement.create = async () => {
      throw new Error("Simulated persistence failure");
    };
    assert.equal(
      (
        await app.request("/api/v1/commercial/sales", {
          method: "POST",
          body: { ...body, requestKey: "6471ab53-67dc-4acb-bd58-4dce912f2545" },
        })
      ).status,
      500,
    );
    assert.equal(state.sales.length, 1);
    assert.equal(state.items.length, 1);
    app.db.sessionEntitlement.create = rightsWriter;

    assert.equal(
      (
        await app.request("/api/v1/commercial/sales", {
          method: "POST",
          body: { ...body, discount: { ...body.discount, value: 60 } },
        })
      ).status,
      409,
    );
    let rights: any = await (
      await app.request("/api/v1/commercial/customers/3/entitlements")
    ).json();
    assert.equal(rights.entitlements[0].status, "AWAITING_PAYMENT");
    assert.equal(rights.entitlements[0].available, 0);
    const reservation = { entitlementId: 1, variationId: 8 };
    assert.equal(
      (
        await app.request(
          "/api/v1/commercial/appointments/5/session-reservation",
          { method: "POST", body: reservation },
        )
      ).status,
      409,
    );
    const payment = {
      amount: 800,
      method: "PIX",
      installments: null,
      requestKey: "6c5fe54e-3ad5-42f9-82ec-380ad09c221e",
    };
    assert.equal(
      (
        await app.request("/api/v1/commercial/sales/1/payments", {
          method: "POST",
          body: { ...payment, amount: 801 },
        })
      ).status,
      409,
    );
    const paid = await app.request("/api/v1/commercial/sales/1/payments", {
      method: "POST",
      body: payment,
    });
    assert.equal(paid.status, 201);
    assert.equal((await paid.json()).balance, 0);
    assert.equal(
      (
        await app.request("/api/v1/commercial/sales/1/payments", {
          method: "POST",
          body: payment,
        })
      ).status,
      201,
    );
    assert.equal(state.payments.length, 1);
    assert.equal(state.allocations[0].amount, 800);
    state.redemptions = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      entitlementId: 1,
      quantityDelta: 1,
    }));
    assert.equal(
      (
        await app.request(
          "/api/v1/commercial/appointments/5/session-reservation",
          { method: "POST", body: reservation, role: "FUNCIONARIO" },
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await app.request(
          "/api/v1/commercial/appointments/6/session-reservation",
          { method: "POST", body: reservation, role: "FUNCIONARIO" },
        )
      ).status,
      409,
    );
    assert.equal(state.reservations.length, 1);
    rights = await (
      await app.request("/api/v1/commercial/customers/3/entitlements")
    ).json();
    assert.equal(rights.entitlements[0].reserved, 1);
    assert.equal(rights.entitlements[0].available, 0);
    version.name = "Renamed later";
    assert.equal(
      (await (await app.request("/api/v1/commercial/sales/1")).json())
        .offerPurchases[0].offerName,
      "Laser 10 sessions",
    );
  } finally {
    await app.close();
  }
});

test("commercial configuration, cancellations and reversals require administrator; staff cannot approve unpaid use", async () => {
  const app = await contractApp();
  try {
    await app.start();
    for (const [path, method] of [
      ["offers", "POST"],
      ["offers/1/versions", "POST"],
      ["offers/1/state", "PATCH"],
      ["sales/1/cancellation", "POST"],
      ["payments/1/reversal", "POST"],
      ["redemptions/1/reversal", "POST"],
    ] as const) {
      assert.equal(
        (
          await app.request("/api/v1/commercial/" + path, {
            method,
            body: {},
            role: "FUNCIONARIO",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await app.request("/api/v1/commercial/" + path, {
            method,
            body: {},
            role: "ANONYMOUS",
          })
        ).status,
        401,
      );
    }
    assert.equal(
      (
        await app.request("/api/v1/commercial/sales", {
          method: "POST",
          body: {
            customerId: 3,
            professionalId: 1,
            allowUnpaidUse: true,
            requestKey: "99bd4321-3480-49c3-93b9-c61bf5857a4d",
            lines: [{ procedureId: 4, sessions: 1 }],
          },
          role: "FUNCIONARIO",
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
