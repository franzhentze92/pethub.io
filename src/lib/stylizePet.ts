import { supabase } from '@/lib/supabase';

export type PetAvatarStyle = 'original' | 'monster90s' | 'digital';

export function isStylizedPetImageUrl(url: string): boolean {
  return /\/stylized-/i.test(url);
}

export function getStylizedStyleFromUrl(url: string): Exclude<PetAvatarStyle, 'original'> | null {
  if (/\/stylized-monster90s-/i.test(url)) return 'monster90s';
  if (/\/stylized-digital-/i.test(url)) return 'digital';
  return null;
}

interface StylizePetResponse {
  success?: boolean;
  stylizedUrl?: string;
  style?: PetAvatarStyle;
  provider?: 'replicate' | 'openai';
  error?: string;
}

export async function stylizePetImage(params: {
  imageUrl: string;
  style: Exclude<PetAvatarStyle, 'original'>;
  species?: string;
  breed?: string;
  name?: string;
}): Promise<StylizePetResponse> {
  const { data, error } = await supabase.functions.invoke<StylizePetResponse>('stylize-pet', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo estilizar la imagen');
  }

  if (!data) {
    throw new Error('Respuesta vacía del servidor');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
