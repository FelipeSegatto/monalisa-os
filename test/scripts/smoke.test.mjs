import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

test(
  "smoke consulta somente as rotas atuais e nunca grava dados",
  { timeout: 10000 },
  async () => {
    const requests = [];
    const server = createServer((req, res) => {
      requests.push({ method: req.method, path: req.url });
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/v1/me") {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Faça login" }));
      } else if (req.url === "/api/v1/public/catalog") {
        res.statusCode = 200;
        res.end(JSON.stringify({ categories: [] }));
      } else {
        res.statusCode = 404;
        res.end("{}");
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const child = spawn(
        process.execPath,
        [
          fileURLToPath(
            new URL("../../scripts/smoke-test.mjs", import.meta.url),
          ),
        ],
        {
          env: {
            ...process.env,
            SMOKE_URL: `http://127.0.0.1:${server.address().port}`,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.stdout.resume();
      const code = await new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", resolve);
      });
      assert.equal(code, 0, stderr);
      assert.deepEqual(requests, [
        { method: "GET", path: "/api/v1/me" },
        { method: "GET", path: "/api/v1/public/catalog" },
      ]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
