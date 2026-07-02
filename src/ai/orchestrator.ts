import type { AiExecutionContext, AiToolDefinition, ConversationTurn, PetBuddyResponse } from './types';
import { aiRegistry } from './registry';
import { initAiModules } from './modules';
import { rankTools, inferToolParams } from './localRouter';
import { formatToolResult, getGreeting, getHelpMessage } from './responseFormatter';
import { askOpenAi } from './llm/openaiProvider';
import { resolveContextualTool, trimHistory } from './conversationContext';
import {
  assistantAskedForStock,
  extractStockOnlyMessage,
  getProductCatalogFlow,
  getServiceCatalogFlow,
  resolveStockFromConversation,
} from './helpers/catalogDraft';
import { extractFirstUrl } from './llm/importProductUrl';
import { buildActionPreview, buildConfirmationMessage, getRegisterIncompletePrompt, needsConfirmation } from './actionConfirmation';
import { enrichContextWithPets, wantsAllPets } from './helpers/petResolver';
import { enrichContextWithHealthPreload } from './helpers/healthContextPreload';
import {
  enrichContextWithMemory,
  maybeUpdateConversationSummary,
  tryAutoSaveFactFromMessage,
} from './helpers/petBuddyMemory';
import { inferPetNameParam } from './helpers/inferPetParam';
import { extractCartAction } from './helpers/cartActions';
import {
  inferExerciseParamsFromConversation,
  inferNutritionMealParamsFromConversation,
  inferVeterinaryVisitParamsFromConversation,
  isActiveExerciseRegisterFlow,
  isActiveNutritionRegisterFlow,
  isActiveVeterinaryRegisterFlow,
  isExerciseRegisterMessage,
  isNutritionRegisterMessage,
} from './helpers/registerFlowParams';

initAiModules();

const GREETING_PATTERNS = /^(hola|hey|buenas|buenos|hi|hello|saludos|que tal|qué tal)/i;
const HELP_PATTERNS = /(ayuda|help|que puedes|qué puedes|que sabes|qué sabes|como funciona|cómo funciona)/i;

async function executeTool(
  tool: AiToolDefinition,
  params: Record<string, unknown>,
  ctx: AiExecutionContext
): Promise<PetBuddyResponse> {
  const incompletePrompt = getRegisterIncompletePrompt(tool.name, params, ctx);
  if (incompletePrompt) {
    return { message: incompletePrompt, toolsUsed: [] };
  }

  if (!ctx.skipConfirmation && needsConfirmation(tool.name, params, ctx)) {
    const preview = buildActionPreview(tool.name, params);
    if (params.pet_name === 'todos' && ctx.userPetNames?.length) {
      const names = ctx.userPetNames.join(', ');
      const petField = preview.fields.find((f) => f.label === 'Mascota');
      if (petField) petField.value = names;
      else preview.fields.unshift({ label: 'Mascota', value: names });
    }
    return {
      message: buildConfirmationMessage(preview.title, ctx.voiceMode),
      toolsUsed: [],
      pendingAction: { ...preview, status: 'pending' },
    };
  }

  const result = await tool.execute(params, ctx);
  const module = aiRegistry.getAllModules().find((m) => m.tools.some((t) => t.name === tool.name));
  const formatted = formatToolResult(tool.name, result, module);
  return {
    message: formatted.message,
    toolsUsed: [tool.name],
    actionLink: formatted.actionLink,
    cartAction: extractCartAction(result),
  };
}

async function routeLocally(
  message: string,
  ctx: AiExecutionContext,
  history: ConversationTurn[] = []
): Promise<PetBuddyResponse> {
  const trimmed = message.trim();
  const recentHistory = trimHistory(history);

  if (GREETING_PATTERNS.test(trimmed) && trimmed.length < 30 && recentHistory.length === 0) {
    return { message: getGreeting(ctx.userName, ctx.voiceMode, ctx.userRole), toolsUsed: [] };
  }
  if (HELP_PATTERNS.test(trimmed)) {
    return { message: getHelpMessage(ctx), toolsUsed: [] };
  }

  const nutritionFlow = await tryHandleNutritionRegisterFlow(trimmed, recentHistory, ctx);
  if (nutritionFlow) return nutritionFlow;

  const veterinaryFlow = await tryHandleVeterinaryRegisterFlow(trimmed, recentHistory, ctx);
  if (veterinaryFlow) return veterinaryFlow;

  const exerciseFlow = await tryHandleExerciseRegisterFlow(trimmed, recentHistory, ctx);
  if (exerciseFlow) return exerciseFlow;

  const contextual = resolveContextualTool(trimmed, recentHistory, ctx);
  if (contextual) {
    const tool = aiRegistry.getTool(contextual.toolName);
    if (tool) {
      const params = { ...inferToolParams(tool.name, trimmed, recentHistory), ...contextual.params };
      return executeTool(tool, params, ctx);
    }
  }

  const tools = aiRegistry.getToolsForContext(ctx);
  const ranked = rankTools(trimmed, tools, recentHistory);

  if (ranked.length === 0) {
    return {
      message:
        'No estoy seguro de cómo ayudarte con eso. Prueba preguntarme sobre **productos**, **adopción**, **mascotas perdidas**, **tus mascotas** u **órdenes**. Escribe "ayuda" para ver ejemplos. 🐶',
      toolsUsed: [],
    };
  }

  const { tool } = ranked[0];
  const params = inferToolParams(tool.name, trimmed, recentHistory);
  return executeTool(tool, params, ctx);
}

const SUBSTANTIVE_MIN_LENGTH = 3;

/**
 * Main entry point for Pet Buddy AI.
 * Uses OpenAI via Supabase Edge Function (secret OPENAI_API_KEY).
 * Falls back to local keyword router if edge/OpenAI fails.
 */
export async function askPetBuddy(
  message: string,
  ctx: AiExecutionContext,
  history: ConversationTurn[] = []
): Promise<PetBuddyResponse> {
  const enrichedCtx = await enrichContextWithMemory(
    await enrichContextWithHealthPreload(await enrichContextWithPets(ctx)),
  );
  const trimmed = message.trim();
  const recentHistory = trimHistory(history);

  if (enrichedCtx.userId) {
    void tryAutoSaveFactFromMessage(
      enrichedCtx.userId,
      trimmed,
      enrichedCtx.userPetNames ?? [],
    );
  }

  if (GREETING_PATTERNS.test(trimmed) && trimmed.length < 30 && recentHistory.length === 0) {
    return { message: getGreeting(enrichedCtx.userName, enrichedCtx.voiceMode, enrichedCtx.userRole), toolsUsed: [] };
  }
  if (HELP_PATTERNS.test(trimmed)) {
    return { message: getHelpMessage(enrichedCtx), toolsUsed: [] };
  }

  const nutritionFlow = await tryHandleNutritionRegisterFlow(trimmed, recentHistory, enrichedCtx);
  if (nutritionFlow) return nutritionFlow;

  const veterinaryFlow = await tryHandleVeterinaryRegisterFlow(trimmed, recentHistory, enrichedCtx);
  if (veterinaryFlow) return veterinaryFlow;

  const exerciseFlow = await tryHandleExerciseRegisterFlow(trimmed, recentHistory, enrichedCtx);
  if (exerciseFlow) return exerciseFlow;

  // User answered with stock after URL import preview
  if (assistantAskedForStock(recentHistory)) {
    const stock =
      extractStockOnlyMessage(trimmed) ?? resolveStockFromConversation(recentHistory, trimmed);
    if (stock !== undefined) {
      const historyText = recentHistory.map((t) => t.content).join('\n');
      const importUrl = extractFirstUrl(historyText) ?? extractFirstUrl(trimmed);
      if (importUrl) {
        const importTool = aiRegistry.getTool('catalog_import_from_url');
        if (importTool) {
          return executeTool(
            importTool,
            { url: importUrl, stock_quantity: stock, auto_create: true },
            enrichedCtx
          );
        }
      }
    }
  }

  // Import product from URL — ask stock before creating unless provided in the same message
  const productUrl = extractFirstUrl(trimmed);
  if (productUrl) {
    const importTool = aiRegistry.getTool('catalog_import_from_url');
    if (importTool) {
      const stock = resolveStockFromConversation(recentHistory, trimmed);
      if (stock !== undefined) {
        return executeTool(
          importTool,
          { url: productUrl, stock_quantity: stock, auto_create: true },
          enrichedCtx
        );
      }

      const preview = await executeTool(
        importTool,
        { url: productUrl, auto_create: false },
        enrichedCtx
      );
      return {
        ...preview,
        message: `${preview.message}\n\n¿Cuántas unidades quieres tener en **stock inicial**? (ej. 10, 50, 100)`,
      };
    }
  }

  const serviceFlow = getServiceCatalogFlow(recentHistory, trimmed);
  if (serviceFlow.inFlow) {
    if (serviceFlow.complete && serviceFlow.createParams) {
      const createTool = aiRegistry.getTool('catalog_create_service');
      if (createTool) {
        return executeTool(createTool, serviceFlow.createParams, enrichedCtx);
      }
    }
    if (serviceFlow.nextQuestion) {
      return { message: serviceFlow.nextQuestion, toolsUsed: [] };
    }
  }

  const productFlow = getProductCatalogFlow(recentHistory, trimmed);
  if (productFlow.inFlow) {
    if (productFlow.complete && productFlow.createParams) {
      const createTool = aiRegistry.getTool('catalog_create_product');
      if (createTool) {
        return executeTool(createTool, productFlow.createParams, enrichedCtx);
      }
    }
    if (productFlow.nextQuestion) {
      return { message: productFlow.nextQuestion, toolsUsed: [] };
    }
  }

  if (trimmed.length >= SUBSTANTIVE_MIN_LENGTH) {
    const contextual = resolveContextualTool(trimmed, recentHistory, enrichedCtx);
    if (contextual) {
      const tool = aiRegistry.getTool(contextual.toolName);
      if (tool) {
        const params = {
          ...inferToolParams(tool.name, trimmed, recentHistory),
          ...contextual.params,
        };
        return executeTool(tool, params, enrichedCtx);
      }
    }

    try {
      return await askOpenAi(message, enrichedCtx, recentHistory);
    } catch (err) {
      console.warn('[PetBuddy] Edge/OpenAI failed, falling back to local router:', err);
    }
  }

  return routeLocally(message, enrichedCtx, recentHistory);
}

async function tryHandleExerciseRegisterFlow(
  message: string,
  history: ConversationTurn[],
  ctx: AiExecutionContext,
): Promise<PetBuddyResponse | null> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!isActiveExerciseRegisterFlow(history, trimmed)) return null;

  const params = inferExerciseParamsFromConversation(history, trimmed);
  if (wantsAllPets(lower)) params.pet_name = 'todos';

  const incompletePrompt = getRegisterIncompletePrompt('exercise_register_session', params, ctx);
  if (incompletePrompt) {
    return { message: incompletePrompt, toolsUsed: [] };
  }

  const tool = aiRegistry.getTool('exercise_register_session');
  if (!tool) return null;
  return executeTool(tool, params, ctx);
}

async function tryHandleNutritionRegisterFlow(
  message: string,
  history: ConversationTurn[],
  ctx: AiExecutionContext,
): Promise<PetBuddyResponse | null> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!isActiveNutritionRegisterFlow(history, trimmed)) return null;

  const params = inferNutritionMealParamsFromConversation(history, trimmed);
  if (wantsAllPets(lower)) params.pet_name = 'todos';

  const incompletePrompt = getRegisterIncompletePrompt('nutrition_register_meal', params, ctx);
  if (incompletePrompt) {
    return { message: incompletePrompt, toolsUsed: [] };
  }

  const tool = aiRegistry.getTool('nutrition_register_meal');
  if (!tool) return null;
  return executeTool(tool, params, ctx);
}

async function tryHandleVeterinaryRegisterFlow(
  message: string,
  history: ConversationTurn[],
  ctx: AiExecutionContext,
): Promise<PetBuddyResponse | null> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!isActiveVeterinaryRegisterFlow(history, trimmed)) return null;

  const params = inferVeterinaryVisitParamsFromConversation(history, trimmed);
  const petName = inferPetNameParam(trimmed, history);
  if (petName) params.pet_name = petName;
  else if (wantsAllPets(lower) && (ctx.userPetNames?.length ?? 0) <= 1) {
    params.pet_name = 'todos';
  }

  const incompletePrompt = getRegisterIncompletePrompt('veterinary_register_visit', params, ctx);
  if (incompletePrompt) {
    return { message: incompletePrompt, toolsUsed: [] };
  }

  const tool = aiRegistry.getTool('veterinary_register_visit');
  if (!tool) return null;
  return executeTool(tool, params, ctx);
}

/** Export for module extension / testing */
export { executeTool, routeLocally };

/** Execute a tool after the user confirmed the pending action preview */
export async function executeConfirmedTool(
  toolName: string,
  params: Record<string, unknown>,
  ctx: AiExecutionContext,
): Promise<PetBuddyResponse> {
  const tool = aiRegistry.getTool(toolName);
  if (!tool) {
    return { message: 'No encontré esa acción.', toolsUsed: [] };
  }

  const enrichedCtx = await enrichContextWithMemory(
    await enrichContextWithHealthPreload(await enrichContextWithPets(ctx)),
  );
  const incompletePrompt = getRegisterIncompletePrompt(toolName, params, enrichedCtx);
  if (incompletePrompt) {
    return { message: incompletePrompt, toolsUsed: [] };
  }

  return executeTool(tool, params, { ...enrichedCtx, skipConfirmation: true });
}
