import type { AiExecutionContext, ConversationTurn, PetBuddyResponse } from '../types';
import { aiRegistry } from '../registry';
import { initAiModules } from '../modules';
import { formatToolResult } from '../responseFormatter';
import {
  BLUEPRINT_DASHBOARD_LABELS,
  BLUEPRINT_MASCOTS,
  getMascotDashboardForRole,
} from '@/lib/blueprint/blueprintMascots';
import { inferToolParams } from '../localRouter';
import { callPetBuddyAgent, type OpenAiChatMessage } from './edgeOpenAi';
import { buildContextSummary } from '../conversationContext';
import { getToolsForIntent, detectToolIntents } from '../helpers/toolSubset';
import { buildActionPreview, buildConfirmationMessage, getRegisterIncompletePrompt, needsConfirmation } from '../actionConfirmation';
import { formatUserPetsForPrompt } from '../helpers/petResolver';
import {
  inferExerciseParamsFromConversation,
  inferNutritionMealParamsFromConversation,
  inferVeterinaryVisitParamsFromConversation,
  isActiveExerciseRegisterFlow,
  isActiveNutritionRegisterFlow,
  isActiveVeterinaryRegisterFlow,
  isExerciseRegisterMessage,
} from '../helpers/registerFlowParams';
import { wantsAllPets } from '../helpers/petResolver';
import { inferPetNameParam } from '../helpers/inferPetParam';
import { extractCartAction } from '../helpers/cartActions';
import { toolRequiresLlmSynthesis, wrapToolResultForLlm } from '../helpers/toolResponsePolicy';
import { attachProductRecommendations } from '../helpers/petBuddyProductRecommendations';
import { shouldAppendMarketplaceEmptyNotice } from '../helpers/nutritionMarketplaceNotice';

function appendNutritionMarketplaceEmptyNotice(
  response: PetBuddyResponse,
  toolName: string,
  toolResult: unknown,
): void {
  if (toolName !== 'nutrition_analyze_diet' || !toolResult || typeof toolResult !== 'object') return;
  const data = toolResult as Record<string, unknown>;
  const marketplace = data.marketplace_recommendations as Record<string, unknown> | undefined;
  const note = marketplace?.marketplace_availability_note;
  if (typeof note !== 'string' || !note.trim()) return;
  if (!shouldAppendMarketplaceEmptyNotice(response.message, note)) return;
  response.message = response.message ? `${response.message}\n\n${note}` : note;
}

initAiModules();

const MAX_TOOL_STEPS = 8;

const HEALTH_INTENT_PATTERN =
  /\b(salud|bienestar|c[oó]mo est[aá]|como esta|c[oó]mo va|estado de salud|estado general|resumen de salud)\b/i;

/** Tools whose formatted result should be shown directly (avoid LLM rewriting failures). */
const DIRECT_RESPONSE_TOOLS = new Set([
  'nutrition_register_meal',
  'nutrition_create_schedule',
  'nutrition_list_foods',
  'nutrition_deduplicate_scheduled',
  'nutrition_complete_scheduled',
  'exercise_register_session',
  'veterinary_register_visit',
  'veterinary_register_vaccination',
  'veterinary_set_follow_up',
  'veterinary_analyze_document',
  'veterinary_update_session',
  'reminders_create',
  'reminders_update',
  'reminders_complete',
  'pets_create',
  'pets_update',
  'adoption_apply',
  'lost_pets_report',
  'lost_pets_mark_found',
  'breeding_enable_pet',
  'breeding_send_request',
  'profile_update',
  'marketplace_add_favorite',
  'memory_save_fact',
  'memory_delete_fact',
  'cart_add_item',
  'bookings_add_to_cart',
  'veterinary_query_document',
]);

export async function askOpenAi(
  message: string,
  ctx: AiExecutionContext,
  history: ConversationTurn[] = []
): Promise<PetBuddyResponse> {
  if (isActiveNutritionRegisterFlow(history, message)) {
    const params = inferNutritionMealParamsFromConversation(history, message);
    if (wantsAllPets(message.toLowerCase())) params.pet_name = 'todos';
    const incomplete = getRegisterIncompletePrompt('nutrition_register_meal', params, ctx);
    if (incomplete) {
      return { message: incomplete, toolsUsed: [] };
    }
  }

  if (isActiveVeterinaryRegisterFlow(history, message)) {
    const params = inferVeterinaryVisitParamsFromConversation(history, message);
    const petName = inferPetNameParam(message, history, ctx.userPetNames);
    if (petName) params.pet_name = petName;
    else if (wantsAllPets(message.toLowerCase()) && (ctx.userPetNames?.length ?? 0) <= 1) {
      params.pet_name = 'todos';
    }
    const incomplete = getRegisterIncompletePrompt('veterinary_register_visit', params, ctx);
    if (incomplete) {
      return { message: incomplete, toolsUsed: [] };
    }
  }

  if (isActiveExerciseRegisterFlow(history, message)) {
    const params = inferExerciseParamsFromConversation(history, message);
    if (wantsAllPets(message.toLowerCase())) params.pet_name = 'todos';
    const incomplete = getRegisterIncompletePrompt('exercise_register_session', params, ctx);
    if (incomplete) {
      return { message: incomplete, toolsUsed: [] };
    }
  }

  const intentTools = getToolsForIntent(ctx, message, history);
  const tools = intentTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const detectedIntents = detectToolIntents(message, history, ctx.currentPath);
  const intentHint =
    detectedIntents.length > 0
      ? `Intención detectada: ${detectedIntents.join(', ')}. Prioriza herramientas de ese dominio.`
      : '';

  const contextSummary = history.length > 0 ? buildContextSummary(history) : '';
  const veterinaryPageHint =
    ctx.currentPath === '/veterinaria' || ctx.currentPath === '/health-journal' || ctx.currentPath === '/recordatorios'
      ? 'El usuario está en la sección de salud/veterinaria de PetHub. Prioriza herramientas veterinary_*, pet_health_summary y pet_timeline para historial, vacunas, gastos y cronología.'
      : '';

  const preloadedHealthHint = ctx.preloadedHealthContext
    ? `\n${ctx.preloadedHealthContext}\n`
    : '';

  const catalogHint = ctx.providerId
    ? `El usuario tiene perfil de proveedor. Para CREAR productos o servicios por chat:
- NO llames catalog_create_product ni catalog_create_service hasta tener TODOS los campos (excepto imagen).
- Haz UNA pregunta a la vez, en orden.
PRODUCTO (preguntar todos): nombre → categoría → descripción breve → descripción detallada → marca → precio(s) según categoría → stock inicial → alerta stock bajo → peso kg → dimensiones → etiquetas → ¿activo?
SERVICIO (preguntar todos): nombre → categoría → descripción → detalles adicionales → duración minutos → precio(s) por tamaño o único → preparación del cliente → política cancelación → días anticipación máxima → horas anticipación mínima → ¿activo?
- Si el usuario dice "no aplica" en campos opcionales, continúa al siguiente.
- Para grooming: precios por tamaño (price_small/medium/large/extra_large). Gatos en detailed_description.
- Importar URL: catalog_import_from_url con auto_create:false, luego pregunta stock e importa.
- NO uses marketplace_search_products para creación.`
    : 'El usuario NO tiene perfil de proveedor: si intenta crear, llama catalog_create_product y el sistema devolverá instrucciones para registrarse como proveedor. NO uses marketplace_search_products para flujos de creación.';

  const dashboard = getMascotDashboardForRole(ctx.userRole);
  const guideName = BLUEPRINT_MASCOTS[dashboard].name;
  const dashboardLabel = BLUEPRINT_DASHBOARD_LABELS[dashboard];

  const systemPrompt = `Eres ${guideName}, el asistente guía de PetHub Latinoamérica para el ${dashboardLabel}. Tu nombre es ${guideName}; preséntate siempre con ese nombre si el usuario pregunta quién eres o cómo te llamas. Respondes en español, de forma amigable y conversacional — como ChatGPT, no como un formulario ni un reporte automático.
Tienes acceso a herramientas que consultan y modifican la base de datos en tiempo real.

ESTILO CONVERSACIONAL (obligatorio):
- Habla como una persona coherente que conoce al usuario y sus mascotas. Nunca suenes a plantilla ni a máquina de respuestas.
- Cuando uses una herramienta de consulta, INTERPRETA los datos: resume en prosa, calcula totales (gramos, calorías, minutos), destaca lo importante y da contexto.
- Prohibido volcar listas largas línea por línea. Si hay muchos registros, da el total y 1-2 ejemplos representativos.
- Si preguntan "¿cómo está la salud de X?", cuenta la historia en 3-5 frases (nutrición, ejercicio, vet) — no pegues un reporte con emojis.
- Si preguntan cuántos gramos comió, SUMA los gramos del período y responde con el número total.
- Mantén coherencia con el hilo: si ya hablaron de Atis, no cambies de mascota sin razón.

MEMORIA CONVERSACIONAL (muy importante):
- Mantén el hilo de la conversación. Lee los mensajes anteriores antes de responder.
- Si el usuario hace seguimiento ("más información", "dame detalles", "me interesa", "quiero adoptarlo", "sobre Simba"), responde sobre ESE tema sin cambiar de contexto.
- Nombres en adopción NO son mascotas del usuario. Usa adoption_list_pets con query=nombre SOLO cuando el usuario pregunte explícitamente por adopción.
- Si el usuario pregunta por SALUD, BIENESTAR o "cómo está" su mascota → usa pet_health_summary. NUNCA uses adoption_list_pets para consultas de salud.

TIENDA / MARKETPLACE (muy importante):
- "productos", "lista de productos", "todos los productos", "tienda" → marketplace_search_products. NUNCA uses adoption_list_pets.
- "servicios", "lista de servicios" → marketplace_search_services.
- Si el usuario pide productos y dice "no adopción", obedece: es la TIENDA, no mascotas en adopción.
- Para ver todo el catálogo usa marketplace_search_products sin query (limit alto). Para solo el conteo usa marketplace_count_catalog.
- La palabra "adopción" en el nombre de un SERVICIO (ej. "Asesoría en Adopción") NO significa que el usuario quiera mascotas en adopción.

CREACIÓN DE CATÁLOGO:
${catalogHint}
- La imagen NO se pide por chat; el usuario la sube después en el dashboard.
- Si falta cualquier campo, pregunta el siguiente. Solo crea cuando el catálogo esté completo.

MASCOTAS DEL USUARIO (PetHub — ya registradas, NO pidas nombres):
${formatUserPetsForPrompt(ctx)}
- Tienes acceso directo a sus mascotas vía herramientas. NUNCA pidas al usuario que te diga los nombres de sus perros o gatos.
- Si dice "mis perros", "mis tres perros", "mis mascotas", "todos" → usa pet_name="todos" y la herramienta registra para todas automáticamente.
- Si menciona un nombre concreto de la lista, usa ese nombre en pet_name.
- Si hay 1 sola mascota, puedes omitir pet_name.

EJERCICIO (muy importante):
- Para REGISTRAR ejercicio DEBES llamar exercise_register_session. NUNCA digas que guardaste o registraste una actividad si no ejecutaste esa herramienta con éxito.
- Si el usuario menciona caminata, paseo, caminar, minutos de ejercicio o actividad física, usa exercise_register_session — NUNCA nutrition_register_meal.
- NO llames exercise_register_session hasta tener **tipo de actividad** (walk, run, play, etc.) Y **duración en minutos**. Si falta alguno, pregunta al usuario en texto — no muestres confirmación ni llames la herramienta con datos vacíos.
- Si ya dijo para qué mascota(s), reutiliza pet_name="todos" cuando diga mis mascotas / mis tres mascotas / todas.
- Si faltan datos (tipo, duración en minutos), pregunta solo eso — nunca pidas nombres de mascotas.
- Si hay varias mascotas y el usuario quiere registrar para todas, usa pet_name="todos". También puedes usar nombres separados por coma (ej. "Atis, Max").
- Frases como "para todos", "mis tres mascotas", "mis tres perros", "a todas mis mascotas" → pet_name="todos".
- Para consultar historial usa exercise_list_recent.

NUTRICIÓN (muy importante):
- Para REGISTRAR una comida puntual (hoy, ahora) DEBES llamar nutrition_register_meal. NUNCA digas que registraste alimentación sin ejecutar esa herramienta con éxito.
- Si hay varias mascotas y el usuario quiere registrar para todas, usa pet_name="todos". También nombres separados por coma. Frases: "mis tres mascotas", "para todos", "a todas". NUNCA pidas nombres.
- Para CREAR horarios recurrentes o comidas automáticas (ej. todos los días a las 7am y 7pm) DEBES llamar nutrition_create_schedule. NUNCA digas que programaste un horario sin ejecutar esa herramienta con éxito. Para todas las mascotas usa pet_name="todos".
- Los alimentos del catálogo Nutrición (pet_foods) tienen perfil COMPLETO — usa nutrition_get_food_profile. nutrition_analyze_diet detecta déficits y devuelve marketplace_recommendations (productos activos con stock). Si hay déficit de grasa, presenta alimentos altos en grasa u omegas del marketplace y ofrece cart_add_item para comprar.
- Para COMPRAR alimento en la TIENDA usa marketplace_search_products — los productos de alimentos/medicamentos pueden tener ingredients y nutrition (grasa%, proteína%) del proveedor. Prioriza esos datos sobre estimaciones genéricas.
- Registro puntual: necesitas alimento y gramos. Horario recurrente: necesitas horas (times) y mascota si hay varias; alimento y gramos si no hay uno claro en el chat.
- Para CONSULTAR historial de comidas YA REGISTRADAS (pasado) DEBES llamar nutrition_list_recent con hours (ej. 72 para últimas 72 horas). Lista TODOS los registros que devuelve la herramienta; no omitas alimentos ni agrupes inventando conteos.
- Para CONSULTAR comidas PROGRAMADAS futuras (calendario, próximos días, qué viene) DEBES llamar nutrition_list_scheduled con days (ej. 7). NO uses nutrition_list_recent para comidas programadas — ese es solo historial pasado.
- Para MARCAR comidas PROGRAMADAS como completadas (calendario, automated_meals) DEBES llamar nutrition_complete_scheduled. Puedes usar date (YYYY-MM-DD o "30 de junio 2026"), days (próximos N días) o pet_name. NUNCA uses nutrition_register_meal para completar comidas del calendario — ese es solo para anotar comida manual nueva.
- Si el usuario reporta comidas programadas duplicadas, usa nutrition_deduplicate_scheduled.
- Reutiliza datos del chat: mascota, alimento, gramos y horas mencionados antes.
- Si la herramienta devuelve error, repite ese mensaje al usuario; no inventes resultados.

VETERINARIA / SALUD (muy importante):
- Para un RESUMEN INTEGRAL de salud (nutrición vs objetivo, ejercicio, veterinaria, vacunas, recordatorios, tendencias 30 días) usa pet_health_summary. Usar cuando pregunte "cómo está mi mascota", "salud de", "bienestar", "análisis general", "recomendaciones".
- pet_health_summary es para mascotas REGISTRADAS del usuario. NUNCA confundir con mascotas en adopción.
- Para LÍNEA DE TIEMPO o CRONOLOGÍA de eventos (comidas, ejercicio, visitas, vacunas, recordatorios) usa pet_timeline. Usar cuando pregunte "qué pasó", "historial de eventos", "actividad reciente", "últimos eventos".
- Para INSIGHTS, PATRONES y CORRELACIONES (alertas inteligentes, qué revisar, caídas tras visita vet, vacunas sin recordatorio) usa pet_insights.
- Para COMPARAR varias mascotas (quién tiene más ejercicio, diferencias de salud) usa pets_compare. Requiere al menos 2 mascotas registradas.
- Para CONSULTAR historial de visitas veterinarias DEBES usar veterinary_list_sessions. NUNCA inventes visitas ni diagnósticos.
- Para DETALLES de una visita (diagnóstico, tratamiento, receta) usa veterinary_get_session.
- Para VACUNAS (última vacuna, próxima fecha, si está al día) usa veterinary_vaccination_status.
- Para CALENDARIO o vacunas pendientes/recomendadas usa veterinary_vaccination_schedule.
- Para REGISTRAR solo una vacuna (sin visita completa) usa veterinary_register_vaccination.
- Para GASTOS en veterinaria usa veterinary_spending_summary.
- Para REGISTRAR una visita veterinaria DEBES llamar veterinary_register_visit. NUNCA digas que guardaste una visita sin ejecutar esa herramienta con éxito.
- Requiere veterinario y diagnóstico. Una mascota por registro (no uses pet_name="todos").
- Si falta información, pregunta solo lo necesario — nunca pidas nombres de mascotas si ya están en la lista del usuario.
- Para PROGRAMAR seguimiento o recordatorio de vacuna usa veterinary_set_follow_up con follow_up_date.
- Para ANALIZAR o RESUMIR un PDF/documento de resultados usa veterinary_analyze_document. Resume hallazgos sin diagnosticar.
- NO diagnostiques ni prescribas tratamientos. Solo registra o resume lo que el usuario indica o lo que está en PetHub.
- Siempre aclara que la información no sustituye consejo veterinario profesional.
- Para AGENDAR un servicio veterinario en la tienda usa marketplace_search_services con categoría veterinaria — eso es distinto del historial médico.
- Para EDITAR una visita existente usa veterinary_update_session.
- Si el usuario pregunta por análisis de PDF o resultados de laboratorio, usa veterinary_analyze_document (no inventes valores).

RECORDATORIOS (muy importante):
- Para CREAR recordatorios manuales usa reminders_create. Para LISTAR usa reminders_list_mine.
- Para COMPLETAR usa reminders_complete; para EDITAR reminders_update; para ELIMINAR reminders_delete.
- Tipos: feeding, exercise, vet, play, medication, grooming, custom.

MEMORIA A LARGO PLAZO:
- Si el usuario dice "recuerda que", "no olvides" o quiere guardar un dato → memory_save_fact.
- Si pregunta qué recuerdas → memory_list_facts.
- Si quiere olvidar un hecho → memory_delete_fact.
- La memoria también se carga automáticamente desde el servidor (alergias, preferencias, notas).

MASCOTAS / AJUSTES:
- Para LISTAR todas tus mascotas (solo cuando pregunten "mis mascotas", "cuáles tengo") usa pets_list_mine. NUNCA uses pets_list_mine si preguntan por salud, bienestar o mencionan un nombre concreto (ej. "salud de Shaggy").
- Si preguntan "¿cómo está la salud de X?" → SIEMPRE pet_health_summary con pet_name=X. Nunca listes mascotas.
- Para actualizar perfil personal (nombre, teléfono, dirección) usa profile_update.

ADOPCIÓN:
- Para SOLICITAR adopción usa adoption_apply con el nombre de la mascota en adopción.
- Para ver solicitudes enviadas usa adoption_list_my_applications.

PAREJAS:
- Para VER disponibles usa breeding_list_available. Para ACTIVAR cría breeding_enable_pet.
- Para ENVIAR solicitud de pareja usa breeding_send_request.

MASCOTAS PERDIDAS:
- Para REPORTAR usa lost_pets_report (ubicación y teléfono requeridos).
- Para MARCAR como encontrada usa lost_pets_mark_found.

MARKETPLACE:
- Para GUARDAR favoritos usa marketplace_add_favorite después de buscar el producto/servicio.
- Para AGREGAR un producto al carrito usa cart_add_item (requiere confirmación). Primero busca con marketplace_search_products o marketplace_search_semantic.
- Para CONSULTAR disponibilidad de citas usa bookings_search_availability; para RESERVAR con fecha/hora usa bookings_add_to_cart (requiere confirmación).
- Para RASTREAR pedidos usa orders_track.
- Para un RESUMEN DIARIO (citas, alertas, recordatorios) usa pet_briefing.
- Para preguntas específicas sobre analitos en un PDF ya subido usa veterinary_query_document (ej. glucosa, creatinina).

Usuario: ${ctx.userName ?? 'invitado'} | Rol: ${ctx.userRole ?? 'cliente'}
${veterinaryPageHint ? `${veterinaryPageHint}\n` : ''}${preloadedHealthHint}
${ctx.voiceMode ? `MODO VOZ — Latinoamérica, tono joven y cercano (muy importante):
- Habla como un amigo de confianza: cálido, con energía, cero tono de robot ni de call center.
- Español latinoamericano neutro: "tú", nunca "vosotros". Evita modismos de España (vale, mola, coger, ordenador, móvil).
- Frases cortas, máximo 2-3 oraciones. Una idea por frase. Sin listas numeradas, viñetas ni markdown.
- Puedes usar con moderación: "dale", "tranqui", "va", "de una", "buena onda", "listo" — suena natural, no forzado.
- Precios en moneda local cuando aplique (quetzales, pesos, etc.). No escribas emojis.
- Si hay mucha información, resume lo esencial y ofrece ampliar.
- Cierra con UNA pregunta clara cuando falten datos (alimento, gramos, duración, etc.) — nunca pidas nombres de mascotas.` : ''}
${contextSummary ? `Contexto actual: ${contextSummary}` : ''}
${intentHint ? `${intentHint}\n` : ''}

Módulos disponibles:
${aiRegistry.getCapabilitiesSummary(ctx)}`;

  const messages: OpenAiChatMessage[] = [{ role: 'system', content: systemPrompt }];

  for (const turn of history) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      messages.push({ role: turn.role, content: turn.content });
    }
  }

  messages.push({ role: 'user', content: message });

  const toolsUsed: string[] = [];
  let actionLink: PetBuddyResponse['actionLink'];
  let cartAction: PetBuddyResponse['cartAction'];
  let productRecommendations: PetBuddyResponse['productRecommendations'];
  let lastFormattedMessage: string | undefined;

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const useStream = Boolean(ctx.streamResponses && ctx.onStreamDelta);
    const json = await callPetBuddyAgent({
      messages,
      tools,
      stream: useStream,
      loadMemory: step === 0,
      onDelta: ctx.onStreamDelta,
    });
    const choice = json.choices?.[0]?.message;

    if (choice?.tool_calls?.length) {
      messages.push({ role: 'assistant', tool_calls: choice.tool_calls });

      for (const call of choice.tool_calls) {
        let toolName = call.function.name;
        if (
          toolName === 'pets_list_mine' &&
          !/\b(mis mascotas|mi mascota|cu[aá]les mascotas|listar mascotas|qu[eé] mascotas)\b/i.test(message)
        ) {
          const contextText = [message, ...history.slice(-4).map((t) => t.content)].join(' ');
          if (HEALTH_INTENT_PATTERN.test(contextText)) {
            toolName = 'pet_health_summary';
          }
        }

        const tool = aiRegistry.getTool(toolName);
        let params: Record<string, unknown> = {};
        try {
          params = JSON.parse(call.function.arguments || '{}');
        } catch {
          params = inferToolParams(toolName, message, history, ctx.userPetNames);
        }

        if (
          ['pet_health_summary', 'pet_timeline', 'pet_insights', 'pets_compare', 'nutrition_list_recent'].includes(
            toolName,
          ) &&
          !params.pet_name
        ) {
          const inferred = inferPetNameParam(message, history, ctx.userPetNames);
          if (inferred) params.pet_name = inferred;
        }

        if (toolName === 'pet_health_summary' && !params.days_back) {
          params.days_back = 7;
        }

        let toolResult: unknown = { error: 'Tool not found' };
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
          const mod = aiRegistry.getAllModules().find((m) => m.tools.some((t) => t.name === tool.name));
          const formatted = formatToolResult(tool.name, toolResult, mod);
          lastFormattedMessage = formatted.message;
          if (formatted.actionLink) actionLink = formatted.actionLink;
          const toolCartAction = extractCartAction(toolResult);
          if (toolCartAction) cartAction = toolCartAction;
          const recDraft: PetBuddyResponse = {
            message: '',
            toolsUsed: [],
            productRecommendations,
          };
          attachProductRecommendations(recDraft, tool.name, toolResult);
          productRecommendations = recDraft.productRecommendations;

          if (DIRECT_RESPONSE_TOOLS.has(tool.name)) {
            const data = toolResult as Record<string, unknown>;
            if (
              data?.success ||
              data?.foods ||
              data?.answer ||
              (data?.error && data?.message)
            ) {
              return { message: formatted.message, toolsUsed, actionLink, cartAction, productRecommendations };
            }
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: toolRequiresLlmSynthesis(tool.name)
            ? wrapToolResultForLlm(tool.name, toolResult)
            : JSON.stringify(toolResult),
        });
      }
      continue;
    }

    if (choice?.content) {
      return {
        message: choice.content,
        toolsUsed,
        actionLink,
        cartAction,
        productRecommendations,
        streamed: useStream,
      };
    }
    break;
  }

  if (lastFormattedMessage) {
    return { message: lastFormattedMessage, toolsUsed, actionLink, cartAction, productRecommendations };
  }

  return {
    message: 'No pude procesar tu consulta. Intenta reformularla.',
    toolsUsed,
    actionLink,
    cartAction,
    productRecommendations,
  };
}

/** Run a read tool and ask the LLM to answer conversationally from the JSON result. */
export async function synthesizeToolResult(
  userMessage: string,
  history: ConversationTurn[],
  ctx: AiExecutionContext,
  toolName: string,
  toolResult: unknown,
): Promise<PetBuddyResponse> {
  const dashboard = getMascotDashboardForRole(ctx.userRole);
  const guideName = BLUEPRINT_MASCOTS[dashboard].name;
  const useStream = Boolean(ctx.streamResponses && ctx.onStreamDelta);

  const messages: OpenAiChatMessage[] = [
    {
      role: 'system',
      content:
        `Eres ${guideName}, asistente de PetHub. Responde en español latino, tono cálido y natural como ChatGPT. ` +
        'Interpreta los datos de la herramienta: resume en prosa, no listes reportes ni uses markdown pesado. ' +
        'Calcula totales si aplica. Máximo 4-6 oraciones salvo que el usuario pida detalle.',
    },
  ];

  for (const turn of history) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      messages.push({ role: turn.role, content: turn.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  messages.push({
    role: 'assistant',
    content: `Consulté la herramienta ${toolName}. Datos:\n${wrapToolResultForLlm(toolName, toolResult)}`,
  });
  messages.push({
    role: 'user',
    content: 'Con esos datos, responde al usuario de forma conversacional y clara.',
  });

  const json = await callPetBuddyAgent({
    messages,
    tools: [],
    stream: useStream,
    loadMemory: false,
    onDelta: ctx.onStreamDelta,
  });

  const text = json.choices?.[0]?.message?.content?.trim();
  const response: PetBuddyResponse = { message: '', toolsUsed: [toolName], streamed: useStream };
  attachProductRecommendations(response, toolName, toolResult);

  if (text) {
    response.message = text;
    appendNutritionMarketplaceEmptyNotice(response, toolName, toolResult);
    return response;
  }

  const formatted = formatToolResult(toolName, toolResult, undefined);
  response.message = formatted.message;
  appendNutritionMarketplaceEmptyNotice(response, toolName, toolResult);
  return response;
}
