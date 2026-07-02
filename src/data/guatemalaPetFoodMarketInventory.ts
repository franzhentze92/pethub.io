/**
 * Inventario de alimentos y comestibles para mascotas vendidos en Guatemala.
 * Fase 2 completada: 128/128 líneas con perfil nutricional (oleadas 1–3 + enriquecimiento).
 *
 * Fuentes (jun 2025): Walmart GT, Paiz, Maxi Despensa, La Torre, purina.com.gt,
 * kemik.gt, mimascota.com.gt, farmacia.pet, premiumpetcaregt.com, compraloya.com.gt
 */

import { ECONOMY_INVENTORY_REFERENCE_MAP } from './guatemalaEconomyReferenceFoods';
import { WAVE2_INVENTORY_REFERENCE_MAP } from './guatemalaMassMarketWave2ReferenceFoods';
import { WAVE3_INVENTORY_REFERENCE_MAP } from './guatemalaPremiumWave3ReferenceFoods';

const INVENTORY_REFERENCE_MAP: Record<string, string> = {
  ...ECONOMY_INVENTORY_REFERENCE_MAP,
  ...WAVE2_INVENTORY_REFERENCE_MAP,
  ...WAVE3_INVENTORY_REFERENCE_MAP,
};

export type GtMarketChannel =
  | 'supermercado' // Walmart, Paiz, Maxi, La Torre
  | 'purina_oficial'
  | 'tienda_especializada' // Kemik, MiMascota, Premium Pet, Farmacia.pet
  | 'farmacia_veterinaria'
  | 'distribuidor';

export type GtFoodCategory =
  | 'dry_food'
  | 'wet_food'
  | 'treat' // galletas, snacks, masticables funcionales
  | 'dental_chew'
  | 'rawhide' // carnazas, huesos
  | 'topper' // churu, purés, yogurt, sazonadores
  | 'supplement' // calostro, multivitamínicos comestibles
  | 'other_pet'; // conejo, ave, etc.

export type GtProfileStatus = 'profiled' | 'queued' | 'needs_research';

export interface GtFoodBrand {
  id: string;
  name: string;
  owner?: string;
  tier: 'economy' | 'mainstream' | 'premium' | 'super_premium' | 'therapeutic';
  channels: GtMarketChannel[];
  species: Array<'Dog' | 'Cat' | 'Both'>;
  notes?: string;
}

export interface GtFoodProductLine {
  id: string;
  brandId: string;
  name: string;
  category: GtFoodCategory;
  species: 'Dog' | 'Cat' | 'Both';
  lifeStage?: 'puppy' | 'kitten' | 'adult' | 'senior' | 'all';
  variants?: string[];
  channels: GtMarketChannel[];
  profileStatus: GtProfileStatus;
  referenceFoodId?: string;
  dataSourceHint?: string;
  notes?: string;
}

/** Marcas con presencia confirmada en Guatemala */
export const GUATEMALA_PET_FOOD_BRANDS: GtFoodBrand[] = [
  // —— Mass market / supermercado ——
  { id: 'pedigree', name: 'Pedigree', owner: 'Mars', tier: 'mainstream', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'] },
  { id: 'whiskas', name: 'Whiskas', owner: 'Mars', tier: 'mainstream', channels: ['supermercado', 'tienda_especializada'], species: ['Cat'] },
  { id: 'royal_canin', name: 'Royal Canin', owner: 'Mars', tier: 'premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'eukanuba', name: 'Eukanuba', owner: 'Mars', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'dog_chow', name: 'Dog Chow', owner: 'Nestlé Purina', tier: 'mainstream', channels: ['supermercado', 'purina_oficial', 'tienda_especializada'], species: ['Dog'] },
  { id: 'cat_chow', name: 'Cat Chow', owner: 'Nestlé Purina', tier: 'mainstream', channels: ['supermercado', 'purina_oficial', 'tienda_especializada'], species: ['Cat'] },
  { id: 'pro_plan', name: 'Pro Plan', owner: 'Nestlé Purina', tier: 'super_premium', channels: ['purina_oficial', 'tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'purina_one', name: 'Purina ONE', owner: 'Nestlé Purina', tier: 'premium', channels: ['supermercado', 'purina_oficial'], species: ['Dog', 'Cat'] },
  { id: 'excellent', name: 'Excellent', owner: 'Nestlé Purina', tier: 'premium', channels: ['purina_oficial', 'tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'beneful', name: 'Beneful', owner: 'Nestlé Purina', tier: 'mainstream', channels: ['supermercado', 'purina_oficial', 'tienda_especializada'], species: ['Dog'] },
  { id: 'alpo', name: 'Alpo', owner: 'Nestlé Purina', tier: 'economy', channels: ['supermercado', 'purina_oficial', 'tienda_especializada'], species: ['Dog'] },
  { id: 'felix', name: 'Felix', owner: 'Nestlé Purina', tier: 'mainstream', channels: ['supermercado', 'purina_oficial'], species: ['Cat'] },
  { id: 'fancy_feast', name: 'Fancy Feast', owner: 'Nestlé Purina', tier: 'premium', channels: ['purina_oficial', 'tienda_especializada'], species: ['Cat'] },
  { id: 'dentalife', name: 'Dentalife', owner: 'Nestlé Purina', tier: 'mainstream', channels: ['purina_oficial', 'tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'dogui', name: 'Dogui', owner: 'Nestlé Purina LATAM', tier: 'economy', channels: ['supermercado'], species: ['Dog'] },
  { id: 'ganador', name: 'Ganador', owner: 'Mars México', tier: 'economy', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'minino', name: 'Minino', owner: 'Mars México', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Cat'] },
  { id: 'rufo', name: 'Rufo', tier: 'economy', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'] },
  { id: 'rambocan', name: 'Rambocan', tier: 'economy', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'] },
  { id: 'fiel_amigo', name: 'Fiel Amigo', tier: 'economy', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'] },
  { id: 'sabueso', name: 'Sabueso', tier: 'economy', channels: ['supermercado'], species: ['Dog'] },
  { id: 'pet_master', name: 'Pet Master', tier: 'economy', channels: ['supermercado'], species: ['Dog'] },
  { id: 'dukan', name: 'Dukan', tier: 'economy', channels: ['supermercado'], species: ['Dog'] },
  { id: 'super_can', name: 'Super Can', tier: 'economy', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'] },
  { id: 'super_cat', name: 'Super Cat', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'alimiau', name: 'Alimiau', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'special_kitty', name: 'Special Kitty', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'don_gato', name: 'Don Gato', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'gati', name: 'Gati', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'f_lino', name: 'F\'Lino', tier: 'economy', channels: ['supermercado'], species: ['Cat'] },
  { id: 'simba', name: 'Simba', tier: 'economy', channels: ['tienda_especializada'], species: ['Cat'] },
  { id: 'ol_roy', name: "Ol' Roy", owner: 'Walmart private label', tier: 'economy', channels: ['supermercado'], species: ['Dog'] },
  { id: 'bongo', name: 'Bongo', tier: 'economy', channels: ['supermercado', 'tienda_especializada'], species: ['Dog'], notes: 'Carnazas y treats' },
  { id: 'members_selection', name: "Member's Selection", tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'], notes: 'Costo/Sams club vía Kemik' },
  // —— Premium / especializada ——
  { id: 'nupec', name: 'Nupec', owner: 'Nutec México', tier: 'premium', channels: ['tienda_especializada', 'distribuidor'], species: ['Dog', 'Cat'] },
  { id: 'hills', name: "Hill's", tier: 'therapeutic', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'nutrisource', name: 'NutriSource', tier: 'super_premium', channels: ['tienda_especializada', 'distribuidor'], species: ['Dog', 'Cat'] },
  { id: 'acana', name: 'Acana', owner: 'Champion Petfoods', tier: 'super_premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'orijen', name: 'Orijen', owner: 'Champion Petfoods', tier: 'super_premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'], notes: 'Distribución limitada' },
  { id: 'farmina_nd', name: 'Farmina N&D', tier: 'super_premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'farmina_matisse', name: 'Farmina Matisse', tier: 'premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Cat'] },
  { id: 'farmina_cibau', name: 'Farmina Cibau', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'farmina_vet_life', name: 'Farmina Vet Life', tier: 'therapeutic', channels: ['farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'monello', name: 'Monello', owner: 'Brazil', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'advance', name: 'Advance', owner: 'Affinity Petcare', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'instinct', name: 'Instinct', tier: 'super_premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'taste_wild', name: 'Taste of the Wild', tier: 'super_premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'earthborn', name: 'Earthborn Holistic', tier: 'super_premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Dog'] },
  { id: 'gosbi', name: 'Gosbi', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'belcando', name: 'Belcando', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'star_pro', name: 'Star Pro', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'balance', name: 'Balance', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'poema', name: 'Poema', tier: 'premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Cat'] },
  { id: 'pronature', name: 'Pronature', tier: 'premium', channels: ['tienda_especializada', 'farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'grand_pet', name: 'Grand Pet', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'hunters_special', name: "Hunter's Special", tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'summit10', name: 'Summit 10', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'select', name: 'Select', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'acti_croq', name: 'Acti-Croq', tier: 'economy', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'kani', name: 'Kani', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'meow_mix', name: 'Meow Mix', tier: 'economy', channels: ['tienda_especializada'], species: ['Cat'] },
  { id: 'ecopet', name: 'Ecopet Natural', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'lenda', name: 'Lenda', tier: 'therapeutic', channels: ['farmacia_veterinaria'], species: ['Dog', 'Cat'] },
  { id: 'ultimates', name: 'Ultimates', tier: 'premium', channels: ['farmacia_veterinaria'], species: ['Dog'] },
  // —— Treats / snacks (marcas principalmente comestibles) ——
  { id: 'fruitables', name: 'Fruitables', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'meaty_treats', name: 'Meaty Treats', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'natural_select', name: 'Natural Select', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'pet_life', name: 'Pet Life', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Dog'] },
  { id: 'inaba', name: 'Inaba (Churu)', tier: 'premium', channels: ['tienda_especializada'], species: ['Cat'] },
  { id: 'temptations', name: 'Temptations', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Cat'], notes: 'Presencia intermitente importación' },
  { id: 'yowup', name: 'YowUp!', tier: 'premium', channels: ['tienda_especializada'], species: ['Both'] },
  { id: 'roketio', name: 'Roketio', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Both'] },
  { id: 'don_croki', name: 'Don Croki', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Both'] },
  { id: 'pet_naturals', name: 'Pet Naturals of Vermont', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'] },
  { id: 'greenies', name: 'Greenies', tier: 'premium', channels: ['tienda_especializada'], species: ['Dog', 'Cat'], notes: 'Importación selecta' },
  { id: 'neostrong', name: 'Neostrong', tier: 'mainstream', channels: ['tienda_especializada'], species: ['Both'], notes: 'Sustituto leche maternizada' },
];

/**
 * Líneas de producto — un registro por referencia comercial (no por presentación en kg).
 * Los 25 primeros con profileStatus 'profiled' están en guatemalaReferenceFoods.ts
 */
const PRODUCT_LINES_RAW: GtFoodProductLine[] = [
  // ═══ PERRO — SECO (mass market) ═══
  { id: 'pedigree_adult_mg', brandId: 'pedigree', name: 'Adulto Razas Medianas y Grandes', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000001' },
  { id: 'pedigree_puppy_mg', brandId: 'pedigree', name: 'Cachorro Razas Medianas y Grandes', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000007' },
  { id: 'pedigree_adult_hp', brandId: 'pedigree', name: 'High Protein Adulto', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000080' },
  { id: 'pedigree_adult_small', brandId: 'pedigree', name: 'Adulto Razas Pequeñas', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000064' },
  { id: 'pedigree_puppy_small', brandId: 'pedigree', name: 'Cachorro Razas Pequeñas', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000065' },
  { id: 'pedigree_optima_digest', brandId: 'pedigree', name: 'Óptima Digestión', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000081' },
  { id: 'dog_chow_adult_mg', brandId: 'dog_chow', name: 'Adulto Medianos y Grandes', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado', 'purina_oficial'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000003' },
  { id: 'dog_chow_puppy_mg', brandId: 'dog_chow', name: 'Cachorro Medianos y Grandes', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado', 'purina_oficial'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000009' },
  { id: 'dog_chow_adult_small', brandId: 'dog_chow', name: 'Adulto Minis y Pequeños', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado', 'purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000061' },
  { id: 'dog_chow_puppy_small', brandId: 'dog_chow', name: 'Cachorro Minis y Pequeños', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado', 'purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000062' },
  { id: 'dog_chow_weight', brandId: 'dog_chow', name: 'Control de Peso', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000063' },
  { id: 'dog_chow_granel', brandId: 'dog_chow', name: 'A granel (dispensador)', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000003', notes: 'Misma fórmula que línea principal' },
  { id: 'dogui_adult_mg', brandId: 'dogui', name: 'Adulto Carne y Arroz M/G', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000026' },
  { id: 'dogui_puppy_mg', brandId: 'dogui', name: 'Cachorro M/G', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000027' },
  { id: 'beneful_adult', brandId: 'beneful', name: 'Adulto Original / Salmón', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000059' },
  { id: 'beneful_minis', brandId: 'beneful', name: 'Minis / Razas Pequeñas', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000060' },
  { id: 'alpo_adult', brandId: 'alpo', name: 'Adulto Carne Asada', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000028' },
  { id: 'purina_one_dog', brandId: 'purina_one', name: 'Adulto (varias fórmulas)', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado', 'purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000072' },
  { id: 'excellent_dog_adult_mg', brandId: 'excellent', name: 'Adulto Pollo y Arroz M/G', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['purina_oficial'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000021' },
  { id: 'excellent_dog_puppy', brandId: 'excellent', name: 'Cachorro Pollo y Arroz', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000074' },
  { id: 'ganador_adult', brandId: 'ganador', name: 'Original Adulto M/G', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000019' },
  { id: 'rufo_adult', brandId: 'rufo', name: 'Adulto Original', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000020', dataSourceHint: 'Ringo/Rufo misma familia regional' },
  { id: 'rufo_pro_adult', brandId: 'rufo', name: 'Rufo Pro Adulto', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000033' },
  { id: 'rufo_puppy', brandId: 'rufo', name: 'Cachorro', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000034' },
  { id: 'rambocan', brandId: 'rambocan', name: 'Adulto', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000029' },
  { id: 'fiel_amigo_adult', brandId: 'fiel_amigo', name: 'Adulto Pollo y Vegetales', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000035' },
  { id: 'sabueso_adult', brandId: 'sabueso', name: 'Adulto Pollo y Cereales', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000030' },
  { id: 'pet_master_adult', brandId: 'pet_master', name: 'Adulto', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000036' },
  { id: 'pet_master_puppy', brandId: 'pet_master', name: 'Cachorro', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000037' },
  { id: 'dukan_adult', brandId: 'dukan', name: 'Adulto Cordero', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000038' },
  { id: 'super_can_adult', brandId: 'super_can', name: 'Adulto Pollo y Vegetales', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000031' },
  { id: 'super_can_puppy', brandId: 'super_can', name: 'Cachorro', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000032' },
  { id: 'ol_roy_dry', brandId: 'ol_roy', name: 'Adulto (línea Walmart)', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000039' },

  // ═══ PERRO — HÚMEDO ═══
  { id: 'pedigree_can_adult', brandId: 'pedigree', name: 'Lata Pollo Adulto', category: 'wet_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000011' },
  { id: 'pedigree_pouch_adult', brandId: 'pedigree', name: 'Sobres Adulto Pollo', category: 'wet_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000012' },
  { id: 'pedigree_chopped', brandId: 'pedigree', name: 'Chopped Lata Res', category: 'wet_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000066' },
  { id: 'dog_chow_pouch', brandId: 'dog_chow', name: 'Pouch Adulto/Cachorro Carne', category: 'wet_food', species: 'Dog', lifeStage: 'all', channels: ['supermercado', 'purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000067' },
  { id: 'rufo_pro_pouch', brandId: 'rufo', name: 'Rufo Pro Húmedo Pollo/Cordero', category: 'wet_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000040' },
  { id: 'purina_one_pouch_dog', brandId: 'purina_one', name: 'Pouch 85g surtidos', category: 'wet_food', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000077' },

  // ═══ PERRO — GALLETAS, SNACKS, CARNAZAS ═══
  { id: 'pedigree_biscrok_adult', brandId: 'pedigree', name: 'Biscrok Adulto', category: 'treat', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000046' },
  { id: 'pedigree_biscrok_puppy', brandId: 'pedigree', name: 'Biscrok Cachorro', category: 'treat', species: 'Dog', lifeStage: 'puppy', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000047' },
  { id: 'pedigree_dentastix', brandId: 'pedigree', name: 'Dentastix', category: 'dental_chew', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000058' },
  { id: 'beneful_baked_delights', brandId: 'beneful', name: 'Baked Delights Snackers / Hugs', category: 'treat', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000048' },
  { id: 'dentalife_dog', brandId: 'dentalife', name: 'Dentalife Perro', category: 'dental_chew', species: 'Dog', lifeStage: 'adult', channels: ['purina_oficial', 'tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000049' },
  { id: 'bongo_treats', brandId: 'bongo', name: 'Treats Crujientes / Hueso', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['supermercado', 'tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000050' },
  { id: 'bongo_rawhide', brandId: 'bongo', name: 'Hueso Carnaza / Palillos', category: 'rawhide', species: 'Dog', lifeStage: 'all', channels: ['supermercado', 'tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000051', notes: 'Bajo valor nutricional; registrar como treat' },
  { id: 'ol_roy_rawhide', brandId: 'ol_roy', name: 'Carnaza Hueso Carne / Hefty Chew', category: 'rawhide', species: 'Dog', lifeStage: 'all', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000052' },
  { id: 'dukan_treat', brandId: 'dukan', name: 'Lamb Bongo Treat', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000053' },
  { id: 'sabueso_biscuit', brandId: 'sabueso', name: 'Galletitas Sabueso', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000054' },
  { id: 'sabueso_dental', brandId: 'sabueso', name: 'Dental Sticks', category: 'dental_chew', species: 'Dog', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000055' },
  { id: 'supercan_treat', brandId: 'super_can', name: 'Treats Toda Raza', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000056' },
  { id: 'supercan_snack', brandId: 'super_can', name: 'Snack Pollo Vegetales', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000057' },
  { id: 'meaty_treats', brandId: 'meaty_treats', name: 'Mini Dogs / Steaknite / Palitos', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000104' },
  { id: 'natural_select_cookie', brandId: 'natural_select', name: 'Galletas Horneadas Avena/Pollo', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000105' },
  { id: 'pet_life_biscuit', brandId: 'pet_life', name: 'Galletas Forma Hueso 5 Sabores', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000106' },
  { id: 'fruitables_dog', brandId: 'fruitables', name: 'Bioactive / Calabaza / Tocino', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000107' },
  { id: 'advance_dog_snack', brandId: 'advance', name: 'Puppy Snack / Articular Sticks', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000108' },
  { id: 'hills_training_treat', brandId: 'hills', name: 'Science Diet Training Treat Pollo', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000109' },
  { id: 'hills_soft_savories', brandId: 'hills', name: 'Soft Savories Beef & Cheddar', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000110' },
  { id: 'yowup_dog', brandId: 'yowup', name: 'Yogurt / Frozen Yogurt Bacon', category: 'topper', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000116' },
  { id: 'roketio_dog', brandId: 'roketio', name: 'Hígado deshidratado / Fajitas', category: 'treat', species: 'Both', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000111' },
  { id: 'don_croki', brandId: 'don_croki', name: 'Hígados y Corazones Pollo', category: 'treat', species: 'Both', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000112' },
  { id: 'pet_naturals_dog', brandId: 'pet_naturals', name: 'Calming / Daily Best', category: 'treat', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000113' },

  // ═══ GATO — SECO ═══
  { id: 'whiskas_dry_adult', brandId: 'whiskas', name: 'Adulto Pollo', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000013' },
  { id: 'cat_chow_complete', brandId: 'cat_chow', name: 'Adulto Complete', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado', 'purina_oficial'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000014' },
  { id: 'cat_chow_pollo', brandId: 'cat_chow', name: 'Adulto Pollo', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000025' },
  { id: 'minino_plus', brandId: 'minino', name: 'Plus Adulto Pollo', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000015' },
  { id: 'felix_megamix', brandId: 'felix', name: 'Megamix / Triple Delicious', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000068' },
  { id: 'felix_as_good', brandId: 'felix', name: 'As Good As It Looks (seco)', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000068' },
  { id: 'pro_plan_cat', brandId: 'pro_plan', name: 'Gato Adulto Pollo', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial', 'tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000024' },
  { id: 'purina_one_cat', brandId: 'purina_one', name: 'Gato Adulto', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000073' },
  { id: 'excellent_cat', brandId: 'excellent', name: 'Gato Adulto', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000075' },
  { id: 'alimiau_adult', brandId: 'alimiau', name: 'Adulto Crujiente', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000041' },
  { id: 'special_kitty', brandId: 'special_kitty', name: 'Adulto', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000042' },
  { id: 'don_gato', brandId: 'don_gato', name: 'Adulto', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000043' },
  { id: 'f_lino', brandId: 'f_lino', name: 'Adulto', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000044' },
  { id: 'super_cat_dry', brandId: 'super_cat', name: 'Gourmet Salmón', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000045' },
  { id: 'meow_mix', brandId: 'meow_mix', name: 'Original', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000082' },

  // ═══ GATO — HÚMEDO ═══
  { id: 'whiskas_pouch', brandId: 'whiskas', name: 'Lata / Pouch Pollo', category: 'wet_food', species: 'Cat', lifeStage: 'adult', channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000017' },
  { id: 'whiskas_pate_kitten', brandId: 'whiskas', name: 'Soufflé Gatito Res', category: 'wet_food', species: 'Cat', lifeStage: 'kitten', channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000070' },
  { id: 'felix_pouch', brandId: 'felix', name: 'Trocitos en Salsa (pollo, atún, salmón…)', category: 'wet_food', species: 'Cat', lifeStage: 'adult', variants: ['pollo', 'atún', 'salmón', 'pescado blanco'], channels: ['supermercado'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000018' },
  { id: 'felix_pate', brandId: 'felix', name: 'Paté 156g', category: 'wet_food', species: 'Cat', lifeStage: 'adult', variants: ['salmón', 'pavo', 'pescado'], channels: ['supermercado'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000069' },
  { id: 'fancy_feast', brandId: 'fancy_feast', name: 'Gourmet líneas clásicas', category: 'wet_food', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial', 'tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000076' },
  { id: 'cat_chow_pouch', brandId: 'cat_chow', name: 'Pouch / Naturals', category: 'wet_food', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000071' },

  // ═══ GATO — SNACKS Y TOPPERS ═══
  { id: 'monello_cat_snack', brandId: 'monello', name: 'Snacks Funcionales / Castrados', category: 'treat', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000102' },
  { id: 'inaba_churu', brandId: 'inaba', name: 'Churu Bites / Tubos', category: 'topper', species: 'Cat', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000115' },
  { id: 'temptations', brandId: 'temptations', name: 'Classic Crunchy', category: 'treat', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000079' },
  { id: 'dentalife_cat', brandId: 'dentalife', name: 'Dentalife Gato', category: 'dental_chew', species: 'Cat', lifeStage: 'adult', channels: ['purina_oficial'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000078' },
  { id: 'fruitables_cat', brandId: 'fruitables', name: 'Salmón / Pollo / Atún', category: 'treat', species: 'Cat', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000114' },
  { id: 'yowup_cat', brandId: 'yowup', name: 'Yogurt L.casei / Salmón', category: 'topper', species: 'Cat', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000117' },
  { id: 'pet_naturals_cat', brandId: 'pet_naturals', name: 'Digestive / Multivit / Calming', category: 'treat', species: 'Cat', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000118' },

  // ═══ PREMIUM / TERAPÉUTICO — PERRO (muestra representativa; Kemik+MiMascota tienen 500+ SKUs) ═══
  { id: 'rc_medium_adult', brandId: 'royal_canin', name: 'Medium Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000002' },
  { id: 'rc_medium_puppy', brandId: 'royal_canin', name: 'Medium Puppy', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000008' },
  { id: 'rc_maxi_adult', brandId: 'royal_canin', name: 'Maxi Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000022' },
  { id: 'rc_mini_adult', brandId: 'royal_canin', name: 'Mini Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000083' },
  { id: 'rc_giant_adult', brandId: 'royal_canin', name: 'Giant Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000084' },
  { id: 'rc_breed_chihuahua', brandId: 'royal_canin', name: 'Chihuahua Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000085' },
  { id: 'rc_breed_pomeranian', brandId: 'royal_canin', name: 'Pomeranian Adult', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000086' },
  { id: 'rc_satiety_dog', brandId: 'royal_canin', name: 'Satiety / Weight Care', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada', 'farmacia_veterinaria'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000087' },
  { id: 'rc_gastro_dog', brandId: 'royal_canin', name: 'Gastrointestinal (seco/húmedo)', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['farmacia_veterinaria'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000088' },
  { id: 'pro_plan_adult', brandId: 'pro_plan', name: 'Adulto Pollo y Arroz', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['purina_oficial', 'tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000004' },
  { id: 'pro_plan_sensitive', brandId: 'pro_plan', name: 'Sensitive Skin / Exigent / Reduced Calorie', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000089' },
  { id: 'hills_science_dog', brandId: 'hills', name: 'Adulto Pollo y Cebada', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000005' },
  { id: 'hills_prescription_dog', brandId: 'hills', name: 'Prescription Diet (i/d, z/d, j/d, k/d…)', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['farmacia_veterinaria'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000119' },
  { id: 'eukanuba_medium', brandId: 'eukanuba', name: 'Adult Medium Breed', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000010' },
  { id: 'nupec_adult', brandId: 'nupec', name: 'Adulto M/G', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000006' },
  { id: 'nupec_puppy', brandId: 'nupec', name: 'Cachorro M/G', category: 'dry_food', species: 'Dog', lifeStage: 'puppy', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000090' },
  { id: 'nupec_small', brandId: 'nupec', name: 'Adulto/Cachorro Raza Pequeña', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000091' },
  { id: 'nupec_senior', brandId: 'nupec', name: 'Senior', category: 'dry_food', species: 'Dog', lifeStage: 'senior', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000092' },
  { id: 'nupec_weight', brandId: 'nupec', name: 'Weight Control', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000093' },
  { id: 'nupec_sensitive', brandId: 'nupec', name: 'Sensitive / 1st Care', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000094' },
  { id: 'nupec_performance', brandId: 'nupec', name: 'High Performance', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000095' },
  { id: 'nutrisource_adult', brandId: 'nutrisource', name: 'Adult Chicken & Rice', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada', 'distribuidor'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000103' },
  { id: 'nutrisource_grain_free', brandId: 'nutrisource', name: 'Pure Vita / Element Grain Free', category: 'dry_food', species: 'Dog', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000120' },
  { id: 'acana_dog', brandId: 'acana', name: 'Classics / Singles / Regionals', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000121' },
  { id: 'farmina_nd_dog', brandId: 'farmina_nd', name: 'N&D Chicken/Lamb/Pumpkin…', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000122' },
  { id: 'monello_dog', brandId: 'monello', name: 'Tradicional / Select / Premium', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000100' },
  { id: 'taste_wild_dog', brandId: 'taste_wild', name: 'High Prairie / Pacific Stream…', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000124' },
  { id: 'instinct_dog', brandId: 'instinct', name: 'Original / Raw Boost', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000125' },
  { id: 'members_selection_dog', brandId: 'members_selection', name: 'Pollo/Arroz / Salmón Skin&Coat', category: 'dry_food', species: 'Dog', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000126' },

  // ═══ PREMIUM — GATO ═══
  { id: 'rc_indoor', brandId: 'royal_canin', name: 'Indoor 27', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000016' },
  { id: 'rc_fit32', brandId: 'royal_canin', name: 'Fit 32', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000096' },
  { id: 'rc_hairball', brandId: 'royal_canin', name: 'Hairball Care', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000097' },
  { id: 'rc_sterilised', brandId: 'royal_canin', name: 'Sterilised 37', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000098' },
  { id: 'rc_persian', brandId: 'royal_canin', name: 'Persian Adult', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000099' },
  { id: 'hills_cat', brandId: 'hills', name: 'Gato Adulto Pollo', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada'], profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000023' },
  { id: 'farmina_matisse', brandId: 'farmina_matisse', name: 'Pollo/Arroz / Salmón Castrado', category: 'dry_food', species: 'Cat', lifeStage: 'adult', channels: ['tienda_especializada', 'farmacia_veterinaria'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000123' },
  { id: 'monello_cat_dry', brandId: 'monello', name: 'Adulto / Castrados / Kitten', category: 'dry_food', species: 'Cat', lifeStage: 'all', channels: ['tienda_especializada'],  profileStatus: 'profiled', referenceFoodId: 'a1000001-0001-4001-8001-000000000101' },
];

/** Sincroniza líneas con perfiles ya curados (oleadas 1–3). */
export const GUATEMALA_PET_FOOD_PRODUCT_LINES: GtFoodProductLine[] = PRODUCT_LINES_RAW.map((p) => {
  const refId = INVENTORY_REFERENCE_MAP[p.id];
  if (!refId) return p;
  return { ...p, profileStatus: 'profiled', referenceFoodId: refId };
});

export interface GtMarketInventoryStats {
  brands: number;
  productLines: number;
  profiled: number;
  queued: number;
  needsResearch: number;
  byCategory: Record<GtFoodCategory, number>;
  byChannel: Record<GtMarketChannel, number>;
}

export function getGuatemalaMarketInventoryStats(): GtMarketInventoryStats {
  const byCategory = {} as Record<GtFoodCategory, number>;
  const byChannel = {} as Record<GtMarketChannel, number>;
  for (const p of GUATEMALA_PET_FOOD_PRODUCT_LINES) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    for (const ch of p.channels) {
      byChannel[ch] = (byChannel[ch] ?? 0) + 1;
    }
  }
  return {
    brands: GUATEMALA_PET_FOOD_BRANDS.length,
    productLines: GUATEMALA_PET_FOOD_PRODUCT_LINES.length,
    profiled: GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'profiled').length,
    queued: GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'queued').length,
    needsResearch: GUATEMALA_PET_FOOD_PRODUCT_LINES.filter((p) => p.profileStatus === 'needs_research').length,
    byCategory,
    byChannel,
  };
}

/** Marcas vistas en retail GT pero aún sin líneas detalladas en inventario */
export const GUATEMALA_BRANDS_PENDING_SKU_RESEARCH: string[] = [
  'Ringo (importación CO — presencia limitada)',
  'Birbo', 'Terry Max', 'K-NINO', 'Bereum', 'Simba', 'Nutraid',
  'Diamond Care', 'Grand Pet líneas adicionales', 'Cibau variantes',
  'Gosbi (22 SKUs MiMascota)', 'Advance (31 SKUs)', 'Select (11 SKUs)',
  'Vet Life / Lenda / Poema dietas veterinarias',
  'Greenies', 'VetriScience', 'Dentalife gato completo',
];
