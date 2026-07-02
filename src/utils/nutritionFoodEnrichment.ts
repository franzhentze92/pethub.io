import type { PetFoodRecord } from './nutritionSession';
import { foodDisplayLabel, normalizeFoodSearchText } from './nutritionSession';

const MICRO_FIELDS: (keyof PetFoodRecord)[] = [
  'vitamin_a_per_100g',
  'vitamin_d_per_100g',
  'vitamin_e_per_100g',
  'vitamin_k_per_100g',
  'vitamin_b1_per_100g',
  'vitamin_b2_per_100g',
  'vitamin_b3_per_100g',
  'vitamin_b6_per_100g',
  'vitamin_b12_per_100g',
  'vitamin_c_per_100g',
  'calcium_per_100g',
  'phosphorus_per_100g',
  'magnesium_per_100g',
  'iron_per_100g',
  'zinc_per_100g',
  'copper_per_100g',
  'manganese_per_100g',
  'selenium_per_100g',
  'sodium_per_100g',
  'potassium_per_100g',
  'iodine_per_100g',
];

/** Nombres retail GT → nombre en catálogo de referencia (misma marca). */
const GT_RETAIL_TO_REFERENCE: Array<{
  brand: string;
  retailPatterns: string[];
  referenceName: string;
}> = [
  {
    brand: 'royal canin',
    retailPatterns: ['adulto razas medianas', 'razas medianas', 'medium adult'],
    referenceName: 'medium adult',
  },
  {
    brand: 'royal canin',
    retailPatterns: ['cachorro razas medianas', 'medium puppy'],
    referenceName: 'medium puppy',
  },
  {
    brand: 'royal canin',
    retailPatterns: ['maxi adult', 'razas grandes'],
    referenceName: 'maxi adult',
  },
  {
    brand: 'royal canin',
    retailPatterns: ['indoor'],
    referenceName: 'indoor 27',
  },
  {
    brand: 'pedigree',
    retailPatterns: ['adulto razas medianas'],
    referenceName: 'adulto razas medianas y grandes',
  },
  {
    brand: 'purina dog chow',
    retailPatterns: ['adulto medianos', 'adulto razas medianas'],
    referenceName: 'adulto medianos y grandes',
  },
  {
    brand: 'purina pro plan',
    retailPatterns: ['adulto pollo'],
    referenceName: 'adulto pollo y arroz',
  },
  {
    brand: 'whiskas',
    retailPatterns: ['adulto pollo'],
    referenceName: 'adulto pollo',
  },
  {
    brand: 'purina cat chow',
    retailPatterns: ['adulto complete', 'adulto pollo'],
    referenceName: 'adulto complete',
  },
];

export function foodProfileMicroScore(food: PetFoodRecord): number {
  return MICRO_FIELDS.filter((key) => {
    const value = food[key];
    return value != null && Number(value) > 0;
  }).length;
}

export function foodProfileHasMicros(food: PetFoodRecord): boolean {
  return (
    foodProfileMicroScore(food) >= 4 &&
    food.vitamin_a_per_100g != null &&
    Number(food.vitamin_a_per_100g) > 0 &&
    food.calcium_per_100g != null &&
    Number(food.calcium_per_100g) > 0
  );
}

function nameTokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter((t) => t.length > 1));
  const tokensB = new Set(b.split(' ').filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return shared / Math.max(tokensA.size, tokensB.size);
}

function aliasReferenceName(brand: string, name: string): string | null {
  const normalizedBrand = normalizeFoodSearchText(brand);
  const normalizedName = normalizeFoodSearchText(name);

  for (const row of GT_RETAIL_TO_REFERENCE) {
    if (normalizeFoodSearchText(row.brand) !== normalizedBrand) continue;
    if (row.retailPatterns.some((pattern) => normalizedName.includes(normalizeFoodSearchText(pattern)))) {
      return normalizeFoodSearchText(row.referenceName);
    }
  }

  return null;
}

export function findBestReferenceSubstitute<T extends PetFoodRecord>(
  food: T,
  catalog: T[],
): T | undefined {
  const brand = normalizeFoodSearchText(food.brand ?? '');
  const name = normalizeFoodSearchText(food.name);
  if (!brand) return undefined;

  const aliasName = aliasReferenceName(food.brand ?? '', food.name);
  const candidates = catalog.filter((candidate) => {
    if (!foodProfileHasMicros(candidate)) return false;
    return normalizeFoodSearchText(candidate.brand ?? '') === brand;
  });

  if (candidates.length === 0) return undefined;

  const ranked = candidates
    .map((candidate) => {
      const candidateName = normalizeFoodSearchText(candidate.name);
      let score = nameTokenOverlap(name, candidateName);
      if (aliasName && candidateName.includes(aliasName)) score += 2;
      if (candidateName === name) score += 3;
      score += foodProfileMicroScore(candidate) * 0.05;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.2) return undefined;
  return best.candidate;
}

export function mergeMicroNutrients<T extends PetFoodRecord>(target: T, source: PetFoodRecord): T {
  const merged = { ...target };
  for (const key of MICRO_FIELDS) {
    const current = merged[key];
    const incoming = source[key];
    if ((current == null || Number(current) <= 0) && incoming != null && Number(incoming) > 0) {
      merged[key] = incoming;
    }
  }
  return merged;
}

export function enrichNutritionFood<T extends PetFoodRecord & { id: string }>(
  food: T,
  catalog: T[],
): T {
  if (foodProfileHasMicros(food)) return food;
  const substitute = findBestReferenceSubstitute(food, catalog);
  if (!substitute) return food;
  return mergeMicroNutrients(food, substitute);
}

export function enrichNutritionFoodCatalog<T extends PetFoodRecord & { id: string }>(
  foods: T[],
): T[] {
  return foods.map((food) => enrichNutritionFood(food, foods));
}

export function mergeNutritionFoodRow<T extends PetFoodRecord>(
  local: T,
  db: T,
): T {
  const merged = { ...local, ...db };
  for (const key of MICRO_FIELDS) {
    const dbValue = db[key];
    const localValue = local[key];
    if (dbValue == null || Number(dbValue) <= 0) {
      if (localValue != null && Number(localValue) > 0) {
        merged[key] = localValue;
      }
    }
  }
  const macroFields: (keyof PetFoodRecord)[] = [
    'calories_per_100g',
    'protein_per_100g',
    'fat_per_100g',
    'carbs_per_100g',
    'fiber_per_100g',
  ];
  for (const key of macroFields) {
    const dbValue = db[key];
    const localValue = local[key];
    if (dbValue == null || Number(dbValue) <= 0) {
      if (localValue != null && Number(localValue) > 0) {
        merged[key] = localValue;
      }
    }
  }
  return merged;
}

export function scoreFoodMatch(food: PetFoodRecord & { id: string }): number {
  return foodProfileMicroScore(food) * 10 + (foodProfileHasMicros(food) ? 100 : 0);
}

export function pickBestFoodMatch<T extends PetFoodRecord & { id: string }>(
  candidates: T[],
): T | undefined {
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => scoreFoodMatch(b) - scoreFoodMatch(a))[0];
}

function splitFoodDisplayName(foodName: string): { brand: string; productName: string } {
  const normalized = normalizeFoodSearchText(foodName);
  const dashIdx = foodName.indexOf(' - ');
  if (dashIdx >= 0) {
    return {
      brand: normalizeFoodSearchText(foodName.slice(0, dashIdx)),
      productName: normalizeFoodSearchText(foodName.slice(dashIdx + 3)),
    };
  }
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return { brand: parts[0], productName: parts.slice(1).join(' ') };
  }
  return { brand: '', productName: normalized };
}

export function collectFoodNameMatches<T extends PetFoodRecord & { id: string }>(
  foods: T[],
  foodName: string,
): T[] {
  const needle = normalizeFoodSearchText(foodName);
  if (!needle) return [];

  const tokens = needle.split(' ').filter((t) => t.length > 1);
  const matches = new Set<T>();

  for (const food of foods) {
    const label = normalizeFoodSearchText(foodDisplayLabel(food));
    if (label === needle) matches.add(food);
    if (label.includes(needle) || needle.includes(label)) matches.add(food);
    if (tokens.length > 0 && tokens.every((token) => label.includes(token))) matches.add(food);
  }

  const { brand: brandGuess, productName: nameGuess } = splitFoodDisplayName(foodName);
  if (brandGuess && nameGuess) {
    const aliasName = aliasReferenceName(brandGuess, nameGuess);
    if (aliasName) {
      for (const food of foods) {
        const label = normalizeFoodSearchText(foodDisplayLabel(food));
        if (label.includes(brandGuess) && label.includes(aliasName)) matches.add(food);
      }
    }
    for (const food of foods) {
      const foodBrand = normalizeFoodSearchText(food.brand ?? '');
      const foodNameNorm = normalizeFoodSearchText(food.name);
      if (foodBrand === brandGuess && nameTokenOverlap(nameGuess, foodNameNorm) >= 0.5) {
        matches.add(food);
      }
    }
  }

  return Array.from(matches);
}
