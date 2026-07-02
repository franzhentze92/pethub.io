import type { AiExecutionContext, ConversationTurn, PetBuddyResponse } from './types';
import { enrichContextWithPets } from './helpers/petResolver';
import { enrichContextWithMemory } from './helpers/petBuddyMemory';
import { enrichContextWithHealthPreload } from './helpers/healthContextPreload';
import { trimHistory } from './conversationContext';
import { askOpenAiAgent } from './llm/openaiAgentProvider';
import { resolveNutritionProfileQuery } from './helpers/nutritionProfileQuery';
import { aiRegistry } from './registry';
import { getRegisterIncompletePrompt } from './actionConfirmation';
import { synthesizeToolResult } from './llm/openaiProvider';
import { getGreeting, getHelpMessage } from './responseFormatter';

const GREETING_PATTERNS = /^(hola|hey|buenas|buenos|hi|hello|saludos|que tal|qué tal)/i;
const HELP_PATTERNS = /(ayuda|help|que puedes|qué puedes|que sabes|qué sabes|como funciona|cómo funciona)/i;

/**
 * Experimental full-agent path. Classic askPetBuddy() is unchanged.
 * LLM chooses all tools + direct Supabase table access; no regex routers.
 */
export async function askPetBuddyAgent(
  message: string,
  ctx: AiExecutionContext,
  history: ConversationTurn[] = [],
): Promise<PetBuddyResponse> {
  const enrichedCtx = await enrichContextWithMemory(
    await enrichContextWithHealthPreload(await enrichContextWithPets(ctx)),
  );
  const trimmed = message.trim();
  const recentHistory = trimHistory(history);

  if (GREETING_PATTERNS.test(trimmed) && trimmed.length < 30 && recentHistory.length === 0) {
    return { message: getGreeting(enrichedCtx.userName, enrichedCtx.voiceMode, enrichedCtx.userRole), toolsUsed: [] };
  }
  if (HELP_PATTERNS.test(trimmed) && trimmed.length < 40) {
    return { message: getHelpMessage(enrichedCtx), toolsUsed: [] };
  }

  const nutritionProfile = resolveNutritionProfileQuery(trimmed, recentHistory, enrichedCtx);
  if (nutritionProfile) {
    const tool = aiRegistry.getTool(nutritionProfile.toolName);
    if (tool) {
      const incomplete = getRegisterIncompletePrompt(tool.name, nutritionProfile.params, enrichedCtx);
      if (incomplete) return { message: incomplete, toolsUsed: [] };
      try {
        const result = await tool.execute(nutritionProfile.params, enrichedCtx);
        const data = result as Record<string, unknown>;
        if (data?.error && data?.message) {
          return { message: String(data.message), toolsUsed: [tool.name] };
        }
        return await synthesizeToolResult(message, recentHistory, enrichedCtx, tool.name, result);
      } catch {
        /* fall through to full agent */
      }
    }
  }

  try {
    return await askOpenAiAgent(message, enrichedCtx, recentHistory);
  } catch (err) {
    console.warn('[PetBuddy Agent] failed:', err);
    return {
      message:
        'El modo agente tuvo un problema conectando con la IA. Prueba de nuevo o desactiva "Modo agente" en el encabezado del chat.',
      toolsUsed: [],
    };
  }
}
