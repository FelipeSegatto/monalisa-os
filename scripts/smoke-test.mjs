import assert from "node:assert/strict";
import { assertSupportedNode } from "./check-node.mjs";
assertSupportedNode();
const base = (process.env.SMOKE_URL || "http://localhost:3333").replace(
  /\/$/,
  "",
);
try {
  const session = await fetch(`${base}/api/v1/me`, {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(session.status, 401, "A consulta sem sessão deve retornar 401");
  const catalog = await fetch(`${base}/api/v1/public/catalog`, {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(catalog.status, 200, "O catálogo público deve retornar 200");
  assert.ok(
    Array.isArray((await catalog.json()).categories),
    "Contrato do catálogo inválido",
  );
  console.log(
    "PASS: API responde, sessão obrigatória e catálogo público consultável. Nenhum dado gravado.",
  );
} catch (error) {
  console.error(
    `Smoke de leitura falhou: ${error.message}. Confira API, banco e SMOKE_URL.`,
  );
  process.exitCode = 1;
}
