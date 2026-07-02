import type { ImportedProductData } from '@/ai/llm/importProductUrl';
import type { ProviderProduct } from '@/hooks/useProvider';

export function mapImportedToProductDraft(
  imported: ImportedProductData,
  stockQuantity = 0
): Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'> {
  return {
    product_name: imported.product_name,
    product_category: imported.product_category,
    description: imported.description,
    detailed_description: imported.detailed_description ?? '',
    price: imported.price,
    currency: imported.currency ?? 'GTQ',
    stock_quantity: stockQuantity,
    min_stock_alert: 5,
    is_active: true,
    product_image_url: imported.product_image_url ?? '',
    secondary_images: [],
    brand: imported.brand ?? '',
    tags: imported.tags ?? [],
  };
}
