/** Invoca el correo de confirmación tras completar una compra (no bloquea el checkout). */
export async function sendOrderConfirmationEmail(
  invoke: (name: string, options: { body: { orderId: string } }) => Promise<{ data: unknown; error: unknown }>,
  orderId: string,
): Promise<void> {
  try {
    const { data, error } = await invoke('send-order-confirmation', {
      body: { orderId },
    });
    if (error) {
      console.warn('Order confirmation email failed:', error);
      return;
    }
    const result = data as { skipped?: boolean; success?: boolean };
    if (result?.skipped) {
      console.warn('Order confirmation email skipped:', result);
    }
  } catch (err) {
    console.warn('Order confirmation email error:', err);
  }
}
