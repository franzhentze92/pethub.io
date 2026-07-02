import { supabase } from '@/lib/supabase';
import type { NutritionFoodRow } from '@/utils/nutritionFoodCatalog';
import {
  expandMarketplaceTokens,
  scoreProductMatchSemantic,
  tokenizeMarketplaceQuery,
} from './marketplaceSearch';
import {
  ingredientsMatchTokens,
  resolveProductNutritionProfile,
} from './productNutritionProfile';
import { productHasNutritionData } from '@/config/productNutrition';
import { buildMarketplaceAvailabilityNote } from './nutritionMarketplaceNotice';
import { gapKindLabel } from './nutritionIntent';

const PRODUCT_SELECT_BASE =
  'id, product_name, product_category, description, detailed_description, brand, price, currency, stock_quantity, tags, target_species, product_subtype, life_stage, providers(business_name, has_delivery)';

const PRODUCT_SELECT_EXTENDED =
  `${PRODUCT_SELECT_BASE.replace(', providers', ', ingredients, nutrition_protein_pct, nutrition_fat_pct, nutrition_fiber_pct, nutrition_moisture_pct, nutrition_ash_pct, nutrition_calories_per_100g, providers')}`;

const SERVICE_SELECT =
  'id, service_name, service_category, description, price, currency, duration_minutes, providers(business_name, address)';

const DEFICIENCY_THRESHOLD = 88;

export type NutrientGapKind =
  | 'fat_intake'
  | 'protein_intake'
  | 'calories_intake'
  | 'fiber_intake'
  | 'omega_fatty_acids'
  | 'zinc'
  | 'calcium'
  | 'iron'
  | 'phosphorus'
  | 'vitamin_e'
  | 'vitamin_a'
  | 'vitamin_d'
  | 'vitamin_b_complex'
  | 'minerals_general'
  | 'vitamins_general';

export interface NutrientGap {
  kind: NutrientGapKind;
  severity: 'mild' | 'moderate' | 'significant';
  reason: string;
  compliance_pct?: number | null;
}

export interface MarketplaceProductRecommendation {
  product_id: string;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  price: number;
  currency: string;
  stock: number;
  provider?: string;
  has_delivery?: boolean;
  why_recommended: string;
  gap_addressed: NutrientGapKind;
  nutrition_match?: {
    source: 'marketplace' | 'catalog' | 'none';
    catalog_label?: string | null;
    fat_as_fed_pct?: number | null;
    protein_as_fed_pct?: number | null;
    ingredients_preview?: string | null;
    data_source?: string | null;
  };
  suggested_action: 'cart_add_item';
  suggested_action_params: { product_name: string; quantity: number };
}

export interface MarketplaceServiceRecommendation {
  service_id: string;
  service_name: string;
  category?: string | null;
  price: number;
  currency: string;
  duration_minutes?: number | null;
  provider?: string;
  why_recommended: string;
}

type MarketplaceProductRow = {
  id: string;
  product_name: string;
  product_category?: string | null;
  description?: string | null;
  detailed_description?: string | null;
  brand?: string | null;
  price: number;
  currency?: string | null;
  stock_quantity?: number | null;
  tags?: string[] | null;
  target_species?: string[] | null;
  product_subtype?: string | null;
  life_stage?: string | null;
  ingredients?: string | null;
  nutrition_protein_pct?: number | null;
  nutrition_fat_pct?: number | null;
  nutrition_fiber_pct?: number | null;
  nutrition_moisture_pct?: number | null;
  nutrition_ash_pct?: number | null;
  nutrition_calories_per_100g?: number | null;
  providers?: { business_name?: string; has_delivery?: boolean } | null;
};

type DietAnalysisInput = {
  species: string;
  monthly_summary: {
    calories: { compliance_pct?: number | null };
    protein: { compliance_pct?: number | null };
    fat: { compliance_pct?: number | null };
  };
  primary_food_profile?: {
    as_fed_pct?: { fat?: number | null; protein?: number | null; fiber?: number | null };
    minerals_per_100g?: Record<string, number | null>;
    vitamins_per_100g?: Record<string, number | null>;
    data_source?: string | null;
  } | null;
};

function toMarketplaceSpecies(species: string): 'perro' | 'gato' | undefined {
  const s = species.toLowerCase();
  if (s.includes('dog') || s.includes('perro') || s.includes('canin')) return 'perro';
  if (s.includes('cat') || s.includes('gato') || s.includes('felin')) return 'gato';
  return undefined;
}

function speciesFoods(foods: NutritionFoodRow[], species: string): NutritionFoodRow[] {
  const mp = toMarketplaceSpecies(species);
  if (!mp) return foods;
  const target = mp === 'perro' ? 'dog' : 'cat';
  return foods.filter((f) => {
    const fs = (f.species ?? '').toLowerCase();
    return fs.includes(target) || fs === mp;
  });
}

function severityFromCompliance(pct: number | null | undefined): NutrientGap['severity'] {
  if (pct == null) return 'mild';
  if (pct < 70) return 'significant';
  if (pct < 80) return 'moderate';
  return 'mild';
}

export function detectNutrientGaps(analysis: DietAnalysisInput): NutrientGap[] {
  const gaps: NutrientGap[] = [];
  const mpSpecies = toMarketplaceSpecies(analysis.species);
  const fatPct = analysis.monthly_summary.fat.compliance_pct;
  const proteinPct = analysis.monthly_summary.protein.compliance_pct;
  const caloriesPct = analysis.monthly_summary.calories.compliance_pct;
  const foodFat = analysis.primary_food_profile?.as_fed_pct?.fat;
  const minFoodFat = mpSpecies === 'gato' ? 9 : 12;

  if (fatPct != null && fatPct < DEFICIENCY_THRESHOLD) {
    gaps.push({
      kind: 'fat_intake',
      severity: severityFromCompliance(fatPct),
      reason: `Ingesta de grasa al ${fatPct}% de lo estimado para el período.`,
      compliance_pct: fatPct,
    });
  }

  if (foodFat != null && foodFat < minFoodFat && (fatPct == null || fatPct < 95)) {
    gaps.push({
      kind: 'fat_intake',
      severity: foodFat < minFoodFat - 2 ? 'moderate' : 'mild',
      reason: `El alimento principal tiene ${foodFat}% grasa (referencia adulto: ~${minFoodFat}–${mpSpecies === 'gato' ? 15 : 18}%).`,
      compliance_pct: fatPct,
    });
  }

  if (proteinPct != null && proteinPct < DEFICIENCY_THRESHOLD) {
    gaps.push({
      kind: 'protein_intake',
      severity: severityFromCompliance(proteinPct),
      reason: `Ingesta de proteína al ${proteinPct}% de lo estimado.`,
      compliance_pct: proteinPct,
    });
  }

  if (caloriesPct != null && caloriesPct < DEFICIENCY_THRESHOLD) {
    gaps.push({
      kind: 'calories_intake',
      severity: severityFromCompliance(caloriesPct),
      reason: `Calorías al ${caloriesPct}% de lo estimado.`,
      compliance_pct: caloriesPct,
    });
  }

  const hasFatGap = gaps.some((g) => g.kind === 'fat_intake');
  if (hasFatGap) {
    gaps.push({
      kind: 'omega_fatty_acids',
      severity: 'mild',
      reason: 'Con baja grasa suele ayudar reforzar ácidos grasos omega (aceite de salmón, suplementos).',
      compliance_pct: fatPct,
    });
  }

  const zinc = analysis.primary_food_profile?.minerals_per_100g?.zinc;
  if (zinc != null && zinc < 12) {
    gaps.push({
      kind: 'zinc',
      severity: zinc < 8 ? 'moderate' : 'mild',
      reason: `Zinc bajo en el perfil del alimento actual (${zinc} mg/100g).`,
    });
  }

  const calcium = analysis.primary_food_profile?.minerals_per_100g?.calcium;
  if (calcium != null && calcium < 0.8) {
    gaps.push({
      kind: 'calcium',
      severity: calcium < 0.5 ? 'moderate' : 'mild',
      reason: `Calcio bajo en el perfil del alimento actual (${calcium} g/100g).`,
    });
  }

  const iron = analysis.primary_food_profile?.minerals_per_100g?.iron;
  if (iron != null && iron < 8) {
    gaps.push({
      kind: 'iron',
      severity: iron < 5 ? 'moderate' : 'mild',
      reason: `Hierro bajo en el perfil del alimento actual (${iron} mg/100g).`,
    });
  }

  const phosphorus = analysis.primary_food_profile?.minerals_per_100g?.phosphorus;
  if (phosphorus != null && phosphorus < 0.5) {
    gaps.push({
      kind: 'phosphorus',
      severity: 'mild',
      reason: `Fósforo bajo en el perfil del alimento actual (${phosphorus} g/100g).`,
    });
  }

  const foodFiber = analysis.primary_food_profile?.as_fed_pct?.fiber;
  if (foodFiber != null && foodFiber < 2.5) {
    gaps.push({
      kind: 'fiber_intake',
      severity: foodFiber < 1.5 ? 'moderate' : 'mild',
      reason: `Fibra baja en el alimento principal (${foodFiber}% en alimento seco).`,
      compliance_pct: fatPct,
    });
  }

  const vitamins = analysis.primary_food_profile?.vitamins_per_100g ?? {};
  const vitaminE = vitamins.vitamin_e;
  if (vitaminE != null && vitaminE < 5) {
    gaps.push({
      kind: 'vitamin_e',
      severity: vitaminE < 3 ? 'moderate' : 'mild',
      reason: `Vitamina E baja en el perfil del alimento (${vitaminE} mg/100g).`,
    });
  }

  const vitaminA = vitamins.vitamin_a;
  if (vitaminA != null && vitaminA < 2) {
    gaps.push({
      kind: 'vitamin_a',
      severity: 'mild',
      reason: `Vitamina A baja en el perfil del alimento (${vitaminA} mg/100g).`,
    });
  }

  const vitaminD = vitamins.vitamin_d;
  if (vitaminD != null && vitaminD < 0.3) {
    gaps.push({
      kind: 'vitamin_d',
      severity: 'mild',
      reason: `Vitamina D baja en el perfil del alimento (${vitaminD} mg/100g).`,
    });
  }

  const bVitamins = ['vitamin_b1', 'vitamin_b2', 'vitamin_b12'] as const;
  const lowB = bVitamins.filter((key) => {
    const value = vitamins[key];
    return value != null && value < 0.05;
  });
  if (lowB.length >= 2) {
    gaps.push({
      kind: 'vitamin_b_complex',
      severity: 'mild',
      reason: 'Varias vitaminas del complejo B están por debajo de referencia en el alimento actual.',
    });
  }

  const mineralKeys = ['magnesium', 'selenium', 'potassium', 'iodine', 'copper', 'manganese'] as const;
  const lowMinerals = mineralKeys.filter((key) => {
    const value = analysis.primary_food_profile?.minerals_per_100g?.[key];
    return value != null && value < 5;
  });
  if (lowMinerals.length >= 2) {
    gaps.push({
      kind: 'minerals_general',
      severity: 'mild',
      reason: 'Varios minerales del perfil del alimento están en rango bajo.',
    });
  }

  const vitaminKeys = ['vitamin_c', 'vitamin_k', 'vitamin_b3', 'vitamin_b6'] as const;
  const lowVitamins = vitaminKeys.filter((key) => {
    const value = vitamins[key];
    return value != null && value < 0.1;
  });
  if (lowVitamins.length >= 2) {
    gaps.push({
      kind: 'vitamins_general',
      severity: 'mild',
      reason: 'Varias vitaminas del perfil del alimento están en rango bajo.',
    });
  }

  const seen = new Map<NutrientGapKind, NutrientGap>();
  for (const gap of gaps) {
    const existing = seen.get(gap.kind);
    if (!existing) {
      seen.set(gap.kind, gap);
      continue;
    }
    const order = { mild: 0, moderate: 1, significant: 2 };
    if (order[gap.severity] > order[existing.severity]) {
      seen.set(gap.kind, { ...gap, reason: `${existing.reason} ${gap.reason}` });
    } else {
      seen.set(gap.kind, { ...existing, reason: `${gap.reason} ${existing.reason}` });
    }
  }
  return [...seen.values()];
}

function formatProductRecommendation(
  product: MarketplaceProductRow,
  gap: NutrientGap,
  why: string,
  foods: NutritionFoodRow[],
): MarketplaceProductRecommendation {
  const profile = resolveProductNutritionProfile(product, foods);
  const ingredientsPreview = product.ingredients?.trim()
    ? product.ingredients.trim().slice(0, 120) + (product.ingredients.length > 120 ? '…' : '')
    : null;

  return {
    product_id: product.id,
    product_name: product.product_name,
    brand: product.brand,
    category: product.product_category,
    price: Number(product.price),
    currency: product.currency ?? 'GTQ',
    stock: product.stock_quantity ?? 0,
    provider: product.providers?.business_name,
    has_delivery: product.providers?.has_delivery,
    why_recommended: why,
    gap_addressed: gap.kind,
    nutrition_match: {
      source: profile.source,
      catalog_label: profile.label,
      fat_as_fed_pct: profile.fat_pct,
      protein_as_fed_pct: profile.protein_pct,
      ingredients_preview: ingredientsPreview,
      data_source: profile.source === 'marketplace' ? 'proveedor (etiqueta)' : profile.source === 'catalog' ? 'catálogo pet_foods' : null,
    },
    suggested_action: 'cart_add_item',
    suggested_action_params: { product_name: product.product_name, quantity: 1 },
  };
}

async function fetchActiveProducts(opts: {
  species?: 'perro' | 'gato';
  category?: string;
  searchText?: string;
  limit?: number;
}): Promise<MarketplaceProductRow[]> {
  const limit = opts.limit ?? 40;
  const tokens = opts.searchText
    ? expandMarketplaceTokens(tokenizeMarketplaceQuery(opts.searchText))
    : [];
  const fetchLimit = Math.max(limit * 5, 60);

  async function runQuery(select: string): Promise<MarketplaceProductRow[]> {
    let query = supabase
      .from('provider_products')
      .select(select)
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    if (opts.category) {
      query = query.ilike('product_category', `%${opts.category}%`);
    }
    if (opts.species) {
      query = query.or(`target_species.cs.{${opts.species}},target_species.cs.{todos}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(fetchLimit);
    if (error) throw error;
    return (data ?? []) as MarketplaceProductRow[];
  }

  try {
    let rows: MarketplaceProductRow[];
    try {
      rows = await runQuery(PRODUCT_SELECT_EXTENDED);
    } catch (extendedError) {
      console.warn('[PetBuddy] Extended product select failed, using base columns:', extendedError);
      rows = await runQuery(PRODUCT_SELECT_BASE);
    }

    if (tokens.length === 0 || !opts.searchText) return rows.slice(0, limit);

    const searchPhrase = opts.searchText;
    return rows
      .filter((product) => scoreProductMatchSemantic(product, tokens, searchPhrase) > 0)
      .slice(0, limit);
  } catch (error) {
    console.warn('[PetBuddy] fetchActiveProducts failed:', error);
    return [];
  }
}

function rankFoodProductsForGap(
  products: MarketplaceProductRow[],
  foods: NutritionFoodRow[],
  gap: NutrientGap,
  searchPhrase: string,
): MarketplaceProductRow[] {
  const tokens = expandMarketplaceTokens(tokenizeMarketplaceQuery(searchPhrase));
  return [...products]
    .map((product) => {
      let score = scoreProductMatchSemantic(product, tokens, searchPhrase);
      score += ingredientsMatchTokens(product.ingredients, tokens);
      if (productHasNutritionData(product)) score += 8;

      const profile = resolveProductNutritionProfile(product, foods);
      if (profile.source !== 'none') score += 5;

      if (gap.kind === 'fat_intake' || gap.kind === 'calories_intake') {
        score += (profile.fat_pct ?? 0) * 0.4;
      }
      if (gap.kind === 'protein_intake') {
        score += (profile.protein_pct ?? 0) * 0.4;
      }
      if (gap.kind === 'fiber_intake') {
        score += (profile.fiber_pct ?? 0) * 0.35;
      }
      if (gap.kind === 'omega_fatty_acids') {
        const ing = (product.ingredients ?? '').toLowerCase();
        if (/\b(omega|salmon|pescado|fish|aceite)\b/.test(ing)) score += 10;
      }

      return { product, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.product);
}

function rankSupplementProducts(
  products: MarketplaceProductRow[],
  searchPhrase: string,
): MarketplaceProductRow[] {
  const tokens = expandMarketplaceTokens(tokenizeMarketplaceQuery(searchPhrase));
  return [...products]
    .map((product) => {
      let score = scoreProductMatchSemantic(product, tokens, searchPhrase);
      score += ingredientsMatchTokens(product.ingredients, tokens);
      const ing = (product.ingredients ?? '').toLowerCase();
      if (/\b(omega|zinc|calcio|vitamina|suplemento)\b/.test(ing)) score += 6;
      return { product, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.product);
}

async function fetchNutritionServices(limit = 3): Promise<MarketplaceServiceRecommendation[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select(SERVICE_SELECT)
    .eq('is_active', true)
    .or(
      'service_name.ilike.%nutric%,description.ilike.%nutric%,service_name.ilike.%veterin%,description.ilike.%consulta%,service_category.ilike.%veterin%',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((s) => ({
    service_id: s.id,
    service_name: s.service_name,
    category: s.service_category,
    price: Number(s.price),
    currency: s.currency ?? 'GTQ',
    duration_minutes: s.duration_minutes,
    provider: (s.providers as { business_name?: string })?.business_name,
    why_recommended: 'Consulta profesional para ajustar dieta con base en el déficit detectado.',
  }));
}

const GAP_PRODUCT_SEARCH: Record<
  NutrientGapKind,
  { category: string; queries: string[]; productType: 'food' | 'supplement' }
> = {
  fat_intake: {
    category: 'alimentos',
    queries: ['alimento perro grasa', 'concentrado energy', 'puppy', 'adulto premium'],
    productType: 'food',
  },
  protein_intake: {
    category: 'alimentos',
    queries: ['alimento alto protein', 'pro plan', 'premium adulto'],
    productType: 'food',
  },
  calories_intake: {
    category: 'alimentos',
    queries: ['alimento energy', 'concentrado adulto', 'high calorie'],
    productType: 'food',
  },
  omega_fatty_acids: {
    category: 'medicamentos',
    queries: ['omega 3', 'omega 3 6', 'aceite salmon', 'fish oil', 'suplemento omega'],
    productType: 'supplement',
  },
  zinc: {
    category: 'medicamentos',
    queries: ['zinc', 'suplemento mineral', 'vitamina mineral'],
    productType: 'supplement',
  },
  calcium: {
    category: 'medicamentos',
    queries: ['calcio', 'suplemento calcio', 'vitamina'],
    productType: 'supplement',
  },
  fiber_intake: {
    category: 'alimentos',
    queries: ['alimento fibra', 'digestión', 'intestinal', 'prebiótico'],
    productType: 'food',
  },
  iron: {
    category: 'medicamentos',
    queries: ['hierro', 'suplemento hierro', 'anemia'],
    productType: 'supplement',
  },
  phosphorus: {
    category: 'medicamentos',
    queries: ['fósforo', 'fosforo', 'mineral'],
    productType: 'supplement',
  },
  vitamin_e: {
    category: 'medicamentos',
    queries: ['vitamina e', 'tocopherol', 'antioxidante'],
    productType: 'supplement',
  },
  vitamin_a: {
    category: 'medicamentos',
    queries: ['vitamina a', 'retinol'],
    productType: 'supplement',
  },
  vitamin_d: {
    category: 'medicamentos',
    queries: ['vitamina d', 'calcio vitamina d'],
    productType: 'supplement',
  },
  vitamin_b_complex: {
    category: 'medicamentos',
    queries: ['vitamina b', 'complejo b', 'multivitamínico'],
    productType: 'supplement',
  },
  minerals_general: {
    category: 'medicamentos',
    queries: ['minerales', 'suplemento mineral', 'electrolitos'],
    productType: 'supplement',
  },
  vitamins_general: {
    category: 'medicamentos',
    queries: ['multivitamínico', 'vitaminas', 'suplemento vitamínico'],
    productType: 'supplement',
  },
};

export async function buildNutritionMarketplaceRecommendations(
  analysis: DietAnalysisInput,
  foodsCatalog: NutritionFoodRow[],
  petName?: string | null,
): Promise<{
  gaps_detected: NutrientGap[];
  product_recommendations: MarketplaceProductRecommendation[];
  service_recommendations: MarketplaceServiceRecommendation[];
  assistant_note: string;
  marketplace_availability_note: string | null;
  marketplace_status: 'no_gaps' | 'has_products' | 'no_products';
}> {
  const gaps = detectNutrientGaps(analysis);
  if (gaps.length === 0) {
    return {
      gaps_detected: [],
      product_recommendations: [],
      service_recommendations: [],
      assistant_note: 'No se detectaron déficits relevantes; no hace falta buscar en marketplace.',
      marketplace_availability_note: null,
      marketplace_status: 'no_gaps',
    };
  }

  const mpSpecies = toMarketplaceSpecies(analysis.species);
  const speciesFoodsList = speciesFoods(foodsCatalog, analysis.species);
  const recommendations: MarketplaceProductRecommendation[] = [];
  const usedProductIds = new Set<string>();

  for (const gap of gaps) {
    const config = GAP_PRODUCT_SEARCH[gap.kind];
    for (const query of config.queries) {
      if (recommendations.filter((r) => r.gap_addressed === gap.kind).length >= 3) break;

      const products = await fetchActiveProducts({
        species: mpSpecies,
        category: config.category,
        searchText: query,
        limit: 24,
      });

      const ranked =
        config.productType === 'food'
          ? rankFoodProductsForGap(products, speciesFoodsList, gap, query)
          : rankSupplementProducts(products, query);

      for (const product of ranked) {
        if (usedProductIds.has(product.id)) continue;
        if (recommendations.filter((r) => r.gap_addressed === gap.kind).length >= 3) break;

        const profile = resolveProductNutritionProfile(product, speciesFoodsList);
        const highlight =
          gap.kind === 'fat_intake' && profile.fat_pct != null
            ? `${profile.fat_pct}% grasa (${profile.source === 'marketplace' ? 'etiqueta proveedor' : 'catálogo'})`
            : gap.kind === 'protein_intake' && profile.protein_pct != null
              ? `${profile.protein_pct}% proteína`
              : product.ingredients?.trim()
                ? `ingredientes: ${product.ingredients.trim().slice(0, 60)}…`
                : product.product_name;

        recommendations.push(
          formatProductRecommendation(
            product,
            gap,
            `${gap.reason} Opción en tienda: ${highlight}.`,
            speciesFoodsList,
          ),
        );
        usedProductIds.add(product.id);
      }
    }
  }

  const hasSignificantGap = gaps.some((g) => g.severity === 'significant' || g.severity === 'moderate');
  const service_recommendations = hasSignificantGap ? await fetchNutritionServices(2) : [];

  const product_recommendations = recommendations.slice(0, 8);
  const marketplace_availability_note = buildMarketplaceAvailabilityNote(
    gaps,
    product_recommendations.length,
    petName,
  );

  const gapSummary = [...new Set(gaps.map((g) => gapKindLabel(g.kind)))].join(', ');
  const assistant_note =
    product_recommendations.length > 0
      ? 'Presenta el déficit detectado y menciona que hay opciones en marketplace debajo con botón "Agregar al carrito". NO listes todos los productos en texto.'
      : `OBLIGATORIO: Explica el déficit (${gapSummary}) y comunica claramente que **no hay productos activos con stock** en el marketplace de PetHub que encajen ahora. Usa marketplace_availability_note. Sugiere consulta veterinaria o revisar la tienda más adelante.`;

  return {
    gaps_detected: gaps,
    product_recommendations,
    service_recommendations,
    assistant_note,
    marketplace_availability_note,
    marketplace_status: product_recommendations.length > 0 ? 'has_products' : 'no_products',
  };
}
