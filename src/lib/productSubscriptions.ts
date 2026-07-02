import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';
import {
  addDaysToDate,
  getSubscriptionIntervalOption,
  stripSubscriptionSuffix,
  type SubscriptionInterval,
} from '@/config/productSubscriptions';

export interface ProductSubscription {
  id: string;
  client_id: string;
  product_id: string;
  provider_id: string;
  initial_order_id: string | null;
  payment_card_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  product_name: string;
  product_size: string | null;
  quantity: number;
  unit_price: number;
  currency: string;
  interval_type: SubscriptionInterval;
  interval_days: number;
  status: 'active' | 'paused' | 'cancelled' | 'payment_failed';
  fulfillment_method: 'delivery' | 'pickup';
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  next_delivery_date: string;
  last_delivery_date: string | null;
  deliveries_count: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  paused_at: string | null;
}

export interface SubscriptionDelivery {
  id: string;
  subscription_id: string;
  order_id: string | null;
  delivery_date: string;
  amount_charged: number;
  currency: string;
  payment_status: 'pending' | 'completed' | 'failed';
  status: string;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProductSubscriptionWithDeliveries extends ProductSubscription {
  subscription_deliveries: SubscriptionDelivery[];
}

export interface CreateSubscriptionParams {
  clientId: string;
  orderId: string;
  paymentCardId: string | null;
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryInstructions?: string;
}

export async function createSubscriptionsFromOrder(
  subscriptionItems: CartItem[],
  params: CreateSubscriptionParams,
): Promise<ProductSubscription[]> {
  if (subscriptionItems.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);

  const records = subscriptionItems.map((item) => {
    const interval = item.subscription_interval ?? 'monthly';
    const intervalOption = getSubscriptionIntervalOption(interval);
    const nextDelivery = addDaysToDate(new Date(), intervalOption.days);
    const cleanName = stripSubscriptionSuffix(item.name);

    return {
      client_id: params.clientId,
      product_id: item.product_id || item.id.split('_')[0],
      provider_id: item.provider_id,
      initial_order_id: params.orderId,
      payment_card_id: params.paymentCardId,
      product_name: cleanName,
      product_size: item.product_size && item.product_size !== 'general' ? item.product_size : null,
      quantity: item.quantity,
      unit_price: item.price,
      currency: item.currency,
      interval_type: interval,
      interval_days: intervalOption.days,
      status: 'active' as const,
      fulfillment_method: params.fulfillmentMethod,
      delivery_name: params.deliveryName,
      delivery_phone: params.deliveryPhone,
      delivery_address: params.deliveryAddress,
      delivery_city: params.deliveryCity,
      delivery_instructions: params.deliveryInstructions || null,
      next_delivery_date: nextDelivery.toISOString().slice(0, 10),
      last_delivery_date: today,
      deliveries_count: 1,
    };
  });

  const { data: createdSubs, error } = await supabase
    .from('product_subscriptions')
    .insert(records)
    .select('*');

  if (error) throw error;
  if (!createdSubs?.length) throw new Error('No se pudieron crear las suscripciones');

  const { error: deliveryError } = await supabase.from('subscription_deliveries').insert(
    createdSubs.map((sub) => ({
      subscription_id: sub.id,
      order_id: params.orderId,
      delivery_date: today,
      amount_charged: Number(sub.unit_price) * sub.quantity,
      currency: sub.currency,
      payment_status: 'completed',
      status: 'confirmed',
      notes: 'Primera entrega — pagada en checkout',
    })),
  );

  if (deliveryError) {
    console.error('Error logging initial subscription delivery:', deliveryError);
    throw deliveryError;
  }

  return createdSubs as ProductSubscription[];
}

export async function pauseSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('product_subscriptions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', subscriptionId);
  if (error) throw error;
}

export async function resumeSubscription(subscriptionId: string): Promise<void> {
  const { data: sub, error: fetchError } = await supabase
    .from('product_subscriptions')
    .select('next_delivery_date, interval_days')
    .eq('id', subscriptionId)
    .single();

  if (fetchError) throw fetchError;

  const today = new Date().toISOString().slice(0, 10);
  const nextDate =
    sub.next_delivery_date < today
      ? addDaysToDate(new Date(), sub.interval_days).toISOString().slice(0, 10)
      : sub.next_delivery_date;

  const { error } = await supabase
    .from('product_subscriptions')
    .update({
      status: 'active',
      paused_at: null,
      next_delivery_date: nextDate,
    })
    .eq('id', subscriptionId);
  if (error) throw error;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('product_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);
  if (error) throw error;
}

export async function fetchClientSubscriptions(
  clientId: string,
): Promise<ProductSubscriptionWithDeliveries[]> {
  const { data, error } = await supabase
    .from('product_subscriptions')
    .select(`
      *,
      subscription_deliveries (
        id,
        subscription_id,
        order_id,
        delivery_date,
        amount_charged,
        currency,
        payment_status,
        status,
        stripe_payment_intent_id,
        notes,
        created_at
      )
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as ProductSubscription),
    subscription_deliveries: ((row as { subscription_deliveries?: SubscriptionDelivery[] })
      .subscription_deliveries ?? []
    ).sort(
      (a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime(),
    ),
  }));
}

export async function updateSubscriptionPaymentMethod(
  subscriptionId: string,
  paymentCardId: string,
): Promise<void> {
  const { error } = await supabase
    .from('product_subscriptions')
    .update({ payment_card_id: paymentCardId })
    .eq('id', subscriptionId);
  if (error) throw error;
}
