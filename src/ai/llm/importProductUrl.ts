import { supabase } from '@/lib/supabase';

export interface ImportedProductData {
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  price: number;
  brand?: string;
  product_image_url?: string;
  sku?: string;
  currency?: string;
  tags?: string[];
}

interface ImportProductUrlResponse {
  success?: boolean;
  source_url?: string;
  product?: ImportedProductData;
  error?: string;
}

export async function importProductFromUrl(url: string): Promise<ImportProductUrlResponse> {
  const { data, error } = await supabase.functions.invoke<ImportProductUrlResponse>('import-product-url', {
    body: { url: url.trim() },
  });

  if (error) {
    throw new Error(error.message || 'Edge function import-product-url failed');
  }

  if (!data) {
    throw new Error('Empty response from import-product-url');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  return match?.[0]?.replace(/[.,;:!?)]+$/, '') ?? null;
}
