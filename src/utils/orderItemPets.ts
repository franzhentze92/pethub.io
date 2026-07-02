import { supabase } from '@/lib/supabase';

export interface OrderItemPet {
  id: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  weight?: string | number | null;
  image_url?: string | null;
}

type OrderItemPetRow = {
  order_item_id: string;
  pets: OrderItemPet | OrderItemPet[] | null;
};

/** Fetch pets linked to specific order items (key = order_item_id). */
export async function fetchPetsForOrderItems(
  orderItemIds: string[],
): Promise<Map<string, OrderItemPet[]>> {
  const map = new Map<string, OrderItemPet[]>();
  const uniqueIds = [...new Set(orderItemIds.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from('order_item_pets')
    .select('order_item_id, pets (id, name, species, breed, weight, image_url)')
    .in('order_item_id', uniqueIds);

  if (error) {
    console.warn('fetchPetsForOrderItems:', error.message);
    return map;
  }

  for (const row of (data as OrderItemPetRow[]) || []) {
    const raw = row.pets;
    const pet = Array.isArray(raw) ? raw[0] : raw;
    if (!pet?.id) continue;
    const list = map.get(row.order_item_id) || [];
    if (!list.some((p) => p.id === pet.id)) list.push(pet);
    map.set(row.order_item_id, list);
  }

  return map;
}

/** All pets linked to any item in an order (deduplicated). */
export async function fetchPetsForOrderId(orderId: string | null | undefined): Promise<OrderItemPet[]> {
  if (!orderId) return [];

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId);

  if (itemsError || !items?.length) return [];

  const petsMap = await fetchPetsForOrderItems(items.map((i) => i.id));
  const seen = new Set<string>();
  const pets: OrderItemPet[] = [];

  for (const list of petsMap.values()) {
    for (const pet of list) {
      if (!seen.has(pet.id)) {
        seen.add(pet.id);
        pets.push(pet);
      }
    }
  }

  return pets;
}

/** Pets for a service appointment (via order_item_id, order_id, or matching service order item). */
export async function fetchPetsForAppointment(params: {
  orderItemId?: string | null;
  orderId?: string | null;
  clientId?: string;
  serviceId?: string;
  createdAt?: string;
  totalPrice?: number | null;
}): Promise<OrderItemPet[]> {
  if (params.orderItemId) {
    const byItem = await fetchPetsForOrderItems([params.orderItemId]);
    const pets = byItem.get(params.orderItemId) || [];
    if (pets.length > 0) return pets;
  }

  const fromOrder = await fetchPetsForOrderId(params.orderId);
  if (fromOrder.length > 0 && !params.totalPrice) return fromOrder;

  if (!params.clientId || !params.serviceId) {
    return fromOrder;
  }

  let query = supabase
    .from('order_items')
    .select('id, created_at, total_price, orders!inner(client_id)')
    .eq('item_type', 'service')
    .eq('item_id', params.serviceId)
    .eq('orders.client_id', params.clientId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (params.totalPrice != null) {
    query = query.eq('total_price', params.totalPrice);
  }

  const { data: items, error } = await query;

  if (error || !items?.length) {
    return fromOrder;
  }

  let targetIds = items.map((i) => i.id as string);
  if (params.createdAt && params.totalPrice == null) {
    const aptTime = new Date(params.createdAt).getTime();
    const closest = items.reduce<{ id: string; diff: number } | null>((best, item) => {
      const diff = Math.abs(new Date(item.created_at as string).getTime() - aptTime);
      if (!best || diff < best.diff) return { id: item.id as string, diff };
      return best;
    }, null);
    if (closest) targetIds = [closest.id];
  }

  const petsMap = await fetchPetsForOrderItems(targetIds);
  const seen = new Set<string>();
  const pets: OrderItemPet[] = [];
  for (const list of petsMap.values()) {
    for (const pet of list) {
      if (!seen.has(pet.id)) {
        seen.add(pet.id);
        pets.push(pet);
      }
    }
  }
  return pets.length > 0 ? pets : fromOrder;
}

export function attachPetsToOrderItems<T extends { id: string }>(
  items: T[],
  petsMap: Map<string, OrderItemPet[]>,
): (T & { pets: OrderItemPet[] })[] {
  return items.map((item) => ({
    ...item,
    pets: petsMap.get(item.id) || [],
  }));
}
