import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";

test("agenda usa DI real para validar intervalo, rejeitar conflito e preservar resposta da interface", async () => {
  const app = await contractApp();
  try {
    const professional = {
      id: 1,
      name: "Profissional",
      color: "#123456",
      active: true,
    };
    const procedure = {
      id: 2,
      name: "Procedimento",
      durationMinutes: 60,
      active: true,
    };
    const customer = { id: 3, name: "Cliente fictícia" };
    let appointment: any = null;
    let locks = 0;
    app.db.professional.findUnique = async () => professional;
    app.db.professional.findMany = async () => [professional];
    app.db.procedure.findUnique = async () => procedure;
    app.db.customer.findUniqueOrThrow = async () => customer;
    app.db.appointment.findFirst = async () => appointment;
    app.db.agendaBlock.findFirst = async () => null;
    app.db.appointment.create = async ({ data }: any) => {
      appointment = { id: 1, ...data };
      return appointment;
    };
    app.db.appointment.findMany = async () =>
      appointment
        ? [{ ...appointment, customer, professional, procedure }]
        : [];
    app.db.$transaction = async (callback: any) =>
      callback({
        ...app.db,
        $queryRaw: async () => {
          locks++;
          return [{ id: 1 }];
        },
      });
    await app.start();
    const body = {
      customerId: 3,
      professionalId: 1,
      procedureId: 2,
      startsAt: "2030-01-15T15:00:00.000Z",
    };
    const created = await app.request("/api/v1/agenda", {
      method: "POST",
      body,
    });
    assert.equal(created.status, 201);
    assert.deepEqual(await created.json(), {
      id: 1,
      startsAt: body.startsAt,
      endsAt: "2030-01-15T16:00:00.000Z",
      status: "SCHEDULED",
    });
    assert.equal(
      (await app.request("/api/v1/agenda", { method: "POST", body })).status,
      409,
    );
    assert.equal(locks, 2);
    const daily = await app.request("/api/v1/agenda?date=2030-01-15");
    assert.equal(daily.status, 200);
    const data: any = await daily.json();
    assert.equal(data.date, "2030-01-15");
    assert.deepEqual(data.professionals, [
      { id: 1, name: "Profissional", color: "#123456" },
    ]);
    assert.equal(data.appointments[0].customerName, "Cliente fictícia");
    assert.equal(data.appointments[0].professionalColor, "#123456");
    assert.equal(data.appointments[0].procedureName, "Procedimento");
    assert.equal(
      (
        await app.request("/api/v1/agenda", {
          method: "POST",
          body: { ...body, status: "INVALID" },
        })
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});
