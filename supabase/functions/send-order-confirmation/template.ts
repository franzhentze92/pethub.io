import { buildDeliveryScheduleMessage } from './deliverySchedule.ts';

export interface OrderEmailItem {
  id: string;
  item_type: string;
  item_name: string;
  item_description?: string | null;
  item_image_url?: string | null;
  provider_name?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  has_delivery?: boolean | null;
  has_pickup?: boolean | null;
  pet_names?: string[];
  appointment_label?: string | null;
}

export interface OrderEmailData {
  order_number: string;
  created_at: string;
  client_name: string;
  client_email: string;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_instructions?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
  currency: string;
  total_amount: number;
  delivery_fee: number;
  grand_total: number;
  invoice_number?: string | null;
  fulfillment_method?: string | null;
  items: OrderEmailItem[];
  app_url?: string;
}

/** PetHub brand palette — mirrors tailwind.config.ts landing.* */
const C = {
  aqua: '#00F0C8',
  aquaDark: '#00C4A3',
  aquaLight: '#E6FDF9',
  mint: '#38F9A0',
  mintDark: '#2DD98A',
  mintLight: '#EBFEF5',
  mango: '#FFB703',
  mangoDark: '#E6A503',
  mangoLight: '#FFF8E6',
  tropical: '#FDE74C',
  text: '#0f172a',
  textMuted: '#475569',
  textLight: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  bgCard: '#ffffff',
  headerGradient: '#00F0C8',
  ctaGradient: '#00F0C8',
  cardGradient: '#E6FDF9',
  shadow: '0 4px 24px rgba(0, 240, 200, 0.12)',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text: string, max = 100): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function formatMoney(currency: string, amount: number): string {
  const prefix = currency === 'GTQ' ? 'Q.' : currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-GT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function paymentMethodLabel(method?: string | null): string {
  switch (method) {
    case 'card':
      return 'Tarjeta de crédito/débito';
    case 'cash':
      return 'Efectivo';
    case 'transfer':
      return 'Transferencia bancaria';
    default:
      return method || '—';
  }
}

function paymentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'completed':
      return 'Pagado';
    case 'pending':
      return 'Pendiente';
    case 'failed':
      return 'Fallido';
    case 'refunded':
      return 'Reembolsado';
    default:
      return status || '—';
  }
}

function orderStatusLabel(status?: string | null): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmada';
    case 'pending':
      return 'Pendiente';
    case 'processing':
      return 'En proceso';
    case 'shipped':
      return 'En camino';
    case 'in_transit':
      return 'En tránsito';
    case 'delivered':
      return 'Entregada';
    case 'completed':
      return 'Completada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status || 'Confirmada';
  }
}

export interface OrderStatusEmailData {
  order_number: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  status: string;
  previous_status?: string | null;
  currency: string;
  grand_total: number;
  delivery_address?: string | null;
  delivery_city?: string | null;
  fulfillment_method?: string | null;
  items: Pick<OrderEmailItem, 'item_name' | 'quantity' | 'item_type'>[];
  app_url?: string;
}

type StatusEmailMeta = {
  subject: string;
  headerBg: string;
  headerSubtitle: string;
  headerIcon: string;
  title: string;
  message: string;
  statusBadgeBg: string;
  statusBadgeColor: string;
  statusBadgeBorder: string;
};

function statusEmailMeta(status: string): StatusEmailMeta {
  switch (status) {
    case 'processing':
      return {
        subject: 'Tu orden está en preparación',
        headerBg: C.mint,
        headerSubtitle: 'En preparación',
        headerIcon: '📦',
        title: 'Estamos preparando tu pedido',
        message: 'Tu orden ya está en proceso. Te avisaremos cuando salga hacia ti.',
        statusBadgeBg: C.mintLight,
        statusBadgeColor: C.mintDark,
        statusBadgeBorder: 'rgba(56, 249, 160, 0.4)',
      };
    case 'shipped':
    case 'in_transit':
      return {
        subject: '¡Tu orden va en camino!',
        headerBg: C.aqua,
        headerSubtitle: 'En camino',
        headerIcon: '🚚',
        title: '¡Tu pedido va en camino!',
        message: 'Tu orden ya salió y está en ruta. Pronto la recibirás.',
        statusBadgeBg: C.aquaLight,
        statusBadgeColor: C.aquaDark,
        statusBadgeBorder: 'rgba(0, 240, 200, 0.4)',
      };
    case 'delivered':
    case 'completed':
      return {
        subject: '¡Tu orden fue entregada!',
        headerBg: C.mango,
        headerSubtitle: 'Entregada',
        headerIcon: '🎯',
        title: '¡Pedido entregado!',
        message: 'Tu orden fue entregada con éxito. Esperamos que a ti y a tu mascota les encante.',
        statusBadgeBg: C.mangoLight,
        statusBadgeColor: C.mangoDark,
        statusBadgeBorder: 'rgba(255, 183, 3, 0.4)',
      };
    case 'cancelled':
      return {
        subject: 'Tu orden fue cancelada',
        headerBg: '#64748b',
        headerSubtitle: 'Cancelada',
        headerIcon: '✕',
        title: 'Tu orden fue cancelada',
        message: 'Esta orden ya no está activa. Si tienes dudas, contáctanos en contacto@pethub.gt.',
        statusBadgeBg: '#f1f5f9',
        statusBadgeColor: '#475569',
        statusBadgeBorder: '#cbd5e1',
      };
    default:
      return {
        subject: 'Actualización de tu orden',
        headerBg: C.aqua,
        headerSubtitle: 'Actualización',
        headerIcon: '📋',
        title: 'Tu orden fue actualizada',
        message: 'Hay una nueva actualización en el estado de tu pedido.',
        statusBadgeBg: C.aquaLight,
        statusBadgeColor: C.aquaDark,
        statusBadgeBorder: 'rgba(0, 240, 200, 0.4)',
      };
  }
}

function renderStatusItemsList(
  items: OrderStatusEmailData['items'],
  currency: string,
): string {
  if (!items.length) return '';
  const rows = items
    .slice(0, 6)
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;font-size:13px;color:${C.textMuted};border-bottom:1px solid ${C.border};">
          <strong style="color:${C.text};">${escapeHtml(item.item_name)}</strong>
          <span style="color:${C.textLight};"> · x${item.quantity} · ${itemTypeLabel(item.item_type)}</span>
        </td></tr>`,
    )
    .join('');
  const more =
    items.length > 6
      ? `<tr><td style="padding:8px 0;font-size:12px;color:${C.textLight};">+ ${items.length - 6} artículo(s) más</td></tr>`
      : '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">${rows}${more}</table>`;
}

export function buildOrderStatusSubject(data: OrderStatusEmailData): string {
  const meta = statusEmailMeta(data.status);
  return `${meta.subject} — ${data.order_number} · PetHub`;
}

export function buildOrderStatusHtml(data: OrderStatusEmailData): string {
  const meta = statusEmailMeta(data.status);
  const appUrl = data.app_url || 'https://pethubgt.com';
  const ordersUrl = `${appUrl}/client-orders`;
  const clientName = escapeHtml(data.client_name);
  const fulfillment = data.fulfillment_method === 'pickup' ? 'Retiro en tienda' : 'Entrega a domicilio';
  const address =
    data.delivery_address || data.delivery_city
      ? [data.delivery_address, data.delivery_city].filter(Boolean).map(escapeHtml).join(', ')
      : null;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)} — PetHub</title>
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:${C.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.bgCard};border-radius:20px;overflow:hidden;border:1px solid rgba(0,240,200,0.2);box-shadow:${C.shadow};">
        <tr>
          <td class="email-header" bgcolor="${meta.headerBg}" style="padding:36px 28px;background:${meta.headerBg};text-align:center;">
            <div style="font-size:32px;line-height:1;margin-bottom:10px;">${meta.headerIcon}</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">PetHub</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.95);margin-top:6px;font-weight:500;">${escapeHtml(meta.headerSubtitle)}</div>
          </td>
        </tr>
        <tr>
          <td class="email-body" style="padding:28px 24px;">
            <p style="margin:0 0 6px;font-size:17px;color:${C.text};">Hola <strong>${clientName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${C.textMuted};">${meta.message}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cardGradient};border:1px solid rgba(0,240,200,0.28);border-radius:14px;margin-bottom:20px;">
              <tr><td style="padding:18px 20px;">
                <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Orden</div>
                <div style="font-size:17px;font-weight:800;color:${C.aquaDark};font-family:monospace;margin-bottom:12px;">${escapeHtml(data.order_number)}</div>
                ${badge(orderStatusLabel(data.status), { bg: meta.statusBadgeBg, color: meta.statusBadgeColor, border: meta.statusBadgeBorder })}
                <div style="margin-top:12px;font-size:13px;color:${C.textMuted};">Total: <strong style="color:${C.text};">${formatMoney(data.currency, data.grand_total)}</strong></div>
                <div style="margin-top:6px;font-size:12px;color:${C.textLight};">Actualizado: ${formatDateShort(data.updated_at)}</div>
              </td></tr>
            </table>
            ${renderStatusItemsList(data.items, data.currency)}
            ${
              address
                ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:${C.bg};border:1px solid ${C.border};border-radius:12px;">
                <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;margin-bottom:4px;">${fulfillment}</div>
                <div style="font-size:13px;color:${C.textMuted};">📍 ${address}</div>
              </td></tr></table>`
                : ''
            }
            <table role="presentation" cellspacing="0" cellpadding="0" align="center" width="100%">
              <tr><td align="center" class="cta-cell" style="border-radius:14px;background:${C.aqua};">
                <a href="${ordersUrl}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">Ver mis órdenes</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px;background:${C.bg};text-align:center;border-top:1px solid ${C.border};">
            <p style="margin:0;font-size:11px;color:#94a3b8;">© PetHub · <a href="https://pethubgt.com" style="color:${C.aquaDark};text-decoration:none;">pethubgt.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOrderStatusText(data: OrderStatusEmailData): string {
  const meta = statusEmailMeta(data.status);
  const lines = [
    `Hola ${data.client_name},`,
    '',
    meta.message,
    '',
    `Orden: ${data.order_number}`,
    `Estado: ${orderStatusLabel(data.status)}`,
    `Total: ${formatMoney(data.currency, data.grand_total)}`,
    '',
    ...data.items.map((i) => `• ${i.item_name} x${i.quantity}`),
    '',
    `Ver pedido: ${(data.app_url || 'https://pethubgt.com')}/client-orders`,
    '',
    'PetHub',
  ];
  return lines.join('\n');
}

export interface SubscriptionRenewalEmailData {
  client_name: string;
  client_email: string;
  product_name: string;
  product_size?: string | null;
  quantity: number;
  unit_price: number;
  amount_charged: number;
  currency: string;
  interval_type: string;
  delivery_date: string;
  next_delivery_date: string;
  deliveries_count: number;
  order_number: string;
  fulfillment_method?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  payment_status?: string | null;
  app_url?: string;
}

function subscriptionIntervalLabel(interval: string): string {
  switch (interval) {
    case 'weekly':
      return 'Cada semana';
    case 'biweekly':
      return 'Cada 2 semanas';
    case 'monthly':
      return 'Cada mes';
    case 'bimonthly':
      return 'Cada 2 meses';
    case 'quarterly':
      return 'Cada 3 meses';
    default:
      return interval;
  }
}

function formatDateOnly(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

export function buildSubscriptionRenewalSubject(data: SubscriptionRenewalEmailData): string {
  return `Tu suscripción fue renovada — ${data.product_name} · PetHub`;
}

export function buildSubscriptionRenewalHtml(data: SubscriptionRenewalEmailData): string {
  const appUrl = data.app_url || 'https://pethubgt.com';
  const subscriptionsUrl = `${appUrl}/my-subscriptions`;
  const clientName = escapeHtml(data.client_name);
  const productLine = data.product_size
    ? `${escapeHtml(data.product_name)} (${escapeHtml(data.product_size)})`
    : escapeHtml(data.product_name);
  const fulfillment =
    data.fulfillment_method === 'pickup' ? 'Retiro en tienda' : 'Entrega a domicilio';
  const address =
    data.delivery_address || data.delivery_city
      ? [data.delivery_address, data.delivery_city].filter(Boolean).map(escapeHtml).join(', ')
      : null;
  const paymentLabel = paymentStatusLabel(data.payment_status);

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Suscripción renovada — PetHub</title>
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:${C.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.bgCard};border-radius:20px;overflow:hidden;border:1px solid rgba(0,240,200,0.2);box-shadow:${C.shadow};">
        <tr>
          <td class="email-header" bgcolor="${C.aqua}" style="padding:36px 28px;background:${C.aqua};text-align:center;">
            <div style="font-size:32px;line-height:1;margin-bottom:10px;">🔄</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">PetHub</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.95);margin-top:6px;font-weight:500;">Suscripción renovada</div>
          </td>
        </tr>
        <tr>
          <td class="email-body" style="padding:28px 24px;">
            <p style="margin:0 0 6px;font-size:17px;color:${C.text};">Hola <strong>${clientName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${C.textMuted};">
              Tu suscripción se renovó automáticamente. Programamos una nueva entrega y registramos la orden correspondiente.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cardGradient};border:1px solid rgba(0,240,200,0.28);border-radius:14px;margin-bottom:20px;">
              <tr><td style="padding:18px 20px;">
                <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Producto</div>
                <div style="font-size:17px;font-weight:800;color:${C.aquaDark};margin-bottom:12px;">${productLine}</div>
                ${badge('Suscripción activa', { bg: C.mintLight, color: C.mintDark, border: 'rgba(56, 249, 160, 0.4)' })}
                ${badge(subscriptionIntervalLabel(data.interval_type), { bg: C.aquaLight, color: C.aquaDark, border: 'rgba(0, 240, 200, 0.4)' })}
                <div style="margin-top:14px;font-size:13px;color:${C.textMuted};line-height:1.7;">
                  <span style="display:block;">Cantidad: <strong style="color:${C.text};">${data.quantity}</strong></span>
                  <span style="display:block;">Entrega #${data.deliveries_count} · ${formatDateOnly(data.delivery_date)}</span>
                  <span style="display:block;">Próxima entrega: <strong style="color:${C.text};">${formatDateOnly(data.next_delivery_date)}</strong></span>
                </div>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};border:1px solid ${C.border};border-radius:14px;margin-bottom:20px;">
              <tr><td style="padding:18px 20px;">
                <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Orden de renovación</div>
                <div style="font-size:16px;font-weight:800;color:${C.aquaDark};font-family:monospace;margin-bottom:8px;">${escapeHtml(data.order_number)}</div>
                <div style="font-size:14px;color:${C.textMuted};">Cargo: <strong style="color:${C.text};">${formatMoney(data.currency, data.amount_charged)}</strong></div>
                <div style="font-size:13px;color:${C.textLight};margin-top:6px;">Estado de pago: ${paymentLabel}</div>
              </td></tr>
            </table>
            ${
              address
                ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:${C.bg};border:1px solid ${C.border};border-radius:12px;">
                <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;margin-bottom:4px;">${fulfillment}</div>
                <div style="font-size:13px;color:${C.textMuted};">📍 ${address}</div>
              </td></tr></table>`
                : ''
            }
            <table role="presentation" cellspacing="0" cellpadding="0" align="center" width="100%">
              <tr><td align="center" class="cta-cell" style="border-radius:14px;background:${C.aqua};">
                <a href="${subscriptionsUrl}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">Ver mis suscripciones</a>
              </td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${C.textLight};text-align:center;">
              Puedes pausar o cancelar tu suscripción en cualquier momento desde la app PetHub.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px;background:${C.bg};text-align:center;border-top:1px solid ${C.border};">
            <p style="margin:0;font-size:11px;color:#94a3b8;">© PetHub · <a href="https://pethubgt.com" style="color:${C.aquaDark};text-decoration:none;">pethubgt.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildSubscriptionRenewalText(data: SubscriptionRenewalEmailData): string {
  const lines = [
    `Hola ${data.client_name},`,
    '',
    'Tu suscripción se renovó automáticamente en PetHub.',
    '',
    `Producto: ${data.product_name}${data.product_size ? ` (${data.product_size})` : ''}`,
    `Frecuencia: ${subscriptionIntervalLabel(data.interval_type)}`,
    `Cantidad: ${data.quantity}`,
    `Entrega #${data.deliveries_count}: ${formatDateOnly(data.delivery_date)}`,
    `Próxima entrega: ${formatDateOnly(data.next_delivery_date)}`,
    '',
    `Orden: ${data.order_number}`,
    `Cargo: ${formatMoney(data.currency, data.amount_charged)}`,
    `Pago: ${paymentStatusLabel(data.payment_status)}`,
    '',
    `Ver suscripciones: ${(data.app_url || 'https://pethubgt.com')}/my-subscriptions`,
    '',
    'PetHub',
  ];
  return lines.join('\n');
}

export interface AdoptionApplicationEmailData {
  applicant_name: string;
  applicant_email: string;
  pet_name: string;
  pet_species?: string | null;
  pet_breed?: string | null;
  pet_image_url?: string | null;
  reviewer_name: string;
  status: 'approved' | 'rejected';
  application_message?: string | null;
  updated_at: string;
  app_url?: string;
}

type AdoptionEmailMeta = {
  subject: string;
  headerBg: string;
  headerSubtitle: string;
  headerIcon: string;
  title: string;
  message: string;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  ctaLabel: string;
  ctaPath: string;
};

function adoptionEmailMeta(status: 'approved' | 'rejected'): AdoptionEmailMeta {
  if (status === 'approved') {
    return {
      subject: '¡Tu solicitud de adopción fue aprobada!',
      headerBg: C.mint,
      headerSubtitle: 'Solicitud aprobada',
      headerIcon: '🎉',
      title: '¡Buenas noticias!',
      message:
        'Tu solicitud de adopción fue aprobada. Ya puedes chatear con el refugio o dueño para coordinar los siguientes pasos.',
      badgeLabel: 'Aprobada',
      badgeBg: C.mintLight,
      badgeColor: C.mintDark,
      badgeBorder: 'rgba(56, 249, 160, 0.4)',
      ctaLabel: 'Abrir chat de adopción',
      ctaPath: '/adopcion',
    };
  }

  return {
    subject: 'Actualización sobre tu solicitud de adopción',
    headerBg: '#64748b',
    headerSubtitle: 'Solicitud no aprobada',
    headerIcon: '💙',
    title: 'Gracias por tu interés',
    message:
      'En esta ocasión tu solicitud no fue aprobada. Puedes seguir explorando otras mascotas en adopción en PetHub.',
    badgeLabel: 'No aprobada',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    badgeBorder: '#cbd5e1',
    ctaLabel: 'Ver mis solicitudes',
    ctaPath: '/adopcion',
  };
}

function adoptionSpeciesLabel(species?: string | null): string {
  switch (species?.toLowerCase()) {
    case 'dog':
    case 'perro':
      return 'Perro';
    case 'cat':
    case 'gato':
      return 'Gato';
    default:
      return species || 'Mascota';
  }
}

export function buildAdoptionApplicationSubject(data: AdoptionApplicationEmailData): string {
  const meta = adoptionEmailMeta(data.status);
  return `${meta.subject} — ${data.pet_name} · PetHub`;
}

export function buildAdoptionApplicationHtml(data: AdoptionApplicationEmailData): string {
  const meta = adoptionEmailMeta(data.status);
  const appUrl = data.app_url || 'https://pethubgt.com';
  const ctaUrl = `${appUrl}${meta.ctaPath}`;
  const applicantName = escapeHtml(data.applicant_name);
  const petName = escapeHtml(data.pet_name);
  const speciesLine = [adoptionSpeciesLabel(data.pet_species), data.pet_breed]
    .filter(Boolean)
    .map((part) => escapeHtml(part as string))
    .join(' · ');

  const petImage = data.pet_image_url
    ? `<img src="${escapeHtml(data.pet_image_url)}" alt="" width="72" height="72" style="border-radius:14px;object-fit:cover;display:block;border:1px solid ${C.border};" />`
    : `<table role="presentation" cellspacing="0" cellpadding="0" width="72" height="72"><tr><td align="center" valign="middle" style="width:72px;height:72px;border-radius:14px;background:${C.aqua};font-size:28px;color:#fff;">🐾</td></tr></table>`;

  const messageBlock = data.application_message?.trim()
    ? `<div style="margin-top:14px;padding:12px 14px;background:${C.bg};border-radius:10px;font-size:13px;color:${C.textMuted};line-height:1.55;">
        <strong style="color:${C.text};">Tu mensaje:</strong><br />${escapeHtml(truncate(data.application_message, 240))}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)} — PetHub</title>
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:${C.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.bgCard};border-radius:20px;overflow:hidden;border:1px solid rgba(0,240,200,0.2);box-shadow:${C.shadow};">
        <tr>
          <td class="email-header" bgcolor="${meta.headerBg}" style="padding:36px 28px;background:${meta.headerBg};text-align:center;">
            <div style="font-size:32px;line-height:1;margin-bottom:10px;">${meta.headerIcon}</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">PetHub</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.95);margin-top:6px;font-weight:500;">${escapeHtml(meta.headerSubtitle)}</div>
          </td>
        </tr>
        <tr>
          <td class="email-body" style="padding:28px 24px;">
            <p style="margin:0 0 6px;font-size:17px;color:${C.text};">Hola <strong>${applicantName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${C.textMuted};">${meta.message}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cardGradient};border:1px solid rgba(0,240,200,0.28);border-radius:14px;margin-bottom:20px;">
              <tr><td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="84" valign="top" style="padding-right:14px;">${petImage}</td>
                    <td valign="top">
                      <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Mascota</div>
                      <div style="font-size:18px;font-weight:800;color:${C.aquaDark};margin-bottom:8px;">${petName}</div>
                      ${speciesLine ? `<div style="font-size:13px;color:${C.textMuted};margin-bottom:10px;">${speciesLine}</div>` : ''}
                      ${badge(meta.badgeLabel, { bg: meta.badgeBg, color: meta.badgeColor, border: meta.badgeBorder })}
                    </td>
                  </tr>
                </table>
                <div style="margin-top:14px;font-size:13px;color:${C.textMuted};">
                  Revisado por: <strong style="color:${C.text};">${escapeHtml(data.reviewer_name)}</strong>
                </div>
                <div style="margin-top:6px;font-size:12px;color:${C.textLight};">Actualizado: ${formatDateShort(data.updated_at)}</div>
                ${messageBlock}
              </td></tr>
            </table>
            ${
              data.status === 'approved'
                ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:${C.mintLight};border:1px solid rgba(56,249,160,0.35);border-radius:12px;font-size:13px;line-height:1.6;color:${C.textMuted};">
                <strong style="color:${C.mintDark};">Siguiente paso:</strong> entra a PetHub → Adopción → Chats para coordinar la entrega con ${escapeHtml(data.reviewer_name)}.
              </td></tr></table>`
                : ''
            }
            <table role="presentation" cellspacing="0" cellpadding="0" align="center" width="100%">
              <tr><td align="center" class="cta-cell" style="border-radius:14px;background:${data.status === 'approved' ? C.mint : C.aqua};">
                <a href="${ctaUrl}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${meta.ctaLabel}</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px;background:${C.bg};text-align:center;border-top:1px solid ${C.border};">
            <p style="margin:0;font-size:11px;color:#94a3b8;">© PetHub · <a href="https://pethubgt.com" style="color:${C.aquaDark};text-decoration:none;">pethubgt.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildAdoptionApplicationText(data: AdoptionApplicationEmailData): string {
  const meta = adoptionEmailMeta(data.status);
  const lines = [
    `Hola ${data.applicant_name},`,
    '',
    meta.message,
    '',
    `Mascota: ${data.pet_name}`,
    data.pet_breed ? `Raza: ${data.pet_breed}` : '',
    `Estado: ${meta.badgeLabel}`,
    `Revisado por: ${data.reviewer_name}`,
    '',
    ...(data.application_message?.trim() ? [`Tu mensaje: ${data.application_message.trim()}`, ''] : []),
    data.status === 'approved'
      ? 'Siguiente paso: entra a PetHub → Adopción → Chats para coordinar la adopción.'
      : 'Puedes seguir explorando otras mascotas en adopción.',
    '',
    `Abrir PetHub: ${(data.app_url || 'https://pethubgt.com')}${meta.ctaPath}`,
    '',
    'PetHub',
  ].filter(Boolean);
  return lines.join('\n');
}

function itemTypeLabel(type: string): string {
  return type === 'service' ? 'Servicio' : 'Producto';
}

function badge(
  label: string,
  opts?: { bg?: string; color?: string; border?: string },
): string {
  const bg = opts?.bg ?? C.aquaLight;
  const color = opts?.color ?? C.aquaDark;
  const border = opts?.border ?? 'rgba(0, 240, 200, 0.35)';
  return `<span style="display:inline-block;background:${bg};color:${color};border:1px solid ${border};font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;margin:0 6px 6px 0;line-height:1.3;white-space:nowrap;">${escapeHtml(label)}</span>`;
}

function renderDeliveryScheduleNotice(createdAt: string): string {
  const message = buildDeliveryScheduleMessage(createdAt);
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 18px;background:${C.mintLight};border:1px solid rgba(56, 249, 160, 0.45);border-radius:14px;">
          <div style="font-size:13px;font-weight:700;color:${C.mintDark};margin-bottom:6px;">🚚 Entrega a domicilio</div>
          <div style="font-size:14px;line-height:1.6;color:${C.text};">
            <strong>${escapeHtml(message)}</strong>
          </div>
        </td>
      </tr>
    </table>`;
}

function resolveFulfillmentMethod(data: Pick<OrderEmailData, 'fulfillment_method' | 'delivery_fee' | 'delivery_address'>): 'delivery' | 'pickup' {
  if (data.fulfillment_method === 'delivery' || data.fulfillment_method === 'pickup') {
    return data.fulfillment_method;
  }
  if ((data.delivery_fee ?? 0) > 0) return 'delivery';
  if (data.delivery_address?.trim()) return 'delivery';
  return 'pickup';
}

function renderItemBadges(item: OrderEmailItem, fulfillmentMethod: 'delivery' | 'pickup'): string {
  const parts: string[] = [
    badge(itemTypeLabel(item.item_type), {
      bg: C.aquaLight,
      color: C.aquaDark,
      border: 'rgba(0, 240, 200, 0.35)',
    }),
  ];

  if (item.provider_name) {
    parts.push(
      badge(item.provider_name, { bg: '#f8fafc', color: C.textMuted, border: C.border }),
    );
  }
  if (item.appointment_label) {
    parts.push(
      badge(`📅 ${item.appointment_label}`, {
        bg: C.mintLight,
        color: C.mintDark,
        border: 'rgba(56, 249, 160, 0.35)',
      }),
    );
  }
  if (item.pet_names?.length) {
    parts.push(
      badge(`🐾 ${item.pet_names.join(', ')}`, {
        bg: C.mangoLight,
        color: C.mangoDark,
        border: 'rgba(255, 183, 3, 0.35)',
      }),
    );
  }
  if (fulfillmentMethod === 'delivery') {
    parts.push(
      badge('🚚 Entrega a domicilio', {
        bg: C.mintLight,
        color: C.mintDark,
        border: 'rgba(56, 249, 160, 0.35)',
      }),
    );
  } else {
    parts.push(
      badge('🏪 Retiro en tienda', {
        bg: C.aquaLight,
        color: C.aquaDark,
        border: 'rgba(0, 240, 200, 0.35)',
      }),
    );
  }

  return parts.join('');
}

function renderItems(items: OrderEmailItem[], currency: string, fulfillmentMethod: 'delivery' | 'pickup'): string {
  return items
    .map((item, index) => {
      const name = escapeHtml(item.item_name);
      const desc = item.item_description
        ? escapeHtml(truncate(item.item_description))
        : '';
      const price = formatMoney(item.currency || currency, item.total_price);
      const isLast = index === items.length - 1;

      const imageBlock = item.item_image_url
        ? `<img src="${escapeHtml(item.item_image_url)}" alt="" width="64" height="64" style="border-radius:12px;object-fit:cover;display:block;border:1px solid ${C.border};" />`
        : `<table role="presentation" cellspacing="0" cellpadding="0" width="64" height="64" style="border-radius:12px;background:${C.aqua};"><tr><td align="center" valign="middle" style="font-size:24px;color:#fff;border-radius:12px;background:${C.aqua};">🐾</td></tr></table>`;

      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="item-card" style="margin-bottom:${isLast ? '0' : '12px'};background:${C.bgCard};border:1px solid ${C.border};border-radius:14px;">
          <tr>
            <td style="padding:14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="72" valign="top" class="item-img-col" style="padding-right:12px;">
                    ${imageBlock}
                  </td>
                  <td valign="top" class="item-body-col">
                    <div style="font-size:15px;font-weight:700;color:${C.text};line-height:1.35;margin-bottom:4px;">${name}</div>
                    ${desc ? `<div style="font-size:12px;color:${C.textLight};margin-bottom:8px;line-height:1.45;">${desc}</div>` : ''}
                    <div style="line-height:0;font-size:0;">${renderItemBadges(item, fulfillmentMethod)}</div>
                  </td>
                  <td width="88" valign="top" align="right" class="item-price-col hide-mobile" style="padding-left:8px;">
                    <div style="font-size:16px;font-weight:800;color:${C.aquaDark};white-space:nowrap;">${price}</div>
                    <div style="font-size:12px;color:${C.textLight};margin-top:4px;">Cant. ${item.quantity}</div>
                  </td>
                </tr>
                <tr class="show-mobile" style="display:none;">
                  <td colspan="3" style="padding-top:10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};border-radius:10px;">
                      <tr>
                        <td style="padding:10px 12px;font-size:13px;color:${C.textMuted};">Cantidad: <strong style="color:${C.text};">${item.quantity}</strong></td>
                        <td align="right" style="padding:10px 12px;font-size:16px;font-weight:800;color:${C.aquaDark};">${price}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    })
    .join('');
}

const EMAIL_STYLES = `
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding:12px 8px !important; }
    .email-body { padding:20px 16px !important; }
    .email-header { padding:28px 20px !important; }
    .stack-col { display:block !important; width:100% !important; max-width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .stack-col-gap { padding-bottom:12px !important; }
    .order-meta-right { text-align:left !important; padding-top:10px !important; }
    .hide-mobile { display:none !important; max-height:0 !important; overflow:hidden !important; }
    .show-mobile { display:table-row !important; }
    .item-img-col { width:56px !important; padding-right:10px !important; }
    .cta-cell a { display:block !important; text-align:center !important; padding:16px 24px !important; }
    .summary-total { font-size:20px !important; }
  }
`;

export function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const fulfillmentMethod = resolveFulfillmentMethod(data);
  const deliverySectionTitle = fulfillmentMethod === 'delivery' ? '📦 Entrega' : '🏪 Retiro en tienda';
  const appUrl = data.app_url || 'https://pethubgt.com';
  const ordersUrl = `${appUrl}/client-orders`;
  const clientName = escapeHtml(data.client_name);
  const deliveryName = escapeHtml(data.delivery_name || data.client_name);

  const deliveryLines: string[] = [`<strong style="color:${C.text};">${deliveryName}</strong>`];
  if (data.delivery_phone) {
    deliveryLines.push(`<span style="color:${C.textMuted};">📞 ${escapeHtml(data.delivery_phone)}</span>`);
  }
  if (data.delivery_address || data.delivery_city) {
    const addr = [data.delivery_address, data.delivery_city].filter(Boolean).map(escapeHtml).join(', ');
    deliveryLines.push(`<span style="color:${C.textMuted};">📍 ${addr}</span>`);
  }
  if (data.delivery_instructions) {
    deliveryLines.push(
      `<span style="display:block;margin-top:8px;padding:10px 12px;background:${C.bg};border-radius:8px;font-size:12px;color:${C.textLight};line-height:1.45;"><strong>Instrucciones:</strong> ${escapeHtml(data.delivery_instructions)}</span>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Confirmación de compra — PetHub</title>
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:${C.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.bgCard};border-radius:20px;overflow:hidden;border:1px solid rgba(0, 240, 200, 0.2);box-shadow:${C.shadow};">

          <!-- Header -->
          <tr>
            <td class="email-header" bgcolor="#00F0C8" style="padding:36px 28px;background:${C.headerGradient};text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 12px;">
                <tr>
                  <td width="48" height="48" align="center" valign="middle" style="background:rgba(255,255,255,0.25);border-radius:50%;font-size:22px;line-height:48px;color:#ffffff;">✓</td>
                </tr>
              </table>
              <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">PetHub</div>
              <div style="font-size:15px;color:rgba(255,255,255,0.95);margin-top:6px;font-weight:500;">Tu compra fue confirmada</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:28px 24px;">
              <p style="margin:0 0 6px;font-size:17px;color:${C.text};">Hola <strong>${clientName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:${C.textMuted};">
                Gracias por confiar en PetHub. Tu pedido ya está registrado — aquí tienes el resumen completo.
              </p>

              <!-- Order summary card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cardGradient};border:1px solid rgba(0, 240, 200, 0.28);border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" class="stack-col" width="50%">
                          <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Número de orden</div>
                          <div style="font-size:17px;font-weight:800;color:${C.aquaDark};font-family:'SF Mono',Monaco,Consolas,monospace;letter-spacing:0.02em;">${escapeHtml(data.order_number)}</div>
                        </td>
                        <td valign="top" align="right" class="stack-col order-meta-right" width="50%">
                          <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Fecha</div>
                          <div style="font-size:13px;color:${C.textMuted};line-height:1.4;">${formatDateShort(data.created_at)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:14px;">
                          ${badge(orderStatusLabel(data.status), { bg: C.mintLight, color: C.mintDark, border: 'rgba(56, 249, 160, 0.4)' })}
                          ${badge(paymentStatusLabel(data.payment_status), { bg: C.aquaLight, color: C.aquaDark, border: 'rgba(0, 240, 200, 0.4)' })}
                        </td>
                      </tr>
                      ${data.invoice_number ? `<tr><td colspan="2" style="padding-top:12px;font-size:12px;color:${C.textLight};">Factura: <strong style="color:${C.text};">${escapeHtml(data.invoice_number)}</strong></td></tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${fulfillmentMethod === 'delivery' ? renderDeliveryScheduleNotice(data.created_at) : ''}

              <!-- Items -->
              <div style="font-size:13px;font-weight:700;color:${C.aquaDark};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Detalle de tu compra</div>
              ${renderItems(data.items, data.currency, fulfillmentMethod)}

              <!-- Delivery + Payment -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td width="50%" valign="top" class="stack-col stack-col-gap" style="padding-right:6px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};border:1px solid ${C.border};border-radius:14px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">${deliverySectionTitle}</div>
                          <div style="font-size:14px;line-height:1.65;color:${C.textMuted};">
                            ${deliveryLines.join('<br style="line-height:1.8;" />')}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" class="stack-col" style="padding-left:6px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};border:1px solid ${C.border};border-radius:14px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">💳 Pago</div>
                          <div style="font-size:14px;line-height:1.8;color:${C.textMuted};">
                            <span style="display:block;">Método: <strong style="color:${C.text};">${paymentMethodLabel(data.payment_method)}</strong></span>
                            <span style="display:block;">Estado: <strong style="color:${C.mintDark};">${paymentStatusLabel(data.payment_status)}</strong></span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Totals -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};border:1px solid ${C.border};border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:14px;color:${C.textMuted};padding:5px 0;">Subtotal</td>
                        <td align="right" style="font-size:14px;color:${C.text};padding:5px 0;font-weight:600;">${formatMoney(data.currency, data.total_amount)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:${C.textMuted};padding:5px 0;">Costo de entrega</td>
                        <td align="right" style="font-size:14px;color:${C.text};padding:5px 0;font-weight:600;">${formatMoney(data.currency, data.delivery_fee)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:12px;border-top:2px solid ${C.border};">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="font-size:16px;font-weight:700;color:${C.aquaDark};">Total pagado</td>
                              <td align="right" class="summary-total" style="font-size:24px;font-weight:800;color:${C.aquaDark};">${formatMoney(data.currency, data.grand_total)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td class="cta-cell" align="center" bgcolor="#00F0C8" style="border-radius:12px;background:${C.ctaGradient};">
                    <a href="${ordersUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Ver mis órdenes →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.6;color:${C.textLight};text-align:center;">
                ¿Dudas sobre tu pedido? Responde a este correo o contáctanos desde la app PetHub.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:${C.bg};text-align:center;border-top:1px solid ${C.border};">
              <p style="margin:0;font-size:11px;color:${C.textLight};">© ${new Date().getFullYear()} PetHub — Cuidado integral para tu mascota</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOrderConfirmationText(data: OrderEmailData): string {
  const fulfillmentMethod = resolveFulfillmentMethod(data);
  const lines = [
    `Hola ${data.client_name},`,
    '',
    `Tu compra en PetHub fue confirmada.`,
    `Orden: ${data.order_number}`,
    `Fecha: ${formatDate(data.created_at)}`,
    '',
    ...(fulfillmentMethod === 'delivery'
      ? ['IMPORTANTE — Entrega a domicilio:', buildDeliveryScheduleMessage(data.created_at), '']
      : []),
    '--- Artículos ---',
    ...data.items.map((item) => {
      const parts = [
        `• ${item.item_name} (${itemTypeLabel(item.item_type)}) x${item.quantity} — ${formatMoney(item.currency || data.currency, item.total_price)}`,
      ];
      if (item.provider_name) parts.push(`  Proveedor: ${item.provider_name}`);
      if (item.appointment_label) parts.push(`  Cita: ${item.appointment_label}`);
      if (item.pet_names?.length) parts.push(`  Mascotas: ${item.pet_names.join(', ')}`);
      return parts.join('\n');
    }),
    '',
    `Subtotal: ${formatMoney(data.currency, data.total_amount)}`,
    `Entrega: ${formatMoney(data.currency, data.delivery_fee)}`,
    `TOTAL: ${formatMoney(data.currency, data.grand_total)}`,
    '',
    `Entrega a: ${data.delivery_name || data.client_name}`,
    `${data.delivery_address || ''}${data.delivery_city ? `, ${data.delivery_city}` : ''}`,
    `Pago: ${paymentMethodLabel(data.payment_method)}`,
    '',
    'Gracias por comprar en PetHub.',
  ];
  return lines.join('\n');
}
