import type { AiExecutionContext, ConversationTurn } from './types';
import { extractDateFromText, extractTimesFromText } from './helpers/nutritionSchedule';
import { resolveMarketplaceIntent, wantsMarketplaceProducts, wantsMarketplaceServices } from './helpers/marketplaceSearch';
import { inferPetNameParam } from './helpers/inferPetParam';
import { wantsAllPets } from './helpers/petResolver';
import {
  assistantAskedWhichPet,
  inferExerciseParamsFromConversation,
  inferNutritionMealParamsFromConversation,
  inferNutritionScheduleParamsFromConversation,
  inferVeterinaryVisitParamsFromConversation,
  isActiveExerciseRegisterFlow,
  isActiveNutritionRegisterFlow,
  isActiveVeterinaryRegisterFlow,
  isExerciseRegisterMessage,
  isMultiPetReply,
  isNutritionRegisterMessage,
  isVeterinaryRegisterMessage,
  resolveStandaloneRegisterIntent,
} from './helpers/registerFlowParams';

export type { ConversationTurn };

const MAX_HISTORY_TURNS = 12;

const FOLLOW_UP_PATTERNS =
  /\b(mas|más|detalles|informacion|información|adoptarlo|adoptarla|adoptarlo|ese|esa|el anterior|continua|continúa|me interesa|sobre eso|sobre el|sobre la|quiero saber|dame info|mas info|más info)\b/i;

const ADOPTION_CONTEXT =
  /\b(adopcion|adopción|adoptar|albergue|refugio|disponible para adopcion|en adopcion)\b/i;
const LOST_CONTEXT = /\b(perdida|perdido|perdidas|perdidos|extraviad|desaparecid|reportad)\b/i;
const MARKETPLACE_CONTEXT = /\b(producto|productos|tienda|servicio|servicios|precio|comprar)\b/i;
const NUTRITION_CONTEXT =
  /\b(nutrici[oó]n|comida|alimentaci[oó]n|alimento|registrar comida|gramos|desayuno|cena|merienda|horario)\b/i;
const EXERCISE_CONTEXT =
  /\b(ejercicio|actividad f[ií]sica|paseo|caminata|caminar|carrera|fetch|entrenamiento|trazabilidad|registrar ejercicio)\b/i;
const VETERINARY_CONTEXT =
  /\b(veterinari|vet\b|vacuna|vacunaci[oó]n|diagn[oó]stico|tratamiento|receta|historial m[eé]dico|visita m[eé]dica|cita veterinaria|salud de|gasto veterinario)\b/i;
const HEALTH_CONTEXT =
  /\b(salud|bienestar|c[oó]mo est[aá]|como esta|estado de salud|estado general|an[aá]lisis de salud|resumen de salud|chequeo|revisi[oó]n general|salud integral|cuidado integral|recomendaciones de salud|c[oó]mo va)\b/i;
const TIMELINE_CONTEXT =
  /\b(l[ií]nea de tiempo|linea de tiempo|cronolog[ií]a|cronologia|historial completo|todo lo que pas[oó]|qu[eé] pas[oó]|qu[eé] ha pasado|eventos recientes|actividad reciente|resumen temporal|últimos eventos|ultimos eventos)\b/i;
const INSIGHTS_CONTEXT =
  /\b(insights|patrones|alertas|correlaci[oó]n|correlacion|recomendaciones inteligentes|qu[eé] deber[ií]a revisar|que deberia revisar|algo que deba saber|problemas detectados|advertencias|an[aá]lisis inteligente|analisis inteligente)\b/i;
const COMPARE_CONTEXT =
  /\b(comparar|comparaci[oó]n|comparacion|cu[aá]l est[aá] mejor|cual esta mejor|diferencias entre|qui[eé]n tiene m[aá]s|quien tiene mas|qui[eé]n necesita|quien necesita|entre mis mascotas|mis mascotas comparadas)\b/i;

/** Trim history to recent turns for token limits */
export function trimHistory(history: ConversationTurn[]): ConversationTurn[] {
  return history.slice(-MAX_HISTORY_TURNS);
}

export function isFollowUpMessage(message: string): boolean {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (/\b(mis mascotas|mi mascota|mis perros|mis gatos|mis ordenes|mis órdenes)\b/i.test(lower)) {
    return false;
  }
  if (/\b(adopcion|adopción|producto|productos|perdida|perdido|orden|albergue|tienda|servicio|servicios)\b/i.test(lower)) {
    return false;
  }
  if (/\b(producto|productos|servicio|servicios|tienda|marketplace)\b/i.test(lower)) {
    return false;
  }

  if (FOLLOW_UP_PATTERNS.test(trimmed)) return true;

  const words = trimmed.split(/\s+/).length;
  return words <= 3 && trimmed.length < 35;
}

export function getRecentTools(history: ConversationTurn[]): string[] {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === 'assistant' && turn.toolsUsed?.length) {
      return turn.toolsUsed;
    }
  }
  return [];
}

export function getConversationTopic(history: ConversationTurn[]): 'adoption' | 'lost_pets' | 'marketplace' | 'nutrition' | 'exercise' | 'veterinary' | 'health' | 'pets' | null {
  const recent = history.slice(-6).map((t) => t.content.toLowerCase()).join(' ');
  if (HEALTH_CONTEXT.test(recent)) return 'health';
  if (ADOPTION_CONTEXT.test(recent)) return 'adoption';
  if (LOST_CONTEXT.test(recent)) return 'lost_pets';
  if (VETERINARY_CONTEXT.test(recent)) return 'veterinary';
  if (NUTRITION_CONTEXT.test(recent)) return 'nutrition';
  if (EXERCISE_CONTEXT.test(recent)) return 'exercise';
  if (MARKETPLACE_CONTEXT.test(recent)) return 'marketplace';
  if (/\b(mis mascotas|mi mascota|drago|uma)\b/i.test(recent)) return 'pets';
  return null;
}

/** Extract pet/person names mentioned in the conversation */
export function extractMentionedNames(history: ConversationTurn[], currentMessage?: string): string[] {
  const names = new Set<string>();
  const sources = [...history, ...(currentMessage ? [{ role: 'user' as const, content: currentMessage }] : [])];

  for (const turn of sources) {
    for (const match of turn.content.matchAll(/\*\*([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ]+)\*\*/g)) {
      names.add(match[1]);
    }
    for (const match of turn.content.matchAll(/^\d+\.\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/gm)) {
      names.add(match[1]);
    }
    const interestMatch = turn.content.match(
      /(?:interesa|sobre|adoptar(?:lo|la)?|informacion de|información de|info de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)/i
    );
    if (interestMatch) names.add(interestMatch[1]);
  }

  return [...names];
}

export function resolveContextualTool(
  message: string,
  history: ConversationTurn[],
  ctx?: AiExecutionContext,
): { toolName: string; params: Record<string, unknown> } | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const names = extractMentionedNames(history, trimmed);

  if (TIMELINE_CONTEXT.test(lower)) {
    const params: Record<string, unknown> = { days_back: 30 };
    const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
    if (petInMsg && !['Linea', 'Línea', 'Cronologia', 'Cronología', 'Historial', 'Eventos'].includes(petInMsg[1])) {
      params.pet_name = petInMsg[1];
    } else if (names.length > 0) {
      params.pet_name = names[names.length - 1];
    }
    const daysMatch = trimmed.match(/(\d+)\s*d[ií]as?\b/i);
    if (daysMatch) params.days_back = Number(daysMatch[1]);
    return { toolName: 'pet_timeline', params };
  }

  if (INSIGHTS_CONTEXT.test(lower)) {
    const params: Record<string, unknown> = { days_back: 30 };
    const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
    if (petInMsg && !['Insights', 'Patrones', 'Alertas', 'Algo'].includes(petInMsg[1])) {
      params.pet_name = petInMsg[1];
    } else if (names.length > 0) {
      params.pet_name = names[names.length - 1];
    }
    return { toolName: 'pet_insights', params };
  }

  if (COMPARE_CONTEXT.test(lower)) {
    const params: Record<string, unknown> = { pet_name: 'todos' };
    if (names.length > 0) params.pet_name = names[names.length - 1];
    return { toolName: 'pets_compare', params };
  }

  if (/\b(qu[eé] recuerdas|que recuerdas|memoria guardada|hechos guardados)\b/i.test(lower)) {
    return { toolName: 'memory_list_facts', params: {} };
  }

  if (/\b(briefing|resumen del d[ií]a|qu[eé] tengo hoy|que tengo hoy|plan del d[ií]a)\b/i.test(lower)) {
    return { toolName: 'pet_briefing', params: {} };
  }

  if (/\b(rastrear|seguimiento|estado del pedido|d[oó]nde est[aá] mi pedido|donde esta mi pedido)\b/i.test(lower)) {
    const orderMatch = trimmed.match(/#?(\d{4,})/);
    const params: Record<string, unknown> = {};
    if (orderMatch) params.order_number = orderMatch[1];
    return { toolName: 'orders_track', params };
  }

  if (/\b(disponibilidad|horarios disponibles|cu[aá]ndo puedo agendar|cuando puedo agendar)\b/i.test(lower)) {
    const serviceMatch = trimmed.match(/(?:para|de|servicio)\s+(.+?)(?:\s+el|\s+para|\?|$)/i);
    const params: Record<string, unknown> = {};
    if (serviceMatch?.[1]) params.service_name = serviceMatch[1].trim();
    const dateMatch = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) params.date = dateMatch[1];
    if (params.service_name) return { toolName: 'bookings_search_availability', params };
  }

  if (HEALTH_CONTEXT.test(lower)) {
    const params: Record<string, unknown> = { days_back: 7 };
    const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
    if (petInMsg && !['Como', 'Cómo', 'Salud', 'Estado', 'Mi', 'Mis'].includes(petInMsg[1])) {
      params.pet_name = petInMsg[1];
    } else if (names.length > 0) {
      params.pet_name = names[names.length - 1];
    }
    return { toolName: 'pet_health_summary', params };
  }

  const standalone = resolveStandaloneRegisterIntent(trimmed);
  if (standalone) return standalone;

  const marketplaceIntent = resolveMarketplaceIntent(trimmed);
  if (marketplaceIntent) return marketplaceIntent;

  if (
    /\b(carrito|agrégalo|agregalo|añadir al carrito|añádelo|ponlo en el carrito|quiero comprarlo)\b/i.test(lower) &&
    history.length > 0
  ) {
    const recentTools = getRecentTools(history);
    if (
      recentTools.some((t) =>
        ['marketplace_search_products', 'marketplace_search_semantic'].includes(t),
      )
    ) {
      const lastAssistant = [...history].reverse().find((t) => t.role === 'assistant');
      const productMatch = lastAssistant?.content.match(/\d+\.\s+\*\*([^*]+)\*\*/);
      const qtyMatch = trimmed.match(/(\d+)\s*(?:unidades?|piezas?)?/i);
      const params: Record<string, unknown> = {
        product_name: productMatch?.[1] ?? trimmed,
        quantity: qtyMatch ? Number(qtyMatch[1]) : 1,
      };
      return { toolName: 'cart_add_item', params };
    }
  }

  if (history.length === 0) return null;
  const recentTools = getRecentTools(history);
  const topic = getConversationTopic(history);

  if (
    !wantsAllPets(lower) &&
    !/\b(registrar|registra|anota|guarda|ejercicio|comida|aliment|paseo|caminata|fetch)\b/i.test(lower) &&
    /\b(mis mascotas|mi mascota|mis perros|mis gatos)\b/i.test(lower)
  ) {
    return null;
  }

  // Multi-pet reply after assistant asked which pet (ejercicio o nutrición)
  if (isMultiPetReply(trimmed) && assistantAskedWhichPet(history)) {
    const lastTool = recentTools[0];
    if (lastTool === 'exercise_register_session' || EXERCISE_CONTEXT.test(history.slice(-4).map((t) => t.content).join(' '))) {
      const params = inferExerciseParamsFromConversation(history, trimmed);
      params.pet_name = 'todos';
      return { toolName: 'exercise_register_session', params };
    }
    if (lastTool?.startsWith('nutrition_') || NUTRITION_CONTEXT.test(history.slice(-4).map((t) => t.content).join(' '))) {
      const params = inferNutritionMealParamsFromConversation(history, trimmed);
      params.pet_name = 'todos';
      if (params.quantity_grams) {
        return { toolName: 'nutrition_register_meal', params };
      }
    }
  }

  // Registro para todas las mascotas en un solo mensaje
  if (wantsAllPets(lower)) {
    if (EXERCISE_CONTEXT.test(lower) || /\b(paseo|caminata|carrera|fetch|minutos?)\b/i.test(lower)) {
      const params = inferExerciseParamsFromConversation(history, trimmed);
      params.pet_name = 'todos';
      if (params.duration_minutes && params.exercise_type) {
        return { toolName: 'exercise_register_session', params };
      }
    }
    if (NUTRITION_CONTEXT.test(lower) || /\b(gramos?|comida|aliment)\b/i.test(lower)) {
      const params = inferNutritionMealParamsFromConversation(history, trimmed);
      params.pet_name = 'todos';
      if (params.quantity_grams) {
        return { toolName: 'nutrition_register_meal', params };
      }
    }
  }

  const wantsDetails =
    FOLLOW_UP_PATTERNS.test(trimmed) ||
    /\b(dame|quiero|mas|más)\b.*\b(detalles|info|informacion|información)\b/i.test(trimmed);
  const wantsAdopt = /\b(adoptarlo|adoptarla|quiero adoptar|proceso de adopcion|proceso de adopción)\b/i.test(lower);

  const userRecentText = history
    .slice(-6)
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();

  // Follow-up on a specific adoption pet
  const adoptionActive =
    topic !== 'health' &&
    (topic === 'adoption' || recentTools.some((t) => t.startsWith('adoption_'))) &&
    !wantsMarketplaceProducts(trimmed) &&
    !wantsMarketplaceServices(trimmed) &&
    !HEALTH_CONTEXT.test(lower) &&
    (ADOPTION_CONTEXT.test(userRecentText) || wantsAdopt);

  if (adoptionActive && (wantsDetails || wantsAdopt || (names.length > 0 && !wantsMarketplaceProducts(trimmed)) || isFollowUpMessage(trimmed))) {
    const params: Record<string, unknown> = { limit: 5 };
    const nameFromMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
    const petName = nameFromMsg?.[1] ?? names[names.length - 1];
    if (petName && !['Si', 'Sí', 'Mas', 'Más', 'Dame', 'Quiero', 'Sobre'].includes(petName)) {
      params.query = petName;
    }
    if (/\b(macho|machos|masculino)\b/i.test(lower)) params.sex = 'M';
    if (/\b(hembra|hembras|femenino)\b/i.test(lower)) params.sex = 'F';
    return { toolName: 'adoption_list_pets', params };
  }

  // Follow-up on lost pets
  const lostActive =
    topic === 'lost_pets' || recentTools.some((t) => t.startsWith('lost_pets_'));
  if (lostActive && (wantsDetails || isFollowUpMessage(trimmed))) {
    return { toolName: 'lost_pets_list', params: { limit: 10 } };
  }

  // Ejercicio tiene prioridad sobre nutrición si el mensaje actual es de actividad física
  if (
    isActiveExerciseRegisterFlow(history, trimmed) &&
    !isNutritionRegisterMessage(trimmed) &&
    !isVeterinaryRegisterMessage(trimmed)
  ) {
    const params = inferExerciseParamsFromConversation(history, trimmed);
    if (wantsAllPets(lower)) params.pet_name = 'todos';
    if (params.duration_minutes && params.exercise_type) {
      return { toolName: 'exercise_register_session', params };
    }
  }

  // Nutrition follow-ups (register meal flow)
  const nutritionActive =
    topic === 'nutrition' ||
    recentTools.some((t) => t.startsWith('nutrition_')) ||
    NUTRITION_CONTEXT.test(history.slice(-4).map((t) => t.content).join(' '));

  if (nutritionActive && !isActiveExerciseRegisterFlow(history, trimmed) && !EXERCISE_CONTEXT.test(lower)) {
    if (
      /\b(opciones|qu[eé] hay|cu[aá]les hay|disponibles|lista)\b/i.test(lower) &&
      !/\b(producto|productos|tienda|marketplace)\b/i.test(lower)
    ) {
      return { toolName: 'nutrition_list_foods', params: { limit: 12 } };
    }

    if (
      /\b(programad[oa]s?|pr[oó]xim[oa]s?|futur[oa]s?|vienen|calendario)\b/i.test(lower) &&
      /\b(comida|alimentaci[oó]n|alimento|d[ií]as?|semana)\b/i.test(lower) &&
      !/\b(historial|registr|comi[oó]|pasad)\b/i.test(lower)
    ) {
      const params: Record<string, unknown> = { days: 7, include_schedules: true };
      const daysMatch = trimmed.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days = Number(daysMatch[1]);
      const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
      if (petInMsg && !['Si', 'Sí', 'Las', 'Los', 'Quiero'].includes(petInMsg[1])) {
        params.pet_name = petInMsg[1];
      } else if (names.length > 0) {
        params.pet_name = names[names.length - 1];
      }
      return { toolName: 'nutrition_list_scheduled', params };
    }

    if (
      /\b(duplicad[oa]s?|repetid[oa]s?|eliminar duplicados)\b/i.test(lower) &&
      /\b(comida|programad|alimentaci[oó]n)\b/i.test(lower)
    ) {
      return { toolName: 'nutrition_deduplicate_scheduled', params: {} };
    }

    if (
      /\b(marcar?|marca|completar?|completa)\b/i.test(lower) &&
      /\b(comida|alimentaci[oó]n|programad)\b/i.test(lower) &&
      /\b(completad[oa]s?|hechas?|listas?|todas?)\b/i.test(lower)
    ) {
      const params: Record<string, unknown> = {};
      const contextText = [...history.map((t) => t.content), trimmed].join(' ');
      const extractedDate = extractDateFromText(contextText);
      if (extractedDate) params.date = extractedDate;
      const daysMatch = trimmed.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days = Number(daysMatch[1]);
      else if (recentTools[0] === 'nutrition_list_scheduled' || /\btodas?\b/i.test(lower)) {
        const lastList = history
          .slice()
          .reverse()
          .find((t) => t.role === 'assistant' && t.toolsUsed?.includes('nutrition_list_scheduled'));
        const daysFromList = lastList?.content.match(/pr[oó]ximos?\s*\*\*(\d+)\s*d[ií]as/i);
        params.days = daysFromList ? Number(daysFromList[1]) : 7;
      }
      if (wantsAllPets(lower)) {
        params.pet_name = 'todos';
      } else {
        const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
        if (petInMsg && !['Si', 'Sí', 'Las', 'Los', 'Todas', 'Marca'].includes(petInMsg[1])) {
          params.pet_name = petInMsg[1];
        } else if (names.length > 0) {
          params.pet_name = names[names.length - 1];
        }
      }
      return { toolName: 'nutrition_complete_scheduled', params };
    }

    if (
      /\b(historial|qu[eé] comi[oó]|registros? de comida|alimentaci[oó]n registrada)\b/i.test(lower) ||
      (/\b(últimas?|ultimas?)\s*\d+\s*(horas?|d[ií]as?)\b/i.test(lower) &&
        !/\b(programad|pr[oó]xim|futur|vienen)\b/i.test(lower))
    ) {
      const params: Record<string, unknown> = { limit: 100 };
      const hoursMatch = trimmed.match(/(\d+)\s*(?:horas?|hrs?)\b/i);
      const daysMatch = trimmed.match(/(\d+)\s*d[ií]as?\b/i);
      if (hoursMatch) params.hours = Number(hoursMatch[1]);
      else if (daysMatch) params.hours = Number(daysMatch[1]) * 24;
      else if (/\b72\s*horas?\b/i.test(lower)) params.hours = 72;
      else if (/\b24\s*horas?\b/i.test(lower)) params.hours = 24;
      return { toolName: 'nutrition_list_recent', params };
    }

    const wantsSchedule =
      /\b(horario|recurrente|autom[aá]tic[oa]s?|programar|cada d[ií]a|todos los d[ií]as)\b/i.test(lower) ||
      /\b(crear|configurar|establecer)\s+(un\s+)?horario\b/i.test(lower);

    if (wantsSchedule) {
      const params: Record<string, unknown> = {};
      const contextText = [...history.map((t) => t.content), trimmed].join(' ');
      const times = extractTimesFromText(contextText);
      if (times.length) params.times = times;

      const gramsMatch = contextText.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i);
      if (gramsMatch) params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));

      if (wantsAllPets(lower)) {
        params.pet_name = 'todos';
      } else {
        const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
        if (petInMsg && !['Si', 'Sí', 'Gramos', 'Hills', 'Whiskas'].includes(petInMsg[1])) {
          params.pet_name = petInMsg[1];
        } else {
          const inferred = inferPetNameParam(trimmed, history);
          if (inferred) params.pet_name = inferred;
        }
      }

      const foodLine = trimmed.match(/^\d+\.\s+(.+)$/);
      if (foodLine) params.food_name = foodLine[1].replace(/\s*-\s*\d+(\.\d+)?\s*GTQ.*$/i, '').trim();

      return { toolName: 'nutrition_create_schedule', params };
    }

    const params: Record<string, unknown> = {};
    const gramsMatch = isNutritionRegisterMessage(trimmed)
      ? [...history.map((t) => t.content), trimmed]
          .join(' ')
          .match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i)
      : trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i);
    if (gramsMatch) params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));
    if (wantsAllPets(lower)) {
      params.pet_name = 'todos';
    } else {
      const petInMsg = trimmed.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/);
      if (petInMsg && !['Si', 'Sí', 'Gramos', 'Hills', 'Whiskas'].includes(petInMsg[1])) {
        params.pet_name = petInMsg[1];
      } else {
        const inferred = inferPetNameParam(trimmed, history);
        if (inferred) params.pet_name = inferred;
      }
    }

    const foodLine = trimmed.match(/^\d+\.\s+(.+)$/);
    if (foodLine) params.food_name = foodLine[1].replace(/\s*-\s*\d+(\.\d+)?\s*GTQ.*$/i, '').trim();
    else if (trimmed.length > 2 && !gramsMatch && !/\b(opciones|qu[eé] hay)\b/i.test(lower)) {
      params.food_name = trimmed;
    }

    if (params.quantity_grams && isNutritionRegisterMessage(trimmed)) {
      return { toolName: 'nutrition_register_meal', params };
    }
  }

  // Nutrición explícita — incluso si el último registro fue ejercicio
  if (isActiveNutritionRegisterFlow(history, trimmed)) {
    const params = inferNutritionMealParamsFromConversation(history, trimmed);
    if (wantsAllPets(lower)) params.pet_name = 'todos';
    return { toolName: 'nutrition_register_meal', params };
  }

  // Visita veterinaria explícita
  if (isActiveVeterinaryRegisterFlow(history, trimmed)) {
    const params = inferVeterinaryVisitParamsFromConversation(history, trimmed);
    const petName = inferPetNameParam(trimmed, history);
    if (petName) params.pet_name = petName;
    else if (wantsAllPets(lower) && (ctx?.userPetNames?.length ?? 0) <= 1) {
      params.pet_name = 'todos';
    }
    return { toolName: 'veterinary_register_visit', params };
  }

  const exerciseActive =
    isActiveExerciseRegisterFlow(history, trimmed) ||
    (topic === 'exercise' &&
      EXERCISE_CONTEXT.test(lower) &&
      !isNutritionRegisterMessage(trimmed) &&
      !isVeterinaryRegisterMessage(trimmed));

  if (
    exerciseActive &&
    !isNutritionRegisterMessage(trimmed) &&
    !isVeterinaryRegisterMessage(trimmed)
  ) {
    const params = inferExerciseParamsFromConversation(history, trimmed);
    const petFollowUp = isMultiPetReply(trimmed) || Boolean(params.pet_name);
    const hasCore = params.duration_minutes && params.exercise_type;

    if (hasCore && (petFollowUp || wantsAllPets(lower) || isActiveExerciseRegisterFlow(history, trimmed))) {
      if (wantsAllPets(lower) || isMultiPetReply(trimmed)) params.pet_name = 'todos';
      return { toolName: 'exercise_register_session', params };
    }

    if (/\b(historial|sesiones|actividades registradas)\b/i.test(lower)) {
      return { toolName: 'exercise_list_recent', params: { limit: 5 } };
    }
  }

  // Reuse last tool for generic follow-ups (not when switching register topic)
  if (
    isFollowUpMessage(trimmed) &&
    recentTools.length > 0 &&
    !isNutritionRegisterMessage(trimmed) &&
    !isVeterinaryRegisterMessage(trimmed) &&
    !isExerciseRegisterMessage(trimmed)
  ) {
    const marketplaceFollowUp = resolveMarketplaceIntent(trimmed);
    if (marketplaceFollowUp) return marketplaceFollowUp;

    const toolName = recentTools[0];
    const params: Record<string, unknown> = {};

    if (toolName === 'exercise_register_session') {
      Object.assign(params, inferExerciseParamsFromConversation(history, trimmed));
    } else if (toolName === 'nutrition_register_meal') {
      Object.assign(params, inferNutritionMealParamsFromConversation(history, trimmed));
    } else if (toolName === 'nutrition_create_schedule') {
      Object.assign(params, inferNutritionScheduleParamsFromConversation(history, trimmed));
    }

    const petName = inferPetNameParam(trimmed, history);
    if (petName) params.pet_name = petName;

    return { toolName, params };
  }

  return null;
}

export function buildContextSummary(history: ConversationTurn[]): string {
  const topic = getConversationTopic(history);
  const names = extractMentionedNames(history);
  const parts: string[] = [];
  if (topic) parts.push(`Tema activo: ${topic}`);
  if (names.length) parts.push(`Mascotas mencionadas: ${names.join(', ')}`);
  const lastTools = getRecentTools(history);
  if (lastTools.length) parts.push(`Últimas herramientas usadas: ${lastTools.join(', ')}`);
  return parts.join(' | ');
}
