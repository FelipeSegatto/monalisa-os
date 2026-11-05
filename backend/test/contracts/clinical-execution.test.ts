import { test } from "node:test";
import assert from "node:assert/strict";
import { contractApp } from "./app-harness";

test("attendance requires qualification and every material answer; completion is atomic and idempotent without stock decrement", async () => {
  const app = await contractApp();
  let state: any = {
    attendance: null,
    executions: [],
    appointment: {
      id: 5,
      customerId: 3,
      professionalId: 1,
      procedureId: 2,
      status: "CONFIRMED",
    },
  };
  let qualified = false,
    stockWrites = 0;
  const professional = { id: 1, active: true };
  app.db.professional.findUnique = async () => ({
    ...professional,
    qualifications: qualified ? [{ procedureId: 2, active: true }] : [],
  });
  app.db.appointment.findUnique = async () => state.appointment;
  app.db.procedure.findUnique = async () => ({
    id: 2,
    name: "Procedure snapshot",
    active: true,
    technology: "GENERAL",
    requiresEquipment: false,
    equipmentReviewedAt: null,
  });
  app.db.procedureMaterial.findMany = async () => [{ stockItemId: 4 }];
  app.db.stockItem.findMany = async () => [
    { id: 4, name: "Gel snapshot", active: true },
  ];
  app.db.stockItem.update = async () => {
    stockWrites++;
    throw new Error("Material usage must not update stock");
  };
  app.db.stockMovement.create = async () => {
    stockWrites++;
    throw new Error("Material usage must not write stock movement");
  };
  app.db.attendance.findUnique = async () => state.attendance;
  app.db.attendance.findUniqueOrThrow = async () => ({
    ...state.attendance,
    executions: state.executions,
  });
  app.db.attendance.create = async ({ data }: any) => {
    state.attendance = {
      id: 9,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 1000),
      ...data,
    };
    return state.attendance;
  };
  app.db.attendance.update = async ({ data }: any) =>
    Object.assign(state.attendance, data);
  app.db.appointment.update = async ({ data }: any) =>
    Object.assign(state.appointment, data);
  app.db.procedureExecution.create = async ({ data }: any) => {
    const row = { id: state.executions.length + 1, ...data };
    state.executions.push(row);
    return row;
  };
  app.db.$transaction = async (work: any) => {
    const before = structuredClone(state);
    try {
      return await work({ ...app.db, $queryRaw: async () => [{ id: 1 }] });
    } catch (e) {
      state = before;
      throw e;
    }
  };
  try {
    await app.start();
    assert.equal(
      (
        await app.request("/api/v1/agenda/5/attendance", {
          method: "POST",
          role: "FUNCIONARIO",
        })
      ).status,
      409,
    );
    assert.equal(state.attendance, null);
    qualified = true;
    const start = await app.request("/api/v1/agenda/5/attendance", {
      method: "POST",
      role: "FUNCIONARIO",
    });
    assert.equal(start.status, 201);
    assert.equal((await start.json()).id, 9);
    const key = "a989acde-4f3d-4c5b-a099-b58bed17c001";
    const body = {
      requestKey: key,
      executions: [
        { procedureId: 2, professionalId: 1, materials: [], shots: [] },
      ],
    };
    assert.equal(
      (
        await app.request("/api/v1/attendances/9/completion", {
          method: "POST",
          body,
          role: "FUNCIONARIO",
        })
      ).status,
      409,
    );
    assert.equal(state.attendance.status, "IN_PROGRESS");
    assert.equal(state.executions.length, 0);
    const answered = {
      ...body,
      executions: [
        {
          ...body.executions[0],
          materials: [{ stockItemId: 4, usage: "SMALL" }],
        },
      ],
    };
    const complete = await app.request("/api/v1/attendances/9/completion", {
      method: "POST",
      body: answered,
      role: "FUNCIONARIO",
    });
    assert.equal(complete.status, 201);
    assert.equal(state.attendance.status, "COMPLETED");
    assert.equal(state.appointment.status, "COMPLETED");
    assert.equal(state.attendance.completedById, 8);
    assert.equal(state.executions[0].materials.create[0].usage, "SMALL");
    assert.equal(
      state.executions[0].materials.create[0].materialName,
      "Gel snapshot",
    );
    assert.equal(stockWrites, 0);
    assert.equal(
      (
        await app.request("/api/v1/attendances/9/completion", {
          method: "POST",
          body: answered,
          role: "FUNCIONARIO",
        })
      ).status,
      201,
    );
    assert.equal(state.executions.length, 1);
    const changed = {
      ...answered,
      executions: [
        {
          ...answered.executions[0],
          materials: [{ stockItemId: 4, usage: "NOT_USED" }],
        },
      ],
    };
    assert.equal(
      (
        await app.request("/api/v1/attendances/9/completion", {
          method: "POST",
          body: changed,
          role: "FUNCIONARIO",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await app.request("/api/v1/agenda/5/status", {
          method: "PATCH",
          body: { status: "COMPLETED" },
        })
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});

test("qualification settings and ledger corrections are protected against staff and anonymous writes", async () => {
  const app = await contractApp();
  try {
    await app.start();
    for (const [path, method, body] of [
      [
        "/api/v1/professionals/1/capabilities",
        "PUT",
        { procedureIds: [1], priority: 0, workingPeriods: [] },
      ],
      [
        "/api/v1/scheduling/settings",
        "PUT",
        {
          assignmentPolicy: "PRIORITY",
          confirmationMode: "AUTOMATIC",
          holdMinutes: 60,
        },
      ],
      ["/api/v1/equipment/1/shot-ledger", "POST", {}],
      ["/api/v1/shot-ledger/1/reversal", "POST", {}],
      ["/api/v1/shot-ledger/1/correction", "POST", {}],
      ["/api/v1/stock/movements/1/reversal", "POST", {}],
    ] as const) {
      assert.equal(
        (await app.request(path, { method, body, role: "FUNCIONARIO" })).status,
        403,
      );
      assert.equal(
        (await app.request(path, { method, body, role: "ANONYMOUS" })).status,
        401,
      );
    }
    assert.equal(
      (await app.request("/api/v1/procedure-metrics", { role: "FUNCIONARIO" }))
        .status,
      403,
    );
    assert.equal(
      (
        await app.request(
          "/api/v1/scheduling/available-professionals?procedureId=1&startsAt=invalid",
        )
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});
