import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSupportedNode } from "../../scripts/check-node.mjs";
assertSupportedNode();
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
const result = spawnSync(
  process.execPath,
  [tsx, "--test", "test/contracts/*.test.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CONTRACT_RUNTIME: process.argv[2] === "compiled" ? "compiled" : "source",
    },
    stdio: "inherit",
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
