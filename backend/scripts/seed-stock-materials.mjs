import { assertTestDataAllowed } from "./test-data-guard.mjs";
import "dotenv/config";
import { createHash } from "node:crypto";
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
/** Deterministic UUID-shaped key so re-running the script hits the existing-requestKey
 * idempotency check in the inventory ledger instead of posting a duplicate batch. */
function deterministicKey(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function daysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
const MATERIALS = [
  {
    name: "Ácido Hialurônico",
    unit: "ml",
    minQuantity: 5,
    batches: [
      { quantity: 20, expiresAt: daysFromNow(200), note: "Compra do fornecedor X (lote A)" },
      { quantity: 10, expiresAt: daysFromNow(20), note: "Compra do fornecedor X (lote B, vence em breve)" },
    ],
  },
  {
    name: "Botox",
    unit: "frasco",
    minQuantity: 3,
    batches: [
      { quantity: 10, expiresAt: daysFromNow(150), note: "Compra do fornecedor Y (lote A)" },
      { quantity: 4, expiresAt: daysFromNow(10), note: "Compra do fornecedor Y (lote B, vence em breve)" },
    ],
  },
  {
    name: "Bioestimulador",
    unit: "frasco",
    minQuantity: 2,
    batches: [
      { quantity: 8, expiresAt: daysFromNow(180), note: "Compra do fornecedor Z (lote A)" },
      {
        quantity: 2,
        expiresAt: daysFromNow(-15),
        note: "DEMONSTRAÇÃO: lote vencido, usado apenas para validar o alerta do dashboard",
      },
    ],
  },
  {
    name: "Ácido de Peeling",
    unit: "ml",
    minQuantity: 10,
    batches: [
      { quantity: 30, expiresAt: daysFromNow(200), note: "Compra do fornecedor W (lote A)" },
      { quantity: 15, expiresAt: daysFromNow(25), note: "Compra do fornecedor W (lote B, vence em breve)" },
    ],
  },
];
async function main() {
  const res = await fetch(BASE + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  cookie = res.headers.get("set-cookie")?.split(";")[0] || "";
  if (!cookie) throw new Error("Login não retornou cookie de sessão");

  const { items: existing } = await call("GET", "/api/v1/stock/items");
  const byName = new Map(existing.map((i) => [i.name, i]));

  for (const material of MATERIALS) {
    let item = byName.get(material.name);
    if (!item) {
      item = await call(
        "POST",
        "/api/v1/stock/items",
        {
          name: material.name,
          unit: material.unit,
          minQuantity: material.minQuantity,
          initialQuantity: 0,
        },
        [200, 201],
      );
      console.log(`Criado: ${material.name} (#${item.id})`);
    } else {
      console.log(`Já existe: ${material.name} (#${item.id})`);
    }
    for (const batch of material.batches) {
      const requestKey = deterministicKey(`seed-stock-materials:${material.name}:${batch.expiresAt}:${batch.quantity}`);
      await call(
        "POST",
        `/api/v1/stock/items/${item.id}/movements`,
        {
          type: "IN",
          quantity: batch.quantity,
          note: batch.note,
          requestKey,
          expiresAt: batch.expiresAt,
        },
        [200, 201],
      );
    }
  }
  console.log("Insumos com validade preparados (ácido hialurônico, botox, bioestimulador, ácido de peeling).");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
