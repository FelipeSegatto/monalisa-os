import { assertSupportedNode } from "./check-node.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

assertSupportedNode();

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tasks = [
  { folder: "frontend", args: ["ci", "--no-audit", "--no-fund"] },
  { folder: "backend", args: ["ci", "--no-audit", "--no-fund"] },
];

for (const { folder, args } of tasks) {
  const directory = join(root, folder);
  console.log(`\n==> Instalando dependencias de ${folder}...`);
  const result = spawnSync(npm, args, {
    cwd: directory,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error || result.status !== 0) {
    console.error(
      `Falha ao instalar ${folder}. Verifique a internet, versao do Node e o erro acima.`,
    );
    process.exit(result.status || 1);
  }
}

for (const [source, target] of [
  ["frontend/.env.example", "frontend/.env.local"],
  ["backend/.env.example", "backend/.env"],
]) {
  const from = join(root, source);
  const to = join(root, target);
  if (!existsSync(to)) {
    copyFileSync(from, to);
    console.log(`Criado: ${target}`);
  } else {
    console.log(`Preservado: ${target}`);
  }
}

console.log(
  "\nPreparação concluída. Configure o backend/.env, gere o Prisma Client e confira as migrations antes de iniciar a API. Consulte docs/fase-1-ambiente.md.",
);
