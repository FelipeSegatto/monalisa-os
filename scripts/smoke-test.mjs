import assert from "node:assert/strict";

const base = "http://localhost:3333";
let count = 0;
async function check(path, expectedStatus, predicate, label, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  assert.equal(response.status, expectedStatus, `${path}: status incorreto`);
  const body = await response.json();
  assert.ok(predicate(body), `${path}: JSON inesperado: ${JSON.stringify(body)}`);
  console.log(`OK | ${response.status} | ${path} | ${label}`);
  count++;
}
function post(data) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
const valid = {
  name: "  Cliente Exemplo  ",
  phone: "(11) 99999-0000",
  email: "cliente@example.com",
  birthDate: "1995-04-20",
  acquisitionSource: "INSTAGRAM",
};
try {
  await check("/health", 200, (x) => x.status === "ok", "health");
  await check("/api/v1/info", 200, (x) => x.application === "Agenda Clínica", "info");
  await check("/api/v1/customers/preview", 200,
    (x) => x.customer?.name === "Cliente Exemplo" && x.customer.phone === "11999990000" && x.message.includes("Nenhum cliente"),
    "schema transforma telefone e nome", post(valid));
  await check("/api/v1/customers/preview", 422,
    (x) => !!x.error?.details?.fieldErrors?.name,
    "nome curto", post({ ...valid, name: "A" }));
  await check("/api/v1/customers/preview", 422,
    (x) => !!x.error?.details?.fieldErrors?.phone,
    "telefone inválido", post({ ...valid, phone: "123" }));
  await check("/api/v1/customers/preview", 422,
    (x) => x.error?.details?.formErrors?.length > 0,
    "campo extra", post({ ...valid, isAdmin: true }));
  await check("/api/v1/customers/preview", 400,
    (x) => x.error?.code === "INVALID_JSON", "JSON malformado",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  await check("/api/v1/customers", 404,
    (x) => x.error?.code === "ROUTE_NOT_FOUND", "cadastro real ainda não existe", post(valid));
  await check("/rota-inexistente", 404,
    (x) => x.error?.code === "ROUTE_NOT_FOUND", "404 geral");
  console.log(`\n${count} testes passaram. Aula 02 concluída.`);
} catch (error) {
  console.error("\nFalha. Inicie a API com npm run dev:backend e verifique as configurações.");
  console.error(error);
  process.exitCode = 1;
}
