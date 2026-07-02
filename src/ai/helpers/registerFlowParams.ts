import type { ConversationTurn } from '../types';
import { extractTimesFromText } from './nutritionSchedule';
import { inferPetNameParam } from './inferPetParam';
import { wantsAllPets } from './petResolver';
import { isNutritionQueryMessage } from './nutritionQuery';
import { inferAppointmentTypeFromText } from '@/lib/veterinaryTypes';

function conversationText(history: ConversationTurn[], message: string): string {
  return [...history.map((t) => t.content), message].join('\n');
}

export function assistantAskedWhichPet(history: ConversationTurn[]): boolean {
  return history.slice(-3).some((t) =>
    /¿Para cuál mascota/i.test(t.content) ||
    /¿De cuál mascota/i.test(t.content) ||
    /Di "todos" para registrar/i.test(t.content) ||
    (/Tienes:/i.test(t.content) && /mascota/i.test(t.content)),
  );
}

export function inferExerciseParamsFromConversation(
  history: ConversationTurn[],
  message: string,
): Record<string, unknown> {
  const contextText = conversationText(history, message);
  const params: Record<string, unknown> = { intensity: 'medium' };

  const durationMatch = contextText.match(/(\d+)\s*(?:min|minutos?)/i);
  if (durationMatch) {
    params.duration_minutes = Number(durationMatch[1]);
  } else {
    const soloMinutes = message.trim().match(/^(\d{1,3})$/);
    if (soloMinutes && assistantAskedForExerciseDuration(history)) {
      params.duration_minutes = Number(soloMinutes[1]);
    }
  }

  if (/\b(fetch|pelota|jugar)\b/i.test(contextText)) params.exercise_type = 'fetch';
  else if (/\b(caminata|caminar|paseo|walk)\b/i.test(contextText)) params.exercise_type = 'walk';
  else if (/\b(carrera|correr|run)\b/i.test(contextText)) params.exercise_type = 'run';
  else if (/\b(juego|play)\b/i.test(contextText)) params.exercise_type = 'play';
  else if (/\b(nataci[oó]n|swim)\b/i.test(contextText)) params.exercise_type = 'swimming';
  else if (/\b(entrenamiento|training)\b/i.test(contextText)) params.exercise_type = 'training';
  else if (/\b(senderismo|hiking)\b/i.test(contextText)) params.exercise_type = 'hiking';

  const petName = inferPetNameParam(message, history) ?? inferPetNameParam(contextText, history);
  if (petName) params.pet_name = petName;
  else if (wantsAllPets(contextText) || wantsAllPets(message)) params.pet_name = 'todos';

  const dateMatch = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dateMatch) params.date = dateMatch[1];

  return params;
}

export function inferNutritionMealParamsFromConversation(
  history: ConversationTurn[],
  message: string,
): Record<string, unknown> {
  const contextText = conversationText(history, message);
  const params: Record<string, unknown> = {};

  const gramsMatch =
    message.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i) ??
    (/\b(comida|alimentaci[oó]n|alimento|desayuno|cena|merienda|nutrici[oó]n)\b/i.test(message)
      ? contextText.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i)
      : null);
  if (gramsMatch) {
    params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));
  } else {
    const soloGrams = message.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)?$/i);
    if (soloGrams && assistantAskedForNutritionData(history)) {
      params.quantity_grams = Number(soloGrams[1].replace(',', '.'));
    }
  }

  if (/\b(desayuno|breakfast)\b/i.test(contextText)) params.meal_type = 'breakfast';
  else if (/\b(almuerzo|lunch)\b/i.test(contextText)) params.meal_type = 'lunch';
  else if (/\b(cena|dinner)\b/i.test(contextText)) params.meal_type = 'dinner';
  else if (/\b(merienda|snack)\b/i.test(contextText)) params.meal_type = 'snack';

  const petName = inferPetNameParam(message, history) ?? inferPetNameParam(contextText, history);
  if (petName) params.pet_name = petName;
  else if (wantsAllPets(contextText) || wantsAllPets(message)) params.pet_name = 'todos';

  const foodLine = message.match(/^\d+\.\s+(.+)$/);
  if (foodLine) {
    params.food_name = foodLine[1].replace(/\s*-\s*\d+(\.\d+)?\s*GTQ.*$/i, '').trim();
  }

  return params;
}

export function inferNutritionScheduleParamsFromConversation(
  history: ConversationTurn[],
  message: string,
): Record<string, unknown> {
  const contextText = conversationText(history, message);
  const params: Record<string, unknown> = {};

  const times = extractTimesFromText(contextText);
  if (times.length) params.times = times;

  const gramsMatch = contextText.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos?)\b/i);
  if (gramsMatch) params.quantity_grams = Number(gramsMatch[1].replace(',', '.'));

  const petName = inferPetNameParam(message, history) ?? inferPetNameParam(contextText, history);
  if (petName) params.pet_name = petName;

  return params;
}

export function inferVeterinaryVisitParamsFromConversation(
  history: ConversationTurn[],
  message: string,
): Record<string, unknown> {
  const contextText = conversationText(history, message);
  const params: Record<string, unknown> = {
    appointment_type: inferAppointmentTypeFromText(contextText),
  };

  if (/\bayer\b/i.test(contextText)) params.date = 'ayer';
  else if (/\bhoy\b/i.test(contextText)) params.date = 'hoy';

  const petName = inferPetNameParam(message, history) ?? inferPetNameParam(contextText, history);
  if (petName) params.pet_name = petName;

  const costMatch =
    contextText.match(/(?:q\.?|quetzales?)\s*(\d+(?:[.,]\d+)?)/i) ??
    contextText.match(/(\d+(?:[.,]\d+)?)\s*(?:q\.?|quetzales?)/i);
  if (costMatch) params.cost = Number(costMatch[1].replace(',', '.'));

  const vetMatch = contextText.match(/(?:dr\.?|doctora?|veterinari[oa])\s+([a-záéíóúñ\s.]+)/i);
  if (vetMatch) params.veterinarian_name = vetMatch[1].trim();

  const clinicMatch = contextText.match(/(?:cl[ií]nica|veterinaria)\s+([a-záéíóúñ0-9\s.]+)/i);
  if (clinicMatch) params.veterinary_clinic = clinicMatch[1].trim();

  if (/\b(vacuna|vacunaci[oó]n|antirr[aá]bica)\b/i.test(contextText)) {
    const vaccineMatch = contextText.match(/(?:vacuna|antirr[aá]bica|pentavalente)\s+([a-záéíóúñ\s]+)/i);
    params.diagnosis = vaccineMatch ? `Vacunación: ${vaccineMatch[0].trim()}` : 'Vacunación';
  }

  const diagnosisMatch = contextText.match(/(?:diagn[oó]stico|motivo)\s*[:\-]?\s*([^.\n]+)/i);
  if (diagnosisMatch) params.diagnosis = diagnosisMatch[1].trim();

  const followUpMatch = contextText.match(/(\d{4}-\d{2}-\d{2})/);
  if (followUpMatch) params.follow_up_date = followUpMatch[1];

  return params;
}

export function isMultiPetReply(message: string): boolean {
  return wantsAllPets(message) || /^(s[ií]|las tres|los tres|las 3|los 3)$/i.test(message.trim());
}

const EXERCISE_CONTEXT =
  /\b(ejercicio|actividad f[ií]sica|paseo|caminata|caminar|carrera|fetch|entrenamiento|trazabilidad|registrar ejercicio|pelota|jugamos)\b/i;
const NUTRITION_CONTEXT =
  /\b(nutrici[oó]n|comida|alimentaci[oó]n|alimento|registrar comida|gramos|desayuno|cena|merienda)\b/i;
const REGISTER_EXERCISE_INTENT =
  /\b(registrar|registra|anota|guarda|quiero registrar)\b.*\b(ejercicio|actividad|paseo|caminata|caminar)\b/i;
const REGISTER_EXERCISE_ALT =
  /\b(caminata|paseo|carrera)\b.*\b\d+\s*min/i;
const REGISTER_NUTRITION_INTENT =
  /\b(registrar|registra|anota|guarda|aliment[eé]|comi[oó]|le di de comer)\b.*\b(comida|alimentaci[oó]n|alimento)\b/i;
const REGISTER_VETERINARY_INTENT =
  /\b(registrar|registra|anota|guarda|fui al|llev[eé] al)\b.*\b(veterinari|vet\b|vacuna|visita)\b/i;
const VETERINARY_CONTEXT =
  /\b(veterinari|vet\b|vacuna|vacunaci[oó]n|diagn[oó]stico|visita m[eé]dica)\b/i;

export function isExerciseRegisterMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    REGISTER_EXERCISE_INTENT.test(lower) ||
    REGISTER_EXERCISE_ALT.test(lower) ||
    /\b(quiero\s+)?registrar\s+ejercicio\b/i.test(lower) ||
    (EXERCISE_CONTEXT.test(lower) && /\b(registrar|registra|quiero|minutos?)\b/i.test(lower))
  );
}

export function assistantAskedForExerciseData(history: ConversationTurn[]): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t.role !== 'assistant') continue;
    if (
      /¿Qué tipo de actividad|¿Qué actividad|¿Cuántos.*minutos|registrar el ejercicio|necesito dos datos/i.test(
        t.content,
      )
    ) {
      return !exerciseFlowCompletedAfter(history, i);
    }
    return false;
  }
  return false;
}

export function assistantAskedForExerciseDuration(history: ConversationTurn[]): boolean {
  const lastAssistant = [...history].reverse().find((t) => t.role === 'assistant');
  return Boolean(lastAssistant && /¿Cuántos.*minutos/i.test(lastAssistant.content));
}

export function isVeterinaryRegisterMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    REGISTER_VETERINARY_INTENT.test(lower) ||
    /\b(quiero\s+)?registrar\s+(una\s+)?(cita\s+)?(al\s+)?veterinari/i.test(lower) ||
    /\b(cita|visita)\s+(al\s+)?veterinari/i.test(lower) ||
    (VETERINARY_CONTEXT.test(lower) && /\b(registrar|registra|cita|visita)\b/i.test(lower))
  );
}

export function isNutritionRegisterMessage(message: string): boolean {
  const lower = message.toLowerCase();
  if (isExerciseRegisterMessage(message) || isVeterinaryRegisterMessage(message)) return false;
  return (
    REGISTER_NUTRITION_INTENT.test(lower) ||
    /\b(quiero\s+)?registrar\s+(una\s+)?(alimentaci[oó]n|nutrici[oó]n|comida)\b/i.test(lower) ||
    (NUTRITION_CONTEXT.test(lower) && /\b(registrar|registra|gramos?)\b/i.test(lower))
  );
}

function exerciseFlowCompletedAfter(history: ConversationTurn[], afterIndex: number): boolean {
  for (let i = afterIndex + 1; i < history.length; i++) {
    const turn = history[i];
    if (turn.role === 'assistant' && turn.toolsUsed?.includes('exercise_register_session')) {
      return true;
    }
    if (turn.role === 'assistant' && /¡Listo! Registré la sesión/i.test(turn.content)) {
      return true;
    }
  }
  return false;
}

/** True only while collecting exercise data — closes after success or a new topic. */
export function isActiveExerciseRegisterFlow(history: ConversationTurn[], message: string): boolean {
  const trimmed = message.trim();
  if (isNutritionRegisterMessage(trimmed) || isVeterinaryRegisterMessage(trimmed)) {
    return false;
  }

  if (isExerciseRegisterMessage(trimmed)) {
    return true;
  }

  let lastPromptIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t.role !== 'assistant') continue;
    if (
      /¿Qué tipo de actividad/i.test(t.content) ||
      /¿Qué actividad/i.test(t.content) ||
      /¿Cuántos.*minutos/i.test(t.content) ||
      /registrar el ejercicio/i.test(t.content) ||
      /necesito dos datos/i.test(t.content)
    ) {
      lastPromptIdx = i;
      break;
    }
  }

  if (lastPromptIdx < 0) return false;
  if (exerciseFlowCompletedAfter(history, lastPromptIdx)) return false;

  for (let i = lastPromptIdx + 1; i < history.length; i++) {
    const t = history[i];
    if (t.role === 'user' && (isNutritionRegisterMessage(t.content) || isVeterinaryRegisterMessage(t.content))) {
      return false;
    }
  }

  if (/^\d{1,3}$/.test(trimmed)) return true;
  if (EXERCISE_CONTEXT.test(trimmed)) return true;

  return false;
}

export function assistantAskedForNutritionData(history: ConversationTurn[]): boolean {
  const lastAssistant = [...history].reverse().find((t) => t.role === 'assistant');
  if (!lastAssistant) return false;
  return (
    /¿Qué alimento/i.test(lastAssistant.content) ||
    /¿Cuántos.*gramos/i.test(lastAssistant.content) ||
    /Para registrar la comida/i.test(lastAssistant.content)
  );
}

function nutritionFlowCompletedAfter(history: ConversationTurn[], afterIndex: number): boolean {
  for (let i = afterIndex + 1; i < history.length; i++) {
    const turn = history[i];
    if (turn.role === 'assistant' && turn.toolsUsed?.includes('nutrition_register_meal')) {
      return true;
    }
    if (turn.role === 'assistant' && /¡Listo! Registré la comida/i.test(turn.content)) {
      return true;
    }
  }
  return false;
}

export function isActiveNutritionRegisterFlow(history: ConversationTurn[], message: string): boolean {
  const trimmed = message.trim();
  if (isNutritionQueryMessage(trimmed)) return false;
  if (isExerciseRegisterMessage(trimmed) || isVeterinaryRegisterMessage(trimmed)) {
    return false;
  }

  if (isNutritionRegisterMessage(trimmed)) {
    return true;
  }

  let lastPromptIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t.role !== 'assistant') continue;
    if (
      /¿Qué alimento/i.test(t.content) ||
      /¿Cuántos.*gramos/i.test(t.content) ||
      /Para registrar la comida/i.test(t.content)
    ) {
      lastPromptIdx = i;
      break;
    }
  }

  if (lastPromptIdx < 0) return false;
  if (nutritionFlowCompletedAfter(history, lastPromptIdx)) return false;

  if (/^\d+(?:[.,]\d+)?\s*(?:g|gr|gramos?)?$/i.test(trimmed)) return true;
  if (NUTRITION_CONTEXT.test(trimmed) && !EXERCISE_CONTEXT.test(trimmed)) return true;

  return false;
}

function veterinaryFlowCompletedAfter(history: ConversationTurn[], afterIndex: number): boolean {
  for (let i = afterIndex + 1; i < history.length; i++) {
    const turn = history[i];
    if (turn.role === 'assistant' && turn.toolsUsed?.includes('veterinary_register_visit')) {
      return true;
    }
    if (turn.role === 'assistant' && /¡Listo! Registré la visita/i.test(turn.content)) {
      return true;
    }
  }
  return false;
}

export function isActiveVeterinaryRegisterFlow(history: ConversationTurn[], message: string): boolean {
  const trimmed = message.trim();
  if (isExerciseRegisterMessage(trimmed) || isNutritionRegisterMessage(trimmed)) {
    return false;
  }

  if (isVeterinaryRegisterMessage(trimmed)) {
    return true;
  }

  let lastPromptIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t.role !== 'assistant') continue;
    if (
      /Para registrar la visita/i.test(t.content) ||
      /¿Qué mascota.*visita/i.test(t.content) ||
      /¿Cuál fue el diagn[oó]stico/i.test(t.content) ||
      /¿Quién fue el veterinario/i.test(t.content)
    ) {
      lastPromptIdx = i;
      break;
    }
  }

  if (lastPromptIdx < 0) return false;
  if (veterinaryFlowCompletedAfter(history, lastPromptIdx)) return false;

  if (VETERINARY_CONTEXT.test(trimmed) && !EXERCISE_CONTEXT.test(trimmed) && !NUTRITION_CONTEXT.test(trimmed)) {
    return true;
  }

  return false;
}

/** Detect register intent on the first message (no chat history required). */
export function resolveStandaloneRegisterIntent(
  message: string,
): { toolName: string; params: Record<string, unknown> } | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const multiPet = wantsAllPets(lower);

  if (multiPet || isExerciseRegisterMessage(trimmed)) {
    const params = inferExerciseParamsFromConversation([], trimmed);
    if (multiPet) params.pet_name = 'todos';
    if (params.duration_minutes && params.exercise_type) {
      if (multiPet) params.pet_name = 'todos';
      return { toolName: 'exercise_register_session', params };
    }
  }

  if (multiPet || isNutritionRegisterMessage(trimmed)) {
    const params = inferNutritionMealParamsFromConversation([], trimmed);
    if (multiPet) params.pet_name = 'todos';
    if (params.quantity_grams && (params.pet_name || multiPet)) {
      if (multiPet) params.pet_name = 'todos';
      return { toolName: 'nutrition_register_meal', params };
    }
  }

  if (
    REGISTER_VETERINARY_INTENT.test(lower) ||
    (VETERINARY_CONTEXT.test(lower) && /\b(registrar|registra|anota|fui|llev[eé]|le pusieron)\b/i.test(lower))
  ) {
    const params = inferVeterinaryVisitParamsFromConversation([], trimmed);
    if (params.veterinarian_name && params.diagnosis) {
      return { toolName: 'veterinary_register_visit', params };
    }
  }

  return null;
}
