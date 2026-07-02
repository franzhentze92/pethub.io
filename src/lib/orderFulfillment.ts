export type FulfillmentMethod = 'delivery' | 'pickup';

export interface CartFulfillmentCapabilities {
  canDeliver: boolean;
  canPickup: boolean;
  showChoice: boolean;
  defaultMethod: FulfillmentMethod;
}

export function getCartFulfillmentCapabilities(
  items: { has_delivery?: boolean; has_pickup?: boolean }[],
): CartFulfillmentCapabilities {
  if (items.length === 0) {
    return { canDeliver: false, canPickup: false, showChoice: false, defaultMethod: 'delivery' };
  }

  const canDeliver = items.every((item) => !!item.has_delivery);
  const canPickup = items.every((item) => !!item.has_pickup);
  const showChoice = canDeliver && canPickup;

  let defaultMethod: FulfillmentMethod = 'delivery';
  if (canPickup && !canDeliver) {
    defaultMethod = 'pickup';
  } else if (canDeliver && !canPickup) {
    defaultMethod = 'delivery';
  }

  return { canDeliver, canPickup, showChoice, defaultMethod };
}

export function resolveFulfillmentMethod(input: {
  fulfillment_method?: string | null;
  delivery_fee?: number | null;
  delivery_address?: string | null;
  cartHasDeliveryItems?: boolean;
}): FulfillmentMethod {
  if (input.fulfillment_method === 'delivery' || input.fulfillment_method === 'pickup') {
    return input.fulfillment_method;
  }

  if ((input.delivery_fee ?? 0) > 0) return 'delivery';
  if (input.delivery_address?.trim()) return 'delivery';
  if (input.cartHasDeliveryItems === false) return 'pickup';

  return 'delivery';
}

export function fulfillmentLabel(method: FulfillmentMethod): string {
  return method === 'delivery' ? 'Entrega a domicilio' : 'Retiro en tienda';
}

export { buildDeliveryScheduleMessage } from '@/lib/deliverySchedule';

export function itemFulfillmentFlags(
  method: FulfillmentMethod,
  itemSupportsDelivery: boolean,
  itemSupportsPickup: boolean,
): { has_delivery: boolean; has_pickup: boolean } {
  if (method === 'delivery') {
    return { has_delivery: itemSupportsDelivery, has_pickup: false };
  }
  return { has_delivery: false, has_pickup: itemSupportsPickup };
}
