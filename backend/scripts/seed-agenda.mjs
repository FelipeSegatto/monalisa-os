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
async function main() {
  const res = await fetch(BASE + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  cookie = res.headers.get("set-cookie")?.split(";")[0] || "";
  if (!cookie) throw new Error("Login não retornou cookie de sessão");

  const catalog = await call("GET", "/api/v1/public/catalog");
  const procedures = catalog.categories.flatMap((c) => c.procedures);
  const { customers } = await call("GET", "/api/v1/customers");
  const { professionals } = await call("GET", "/api/v1/professionals");
  // Skip the generic "Equipe de avaliação" entry; schedule the named professionals.
  const staff = professionals.filter((p) => p.name !== "Equipe de avaliação");

  // Working periods Mon-Fri 9:00-18:00 for everyone who doesn't have one yet.
  for (const pro of staff) {
    const current = await call("GET", `/api/v1/professionals/${pro.id}/capabilities`);
    if (current.workingPeriods.length) continue;
    await call(
      "PUT",
      `/api/v1/professionals/${pro.id}/capabilities`,
      {
        procedureIds: procedures.map((p) => p.id),
        priority: null,
        workingPeriods: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          startMinute: 540,
          endMinute: 1080,
        })),
      },
      200,
    );
  }
  console.log("Jornadas e habilitações configuradas.");

  // Fill this week (Mon-Fri) with a realistic, non-overlapping schedule per professional.
  const now = new Date();
  const monday = new Date(now);
  const dow = monday.getUTCDay() || 7; // Sunday=0 -> 7
  monday.setUTCDate(monday.getUTCDate() - (dow - 1));
  monday.setUTCHours(3, 0, 0, 0); // local-day anchor consistent with the app's UTC-3 convention

  const slotsPerDay = [9 * 60, 10 * 60 + 30, 13 * 60, 14 * 60 + 30, 16 * 60];
  let created = 0;
  for (let day = 0; day < 5; day++) {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + day);
    for (let i = 0; i < slotsPerDay.length; i++) {
      const pro = staff[(day + i) % staff.length];
      const procedure = procedures[(day * 5 + i + pro.id) % procedures.length];
      if (procedure.price === 0) continue; // skip "Avaliação gratuita" to keep the week realistic
      const customer = customers[(day * 5 + i) % customers.length];
      const startsAt = new Date(date);
      startsAt.setUTCMinutes(startsAt.getUTCMinutes() + slotsPerDay[i]);
      const status = startsAt < now ? "CONFIRMED" : i % 3 === 0 ? "SCHEDULED" : "CONFIRMED";
      try {
        await call(
          "POST",
          "/api/v1/agenda",
          {
            customerId: customer.id,
            professionalId: pro.id,
            procedureId: procedure.id,
            startsAt: startsAt.toISOString(),
            status,
          },
          [200, 201],
        );
        created++;
      } catch (error) {
        console.warn("Pulado:", error.message);
      }
    }
  }
  console.log(`Agendamentos da semana criados: ${created}.`);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
