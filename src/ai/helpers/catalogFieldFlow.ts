import type { ConversationTurn } from '../types';
import { getPricingConfig, hasSizePricing } from '@/config/productPricing';
import { hasServiceSizePricing } from '@/config/servicePricing';
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
  buildConversationText,
  isCatalogCreateFlow,
  isServiceCreateFlow,
  isSkipMessage,
  assistantAskedForField,
  extractProductName,
  extractCategory,
  extractDescription,
  extractDetailedDescription,
  extractBrand,
  extractPrice,
  extractStockQuantity,
  extractStockOnlyMessage,
  extractMinStockAlert,
  extractWeightKg,
  extractDimensionsCm,
  extractTags,
  extractIsActive,
  extractDogSizePrices,
  extractClothingSizePrices,
  extractServiceName,
  extractServiceCategory,
  extractServiceDescription,
  extractDurationMinutes,
  extractServiceSizePrices,
  extractAveragePrice,
  extractCatPriceNote,
  extractPreparationInstructions,
  extractCancellationPolicy,
  extractAdvanceBookingDays,
  extractAdvanceBookingHours,
  normalizeCategory,
  normalizeServiceCategory,
} from './catalogDraftExtractors';

export type ProductFieldKey =
  | 'product_name'
  | 'product_category'
  | 'description'
  | 'detailed_description'
  | 'brand'
  | 'pricing'
  | 'stock_quantity'
  | 'min_stock_alert'
  | 'weight_kg'
  | 'dimensions_cm'
  | 'tags'
  | 'is_active';

export type ServiceFieldKey =
  | 'service_name'
  | 'service_category'
  | 'description'
  | 'detailed_description'
  | 'duration_minutes'
  | 'pricing'
  | 'preparation_instructions'
  | 'cancellation_policy'
  | 'max_advance_booking_days'
  | 'min_advance_booking_hours'
  | 'is_active';

const PRODUCT_FIELD_ORDER: ProductFieldKey[] = [
  'product_name',
  'product_category',
  'description',
  'detailed_description',
  'brand',
  'pricing',
  'stock_quantity',
  'min_stock_alert',
  'weight_kg',
  'dimensions_cm',
  'tags',
  'is_active',
];

const SERVICE_FIELD_ORDER: ServiceFieldKey[] = [
  'service_name',
  'service_category',
  'description',
  'detailed_description',
  'duration_minutes',
  'pricing',
  'preparation_instructions',
  'cancellation_policy',
  'max_advance_booking_days',
  'min_advance_booking_hours',
  'is_active',
];

const OPTIONAL_PRODUCT_FIELDS = new Set<ProductFieldKey>([
  'detailed_description',
  'brand',
  'min_stock_alert',
  'weight_kg',
  'dimensions_cm',
  'tags',
  'is_active',
]);

const OPTIONAL_SERVICE_FIELDS = new Set<ServiceFieldKey>([
  'detailed_description',
  'preparation_instructions',
  'cancellation_policy',
  'max_advance_booking_days',
  'min_advance_booking_hours',
  'is_active',
]);

export interface ProductDraftPartial {
  product_name?: string;
  product_category?: string;
  description?: string;
  detailed_description?: string;
  brand?: string;
  price?: number;
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
  price_xs?: number;
  price_s?: number;
  price_m?: number;
  price_l?: number;
  price_xl?: number;
  price_xxl?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  weight_kg?: number;
  dimensions_cm?: string;
  tags?: string[];
  is_active?: boolean;
  currency?: string;
}

export interface ServiceDraftPartial {
  service_name?: string;
  service_category?: string;
  description?: string;
  detailed_description?: string;
  duration_minutes?: number;
  price?: number;
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
  preparation_instructions?: string;
  cancellation_policy?: string;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  is_active?: boolean;
  currency?: string;
}

export interface CatalogFlowState<TDraft> {
  inFlow: boolean;
  complete: boolean;
  draft: TDraft;
  createParams?: Record<string, unknown>;
  nextQuestion?: string;
}

function fieldSkippedAfterAsk(
  history: ConversationTurn[],
  field: string,
  currentMessage?: string
): boolean {
  if (!assistantAskedForField(history, field)) return false;
  if (!currentMessage) return false;
  return isSkipMessage(currentMessage);
}

function collectProductDraft(
  history: ConversationTurn[],
  currentMessage?: string
): ProductDraftPartial {
  const text = buildConversationText(history, currentMessage);

  const product_category = extractCategory(text);
  const dogPrices = extractDogSizePrices(text);
  const clothingPrices = extractClothingSizePrices(text);
  const singlePrice = extractPrice(text);

  const draft: ProductDraftPartial = {
    product_name: extractProductName(text),
    product_category,
    description: extractDescription(text),
    detailed_description: extractDetailedDescription(text),
    brand: extractBrand(text),
    ...dogPrices,
    ...clothingPrices,
    price: singlePrice,
    stock_quantity:
      extractStockQuantity(text) ??
      (assistantAskedForField(history, 'stock_quantity') && currentMessage
        ? extractStockOnlyMessage(currentMessage) ?? undefined
        : undefined),
    min_stock_alert: extractMinStockAlert(text),
    weight_kg: extractWeightKg(text),
    dimensions_cm: extractDimensionsCm(text),
    tags: extractTags(text),
    is_active: extractIsActive(text),
    currency: 'GTQ',
  };

  if (fieldSkippedAfterAsk(history, 'detailed_description', currentMessage)) {
    draft.detailed_description = '';
  }
  if (fieldSkippedAfterAsk(history, 'brand', currentMessage)) draft.brand = '';
  if (fieldSkippedAfterAsk(history, 'min_stock_alert', currentMessage)) draft.min_stock_alert = 5;
  if (fieldSkippedAfterAsk(history, 'weight_kg', currentMessage)) draft.weight_kg = undefined;
  if (fieldSkippedAfterAsk(history, 'dimensions_cm', currentMessage)) draft.dimensions_cm = '';
  if (fieldSkippedAfterAsk(history, 'tags', currentMessage)) draft.tags = [];
  if (fieldSkippedAfterAsk(history, 'is_active', currentMessage)) draft.is_active = true;

  return draft;
}

function hasProductPricing(draft: ProductDraftPartial): boolean {
  if (draft.price != null && draft.price > 0) return true;
  const sizeValues = [
    draft.price_small,
    draft.price_medium,
    draft.price_large,
    draft.price_extra_large,
    draft.price_xs,
    draft.price_s,
    draft.price_m,
    draft.price_l,
    draft.price_xl,
    draft.price_xxl,
  ];
  return sizeValues.some((v) => v != null && v > 0);
}

function isProductFieldSatisfied(
  field: ProductFieldKey,
  draft: ProductDraftPartial,
  history: ConversationTurn[],
  currentMessage?: string
): boolean {
  if (fieldSkippedAfterAsk(history, field, currentMessage) && OPTIONAL_PRODUCT_FIELDS.has(field)) {
    return true;
  }

  switch (field) {
    case 'product_name':
      return !!draft.product_name?.trim();
    case 'product_category':
      return !!draft.product_category?.trim();
    case 'description':
      return !!draft.description?.trim();
    case 'detailed_description':
      return draft.detailed_description !== undefined;
    case 'brand':
      return draft.brand !== undefined;
    case 'pricing':
      return hasProductPricing(draft);
    case 'stock_quantity':
      return draft.stock_quantity !== undefined;
    case 'min_stock_alert':
      return draft.min_stock_alert !== undefined;
    case 'weight_kg':
      return (
        (draft.weight_kg !== undefined && draft.weight_kg > 0) ||
        fieldSkippedAfterAsk(history, field, currentMessage)
      );
    case 'dimensions_cm':
      return draft.dimensions_cm !== undefined;
    case 'tags':
      return draft.tags !== undefined;
    case 'is_active':
      return draft.is_active !== undefined;
    default:
      return false;
  }
}

function formatProductFieldQuestion(field: ProductFieldKey, draft: ProductDraftPartial): string {
  const categories = PRODUCT_CATEGORIES.join(', ');
  switch (field) {
    case 'product_name':
      return '¡Perfecto! Vamos a crear tu producto. ¿Cuál es el **nombre del producto**?';
    case 'product_category':
      return `¿En qué **categoría** va? Opciones: ${categories}.`;
    case 'description':
      return 'Escribe una **descripción breve** del producto (1-2 oraciones para el marketplace).';
    case 'detailed_description':
      return '¿Tienes una **descripción detallada**? (ingredientes, materiales, uso, etc.) Responde el texto o di "no aplica" para omitir.';
    case 'brand':
      return '¿Cuál es la **marca** del producto? (o "sin marca" / "no aplica")';
    case 'pricing': {
      const cat = draft.product_category ?? 'otro';
      const config = getPricingConfig(cat);
      if (!hasSizePricing(cat)) {
        return '¿Cuál es el **precio** en quetzales (Q.)?';
      }
      if (config.system === 'clothing_size') {
        return (
          'Indica el **precio por talla** en quetzales (puedes dar solo las tallas que vendas):\n' +
          '• XS, S, M, L, XL, XXL\n\n' +
          'Ejemplo: "S Q45, M Q50, L Q55" o un precio único para todas.'
        );
      }
      return (
        'Indica el **precio por tamaño de perro** en quetzales:\n' +
        '• Pequeño (hasta 10 kg)\n• Mediano (11-25 kg)\n• Grande (26-45 kg)\n• Extra grande (+45 kg)\n\n' +
        'Puedes dar todos en un mensaje o un solo precio si aplica a todos.'
      );
    }
    case 'stock_quantity':
      return '¿Cuántas **unidades en stock inicial** quieres tener? (ej. 10, 50, 100)';
    case 'min_stock_alert':
      return '¿A partir de cuántas unidades quieres recibir **alerta de stock bajo**? (default 5, o "no aplica")';
    case 'weight_kg':
      return '¿Cuál es el **peso del producto** en kg? (ej. 2.5, o "no aplica")';
    case 'dimensions_cm':
      return '¿Cuáles son las **dimensiones**? (ej. 30x20x10 cm, o "no aplica")';
    case 'tags':
      return '¿Quieres agregar **etiquetas** para búsqueda? (separadas por coma, o "no aplica")';
    case 'is_active':
      return '¿Publicamos el producto **activo** en la tienda ahora? (sí/no, default sí)';
    default:
      return 'Cuéntame más sobre el producto.';
  }
}

function buildProductCreateParams(draft: ProductDraftPartial): Record<string, unknown> {
  const category = normalizeCategory(draft.product_category ?? 'otro');
  const hasSizes = hasSizePricing(category);
  const basePrice =
    draft.price && draft.price > 0
      ? draft.price
      : [
          draft.price_small,
          draft.price_medium,
          draft.price_large,
          draft.price_extra_large,
          draft.price_xs,
          draft.price_s,
          draft.price_m,
          draft.price_l,
          draft.price_xl,
          draft.price_xxl,
        ].find((v) => v != null && v > 0) ?? 0;

  return {
    product_name: draft.product_name!.trim(),
    product_category: category,
    description: draft.description!.trim(),
    detailed_description: draft.detailed_description?.trim() || undefined,
    brand: draft.brand?.trim() || undefined,
    price: basePrice,
    price_small: draft.price_small,
    price_medium: draft.price_medium,
    price_large: draft.price_large,
    price_extra_large: draft.price_extra_large,
    price_xs: draft.price_xs,
    price_s: draft.price_s,
    price_m: draft.price_m,
    price_l: draft.price_l,
    price_xl: draft.price_xl,
    price_xxl: draft.price_xxl,
    stock_quantity: draft.stock_quantity ?? 0,
    min_stock_alert: draft.min_stock_alert ?? 5,
    weight_kg: draft.weight_kg,
    dimensions_cm: draft.dimensions_cm?.trim() || undefined,
    tags: draft.tags?.length ? draft.tags : undefined,
    is_active: draft.is_active ?? true,
    currency: 'GTQ',
  };
}

export function getProductCatalogFlow(
  history: ConversationTurn[],
  currentMessage?: string
): CatalogFlowState<ProductDraftPartial> {
  const inFlow = isCatalogCreateFlow(history, currentMessage);
  if (!inFlow) {
    return { inFlow: false, complete: false, draft: {} };
  }

  const draft = collectProductDraft(history, currentMessage);
  const nextField = PRODUCT_FIELD_ORDER.find(
    (field) => !isProductFieldSatisfied(field, draft, history, currentMessage)
  );

  if (!nextField) {
    return {
      inFlow: true,
      complete: true,
      draft,
      createParams: buildProductCreateParams(draft),
    };
  }

  return {
    inFlow: true,
    complete: false,
    draft,
    nextQuestion: formatProductFieldQuestion(nextField, draft),
  };
}

function collectServiceDraft(
  history: ConversationTurn[],
  currentMessage?: string
): ServiceDraftPartial {
  const text = buildConversationText(history, currentMessage);
  const sizePrices = extractServiceSizePrices(text);
  const averagePrice = extractAveragePrice(text);
  const singlePrice = extractPrice(text);
  const catNote = extractCatPriceNote(text);
  const detailedFromText = extractDetailedDescription(text);

  let detailed_description = detailedFromText ?? catNote;
  if (detailedFromText && catNote && !detailedFromText.includes('gato')) {
    detailed_description = `${detailedFromText}\n${catNote}`;
  }

  const draft: ServiceDraftPartial = {
    service_name: extractServiceName(text),
    service_category: extractServiceCategory(text),
    description: extractServiceDescription(text),
    detailed_description,
    duration_minutes: extractDurationMinutes(text),
    ...sizePrices,
    price:
      averagePrice ??
      (singlePrice !== undefined && !Object.values(sizePrices).some(Boolean) ? singlePrice : undefined),
    preparation_instructions: extractPreparationInstructions(text),
    cancellation_policy: extractCancellationPolicy(text),
    max_advance_booking_days: extractAdvanceBookingDays(text),
    min_advance_booking_hours: extractAdvanceBookingHours(text),
    is_active: extractIsActive(text),
    currency: 'GTQ',
  };

  if (fieldSkippedAfterAsk(history, 'detailed_description', currentMessage)) {
    draft.detailed_description = '';
  }
  if (fieldSkippedAfterAsk(history, 'preparation_instructions', currentMessage)) {
    draft.preparation_instructions = '';
  }
  if (fieldSkippedAfterAsk(history, 'cancellation_policy', currentMessage)) {
    draft.cancellation_policy = '';
  }
  if (fieldSkippedAfterAsk(history, 'max_advance_booking_days', currentMessage)) {
    draft.max_advance_booking_days = 30;
  }
  if (fieldSkippedAfterAsk(history, 'min_advance_booking_hours', currentMessage)) {
    draft.min_advance_booking_hours = 2;
  }
  if (fieldSkippedAfterAsk(history, 'is_active', currentMessage)) {
    draft.is_active = true;
  }

  return draft;
}

function hasServicePricing(draft: ServiceDraftPartial): boolean {
  if (draft.price != null && draft.price > 0) return true;
  return [draft.price_small, draft.price_medium, draft.price_large, draft.price_extra_large].some(
    (v) => v != null && v > 0
  );
}

function isServiceFieldSatisfied(
  field: ServiceFieldKey,
  draft: ServiceDraftPartial,
  history: ConversationTurn[],
  currentMessage?: string
): boolean {
  if (fieldSkippedAfterAsk(history, field, currentMessage) && OPTIONAL_SERVICE_FIELDS.has(field)) {
    return true;
  }

  switch (field) {
    case 'service_name':
      return !!draft.service_name?.trim();
    case 'service_category':
      return !!draft.service_category?.trim();
    case 'description':
      return !!draft.description?.trim();
    case 'detailed_description':
      return draft.detailed_description !== undefined;
    case 'duration_minutes':
      return draft.duration_minutes !== undefined && draft.duration_minutes > 0;
    case 'pricing':
      return hasServicePricing(draft);
    case 'preparation_instructions':
      return draft.preparation_instructions !== undefined;
    case 'cancellation_policy':
      return draft.cancellation_policy !== undefined;
    case 'max_advance_booking_days':
      return draft.max_advance_booking_days !== undefined;
    case 'min_advance_booking_hours':
      return draft.min_advance_booking_hours !== undefined;
    case 'is_active':
      return draft.is_active !== undefined;
    default:
      return false;
  }
}

function formatServiceFieldQuestion(field: ServiceFieldKey, draft: ServiceDraftPartial): string {
  const categories = SERVICE_CATEGORIES.join(', ');
  switch (field) {
    case 'service_name':
      return '¡Vamos a crear tu servicio! ¿Cuál es el **nombre del servicio**?';
    case 'service_category':
      return `¿Qué **categoría** es? Opciones: ${categories}.`;
    case 'description':
      return 'Escribe una **descripción breve** del servicio (lo que verán los clientes).';
    case 'detailed_description':
      return '¿Tienes **detalles adicionales**? (incluye precios para gatos u otras mascotas si aplica). Di "no aplica" para omitir.';
    case 'duration_minutes':
      return '¿Cuánto **dura el servicio** en minutos? (ej. 60, 90)';
    case 'pricing': {
      const cat = draft.service_category ?? 'otro';
      if (hasServiceSizePricing(cat)) {
        return (
          'Indica los **precios en quetzales**:\n' +
          '• Pequeño (hasta 10 kg)\n• Mediano (11-25 kg)\n• Grande (26-45 kg)\n• Extra grande (+45 kg)\n\n' +
          'También puedes dar un precio único o mencionar precio para gatos en el mismo mensaje.'
        );
      }
      return '¿Cuál es el **precio** del servicio en quetzales (Q.)?';
    }
    case 'preparation_instructions':
      return '¿Qué debe **preparar el cliente** antes de la cita? (o "no aplica")';
    case 'cancellation_policy':
      return '¿Cuál es tu **política de cancelación**? (ej. 24h de anticipación, o "no aplica")';
    case 'max_advance_booking_days':
      return '¿Con cuántos **días de anticipación máxima** se puede reservar? (default 30, o "no aplica")';
    case 'min_advance_booking_hours':
      return '¿Cuántas **horas mínimas de anticipación** requieres? (default 2, o "no aplica")';
    case 'is_active':
      return '¿Publicamos el servicio **activo** ahora? (sí/no, default sí)';
    default:
      return 'Cuéntame más sobre el servicio.';
  }
}

function buildServiceCreateParams(draft: ServiceDraftPartial): Record<string, unknown> {
  return {
    service_name: draft.service_name!.trim(),
    service_category: normalizeServiceCategory(draft.service_category ?? 'otro'),
    description: draft.description!.trim(),
    detailed_description: draft.detailed_description?.trim() || undefined,
    duration_minutes: draft.duration_minutes!,
    price: draft.price,
    price_small: draft.price_small,
    price_medium: draft.price_medium,
    price_large: draft.price_large,
    price_extra_large: draft.price_extra_large,
    preparation_instructions: draft.preparation_instructions?.trim() || undefined,
    cancellation_policy: draft.cancellation_policy?.trim() || undefined,
    max_advance_booking_days: draft.max_advance_booking_days ?? 30,
    min_advance_booking_hours: draft.min_advance_booking_hours ?? 2,
    is_active: draft.is_active ?? true,
    currency: 'GTQ',
  };
}

export function getServiceCatalogFlow(
  history: ConversationTurn[],
  currentMessage?: string
): CatalogFlowState<ServiceDraftPartial> {
  const inFlow = isServiceCreateFlow(history, currentMessage);
  if (!inFlow) {
    return { inFlow: false, complete: false, draft: {} };
  }

  const draft = collectServiceDraft(history, currentMessage);
  const nextField = SERVICE_FIELD_ORDER.find(
    (field) => !isServiceFieldSatisfied(field, draft, history, currentMessage)
  );

  if (!nextField) {
    return {
      inFlow: true,
      complete: true,
      draft,
      createParams: buildServiceCreateParams(draft),
    };
  }

  return {
    inFlow: true,
    complete: false,
    draft,
    nextQuestion: formatServiceFieldQuestion(nextField, draft),
  };
}
