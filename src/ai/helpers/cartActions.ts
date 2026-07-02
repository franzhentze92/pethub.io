import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';
import type { AiExecutionContext, PetBuddyCartAction } from '../types';
import {
  findServiceByQuery,
  getAvailableSlotsForService,
  resolveProviderUserId,
  type ServiceRow,
} from './bookingAvailability';
import {
  buildProductTextOrFilter,
  expandMarketplaceTokens,
  inferProductCategory,
  scoreProductMatch,
  tokenizeMarketplaceQuery,
} from './marketplaceSearch';

export type PetBuddyCartItemPayload = Omit<CartItem, 'id'> & { id?: string };

export function extractCartAction(result: unknown): PetBuddyCartAction | undefined {
  if (!result || typeof result !== 'object' || !('cart_action' in result)) return undefined;
  const cartAction = (result as { cart_action?: PetBuddyCartAction }).cart_action;
  if (cartAction?.action === 'add' && cartAction.item?.name) return cartAction;
  return undefined;
}

export async function resolveProductForCart(
  productName: string,
  quantity = 1,
): Promise<{ product: Record<string, unknown>; cartItem: PetBuddyCartItemPayload } | { error: string }> {
  const tokens = expandMarketplaceTokens(tokenizeMarketplaceQuery(productName));
  let query = supabase
    .from('provider_products')
    .select(
      'id, product_name, product_category, description, price, currency, stock_quantity, provider_id, providers(user_id, business_name, has_delivery, has_pickup)',
    )
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  const orFilter = buildProductTextOrFilter(tokens.length ? tokens : [productName]);
  if (orFilter) query = query.or(orFilter);
  else query = query.ilike('product_name', `%${productName}%`);

  const { data, error } = await query.limit(5);
  if (error) throw error;
  if (!data?.length) {
    return { error: `No encontré el producto "${productName}" en la tienda.` };
  }

  const ranked = [...data].sort(
    (a, b) => scoreProductMatch(b, tokens) - scoreProductMatch(a, tokens),
  );
  const p = ranked[0];
  const provider = p.providers as {
    user_id?: string;
    business_name?: string;
    has_delivery?: boolean;
    has_pickup?: boolean;
  };

  if (!provider?.user_id) {
    return { error: 'El producto no tiene un proveedor válido.' };
  }

  if (quantity > (p.stock_quantity ?? 0)) {
    return { error: `Solo hay ${p.stock_quantity} unidades en stock.` };
  }

  const cartItem: PetBuddyCartItemPayload = {
    id: `product-${p.id}-general-${Date.now()}`,
    type: 'product',
    name: p.product_name,
    price: Number(p.price),
    currency: p.currency ?? 'GTQ',
    quantity,
    provider_id: provider.user_id,
    provider_name: provider.business_name ?? 'Tienda',
    description: p.description ?? undefined,
    product_id: p.id,
    product_category: p.product_category ?? undefined,
    product_size: 'general',
    has_delivery: provider.has_delivery ?? false,
    has_pickup: provider.has_pickup ?? false,
  };

  return { product: p, cartItem };
}

export async function buildServiceCartItem(
  service: ServiceRow,
  date: string,
  slotId: string,
  startTime: string,
  endTime: string,
  ctx: AiExecutionContext,
  notes = '',
): Promise<PetBuddyCartItemPayload | { error: string }> {
  const providerUserId =
    service.providers?.user_id ?? (await resolveProviderUserId(service.provider_id));
  if (!providerUserId) {
    return { error: 'No se pudo identificar el proveedor del servicio.' };
  }

  const cartItem: PetBuddyCartItemPayload = {
    id: `service-${service.id}-${Date.now()}`,
    type: 'service',
    name: service.service_name,
    price: Number(service.price),
    currency: service.currency ?? 'GTQ',
    quantity: 1,
    provider_id: providerUserId,
    provider_name: service.providers?.business_name ?? 'Proveedor',
    description: service.description,
    service_id: service.id,
    service_data: {
      service_id: service.id,
      appointment_date: date,
      time_slot_id: slotId.startsWith('generated-') ? '' : slotId,
      appointment_time: startTime,
      slot_end_time: endTime,
      client_name: ctx.userName ?? 'Cliente',
      client_phone: '',
      client_email: '',
      notes,
    },
  };

  return cartItem;
}

export async function resolveServiceBookingCart(
  params: {
    service_name: string;
    date: string;
    time: string;
    notes?: string;
  },
  ctx: AiExecutionContext,
): Promise<{ cartItem: PetBuddyCartItemPayload } | { error: string }> {
  const service = await findServiceByQuery(params.service_name);
  if (!service) {
    return { error: `No encontré el servicio "${params.service_name}".` };
  }

  const slots = await getAvailableSlotsForService(service, params.date);
  const normalizedTime = params.time.slice(0, 5);
  const slot = slots.find((s) => s.start_time === normalizedTime);
  if (!slot) {
    const available = slots.map((s) => s.start_time).join(', ');
    return {
      error: available
        ? `El horario ${normalizedTime} no está disponible. Horarios libres: ${available}`
        : `No hay horarios disponibles el ${params.date} para este servicio.`,
    };
  }

  const cartItem = await buildServiceCartItem(
    service,
    params.date,
    slot.slot_id,
    slot.start_time,
    slot.end_time,
    ctx,
    params.notes ?? '',
  );

  if ('error' in cartItem) return cartItem;
  return { cartItem };
}
