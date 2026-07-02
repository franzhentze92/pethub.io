import {
  endOfMonth,
  eachDayOfInterval,
  format,
  startOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { scheduleAppliesOnDate } from './feedingScheduleAutomation';
import type { PetFoodRecord } from './nutritionSession';
import { matchFoodByName } from './nutritionSession';
import { enrichNutritionFood } from './nutritionFoodEnrichment';

export interface NutrientTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  vitamin_a: number;
  vitamin_d: number;
  vitamin_e: number;
  vitamin_k: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_b3: number;
  vitamin_b6: number;
  vitamin_b12: number;
  vitamin_c: number;
  calcium: number;
  phosphorus: number;
  magnesium: number;
  iron: number;
  zinc: number;
  copper: number;
  manganese: number;
  selenium: number;
  sodium: number;
  potassium: number;
  iodine: number;
}

export const EMPTY_NUTRIENTS: NutrientTotals = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  vitamin_a: 0,
  vitamin_d: 0,
  vitamin_e: 0,
  vitamin_k: 0,
  vitamin_b1: 0,
  vitamin_b2: 0,
  vitamin_b3: 0,
  vitamin_b6: 0,
  vitamin_b12: 0,
  vitamin_c: 0,
  calcium: 0,
  phosphorus: 0,
  magnesium: 0,
  iron: 0,
  zinc: 0,
  copper: 0,
  manganese: 0,
  selenium: 0,
  sodium: 0,
  potassium: 0,
  iodine: 0,
};

export type NutrientKey = keyof NutrientTotals;

export interface NutrientDefinition {
  key: NutrientKey;
  label: string;
  unit: string;
  group: 'macro' | 'vitamin' | 'mineral';
  decimals?: number;
}

export const NUTRIENT_DEFINITIONS: NutrientDefinition[] = [
  { key: 'calories', label: 'Calorías', unit: 'kcal', group: 'macro', decimals: 0 },
  { key: 'protein', label: 'Proteína', unit: 'g', group: 'macro', decimals: 1 },
  { key: 'fat', label: 'Grasa', unit: 'g', group: 'macro', decimals: 1 },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g', group: 'macro', decimals: 1 },
  { key: 'fiber', label: 'Fibra', unit: 'g', group: 'macro', decimals: 1 },
  { key: 'vitamin_a', label: 'Vitamina A', unit: 'IU', group: 'vitamin', decimals: 0 },
  { key: 'vitamin_d', label: 'Vitamina D', unit: 'IU', group: 'vitamin', decimals: 0 },
  { key: 'vitamin_e', label: 'Vitamina E', unit: 'IU', group: 'vitamin', decimals: 0 },
  { key: 'vitamin_k', label: 'Vitamina K', unit: 'mg', group: 'vitamin', decimals: 2 },
  { key: 'vitamin_b1', label: 'Vitamina B1', unit: 'mg', group: 'vitamin', decimals: 2 },
  { key: 'vitamin_b2', label: 'Vitamina B2', unit: 'mg', group: 'vitamin', decimals: 2 },
  { key: 'vitamin_b3', label: 'Vitamina B3', unit: 'mg', group: 'vitamin', decimals: 2 },
  { key: 'vitamin_b6', label: 'Vitamina B6', unit: 'mg', group: 'vitamin', decimals: 2 },
  { key: 'vitamin_b12', label: 'Vitamina B12', unit: 'mg', group: 'vitamin', decimals: 3 },
  { key: 'vitamin_c', label: 'Vitamina C', unit: 'mg', group: 'vitamin', decimals: 1 },
  { key: 'calcium', label: 'Calcio', unit: 'g', group: 'mineral', decimals: 2 },
  { key: 'phosphorus', label: 'Fósforo', unit: 'g', group: 'mineral', decimals: 2 },
  { key: 'magnesium', label: 'Magnesio', unit: 'mg', group: 'mineral', decimals: 1 },
  { key: 'iron', label: 'Hierro', unit: 'mg', group: 'mineral', decimals: 2 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', decimals: 2 },
  { key: 'copper', label: 'Cobre', unit: 'mg', group: 'mineral', decimals: 3 },
  { key: 'manganese', label: 'Manganeso', unit: 'mg', group: 'mineral', decimals: 3 },
  { key: 'selenium', label: 'Selenio', unit: 'mg', group: 'mineral', decimals: 3 },
  { key: 'sodium', label: 'Sodio', unit: 'g', group: 'mineral', decimals: 2 },
  { key: 'potassium', label: 'Potasio', unit: 'mg', group: 'mineral', decimals: 1 },
  { key: 'iodine', label: 'Yodo', unit: 'mg', group: 'mineral', decimals: 3 },
];

export interface FeedingTimeConfig {
  time: string;
  meal_type: string;
  food_id: string;
  quantity_grams: number;
}

export interface FeedingScheduleConfig {
  id: string;
  pet_id: string;
  is_active: boolean;
  feeding_times: FeedingTimeConfig[];
  days_of_week: number[];
  start_date: string;
  end_date?: string | null;
}

export interface NutritionSessionRow {
  pet_id: string;
  date: string;
  food_name: string;
  quantity_grams: number;
  notes?: string | null;
  total_calories?: number | null;
  total_protein?: number | null;
  total_fat?: number | null;
  total_carbs?: number | null;
  total_fiber?: number | null;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  fat_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fiber_per_100g?: number | null;
}

export interface PetProfile {
  id: string;
  name: string;
  species: string;
  weight?: number | null;
  age?: number | null;
}

export interface MonthlyNutritionComparison {
  petId: string;
  petName: string;
  monthLabel: string;
  daysInMonth: number;
  scheduleDays: number;
  sessionCount: number;
  autoSessionCount: number;
  loggedGrams: number;
  hasActiveSchedules: boolean;
  expected: NutrientTotals;
  actual: NutrientTotals;
  energyReference: NutrientTotals | null;
  expectedSource: 'schedule' | 'energy_reference' | 'none';
}

export interface FoodProfileCoverage {
  totalFoods: number;
  withMacros: number;
  withVitamins: number;
  withMinerals: number;
  macroPct: number;
  vitaminPct: number;
  mineralPct: number;
  foodsMissingMacros: string[];
  foodsMissingMicros: string[];
}

export interface DailyNutrientPoint {
  date: string;
  expected: NutrientTotals;
  actual: NutrientTotals;
}

export interface PetDailyNutrientSeries {
  petId: string;
  petName: string;
  points: DailyNutrientPoint[];
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Extrae YYYY-MM-DD sin desfase de zona horaria. */
export function normalizeSessionDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr.slice(0, 10);
}

/** Parsea YYYY-MM-DD como medianoche local (sin desfase UTC). */
export function parseNutritionLocalDate(dateStr: string): Date {
  const normalized = normalizeSessionDate(dateStr);
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateStr);
  return new Date(year, month - 1, day);
}

export function formatNutritionSessionDate(dateStr: string): string {
  const normalized = normalizeSessionDate(dateStr);
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('es-GT');
}

/** YYYY-MM → fecha local sin desfase UTC (evita mostrar mayo cuando el filtro es junio). */
export function formatNutritionMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return monthValue;
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
}

function addNutrients(base: NutrientTotals, extra: Partial<NutrientTotals>): NutrientTotals {
  const result = { ...base };
  for (const def of NUTRIENT_DEFINITIONS) {
    const key = def.key;
    result[key] = coerceNumber(result[key]) + coerceNumber(extra[key]);
  }
  return result;
}

export function nutrientsFromFoodGrams(
  food: PetFoodRecord,
  grams: number,
  catalog?: Array<PetFoodRecord & { id: string }>,
): NutrientTotals {
  const enriched =
    catalog && 'id' in food
      ? enrichNutritionFood(food as PetFoodRecord & { id: string }, catalog)
      : food;
  const m = grams / 100;
  const from = (v: number | null | undefined) => (v != null ? coerceNumber(v) * m : 0);

  return {
    calories: from(enriched.calories_per_100g),
    protein: from(enriched.protein_per_100g),
    fat: from(enriched.fat_per_100g),
    carbs: from(enriched.carbs_per_100g),
    fiber: from(enriched.fiber_per_100g),
    vitamin_a: from(enriched.vitamin_a_per_100g),
    vitamin_d: from(enriched.vitamin_d_per_100g),
    vitamin_e: from(enriched.vitamin_e_per_100g),
    vitamin_k: from(enriched.vitamin_k_per_100g),
    vitamin_b1: from(enriched.vitamin_b1_per_100g),
    vitamin_b2: from(enriched.vitamin_b2_per_100g),
    vitamin_b3: from(enriched.vitamin_b3_per_100g),
    vitamin_b6: from(enriched.vitamin_b6_per_100g),
    vitamin_b12: from(enriched.vitamin_b12_per_100g),
    vitamin_c: from(enriched.vitamin_c_per_100g),
    calcium: from(enriched.calcium_per_100g),
    phosphorus: from(enriched.phosphorus_per_100g),
    magnesium: from(enriched.magnesium_per_100g),
    iron: from(enriched.iron_per_100g),
    zinc: from(enriched.zinc_per_100g),
    copper: from(enriched.copper_per_100g),
    manganese: from(enriched.manganese_per_100g),
    selenium: from(enriched.selenium_per_100g),
    sodium: from(enriched.sodium_per_100g),
    potassium: from(enriched.potassium_per_100g),
    iodine: from(enriched.iodine_per_100g),
  };
}

export function getMonthInterval(monthValue: string): { start: Date; end: Date; days: number } {
  const [year, month] = monthValue.split('-').map(Number);
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end }).length;
  return { start, end, days };
}

export function isDateInMonth(dateStr: string, monthValue: string): boolean {
  return normalizeSessionDate(dateStr).startsWith(monthValue);
}

/** RER/MER estimado (kcal/día) según peso y especie. */
export function estimateDailyEnergyKcal(pet: Pick<PetProfile, 'species' | 'weight' | 'age'>): number | null {
  const weight = pet.weight != null ? Number(pet.weight) : null;
  if (!weight || weight <= 0) return null;

  const species = (pet.species || '').toLowerCase();
  const isCat = species.includes('cat') || species.includes('gato');
  const rer = isCat ? 70 * Math.pow(weight, 0.75) : 70 * Math.pow(weight, 0.75);

  let factor = isCat ? 1.2 : 1.6;
  if (pet.age != null && pet.age < 1) factor = isCat ? 2.5 : 2.0;
  else if (pet.age != null && pet.age >= 7) factor = isCat ? 1.1 : 1.4;

  return Math.round(rer * factor);
}

export function buildEnergyReferenceMonthly(
  pet: PetProfile,
  daysInMonth: number,
): NutrientTotals | null {
  const daily = buildDailyEnergyReference(pet);
  if (!daily) return null;

  const scaled = { ...EMPTY_NUTRIENTS };
  for (const def of NUTRIENT_DEFINITIONS) {
    scaled[def.key] = daily[def.key] * daysInMonth;
  }
  return scaled;
}

/** MER diario estimado (kcal y macros derivados). */
export function buildDailyEnergyReference(pet: PetProfile): NutrientTotals | null {
  const dailyKcal = estimateDailyEnergyKcal(pet);
  if (!dailyKcal) return null;

  const species = (pet.species || '').toLowerCase();
  const isCat = species.includes('cat') || species.includes('gato');

  const proteinPct = isCat ? 0.35 : 0.25;
  const fatPct = isCat ? 0.25 : 0.15;
  const proteinKcal = dailyKcal * proteinPct;
  const fatKcal = dailyKcal * fatPct;
  const carbKcal = dailyKcal - proteinKcal - fatKcal;

  return {
    ...EMPTY_NUTRIENTS,
    calories: dailyKcal,
    protein: proteinKcal / 4,
    fat: fatKcal / 9,
    carbs: carbKcal / 4,
    fiber: (dailyKcal / 1000) * (isCat ? 8 : 12),
  };
}

function sessionsOnDate(
  sessions: NutritionSessionRow[],
  petId: string,
  dateStr: string,
): NutritionSessionRow[] {
  return sessions.filter(
    (s) => s.pet_id === petId && normalizeSessionDate(s.date) === dateStr,
  );
}

function expectedNutrientsForDay(params: {
  day: Date;
  petId: string;
  schedules: FeedingScheduleConfig[];
  foodsById: Map<string, PetFoodRecord & { id: string }>;
  foods: Array<PetFoodRecord & { id: string }>;
  dailyMer: NutrientTotals | null;
}): NutrientTotals {
  const applicable = params.schedules.filter(
    (s) => s.pet_id === params.petId && s.is_active && scheduleAppliesOnDate(s, params.day),
  );

  let expected = { ...EMPTY_NUTRIENTS };

  for (const schedule of applicable) {
    for (const slot of schedule.feeding_times || []) {
      const food = params.foodsById.get(slot.food_id);
      if (!food || !slot.quantity_grams) continue;
      expected = addNutrients(
        expected,
        nutrientsFromFoodGrams(food, slot.quantity_grams, params.foods),
      );
    }
  }

  if (expected.calories <= 0 && params.dailyMer) {
    return { ...params.dailyMer };
  }

  return expected;
}

export function buildPetDailyNutrientSeries(params: {
  pet: PetProfile;
  monthValue: string;
  schedules: FeedingScheduleConfig[];
  sessions: NutritionSessionRow[];
  foods: Array<PetFoodRecord & { id: string }>;
}): PetDailyNutrientSeries {
  const { start, end } = getMonthInterval(params.monthValue);
  const foodsById = new Map(params.foods.map((f) => [f.id, f]));
  const dailyMer = buildDailyEnergyReference(params.pet);

  const points = eachDayOfInterval({ start, end }).map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const expected = expectedNutrientsForDay({
      day,
      petId: params.pet.id,
      schedules: params.schedules,
      foodsById,
      foods: params.foods,
      dailyMer,
    });

    const daySessions = sessionsOnDate(params.sessions, params.pet.id, dateStr);
    const actual = daySessions.reduce(
      (acc, session) => addNutrients(acc, sessionToNutrients(session, params.foods)),
      { ...EMPTY_NUTRIENTS },
    );

    return { date: dateStr, expected, actual };
  });

  return {
    petId: params.pet.id,
    petName: params.pet.name,
    points,
  };
}

export function buildPetsDailyNutrientSeries(params: {
  pets: PetProfile[];
  monthValue: string;
  schedules: FeedingScheduleConfig[];
  sessions: NutritionSessionRow[];
  foods: Array<PetFoodRecord & { id: string }>;
}): PetDailyNutrientSeries[] {
  return params.pets.map((pet) =>
    buildPetDailyNutrientSeries({
      pet,
      monthValue: params.monthValue,
      schedules: params.schedules,
      sessions: params.sessions,
      foods: params.foods,
    }),
  );
}

export function calculateExpectedFromSchedules(params: {
  petId: string;
  monthValue: string;
  schedules: FeedingScheduleConfig[];
  foodsById: Map<string, PetFoodRecord & { id: string }>;
  foods: Array<PetFoodRecord & { id: string }>;
}): { totals: NutrientTotals; scheduleDays: number } {
  const { start, end } = getMonthInterval(params.monthValue);
  const petSchedules = params.schedules.filter((s) => s.pet_id === params.petId && s.is_active);

  let totals = { ...EMPTY_NUTRIENTS };
  let scheduleDays = 0;

  for (const day of eachDayOfInterval({ start, end })) {
    const applicable = petSchedules.filter((s) => scheduleAppliesOnDate(s, day));
    if (applicable.length === 0) continue;

    scheduleDays += 1;

    for (const schedule of applicable) {
      for (const slot of schedule.feeding_times || []) {
        const food = params.foodsById.get(slot.food_id);
        if (!food || !slot.quantity_grams) continue;
        totals = addNutrients(
          totals,
          nutrientsFromFoodGrams(food, slot.quantity_grams, params.foods),
        );
      }
    }
  }

  return { totals, scheduleDays };
}

export function sessionToNutrients(
  session: NutritionSessionRow,
  foods: Array<PetFoodRecord & { id: string }>,
): NutrientTotals {
  const matchingFood = matchFoodByName(foods, session.food_name);
  const quantity = coerceNumber(session.quantity_grams);

  if (
    session.total_calories != null ||
    session.total_protein != null ||
    session.total_fat != null
  ) {
    const base: NutrientTotals = {
      calories: coerceNumber(session.total_calories),
      protein: coerceNumber(session.total_protein),
      fat: coerceNumber(session.total_fat),
      carbs: coerceNumber(session.total_carbs),
      fiber: coerceNumber(session.total_fiber),
      vitamin_a: 0,
      vitamin_d: 0,
      vitamin_e: 0,
      vitamin_k: 0,
      vitamin_b1: 0,
      vitamin_b2: 0,
      vitamin_b3: 0,
      vitamin_b6: 0,
      vitamin_b12: 0,
      vitamin_c: 0,
      calcium: 0,
      phosphorus: 0,
      magnesium: 0,
      iron: 0,
      zinc: 0,
      copper: 0,
      manganese: 0,
      selenium: 0,
      sodium: 0,
      potassium: 0,
      iodine: 0,
    };

    if (matchingFood) {
      const micros = nutrientsFromFoodGrams(matchingFood, quantity, foods);
      for (const def of NUTRIENT_DEFINITIONS) {
        if (def.group !== 'macro') {
          base[def.key] = micros[def.key];
        }
      }
    }

    return base;
  }

  if (matchingFood) {
    return nutrientsFromFoodGrams(matchingFood, quantity, foods);
  }

  const m = quantity / 100;
  const fromSession = (v: number | null | undefined, fallback: number) =>
    v != null ? coerceNumber(v) * m : quantity * fallback;

  return {
    calories: fromSession(session.calories_per_100g, 3.5),
    protein: fromSession(session.protein_per_100g, 0.25),
    fat: fromSession(session.fat_per_100g, 0.15),
    carbs: fromSession(session.carbs_per_100g, 0.4),
    fiber: fromSession(session.fiber_per_100g, 0.05),
    vitamin_a: 0,
    vitamin_d: 0,
    vitamin_e: 0,
    vitamin_k: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_b3: 0,
    vitamin_b6: 0,
    vitamin_b12: 0,
    vitamin_c: 0,
    calcium: 0,
    phosphorus: 0,
    magnesium: 0,
    iron: 0,
    zinc: 0,
    copper: 0,
    manganese: 0,
    selenium: 0,
    sodium: 0,
    potassium: 0,
    iodine: 0,
  };
}

export function calculateActualFromSessions(params: {
  petId: string;
  monthValue: string;
  sessions: NutritionSessionRow[];
  foods: Array<PetFoodRecord & { id: string }>;
}): NutrientTotals {
  const filtered = params.sessions.filter(
    (s) => s.pet_id === params.petId && isDateInMonth(s.date, params.monthValue),
  );

  return filtered.reduce(
    (acc, session) => addNutrients(acc, sessionToNutrients(session, params.foods)),
    { ...EMPTY_NUTRIENTS },
  );
}

export function buildPetMonthlyComparison(params: {
  pet: PetProfile;
  monthValue: string;
  schedules: FeedingScheduleConfig[];
  sessions: NutritionSessionRow[];
  foods: Array<PetFoodRecord & { id: string }>;
}): MonthlyNutritionComparison {
  const { days } = getMonthInterval(params.monthValue);
  const foodsById = new Map(params.foods.map((f) => [f.id, f]));
  const petSchedules = params.schedules.filter((s) => s.pet_id === params.pet.id && s.is_active);
  const { totals: scheduleExpected, scheduleDays } = calculateExpectedFromSchedules({
    petId: params.pet.id,
    monthValue: params.monthValue,
    schedules: params.schedules,
    foodsById,
    foods: params.foods,
  });

  const actual = calculateActualFromSessions({
    petId: params.pet.id,
    monthValue: params.monthValue,
    sessions: params.sessions,
    foods: params.foods,
  });

  const energyReference = buildEnergyReferenceMonthly(params.pet, days);
  const hasActiveSchedules = petSchedules.length > 0;
  const hasScheduleNutrition = scheduleExpected.calories > 0;

  let expected = scheduleExpected;
  let expectedSource: MonthlyNutritionComparison['expectedSource'] = 'none';

  if (hasScheduleNutrition) {
    expectedSource = 'schedule';
  } else if (energyReference) {
    expected = energyReference;
    expectedSource = 'energy_reference';
  }

  const monthLabel = formatNutritionMonthLabel(params.monthValue);

  const petSessions = params.sessions.filter(
    (s) => s.pet_id === params.pet.id && isDateInMonth(s.date, params.monthValue),
  );

  return {
    petId: params.pet.id,
    petName: params.pet.name,
    monthLabel,
    daysInMonth: days,
    scheduleDays,
    sessionCount: petSessions.length,
    autoSessionCount: petSessions.filter((s) =>
      /automática|auto-completed/i.test(s.notes ?? ''),
    ).length,
    loggedGrams: petSessions.reduce((sum, s) => sum + coerceNumber(s.quantity_grams), 0),
    hasActiveSchedules,
    expected,
    actual,
    energyReference,
    expectedSource,
  };
}

export function compliancePercent(expected: number, actual: number): number | null {
  if (expected <= 0) return null;
  return Math.round((actual / expected) * 100);
}

export function complianceStatus(pct: number | null): 'low' | 'ok' | 'high' | 'unknown' {
  if (pct == null) return 'unknown';
  if (pct < 85) return 'low';
  if (pct > 115) return 'high';
  return 'ok';
}

/** Minerales/vitaminas casi idénticos pero calorías distintas → revisar datos. */
export function comparisonLooksSuspiciouslyPerfect(
  comparison: Pick<MonthlyNutritionComparison, 'expected' | 'actual'>,
): boolean {
  const caloriePct = compliancePercent(comparison.expected.calories, comparison.actual.calories);
  if (caloriePct == null || caloriePct === 100) return false;

  const microKeys = NUTRIENT_DEFINITIONS.filter((d) => d.group !== 'macro').map((d) => d.key);
  const microsMatch = microKeys.every((key) => {
    const expected = comparison.expected[key];
    const actual = comparison.actual[key];
    if (expected <= 0 && actual <= 0) return true;
    if (expected <= 0) return false;
    return Math.abs(actual - expected) / expected < 0.02;
  });

  return microsMatch;
}

export function formatNutrientValue(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return Math.round(value).toLocaleString('es-GT');
  if (decimals === 0) return Math.round(value).toLocaleString('es-GT');
  return value.toLocaleString('es-GT', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export function assessFoodProfileCoverage(
  foods: Array<PetFoodRecord & { id: string; brand?: string | null; name: string }>,
): FoodProfileCoverage {
  const macroKeys: (keyof PetFoodRecord)[] = [
    'calories_per_100g',
    'protein_per_100g',
    'fat_per_100g',
    'carbs_per_100g',
    'fiber_per_100g',
  ];
  const vitaminKeys: (keyof PetFoodRecord)[] = [
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
  ];
  const mineralKeys: (keyof PetFoodRecord)[] = [
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

  const hasAll = (food: PetFoodRecord, keys: (keyof PetFoodRecord)[]) =>
    keys.every((k) => food[k] != null && Number(food[k]) > 0);

  const label = (f: { brand?: string | null; name: string }) =>
    f.brand ? `${f.brand} - ${f.name}` : f.name;

  const withMacros = foods.filter((f) => hasAll(f, macroKeys));
  const withVitamins = foods.filter((f) => hasAll(f, vitaminKeys));
  const withMinerals = foods.filter((f) => hasAll(f, mineralKeys));

  const total = foods.length || 1;

  return {
    totalFoods: foods.length,
    withMacros: withMacros.length,
    withVitamins: withVitamins.length,
    withMinerals: withMinerals.length,
    macroPct: Math.round((withMacros.length / total) * 100),
    vitaminPct: Math.round((withVitamins.length / total) * 100),
    mineralPct: Math.round((withMinerals.length / total) * 100),
    foodsMissingMacros: foods.filter((f) => !hasAll(f, macroKeys)).map(label).slice(0, 8),
    foodsMissingMicros: foods
      .filter((f) => !hasAll(f, vitaminKeys) || !hasAll(f, mineralKeys))
      .map(label)
      .slice(0, 8),
  };
}
