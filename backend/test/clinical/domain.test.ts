import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PriorityAssignmentPolicy,
  assignmentPolicy,
} from "../../src/scheduling/domain/assignment-policy";
import { WorkingCalendar } from "../../src/scheduling/domain/working-calendar";
import { ProcedureQualifications } from "../../src/professionals/domain/procedure-qualifications";
import { StockBalance } from "../../src/inventory/domain/stock-balance";
import { ShotCounter } from "../../src/shot-ledger/domain/shot-counter";
import {
  Attendance,
  ExecutionInput,
} from "../../src/attendances/domain/attendance";
test("priority is configurable, filters unconfigured professionals, and never mutates candidates", () => {
  const input = [
    { id: 5, priority: 2 },
    { id: 3, priority: null },
    { id: 9, priority: 1 },
    { id: 1, priority: 1 },
  ];
  assert.deepEqual(new PriorityAssignmentPolicy().order(input), [1, 9, 5]);
  assert.equal(input[0].id, 5);
  assert.deepEqual(assignmentPolicy("MANUAL").order(input), []);
  assert.throws(() => assignmentPolicy("invented"));
});
test("qualification is explicit, duplicates and unknown IDs are rejected", () => {
  const q = new ProcedureQualifications([1, 2]);
  q.assertQualified(2);
  assert.throws(() => q.assertQualified(3));
  assert.throws(() => new ProcedureQualifications([1, 1]));
  assert.throws(() => new ProcedureQualifications([0]));
});
test("calendar respects Sao Paulo timezone, boundaries, split shifts and weekday", () => {
  const calendar = new WorkingCalendar([
    { weekday: 1, startMinute: 540, endMinute: 720 },
    { weekday: 1, startMinute: 780, endMinute: 1020 },
  ]);
  assert.equal(
    calendar.includes(
      new Date("2030-01-07T12:00Z"),
      new Date("2030-01-07T15:00Z"),
    ),
    true,
  );
  assert.equal(
    calendar.includes(
      new Date("2030-01-07T14:30Z"),
      new Date("2030-01-07T16:30Z"),
    ),
    false,
  );
  assert.equal(
    calendar.includes(
      new Date("2030-01-08T12:00Z"),
      new Date("2030-01-08T13:00Z"),
    ),
    false,
  );
  assert.equal(new WorkingCalendar([]).includes(new Date(), new Date()), false);
  assert.throws(
    () => new WorkingCalendar([{ weekday: 7, startMinute: 0, endMinute: 60 }]),
  );
  assert.throws(
    () =>
      new WorkingCalendar([
        { weekday: 1, startMinute: 0, endMinute: 60 },
        { weekday: 1, startMinute: 30, endMinute: 90 },
      ]),
  );
});
test("stock ledger uses exact thousandths and consumption is separate from material usage", () => {
  const balance = new StockBalance(0.3);
  assert.deepEqual(balance.move("CONSUMPTION", 0.1), {
    delta: -0.1,
    balance: 0.2,
  });
  assert.throws(() => balance.move("CONSUMPTION", 1));
  assert.throws(() => balance.move("IN", -1));
  assert.throws(() => balance.move("ADJUSTMENT", 0));
  assert.throws(() => balance.move("IN", 0.0001));
  assert.deepEqual(new StockBalance(3).move("CONSUMPTION", 1), {
    delta: -1,
    balance: 2,
  });
});
test("shot counter prevents over-capacity, negative total and fractional shots", () => {
  assert.equal(new ShotCounter(90, 100).apply(10), 100);
  assert.equal(new ShotCounter(90, 100).apply(-10), 80);
  assert.throws(() => new ShotCounter(90, 100).apply(11));
  assert.throws(() => new ShotCounter(0, null).apply(-1));
  assert.throws(() => new ShotCounter(1, null).apply(0.5));
});
const e: ExecutionInput = {
  procedureId: 1,
  professionalId: 1,
  materials: [{ stockItemId: 1, usage: "NOT_USED" }],
  shots: [],
};
test("attendance rejects repeated materials, repeated cartridge counters and invalid lifecycle", () => {
  const start = new Date(Date.now() - 1000),
    end = new Date();
  new Attendance(start, "IN_PROGRESS").complete([e], end);
  assert.throws(() => new Attendance(start, "COMPLETED").complete([e], end));
  assert.throws(() => new Attendance(start, "IN_PROGRESS").complete([], end));
  assert.throws(() =>
    new Attendance(start, "IN_PROGRESS").complete(
      [{ ...e, materials: [...e.materials, ...e.materials] }],
      end,
    ),
  );
  assert.throws(() =>
    new Attendance(start, "IN_PROGRESS").complete(
      [
        {
          ...e,
          shots: [
            { componentId: 2, quantity: 1 },
            { componentId: 2, quantity: 1 },
          ],
        },
      ],
      end,
    ),
  );
  assert.throws(() =>
    new Attendance(start, "IN_PROGRESS").complete([e], new Date(+start - 1)),
  );
});

test("in-progress attendance can be cancelled with a reason, without erasing history", () => {
  const a = new Attendance(new Date(Date.now() - 1000), "IN_PROGRESS");
  assert.throws(() => a.cancel(" "));
  assert.equal(a.cancel("  Started by mistake  "), "Started by mistake");
  assert.throws(() => a.complete([e], new Date()));
  assert.throws(() =>
    new Attendance(new Date(), "COMPLETED").cancel("Cannot cancel completed"),
  );
});

test("balanced policy rotates ties deterministically, ignores priority and requires measured workload", async () => {
  const { BalancedAssignmentPolicy } =
    await import("../../src/scheduling/domain/assignment-policy");
  const input = [
    { id: 1, priority: 0, reservedMinutes: 60 },
    { id: 2, priority: null, reservedMinutes: 30 },
    { id: 3, priority: 100, reservedMinutes: 30 },
  ];
  assert.deepEqual(new BalancedAssignmentPolicy(2).order(input), [3, 2, 1]);
  assert.equal(input[0].id, 1);
  assert.deepEqual(new BalancedAssignmentPolicy(99).order(input), [2, 3, 1]);
  assert.throws(
    () => new BalancedAssignmentPolicy().order([{ id: 1, priority: 0 }]),
    /Carga/,
  );
  assert.throws(
    () =>
      new BalancedAssignmentPolicy().order([
        { id: 1, priority: 0, reservedMinutes: -1 },
      ]),
    /Carga/,
  );
});
