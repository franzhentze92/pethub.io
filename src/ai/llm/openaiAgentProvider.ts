import type { AiExecutionContext, ConversationTurn, PetBuddyResponse } from '../types';
import { aiRegistry } from '../registry';
import { initAiModules } from '../modules';
import { extractCartAction } from '../helpers/cartActions';
import { attachProductRecommendations } from '../helpers/petBuddyProductRecommendations';
import { formatUserPetsForPrompt } from '../helpers/petResolver';
import { wrapToolResultForLlm } from '../helpers/toolResponsePolicy';
import { getPetHubSchemaForAgent } from '../schema/petHubDataCatalog';
import {
  BLUEPRINT_DASHBOARD_LABELS,
  BLUEPRINT_MASCOTS,
  getMascotDashboardForRole,
} from '@/lib/blueprint/blueprintMascots';
import {
  buildActionPreview,
  buildConfirmationMessage,
  getRegisterIncompletePrompt,
  needsConfirmation,
} from '../actionConfirmation';
import { callPetBuddyAgent, type OpenAiChatMessage } from './edgeOpenAi';
import { trimHistory } from '../conversationContext';

initAiModules();

const MAX_AGENT_TOOL_STEPS = 16;

function buildMemoryBlock(ctx: AiExecutionContext): string {
  const parts: string[] = [];
  if (ctx.conversationSummary?.trim()) {
    parts.push(`Resumen de conversaciones previas:\n${ctx.conversationSummary.trim()}`);
  }
  if (ctx.memoryFacts?.length) {
    const facts = ctx.memoryFacts
      .slice(0, 20)
      .map((f) => `- ${f.pet_name ? `[${f.pet_name}] ` : ''}${f.fact_text}`)
      .join('\n');
    parts.push(`Hechos recordados:\n${facts}`);
  }
  return parts.length ? parts.join('\n\n') : '';
}

function buildAgentSystemPrompt(ctx: AiExecutionContext): string {
  const dashboard = getMascotDashboardForRole(ctx.userRole);
  const guideName = BLUEPRINT_MASCOTS[dashboard].name;
  const dashboardLabel = BLUEPRINT_DASHBOARD_LABELS[dashboard];
  const memoryBlock = buildMemoryBlock(ctx);
  const voiceHint = ctx.voiceMode
    ? '\nMODO VOZ: respuestas cortas (2-4 oraciones), sin markdown ni listas largas, aptas para leer en voz alta.\n'
    : '';

  return `Eres ${guideName}, asistente de PetHub (${dashboardLabel}). Hablas en español latino, tono cálido y natural — como una persona real, no como un formulario.

MODO AGENTE (beta):
- Tienes TODAS las herramientas de PetHub más acceso directo a tablas Supabase (data_read_rows, data_insert_row, data_update_row, data_describe_schema).
- PERFILES NUTRICIONALES: nutrition_get_food_profile y nutrition_analyze_diet. Si analyze_diet trae marketplace_recommendations, conecta el déficit con productos/servicios reales de la tienda y ofrece cart_add_item.
- Para CONSULTAR datos: usa herramientas de dominio O data_read_rows en pet_foods / nutrition_sessions. Nunca digas "no tengo acceso" sin intentar primero.
- Para REGISTRAR comida, ejercicio, carrito, etc.: usa la herramienta de dominio si existe; si no, data_insert_row con los campos correctos del esquema.
- Tras cada herramienta, responde al usuario en prosa clara: interpreta, suma totales, da contexto. No vuelques JSON ni reportes con emojis.
- Si falta un dato para actuar, pregunta una sola cosa concreta.
- No inventes datos que no devolvieron las herramientas.
- Mascotas del usuario (no pidas nombres si ya están aquí): ${formatUserPetsForPrompt(ctx)}
- "mis mascotas" / "todos" → pet_name="todos" en tools de dominio.
${voiceHint}
${memoryBlock ? `\n${memoryBlock}\n` : ''}
${ctx.preloadedHealthContext ? `\n${ctx.preloadedHealthContext}\n` : ''}

ESQUEMA DE BASE DE DATOS:
${getPetHubSchemaForAgent()}

Herramientas registradas: ${aiRegistry.getToolsForContext(ctx).map((t) => t.name).join(', ')}`;
}

/**
 * Full agent mode: LLM-first loop, all tools, no direct template bypass, no regex routers.
 */
export async function askOpenAiAgent(
  message: string,
  ctx: AiExecutionContext,
  history: ConversationTurn[] = [],
): Promise<PetBuddyResponse> {
  const recentHistory = trimHistory(history);
  const domainTools = aiRegistry.getToolsForContext(ctx);
  const openAiTools = domainTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const messages: OpenAiChatMessage[] = [{ role: 'system', content: buildAgentSystemPrompt(ctx) }];

  for (const turn of recentHistory) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  messages.push({ role: 'user', content: message });

  const toolsUsed: string[] = [];
  let actionLink: PetBuddyResponse['actionLink'];
  let cartAction: PetBuddyResponse['cartAction'];
  let productRecommendations: PetBuddyResponse['productRecommendations'];

  for (let step = 0; step < MAX_AGENT_TOOL_STEPS; step++) {
    const useStream = Boolean(ctx.streamResponses && ctx.onStreamDelta);
    const json = await callPetBuddyAgent({
      messages,
      tools: openAiTools,
      stream: useStream,
      loadMemory: step === 0,
      onDelta: ctx.onStreamDelta,
    });
    const choice = json.choices?.[0]?.message;

    if (choice?.tool_calls?.length) {
      messages.push({ role: 'assistant', tool_calls: choice.tool_calls });

      for (const call of choice.tool_calls) {
        const toolName = call.function.name;
        const tool = aiRegistry.getTool(toolName);
        let params: Record<string, unknown> = {};
        try {
          params = JSON.parse(call.function.arguments || '{}');
        } catch {
          params = {};
        }

        let toolResult: unknown = { error: 'TOOL_NOT_FOUND', tool: toolName };
        if (tool) {
          const incompletePrompt = getRegisterIncompletePrompt(tool.name, params, ctx);
          if (incompletePrompt) {
            return { message: incompletePrompt, toolsUsed: [] };
          }

          if (!ctx.skipConfirmation && needsConfirmation(tool.name, params, ctx)) {
            const preview = buildActionPreview(tool.name, params);
            return {
              message: buildConfirmationMessage(preview.title, ctx.voiceMode),
              toolsUsed: [],
              pendingAction: { ...preview, status: 'pending' },
            };
          }

          toolsUsed.push(tool.name);
          try {
            toolResult = await tool.execute(params, ctx);
          } catch (err) {
            toolResult = {
              error: 'EXECUTE_FAILED',
              message: err instanceof Error ? err.message : String(err),
            };
          }

          const data = toolResult as Record<string, unknown>;
          if (data?.cart_action) {
            const extracted = extractCartAction(toolResult);
            if (extracted) cartAction = extracted;
          }
          const recDraft: PetBuddyResponse = {
            message: '',
            toolsUsed: [],
            productRecommendations,
          };
          attachProductRecommendations(recDraft, tool.name, toolResult);
          productRecommendations = recDraft.productRecommendations;
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: wrapToolResultForLlm(toolName, toolResult),
        });
      }
      continue;
    }

    if (choice?.content?.trim()) {
      return {
        message: choice.content.trim(),
        toolsUsed,
        actionLink,
        cartAction,
        productRecommendations,
        streamed: useStream,
      };
    }
    break;
  }

  return {
    message:
      'Llegué al límite de pasos procesando tu solicitud. ¿Puedes simplificar o dividir la pregunta?',
    toolsUsed,
    actionLink,
    cartAction,
    productRecommendations,
  };
}
