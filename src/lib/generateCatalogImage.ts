import { supabase } from '@/lib/supabase';

export type CatalogImageType = 'product' | 'service';

interface GenerateCatalogImageResponse {
  success?: boolean;
  skipped?: boolean;
  imageUrl?: string;
  type?: CatalogImageType;
  id?: string;
  name?: string;
  provider?: 'replicate' | 'openai';
  message?: string;
  error?: string;
}

export async function generateCatalogImage(params: {
  type: CatalogImageType;
  id: string;
  force?: boolean;
}): Promise<GenerateCatalogImageResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateCatalogImageResponse>(
    'generate-catalog-image',
    { body: params },
  );

  if (error) {
    throw new Error(error.message || 'No se pudo generar la imagen');
  }

  if (!data) {
    throw new Error('Respuesta vacía del servidor');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
