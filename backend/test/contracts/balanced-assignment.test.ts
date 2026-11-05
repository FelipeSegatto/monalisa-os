import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";
test("administrator can persist balanced policy; staff and anonymous users cannot change it or inject the cursor", async () => {
  const app = await contractApp();
  let state: any = {
    id: 1,
    assignmentPolicy: "PRIORITY",
    confirmationMode: "MANUAL",
    holdMinutes: 60,
    lastBalancedProfessionalId: 2,
  };
  app.db.schedulingSettings.findUnique = async () => state;
  app.db.schedulingSettings.upsert = async ({ update }: any) => {
    assert.equal(update.lastBalancedProfessionalId, undefined);
    state = { ...state, ...update };
    return state;
  };
  try {
    await app.start();
    const body = {
      assignmentPolicy: "BALANCED",
      confirmationMode: "AUTOMATIC",
      holdMinutes: 120,
      lastBalancedProfessionalId: 999,
    };
    assert.equal(
      (
        await app.request("/api/v1/scheduling/settings", {
          method: "PUT",
          body,
          role: "FUNCIONARIO",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request("/api/v1/scheduling/settings", {
          method: "PUT",
          body,
          role: "ANONYMOUS",
        })
      ).status,
      401,
    );
    assert.equal(state.assignmentPolicy, "PRIORITY");
    const saved = await app.request("/api/v1/scheduling/settings", {
      method: "PUT",
      body,
    });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).assignmentPolicy, "BALANCED");
    assert.equal(state.lastBalancedProfessionalId, 2);
    assert.equal(
      (await (await app.request("/api/v1/scheduling/settings")).json())
        .assignmentPolicy,
      "BALANCED",
    );
    assert.equal(
      (
        await app.request("/api/v1/scheduling/settings", {
          method: "PUT",
          body: { ...body, assignmentPolicy: "UNKNOWN" },
        })
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});
