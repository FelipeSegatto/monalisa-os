import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaSchedulingRepository } from "../../src/scheduling/infrastructure/prisma-scheduling.repository";
const actor = {
  id: 7,
  name: "Admin",
  role: "ADMIN" as const,
  professionalId: null,
};
function fixture() {
  const periods = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    startMinute: 540,
    endMinute: 1080,
  }));
  const pros = [
    {
      id: 1,
      name: "Owner",
      color: "#111111",
      active: true,
      schedulingPriority: 0,
      qualifications: [{ procedureId: 4 }],
      workingPeriods: periods,
    },
    {
      id: 2,
      name: "Backup",
      color: "#222222",
      active: true,
      schedulingPriority: 1,
      qualifications: [{ procedureId: 4 }],
      workingPeriods: periods,
    },
  ];
  const appointments: any[] = [],
    locks: string[] = [];
  let settings = {
    assignmentPolicy: "PRIORITY",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  };
  const procedure = {
    id: 4,
    active: true,
    durationMinutes: 30,
    requiresEquipment: false,
    equipmentReviewedAt: null as Date | null,
  };
  const db: any = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
      locks.push(strings.join("?") + ":" + values.join(","));
      return [{ id: 1 }];
    },
    professional: {
      findMany: async ({ where }: any) =>
        pros.filter((p) => p.active && (!where.id || p.id === where.id)),
    },
    procedure: { findUnique: async () => procedure },
    customer: { findUnique: async () => ({ id: 3 }) },
    schedulingSettings: { findUnique: async () => settings },
    agendaBlock: { findFirst: async () => null },
    appointment: {
      findFirst: async ({ where }: any) =>
        appointments.find(
          (a) =>
            (!where.professionalId ||
              a.professionalId === where.professionalId) &&
            (!where.id?.not || a.id !== where.id.not) &&
            a.startsAt < where.startsAt.lt &&
            a.endsAt > where.endsAt.gt,
        ) ?? null,
      findUnique: async ({ where }: any) =>
        appointments.find((a) => a.id === where.id),
      create: async ({ data }: any) => {
        const a = { id: appointments.length + 1, ...data };
        appointments.push(a);
        return a;
      },
      update: async ({ where, data }: any) =>
        Object.assign(
          appointments.find((a) => a.id === where.id),
          data,
        ),
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  return {
    repo: new PrismaSchedulingRepository(db),
    pros,
    appointments,
    procedure,
    locks,
    setSettings: (s: typeof settings) => {
      settings = s;
    },
  };
}
const input = {
  customerId: 3,
  procedureId: 4,
  startsAt: "2030-01-07T13:00:00Z",
};
test("automatic assignment prefers owner at the requested time and falls back to available qualified backup", async () => {
  const f = fixture();
  const first: any = await f.repo.reserve(input, actor);
  assert.equal(first.professionalId, 1);
  const second: any = await f.repo.reserve(input, actor);
  assert.equal(second.professionalId, 2);
  await assert.rejects(
    () => f.repo.reserve(input, actor),
    /Nenhum profissional/,
  );
  assert.match(f.locks[0], /Professional/);
  assert.match(f.locks[1], /Professional/);
  assert.match(f.locks[2], /Procedure/);
});
test("manual selection cannot bypass qualification, calendar or ownership", async () => {
  const f = fixture();
  f.pros[0].qualifications = [];
  await assert.rejects(
    () => f.repo.reserve({ ...input, professionalId: 1 }, actor),
    /Nenhum profissional/,
  );
  await assert.rejects(
    () => f.repo.reserve({ ...input, startsAt: "2030-01-07T03:00:00Z" }, actor),
    /Nenhum profissional/,
  );
  await assert.rejects(
    () =>
      f.repo.reserve(
        { ...input, professionalId: 2 },
        { ...actor, role: "FUNCIONARIO", professionalId: 1 },
      ),
    /si próprio/,
  );
  assert.equal(f.appointments.length, 0);
});
test("manual policy refuses automatic assignment but allows a valid explicitly selected professional", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "MANUAL",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  await assert.rejects(
    () => f.repo.reserve(input, actor),
    /Nenhum profissional/,
  );
  const selected: any = await f.repo.reserve(
    { ...input, professionalId: 2 },
    actor,
  );
  assert.equal(selected.professionalId, 2);
});
test("confirmation preserves the reserved duration, and enlargement cannot overlap the next appointment", async () => {
  const f = fixture();
  await f.repo.reserve({ ...input, professionalId: 1 }, actor);
  await f.repo.reserve(
    { ...input, professionalId: 1, startsAt: "2030-01-07T13:30:00Z" },
    actor,
  );
  await assert.rejects(() => f.repo.confirm(1, 60, actor), /indisponível/);
  assert.equal(
    f.appointments[0].endsAt.toISOString(),
    "2030-01-07T13:30:00.000Z",
  );
  const result: any = await f.repo.confirm(1, undefined, actor);
  assert.equal(result.status, "CONFIRMED");
  assert.equal(result.endsAt, "2030-01-07T13:30:00.000Z");
  f.pros[0].qualifications = [];
  await assert.rejects(
    () => f.repo.confirm(1, undefined, actor),
    /habilitação/,
  );
});
test("external manual confirmation creates a provisional hold and automatic confirmation removes the hold", async () => {
  const f = fixture();
  await f.repo.reserve({ ...input, origin: "EXTERNAL" }, null);
  assert.equal(f.appointments[0].status, "SCHEDULED");
  assert.ok(f.appointments[0].expiresAt instanceof Date);
  f.setSettings({
    assignmentPolicy: "PRIORITY",
    confirmationMode: "AUTOMATIC",
    holdMinutes: 60,
  });
  await f.repo.reserve(
    { ...input, origin: "EXTERNAL", startsAt: "2030-01-07T14:00:00Z" },
    null,
  );
  assert.equal(f.appointments[1].status, "CONFIRMED");
  assert.equal(f.appointments[1].expiresAt, null);
});

test("reassignment revalidates qualifications and keeps the reserved interval", async () => {
  const f = fixture();
  // The fixture transaction delegates are private to the adapter; add the attendance read used by reassignment.
  const db = (f.repo as any).db;
  db.attendance = { findUnique: async () => null };
  await f.repo.reserve({ ...input, professionalId: 1 }, actor);
  f.pros[0].qualifications = [];
  const result: any = await f.repo.reassign(1, undefined, actor);
  assert.equal(result.professionalId, 2);
  assert.equal(
    result.startsAt.toISOString(),
    input.startsAt.replace("Z", ".000Z"),
  );
  await assert.rejects(
    () => f.repo.reassign(1, 1, actor),
    /Nenhum profissional/,
  );
  await assert.rejects(
    () =>
      f.repo.reassign(1, 1, {
        ...actor,
        role: "FUNCIONARIO",
        professionalId: 2,
      }),
    /administradores/,
  );
});
