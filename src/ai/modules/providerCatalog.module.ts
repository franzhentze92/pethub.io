import { supabase } from '@/lib/supabase';
import type { AiExecutionContext, AiModuleDefinition } from '../types';
import { noProviderProfileError, resolveProviderId } from '../helpers/catalogAccess';
import { insertCatalogProduct } from '../helpers/insertCatalogProduct';
import { importProductFromUrl } from '../llm/importProductUrl';

interface CreateProductParams {
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  price: number;
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
  brand?: string;
  weight_kg?: number;
  dimensions_cm?: string;
  currency?: string;
  is_active?: boolean;
  tags?: string[];
}

interface ImportProductParams {
  url: string;
  stock_quantity?: number;
  auto_create?: boolean;
}

function mapCreatedProduct(data: {
  id: string;
  product_name: string;
  product_category: string;
  price: number;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  brand?: string | null;
  product_image_url?: string | null;
}) {
  return {
    id: data.id,
    name: data.product_name,
    category: data.product_category,
    price: data.price,
    currency: data.currency,
    stock: data.stock_quantity,
    isActive: data.is_active,
    brand: data.brand,
    imageUrl: data.product_image_url,
  };
}
interface CreateServiceParams {
  service_name: string;
  service_category: string;
  description: string;
  detailed_description?: string;
  price?: number;
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
  duration_minutes: number;
  preparation_instructions?: string;
  cancellation_policy?: string;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  currency?: string;
  is_active?: boolean;
}

function hasSizePrices(params: CreateServiceParams): boolean {
  return [params.price_small, params.price_medium, params.price_large, params.price_extra_large].some(
    (v) => v != null && v > 0
  );
}

function resolveBasePrice(params: CreateServiceParams): number {
  if (params.price != null && params.price > 0) return params.price;
  const sizePrices = [
    params.price_small,
    params.price_medium,
    params.price_large,
    params.price_extra_large,
  ].filter((v): v is number => v != null && v > 0);
  if (sizePrices.length > 0) {
    return Math.round((sizePrices.reduce((a, b) => a + b, 0) / sizePrices.length) * 100) / 100;
  }
  return 0;
}

const PRODUCT_CATEGORIES = [
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

const SERVICE_CATEGORIES = [
  'veterinaria',
  'grooming',
  'entrenamiento',
  'alojamiento',
  'transporte',
  'fisioterapia',
  'nutricion',
  'otro',
] as const;

function normalizeServiceCategory(value: string): string {
  return value.toLowerCase().trim();
}

export const providerCatalogModule: AiModuleDefinition = {
  id: 'provider_catalog',
  name: 'Catálogo del proveedor',
  description: 'Crear productos y servicios en el marketplace (requiere perfil de proveedor)',
  basePath: '/provider',
  tools: [
    {
      name: 'catalog_create_product',
      description:
        'Crea un producto nuevo en el catálogo del proveedor. Solo llamar cuando tengas TODOS los campos reunidos (excepto imagen): nombre, categoría, descripción, descripción detallada (o vacía), marca, precio(s), stock, alerta de stock, peso, dimensiones, etiquetas y estado activo.',
      keywords: [
        'crear producto', 'nuevo producto', 'agregar producto', 'publicar producto',
        'añadir producto', 'registrar producto', 'subir producto', 'vender',
      ],
      requiresProvider: true,
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: 'Nombre del producto' },
          product_category: {
            type: 'string',
            description: 'Categoría del producto',
            enum: [...PRODUCT_CATEGORIES],
          },
          description: { type: 'string', description: 'Descripción breve del producto' },
          detailed_description: { type: 'string', description: 'Descripción detallada (opcional)' },
          price: { type: 'number', description: 'Precio base en quetzales (GTQ)' },
          price_small: { type: 'number', description: 'Precio perro pequeño' },
          price_medium: { type: 'number', description: 'Precio perro mediano' },
          price_large: { type: 'number', description: 'Precio perro grande' },
          price_extra_large: { type: 'number', description: 'Precio perro extra grande' },
          price_xs: { type: 'number', description: 'Precio talla XS (ropa)' },
          price_s: { type: 'number', description: 'Precio talla S' },
          price_m: { type: 'number', description: 'Precio talla M' },
          price_l: { type: 'number', description: 'Precio talla L' },
          price_xl: { type: 'number', description: 'Precio talla XL' },
          price_xxl: { type: 'number', description: 'Precio talla XXL' },
          stock_quantity: { type: 'number', description: 'Cantidad en inventario inicial' },
          min_stock_alert: { type: 'number', description: 'Alerta cuando el stock baje de este número (default 5)' },
          brand: { type: 'string', description: 'Marca del producto' },
          weight_kg: { type: 'number', description: 'Peso en kilogramos' },
          dimensions_cm: { type: 'string', description: 'Dimensiones (ej. 30x20x10 cm)' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Etiquetas para búsqueda',
          },
          currency: { type: 'string', description: 'Moneda (default GTQ)' },
          is_active: { type: 'boolean', description: 'Si el producto está visible en la tienda (default true)' },
        },
        required: ['product_name', 'product_category', 'description', 'price', 'stock_quantity'],
        additionalProperties: false,
      },
      execute: async (params: CreateProductParams, ctx: AiExecutionContext) => {
        const providerId = await resolveProviderId(ctx);
        if (!providerId) return noProviderProfileError();

        if (params.stock_quantity === undefined || params.stock_quantity === null) {
          return {
            error: 'STOCK_REQUIRED',
            message:
              'Falta el stock inicial. Pregunta al usuario cuántas unidades quiere tener en inventario antes de crear el producto.',
          };
        }

        const data = await insertCatalogProduct(providerId, params);

        return {
          success: true,
          product: mapCreatedProduct(data),
        };
      },
    },
    {
      name: 'catalog_import_from_url',
      description:
        'Importa un producto desde una URL pública (ej. tienda online). Extrae datos con IA. Si auto_create es true, requiere stock_quantity. Si es false, solo muestra vista previa para confirmar stock con el usuario.',
      keywords: [
        'importar producto', 'importar url', 'link del producto', 'desde link', 'desde url',
        'pagina web', 'página web', 'tienda online', 'extraer producto', 'https://', 'http://',
      ],
      requiresProvider: true,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL pública de la página del producto' },
          stock_quantity: { type: 'number', description: 'Stock inicial (default 0)' },
          auto_create: {
            type: 'boolean',
            description: 'Si true, crea el producto en el catálogo tras extraer (default true)',
          },
        },
        required: ['url'],
        additionalProperties: false,
      },
      execute: async (params: ImportProductParams, ctx: AiExecutionContext) => {
        const providerId = await resolveProviderId(ctx);
        if (!providerId) return noProviderProfileError();

        const imported = await importProductFromUrl(params.url);
        const extracted = imported.product;
        if (!extracted) {
          return { error: 'IMPORT_FAILED', message: 'No se pudo extraer el producto de la URL.' };
        }

        const autoCreate = params.auto_create !== false;
        if (!autoCreate) {
          return {
            success: true,
            imported: true,
            created: false,
            source_url: imported.source_url,
            extracted,
          };
        }

        if (params.stock_quantity === undefined || params.stock_quantity === null) {
          return {
            success: true,
            imported: true,
            created: false,
            source_url: imported.source_url,
            extracted,
            error: 'STOCK_REQUIRED',
            message: 'Producto extraído. Pregunta al usuario el stock inicial antes de crearlo.',
          };
        }

        const data = await insertCatalogProduct(providerId, {
          product_name: extracted.product_name,
          product_category: extracted.product_category,
          description: extracted.description,
          detailed_description: extracted.detailed_description,
          price: extracted.price,
          stock_quantity: params.stock_quantity ?? 0,
          brand: extracted.brand,
          currency: extracted.currency ?? 'GTQ',
          product_image_url: extracted.product_image_url,
          tags: extracted.tags,
          is_active: true,
        });

        return {
          success: true,
          imported: true,
          created: true,
          source_url: imported.source_url,
          product: mapCreatedProduct(data),
          extracted,
        };
      },
    },
    {
      name: 'catalog_create_service',
      description:
        'Crea un servicio nuevo en el catálogo. Solo llamar cuando tengas TODOS los campos (excepto imagen): nombre, categoría, descripción, detalles, duración, precio(s), instrucciones de preparación, política de cancelación, días/horas de anticipación y estado activo.',
      keywords: [
        'crear servicio', 'nuevo servicio', 'agregar servicio', 'publicar servicio',
        'añadir servicio', 'registrar servicio', 'ofrecer servicio',
      ],
      requiresProvider: true,
      parameters: {
        type: 'object',
        properties: {
          service_name: { type: 'string', description: 'Nombre del servicio' },
          service_category: {
            type: 'string',
            description: 'Categoría del servicio',
            enum: [...SERVICE_CATEGORIES],
          },
          description: { type: 'string', description: 'Descripción breve del servicio' },
          detailed_description: {
            type: 'string',
            description: 'Detalles adicionales (ej. precio para gatos, condiciones)',
          },
          price: {
            type: 'number',
            description: 'Precio único en quetzales (GTQ). Opcional si se usan precios por tamaño.',
          },
          price_small: { type: 'number', description: 'Precio para perro pequeño (hasta 10 kg)' },
          price_medium: { type: 'number', description: 'Precio para perro mediano (11-25 kg)' },
          price_large: { type: 'number', description: 'Precio para perro grande (26-45 kg)' },
          price_extra_large: {
            type: 'number',
            description: 'Precio para perro extra grande (más de 45 kg)',
          },
          duration_minutes: { type: 'number', description: 'Duración estimada en minutos' },
          preparation_instructions: { type: 'string', description: 'Qué debe preparar el cliente' },
          cancellation_policy: { type: 'string', description: 'Política de cancelación' },
          max_advance_booking_days: {
            type: 'number',
            description: 'Días máximos de anticipación para reservar (default 30)',
          },
          min_advance_booking_hours: {
            type: 'number',
            description: 'Horas mínimas de anticipación (default 2)',
          },
          currency: { type: 'string', description: 'Moneda (default GTQ)' },
          is_active: { type: 'boolean', description: 'Si el servicio está visible (default true)' },
        },
        required: ['service_name', 'service_category', 'description', 'duration_minutes'],
        additionalProperties: false,
      },
      execute: async (params: CreateServiceParams, ctx: AiExecutionContext) => {
        const providerId = await resolveProviderId(ctx);
        if (!providerId) return noProviderProfileError();

        const category = normalizeServiceCategory(params.service_category);
        const sizePricing = hasSizePrices(params);
        const basePrice = resolveBasePrice(params);

        if (!sizePricing && basePrice <= 0) {
          return {
            success: false,
            error:
              'Indica un precio único o al menos un precio por tamaño (pequeño, mediano, grande).',
          };
        }

        const { data, error } = await supabase
          .from('provider_services')
          .insert({
            provider_id: providerId,
            service_name: params.service_name.trim(),
            service_category: category,
            description: params.description.trim(),
            detailed_description: params.detailed_description?.trim() || null,
            price: basePrice,
            price_small: params.price_small ?? null,
            price_medium: params.price_medium ?? null,
            price_large: params.price_large ?? null,
            price_extra_large: params.price_extra_large ?? null,
            duration_minutes: params.duration_minutes,
            preparation_instructions: params.preparation_instructions?.trim() || null,
            cancellation_policy: params.cancellation_policy?.trim() || null,
            currency: params.currency ?? 'GTQ',
            is_active: params.is_active ?? true,
            max_advance_booking_days: params.max_advance_booking_days ?? 30,
            min_advance_booking_hours: params.min_advance_booking_hours ?? 2,
          })
          .select(
            'id, service_name, service_category, price, price_small, price_medium, price_large, price_extra_large, currency, duration_minutes, is_active, detailed_description, preparation_instructions, cancellation_policy, max_advance_booking_days, min_advance_booking_hours'
          )
          .single();

        if (error) throw error;

        return {
          success: true,
          service: {
            id: data.id,
            name: data.service_name,
            category: data.service_category,
            price: data.price,
            priceSmall: data.price_small,
            priceMedium: data.price_medium,
            priceLarge: data.price_large,
            priceExtraLarge: data.price_extra_large,
            currency: data.currency,
            durationMinutes: data.duration_minutes,
            isActive: data.is_active,
            detailedDescription: data.detailed_description,
            preparationInstructions: data.preparation_instructions,
            cancellationPolicy: data.cancellation_policy,
            maxAdvanceBookingDays: data.max_advance_booking_days,
            minAdvanceBookingHours: data.min_advance_booking_hours,
          },
        };
      },
    },
  ],
};
