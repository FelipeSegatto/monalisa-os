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
function monthsAgo(n, day = 10) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCDate(day);
  return d.toISOString().slice(0, 10);
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
  const byName = (name) => procedures.find((p) => p.name === name);
  const laserHair = byName("Depilação a Laser"),
    hifu = byName("Ultrassom Microfocado"),
    preenchimento = byName("Preenchimento");

  const { customers } = await call("GET", "/api/v1/customers");
  const { professionals } = await call("GET", "/api/v1/professionals");

  const targets = [laserHair, hifu, preenchimento];
  const backdateSales = [];

  for (let i = 5; i >= 0; i--) {
    const monthDay = Math.min(24, 6 + i);
    // Growth over time: 2 extra sales per target in the oldest month, up to 6 in the current month.
    const extraPerProcedure = 2 + (5 - i);
    for (const procedure of targets) {
      for (let s = 0; s < extraPerProcedure; s++) {
        const customer = customers[(i * 13 + s * 3 + procedure.id) % customers.length];
        const professional = professionals[(i * 5 + s + procedure.id) % professionals.length];
        const variation =
          procedure.hasVariations && procedure.variations.length
            ? procedure.variations[(i + s) % procedure.variations.length]
            : null;
        const unitPrice = variation ? variation.price : procedure.price;
        const total = Math.round(unitPrice * 100) / 100;
        const paymentRoll = (i + s + procedure.id) % 6;
        const sale = await call(
          "POST",
          "/api/v1/commercial/sales",
          {
            customerId: customer.id,
            professionalId: professional?.id ?? null,
            commissionPercent: null,
            allowUnpaidUse: false,
            requestKey: uuid(),
            lines: [{ procedureId: procedure.id, variationId: variation?.id ?? null, sessions: 1 }],
            initialPayment:
              paymentRoll === 5
                ? null
                : {
                    amount: paymentRoll === 4 ? Math.round(total * 0.5 * 100) / 100 : total,
                    method: ["PIX", "CARD", "CASH"][(i + s) % 3],
                    installments: null,
                  },
          },
          [200, 201],
        );
        backdateSales.push({ id: sale.id, date: monthsAgo(i, monthDay) });
      }
    }
  }
  console.log(`Vendas extras criadas: ${backdateSales.length}.`);

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    for (const { id, date } of backdateSales)
      await db.sale.update({ where: { id }, data: { createdAt: new Date(date + "T12:00:00Z") } });
    console.log("Datas ajustadas.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
