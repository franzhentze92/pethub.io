import type { AiExecutionContext, ConversationTurn } from '../types';
import { inferPetNameParam } from './inferPetParam';
import { isNutritionReadIntent, isFoodNutrientProfileQuery } from './nutritionIntent';
import { wantsMarketplaceProducts } from './marketplaceSearch';
import {
  resolveAffirmativeNutritionFollowUp,
  resolveNutritionMarketplaceFollowUp,
} from './nutritionFollowUp';

export {
  isNutritionReadIntent as isNutritionQueryMessage,
  isFoodNutrientProfileQuery as isFoodProfileQuery,
  mentionsNutritionTopic,
} from './nutritionIntent';

const DIET_ANALYSIS_PATTERN =
  /\b(dieta|alimentaci[oó]n|qu[eé]\s+come|qu[eé]\s+comi[oó]|analiza|analizar|suficiente|necesita|recomendaci[oó]n|nutrici[oó]n de|perfil de su comida|lo que (ha )?ingerido|lo que come|busca(?:me|le)?\s+alimento|suplemento|omega)\b/i;

const FOOD_CATALOG_NAME_PATTERN =
  /\b(royal canin|pedigree|purina|pro plan|dog chow|whiskas|nupec|ganador|hill'?s|medium adult|adulto razas medianas)\b/i;

export function isSinglePetNutrientIdealQuery(
  message: string,
  ctx?: AiExecutionContext,
): boolean {
  if (!isFoodNutrientProfileQuery(message) && !/\b(dieta|alimentaci[oó]n|nutrici[oó]n)\b/i.test(message)) {
    return false;
  }
  const lower = message.toLowerCase();
  if (
    !/\b(ideal|objetivo|recomendad[oa]|necesidad|deber[ií]a|vs\.?\s*ideal|comparad[oa]?\s+(con|vs\.?)\s+(el\s+)?ideal|respecto\s+a\s+lo\s+ideal)\b/i.test(
      lower,
    ) &&
    !/\bcomparaci[oó]n\b/i.test(lower)
  ) {
    return false;
  }
  return Boolean(inferPetNameParam(message, [], ctx?.userPetNames));
}

export function isDietAnalysisQuery(message: string, history: ConversationTurn[] = []): boolean {
  const lower = message.toLowerCase();
  if (/\b(registrar|registra|anota)\b/i.test(lower)) return false;
  if (wantsMarketplaceProducts(message) && !isFoodNutrientProfileQuery(message)) return false;
  const context = [message, ...history.slice(-4).map((t) => t.content)].join(' ').toLowerCase();
  return (
    DIET_ANALYSIS_PATTERN.test(lower) ||
    isNutritionReadIntent(message) ||
    isSinglePetNutrientIdealQuery(message) ||
    (isFoodNutrientProfileQuery(message) && inferPetNameParam(message, history) != null) ||
    (isFoodNutrientProfileQuery(context) && inferPetNameParam(message, history) != null)
  );
}

export function resolveNutritionProfileQuery(
  message: string,
  history: ConversationTurn[],
  ctx?: AiExecutionContext,
): {
  toolName: 'nutrition_get_food_profile' | 'nutrition_analyze_diet' | 'marketplace_search_products';
  params: Record<string, unknown>;
} | null {
  const trimmed = message.trim();

  const marketplaceFollowUp = resolveNutritionMarketplaceFollowUp(trimmed, history, ctx);
  if (marketplaceFollowUp) return marketplaceFollowUp;

  const affirmativeFollowUp = resolveAffirmativeNutritionFollowUp(trimmed, history, ctx);
  if (affirmativeFollowUp) return affirmativeFollowUp;

  const petName = inferPetNameParam(trimmed, history, ctx?.userPetNames);

  const wantsFoodOnly =
    isFoodNutrientProfileQuery(trimmed) &&
    (FOOD_CATALOG_NAME_PATTERN.test(trimmed) || /\b(alimento|croqueta|concentrado|producto)\b/i.test(trimmed)) &&
    !/\b(atis|sasha|shaggy|mi mascota|su mascota|dieta de|come)\b/i.test(trimmed) &&
    !petName;

  if (wantsFoodOnly) {
    const foodMatch = trimmed.match(
      /(?:royal canin|pedigree|purina(?:\s+pro plan)?|dog chow|whiskas|nupec|ganador|hill'?s)[^?.!]*/i,
    );
    return {
      toolName: 'nutrition_get_food_profile',
      params: { food_query: foodMatch?.[0]?.trim() || trimmed },
    };
  }

  if (isDietAnalysisQuery(trimmed, history) || (isFoodNutrientProfileQuery(trimmed) && petName)) {
    const daysMatch = trimmed.match(/(\d+)\s*d[ií]as?\b/i);
    const params: Record<string, unknown> = { days: daysMatch ? Number(daysMatch[1]) : 30 };
    if (petName) params.pet_name = petName;

    if (
      isFoodNutrientProfileQuery(trimmed) &&
      FOOD_CATALOG_NAME_PATTERN.test(trimmed) &&
      !isDietAnalysisQuery(trimmed, history)
    ) {
      const foodMatch = trimmed.match(
        /(?:royal canin|pedigree|purina(?:\s+pro plan)?|dog chow|whiskas|nupec|ganador|hill'?s)[^?.!]*/i,
      );
      return {
        toolName: 'nutrition_get_food_profile',
        params: { food_query: foodMatch?.[0]?.trim() || trimmed, pet_name: petName },
      };
    }

    return { toolName: 'nutrition_analyze_diet', params };
  }

  return null;
}
