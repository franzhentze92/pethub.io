import { supabase } from '@/lib/supabase';
import type { AiExecutionContext } from '../types';

export async function resolveProviderId(ctx: AiExecutionContext): Promise<string | null> {
  if (ctx.providerId) return ctx.providerId;
  if (!ctx.userId) return null;

  const { data, error } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

export function noProviderProfileError() {
  return {
    error: 'NO_PROVIDER_PROFILE',
    message:
      'Para publicar productos o servicios necesitas un perfil de proveedor. Cambia a rol **Proveedor** en el menú superior y completa tu perfil en el dashboard.',
    actionPath: '/provider',
  };
}
