/**
 * Sincroniza profileStatus y referenceFoodId en PRODUCT_LINES_RAW
 * según los mapas de oleadas 1–3.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ECONOMY_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaEconomyReferenceFoods';
import { WAVE2_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaMassMarketWave2ReferenceFoods';
import { WAVE3_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaPremiumWave3ReferenceFoods';

const MAP = {
  ...ECONOMY_INVENTORY_REFERENCE_MAP,
  ...WAVE2_INVENTORY_REFERENCE_MAP,
  ...WAVE3_INVENTORY_REFERENCE_MAP,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../src/data/guatemalaPetFoodMarketInventory.ts');
let src = fs.readFileSync(file, 'utf8');

const lineRe =
  /\{ id: '([^']+)'([^}]*?)profileStatus: '(queued|needs_research|profiled)'([^}]*?)\}/g;

let updated = 0;
src = src.replace(lineRe, (full, id: string, before: string, status: string, after: string) => {
  const refId = MAP[id];
  if (!refId) return full;

  const body = `${before}${after}`;
  const already =
    status === 'profiled' &&
    body.includes(`referenceFoodId: '${refId}'`);
  if (already) return full;

  updated++;
  const withoutRef = body.replace(/,?\s*referenceFoodId: '[^']+'/, '');
  return `{ id: '${id}'${withoutRef}profileStatus: 'profiled', referenceFoodId: '${refId}' }`;
});

if (process.argv.includes('--write')) {
  fs.writeFileSync(file, src);
  console.log(`Updated ${updated} product lines in PRODUCT_LINES_RAW`);
} else {
  console.log(`Would update ${updated} product lines (run with --write to apply)`);
}
