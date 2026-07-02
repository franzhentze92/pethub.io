import type { ConversationTurn } from '../types';

export const PRODUCT_CATEGORIES = [
  'alimentos',
  'juguetes',
  'accesorios',
  'higiene',
  'medicamentos',
  'ropa',
  'camas',
  'transporte',
  'otro',
] as const;

export const SERVICE_CATEGORIES = [
  'veterinaria',
  'grooming',
  'entrenamiento',
  'alojamiento',
  'transporte',
  'fisioterapia',
  'nutricion',
  'otro',
] as const;

const SKIP_PATTERN =
  /^(no|ninguno|ninguna|no aplica|n\/a|na|saltar|omitir|sin marca|no tiene|no tengo|pasar|siguiente|no gracias)[!.?\s]*$/i;

const FIELD_QUESTION_PATTERNS: Record<string, RegExp> = {
  product_name: /nombre del producto|cómo se llama.*producto/i,
  product_category: /en qué categoría|qué categoría.*producto/i,
  description: /descripción breve del producto/i,
  detailed_description: /descripción detallada|detalles adicionales/i,
  brand: /marca del producto|cuál es la marca/i,
  pricing: /precio por talla|precio por tamaño|cuál es el precio/i,
  stock_quantity: /stock inicial|unidades en stock/i,
  min_stock_alert: /alerta de stock bajo/i,
  weight_kg: /peso del producto/i,
  dimensions_cm: /dimensiones/i,
  tags: /etiquetas para búsqueda/i,
  is_active: /producto activo|publicamos el producto/i,
  service_name: /nombre del servicio/i,
  service_category: /categoría.*servicio|qué categoría es/i,
  duration_minutes: /dura el servicio|duración.*minutos/i,
  preparation_instructions: /preparar el cliente/i,
  cancellation_policy: /política de cancelación/i,
  max_advance_booking_days: /días de anticipación máxima/i,
  min_advance_booking_hours: /horas mínimas de anticipación/i,
};

export function isSkipMessage(message: string): boolean {
  return SKIP_PATTERN.test(message.trim());
}

export function assistantAskedForField(history: ConversationTurn[], field: string): boolean {
  const pattern = FIELD_QUESTION_PATTERNS[field];
  if (!pattern) return false;
  return history
    .slice(-6)
    .some((t) => t.role === 'assistant' && pattern.test(t.content));
}

/** @deprecated use assistantAskedForField(history, 'stock_quantity') */
export function assistantAskedForStock(history: ConversationTurn[]): boolean {
  return assistantAskedForField(history, 'stock_quantity');
}

export function buildConversationText(history: ConversationTurn[], currentMessage?: string): string {
  return [...history, ...(currentMessage ? [{ role: 'user' as const, content: currentMessage }] : [])]
    .map((t) => t.content)
    .join('\n');
}

export function isCatalogCreateFlow(history: ConversationTurn[], message?: string): boolean {
  const text = buildConversationText(history, message).toLowerCase();
  return (
    /\b(crear producto|nuevo producto|agregar producto|publicar producto|catalog_create_product)\b/.test(
      text
    ) || /\bcrea producto:/i.test(text)
  );
}

export function isServiceCreateFlow(history: ConversationTurn[], message?: string): boolean {
  const text = buildConversationText(history, message).toLowerCase();
  return (
    /\b(crear servicio|nuevo servicio|agregar servicio|publicar servicio|catalog_create_service|servicio de grooming)\b/.test(
      text
    ) || /\bagrega(?:r)?\s+servicio\b/.test(text)
  );
}

export function normalizeCategory(value: string): string {
  const key = value.toLowerCase().trim();
  const map: Record<string, string> = {
    accesorio: 'accesorios',
    accesorios: 'accesorios',
    alimento: 'alimentos',
    alimentos: 'alimentos',
    juguete: 'juguetes',
    juguetes: 'juguetes',
    higiene: 'higiene',
    medicamento: 'medicamentos',
    medicamentos: 'medicamentos',
    ropa: 'ropa',
    cama: 'camas',
    camas: 'camas',
    transporte: 'transporte',
    otro: 'otro',
  };
  return map[key] ?? key;
}

export function normalizeServiceCategory(value: string): string {
  const key = value.toLowerCase().trim();
  const map: Record<string, string> = {
    veterinaria: 'veterinaria',
    vet: 'veterinaria',
    grooming: 'grooming',
    peluquería: 'grooming',
    peluqueria: 'grooming',
    baño: 'grooming',
    entrenamiento: 'entrenamiento',
    alojamiento: 'alojamiento',
    hospedaje: 'alojamiento',
    transporte: 'transporte',
    fisioterapia: 'fisioterapia',
    nutricion: 'nutricion',
    nutrición: 'nutricion',
    otro: 'otro',
  };
  return map[key] ?? (SERVICE_CATEGORIES.includes(key as (typeof SERVICE_CATEGORIES)[number]) ? key : 'otro');
}

export function extractPrice(text: string): number | undefined {
  const match =
    text.match(/precio[:\s]*Q\.?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/Q\.?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/\b(\d+(?:\.\d+)?)\s*(?:quetzales|gtq)\b/i);
  return match ? Number(match[1]) : undefined;
}

export function extractProductName(text: string): string | undefined {
  const patterns = [
    /nombre del producto[:\s]*\*?\*?([^*\n]+?)\*?\*?(?:\n|$)/i,
    /(?:crea(?:r)? producto|nuevo producto)[:\s]+([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      let name = match[1].trim();
      name = name.replace(/\s*Q\.?\s*\d+(?:\.\d+)?.*$/i, '').trim();
      name = name.replace(/,\s*categor.*$/i, '').trim();
      if (name.length >= 2) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  if (assistantAskedForFieldFromText(text, 'product_name')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && lastLine.length >= 2 && !isSkipMessage(lastLine) && !/^\d+$/.test(lastLine)) {
      return lastLine.charAt(0).toUpperCase() + lastLine.slice(1);
    }
  }
  return undefined;
}

function assistantAskedForFieldFromText(text: string, field: string): boolean {
  const pattern = FIELD_QUESTION_PATTERNS[field];
  if (!pattern) return false;
  const lines = text.split('\n');
  for (let i = lines.length - 2; i >= Math.max(0, lines.length - 8); i--) {
    if (pattern.test(lines[i])) return true;
  }
  return false;
}

export function extractDescription(text: string): string | undefined {
  const labeled =
    text.match(/descripción breve[:\s]*([^\n]+)/i) ||
    text.match(/descripción[:\s]*([^\n]+)/i) ||
    text.match(/-\s*Descripción:\s*([^\n]+)/i);
  if (labeled?.[1]) return labeled[1].trim();

  if (assistantAskedForFieldFromText(text, 'description')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && lastLine.length >= 10 && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractDetailedDescription(text: string): string | undefined {
  const labeled =
    text.match(/descripción detallada[:\s]*([^\n]+(?:\n(?!\w+ del)[^\n]+)*)/i) ||
    text.match(/detalles adicionales[:\s]*([^\n]+)/i);
  if (labeled?.[1]?.trim()) return labeled[1].trim();
  return undefined;
}

export function extractCategory(text: string): string | undefined {
  const match =
    text.match(/categor[ií]a[:\s]*\*?\*?([^*\n]+?)\*?\*?(?:\n|$)/i) ||
    text.match(/categoria\s+([a-záéíóúñ]+)/i);
  if (match?.[1]) return normalizeCategory(match[1]);

  if (assistantAskedForFieldFromText(text, 'product_category')) {
    const lastLine = text.split('\n').pop()?.trim().toLowerCase();
    if (lastLine && PRODUCT_CATEGORIES.includes(lastLine as (typeof PRODUCT_CATEGORIES)[number])) {
      return lastLine;
    }
    if (lastLine) return normalizeCategory(lastLine);
  }
  return undefined;
}

export function extractBrand(text: string): string | undefined {
  const match = text.match(/marca[:\s]*([^\n,]+)/i);
  if (match?.[1]?.trim()) return match[1].trim();

  if (assistantAskedForFieldFromText(text, 'brand')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractStockQuantity(text: string): number | undefined {
  const patterns = [
    /stock\s*(?:inicial)?[:\s]*(\d+)/i,
    /inventario\s*(?:inicial)?[:\s]*(\d+)/i,
    /(\d+)\s*unidades?/i,
    /(?:tengo|pon|poner|dejar|con)\s*(\d+)\s*(?:en\s*stock|de\s*stock|unidades?)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] !== undefined) {
      const qty = Number(match[1]);
      if (Number.isFinite(qty) && qty >= 0) return qty;
    }
  }
  return undefined;
}

export function extractStockOnlyMessage(message: string): number | null {
  const trimmed = message.trim();
  if (/^\d+$/.test(trimmed)) {
    const qty = Number(trimmed);
    return Number.isFinite(qty) && qty >= 0 ? qty : null;
  }
  const stock = extractStockQuantity(trimmed);
  return stock !== undefined ? stock : null;
}

export function extractMinStockAlert(text: string): number | undefined {
  const match =
    text.match(/alerta.*?(\d+)/i) ||
    text.match(/stock bajo[:\s]*(\d+)/i) ||
    text.match(/mínimo.*?(\d+)/i);
  if (match?.[1]) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (assistantAskedForFieldFromText(text, 'min_stock_alert')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && /^\d+$/.test(lastLine)) return Number(lastLine);
  }
  return undefined;
}

export function extractWeightKg(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*kg/i) || text.match(/peso[:\s]*(\d+(?:\.\d+)?)/i);
  if (match?.[1]) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (assistantAskedForFieldFromText(text, 'weight_kg')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && /^\d+(?:\.\d+)?$/.test(lastLine)) return Number(lastLine);
  }
  return undefined;
}

export function extractDimensionsCm(text: string): string | undefined {
  const match =
    text.match(/dimensiones[:\s]*([^\n]+)/i) ||
    text.match(/(\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?)?\s*cm?)/i);
  if (match?.[1]?.trim()) return match[1].trim();

  if (assistantAskedForFieldFromText(text, 'dimensions_cm')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractTags(text: string): string[] | undefined {
  const match = text.match(/etiquetas?[:\s]*([^\n]+)/i) || text.match(/tags[:\s]*([^\n]+)/i);
  if (match?.[1]) {
    return match[1]
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (assistantAskedForFieldFromText(text, 'tags')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && !isSkipMessage(lastLine)) {
      return lastLine.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    }
  }
  return undefined;
}

export function extractIsActive(text: string): boolean | undefined {
  const lower = text.toLowerCase();
  if (/\b(no publicar|inactivo|oculto)\b/.test(lower)) return false;
  if (/\b(sí|si|activo|publicar|visible)\b/.test(lower) && assistantAskedForFieldFromText(text, 'is_active')) {
    return true;
  }
  return undefined;
}

function extractSizePrice(text: string, sizePattern: RegExp): number | undefined {
  const segmentMatch = text.match(
    new RegExp(
      `(\\d+(?:\\.\\d+)?)[^\\n.,;]*${sizePattern.source}|${sizePattern.source}[^\\n.,;]*(\\d+(?:\\.\\d+)?)`,
      'i'
    )
  );
  if (!segmentMatch) return undefined;
  const value = segmentMatch[1] ?? segmentMatch[2];
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

export function extractDogSizePrices(text: string): {
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
} {
  return {
    price_small: extractSizePrice(text, /pequeñ[oa]|small|\bS\b(?!\s*Q)/i),
    price_medium: extractSizePrice(text, /median[oa]|medium|\bM\b/i),
    price_large: extractSizePrice(text, /grand[ea](?!\s*extra)|large(?!\s*extra)|\bL\b/i),
    price_extra_large: extractSizePrice(text, /extra\s*grand[ea]|extra\s*large|\bxl\b/i),
  };
}

export function extractClothingSizePrices(text: string): {
  price_xs?: number;
  price_s?: number;
  price_m?: number;
  price_l?: number;
  price_xl?: number;
  price_xxl?: number;
} {
  return {
    price_xs: extractSizePrice(text, /\bxs\b/i),
    price_s: extractSizePrice(text, /\btalla\s*s\b|\bs\s*Q/i),
    price_m: extractSizePrice(text, /\btalla\s*m\b|\bm\s*Q/i),
    price_l: extractSizePrice(text, /\btalla\s*l\b|\bl\s*Q/i),
    price_xl: extractSizePrice(text, /\bxl\b(?!\s*l)/i),
    price_xxl: extractSizePrice(text, /\bxxl\b/i),
  };
}

export function extractServiceName(text: string): string | undefined {
  const patterns = [
    /nombre del servicio[:\s]*\*?\*?([^*\n]+?)\*?\*?(?:\n|$)/i,
    /(?:servicio de\s+)?grooming\s+([A-Za-zÁÉÍÓÚáéíóúÑñ0-9][^\n,]*)/i,
    /(?:crea(?:r)? servicio|nuevo servicio|agregar servicio)[:\s]+([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      let name = match[1].trim();
      name = name.replace(/\s*Q\.?\s*\d+(?:\.\d+)?.*$/i, '').trim();
      name = name.replace(/,\s*(?:categor|descrip).*$/i, '').trim();
      if (name.length >= 2) return name;
    }
  }
  if (assistantAskedForFieldFromText(text, 'service_name')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && lastLine.length >= 2 && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractServiceDescription(text: string): string | undefined {
  const labeled = extractDescription(text);
  if (labeled) return labeled;

  const premium = text.match(/servicio\s+premium\s+de\s+[^\n.]+/i);
  if (premium?.[0]) return premium[0].trim();

  if (assistantAskedForFieldFromText(text, 'description')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && lastLine.length >= 10 && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractServiceCategory(text: string): string | undefined {
  const labeled = text.match(/categor[ií]a(?: del servicio)?[:\s]*\*?\*?([^*\n]+?)\*?\*?(?:\n|$)/i);
  if (labeled?.[1]) return normalizeServiceCategory(labeled[1]);

  const lower = text.toLowerCase();
  if (/\bgrooming\b|\bpeluquer[ií]a\b|\bbaño\b/.test(lower)) return 'grooming';
  if (/\bveterinar/.test(lower)) return 'veterinaria';
  if (/\bentrenamiento\b/.test(lower)) return 'entrenamiento';
  if (/\balojamiento\b|\bhospedaje\b/.test(lower)) return 'alojamiento';
  if (/\btransporte\b/.test(lower)) return 'transporte';
  if (/\bfisioterapia\b/.test(lower)) return 'fisioterapia';
  if (/\bnutrici[oó]n\b/.test(lower)) return 'nutricion';

  if (assistantAskedForFieldFromText(text, 'service_category')) {
    const lastLine = text.split('\n').pop()?.trim().toLowerCase();
    if (lastLine) return normalizeServiceCategory(lastLine);
  }
  return undefined;
}

export function extractDurationMinutes(text: string): number | undefined {
  const hourMatch =
    text.match(/(\d+(?:\.\d+)?)\s*horas?/i) || text.match(/una\s+hora/i) || text.match(/media\s+hora/i);
  if (hourMatch) {
    if (/una\s+hora/i.test(hourMatch[0])) return 60;
    if (/media\s+hora/i.test(hourMatch[0])) return 30;
    const hours = Number(hourMatch[1]);
    if (Number.isFinite(hours) && hours > 0) return Math.round(hours * 60);
  }

  const minMatch =
    text.match(/duraci[oó]n[:\s]*(\d+)\s*min/i) ||
    text.match(/(\d+)\s*minutos?/i) ||
    text.match(/tiempo[:\s]*(\d+)\s*min/i);
  if (minMatch?.[1]) {
    const mins = Number(minMatch[1]);
    if (Number.isFinite(mins) && mins > 0) return mins;
  }

  if (assistantAskedForFieldFromText(text, 'duration_minutes')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && /^\d+$/.test(lastLine)) return Number(lastLine);
  }
  return undefined;
}

export function extractServiceSizePrices(text: string): {
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
} {
  return extractDogSizePrices(text);
}

export function extractAveragePrice(text: string): number | undefined {
  const match =
    text.match(/promedio[^0-9]*(\d+(?:\.\d+)?)/i) ||
    text.match(/precio\s+(?:único|unico|general|base)[^0-9]*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : undefined;
}

export function extractCatPriceNote(text: string): string | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)[^.\n]*(?:gato|gatos|felino|felinos)/i);
  if (!match) return undefined;
  return `Precio para gatos: Q.${Number(match[1]).toFixed(2)}`;
}

export function extractPreparationInstructions(text: string): string | undefined {
  const match = text.match(/preparaci[oó]n[:\s]*([^\n]+)/i) || text.match(/preparar[:\s]*([^\n]+)/i);
  if (match?.[1]?.trim()) return match[1].trim();

  if (assistantAskedForFieldFromText(text, 'preparation_instructions')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractCancellationPolicy(text: string): string | undefined {
  const match = text.match(/cancelaci[oó]n[:\s]*([^\n]+)/i) || text.match(/política[:\s]*([^\n]+)/i);
  if (match?.[1]?.trim()) return match[1].trim();

  if (assistantAskedForFieldFromText(text, 'cancellation_policy')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && !isSkipMessage(lastLine)) return lastLine;
  }
  return undefined;
}

export function extractAdvanceBookingDays(text: string): number | undefined {
  const match = text.match(/(\d+)\s*d[ií]as?\s*(?:de\s*)?anticipaci[oó]n/i) || text.match(/máximo[:\s]*(\d+)\s*d[ií]as/i);
  if (match?.[1]) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (assistantAskedForFieldFromText(text, 'max_advance_booking_days')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && /^\d+$/.test(lastLine)) return Number(lastLine);
  }
  return undefined;
}

export function extractAdvanceBookingHours(text: string): number | undefined {
  const match = text.match(/(\d+)\s*horas?\s*(?:de\s*)?anticipaci[oó]n/i) || text.match(/mínimo[:\s]*(\d+)\s*horas/i);
  if (match?.[1]) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (assistantAskedForFieldFromText(text, 'min_advance_booking_hours')) {
    const lastLine = text.split('\n').pop()?.trim();
    if (lastLine && /^\d+$/.test(lastLine)) return Number(lastLine);
  }
  return undefined;
}

export function formatStockQuestion(draft: {
  product_name: string;
  product_category: string;
  description: string;
  price: number;
  brand?: string;
}): string {
  const brandLine = draft.brand ? `\n• Marca: ${draft.brand}` : '';
  return (
    `Perfecto, tengo estos datos del producto:\n\n` +
    `• **${draft.product_name}** (${draft.product_category})${brandLine}\n` +
    `• Descripción: ${draft.description}\n` +
    `• Precio: Q.${Number(draft.price).toFixed(2)}\n\n` +
    `¿Cuántas unidades quieres tener en **stock inicial**? (ej. 10, 50, 100)`
  );
}

/** @deprecated use getProductCatalogFlow */
export function extractProductDraftFields(
  history: ConversationTurn[],
  currentMessage?: string
): Record<string, unknown> | null {
  if (!isCatalogCreateFlow(history, currentMessage)) return null;
  const text = buildConversationText(history, currentMessage);
  const product_name = extractProductName(text);
  const product_category = extractCategory(text);
  const description = extractDescription(text);
  const price = extractPrice(text);
  if (!product_name || !product_category || !description || price === undefined) return null;
  return {
    product_name,
    product_category,
    description,
    price,
    currency: 'GTQ',
    is_active: true,
  };
}

export function resolveStockFromConversation(
  history: ConversationTurn[],
  currentMessage?: string
): number | undefined {
  const text = buildConversationText(history, currentMessage);
  return extractStockQuantity(text);
}

/** @deprecated use getProductCatalogFlow */
export function extractPendingProductDraft(
  history: ConversationTurn[],
  currentMessage?: string
): Record<string, unknown> | null {
  const fields = extractProductDraftFields(history, currentMessage);
  if (!fields) return null;
  const stock =
    resolveStockFromConversation(history, currentMessage) ??
    (assistantAskedForStock(history) && currentMessage
      ? extractStockOnlyMessage(currentMessage) ?? undefined
      : undefined);
  if (stock === undefined) return null;
  return { ...fields, stock_quantity: stock };
}

/** @deprecated use getServiceCatalogFlow */
export function extractServiceDraftFields(
  history: ConversationTurn[],
  currentMessage?: string
): Record<string, unknown> | null {
  if (!isServiceCreateFlow(history, currentMessage)) return null;
  const text = buildConversationText(history, currentMessage);
  const service_name = extractServiceName(text);
  const service_category = extractServiceCategory(text);
  const description = extractServiceDescription(text);
  const duration_minutes = extractDurationMinutes(text);
  const sizePrices = extractServiceSizePrices(text);
  const averagePrice = extractAveragePrice(text);
  const singlePrice = extractPrice(text);
  const catNote = extractCatPriceNote(text);
  const hasPricing =
    singlePrice !== undefined ||
    averagePrice !== undefined ||
    Object.values(sizePrices).some((v) => v !== undefined);
  if (!service_name || !service_category || !description || !hasPricing) return null;
  const price =
    averagePrice ??
    (singlePrice !== undefined && !Object.values(sizePrices).some(Boolean) ? singlePrice : undefined);
  return {
    service_name,
    service_category,
    description,
    ...(price !== undefined ? { price } : {}),
    ...sizePrices,
    ...(catNote ? { detailed_description: catNote } : {}),
    ...(duration_minutes !== undefined ? { duration_minutes } : {}),
    currency: 'GTQ',
    is_active: true,
  };
}

/** @deprecated use getServiceCatalogFlow */
export function extractPendingServiceDraft(
  history: ConversationTurn[],
  currentMessage?: string
): Record<string, unknown> | null {
  const fields = extractServiceDraftFields(history, currentMessage);
  if (!fields || fields.duration_minutes === undefined) return null;
  return fields;
}
