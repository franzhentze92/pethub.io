/** Normalize HH:MM or HH:MM:SS for Postgres `time` columns. */
export function normalizePgTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    const [h, m, s] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}:${s}`;
  }
  return null;
}

/** Display label for UI (12h es-GT). */
export function formatTimeLabel(value?: string | null): string {
  if (!value) return '';
  const normalized = normalizePgTime(value);
  if (!normalized) return value;
  const [h, m] = normalized.split(':').map(Number);
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

export function formatAppointmentTimeLabel(params: {
  appointmentTime?: string | null;
  slotEndTime?: string | null;
  timeSlot?: { slot_start_time?: string; slot_end_time?: string } | null;
}): string {
  const startRaw =
    params.appointmentTime ||
    params.timeSlot?.slot_start_time ||
    null;
  const endRaw =
    params.slotEndTime ||
    params.timeSlot?.slot_end_time ||
    null;

  const start = formatTimeLabel(startRaw);
  const end = formatTimeLabel(endRaw);

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return 'Horario por confirmar';
}

export function formatAppointmentPrice(
  totalPrice?: number | null,
  currency?: string | null,
  fallbackPrice?: number | null,
  fallbackCurrency?: string | null,
): string {
  const amount = totalPrice ?? fallbackPrice ?? 0;
  const curr = currency || fallbackCurrency || 'GTQ';
  const symbol = curr === 'GTQ' ? 'Q.' : '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
}
