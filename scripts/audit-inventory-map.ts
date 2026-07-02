import { ECONOMY_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaEconomyReferenceFoods';
import { WAVE2_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaMassMarketWave2ReferenceFoods';
import { WAVE3_INVENTORY_REFERENCE_MAP } from '../src/data/guatemalaPremiumWave3ReferenceFoods';

// Minimal copy of PRODUCT_LINES_RAW ids - import would pull whole app
import { GUATEMALA_PET_FOOD_PRODUCT_LINES } from '../src/data/guatemalaPetFoodMarketInventory';

const MAP = {
  ...ECONOMY_INVENTORY_REFERENCE_MAP,
  ...WAVE2_INVENTORY_REFERENCE_MAP,
  ...WAVE3_INVENTORY_REFERENCE_MAP,
};

const unmapped = GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => !MAP[p.id] && !p.referenceFoodId);
console.log('Total lines:', GUATEMALA_PET_FOOD_PRODUCT_LINES.length);
console.log('Profiled:', GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'profiled').length);
console.log('Queued:', GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'queued').length);
console.log('Needs research:', GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'needs_research').length);
console.log('\nUnmapped (no ref):', unmapped.length);
unmapped.forEach((p) => console.log(`  ${p.id} | ${p.brandId} | ${p.name} | ${p.profileStatus}`));
