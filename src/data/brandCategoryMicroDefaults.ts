import type { GuatemalaReferenceFood } from './guatemalaReferenceFoods';

export type MicroPatch = Partial<GuatemalaReferenceFood>;

/** Perfil micronutricional completo — croquetas perro adulto mainstream (aditivos/kg típicos). */
export const DRY_DOG_MAINSTREAM: MicroPatch = {
  vitamin_a_iu_per_kg: 8000,
  vitamin_d_iu_per_kg: 1200,
  vitamin_e_iu_per_kg: 100,
  vitamin_c_mg_per_kg: 80,
  vitamin_k_mg_per_kg: 1.0,
  vitamin_b1_mg_per_kg: 6.5,
  vitamin_b2_mg_per_kg: 10,
  vitamin_b3_mg_per_kg: 48,
  vitamin_b6_mg_per_kg: 6.5,
  vitamin_b12_mg_per_kg: 0.035,
  calcium_pct: 1.2,
  phosphorus_pct: 0.9,
  magnesium_mg_per_kg: 700,
  iron_mg_per_kg: 45,
  zinc_mg_per_kg: 85,
  copper_mg_per_kg: 8,
  manganese_mg_per_kg: 20,
  selenium_mg_per_kg: 0.3,
  sodium_pct: 0.35,
  potassium_mg_per_kg: 5500,
  iodine_mg_per_kg: 2.0,
};

export const DRY_DOG_PUPPY: MicroPatch = {
  ...DRY_DOG_MAINSTREAM,
  vitamin_a_iu_per_kg: 10000,
  calcium_pct: 1.4,
  phosphorus_pct: 1.1,
  vitamin_d_iu_per_kg: 1400,
};

export const DRY_CAT_ADULT: MicroPatch = {
  vitamin_a_iu_per_kg: 12000,
  vitamin_d_iu_per_kg: 1000,
  vitamin_e_iu_per_kg: 120,
  vitamin_c_mg_per_kg: 60,
  vitamin_k_mg_per_kg: 0.9,
  vitamin_b1_mg_per_kg: 7,
  vitamin_b2_mg_per_kg: 10,
  vitamin_b3_mg_per_kg: 50,
  vitamin_b6_mg_per_kg: 7,
  vitamin_b12_mg_per_kg: 0.035,
  calcium_pct: 1.0,
  phosphorus_pct: 0.85,
  magnesium_mg_per_kg: 650,
  iron_mg_per_kg: 50,
  zinc_mg_per_kg: 100,
  copper_mg_per_kg: 9,
  manganese_mg_per_kg: 22,
  selenium_mg_per_kg: 0.35,
  sodium_pct: 0.4,
  potassium_mg_per_kg: 5000,
  iodine_mg_per_kg: 2.5,
};

export const WET_DOG: MicroPatch = {
  carbs_pct: 1.5,
  vitamin_a_iu_per_kg: 6000,
  vitamin_d_iu_per_kg: 800,
  vitamin_e_iu_per_kg: 80,
  vitamin_c_mg_per_kg: 40,
  vitamin_k_mg_per_kg: 0.8,
  vitamin_b1_mg_per_kg: 5,
  vitamin_b2_mg_per_kg: 8,
  vitamin_b3_mg_per_kg: 40,
  vitamin_b6_mg_per_kg: 5,
  vitamin_b12_mg_per_kg: 0.03,
  calcium_pct: 0.35,
  phosphorus_pct: 0.28,
  magnesium_mg_per_kg: 350,
  iron_mg_per_kg: 35,
  zinc_mg_per_kg: 55,
  copper_mg_per_kg: 6,
  manganese_mg_per_kg: 15,
  selenium_mg_per_kg: 0.2,
  sodium_pct: 0.3,
  potassium_mg_per_kg: 1200,
  iodine_mg_per_kg: 1.5,
};

export const WET_CAT: MicroPatch = {
  ...WET_DOG,
  vitamin_a_iu_per_kg: 8000,
  calcium_pct: 0.4,
  phosphorus_pct: 0.32,
  zinc_mg_per_kg: 65,
  potassium_mg_per_kg: 1400,
};

export const TREAT_DOG: MicroPatch = {
  vitamin_a_iu_per_kg: 6000,
  vitamin_d_iu_per_kg: 700,
  vitamin_e_iu_per_kg: 70,
  vitamin_c_mg_per_kg: 50,
  vitamin_k_mg_per_kg: 0.7,
  vitamin_b1_mg_per_kg: 5,
  vitamin_b2_mg_per_kg: 8,
  vitamin_b3_mg_per_kg: 40,
  vitamin_b6_mg_per_kg: 5,
  vitamin_b12_mg_per_kg: 0.03,
  calcium_pct: 0.8,
  phosphorus_pct: 0.6,
  magnesium_mg_per_kg: 500,
  iron_mg_per_kg: 45,
  zinc_mg_per_kg: 55,
  copper_mg_per_kg: 6,
  manganese_mg_per_kg: 18,
  selenium_mg_per_kg: 0.2,
  sodium_pct: 0.45,
  potassium_mg_per_kg: 3500,
  iodine_mg_per_kg: 1.5,
};

export const TREAT_CAT: MicroPatch = { ...TREAT_DOG, zinc_mg_per_kg: 60 };

export const RAWHIDE_TREAT: MicroPatch = {
  vitamin_a_iu_per_kg: 500,
  vitamin_d_iu_per_kg: 100,
  vitamin_e_iu_per_kg: 20,
  vitamin_c_mg_per_kg: 10,
  vitamin_k_mg_per_kg: 0.2,
  vitamin_b1_mg_per_kg: 1,
  vitamin_b2_mg_per_kg: 2,
  vitamin_b3_mg_per_kg: 8,
  vitamin_b6_mg_per_kg: 1,
  vitamin_b12_mg_per_kg: 0.01,
  calcium_pct: 0.15,
  phosphorus_pct: 0.12,
  magnesium_mg_per_kg: 80,
  iron_mg_per_kg: 25,
  zinc_mg_per_kg: 15,
  copper_mg_per_kg: 2,
  manganese_mg_per_kg: 5,
  selenium_mg_per_kg: 0.05,
  sodium_pct: 0.15,
  potassium_mg_per_kg: 400,
  iodine_mg_per_kg: 0.5,
};

export const TOPPER_YOGURT: MicroPatch = {
  vitamin_a_iu_per_kg: 3000,
  vitamin_d_iu_per_kg: 400,
  vitamin_e_iu_per_kg: 30,
  vitamin_c_mg_per_kg: 20,
  vitamin_k_mg_per_kg: 0.5,
  vitamin_b1_mg_per_kg: 3,
  vitamin_b2_mg_per_kg: 5,
  vitamin_b3_mg_per_kg: 20,
  vitamin_b6_mg_per_kg: 3,
  vitamin_b12_mg_per_kg: 0.02,
  calcium_pct: 0.8,
  phosphorus_pct: 0.6,
  magnesium_mg_per_kg: 200,
  iron_mg_per_kg: 10,
  zinc_mg_per_kg: 20,
  copper_mg_per_kg: 2,
  manganese_mg_per_kg: 5,
  selenium_mg_per_kg: 0.1,
  sodium_pct: 0.2,
  potassium_mg_per_kg: 800,
  iodine_mg_per_kg: 0.8,
};

export const PREMIUM_DRY_DOG: MicroPatch = {
  vitamin_a_iu_per_kg: 15000,
  vitamin_d_iu_per_kg: 1000,
  vitamin_e_iu_per_kg: 460,
  vitamin_c_mg_per_kg: 100,
  vitamin_k_mg_per_kg: 1.2,
  vitamin_b1_mg_per_kg: 8,
  vitamin_b2_mg_per_kg: 12,
  vitamin_b3_mg_per_kg: 58,
  vitamin_b6_mg_per_kg: 8,
  vitamin_b12_mg_per_kg: 0.04,
  calcium_pct: 1.1,
  phosphorus_pct: 0.85,
  magnesium_mg_per_kg: 900,
  iron_mg_per_kg: 80,
  zinc_mg_per_kg: 150,
  copper_mg_per_kg: 12,
  manganese_mg_per_kg: 50,
  selenium_mg_per_kg: 0.35,
  sodium_pct: 0.32,
  potassium_mg_per_kg: 6500,
  iodine_mg_per_kg: 3.0,
};

export const ROYAL_CANIN: MicroPatch = {
  vitamin_a_iu_per_kg: 14200,
  vitamin_d_iu_per_kg: 900,
  vitamin_e_iu_per_kg: 350,
  vitamin_c_mg_per_kg: 160,
  vitamin_k_mg_per_kg: 1.1,
  vitamin_b1_mg_per_kg: 7,
  vitamin_b2_mg_per_kg: 11,
  vitamin_b3_mg_per_kg: 52,
  vitamin_b6_mg_per_kg: 7,
  vitamin_b12_mg_per_kg: 0.035,
  magnesium_mg_per_kg: 900,
  potassium_mg_per_kg: 6000,
  iron_mg_per_kg: 41,
  zinc_mg_per_kg: 128,
  copper_mg_per_kg: 13,
  manganese_mg_per_kg: 54,
  selenium_mg_per_kg: 0.1,
  iodine_mg_per_kg: 4.1,
  sodium_pct: 0.3,
};

export const ROYAL_CANIN_CAT: MicroPatch = {
  ...ROYAL_CANIN,
  vitamin_a_iu_per_kg: 14500,
  vitamin_d_iu_per_kg: 770,
  zinc_mg_per_kg: 142,
  manganese_mg_per_kg: 55,
  selenium_mg_per_kg: 0.09,
};

export const NUPEC: MicroPatch = {
  vitamin_a_iu_per_kg: 15000,
  vitamin_d_iu_per_kg: 1000,
  vitamin_e_mg_per_kg: 250,
  vitamin_c_mg_per_kg: 100,
  vitamin_k_mg_per_kg: 1.2,
  vitamin_b1_mg_per_kg: 8,
  vitamin_b2_mg_per_kg: 12,
  vitamin_b3_mg_per_kg: 60,
  vitamin_b6_mg_per_kg: 8,
  vitamin_b12_mg_per_kg: 0.04,
  magnesium_mg_per_kg: 850,
  potassium_mg_per_kg: 5800,
  iron_mg_per_kg: 45,
  zinc_mg_per_kg: 135,
  copper_mg_per_kg: 12,
  manganese_mg_per_kg: 48,
  selenium_mg_per_kg: 0.08,
  iodine_mg_per_kg: 3.5,
  sodium_pct: 0.35,
};

export const HILLS_SCIENCE: MicroPatch = {
  vitamin_a_iu_per_kg: 12000,
  vitamin_d_iu_per_kg: 900,
  vitamin_e_iu_per_kg: 524,
  vitamin_c_mg_per_kg: 108,
  vitamin_k_mg_per_kg: 1.0,
  vitamin_b1_mg_per_kg: 7,
  vitamin_b2_mg_per_kg: 11,
  vitamin_b3_mg_per_kg: 52,
  vitamin_b6_mg_per_kg: 7,
  vitamin_b12_mg_per_kg: 0.035,
  magnesium_mg_per_kg: 1140,
  potassium_mg_per_kg: 7600,
  iron_mg_per_kg: 55,
  zinc_mg_per_kg: 180,
  copper_mg_per_kg: 12,
  manganese_mg_per_kg: 45,
  selenium_mg_per_kg: 0.12,
  iodine_mg_per_kg: 2.5,
  sodium_pct: 0.3,
};

export const PEDIGREE: MicroPatch = {
  vitamin_a_iu_per_kg: 8000,
  vitamin_d_iu_per_kg: 1687,
  vitamin_e_mg_per_kg: 100,
  vitamin_c_mg_per_kg: 80,
  vitamin_k_mg_per_kg: 1.0,
  vitamin_b1_mg_per_kg: 6.2,
  vitamin_b2_mg_per_kg: 10.7,
  vitamin_b3_mg_per_kg: 48,
  vitamin_b6_mg_per_kg: 6.5,
  vitamin_b12_mg_per_kg: 0.035,
  magnesium_mg_per_kg: 700,
  potassium_mg_per_kg: 5200,
  iron_mg_per_kg: 41,
  zinc_mg_per_kg: 80,
  copper_mg_per_kg: 6.6,
  manganese_mg_per_kg: 18,
  selenium_mg_per_kg: 0.3,
  iodine_mg_per_kg: 1.7,
  sodium_pct: 0.35,
};

export const PURINA_DOG: MicroPatch = {
  vitamin_a_iu_per_kg: 10000,
  vitamin_d_iu_per_kg: 1200,
  vitamin_e_iu_per_kg: 100,
  vitamin_c_mg_per_kg: 80,
  vitamin_k_mg_per_kg: 1.0,
  vitamin_b1_mg_per_kg: 7,
  vitamin_b2_mg_per_kg: 10,
  vitamin_b3_mg_per_kg: 50,
  vitamin_b6_mg_per_kg: 7,
  vitamin_b12_mg_per_kg: 0.035,
  magnesium_mg_per_kg: 750,
  potassium_mg_per_kg: 5600,
  iron_mg_per_kg: 260,
  zinc_mg_per_kg: 350,
  copper_mg_per_kg: 38,
  manganese_mg_per_kg: 20,
  selenium_mg_per_kg: 0.45,
  iodine_mg_per_kg: 3.3,
  sodium_pct: 0.4,
};

export const PURINA_CAT: MicroPatch = {
  ...PURINA_DOG,
  vitamin_a_iu_per_kg: 11000,
  iron_mg_per_kg: 55,
  zinc_mg_per_kg: 120,
};

export const DEHYDRATED_MEAT: MicroPatch = {
  vitamin_a_iu_per_kg: 20000,
  vitamin_d_iu_per_kg: 500,
  vitamin_e_iu_per_kg: 50,
  vitamin_c_mg_per_kg: 20,
  vitamin_k_mg_per_kg: 0.5,
  vitamin_b1_mg_per_kg: 4,
  vitamin_b2_mg_per_kg: 6,
  vitamin_b3_mg_per_kg: 30,
  vitamin_b6_mg_per_kg: 4,
  vitamin_b12_mg_per_kg: 0.05,
  calcium_pct: 0.2,
  phosphorus_pct: 0.35,
  magnesium_mg_per_kg: 200,
  iron_mg_per_kg: 80,
  zinc_mg_per_kg: 60,
  copper_mg_per_kg: 4,
  manganese_mg_per_kg: 8,
  selenium_mg_per_kg: 0.3,
  sodium_pct: 0.5,
  potassium_mg_per_kg: 2500,
  iodine_mg_per_kg: 1.0,
};

function normalizeBrand(brand: string): string {
  return brand.toLowerCase().trim();
}

/** Resuelve defaults por marca (más específico primero). */
export function resolveBrandMicroDefaults(food: GuatemalaReferenceFood): MicroPatch | undefined {
  const b = normalizeBrand(food.brand);

  if (b.includes('royal canin')) {
    return food.species === 'Cat' ? ROYAL_CANIN_CAT : ROYAL_CANIN;
  }
  if (b.includes('nupec')) return NUPEC;
  if (b.includes("hill's") || b.includes('hills')) return HILLS_SCIENCE;
  if (b.includes('pedigree')) return PEDIGREE;
  if (b.includes('purina')) {
    return food.species === 'Cat' ? PURINA_CAT : PURINA_DOG;
  }
  if (
    b.includes('acana') ||
    b.includes('orijen') ||
    b.includes('nutrisource') ||
    b.includes('farmina') ||
    b.includes('instinct') ||
    b.includes('taste of the wild') ||
    b.includes('eukanuba') ||
    b.includes('pro plan')
  ) {
    return PREMIUM_DRY_DOG;
  }
  if (b.includes('whiskas') || b.includes('felix') || b.includes('fancy feast')) {
    return food.food_type === 'wet_food' ? WET_CAT : DRY_CAT_ADULT;
  }
  if (b.includes('monello')) {
    return food.species === 'Cat' ? DRY_CAT_ADULT : PREMIUM_DRY_DOG;
  }
  if (b.includes('ganador') || b.includes('rufo') || b.includes('ringo')) {
    return DRY_DOG_MAINSTREAM;
  }
  if (
    b.includes('dogui') ||
    b.includes('beneful') ||
    b.includes('alpo') ||
    b.includes('super can') ||
    b.includes('fiel amigo') ||
    b.includes('pet master') ||
    b.includes('dukan') ||
    b.includes('ol') ||
    b.includes('rambocan') ||
    b.includes('sabueso') ||
    b.includes('alimiau') ||
    b.includes('don gato') ||
    b.includes("f'lino") ||
    b.includes('flino') ||
    b.includes('special kitty') ||
    b.includes('super cat') ||
    b.includes('minino') ||
    b.includes('meow mix') ||
    b.includes("member's selection") ||
    b.includes('members selection')
  ) {
    return food.species === 'Cat' ? DRY_CAT_ADULT : DRY_DOG_MAINSTREAM;
  }
  if (b.includes('dentalife') || b.includes('dentastix')) {
    return TREAT_DOG;
  }
  if (b.includes('bongo') && food.name.toLowerCase().includes('carnaza')) {
    return RAWHIDE_TREAT;
  }
  if (b.includes('bongo') || b.includes('fruitables') || b.includes('meaty treats')) {
    return food.species === 'Cat' ? TREAT_CAT : TREAT_DOG;
  }
  if (b.includes('roketio') || b.includes('don croki')) {
    return DEHYDRATED_MEAT;
  }
  if (b.includes('inaba') || b.includes('churu')) {
    return WET_CAT;
  }
  if (b.includes('yowup')) {
    return TOPPER_YOGURT;
  }
  if (b.includes('pet naturals') || b.includes('advance') || b.includes('natural select') || b.includes('pet life')) {
    return TREAT_DOG;
  }

  return undefined;
}

/** Defaults por especie + tipo de alimento cuando no hay marca conocida. */
export function resolveCategoryMicroDefaults(food: GuatemalaReferenceFood): MicroPatch {
  const isCat = food.species === 'Cat';
  const isPuppy = food.life_stage === 'puppy';

  if (food.food_type === 'treat') {
    return isCat ? TREAT_CAT : TREAT_DOG;
  }
  if (food.food_type === 'wet_food') {
    return isCat ? WET_CAT : WET_DOG;
  }
  if (food.name.toLowerCase().includes('carnaza') || food.name.toLowerCase().includes('rawhide')) {
    return RAWHIDE_TREAT;
  }
  if (isCat) return DRY_CAT_ADULT;
  if (isPuppy) return DRY_DOG_PUPPY;
  return DRY_DOG_MAINSTREAM;
}
