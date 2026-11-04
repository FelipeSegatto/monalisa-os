import { assertSupportedNode } from "./check-node.mjs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

assertSupportedNode();

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
for (const folder of ["frontend", "backend"]) {
  console.log(`\n==> Compilando ${folder}`);
  const result = spawnSync(npm, ["run", "build"], {
    cwd: join(root, folder),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log("\nAmbos os projetos compilados com sucesso.");
