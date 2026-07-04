/** Estados de orden que envían correo al cliente (Mis Órdenes). */
export const ORDER_STATUSES_WITH_EMAIL = [
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
] as const;

export type OrderStatusWithEmail = (typeof ORDER_STATUSES_WITH_EMAIL)[number];

export function shouldSendOrderStatusEmail(
  newStatus: string,
  previousStatus?: string | null,
): newStatus is OrderStatusWithEmail {
  if (previousStatus === newStatus) return false;
  return (ORDER_STATUSES_WITH_EMAIL as readonly string[]).includes(newStatus);
}

/** Notifica al cliente tras un cambio de estado (no bloquea la UI). */
export async function sendOrderStatusEmail(
  invoke: (
    name: string,
    options: { body: { orderId: string; status: string; previousStatus?: string | null } },
  ) => Promise<{ data: unknown; error: unknown }>,
  orderId: string,
  status: string,
  previousStatus?: string | null,
): Promise<void> {
  if (!shouldSendOrderStatusEmail(status, previousStatus)) return;

  try {
    const { data, error } = await invoke('send-order-status-email', {
      body: { orderId, status, previousStatus: previousStatus ?? null },
    });
    if (error) {
      console.warn('Order status email failed:', error);
      return;
    }
    const result = data as { skipped?: boolean; success?: boolean };
    if (result?.skipped) {
      console.warn('Order status email skipped:', result);
    }
  } catch (err) {
    console.warn('Order status email error:', err);
  }
}
