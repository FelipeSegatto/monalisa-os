import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaAttendanceRepository } from "../../src/attendances/infrastructure/prisma-attendance.repository";
import { ApplicationError } from "../../src/shared/domain/application-error";
test("failure posting shots rolls back executions and completion within the same unit of work", async () => {
  let state: any = {
    attendance: {
      id: 1,
      professionalId: 1,
      appointmentId: 2,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 1000),
    },
    executions: [],
    appointment: {
      id: 2,
      professionalId: 1,
      procedureId: 4,
      status: "CONFIRMED",
    },
  };
  let sameTx = false;
  const marker = Symbol("transaction");
  const db: any = {
    $queryRaw: async () => [{ id: 1 }],
    attendance: {
      findUnique: async () => state.attendance,
      update: async ({ data }: any) => Object.assign(state.attendance, data),
    },
    appointment: {
      findUnique: async () => state.appointment,
      update: async ({ data }: any) => Object.assign(state.appointment, data),
    },
    professional: {
      findUnique: async () => ({
        id: 1,
        active: true,
        qualifications: [{ procedureId: 4 }],
      }),
    },
    procedure: {
      findUnique: async () => ({
        id: 4,
        name: "Laser",
        technology: "LASER_HAIR_REMOVAL",
        active: true,
        requiresEquipment: true,
        equipmentReviewedAt: new Date(),
      }),
    },
    procedureMaterial: { findMany: async () => [] },
    stockItem: { findMany: async () => [] },
    equipment: {
      findUnique: async () => ({
        id: 3,
        shotTracking: "EQUIPMENT",
        status: "ACTIVE",
      }),
    },
    procedureEquipment: { findUnique: async () => ({ active: true }) },
    procedureExecution: {
      create: async ({ data }: any) => {
        const row = { id: 1, ...data };
        state.executions.push(row);
        return row;
      },
    },
  };
  db.$transaction = async (fn: any) => {
    const before = structuredClone(state);
    try {
      return await fn({ ...db, marker });
    } catch (e) {
      state = before;
      throw e;
    }
  };
  const writer = {
    append: async (tx: any) => {
      sameTx = tx.marker === marker;
      throw new ApplicationError("Counter conflict", "CONFLICT");
    },
  };
  const repo = new PrismaAttendanceRepository(db, writer as any);
  await assert.rejects(
    () =>
      repo.complete(
        1,
        {
          requestKey: "6c2ee534-560b-46ce-9f41-b1909d7b1635",
          executions: [
            {
              procedureId: 4,
              professionalId: 1,
              equipmentId: 3,
              materials: [],
              shots: [{ quantity: 10 }],
            },
          ],
        },
        { id: 7, name: "Admin", role: "ADMIN", professionalId: null },
      ),
    /Counter conflict/,
  );
  assert.equal(sameTx, true);
  assert.equal(state.attendance.status, "IN_PROGRESS");
  assert.equal(state.appointment.status, "CONFIRMED");
  assert.equal(state.executions.length, 0);
});
