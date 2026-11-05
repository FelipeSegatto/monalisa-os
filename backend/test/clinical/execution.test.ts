import { test } from "node:test";
import assert from "node:assert/strict";
import { ProcedureExecution } from "../../src/attendances/domain/procedure-execution";
import { ExecutionInput } from "../../src/attendances/domain/attendance";
const input: ExecutionInput = {
  procedureId: 1,
  professionalId: 1,
  materials: [
    { stockItemId: 3, usage: "SMALL" },
    { stockItemId: 4, usage: "NOT_USED" },
  ],
  shots: [],
};
const context = {
  procedure: {
    id: 1,
    name: "Any name",
    active: true,
    requiresEquipment: false,
    technology: "GENERAL",
    equipmentReviewedAt: null,
  },
  variation: null,
  equipment: null,
  expectedMaterialIds: [3, 4],
  materials: [
    { id: 3, name: "Gel", active: true },
    { id: 4, name: "Espátula", active: true },
  ],
};
test("every expected material needs an explicit answer, including small amounts and non-use", () => {
  const record = ProcedureExecution.record(input, context).snapshot();
  assert.deepEqual(
    record.materials.map((m) => m.usage),
    ["SMALL", "NOT_USED"],
  );
  assert.throws(
    () =>
      ProcedureExecution.record(
        { ...input, materials: [input.materials[0]] },
        context,
      ),
    /Confirme o uso/,
  );
  assert.throws(
    () =>
      ProcedureExecution.record(
        {
          ...input,
          materials: [...input.materials, { stockItemId: 8, usage: "USED" }],
        },
        context,
      ),
    /Material/,
  );
});
test("material and procedure names are snapshots and not mutable by caller", () => {
  const source = structuredClone(context),
    answers = structuredClone(input),
    record = ProcedureExecution.record(answers, source);
  source.materials[0].name = "Changed";
  source.procedure.name = "Changed";
  answers.materials[0].usage = "USED";
  assert.equal(record.snapshot().procedureName, "Any name");
  assert.equal(record.snapshot().materials[0].materialName, "Gel");
  assert.equal(record.snapshot().materials[0].usage, "SMALL");
});
test("mandatory equipment and HIFU cartridge tracking are domain rules", () => {
  const hifu = {
    ...context,
    procedure: {
      ...context.procedure,
      requiresEquipment: true,
      technology: "HIFU",
      equipmentReviewedAt: new Date(),
    },
  };
  assert.throws(
    () => ProcedureExecution.record(input, hifu),
    /Equipamento obrigatório/,
  );
  assert.throws(
    () =>
      ProcedureExecution.record(input, {
        ...hifu,
        equipment: {
          id: 2,
          status: "ACTIVE",
          shotTracking: "EQUIPMENT",
          compatible: true,
        },
      }),
    /cartucho/,
  );
  const eq = {
    id: 2,
    status: "ACTIVE",
    shotTracking: "COMPONENT",
    compatible: true,
  };
  assert.throws(
    () => ProcedureExecution.record(input, { ...hifu, equipment: eq }),
    /disparos/,
  );
  ProcedureExecution.record(
    { ...input, equipmentId: 2, shots: [{ componentId: 5, quantity: 10 }] },
    { ...hifu, equipment: eq },
  );
  assert.throws(
    () =>
      ProcedureExecution.record(
        { ...input, shots: [{ quantity: 10 }] },
        { ...hifu, equipment: eq },
      ),
    /contador/,
  );
  assert.throws(
    () =>
      ProcedureExecution.record(
        { ...input, shots: [{ componentId: 5, quantity: 10 }] },
        { ...hifu, equipment: { ...eq, status: "MAINTENANCE" } },
      ),
    /indisponível/,
  );
});
test("general procedures can use materials alone, equipment alone, both, or neither", () => {
  const empty = { ...context, expectedMaterialIds: [], materials: [] };
  ProcedureExecution.record({ ...input, materials: [] }, empty);
  ProcedureExecution.record(input, context);
  const withEq = {
    ...context,
    equipment: {
      id: 2,
      status: "ACTIVE",
      shotTracking: "NONE",
      compatible: true,
    },
    procedure: { ...context.procedure, equipmentReviewedAt: new Date() },
  };
  ProcedureExecution.record({ ...input, equipmentId: 2 }, withEq);
  ProcedureExecution.record(
    { ...input, equipmentId: 2, materials: [] },
    { ...withEq, expectedMaterialIds: [], materials: [] },
  );
});
