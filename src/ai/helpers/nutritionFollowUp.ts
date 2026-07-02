import type { AiExecutionContext, ConversationTurn } from '../types';
import { getRecentTools } from '../conversationContext';
import {
  inferProductCategory,
  inferTargetSpecies,
  resolveMarketplaceIntent,
  wantsMarketplaceProducts,
} from './marketplaceSearch';
import { inferPetNameParam } from './inferPetParam';

import { mentionsNutritionTopic } from './nutritionIntent';

const AFFIRMATIVE_REPLY =
  /^(s[ií]|ok|vale|claro|por favor|dale|hazlo|adelante|bueno|perfecto|de acuerdo|est[aá] bien)\s*[.!]?$/i;

const NUTRIENT_CONTEXT =
  /\b(nutrici[oó]n|prote[ií]na|grasa|grasas|dieta|macro|alimentaci[oó]n|omega|suplemento|marketplace|tienda|productos?|vitamina|vitaminas|mineral|minerales|fibra|calcio|zinc|hierro|calor[ií]a)\b/i;

const OFFERED_PRODUCTS_CONTEXT =
  /\b(productos?|marketplace|tienda|men[uú]|alimentos?|agregar al carrito|comprar|ajustar|planear|sugerir|sugiera|recomend)\b/i;

export function isAffirmativeReply(message: string): boolean {
  return AFFIRMATIVE_REPLY.test(message.trim());
}

export function isNutrientConversationActive(history: ConversationTurn[]): boolean {
  const recentTools = getRecentTools(history);
  if (recentTools.some((t) => t === 'nutrition_analyze_diet' || t === 'nutrition_get_food_profile')) {
    return true;
  }
  const recentText = history
    .slice(-8)
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();
  return NUTRIENT_CONTEXT.test(recentText);
}

export function resolveAffirmativeNutritionFollowUp(
  message: string,
  history: ConversationTurn[],
  ctx?: AiExecutionContext,
): { toolName: 'nutrition_analyze_diet'; params: Record<string, unknown> } | null {
  if (!isAffirmativeReply(message)) return null;
  if (!isNutrientConversationActive(history)) return null;

  const lastAssistant = [...history].reverse().find((t) => t.role === 'assistant');
  const offeredProducts =
    OFFERED_PRODUCTS_CONTEXT.test(lastAssistant?.content ?? '') ||
    wantsMarketplaceProducts(history.slice(-3).map((t) => t.content).join(' '));

  if (!offeredProducts && !NUTRIENT_CONTEXT.test(history.slice(-4).map((t) => t.content).join(' '))) {
    return null;
  }

  const petName = inferPetNameParam(message, history, ctx?.userPetNames);
  if (!petName) return null;

  return {
    toolName: 'nutrition_analyze_diet',
    params: { pet_name: petName, days: 30 },
  };
}

function inferContextualProductQuery(history: ConversationTurn[], message: string): string | undefined {
  const contextText = [...history.slice(-8).map((t) => t.content), message].join(' ').toLowerCase();
  if (/\bprote[ií]na\b/i.test(contextText)) return 'alimento alto en proteína concentrado';
  if (/\b(grasa|grasas|omega|lipid)\b/i.test(contextText)) return 'alimento omega suplemento grasa';
  if (/\bcalor[ií]a\b/i.test(contextText)) return 'alimento energético calorías';
  if (/\bfibra\b/i.test(contextText)) return 'alimento fibra digestión';
  if (/\bvitamina\b/i.test(contextText)) return 'suplemento vitaminas multivitamínico';
  if (/\b(zinc|calcio|hierro|f[oó]sforo|mineral)\b/i.test(contextText)) return 'suplemento minerales vitaminas';
  if (mentionsNutritionTopic(contextText)) return 'alimento mascota nutrición';
  return 'alimento mascota';
}

export function resolveNutritionMarketplaceFollowUp(
  message: string,
  history: ConversationTurn[],
  ctx?: AiExecutionContext,
): { toolName: 'marketplace_search_products'; params: Record<string, unknown> } | null {
  if (!wantsMarketplaceProducts(message)) return null;
  if (!isNutrientConversationActive(history) && !inferProductCategory(message)) return null;

  const intent = resolveMarketplaceIntent(message);
  if (!intent || intent.toolName !== 'marketplace_search_products') return null;

  const params = { ...intent.params };
  const extractedQuery = typeof params.query === 'string' ? params.query.trim() : '';
  const weakQuery =
    !extractedQuery ||
    /^(busca|buscar|marketplace|productos?|tienda)$/i.test(extractedQuery) ||
    extractedQuery.split(/\s+/).length <= 2;

  if (weakQuery) {
    params.query = inferContextualProductQuery(history, message);
  }

  if (!params.category) {
    const fromMessage = inferProductCategory(message);
    const fromContext = inferProductCategory(
      history
        .slice(-6)
        .map((t) => t.content)
        .join(' '),
    );
    params.category = fromMessage ?? fromContext ?? 'alimentos';
  }

  const species =
    inferTargetSpecies(message) ??
    inferTargetSpecies(history.slice(-6).map((t) => t.content).join(' '));
  if (species) params.target_species = species;

  const petName = inferPetNameParam(message, history, ctx?.userPetNames);
  if (petName && ctx?.userPetNames?.some((n) => n.toLowerCase() === petName.toLowerCase())) {
    params.pet_name = petName;
  }

  return { toolName: 'marketplace_search_products', params };
}
