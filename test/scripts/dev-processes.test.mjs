import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

for (const interrupt of [false, true]) {
  test(
    interrupt
      ? "dev encerra os dois serviços ao receber SIGINT"
      : "dev propaga falha e encerra o serviço restante",
    { skip: process.platform === "win32", timeout: 10000 },
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "monalisa-phase1-dev-"));
      const owned = new Set();
      let child;
      try {
        const fake = join(dir, "npm");
        await writeFile(
          fake,
          `#!/usr/bin/env node\nconsole.log('OWNED:'+process.pid);\nif(process.cwd().endsWith('backend')&&process.env.FAKE_BACKEND_EXIT==='yes')setTimeout(()=>process.exit(7),300);\nelse setInterval(()=>{},1000);\n`,
        );
        await chmod(fake, 0o755);
        child = spawn(
          process.execPath,
          [fileURLToPath(new URL("../../scripts/dev.mjs", import.meta.url))],
          {
            env: {
              ...process.env,
              PATH: dir + delimiter + process.env.PATH,
              FAKE_BACKEND_EXIT: interrupt ? "no" : "yes",
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let stdout = "",
          stderr = "";
        let signaled = false;
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
          for (const match of stdout.matchAll(/OWNED:(\d+)/g))
            owned.add(Number(match[1]));
          if (interrupt && owned.size === 2 && !signaled) {
            signaled = true;
            child.kill("SIGINT");
          }
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Orquestrador não encerrou serviços")),
            5000,
          );
          child.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
          });
          child.on("close", (code, signal) => {
            clearTimeout(timer);
            resolve({ code, signal });
          });
        });
        assert.equal(owned.size, 2, stdout + stderr);
        assert.equal(result.code, interrupt ? 130 : 7, stderr);
        assert.equal(result.signal, null);
        for (const pid of owned)
          assert.throws(
            () => process.kill(pid, 0),
            (error) => error.code === "ESRCH",
          );
      } finally {
        if (child && child.exitCode === null) child.kill("SIGKILL");
        for (const pid of owned) {
          try {
            process.kill(-pid, "SIGKILL");
          } catch (error) {
            if (error.code !== "ESRCH") throw error;
          }
        }
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
}
