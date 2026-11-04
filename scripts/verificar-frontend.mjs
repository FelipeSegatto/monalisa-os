import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const hashes = JSON.parse(await readFile(resolve(root, 'docs/frontend-integridade.json'), 'utf8'));
let bad = 0;
for (const [name, expected] of Object.entries(hashes)) {
  try {
    const actual = createHash('sha256').update(await readFile(resolve(root, name))).digest('hex');
    if (actual !== expected) { console.error('ALTERADO:', name); bad++; }
  } catch (error) { console.error('AUSENTE:', name, error.code); bad++; }
}
console.log(`${Object.keys(hashes).length} arquivos originais conferidos; ${bad} divergência(s).`);
process.exitCode = bad ? 1 : 0;
