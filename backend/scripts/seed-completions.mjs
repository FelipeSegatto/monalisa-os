import { assertTestDataAllowed } from "./test-data-guard.mjs";
import "dotenv/config";
assertTestDataAllowed(process.argv, process.env.TEST_URL, process.env.NODE_ENV);
const BASE = process.env.TEST_URL;
const email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD;
let cookie = "";
async function call(method, path, body, expected = 200) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(expected) ? !expected.includes(res.status) : res.status !== expected)
    throw new Error(`${method} ${path}: HTTP ${res.status}. ${JSON.stringify(data)}`);
  return data;
}
function uuid() {
  return crypto.randomUUID();
}
function dateKey(d) {
  return new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}
const MATERIALS = {
  3: [{ stockItemId: 1, usage: "USED" }, { stockItemId: 6, usage: "USED" }], // Botox
  5: [{ stockItemId: 4, usage: "USED" }], // Ultrassom Microfocado
  8: [{ stockItemId: 3, usage: "USED" }], // Peeling de Carbono
};
async function main() {
  const res = await fetch(BASE + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  cookie = res.headers.get("set-cookie")?.split(";")[0] || "";
  if (!cookie) throw new Error("Login não retornou cookie de sessão");

  const { equipment: equipmentList } = await call("GET", "/api/v1/equipment");
  const eqById = new Map(equipmentList.map((e) => [e.id, e]));

  async function openCounter(equipmentId, componentId, quantityDelta) {
    try {
      await call(
        "POST",
        `/api/v1/equipment/${equipmentId}/shot-ledger`,
        {
          componentId,
          quantityDelta,
          type: "OPENING",
          reason: "Contador inicial (histórico de uso do equipamento)",
          requestKey: uuid(),
        },
        [200, 201],
      );
    } catch (error) {
      if (!/Contador já inicializado/.test(error.message)) throw error;
    }
  }
  const OPENING_COUNTERS = {
    "EQ-003": () => 4_000_000 + Math.floor(Math.random() * 190000), // Fiber Evo
    "EQ-002": () => 30_000 + Math.floor(Math.random() * 1900), // Q-Clean
    "EQ-004-2D": () => 15_000 + Math.floor(Math.random() * 900),
    "EQ-004-CORP": () => 500 + Math.floor(Math.random() * 90),
    "EQ-004-PEN": () => 50_000 + Math.floor(Math.random() * 1900),
  };
  for (const e of equipmentList) {
    if (e.shotTracking === "EQUIPMENT" && OPENING_COUNTERS[e.code])
      await openCounter(e.id, null, OPENING_COUNTERS[e.code]());
    if (e.shotTracking === "COMPONENT" && e.components)
      for (const c of e.components) {
        const prefix = c.code.startsWith("EQ-004-2D")
          ? "EQ-004-2D"
          : c.code.startsWith("EQ-004-CORP")
            ? "EQ-004-CORP"
            : c.code.startsWith("EQ-004-PEN")
              ? "EQ-004-PEN"
              : null;
        if (prefix) await openCounter(e.id, c.id, OPENING_COUNTERS[prefix]());
      }
  }

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  const now = new Date();
  const monday = new Date(now);
  const dow = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - (dow - 1));

  let completed = 0,
    skipped = 0;
  for (let day = 0; day < 5; day++) {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + day);
    const dateStr = dateKey(date);
    const { appointments } = await call("GET", `/api/v1/agenda?date=${dateStr}`);
    for (const a of appointments) {
      if (new Date(a.startsAt) >= now) continue; // future slot, nothing to complete yet
      if (a.status === "CANCELLED") continue;
      try {
        let attendance;
        try {
          attendance = await call("POST", `/api/v1/agenda/${a.id}/attendance`, {}, [200, 201]);
        } catch {
          const existing = await db.attendance.findUnique({ where: { appointmentId: a.id } });
          if (!existing || existing.status !== "IN_PROGRESS") throw new Error("sem attendance reaproveitável");
          attendance = existing;
        }
        const equipment = a.equipmentId ? eqById.get(a.equipmentId) : null;
        let shots = [];
        if (equipment && equipment.shotTracking === "COMPONENT") {
          const component = equipment.components[(a.id + day) % equipment.components.length];
          shots = [{ componentId: component.id, quantity: 1 + (a.id % 3) }];
        } else if (equipment && equipment.shotTracking === "EQUIPMENT") {
          shots = [{ componentId: null, quantity: 1 + (a.id % 5) }];
        }
        await call(
          "POST",
          `/api/v1/attendances/${attendance.id}/completion`,
          {
            requestKey: uuid(),
            executions: [
              {
                entitlementId: null,
                procedureId: a.procedureId,
                variationId: null,
                professionalId: a.professionalId,
                equipmentId: a.equipmentId ?? null,
                materials: MATERIALS[a.procedureId] ?? [],
                shots,
              },
            ],
          },
          [200, 201],
        );
        completed++;
      } catch (error) {
        skipped++;
        console.warn(`Pulado (agendamento ${a.id}):`, error.message);
      }
    }
  }
  console.log(`Atendimentos concluídos: ${completed}. Pulados: ${skipped}.`);
  await db.$disconnect();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
