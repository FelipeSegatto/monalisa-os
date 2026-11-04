import { assertSupportedNode } from "./check-node.mjs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
assertSupportedNode();
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const windows = process.platform === "win32";
const npm = windows ? "npm.cmd" : "npm";
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (windows) {
      // Only the process trees started by this orchestrator, never global Node.
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH")
          console.error(
            "Falha ao encerrar processo do projeto:",
            error.message,
          );
      }
    }
  }
}
function start(name, dir) {
  const child = spawn(npm, ["run", "dev"], {
    cwd: join(root, dir),
    stdio: "inherit",
    shell: windows,
    detached: !windows,
    env: process.env,
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[${name}] ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(
        `[${name}] Encerrado (${signal || code}); encerrando o outro serviço.`,
      );
      stop(code || 1);
    }
  });
}
process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
console.log(
  "Iniciando frontend (5199) e backend (PORT do backend/.env, padrão 3333).",
);
console.log(
  "MySQL deve estar disponível. Ctrl+C encerra os serviços deste projeto.",
);
start("backend", "backend");
start("frontend", "frontend");
