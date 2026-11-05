import { test } from "node:test";
import assert from "node:assert/strict";
import { ExpenseDistribution } from "../../src/expenses/domain/expense-distribution";
import { Expense } from "../../src/expenses/domain/expense";
test("rateio by value must close exactly to the total and rejects duplicate procedures", () => {
  const d = ExpenseDistribution.compute(
    200,
    "MIXED",
    "VALUE",
    [
      { procedureId: 1, value: 120 },
      { procedureId: 2, value: 50 },
      { procedureId: null, value: 30 },
    ],
    "Depilação, HIFU e parcela geral",
  );
  assert.deepEqual(
    d.lines.map((l) => l.amountCents),
    [12000, 5000, 3000],
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      200,
      "MIXED",
      "VALUE",
      [
        { procedureId: 1, value: 120 },
        { procedureId: 2, value: 50 },
        { procedureId: null, value: 29 },
      ],
      "fecha errado",
    ),
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      200,
      "PROCEDURES",
      "VALUE",
      [
        { procedureId: 1, value: 100 },
        { procedureId: 1, value: 100 },
      ],
      "duplicado",
    ),
  );
});
test("rateio by percent must close exactly to 100% and distributes cents without losing the remainder", () => {
  const d = ExpenseDistribution.compute(
    100,
    "PROCEDURES",
    "PERCENT",
    [
      { procedureId: 1, value: 33.34 },
      { procedureId: 2, value: 33.33 },
      { procedureId: 3, value: 33.33 },
    ],
    "três partes iguais",
  );
  assert.equal(
    d.lines.reduce((n, l) => n + l.amountCents, 0),
    10000,
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "PROCEDURES",
      "PERCENT",
      [
        { procedureId: 1, value: 50 },
        { procedureId: 2, value: 49 },
      ],
      "não fecha 100%",
    ),
  );
});
test("destination enforces the shape of the general portion", () => {
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "GENERAL",
      "VALUE",
      [{ procedureId: 1, value: 100 }],
      "geral não deveria ter procedimento",
    ),
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "PROCEDURES",
      "VALUE",
      [
        { procedureId: 1, value: 50 },
        { procedureId: null, value: 50 },
      ],
      "procedimentos não deveria ter parcela geral",
    ),
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "MIXED",
      "VALUE",
      [{ procedureId: 1, value: 100 }],
      "mista exige parcela geral explícita",
    ),
  );
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "GENERAL",
      "VALUE",
      [{ procedureId: null, value: 100 }],
      "ok",
    ),
  );
});
test("distribution requires a non-trivial note", () => {
  assert.throws(() =>
    ExpenseDistribution.compute(
      100,
      "GENERAL",
      "VALUE",
      [{ procedureId: null, value: 100 }],
      "oi",
    ),
  );
});
test("a paid expense cannot be revised and full payment must match the current amount exactly", () => {
  assert.throws(() => Expense.assertRevisable(true));
  Expense.assertRevisable(false);
  assert.throws(() => Expense.assertPayment(199.99, 20000, false));
  Expense.assertPayment(200, 20000, false);
  assert.throws(() => Expense.assertPayment(200, 20000, true));
});
test("reversal requires an active payment and cannot repeat", () => {
  assert.throws(() => Expense.assertReversal(false, false));
  assert.throws(() => Expense.assertReversal(true, true));
  Expense.assertReversal(true, false);
});
test("cancellation requires reversing any active payment first", () => {
  assert.throws(() => Expense.assertCancellation(true));
  Expense.assertCancellation(false);
});
