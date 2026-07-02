import type { AiExecutionContext, ConversationTurn } from '../types';
import { getConversationTopic, getRecentTools } from '../conversationContext';
import { inferPetNameParam } from './inferPetParam';
import { isNutritionReadIntent } from './nutritionQuery';
import { assistantAskedWhichPet } from './registerFlowParams';

const HEALTH_READ_PATTERN =
  /\b(salud|bienestar|c[oó]mo est[aá]|como esta|c[oó]mo va|estado de salud|estado general|resumen de salud)\b/i;

const HEALTH_TOOLS = ['pet_health_summary', 'pet_timeline', 'pet_insights'] as const;

type HealthToolName = (typeof HEALTH_TOOLS)[number];

export function resolveHealthReadQuery(
  message: string,
  history: ConversationTurn[],
  ctx?: AiExecutionContext,
): { toolName: HealthToolName; params: Record<string, unknown> } | null {
  const trimmed = message.trim();
  if (!trimmed || isNutritionReadIntent(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  let petName = inferPetNameParam(trimmed, history, ctx?.userPetNames);
  if (!petName && HEALTH_READ_PATTERN.test(lower)) {
    const deMatch = trimmed.match(/\b(?:de|para)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ][\wáéíóúñüÁÉÍÓÚÑ-]*)/i);
    if (deMatch && !/\b(salud|comida|alimentaci[oó]n)\b/i.test(deMatch[1])) {
      petName = deMatch[1].charAt(0).toUpperCase() + deMatch[1].slice(1).toLowerCase();
    }
  }
  const recentTools = getRecentTools(history);
  const topic = getConversationTopic(history);
  const healthFollowUp =
    assistantAskedWhichPet(history) &&
    recentTools.some((t) => HEALTH_TOOLS.includes(t as HealthToolName));

  const words = trimmed.split(/\s+/).filter(Boolean);
  const petNameOnly =
    petName &&
    words.length <= 2 &&
    words.every((w) => w.toLowerCase() === petName.toLowerCase() || w.length <= 2);

  const userRecentHealth = history
    .slice(-6)
    .filter((t) => t.role === 'user')
    .some((t) => HEALTH_READ_PATTERN.test(t.content));

  if (healthFollowUp && petName) {
    const toolName = (recentTools.find((t) => HEALTH_TOOLS.includes(t as HealthToolName)) ??
      'pet_health_summary') as HealthToolName;
    return {
      toolName,
      params: { pet_name: petName, days_back: toolName === 'pet_health_summary' ? 7 : 30 },
    };
  }

  if (petNameOnly && (topic === 'health' || userRecentHealth || recentTools.some((t) => HEALTH_TOOLS.includes(t as HealthToolName)))) {
    return { toolName: 'pet_health_summary', params: { pet_name: petName, days_back: 7 } };
  }

  if (HEALTH_READ_PATTERN.test(lower) && !/\balimentaci[oó]n\b/i.test(lower) && petName) {
    return { toolName: 'pet_health_summary', params: { pet_name: petName, days_back: 7 } };
  }

  return null;
}
