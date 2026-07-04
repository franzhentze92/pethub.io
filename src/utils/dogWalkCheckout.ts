import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';

import { getDogWalkRequestPets } from '@/utils/dogWalkPets';

export const DOG_WALK_CART_PREFIX = 'dog-walk-';

export function isDogWalkCartItem(item: CartItem): boolean {
  return item.id.startsWith(DOG_WALK_CART_PREFIX);
}

export function getDogWalkRequestIdFromCartItem(item: CartItem): string | null {
  if (!isDogWalkCartItem(item)) return null;
  return item.id.slice(DOG_WALK_CART_PREFIX.length);
}

/** After checkout, mark walk requests as paid and schedule exercise session */
export async function finalizeDogWalkOrders(
  items: CartItem[],
  orderId: string,
  clientId: string,
): Promise<void> {
  const walkItems = items.filter(isDogWalkCartItem);
  if (walkItems.length === 0) return;

  for (const item of walkItems) {
    const requestId = getDogWalkRequestIdFromCartItem(item);
    if (!requestId) continue;

    const { data: request, error: fetchError } = await supabase
      .from('dog_walk_requests')
      .select(`
        *,
        pet:pets(id, name),
        request_pets:dog_walk_request_pets(pet:pets(id, name))
      `)
      .eq('id', requestId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (fetchError || !request) {
      console.error('Could not finalize dog walk request:', requestId, fetchError);
      continue;
    }

    const { error: updateError } = await supabase
      .from('dog_walk_requests')
      .update({
        status: 'paid',
        order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating dog walk request:', updateError);
      continue;
    }

    const pets = getDogWalkRequestPets(request);
    for (const pet of pets) {
      await supabase.from('exercise_sessions').insert({
        pet_id: pet.id,
        owner_id: clientId,
        exercise_type: 'walk',
        duration_minutes: request.duration_minutes ?? 60,
        intensity: 'medium',
        date: request.requested_date,
        notes: `Paseo programado con paseador (orden ${orderId.slice(0, 8)})`,
        calories_burned: Math.round((request.duration_minutes ?? 60) * 3),
      });
    }
  }
}
