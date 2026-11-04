import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  isSupportedNode,
  REFERENCE_NODE,
  NODE_RANGE,
} from "../../scripts/check-node.mjs";
import { assertTestDataAllowed } from "../../backend/scripts/test-data-guard.mjs";
const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
test("runtime suporta somente a linha Node padronizada e rejeita versões ambíguas", () => {
  for (const value of [
    "20.19.0",
    "22.12.0",
    "24.18.9",
    "25.0.0",
    "24.19.0-rc.1",
    "garbage",
  ])
    assert.equal(isSupportedNode(value), false, value);
  for (const value of ["24.19.0", "24.19.1", "24.20.0"])
    assert.equal(isSupportedNode(value), true, value);
  assert.equal(
    readFileSync(new URL("../../.nvmrc", import.meta.url), "utf8").trim(),
    REFERENCE_NODE,
  );
  assert.equal(
    readFileSync(
      new URL("../../.node-version", import.meta.url),
      "utf8",
    ).trim(),
    REFERENCE_NODE,
  );
});
test("manifests e locks têm engines iguais e todos os comandos delegados existem", () => {
  const root = read("../../package.json"),
    backend = read("../../backend/package.json"),
    frontend = read("../../frontend/package.json");
  for (const data of [root, backend, frontend])
    assert.equal(data.engines.node, NODE_RANGE);
  for (const folder of ["backend", "frontend"])
    assert.deepEqual(
      read(`../../${folder}/package-lock.json`).packages[""].engines,
      read(`../../${folder}/package.json`).engines,
    );
  for (const command of Object.values(root.scripts)) {
    for (const match of command.matchAll(
      /npm run ([\w:-]+) --prefix (backend|frontend)/g,
    ))
      assert.ok(
        (match[2] === "backend" ? backend : frontend).scripts[match[1]],
        `${match[2]}:${match[1]}`,
      );
  }
});
test("E2E mutável exige intenção explícita, API local e ambiente não produtivo", () => {
  assert.throws(() => assertTestDataAllowed([], undefined, "development"));
  assert.throws(() =>
    assertTestDataAllowed(
      ["--confirm-test-data"],
      "http://localhost:3333",
      "production",
    ),
  );
  assert.throws(() =>
    assertTestDataAllowed(
      ["--confirm-test-data"],
      "https://clinica.example",
      "development",
    ),
  );
  assert.doesNotThrow(() =>
    assertTestDataAllowed(
      ["--confirm-test-data"],
      "http://127.0.0.1:3398",
      "test",
    ),
  );
});
