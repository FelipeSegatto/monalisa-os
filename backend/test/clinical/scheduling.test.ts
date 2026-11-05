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
    schedulingSettings: {
      findUnique: async () => settings,
      update: async ({ data }: any) => Object.assign(settings, data),
    },
    agendaBlock: { findFirst: async () => null },
    appointment: {
      findMany: async ({ where }: any) =>
        appointments.filter(
          (a) =>
            where.professionalId.in.includes(a.professionalId) &&
            a.startsAt < where.startsAt.lt &&
            a.endsAt > where.endsAt.gt &&
            a.id !== where.id?.not &&
            ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(a.status) &&
            !(
              a.status === "SCHEDULED" &&
              a.expiresAt &&
              a.expiresAt <= new Date()
            ),
        ),
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

test("balanced assignment prefers fewer reserved minutes, ignores priority and rotates equal workloads", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  f.pros[0].schedulingPriority = null as any;
  f.pros[1].schedulingPriority = null as any;
  f.appointments.push({
    id: 90,
    professionalId: 1,
    status: "CONFIRMED",
    startsAt: new Date("2030-01-07T12:00Z"),
    endsAt: new Date("2030-01-07T13:00Z"),
  });
  const first: any = await f.repo.reserve(input, actor);
  assert.equal(first.professionalId, 2);
  const second: any = await f.repo.reserve(
    { ...input, startsAt: "2030-01-07T13:30:00Z" },
    actor,
  );
  assert.equal(second.professionalId, 2);
  // Both now have 60 reserved minutes, so the next tie goes after professional 2.
  const third: any = await f.repo.reserve(
    { ...input, startsAt: "2030-01-07T14:00:00Z" },
    actor,
  );
  assert.equal(third.professionalId, 1);
  assert.ok(f.locks.some((l) => l.includes("SchedulingSettings")));
});
test("balanced workload excludes cancelled, no-show, expired and other-day reservations", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  for (const [id, status, expiresAt] of [
    [80, "CANCELLED", null],
    [81, "NO_SHOW", null],
    [82, "SCHEDULED", new Date(Date.now() - 1000)],
  ] as const)
    f.appointments.push({
      id,
      professionalId: 1,
      status,
      expiresAt,
      startsAt: new Date("2030-01-07T12:00Z"),
      endsAt: new Date("2030-01-07T13:00Z"),
    });
  f.appointments.push({
    id: 83,
    professionalId: 1,
    status: "CONFIRMED",
    startsAt: new Date("2030-01-06T12:00Z"),
    endsAt: new Date("2030-01-06T18:00Z"),
  });
  const a: any = await f.repo.reserve(input, actor);
  assert.equal(a.professionalId, 1);
});
test("balanced selection still requires qualification and availability; explicit selection does not advance the rotation", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  f.pros[0].qualifications = [];
  const a: any = await f.repo.reserve(input, actor);
  assert.equal(a.professionalId, 2);
  f.pros[0].qualifications = [{ procedureId: 4 }];
  await f.repo.reserve(
    { ...input, startsAt: "2030-01-07T14:00:00Z", professionalId: 1 },
    actor,
  );
  assert.equal(
    (
      await (f.repo as any).db.schedulingSettings.findUnique({
        where: { id: 1 },
      })
    ).lastBalancedProfessionalId,
    2,
  );
});
test("balanced reassignment excludes the appointment being reassigned from its workload", async () => {
  const f = fixture();
  const db = (f.repo as any).db;
  db.attendance = { findUnique: async () => null };
  await f.repo.reserve({ ...input, professionalId: 1 }, actor);
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  // With its own reservation excluded, both professionals have zero load and the first ID wins.
  const a: any = await f.repo.reassign(1, undefined, actor);
  assert.equal(a.professionalId, 1);
});

test("public slots in balanced mode include qualified professionals without a priority number", async () => {
  const f = fixture(),
    db = (f.repo as any).db;
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  f.pros.forEach((p) => (p.schedulingPriority = null as any));
  let query: any;
  db.professional.findMany = async ({ where }: any) => {
    query = where;
    return f.pros;
  };
  db.appointment.findMany = async () => [];
  db.agendaBlock.findMany = async () => [];
  const slots = await f.repo.dailySlots(4, "2030-01-07");
  assert.ok(slots.includes("09:00"));
  assert.equal(query.schedulingPriority, undefined);
  assert.deepEqual(query.qualifications, {
    some: { procedureId: 4, active: true },
  });
});

test("balanced workload clips cross-midnight appointments to the Sao Paulo day", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  f.appointments.push(
    {
      id: 70,
      professionalId: 1,
      status: "COMPLETED",
      startsAt: new Date("2030-01-07T02:00Z"),
      endsAt: new Date("2030-01-07T04:00Z"),
    },
    {
      id: 71,
      professionalId: 2,
      status: "COMPLETED",
      startsAt: new Date("2030-01-07T05:00Z"),
      endsAt: new Date("2030-01-07T06:30Z"),
    },
  );
  const a: any = await f.repo.reserve(input, actor);
  assert.equal(a.professionalId, 1);
});
test("failed reservation does not advance the balanced tie-breaker", async () => {
  const f = fixture();
  f.setSettings({
    assignmentPolicy: "BALANCED",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
  });
  const db = (f.repo as any).db;
  db.customer.findUnique = async () => null;
  let advances = 0;
  db.schedulingSettings.update = async () => {
    advances++;
  };
  await assert.rejects(() => f.repo.reserve(input, actor));
  assert.equal(f.appointments.length, 0);
  assert.equal(advances, 0);
});
