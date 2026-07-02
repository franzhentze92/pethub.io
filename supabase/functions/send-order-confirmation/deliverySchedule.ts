const GUATEMALA_TZ = 'America/Guatemala';
const DELIVERY_CUTOFF_HOUR = 7;

function getGuatemalaDateParts(orderDate: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GUATEMALA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(orderDate);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
  };
}

function formatDeliveryDate(year: number, month: number, day: number): string {
  const deliveryUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat('es-GT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(deliveryUtc);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function buildDeliveryScheduleMessage(orderDate: Date | string = new Date()): string {
  const date = typeof orderDate === 'string' ? new Date(orderDate) : orderDate;
  const { year, month, day, hour } = getGuatemalaDateParts(date);
  const isSameDay = hour < DELIVERY_CUTOFF_HOUR;

  let deliveryYear = year;
  let deliveryMonth = month;
  let deliveryDay = day;

  if (!isSameDay) {
    const next = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
    deliveryYear = next.getUTCFullYear();
    deliveryMonth = next.getUTCMonth() + 1;
    deliveryDay = next.getUTCDate();
  }

  const formattedDate = formatDeliveryDate(deliveryYear, deliveryMonth, deliveryDay);

  if (isSameDay) {
    return `La entrega se realizará hoy, ${formattedDate}, durante el transcurso del día.`;
  }

  return `La entrega se realizará el ${formattedDate} durante el transcurso del día.`;
}
