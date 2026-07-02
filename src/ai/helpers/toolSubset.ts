import type { AiExecutionContext, AiToolDefinition, ConversationTurn } from '../types';
import { aiRegistry } from '../registry';

export type ToolIntent =
  | 'health'
  | 'nutrition'
  | 'exercise'
  | 'veterinary'
  | 'marketplace'
  | 'adoption'
  | 'lost_pets'
  | 'pets'
  | 'orders'
  | 'reminders'
  | 'catalog'
  | 'breeding'
  | 'settings'
  | 'memory'
  | 'bookings'
  | 'cart'
  | 'briefing'
  | 'general';

const TOOL_PREFIX_INTENT: Array<{ prefix: string; intent: ToolIntent }> = [
  { prefix: 'pet_health', intent: 'health' },
  { prefix: 'pet_timeline', intent: 'health' },
  { prefix: 'pet_insights', intent: 'health' },
  { prefix: 'pets_compare', intent: 'health' },
  { prefix: 'nutrition_', intent: 'nutrition' },
  { prefix: 'exercise_', intent: 'exercise' },
  { prefix: 'veterinary_', intent: 'veterinary' },
  { prefix: 'marketplace_', intent: 'marketplace' },
  { prefix: 'adoption_', intent: 'adoption' },
  { prefix: 'lost_pets_', intent: 'lost_pets' },
  { prefix: 'pets_', intent: 'pets' },
  { prefix: 'orders_', intent: 'orders' },
  { prefix: 'reminders_', intent: 'reminders' },
  { prefix: 'catalog_', intent: 'catalog' },
  { prefix: 'breeding_', intent: 'breeding' },
  { prefix: 'profile_', intent: 'settings' },
  { prefix: 'shelters_', intent: 'adoption' },
  { prefix: 'memory_', intent: 'memory' },
  { prefix: 'bookings_', intent: 'bookings' },
  { prefix: 'cart_', intent: 'cart' },
  { prefix: 'pet_briefing', intent: 'briefing' },
];

const INTENT_PATTERNS: Array<{ intent: ToolIntent; pattern: RegExp }> = [
  {
    intent: 'health',
    pattern:
      /\b(salud|bienestar|c[oó]mo est[aá]|insights|patrones|comparar|l[ií]nea de tiempo|cronolog[ií]a)\b/i,
  },
  { intent: 'nutrition', pattern: /\b(nutrici[oó]n|comida|aliment|gramos|horario de comida|desayuno|cena)\b/i },
  { intent: 'exercise', pattern: /\b(ejercicio|paseo|caminata|actividad f[ií]sica|minutos de)\b/i },
  {
    intent: 'veterinary',
    pattern: /\b(veterinari|vet\b|vacuna|diagn[oó]stico|tratamiento|visita m[eé]dica|laboratorio|pdf)\b/i,
  },
  { intent: 'marketplace', pattern: /\b(producto|productos|tienda|servicio|servicios|comprar|precio|marketplace|carrito|reservar|agendar)\b/i },
  { intent: 'adoption', pattern: /\b(adopci[oó]n|adoptar|albergue|refugio)\b/i },
  { intent: 'lost_pets', pattern: /\b(perdid[oa]|extraviad|desaparecid)\b/i },
  { intent: 'pets', pattern: /\b(mis mascotas|mi mascota|crear mascota|registrar mascota)\b/i },
  { intent: 'orders', pattern: /\b(mis [oó]rdenes|pedidos|compras|reservas|rastrear|seguimiento|estado del pedido)\b/i },
  { intent: 'bookings', pattern: /\b(disponibilidad|horarios disponibles|agendar cita|reservar servicio)\b/i },
  { intent: 'cart', pattern: /\b(carrito|agrégalo|agregalo|añadir al carrito|quiero comprarlo)\b/i },
  { intent: 'briefing', pattern: /\b(briefing|resumen del d[ií]a|qu[eé] tengo hoy|plan del d[ií]a)\b/i },
  { intent: 'reminders', pattern: /\b(recordatorio|recordatorios|recu[eé]rdame)\b/i },
  { intent: 'catalog', pattern: /\b(crear producto|crear servicio|cat[aá]logo|importar url)\b/i },
  { intent: 'breeding', pattern: /\b(pareja|cruza|cr[ií]a|reproducci[oó]n)\b/i },
  { intent: 'memory', pattern: /\b(recuerda|recuerdas|memoria|olvida|no olvides|guarda que)\b/i },
];

const PATH_INTENTS: Record<string, ToolIntent[]> = {
  '/health-journal': ['health', 'nutrition', 'exercise', 'veterinary', 'reminders'],
  '/veterinaria': ['veterinary', 'health', 'reminders'],
  '/recordatorios': ['reminders', 'health'],
  '/nutricion': ['nutrition', 'health'],
  '/trazabilidad': ['exercise', 'health'],
  '/marketplace': ['marketplace', 'bookings', 'cart'],
  '/cart': ['cart', 'marketplace'],
  '/adopcion': ['adoption'],
  '/parejas': ['breeding', 'pets'],
  '/client-orders': ['orders'],
  '/provider-dashboard': ['catalog', 'orders', 'marketplace'],
};

const ROLE_DEFAULT_INTENTS: Record<string, ToolIntent[]> = {
  client: ['pets', 'health', 'marketplace', 'bookings', 'cart', 'orders', 'briefing', 'reminders', 'memory', 'general'],
  provider: ['catalog', 'orders', 'marketplace', 'settings', 'memory', 'general'],
  shelter: ['adoption', 'pets', 'settings', 'memory', 'general'],
};

const ALWAYS_TOOL_NAMES = new Set([
  'pets_list_mine',
  'profile_get_mine',
  'memory_list_facts',
  'memory_save_fact',
]);

function toolIntent(toolName: string): ToolIntent {
  for (const { prefix, intent } of TOOL_PREFIX_INTENT) {
    if (toolName.startsWith(prefix) || toolName === prefix.replace(/_$/, '')) {
      return intent;
    }
  }
  return 'general';
}

export function detectToolIntents(
  message: string,
  history: ConversationTurn[] = [],
  currentPath?: string,
): ToolIntent[] {
  const intents = new Set<ToolIntent>();
  const text = [message, ...history.slice(-4).map((t) => t.content)].join(' ').toLowerCase();

  for (const { intent, pattern } of INTENT_PATTERNS) {
    if (pattern.test(text)) intents.add(intent);
  }

  if (currentPath && PATH_INTENTS[currentPath]) {
    for (const intent of PATH_INTENTS[currentPath]) intents.add(intent);
  }

  for (const turn of history.slice(-3)) {
    for (const tool of turn.toolsUsed ?? []) {
      intents.add(toolIntent(tool));
    }
  }

  if (intents.size === 0) intents.add('general');
  return [...intents];
}

function expandRelatedIntents(intents: ToolIntent[]): Set<ToolIntent> {
  const expanded = new Set(intents);
  if (expanded.has('health')) {
    expanded.add('nutrition');
    expanded.add('exercise');
    expanded.add('veterinary');
    expanded.add('reminders');
  }
  if (expanded.has('veterinary')) expanded.add('health');
  if (expanded.has('nutrition') || expanded.has('exercise')) expanded.add('health');
  if (expanded.has('marketplace')) {
    expanded.add('cart');
    expanded.add('bookings');
  }
  if (expanded.has('orders')) expanded.add('bookings');
  return expanded;
}

/** Filter tools by role, provider access, and detected intent to reduce LLM noise. */
export function getToolsForIntent(
  ctx: AiExecutionContext,
  message: string,
  history: ConversationTurn[] = [],
): AiToolDefinition[] {
  const role = ctx.userRole ?? 'client';
  const roleDefaults = ROLE_DEFAULT_INTENTS[role] ?? ROLE_DEFAULT_INTENTS.client;
  const detected = detectToolIntents(message, history, ctx.currentPath);
  const allowedIntents = expandRelatedIntents(new Set([...roleDefaults, ...detected]));

  const allTools = aiRegistry.getToolsForContext(ctx);

  const filtered = allTools.filter((tool) => {
    if (ALWAYS_TOOL_NAMES.has(tool.name)) return true;
    const intent = toolIntent(tool.name);
    if (intent === 'general') return allowedIntents.has('general') || detected.length <= 1;
    return allowedIntents.has(intent);
  });

  const minTools = 12;
  if (filtered.length < minTools) {
    const names = new Set(filtered.map((t) => t.name));
    for (const tool of allTools) {
      if (filtered.length >= minTools) break;
      if (!names.has(tool.name)) {
        filtered.push(tool);
        names.add(tool.name);
      }
    }
  }

  const maxTools = role === 'provider' ? 36 : 32;
  return filtered.slice(0, maxTools);
}

export function getIntentLabel(intents: ToolIntent[]): string {
  return intents.join(', ');
}
