import { addDays, format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { fetchTimeSlotsForDate } from '@/lib/availabilityResolver';

export interface ServiceRow {
  id: string;
  service_name: string;
  service_category: string;
  description: string;
  price: number;
  currency: string;
  duration_minutes: number;
  provider_id: string;
  uses_custom_availability?: boolean;
  providers?: { user_id: string; business_name: string } | null;
}

export interface AvailableSlot {
  slot_id: string;
  start_time: string;
  end_time: string;
  is_generated: boolean;
}

export async function findServiceByQuery(query: string): Promise<ServiceRow | null> {
  const q = query.trim();
  if (!q) return null;

  const { data, error } = await supabase
    .from('provider_services')
    .select(
      'id, service_name, service_category, description, price, currency, duration_minutes, provider_id, uses_custom_availability, providers(user_id, business_name)',
    )
    .eq('is_active', true)
    .or(`service_name.ilike.%${q}%,description.ilike.%${q}%,service_category.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] as ServiceRow) ?? null;
}

export async function getAvailableSlotsForService(
  service: ServiceRow,
  dateStr: string,
): Promise<AvailableSlot[]> {
  const dayOfWeek = parseISO(dateStr).getDay();
  const durationMinutes = service.duration_minutes || 60;

  const resolvedSlots = await fetchTimeSlotsForDate(supabase, {
    serviceId: service.id,
    providerId: service.provider_id,
    usesCustomAvailability: Boolean(service.uses_custom_availability),
    dayOfWeek,
    durationMinutes,
    selectedDate: dateStr,
  });

  const { data: existingBookings } = await supabase
    .from('service_appointments')
    .select('appointment_time, status')
    .eq('service_id', service.id)
    .eq('appointment_date', dateStr);

  const bookedTimes = new Set(
    (existingBookings ?? [])
      .filter((b) => b.status === 'confirmed' || b.status === 'pending')
      .map((b) => String(b.appointment_time ?? '').slice(0, 5)),
  );

  return resolvedSlots
    .filter((slot) => !bookedTimes.has(slot.slot_start_time))
    .map((slot) => ({
      slot_id: slot.id,
      start_time: slot.slot_start_time,
      end_time: slot.slot_end_time,
      is_generated: slot.id.startsWith('generated-'),
    }));
}

export async function searchAvailabilityNextDays(
  service: ServiceRow,
  startDate?: string,
  days = 7,
): Promise<Array<{ date: string; slots: AvailableSlot[] }>> {
  const start = startDate ? parseISO(startDate) : new Date();
  const results: Array<{ date: string; slots: AvailableSlot[] }> = [];

  for (let i = 0; i < days; i++) {
    const date = format(addDays(start, i), 'yyyy-MM-dd');
    const slots = await getAvailableSlotsForService(service, date);
    if (slots.length > 0) {
      results.push({ date, slots: slots.slice(0, 8) });
    }
  }

  return results;
}

export async function resolveProviderUserId(providerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('providers')
    .select('user_id')
    .eq('id', providerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
