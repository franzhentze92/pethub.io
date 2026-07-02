/** Patrones compartidos para consultas de lectura/análisis nutricional (no registro de comidas). */

export const NUTRITION_TOPIC_PATTERN =
  /\b(dieta|alimentaci[oó]n|nutrici[oó]n|comida|comi[oó]|alimento|alimentos|macros?|macronutrientes|micronutrientes|ingesta|ingerid[oa]|raci[oó]n|porci[oó]n)\b/i;

export const NUTRIENT_TOPIC_PATTERN =
  /\b(prote[ií]na|prote[ií]nas|grasa|grasas|calor[ií]a|calor[ií]as|kcal|energ[ií]a|fibra|carbohidratos?|carbos?|humedad|ceniza|omega|vitamina|vitaminas|mineral|minerales|zinc|calcio|hierro|f[oó]sforo|magnesio|selenio|potasio|yodo|cobre|manganeso|sodio|tiamina|riboflavina|niacina|cobalamina|biotina|vitamina\s*[aekbcd]|ácido\s*graso|lipid)\b/i;

export const NUTRITION_ANALYSIS_PATTERN =
  /\b(suficiente|necesita|adecuad[oa]|baj[oa]|alt[oa]|d[eé]ficit|falta|carencia|comparad|ideal|objetivo|recomendad|perfil nutricional|contenido de|cu[aá]nta|cu[aá]nto|analiza|analizar|vs\.?\s*ideal|respecto\s+a\s+lo\s+ideal)\b/i;

export const NUTRIENT_IDEAL_PATTERN =
  /\b(ideal|objetivo|recomendad[oa]|necesidad|deber[ií]a|vs\.?\s*ideal|comparad[oa]?\s+(con|vs\.?)\s+(el\s+)?ideal|respecto\s+a\s+lo\s+ideal)\b/i;

export const FOOD_CATALOG_NAME_PATTERN =
  /\b(royal canin|pedigree|purina|pro plan|dog chow|whiskas|nupec|ganador|hill'?s|medium adult|adulto razas medianas)\b/i;

const REGISTER_PATTERN = /\b(registrar|registra|anota|guarda|programar|crear horario)\b/i;

export function isNutritionRegisterMessage(message: string): boolean {
  return REGISTER_PATTERN.test(message.toLowerCase());
}

export function mentionsNutritionTopic(message: string): boolean {
  const lower = message.toLowerCase();
  return NUTRITION_TOPIC_PATTERN.test(lower) || NUTRIENT_TOPIC_PATTERN.test(lower);
}

export function isNutritionReadIntent(message: string): boolean {
  if (isNutritionRegisterMessage(message)) return false;
  const lower = message.toLowerCase();
  return (
    mentionsNutritionTopic(lower) ||
    (/\bcomo\s+est[aá]\b/i.test(lower) && NUTRIENT_TOPIC_PATTERN.test(lower)) ||
    /\b(cu[aá]nto(s)?\s+(ha\s+)?comido|cu[aá]nto(s)?\s+gramos|gramos\s+(de\s+)?comida)\b/i.test(lower) ||
    /\b(historial\s+de\s+(comida|alimentaci[oó]n)|qu[eé]\s+comi[oó]|comidas?\s+recientes)\b/i.test(lower) ||
    (NUTRITION_TOPIC_PATTERN.test(lower) &&
      /\b(cu[aá]nto|cu[aá]ntos|total|suma|semana|[uú]ltim[oa]s?)\b/i.test(lower)) ||
    (/\bcomo\s+est[aá]\b/i.test(lower) && /\balimentaci[oó]n\b/i.test(lower)) ||
    /\b(analiza|analizar)\b.*\b(dieta|alimentaci[oó]n|nutrici[oó]n)\b/i.test(lower)
  );
}

export function isFoodNutrientProfileQuery(message: string): boolean {
  if (isNutritionRegisterMessage(message)) return false;
  const lower = message.toLowerCase();
  return (
    NUTRIENT_TOPIC_PATTERN.test(lower) ||
    /\b(perfil nutricional|an[aá]lisis garantizado|por\s*100\s*g|kcal|calor[ií]as del alimento|contenido de)\b/i.test(lower) ||
    (FOOD_CATALOG_NAME_PATTERN.test(lower) &&
      /\b(busca|contenido|grasa|prote[ií]na|vitamina|mineral|exacto|datos|perfil)\b/i.test(lower))
  );
}

export function gapKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    fat_intake: 'grasa',
    protein_intake: 'proteína',
    calories_intake: 'calorías',
    fiber_intake: 'fibra',
    omega_fatty_acids: 'omega-3/omega-6',
    zinc: 'zinc',
    calcium: 'calcio',
    iron: 'hierro',
    phosphorus: 'fósforo',
    vitamin_e: 'vitamina E',
    vitamin_a: 'vitamina A',
    vitamin_d: 'vitamina D',
    vitamin_b_complex: 'vitaminas del complejo B',
    minerals_general: 'minerales',
    vitamins_general: 'vitaminas',
  };
  return labels[kind] ?? kind.replace(/_/g, ' ');
}
