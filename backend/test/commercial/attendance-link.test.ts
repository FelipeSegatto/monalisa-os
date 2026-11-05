import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaAttendanceRepository } from "../../src/attendances/infrastructure/prisma-attendance.repository";
import { ApplicationError } from "../../src/shared/domain/application-error";
function fixture(fail = false) {
  let state: any = {
    attendance: {
      id: 1,
      professionalId: 1,
      customerId: 3,
      appointmentId: 2,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 1000),
    },
    hold: {
      id: 1,
      entitlementId: 10,
      status: "ACTIVE",
      entitlement: { procedureId: 4, variationId: 8 },
    },
    executions: [],
    appointment: { id: 2, status: "CONFIRMED", procedureId: 4 },
  };
  let calls = 0;
  const markers: any[] = [];
  const db: any = {
    $queryRaw: async () => [{ id: 1 }],
    attendance: {
      findUnique: async () => state.attendance,
      findUniqueOrThrow: async () => ({
        ...state.attendance,
        executions: state.executions,
      }),
      update: async ({ data }: any) => Object.assign(state.attendance, data),
    },
    appointment: {
      findUnique: async () => state.appointment,
      update: async ({ data }: any) => Object.assign(state.appointment, data),
    },
    sessionReservation: { findUnique: async () => structuredClone(state.hold) },
    professional: {
      findUnique: async () => ({
        active: true,
        qualifications: [{ procedureId: 4 }],
      }),
    },
    procedure: {
      findUnique: async () => ({
        id: 4,
        name: "Procedure",
        active: true,
        requiresEquipment: false,
        technology: "GENERAL",
        equipmentReviewedAt: null,
      }),
    },
    procedureVariation: {
      findUnique: async () => ({
        id: 8,
        procedureId: 4,
        name: "Area",
        active: true,
      }),
    },
    procedureMaterial: { findMany: async () => [] },
    stockItem: { findMany: async () => [] },
    procedureExecution: {
      create: async ({ data }: any) => {
        const row = { id: state.executions.length + 1, ...data };
        state.executions.push(row);
        return row;
      },
    },
  };
  const token = Symbol("transaction");
  db.$transaction = async (fn: any) => {
    const old = structuredClone(state);
    try {
      return await fn({ ...db, token });
    } catch (e) {
      state = old;
      throw e;
    }
  };
  const sessions = {
    lock: async (tx: any, ids: number[]) => {
      assert.deepEqual(ids, [10]);
      markers.push(tx.token);
    },
    redeem: async (tx: any, id: number, executionId: number, input: any) => {
      calls++;
      markers.push(tx.token);
      assert.equal(id, 10);
      assert.equal(executionId, 1);
      assert.equal(input.customerId, 3);
      assert.equal(input.variationId, 8);
      if (fail) throw new ApplicationError("No session balance", "CONFLICT");
      state.hold.status = "REDEEMED";
    },
  };
  return {
    repo: new PrismaAttendanceRepository(db, {} as any, sessions as any),
    state: () => state,
    calls: () => calls,
    markers,
    token,
  };
}
const actor = {
  id: 7,
  name: "Admin",
  role: "ADMIN" as const,
  professionalId: null,
};
const execution = {
  procedureId: 4,
  variationId: 8,
  professionalId: 1,
  materials: [],
  shots: [],
};
test("attendance redeems the reserved area in its completion transaction and does not automatically charge twice for multiple executions", async () => {
  const f = fixture();
  await f.repo.complete(
    1,
    {
      requestKey: "7c22dce9-6b79-49d3-8c8c-96b2a2ed9407",
      executions: [execution, execution],
    },
    actor,
  );
  assert.equal(f.calls(), 1);
  assert.equal(f.state().hold.status, "REDEEMED");
  assert.equal(f.state().executions.length, 2);
  assert.equal(f.state().appointment.status, "COMPLETED");
  assert.ok(f.markers.every((m) => m === f.token));
});
test("a session-redemption failure rolls back clinical executions and attendance completion", async () => {
  const f = fixture(true);
  await assert.rejects(
    () =>
      f.repo.complete(
        1,
        {
          requestKey: "7c22dce9-6b79-49d3-8c8c-96b2a2ed9407",
          executions: [execution],
        },
        actor,
      ),
    /No session balance/,
  );
  assert.equal(f.state().executions.length, 0);
  assert.equal(f.state().attendance.status, "IN_PROGRESS");
  assert.equal(f.state().hold.status, "ACTIVE");
  assert.equal(f.state().appointment.status, "CONFIRMED");
});
