import { assertTestDataAllowed } from "./test-data-guard.mjs";
// HTTP seed: only against a local dev API. Creates real data via real business rules
// (no direct SQL writes), so every invariant/trigger is exercised exactly like a real user.
import "dotenv/config";
assertTestDataAllowed(process.argv, process.env.TEST_URL, process.env.NODE_ENV);
const BASE = process.env.TEST_URL;
const email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD;
if (!email || !password)
  throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no backend/.env");
let cookie = "";
async function call(method, path, body, expected = 200) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(expected) ? !expected.includes(res.status) : res.status !== expected)
    throw new Error(
      `${method} ${path}: HTTP ${res.status}, expected ${expected}. ${JSON.stringify(data)}`,
    );
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
  console.log("Login ok.");

  const catalog = await call("GET", "/api/v1/public/catalog");
  const procedures = catalog.categories.flatMap((c) => c.procedures);
  const byName = (name) => procedures.find((p) => p.name === name);
  const hifu = byName("Ultrassom Microfocado"),
    laserHair = byName("Depilação a Laser"),
    tattoo = byName("Remoção de Tatuagem"),
    criolipolise = byName("Criolipólise"),
    lipocavitacao = byName("Lipocavitação");

  const { equipment: equipmentList } = await call("GET", "/api/v1/equipment");
  const eqByName = (name) => equipmentList.find((e) => e.name === name);
  const beautyShape = eqByName("Beauty Shape Duo"),
    ndYag = eqByName("Laser ND-Yag Q-Clean"),
    fiberEvo = eqByName("Laser Fiber Evo"),
    ultramedHifu = eqByName("Ultramed HIFU"),
    lipocavity = eqByName("Lipocavity");

  console.log("Procedimentos e equipamentos resolvidos.");

  // Link equipment to procedures that plausibly use them (realistic device/technique pairing).
  const links = [
    [hifu, [ultramedHifu]],
    [laserHair, [fiberEvo]],
    [tattoo, [ndYag]],
    [criolipolise, [beautyShape]],
    [lipocavitacao, [lipocavity]],
  ];
  for (const [proc, eqs] of links) {
    if (!proc || eqs.some((e) => !e)) continue;
    await call("PUT", `/api/v1/procedures/${proc.id}/equipment`, {
      equipmentIds: eqs.map((e) => e.id),
    });
  }
  console.log("Vínculos de equipamento por procedimento aplicados.");

  // Maintenance history: each equipment had its last preventive maintenance a few months ago.
  const maintenancePlan = [
    [beautyShape, 4],
    [ndYag, 2],
    [fiberEvo, 3],
    [ultramedHifu, 1],
    [lipocavity, 5],
  ];
  for (const [eq, monthsBack] of maintenancePlan) {
    if (!eq || eq.lastMaintenanceDate) continue;
    await call(
      "POST",
      `/api/v1/equipment/${eq.id}/maintenance`,
      { performedOn: monthsAgo(monthsBack), reason: "Manutenção preventiva programada" },
      [200, 201],
    );
  }
  console.log("Histórico de manutenção registrado.");

  const { customers } = await call("GET", "/api/v1/customers");
  const { professionals } = await call("GET", "/api/v1/professionals");

  // --- Commercial offer (combo) so the dashboard has a combo to tell a story about ---
  let offer = null;
  const { offers: existingOffers } = await call("GET", "/api/v1/commercial/offers");
  offer = existingOffers.find((o) => o.name === "Pacote HIFU Facial · 3 sessões") ?? null;
  if (!offer && hifu) {
    offer = await call(
      "POST",
      "/api/v1/commercial/offers",
      {
        name: "Pacote HIFU Facial · 3 sessões",
        startsOn: monthsAgo(5, 1),
        endsOn: null,
        sessionValidityDays: 180,
        price: Math.round(hifu.price * 3 * 0.85 * 100) / 100,
        terms: null,
        items: [{ procedureId: hifu.id, variationId: null, sessions: 3 }],
      },
      [200, 201],
    );
    console.log("Oferta publicada:", offer.name);
  }

  // --- Sales history: a growth story, older months smaller/fewer, current month strongest ---
  const sellable = [
    byName("Preenchimento"),
    byName("Botox"),
    byName("Bioestimulador de Colágeno"),
    hifu,
    laserHair,
    byName("Peeling de Carbono"),
    byName("Clareamento de Pele"),
    criolipolise,
    byName("Enzimas"),
    lipocavitacao,
  ].filter(Boolean);

  const backdateSales = []; // {id, date}
  const backdatePayments = []; // {id, date}

  for (let i = 5; i >= 0; i--) {
    const salesCount = 2 + (5 - i); // 2..7, growth over time
    const monthDay = Math.min(26, 4 + i); // vary day a bit
    for (let s = 0; s < salesCount; s++) {
      const customer = customers[(i * 7 + s) % customers.length];
      const professional = professionals[(i * 3 + s) % professionals.length];
      const procedure = sellable[(i * 5 + s) % sellable.length];
      const variation =
        procedure.hasVariations && procedure.variations.length
          ? procedure.variations[(i + s) % procedure.variations.length]
          : null;
      const sessions = 1;
      const unitPrice = variation ? variation.price : procedure.price;
      const total = Math.round(unitPrice * sessions * 100) / 100;
      const paymentRoll = (i + s) % 5; // vary status across the month
      const sale = await call(
        "POST",
        "/api/v1/commercial/sales",
        {
          customerId: customer.id,
          professionalId: professional?.id ?? null,
          commissionPercent: null,
          allowUnpaidUse: false,
          requestKey: uuid(),
          lines: [{ procedureId: procedure.id, variationId: variation?.id ?? null, sessions }],
          initialPayment:
            paymentRoll === 4
              ? null // some sales stay pending
              : {
                  amount: paymentRoll === 3 ? Math.round(total * 0.5 * 100) / 100 : total,
                  method: ["PIX", "CARD", "CASH"][(i + s) % 3],
                  installments: null,
                },
        },
        [200, 201],
      );
      const saleDate = monthsAgo(i, monthDay);
      backdateSales.push({ id: sale.id, date: saleDate });
      const payment = sale.payments?.[0];
      if (payment) backdatePayments.push({ id: payment.id, date: saleDate });
    }
    // One offer purchase every other month, from the offer's start onward.
    if (offer && i <= 4 && i % 2 === 0) {
      const customer = customers[(i * 11) % customers.length];
      const sale = await call(
        "POST",
        "/api/v1/commercial/sales",
        {
          customerId: customer.id,
          professionalId: null,
          commissionPercent: null,
          allowUnpaidUse: false,
          requestKey: uuid(),
          lines: [{ offerVersionId: offer.versions[0].id, quantity: 1 }],
          initialPayment: { amount: offer.versions[0].price, method: "PIX", installments: null },
        },
        [200, 201],
      );
      const saleDate = monthsAgo(i, monthDay);
      backdateSales.push({ id: sale.id, date: saleDate });
      const payment = sale.payments?.[0];
      if (payment) backdatePayments.push({ id: payment.id, date: saleDate });
    }
  }
  console.log(`Vendas criadas: ${backdateSales.length}.`);

  // --- Expense history: controlled, modestly growing, mixed destinations ---
  for (let i = 5; i >= 0; i--) {
    const competenceMonth = monthsAgo(i, 1).slice(0, 7);
    const dueDate = monthsAgo(i, 5);
    const paidAt = monthsAgo(i, 8) + "T12:00:00.000Z";

    await call(
      "POST",
      "/api/v1/finance/expenses",
      {
        description: "Aluguel da clínica",
        category: "ALUGUEL_ESTRUTURA",
        supplier: "Imobiliária Centro",
        amount: 1500,
        dueDate,
        competenceMonth,
        recurrence: "RECURRING",
        destination: "GENERAL",
        basis: "VALUE",
        allocations: [{ procedureId: null, value: 1500 }],
        allocationNote: "Aluguel mensal, custo fixo da clínica",
        reason: "Lançamento mensal recorrente",
      },
      [200, 201],
    ).then((expense) =>
      call(
        "POST",
        `/api/v1/finance/expenses/${expense.id}/pay`,
        { amount: 1500, method: "PIX", paidAt, requestKey: uuid() },
        [200, 201],
      ),
    );

    if (hifu && laserHair) {
      const hifuShare = Math.round((250 + (5 - i) * 15) * 100) / 100;
      const laserShare = Math.round((180 + (5 - i) * 10) * 100) / 100;
      const generalShare = 70;
      const total = Math.round((hifuShare + laserShare + generalShare) * 100) / 100;
      const expense = await call(
        "POST",
        "/api/v1/finance/expenses",
        {
          description: "Compra de insumos para laser e HIFU",
          category: "INSUMOS",
          supplier: "Distribuidora Estética SP",
          amount: total,
          dueDate,
          competenceMonth,
          recurrence: "ONCE",
          destination: "MIXED",
          basis: "VALUE",
          allocations: [
            { procedureId: null, value: generalShare },
            { procedureId: hifu.id, value: hifuShare },
            { procedureId: laserHair.id, value: laserShare },
          ],
          allocationNote: "Lote compartilhado entre procedimentos a laser/HIFU e estoque geral",
          reason: "Reposição mensal de insumos",
        },
        [200, 201],
      );
      await call(
        "POST",
        `/api/v1/finance/expenses/${expense.id}/pay`,
        { amount: total, method: "CARD", paidAt, requestKey: uuid() },
        [200, 201],
      );
    }

    if (i % 2 === 0) {
      const expense = await call(
        "POST",
        "/api/v1/finance/expenses",
        {
          description: "Divulgação nas redes sociais",
          category: "MARKETING",
          supplier: null,
          amount: 300,
          dueDate,
          competenceMonth,
          recurrence: "ONCE",
          destination: "GENERAL",
          basis: "VALUE",
          allocations: [{ procedureId: null, value: 300 }],
          allocationNote: "Campanha institucional, sem procedimento específico",
          reason: "Investimento em divulgação do mês",
        },
        [200, 201],
      );
      await call(
        "POST",
        `/api/v1/finance/expenses/${expense.id}/pay`,
        { amount: 300, method: "PIX", paidAt, requestKey: uuid() },
        [200, 201],
      );
    }
  }
  console.log("Despesas do período criadas e pagas.");

  // --- Backdate Sale.createdAt so "vendido" reflects the intended month ---
  // SalePayment.paidAt cannot be backdated: it is protected by an immutability trigger
  // (by design, to keep the audit trail honest), so "recebido" stays at the real creation
  // date (today) for every sale created by this script, even though the sale itself is
  // dated historically. ExpensePayment.occurredAt is a real input field, so expense
  // payments ARE correctly spread across the period with no workaround needed.
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    for (const { id, date } of backdateSales)
      await db.sale.update({ where: { id }, data: { createdAt: new Date(date + "T12:00:00Z") } });
    console.log(`Datas de venda ajustadas (${backdateSales.length}). Pagamentos permanecem na data real (trigger de imutabilidade).`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
