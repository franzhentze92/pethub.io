import { supabase } from '@/lib/supabase';

export interface CatalogProductInput {
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
  product_image_url?: string;
  tags?: string[];
}

function normalizeCategory(value: string): string {
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

export async function insertCatalogProduct(providerId: string, params: CatalogProductInput) {
  const { data, error } = await supabase
    .from('provider_products')
    .insert({
      provider_id: providerId,
      product_name: params.product_name.trim(),
      product_category: normalizeCategory(params.product_category),
      description: params.description.trim(),
      detailed_description: params.detailed_description?.trim() || null,
      price: params.price,
      price_small: params.price_small ?? null,
      price_medium: params.price_medium ?? null,
      price_large: params.price_large ?? null,
      price_extra_large: params.price_extra_large ?? null,
      price_xs: params.price_xs ?? null,
      price_s: params.price_s ?? null,
      price_m: params.price_m ?? null,
      price_l: params.price_l ?? null,
      price_xl: params.price_xl ?? null,
      price_xxl: params.price_xxl ?? null,
      stock_quantity: params.stock_quantity ?? 0,
      min_stock_alert: params.min_stock_alert ?? 5,
      currency: params.currency ?? 'GTQ',
      is_active: params.is_active ?? true,
      brand: params.brand?.trim() || null,
      weight_kg: params.weight_kg ?? null,
      dimensions_cm: params.dimensions_cm?.trim() || null,
      product_image_url: params.product_image_url?.trim() || null,
      tags: params.tags?.length ? params.tags : null,
    })
    .select(
      'id, product_name, product_category, price, currency, stock_quantity, is_active, brand, product_image_url, detailed_description, weight_kg, dimensions_cm, tags'
    )
    .single();

  if (error) throw error;
  return data;
}
