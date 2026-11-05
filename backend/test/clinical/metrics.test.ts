import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaProcedureMetricsQueries } from "../../src/procedure-metrics/infrastructure/prisma-procedure-metrics.queries";
test("procedure metrics distinguish usage answers and attribute shot corrections to the original execution month", async () => {
  const db: any = {
    procedureExecution: {
      groupBy: async ({ by, where }: any) =>
        by.includes("variationId")
          ? [{ procedureId: 1, variationId: 8, _count: { id: 2 } }]
          : [
              {
                procedureId: 1,
                _count: {
                  id: where.attendance.completedAt.gte
                    .toISOString()
                    .startsWith("2026-11")
                    ? 2
                    : 1,
                },
              },
            ],
      findMany: async () => [{ id: 1, procedureId: 1 }],
    },
    materialUsage: {
      groupBy: async () => [
        {
          executionId: 1,
          stockItemId: 3,
          materialName: "Gel",
          usage: "SMALL",
          _count: { id: 1 },
        },
        {
          executionId: 1,
          stockItemId: 3,
          materialName: "Gel",
          usage: "NOT_USED",
          _count: { id: 1 },
        },
      ],
    },
    procedure: { findMany: async () => [{ id: 1, name: "Current label" }] },
    procedureVariation: {
      findMany: async () => [{ id: 8, name: "Current area label" }],
    },
    shotLedgerEntry: {
      findMany: async () =>
        [20, -20, 15]
          .map((quantityDelta) => ({
            quantityDelta,
            execution: {
              procedureId: 1,
              attendance: { completedAt: new Date("2026-11-02T12:00Z") },
            },
          }))
          .concat([
            {
              quantityDelta: 40,
              execution: {
                procedureId: 1,
                attendance: { completedAt: new Date("2026-10-02T12:00Z") },
              },
            },
          ]),
    },
  };
  const result = await new PrismaProcedureMetricsQueries(db).monthly("2026-11");
  const p = result.procedures[0];
  assert.equal(result.previousMonth, "2026-10");
  assert.equal(p.executions, 2);
  assert.equal(p.previousExecutions, 1);
  assert.equal(p.shots, 15);
  assert.equal(p.previousShots, 40);
  assert.deepEqual(p.materials, [
    { stockItemId: 3, materialName: "Gel", used: 0, small: 1, notUsed: 1 },
  ]);
  assert.deepEqual(p.options, [
    { variationId: 8, name: "Current area label", executions: 2 },
  ]);
});
