import { test } from "node:test";
import assert from "node:assert/strict";
import { Money, allocate } from "../../src/commercial/domain/money";
import { Discount } from "../../src/commercial/domain/discount";
import {
  CommercialOffer,
  validDay,
} from "../../src/commercial/domain/commercial-offer";
import { Sale, ResolvedSaleItem } from "../../src/commercial/domain/sale";
import { SessionEntitlement } from "../../src/commercial/domain/session-entitlement";
test("money rejects fractional cents and allocation preserves exact totals with deterministic rounding", () => {
  assert.equal(Money.from("0.10").times(3).cents, 30);
  assert.throws(() => Money.from(0.001));
  assert.throws(() => Money.from(Infinity));
  assert.throws(() => Money.from(-1));
  assert.deepEqual(allocate(1, [1, 1, 1]), [1, 0, 0]);
  assert.deepEqual(allocate(5000, [51000, 34000]), [3000, 2000]);
  for (let n = 1; n < 100; n++) {
    const total = n * 17,
      weights = [n, n + 1, n + 2];
    assert.equal(
      allocate(total, weights).reduce((a, b) => a + b, 0),
      total,
    );
  }
  assert.deepEqual(allocate(0, [0, 0]), [0, 0]);
  assert.throws(() => allocate(1, [0, 0]));
});
test("discount requires a reason, respects its base and stores exact percentage semantics", () => {
  assert.equal(
    Discount.calculate(10001, {
      type: "PERCENT",
      value: 10,
      reason: "Commercial negotiation",
    }),
    1000,
  );
  assert.equal(
    Discount.calculate(100, {
      type: "PERCENT",
      value: 12.5,
      reason: "Negotiation",
    }),
    13,
  );
  assert.throws(() =>
    Discount.calculate(100, { type: "FIXED", value: 2, reason: "Discount" }),
  );
  assert.throws(() =>
    Discount.calculate(10000, {
      type: "PERCENT",
      value: 101,
      reason: "Discount",
    }),
  );
  assert.throws(() =>
    Discount.calculate(10000, { type: "FIXED", value: 1, reason: " " }),
  );
});
test("offer versions have real dates, explicit session validity and cannot duplicate an area", () => {
  const input = {
    name: "Laser package",
    startsOn: "2026-11-01",
    endsOn: "2026-12-01",
    sessionValidityDays: 365,
    price: 850,
    terms: null,
    items: [{ procedureId: 1, variationId: 2, sessions: 10 }],
  };
  const items = [
    {
      procedureId: 1,
      variationId: 2,
      procedureName: "Laser",
      variationName: "Area",
      sessions: 10,
      referenceUnitPrice: 100,
    },
  ];
  assert.deepEqual(CommercialOffer.validate(input, items), {
    reference: 100000,
    price: 85000,
  });
  assert.equal(validDay("2026-02-30"), false);
  assert.throws(() =>
    CommercialOffer.validate({ ...input, endsOn: "2026-10-01" }, items),
  );
  assert.throws(() =>
    CommercialOffer.validate({ ...input, price: 1001 }, items),
  );
  assert.throws(() => CommercialOffer.validate(input, [...items, ...items]));
  assert.throws(() => CommercialOffer.validate(input, items, "2026-11-02"));
});
test("scheduled versions do not replace current terms early and expired revisions do not resurrect old prices", () => {
  const old = {
      id: 1,
      version: 1,
      startsOn: new Date("2026-01-01"),
      endsOn: null,
    },
    newer = {
      id: 2,
      version: 2,
      startsOn: new Date("2026-11-01"),
      endsOn: new Date("2026-11-30"),
    };
  assert.equal(CommercialOffer.effective([old, newer], "2026-10-31")?.id, 1);
  assert.equal(CommercialOffer.effective([old, newer], "2026-11-15")?.id, 2);
  assert.equal(
    CommercialOffer.effective([old, newer], "2026-12-01"),
    undefined,
  );
});
const line = (
  referenceCents: number,
  promotionalCents: number,
): ResolvedSaleItem => ({
  procedureId: 1,
  variationId: 2,
  description: "Contract snapshot",
  variationName: "Area",
  sessions: 10,
  unitPrice: referenceCents / 1000,
  referenceCents,
  promotionalCents,
  offeredCents: referenceCents - promotionalCents,
  expiresAt: null,
  purchaseIndex: 0,
});
test("a 1000 reference, 850 offer and 50 additional discount produce an auditable 800 contract", () => {
  const sale = Sale.confirm([line(60000, 9000), line(40000, 6000)], {
    type: "FIXED",
    value: 50,
    reason: "Authorized negotiation",
  });
  assert.equal(sale.totalCents, 80000);
  assert.deepEqual(
    sale.items.map((i) => i.netCents),
    [48000, 32000],
  );
  assert.equal(
    sale.items.reduce((n, i) => n + i.promotionalCents, 0),
    15000,
  );
  sale.assertPayment(800);
  assert.throws(() => sale.assertPayment(800.01));
  assert.throws(() => Sale.assertCancellation(1, 0, 0));
  assert.throws(() => Sale.assertCancellation(0, 1, 0));
  assert.throws(() => Sale.assertCancellation(0, 0, 1));
  Sale.assertCancellation(0, 0, 0);
});
test("session rights require the same customer, procedure and area, valid payment and uncommitted balance", () => {
  const input = {
    customerId: 1,
    ownerId: 1,
    procedureId: 2,
    expectedProcedureId: 2,
    variationId: 3,
    expectedVariationId: 3,
    at: new Date(),
    cancelled: false,
    paymentAllowed: true,
  };
  new SessionEntitlement(10, 8, 1, null).assertAvailable(input);
  assert.throws(() =>
    new SessionEntitlement(10, 9, 1, null).assertAvailable(input),
  );
  for (const patch of [
    { customerId: 2 },
    { variationId: null },
    { procedureId: 4 },
    { cancelled: true },
    { paymentAllowed: false },
  ])
    assert.throws(() =>
      new SessionEntitlement(10, 0, 0, null).assertAvailable({
        ...input,
        ...patch,
      }),
    );
  assert.throws(() =>
    new SessionEntitlement(10, 0, 0, new Date(Date.now() - 1)).assertAvailable(
      input,
    ),
  );
});

test("offer aggregate publishes new immutable conditions while preserving paused state", () => {
  const offer = CommercialOffer.create("Draft");
  const input = {
    name: "Published",
    startsOn: "2026-11-01",
    endsOn: null,
    sessionValidityDays: null,
    price: 80,
    terms: null,
    items: [{ procedureId: 1, variationId: null, sessions: 1 }],
  };
  const items = [
    {
      procedureId: 1,
      variationId: null,
      procedureName: "Procedure",
      variationName: null,
      sessions: 1,
      referenceUnitPrice: 100,
    },
  ];
  assert.equal(offer.publish(input, items, "2026-11-01").version, 1);
  offer.changeState(false, "Campaign paused");
  assert.equal(offer.snapshot().active, false);
  assert.equal(
    offer.publish(
      { ...input, name: "Revision", startsOn: "2026-11-02", price: 90 },
      items,
      "2026-11-02",
    ).version,
    2,
  );
  assert.equal(offer.snapshot().active, false);
  assert.throws(() => offer.changeState(true, " "));
});
