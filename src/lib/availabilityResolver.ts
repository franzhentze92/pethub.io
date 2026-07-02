import type { SupabaseClient } from '@supabase/supabase-js';

export interface AvailabilityRecord {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface TimeSlotRecord {
  id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  max_bookings_per_slot?: number;
}

export type AvailabilitySource = 'service' | 'provider' | 'none';

export interface ResolvedAvailability {
  source: AvailabilitySource;
  availability: AvailabilityRecord[];
  timeSlots: TimeSlotRecord[];
  availableDaysOfWeek: number[];
}

export function normalizeTime(value: string | null | undefined, fallback = '09:00'): string {
  if (!value) return fallback;
  return value.length >= 5 ? value.substring(0, 5) : value;
}

export function getAvailableDaysOfWeek(
  availability: AvailabilityRecord[],
  timeSlots: Pick<TimeSlotRecord, 'day_of_week' | 'is_available'>[]
): number[] {
  const days = new Set<number>();
  availability
    .filter((row) => row.is_available !== false)
    .forEach((row) => days.add(row.day_of_week));
  timeSlots
    .filter((row) => row.is_available !== false)
    .forEach((row) => days.add(row.day_of_week));
  return Array.from(days).sort((a, b) => a - b);
}

export function generateSlotsFromAvailabilityRanges(
  availability: AvailabilityRecord[],
  dayOfWeek: number,
  durationMinutes: number,
  idPrefix: string
): TimeSlotRecord[] {
  const slots: TimeSlotRecord[] = [];
  const ranges = availability.filter(
    (row) => row.day_of_week === dayOfWeek && row.is_available !== false
  );

  for (const range of ranges) {
    const startTime = normalizeTime(range.start_time, '09:00');
    const endTime = normalizeTime(range.end_time, '17:00');
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    if ([startHour, startMin, endHour, endMin].some((n) => Number.isNaN(n))) continue;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    let slotIndex = 1;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60);
      const slotStartMin = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + durationMinutes;
      const slotEndHour = Math.floor(slotEndMinutes / 60);
      const slotEndMin = slotEndMinutes % 60;

      slots.push({
        id: `${idPrefix}-${dayOfWeek}-${slotIndex}`,
        day_of_week: dayOfWeek,
        slot_start_time: `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`,
        slot_end_time: `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`,
        is_available: true,
      });

      currentMinutes += durationMinutes;
      slotIndex += 1;
    }
  }

  return slots;
}

function mapServiceAvailability(rows: Array<Record<string, unknown>>): AvailabilityRecord[] {
  return (rows ?? []).map((row) => ({
    day_of_week: Number(row.day_of_week),
    start_time: normalizeTime(String(row.start_time)),
    end_time: normalizeTime(String(row.end_time), '17:00'),
    is_available: row.is_available !== false,
  }));
}

function mapProviderAvailability(rows: Array<Record<string, unknown>>): AvailabilityRecord[] {
  return mapServiceAvailability(rows);
}

function mapServiceTimeSlots(rows: Array<Record<string, unknown>>): TimeSlotRecord[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    day_of_week: Number(row.day_of_week),
    slot_start_time: normalizeTime(String(row.slot_start_time)),
    slot_end_time: normalizeTime(String(row.slot_end_time), '10:00'),
    is_available: row.is_available !== false,
    max_bookings_per_slot: Number(row.max_bookings_per_slot ?? 1),
  }));
}

function mapProviderTimeSlots(rows: Array<Record<string, unknown>>): TimeSlotRecord[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    day_of_week: Number(row.day_of_week),
    slot_start_time: normalizeTime(String(row.slot_start_time)),
    slot_end_time: normalizeTime(String(row.slot_end_time), '10:00'),
    is_available: row.is_available !== false,
    max_bookings_per_slot: Number(row.max_bookings_per_slot ?? 1),
  }));
}

export async function fetchResolvedAvailability(
  supabase: SupabaseClient,
  params: {
    serviceId: string;
    providerId: string;
    usesCustomAvailability?: boolean;
  }
): Promise<ResolvedAvailability> {
  const { serviceId, providerId, usesCustomAvailability = false } = params;

  if (usesCustomAvailability) {
    const [{ data: serviceAvailability }, { data: serviceTimeSlots }] = await Promise.all([
      supabase
        .from('provider_service_availability')
        .select('day_of_week, start_time, end_time, is_available')
        .eq('service_id', serviceId)
        .eq('is_available', true)
        .order('day_of_week'),
      supabase
        .from('provider_service_time_slots')
        .select('id, day_of_week, slot_start_time, slot_end_time, is_available, max_bookings_per_slot')
        .eq('service_id', serviceId)
        .eq('is_available', true)
        .order('day_of_week'),
    ]);

    const availability = mapServiceAvailability(serviceAvailability ?? []);
    const timeSlots = mapServiceTimeSlots(serviceTimeSlots ?? []);

    return {
      source: availability.length || timeSlots.length ? 'service' : 'none',
      availability,
      timeSlots,
      availableDaysOfWeek: getAvailableDaysOfWeek(availability, timeSlots),
    };
  }

  const [{ data: providerAvailability }, { data: providerTimeSlots }] = await Promise.all([
    supabase
      .from('provider_availability')
      .select('day_of_week, start_time, end_time, is_available')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week'),
    supabase
      .from('provider_time_slots')
      .select('id, day_of_week, slot_start_time, slot_end_time, is_available, max_bookings_per_slot')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week'),
  ]);

  const availability = mapProviderAvailability(providerAvailability ?? []);
  const timeSlots = mapProviderTimeSlots(providerTimeSlots ?? []);

  return {
    source: availability.length || timeSlots.length ? 'provider' : 'none',
    availability,
    timeSlots,
    availableDaysOfWeek: getAvailableDaysOfWeek(availability, timeSlots),
  };
}

export async function fetchTimeSlotsForDate(
  supabase: SupabaseClient,
  params: {
    serviceId: string;
    providerId: string;
    usesCustomAvailability?: boolean;
    dayOfWeek: number;
    durationMinutes: number;
    selectedDate: string;
  }
): Promise<TimeSlotRecord[]> {
  const resolved = await fetchResolvedAvailability(supabase, params);
  const daySlots = resolved.timeSlots.filter((slot) => slot.day_of_week === params.dayOfWeek);

  if (daySlots.length > 0) {
    return daySlots;
  }

  return generateSlotsFromAvailabilityRanges(
    resolved.availability,
    params.dayOfWeek,
    params.durationMinutes,
    `generated-${params.serviceId}-${params.selectedDate}`
  );
}
