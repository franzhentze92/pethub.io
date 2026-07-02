import type { AiToolDefinition, ConversationTurn } from './types';
import { extractMentionedNames, getRecentTools } from './conversationContext';
import { extractDateFromText, extractTimesFromText } from './helpers/nutritionSchedule';
import { inferPetNameParam, inferUserPetNameFromMessage } from './helpers/inferPetParam';
import { inferMarketplaceListParams } from './helpers/marketplaceSearch';
import { inferAppointmentTypeFromText } from '@/lib/veterinaryTypes';
import { matchVaccineSlugFromText } from '@/lib/vaccinationCatalog';

const ADOPTION_CONTEXT =
  /\b(adopcion|adopción|adoptar|albergue|refugio|disponible para adopcion|en adopcion)\b/i;

/** Extract search terms from natural language (strip common question words) */
export function extractSearchQuery(message: string): string | undefined {
  const cleaned = message
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, '')
    .replace(
      /\b(hay|existe|tienen|tiene|cuanto|cuánto|cuesta|vale|precio|buscar|busco|quiero|necesito|algun|algún|alguna|el|la|los|las|un|una|de|en|para|con|que|qué|como|cómo|donde|dónde|me|te|se|mi|mis|tu|tus|este|esta|producto|productos|servicio|servicios)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length >= 2 ? cleaned : undefined;
}

/** Score tools by keyword overlap with user message and recent conversation */
export function rankTools(
  message: string,
  tools: AiToolDefinition[],
  history: ConversationTurn[] = [],
  userPetNames?: string[],
): { tool: AiToolDefinition; score: number }[] {
  const normalized = message.toLowerCase();
  const contextText = history
    .slice(-4)
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();
  const recentTools = getRecentTools(history);

  return tools
    .map((tool) => {
      let score = 0;
      for (const kw of tool.keywords) {
        if (normalized.includes(kw.toLowerCase())) {
          score += kw.split(' ').length > 1 ? 3 : 1;
        }
        if (contextText.includes(kw.toLowerCase())) {
          score += 1;
        }
      }
      const suffix = tool.name.includes('_') ? tool.name.split('_').slice(1).join(' ') : '';
      if (suffix && normalized.includes(suffix.replace(/_/g, ' '))) {
        score += 2;
      }
      if (recentTools.includes(tool.name)) {
        score += 4;
      }
      if (
        tool.name === 'pet_health_summary' &&
        inferPetNameParam(message, history, userPetNames) &&
        /\b(salud|bienestar|c[oó]mo est[aá]|como esta|estado de salud|resumen de salud|c[oó]mo va)\b/i.test(
          contextText,
        )
      ) {
        score += 32;
      }
      if (
        (normalized.includes('mis mascotas') || normalized.includes('mi mascota')) &&
        tool.name === 'pets_list_mine'
      ) {
        score += 12;
      }
      if (
        tool.name === 'pets_list_mine' &&
        (/\b(salud|bienestar|c[oó]mo est[aá]|como esta)\b/i.test(normalized) ||
          /\b(salud|bienestar|c[oó]mo est[aá]|como esta)\b/i.test(contextText))
      ) {
        score -= 40;
      }
      if (
        tool.name === 'pets_list_mine' &&
        /^(sasha|shaggy|atis|max|luna|rocky|bella|coco|toby)$/i.test(normalized.trim())
      ) {
        score -= 35;
      }
      if (
        (/\b(registrar|registra|anota|guarda|guardar)\b/.test(normalized) &&
          /\b(ejercicio|actividad|paseo|caminata|caminar)\b/.test(normalized)) ||
        (/\b(historial|sesiones)\b/.test(normalized) && /\b(ejercicio|actividad)\b/.test(normalized)) ||
        (/\b(caminata|caminar|paseo|carrera)\b/.test(normalized) && /\bminutos?\b/.test(normalized))
      ) {
        if (tool.name === 'exercise_register_session') score += 18;
        if (tool.name === 'exercise_list_recent') score += 12;
        if (tool.name === 'nutrition_register_meal') score -= 16;
      }
      if (
        (/\b(horario|recurrente|autom[aá]tic[oa]s?|programar)\b/.test(normalized) &&
          /\b(comida|alimentaci[oó]n|alimento|nutrici[oó]n|desayuno|cena|comer)\b/.test(normalized)) ||
        (/\b(crear|configurar|establecer)\b/.test(normalized) && /\bhorario\b/.test(normalized))
      ) {
        if (tool.name === 'nutrition_create_schedule') score += 18;
        if (tool.name === 'nutrition_register_meal') score -= 4;
      }
      if (
        /\b(programad[oa]s?|pr[oó]xim[oa]s?|futur[oa]s?|vienen|calendario)\b/.test(normalized) &&
        /\b(comida|alimentaci[oó]n|alimento|nutrici[oó]n|d[ií]as?|semana)\b/.test(normalized) &&
        !/\b(historial|registr|comi[oó]|pasad)\b/.test(normalized)
      ) {
        if (tool.name === 'nutrition_list_scheduled') score += 22;
        if (tool.name === 'nutrition_list_recent') score -= 12;
      }
      if (
        /\b(duplicad[oa]s?|repetid[oa]s?|eliminar duplicados|quitar duplicados)\b/.test(normalized) &&
        /\b(comida|alimentaci[oó]n|programad)\b/.test(normalized)
      ) {
        if (tool.name === 'nutrition_deduplicate_scheduled') score += 20;
      }
      if (
        /\b(marcar?|marca|completar?|completa)\b/.test(normalized) &&
        /\b(comida|alimentaci[oó]n|programad)\b/.test(normalized) &&
        /\b(completad[oa]s?|hechas?|listas?|todas?)\b/.test(normalized)
      ) {
        if (tool.name === 'nutrition_complete_scheduled') score += 26;
        if (tool.name === 'nutrition_register_meal') score -= 14;
        if (tool.name === 'nutrition_list_scheduled') score -= 8;
      }
      if (
        (/\b(historial|comidas|qu[eé] comi[oó]|registros)\b/.test(normalized) &&
          /\b(nutrici[oó]n|alimentaci[oó]n|alimento|comida)\b/.test(normalized)) ||
        /\b(últimas?|ultimas?)\s*\d+\s*(horas?|d[ií]as?)\b/.test(normalized)
      ) {
        if (tool.name === 'nutrition_list_recent') score += 18;
        if (tool.name === 'nutrition_list_scheduled') score -= 10;
      }
      if (
        (/\b(registrar|registra|anota|guarda|guardar|aliment[eé]|comi[oó]|di de comer)\b/.test(normalized) &&
          /\b(comida|alimentaci[oó]n|alimento|nutrici[oó]n|merienda|desayuno|cena)\b/.test(normalized)) ||
        (/\b(historial|comidas)\b/.test(normalized) && /\b(nutrici[oó]n|alimentaci[oó]n)\b/.test(normalized))
      ) {
        if (tool.name === 'nutrition_register_meal') score += 14;
        if (tool.name === 'nutrition_list_recent') score += 12;
        if (tool.name === 'nutrition_list_foods') score += 16;
      }
      if (
        /\b(opciones|qu[eé] hay|cu[aá]les hay)\b/i.test(normalized) &&
        /\b(alimento|comida|alimentaci[oó]n|nutrici[oó]n)\b/i.test(normalized) &&
        !/\b(comprar|compra|tienda)\b/i.test(normalized)
      ) {
        if (tool.name === 'nutrition_list_foods') score += 18;
        if (tool.name === 'marketplace_search_products') score -= 10;
      }
      if (
        /\b(comprar|compra|tienda|marketplace|concentrado|croquetas)\b/.test(normalized) ||
        (/\b(producto|productos|precio|cuesta|vale)\b/.test(normalized) &&
          !/\b(registrar|historial|adopci[oó]n|adoptar)\b/.test(normalized))
      ) {
        if (tool.name === 'marketplace_search_products') score += 16;
        if (tool.name === 'adoption_list_pets') score -= 20;
        if (tool.name === 'nutrition_list_foods') score -= 8;
      }
      if (
        /\b(lista|listado|todos|todas|dame|mu[eé]strame|catalogo|catálogo)\b/i.test(normalized) &&
        /\bproducto/i.test(normalized)
      ) {
        if (tool.name === 'marketplace_search_products') score += 25;
        if (tool.name === 'adoption_list_pets') score -= 25;
      }
      if (
        /\b(lista|listado|todos|todas|dame|mu[eé]strame|catalogo|catálogo)\b/i.test(normalized) &&
        /\bservicio/i.test(normalized)
      ) {
        if (tool.name === 'marketplace_search_services') score += 25;
        if (tool.name === 'adoption_list_pets') score -= 20;
      }
      if (/\bproducto|productos\b/i.test(normalized) && tool.name === 'adoption_list_pets') {
        score -= 15;
      }
      if (/\b(machos?|hembras?|masculino|femenino)\b/.test(normalized) && tool.name === 'adoption_list_pets') {
        score += 6;
      }
      if (
        /\b(veterinari|vet\b|vacuna|vacunaci[oó]n|diagn[oó]stico|historial m[eé]dico|visita m[eé]dica|gasto veterinario|cu[aá]nto gast[eé])\b/i.test(
          normalized,
        )
      ) {
        if (tool.name === 'veterinary_vaccination_status') score += 20;
        if (tool.name === 'veterinary_vaccination_schedule') score += 24;
        if (tool.name === 'veterinary_get_session') score += 16;
        if (tool.name === 'veterinary_list_sessions') score += 14;
        if (tool.name === 'veterinary_spending_summary') score += 18;
        if (tool.name === 'veterinary_analyze_document') score += 24;
        if (tool.name === 'marketplace_search_services') score -= 6;
        if (tool.name === 'adoption_list_pets') score -= 25;
      }
      if (
        /\b(salud|bienestar|c[oó]mo est[aá]|como esta|estado de salud|estado general|an[aá]lisis de salud|resumen de salud|chequeo|revisi[oó]n general|salud integral|cuidado integral|recomendaciones|c[oó]mo va)\b/i.test(
          normalized,
        )
      ) {
        if (tool.name === 'pet_health_summary') score += 30;
        if (tool.name === 'adoption_list_pets') score -= 30;
        if (tool.name === 'adoption_count_available') score -= 25;
      }
      if (
        /\b(l[ií]nea de tiempo|linea de tiempo|cronolog[ií]a|cronologia|qu[eé] pas[oó]|qu[eé] ha pasado|eventos recientes|actividad reciente|historial completo|últimos eventos|ultimos eventos)\b/i.test(
          normalized,
        )
      ) {
        if (tool.name === 'pet_timeline') score += 32;
        if (tool.name === 'pet_health_summary') score -= 8;
        if (tool.name === 'adoption_list_pets') score -= 25;
      }
      if (
        /\b(insights|patrones|alertas|correlaci[oó]n|correlacion|recomendaciones inteligentes|qu[eé] deber[ií]a revisar|que deberia revisar|algo que deba saber|advertencias)\b/i.test(
          normalized,
        )
      ) {
        if (tool.name === 'pet_insights') score += 34;
        if (tool.name === 'pet_health_summary') score += 5;
        if (tool.name === 'adoption_list_pets') score -= 25;
      }
      if (
        /\b(comparar|comparaci[oó]n|comparacion|cu[aá]l est[aá] mejor|cual esta mejor|diferencias entre|qui[eé]n tiene m[aá]s|quien tiene mas|entre mis mascotas)\b/i.test(
          normalized,
        )
      ) {
        const singlePetNutrient =
          /\b(prote[ií]na|grasa|grasas|dieta|macro|vitamina|vitaminas|mineral|minerales|fibra|calcio|zinc|omega|calor[ií]a)\b/i.test(
            normalized,
          ) &&
          (/\b(ideal|objetivo|suficiente|recomendad[oa]|comparaci[oó]n)\b/i.test(normalized) ||
            Boolean(inferUserPetNameFromMessage(message, userPetNames)));
        if (singlePetNutrient) {
          if (tool.name === 'nutrition_analyze_diet') score += 42;
          if (tool.name === 'pets_compare') score -= 28;
        } else {
          if (tool.name === 'pets_compare') score += 36;
          if (tool.name === 'pet_health_summary') score -= 5;
        }
      }
      if (
        (/\b(registrar|registra|anota|guarda|fui al|llev[eé] al)\b/i.test(normalized) &&
          /\b(veterinari|vet\b|vacuna|visita m[eé]dica|consulta)\b/i.test(normalized)) ||
        (/\b(registrar|registra)\b/i.test(normalized) && /\b(vacuna|vacunaci[oó]n)\b/i.test(normalized))
      ) {
        if (tool.name === 'veterinary_register_visit') score += 22;
        if (tool.name === 'veterinary_register_vaccination') score += 24;
        if (tool.name === 'veterinary_list_sessions') score -= 8;
      }
      if (
        /\b(le pusieron|aplicaron|pusieron)\b/i.test(normalized) &&
        /\b(vacuna|antirr[aá]bica|quintuple|triple|dhpp|fvrcp)\b/i.test(normalized)
      ) {
        if (tool.name === 'veterinary_register_vaccination') score += 28;
        if (tool.name === 'veterinary_register_visit') score += 8;
      }
      if (
        /\b(seguimiento|recordatorio|pr[oó]xima vacuna|fecha de control|programar seguimiento)\b/i.test(
          normalized,
        ) &&
        /\b(veterinari|vet\b|vacuna)\b/i.test(normalized)
      ) {
        if (tool.name === 'veterinary_set_follow_up') score += 22;
      }
      if (
        /\b(recordatorio|recordatorios|recu[eé]rdame|medicamento|agendar)\b/i.test(normalized)
      ) {
        if (tool.name === 'reminders_create') score += 20;
        if (tool.name === 'reminders_list_mine') score += 14;
        if (tool.name === 'reminders_complete') score += 16;
        if (tool.name === 'reminders_update') score += 18;
      }
      if (
        ((/\b(crear|agregar|registrar|nueva)\b/i.test(normalized) &&
          /\b(mascota|perro|gato)\b/i.test(normalized)) ||
          (/\b(editar|actualizar|modificar)\b/i.test(normalized) &&
            /\b(mascota|perro|gato|raza|peso)\b/i.test(normalized)))
      ) {
        if (tool.name === 'pets_create') score += 20;
        if (tool.name === 'pets_update') score += 18;
      }
      if (
        /\b(adoptar|adopción|adopcion|solicitud de adopción)\b/i.test(normalized)
      ) {
        if (tool.name === 'adoption_apply') score += 22;
        if (tool.name === 'adoption_list_pets') score += 10;
      }
      if (
        /\b(perdida|perdido|extraviad|desapareci|reportar)\b/i.test(normalized) &&
        /\b(mascota|perro|gato)\b/i.test(normalized)
      ) {
        if (tool.name === 'lost_pets_report') score += 22;
        if (tool.name === 'lost_pets_mark_found') score += 18;
        if (tool.name === 'lost_pets_list') score -= 6;
      }
      if (/\b(pareja|cruza|reproducci[oó]n|emparejar)\b/i.test(normalized)) {
        if (tool.name === 'breeding_send_request') score += 20;
        if (tool.name === 'breeding_enable_pet') score += 18;
        if (tool.name === 'breeding_list_available') score += 14;
      }
      if (/\b(perfil|tel[eé]fono|direcci[oó]n personal|mis datos)\b/i.test(normalized)) {
        if (tool.name === 'profile_update') score += 18;
        if (tool.name === 'profile_get_mine') score += 14;
      }
      if (/\b(favorito|favoritos|guardar producto|guardar servicio)\b/i.test(normalized)) {
        if (tool.name === 'marketplace_add_favorite') score += 18;
      }
      return { tool, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function inferToolParams(
  toolName: string,
  message: string,
  history: ConversationTurn[] = [],
  userPetNames?: string[],
): Record<string, unknown> {
  const q = extractSearchQuery(message);
  const normalized = message.toLowerCase();
  const names = extractMentionedNames(history, message);

  switch (toolName) {
    case 'marketplace_search_products': {
      return inferMarketplaceListParams(message, 'products');
    }
    case 'marketplace_search_services': {
      return inferMarketplaceListParams(message, 'services');
    }
    case 'adoption_list_pets': {
      const params: Record<string, unknown> = { limit: 12 };
      if (normalized.match(/\b(perro|perros|dog)\b/)) params.species = 'Perro';
      if (normalized.match(/\b(gato|gatos|cat)\b/)) params.species = 'Gato';
      if (normalized.match(/\b(macho|machos|masculino)\b/)) params.sex = 'M';
      if (normalized.match(/\b(hembra|hembras|femenino)\b/)) params.sex = 'F';
      const adoptionContext =
        /\b(adoptar|adopción|adopcion|albergue|refugio|en adopcion|en adopción)\b/i.test(message) ||
        history.some((t) => ADOPTION_CONTEXT.test(t.content));
      if (q && !params.species && !params.sex && adoptionContext) params.query = q;
      const breedMatch = message.match(/raza\s+([a-záéíóúñ\s]+)/i);
      if (breedMatch) params.breed = breedMatch[1].trim();
      if (adoptionContext) {
        const petName = names[names.length - 1];
        if (petName && !params.query) params.query = petName;
      }
      return params;
    }
    case 'adoption_count_available': {
      const params: Record<string, unknown> = {};
      if (normalized.match(/\b(perro|perros)\b/)) params.species = 'Perro';
      if (normalized.match(/\b(gato|gatos)\b/)) params.species = 'Gato';
      return params;
    }
    case 'lost_pets_list': {
      const params: Record<string, unknown> = { limit: 10 };
      if (q) params.query = q;
      const locMatch = message.match(/(?:en|zona|ciudad)\s+([a-záéíóúñ\s]+)/i);
      if (locMatch) params.location = locMatch[1].trim();
      return params;
    }
    case 'shelters_list':
      return { query: q, limit: 8 };
    case 'exercise_register_session': {
      const params: Record<string, unknown> = { intensity: 'medium' };
      const durationMatch = message.match(/(\d+)\s*(?:min|minutos?)/i);
      if (durationMatch) params.duration_minutes = Number(durationMatch[1]);
      if (/\b(caminata|caminar|paseo|walk)\b/i.test(message)) params.exercise_type = 'walk';
      else if (/\b(carrera|correr|run)\b/i.test(message)) params.exercise_type = 'run';
      else if (/\b(juego|play)\b/i.test(message)) params.exercise_type = 'play';
      else if (/\b(nataci[oó]n|swim)\b/i.test(message)) params.exercise_type = 'swimming';
      else if (/\b(fetch|pelota)\b/i.test(message)) params.exercise_type = 'fetch';
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'exercise_list_recent':
      return { limit: 5 };
    case 'nutrition_register_meal': {
      const params: Record<string, unknown> = {};
      const gramsMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)/i);
      if (gramsMatch) params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));
      if (/\b(desayuno|breakfast)\b/i.test(message)) params.meal_type = 'breakfast';
      else if (/\b(almuerzo|lunch)\b/i.test(message)) params.meal_type = 'lunch';
      else if (/\b(cena|dinner)\b/i.test(message)) params.meal_type = 'dinner';
      else if (/\b(merienda|snack)\b/i.test(message)) params.meal_type = 'snack';
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'nutrition_create_schedule': {
      const params: Record<string, unknown> = {};
      const contextText = [...history.map((t) => t.content), message].join(' ');
      const times = extractTimesFromText(contextText);
      if (times.length) params.times = times;
      const gramsMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)/i);
      if (gramsMatch) params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'nutrition_list_foods':
      return { limit: 12 };
    case 'nutrition_list_scheduled': {
      const params: Record<string, unknown> = { days: 7, include_schedules: true };
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days = Number(daysMatch[1]);
      else if (/\bsemana\b/i.test(message)) params.days = 7;
      const petName = names[names.length - 1];
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'nutrition_deduplicate_scheduled': {
      const params: Record<string, unknown> = {};
      const petName = names[names.length - 1];
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'nutrition_complete_scheduled': {
      const params: Record<string, unknown> = {};
      const contextText = [...history.map((t) => t.content), message].join(' ');
      const extractedDate = extractDateFromText(contextText);
      if (extractedDate) params.date = extractedDate;
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days = Number(daysMatch[1]);
      else if (/\btodas?\b/i.test(message) && !extractedDate) params.days = 7;
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'nutrition_list_recent': {
      const params: Record<string, unknown> = { limit: 100 };
      const hoursMatch = message.match(/(\d+)\s*(?:horas?|hrs?)\b/i);
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (hoursMatch) params.hours = Number(hoursMatch[1]);
      else if (daysMatch) params.hours = Number(daysMatch[1]) * 24;
      else if (/\b72\s*horas?\b|últimas?\s*72|ultimas?\s*72/i.test(message)) params.hours = 72;
      else if (/\b24\s*horas?\b|últimas?\s*24|ultimas?\s*24|hoy\b/i.test(message)) params.hours = 24;
      else if (/\bsemana\b|7\s*d[ií]as/i.test(message)) params.hours = 168;
      const petName = names[names.length - 1];
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'veterinary_list_sessions': {
      const params: Record<string, unknown> = { limit: 10 };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      if (/\b(vacuna|vacunaci[oó]n)\b/i.test(message)) params.appointment_type = 'vacunacion';
      else if (/\b(emergencia)\b/i.test(message)) params.appointment_type = 'emergencia';
      else if (/\b(cirug[ií]a)\b/i.test(message)) params.appointment_type = 'cirugia';
      const daysMatch = message.match(/(\d+)\s*(?:d[ií]as?|meses?)\b/i);
      if (daysMatch) {
        const n = Number(daysMatch[1]);
        params.days_back = /\bmes/i.test(message) ? n * 30 : n;
      } else if (/\b(año|ano|12 meses)\b/i.test(message)) {
        params.days_back = 365;
      }
      return params;
    }
    case 'veterinary_get_session': {
      const params: Record<string, unknown> = { most_recent: true };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'veterinary_vaccination_status': {
      const params: Record<string, unknown> = {};
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'veterinary_vaccination_schedule': {
      const params: Record<string, unknown> = {};
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'veterinary_spending_summary': {
      const params: Record<string, unknown> = { months: 12 };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const monthsMatch = message.match(/(\d+)\s*mes(?:es)?\b/i);
      if (monthsMatch) params.months = Number(monthsMatch[1]);
      return params;
    }
    case 'veterinary_register_visit': {
      const params: Record<string, unknown> = {
        appointment_type: inferAppointmentTypeFromText(message),
      };
      if (/\bayer\b/i.test(message)) params.date = 'ayer';
      else if (/\bhoy\b/i.test(message)) params.date = 'hoy';
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const costMatch = message.match(/(?:q\.?|quetzales?)\s*(\d+(?:[.,]\d+)?)/i) ?? message.match(/(\d+(?:[.,]\d+)?)\s*(?:q\.?|quetzales?)/i);
      if (costMatch) params.cost = Number(costMatch[1].replace(',', '.'));
      const vetMatch = message.match(/(?:dr\.?|doctora?|veterinari[oa])\s+([a-záéíóúñ\s]+)/i);
      if (vetMatch) params.veterinarian_name = vetMatch[1].trim();
      const diagnosisMatch = message.match(/(?:diagn[oó]stico|le pusieron|vacuna)\s*[:\-]?\s*(.+)$/i);
      if (diagnosisMatch) params.diagnosis = diagnosisMatch[1].trim().slice(0, 200);
      params.vaccine_slug = matchVaccineSlugFromText(message);
      const followUpMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
      if (followUpMatch) params.follow_up_date = followUpMatch[1];
      return params;
    }
    case 'veterinary_register_vaccination': {
      const params: Record<string, unknown> = {};
      if (/\bayer\b/i.test(message)) params.date = 'ayer';
      else if (/\bhoy\b/i.test(message)) params.date = 'hoy';
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      params.vaccine_slug = matchVaccineSlugFromText(message);
      const vetMatch = message.match(/(?:dr\.?|doctora?|veterinari[oa])\s+([a-záéíóúñ\s]+)/i);
      if (vetMatch) params.veterinarian_name = vetMatch[1].trim();
      const vaccineMatch = message.match(/(?:vacuna|le pusieron|aplicaron)\s+(.+?)(?:\s+con\b|\s+en\b|$)/i);
      if (vaccineMatch) params.vaccine_name = vaccineMatch[1].trim().slice(0, 120);
      const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) params.next_due_date = dateMatch[1];
      return params;
    }
    case 'veterinary_set_follow_up': {
      const params: Record<string, unknown> = { use_latest_visit: true };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) params.follow_up_date = dateMatch[1];
      return params;
    }
    case 'veterinary_analyze_document': {
      const params: Record<string, unknown> = { document_type: 'lab_results' };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      if (/\bfactura\b/i.test(message)) params.document_type = 'invoice';
      if (/\b(reanaliza|vuelve a analizar|reintentar)\b/i.test(message)) params.reparse = true;
      return params;
    }
    case 'pet_health_summary': {
      const params: Record<string, unknown> = { days_back: 7 };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days_back = Number(daysMatch[1]);
      return params;
    }
    case 'pet_timeline': {
      const params: Record<string, unknown> = { days_back: 30 };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days_back = Number(daysMatch[1]);
      const limitMatch = message.match(/(\d+)\s*eventos?\b/i);
      if (limitMatch) params.limit = Number(limitMatch[1]);
      return params;
    }
    case 'pet_insights': {
      const params: Record<string, unknown> = { days_back: 30 };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      const daysMatch = message.match(/(\d+)\s*d[ií]as?\b/i);
      if (daysMatch) params.days_back = Number(daysMatch[1]);
      return params;
    }
    case 'pets_compare': {
      const params: Record<string, unknown> = { pet_name: 'todos' };
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'memory_list_facts': {
      const params: Record<string, unknown> = {};
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      return params;
    }
    case 'memory_save_fact': {
      const params: Record<string, unknown> = {};
      const rememberMatch = message.match(
        /\b(recuerda|recuerdas|no olvides|guarda que|anota que|memoriza)\b[:\s]+(.+)/i,
      );
      if (rememberMatch?.[2]) params.fact_text = rememberMatch[2].trim().replace(/[.!?]+$/, '');
      const petName = inferPetNameParam(message, history, userPetNames);
      if (petName) params.pet_name = petName;
      if (/\b(al[eé]rgi|alergia)\b/i.test(message)) params.category = 'allergy';
      return params;
    }
    case 'memory_delete_fact': {
      const params: Record<string, unknown> = {};
      const forgetMatch = message.match(/\b(olvida que|borra el recuerdo de|elimina)\b[:\s]+(.+)/i);
      if (forgetMatch?.[2]) params.fact_text = forgetMatch[2].trim();
      return params;
    }
    default:
      return {};
  }
}
