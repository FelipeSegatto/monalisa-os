import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function start(name, dir) {
  const child = spawn(npm, ["run", "dev"], {
    cwd: join(root, dir),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  child.on("error", (error) => console.error(`[${name}] Erro:`, error.message));
  child.on("exit", (code) => {
    if (code && !stopping) {
      console.error(`[${name}] Terminou com codigo ${code}`);
    }
  });
  children.push(child);
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });

console.log("Iniciando Agenda Clinica:");
console.log("  Frontend: http://localhost:5199");
console.log("  Backend:  http://localhost:3333/health");
console.log("Ctrl+C para interromper.\n");
start("frontend", "frontend");
start("backend", "backend");
