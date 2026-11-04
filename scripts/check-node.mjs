import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE_NODE = "24.19.0";
export const NODE_RANGE = ">=24.19.0 <25";
export function isSupportedNode(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return !!match && Number(match[1]) === 24 && Number(match[2]) >= 19;
}
export function assertSupportedNode(version = process.versions.node) {
  if (!isSupportedNode(version))
    throw new Error(
      `Node ${version} incompatível. Use Node ${REFERENCE_NODE} (ou patch mais recente da linha 24, mínimo 24.19.0). Consulte .nvmrc e docs/fase-1-ambiente.md.`,
    );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assertSupportedNode();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
