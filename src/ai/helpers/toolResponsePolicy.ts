/** Read/query tools — LLM must synthesize a conversational answer from the JSON result. */
export const TOOLS_REQUIRING_LLM_SYNTHESIS = new Set([
  'pet_health_summary',
  'pet_timeline',
  'pet_insights',
  'pets_compare',
  'pet_briefing',
  'nutrition_list_recent',
  'nutrition_list_scheduled',
  'nutrition_get_food_profile',
  'nutrition_analyze_diet',
  'exercise_list_recent',
  'veterinary_list_sessions',
  'veterinary_get_session',
  'veterinary_vaccination_status',
  'veterinary_vaccination_schedule',
  'veterinary_spending_summary',
  'memory_list_facts',
  'marketplace_search_products',
  'marketplace_search_services',
  'marketplace_search_semantic',
  'adoption_list_pets',
  'lost_pets_list',
  'orders_track',
]);

export function toolRequiresLlmSynthesis(toolName: string): boolean {
  return TOOLS_REQUIRING_LLM_SYNTHESIS.has(toolName);
}

export function wrapToolResultForLlm(toolName: string, result: unknown): string {
  const baseInstruction =
    'Responde en español latinoamericano, tono cálido y natural (como ChatGPT). ' +
    'Resume los datos en prosa: 2-5 oraciones para consultas simples, un poco más si hace falta. ' +
    'Calcula totales (gramos, calorías, minutos) cuando el usuario pregunte cantidades. ' +
    'Destaca alertas o lo más relevante primero. No vuelques listas largas línea por línea. ' +
    'Cierra con una pregunta solo si falta un dato para ayudar mejor.';

  const nutritionInstruction =
    toolName === 'nutrition_get_food_profile' || toolName === 'nutrition_analyze_diet'
      ? ' Incluye cifras exactas del nutriente preguntado (proteína, grasa, vitaminas, minerales, fibra, calorías) según el perfil. ' +
        'Si nutrition_analyze_diet trae marketplace_recommendations con product_recommendations, resume el déficit en 1-2 oraciones; NO listes productos en texto porque la UI muestra botones "Agregar al carrito". ' +
        'Si gaps_detected tiene elementos pero product_recommendations está vacío, DEBES explicar que no hay productos activos con stock en el marketplace ahora (usa marketplace_availability_note) y sugerir alternativas (veterinario, revisar tienda después). Nunca ignores un déficit sin mencionar la falta de productos.'
      : '';

  const marketplaceInstruction =
    toolName === 'marketplace_search_products' || toolName === 'marketplace_search_semantic'
      ? ' Si la búsqueda devolvió 0 productos, dilo con claridad y tono útil: no hay opciones activas con stock en el marketplace para esa necesidad ahora; sugiere ampliar la búsqueda o consultar al veterinario.'
      : '';

  const payload = {
    tool: toolName,
    data: result,
    _assistant_instruction: baseInstruction + nutritionInstruction + marketplaceInstruction,
  };
  return JSON.stringify(payload);
}
