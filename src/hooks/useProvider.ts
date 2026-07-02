import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPetsForAppointment, type OrderItemPet } from '@/utils/orderItemPets';
import { formatAppointmentTimeLabel } from '@/utils/appointmentDisplay';

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  phone: string;
  address: string;
  description: string;
  profile_picture_url: string; // Mandatory profile picture
  logo_url?: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  city_id?: number;
  municipality?: string;
  department?: string;
  google_place_id?: string;
  formatted_address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  has_delivery?: boolean;
  has_pickup?: boolean;
  delivery_fee?: number;
  created_at: string;
  updated_at: string;
}

type ProviderProfileInput = Partial<ProviderProfile> & {
  municipality?: string;
  department?: string;
};

const PROVIDER_WRITABLE_COLUMNS = [
  'business_name',
  'business_type',
  'phone',
  'address',
  'description',
  'profile_picture_url',
  'logo_url',
  'city_id',
  'municipality',
  'department',
  'google_place_id',
  'formatted_address',
  'neighborhood',
  'postal_code',
  'latitude',
  'longitude',
  'has_delivery',
  'has_pickup',
  'delivery_fee',
] as const;

function sanitizeProviderPayload(profileData: ProviderProfileInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of PROVIDER_WRITABLE_COLUMNS) {
    const value = profileData[key as keyof ProviderProfileInput];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  if (!payload.city_id || payload.city_id === 0) {
    payload.city_id = null;
  }

  payload.latitude = profileData.latitude ?? null;
  payload.longitude = profileData.longitude ?? null;

  return payload;
}

async function resolveCityId(municipality: string, department: string): Promise<number | null> {
  const city = municipality.trim();
  const dept = department.trim();
  if (!city || !dept) return null;

  const { data } = await supabase
    .from('guatemala_cities')
    .select('id')
    .ilike('city_name', city)
    .ilike('department', dept)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  service_name: string;
  service_category: string; // e.g., "Veterinaria", "Grooming", "Entrenamiento"
  description: string;
  detailed_description?: string; // More detailed information for clients
  price: number; // Precio general (para retrocompatibilidad)
  // Precios por tamaño de perro (dog_size system)
  price_small?: number | null; // Precio para perros pequeños
  price_medium?: number | null; // Precio para perros medianos
  price_large?: number | null; // Precio para perros grandes
  price_extra_large?: number | null; // Precio para perros extra grandes
  currency: string; // GTQ for Quetzales
  duration_minutes: number;
  preparation_instructions?: string; // What clients need to prepare
  cancellation_policy?: string; // Cancellation terms
  max_advance_booking_days: number; // How far in advance clients can book
  min_advance_booking_hours: number; // Minimum notice required
  is_active: boolean;
  service_image_url?: string; // Image of the service
  secondary_images?: string[];
  uses_custom_availability?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface ProviderTimeSlot {
  id: string;
  provider_id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  max_bookings_per_slot: number;
  created_at: string;
}

export interface ProviderServiceAvailability {
  id: string;
  service_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  created_at: string;
}

export interface ProviderServiceTimeSlot {
  id: string;
  service_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  slot_start_time: string; // HH:MM format
  slot_end_time: string; // HH:MM format
  is_available: boolean;
  max_bookings_per_slot: number;
  created_at: string;
}

export interface ProviderAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  service_id: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  appointment_time?: string;
  // Joined data
  provider_services?: {
    service_name: string;
    service_category?: string;
    description?: string;
    detailed_description?: string;
    price: number;
    currency: string;
    duration_minutes?: number;
    preparation_instructions?: string;
    cancellation_policy?: string;
  };
  client_email?: string;
  client_name?: string;
  client_phone?: string;
  order_id?: string | null;
  order_item_id?: string | null;
  total_price?: number | null;
  currency?: string;
  service_variant_name?: string;
  slot_end_time?: string | null;
  pets?: OrderItemPet[];
}

export interface ProviderProduct {
  id: string;
  provider_id: string;
  product_name: string;
  product_category: string;
  description: string;
  detailed_description?: string;
  price: number; // Precio general (para retrocompatibilidad)
  // Precios por tamaño de perro (dog_size system)
  price_small?: number | null; // Precio para perros pequeños
  price_medium?: number | null; // Precio para perros medianos
  price_large?: number | null; // Precio para perros grandes
  price_extra_large?: number | null; // Precio para perros extra grandes
  // Precios por talla de ropa (clothing_size system)
  price_xs?: number | null; // Precio para talla XS
  price_s?: number | null; // Precio para talla S
  price_m?: number | null; // Precio para talla M
  price_l?: number | null; // Precio para talla L
  price_xl?: number | null; // Precio para talla XL
  price_xxl?: number | null; // Precio para talla XXL
  currency: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  product_image_url?: string; // Imagen principal
  secondary_images?: string[]; // Array de hasta 5 imágenes secundarias
  brand?: string;
  weight_kg?: number;
  dimensions_cm?: string;
  tags?: string[];
  target_species?: string[];
  product_subtype?: string | null;
  life_stage?: string | null;
  subscription_enabled?: boolean;
  ingredients?: string | null;
  nutrition_protein_pct?: number | null;
  nutrition_fat_pct?: number | null;
  nutrition_fiber_pct?: number | null;
  nutrition_moisture_pct?: number | null;
  nutrition_ash_pct?: number | null;
  nutrition_calories_per_100g?: number | null;
  created_at: string;
  updated_at: string;
}

export const useProvider = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [products, setProducts] = useState<ProviderProduct[]>([]);
  const [appointments, setAppointments] = useState<ProviderAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch provider profile
  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data ?? null);
    } catch (err) {
      console.error('Error fetching provider profile:', err);
      setError(err instanceof Error ? err.message : 'Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  // Create or update provider profile
  const saveProfile = async (profileData: ProviderProfileInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      let result;

      const resolvedCityId =
        profileData.city_id && profileData.city_id > 0
          ? profileData.city_id
          : await resolveCityId(profileData.municipality ?? '', profileData.department ?? '');

      const formattedAddress =
        profileData.formatted_address ||
        [profileData.address, profileData.municipality, profileData.department]
          .filter(Boolean)
          .join(', ');

      const payload = sanitizeProviderPayload({
        ...profileData,
        city_id: resolvedCityId,
        formatted_address: formattedAddress || profileData.formatted_address,
      });

      if (profile) {
        const updateData = {
          ...payload,
          updated_at: new Date().toISOString(),
        };

        console.log('📤 Updating provider profile with data:', updateData);

        const { data, error } = await supabase
          .from('providers')
          .update(updateData)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating profile:', error);
          throw error;
        }

        console.log('✅ Profile updated successfully:', data);
        setProfile(data);
        result = data;
      } else {
        const { data, error } = await supabase
          .from('providers')
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating profile:', error);
          throw error;
        }

        console.log('✅ Profile created successfully:', data);
        result = data;
      }

      setProfile(result);
      return result;
    } catch (err) {
      console.error('Error saving provider profile:', err);
      setError(err instanceof Error ? err.message : 'Error saving profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `provider-profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('provider-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('provider-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      throw new Error('Failed to upload profile picture');
    }
  };

  // Fetch provider services
  const fetchServices = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Error fetching services');
    }
  };

  // Add new service
  const addService = async (serviceData: Omit<ProviderService, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => {
    if (!profile) throw new Error('Provider profile not found');

    try {
      const { data, error } = await supabase
        .from('provider_services')
        .insert({
          ...serviceData,
          provider_id: profile.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding service:', err);
      setError(err instanceof Error ? err.message : 'Error adding service');
      throw err;
    }
  };

  // Update service
  const updateService = async (serviceId: string, updates: Partial<ProviderService>) => {
    try {
      const { data, error } = await supabase
        .from('provider_services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) throw error;
      setServices(prev => prev.map(service => 
        service.id === serviceId ? data : service
      ));
      return data;
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err instanceof Error ? err.message : 'Error updating service');
      throw err;
    }
  };

  // Delete service
  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('provider_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      setServices(prev => prev.filter(service => service.id !== serviceId));
    } catch (err) {
      console.error('Error deleting service:', err);
      setError(err instanceof Error ? err.message : 'Error deleting service');
      throw err;
    }
  };

  // Fetch service availability
  const fetchServiceAvailability = async (serviceId: string) => {
    try {
      console.log('Fetching availability for service:', serviceId);
      const { data, error } = await supabase
        .from('provider_service_availability')
        .select('*')
        .eq('service_id', serviceId)
        .order('day_of_week', { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('Availability table not found, returning empty array');
          return [];
        }
        throw error;
      }
      
      console.log('Fetched availability data:', data);
      if (data) {
        console.log('Availability by day:');
        data.forEach(avail => {
          console.log(`  Day ${avail.day_of_week}: ${avail.start_time} - ${avail.end_time}`);
        });
      }
      
      return data || [];
    } catch (err) {
      console.error('Error fetching service availability:', err);
      // Return empty array on error to prevent crashes
      return [];
    }
  };

  // Fetch service time slots
  const fetchServiceTimeSlots = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_service_time_slots')
        .select('*')
        .eq('service_id', serviceId)
        .order('day_of_week', { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('Time slots table not found, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('Error fetching service time slots:', err);
      // Return empty array on error to prevent crashes
      return [];
    }
  };

  // Save service availability
  const saveServiceAvailability = async (serviceId: string, availability: Omit<ProviderServiceAvailability, 'id' | 'service_id' | 'created_at'>[]) => {
    console.log('=== saveServiceAvailability CALLED ===');
    console.log('Service ID:', serviceId);
    console.log('Availability array:', availability);
    console.log('Availability length:', availability.length);
    
    try {
      // Check if table exists first
      const { error: checkError } = await supabase
        .from('provider_service_availability')
        .select('id')
        .limit(1);

      if (checkError) {
        if (checkError.code === 'PGRST116' || checkError.message.includes('relation') || checkError.message.includes('does not exist')) {
          console.error('❌ Availability table not found!', checkError);
          throw new Error('La tabla de disponibilidad no existe en la base de datos');
        }
        throw checkError;
      }

      console.log('✅ Table exists, proceeding with save');

      // Delete existing availability for this service
      console.log('Deleting existing availability for service:', serviceId);
      const { error: deleteError } = await supabase
        .from('provider_service_availability')
        .delete()
        .eq('service_id', serviceId);
      
      if (deleteError) {
        console.warn('Warning deleting existing availability:', deleteError);
        // Don't throw, continue with insert
      } else {
        console.log('✅ Existing availability deleted');
      }

      // Insert new availability
      if (availability.length > 0) {
        const availabilityData = availability.map(item => ({
          ...item,
          service_id: serviceId,
          // Ensure day_of_week is a number
          day_of_week: typeof item.day_of_week === 'string' ? parseInt(item.day_of_week, 10) : item.day_of_week,
          // Ensure times are in HH:MM format (remove seconds if present)
          start_time: item.start_time ? item.start_time.substring(0, 5) : '09:00',
          end_time: item.end_time ? item.end_time.substring(0, 5) : '17:00'
        }));

        console.log('📤 Inserting availability data:', JSON.stringify(availabilityData, null, 2));

        const { data: insertedData, error } = await supabase
          .from('provider_service_availability')
          .insert(availabilityData)
          .select();

        if (error) {
          console.error('❌ Error inserting availability:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }
        
        console.log('✅ Successfully inserted availability:', insertedData);
        console.log('Inserted records count:', insertedData?.length || 0);
      } else {
        console.warn('⚠️ No availability data to save (empty array)');
      }
      
      console.log('=== saveServiceAvailability COMPLETE ===');
    } catch (err) {
      console.error('❌ Error saving service availability:', err);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      // NOW THROW THE ERROR so it can be caught and displayed to the user
      throw err;
    }
  };

  const fetchProviderAvailability = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching provider availability:', err);
      return [];
    }
  };

  const fetchProviderTimeSlots = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching provider time slots:', err);
      return [];
    }
  };

  const saveProviderAvailability = async (
    providerId: string,
    availability: Omit<ProviderAvailability, 'id' | 'provider_id' | 'created_at'>[]
  ) => {
    const { error: deleteError } = await supabase
      .from('provider_availability')
      .delete()
      .eq('provider_id', providerId);

    if (deleteError) throw deleteError;

    if (availability.length === 0) return;

    const payload = availability.map((item) => ({
      ...item,
      provider_id: providerId,
      day_of_week: typeof item.day_of_week === 'string' ? parseInt(item.day_of_week, 10) : item.day_of_week,
      start_time: item.start_time ? item.start_time.substring(0, 5) : '09:00',
      end_time: item.end_time ? item.end_time.substring(0, 5) : '17:00',
    }));

    const { error } = await supabase.from('provider_availability').insert(payload);
    if (error) throw error;
  };

  const saveProviderTimeSlots = async (
    providerId: string,
    timeSlots: Omit<ProviderTimeSlot, 'id' | 'provider_id' | 'created_at'>[]
  ) => {
    const { error: deleteError } = await supabase
      .from('provider_time_slots')
      .delete()
      .eq('provider_id', providerId);

    if (deleteError) throw deleteError;

    if (timeSlots.length === 0) return;

    const payload = timeSlots.map((item) => ({
      ...item,
      provider_id: providerId,
      day_of_week: typeof item.day_of_week === 'string' ? parseInt(item.day_of_week, 10) : item.day_of_week,
      slot_start_time: item.slot_start_time ? item.slot_start_time.substring(0, 5) : '09:00',
      slot_end_time: item.slot_end_time ? item.slot_end_time.substring(0, 5) : '10:00',
    }));

    const { error } = await supabase.from('provider_time_slots').insert(payload);
    if (error) throw error;
  };

  // Save service time slots
  const saveServiceTimeSlots = async (serviceId: string, timeSlots: Omit<ProviderServiceTimeSlot, 'id' | 'service_id' | 'created_at'>[]) => {
    try {
      // Check if table exists first
      const { error: checkError } = await supabase
        .from('provider_service_time_slots')
        .select('id')
        .limit(1);

      if (checkError) {
        if (checkError.code === 'PGRST116' || checkError.message.includes('relation') || checkError.message.includes('does not exist')) {
          console.warn('Time slots table not found, skipping save');
          return;
        }
        throw checkError;
      }

      // Delete existing time slots for this service
      await supabase
        .from('provider_service_time_slots')
        .delete()
        .eq('service_id', serviceId);

      // Insert new time slots
      if (timeSlots.length > 0) {
        const timeSlotsData = timeSlots.map(item => ({
          ...item,
          service_id: serviceId,
          // Ensure day_of_week is a number
          day_of_week: typeof item.day_of_week === 'string' ? parseInt(item.day_of_week, 10) : item.day_of_week,
          // Ensure times are in HH:MM format (remove seconds if present)
          slot_start_time: item.slot_start_time ? item.slot_start_time.substring(0, 5) : '09:00',
          slot_end_time: item.slot_end_time ? item.slot_end_time.substring(0, 5) : '10:00'
        }));

        console.log('Inserting time slots data:', timeSlotsData);

        const { data: insertedData, error } = await supabase
          .from('provider_service_time_slots')
          .insert(timeSlotsData)
          .select();

        if (error) {
          console.error('Error inserting time slots:', error);
          throw error;
        }
        
        console.log('Successfully inserted time slots:', insertedData);
      } else {
        console.log('No time slots data to save (empty array)');
      }
    } catch (err) {
      console.error('Error saving service time slots:', err);
      // Don't throw error to prevent service save from failing
      // Just log it for debugging
    }
  };

  // Fetch appointments with proper joins from service_appointments
  const fetchAppointments = async () => {
    if (!profile || !user) return;

    try {
      console.log('Fetching appointments for provider:', profile.id, 'user:', user.id);

      const { data: providerServices, error: servicesError } = await supabase
        .from('provider_services')
        .select('id')
        .eq('provider_id', profile.id);

      if (servicesError) {
        console.error('Error fetching provider services for appointments:', servicesError);
      }

      const serviceIds = (providerServices || []).map((s) => s.id);

      const orFilters = [
        `provider_id.eq.${user.id}`,
        `provider_id.eq.${profile.id}`,
      ];
      if (serviceIds.length > 0) {
        orFilters.push(`service_id.in.(${serviceIds.join(',')})`);
      }

      const selectWithJoins = `
        *,
        provider_services (
          service_name,
          service_category,
          description,
          detailed_description,
          price,
          currency,
          duration_minutes,
          preparation_instructions,
          cancellation_policy
        ),
        provider_service_time_slots:provider_service_time_slots!service_appointments_time_slot_id_fkey (
          slot_start_time,
          slot_end_time
        )
      `;

      let appointmentsData: Record<string, unknown>[] | null = null;

      const joinedResult = await supabase
        .from('service_appointments')
        .select(selectWithJoins)
        .or(orFilters.join(','))
        .order('appointment_date', { ascending: true });

      if (joinedResult.error) {
        console.warn('Joined appointments query failed, retrying simple select:', joinedResult.error);

        const simpleResult = await supabase
          .from('service_appointments')
          .select('*')
          .or(orFilters.join(','))
          .order('appointment_date', { ascending: true });

        if (simpleResult.error) {
          console.error('Error fetching service appointments:', simpleResult.error);
          throw simpleResult.error;
        }

        appointmentsData = simpleResult.data || [];

        if (appointmentsData.length > 0 && serviceIds.length > 0) {
          const { data: servicesData } = await supabase
            .from('provider_services')
            .select(
              'id, service_name, service_category, description, detailed_description, price, currency, duration_minutes, preparation_instructions, cancellation_policy',
            )
            .in('id', serviceIds);

          const serviceMap = new Map((servicesData || []).map((s) => [s.id, s]));
          appointmentsData = appointmentsData.map((apt) => ({
            ...apt,
            provider_services: serviceMap.get(apt.service_id as string) || null,
          }));
        }
      } else {
        appointmentsData = joinedResult.data || [];
      }

      const uniqueById = new Map<string, Record<string, unknown>>();
      (appointmentsData || []).forEach((apt) => {
        uniqueById.set(apt.id as string, apt);
      });
      const dedupedAppointments = Array.from(uniqueById.values());

      console.log('Service appointments query result:', {
        count: dedupedAppointments.length,
      });

      const orderItemIds = [
        ...new Set(
          dedupedAppointments
            .map((apt) => apt.order_item_id as string)
            .filter(Boolean),
        ),
      ];

      const orderItemMap = new Map<
        string,
        { item_name: string; total_price: number; currency: string }
      >();

      if (orderItemIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, item_name, total_price, currency')
          .in('id', orderItemIds);

        (orderItems || []).forEach((item) => {
          orderItemMap.set(item.id, {
            item_name: item.item_name,
            total_price: Number(item.total_price),
            currency: item.currency,
          });
        });
      }

      const clientIds = [
        ...new Set(
          dedupedAppointments
            .map((apt) => apt.client_id as string)
            .filter(Boolean),
        ),
      ];

      const clientNameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', clientIds);

        (profiles || []).forEach((p) => {
          if (p.full_name?.trim()) {
            clientNameMap.set(p.user_id, p.full_name.trim());
          }
        });
      }

      const enrichedAppointments = await Promise.all(
        dedupedAppointments.map(async (appointment) => {
          let clientEmail =
            (appointment.client_email as string) ||
            (appointment.client_name as string) ||
            'N/A';

          if ((!appointment.client_email || clientEmail === 'N/A') && appointment.order_id) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('client_email')
              .eq('id', appointment.order_id as string)
              .maybeSingle();

            if (orderData?.client_email) {
              clientEmail = orderData.client_email;
            }
          }

          const profileName = clientNameMap.get(appointment.client_id as string);
          if (profileName && (!clientEmail || clientEmail === 'N/A')) {
            clientEmail = profileName;
          }

          const timeSlot = appointment.provider_service_time_slots as
            | { slot_start_time?: string; slot_end_time?: string }
            | null
            | undefined;
          const svc = appointment.provider_services as ProviderAppointment['provider_services'];
          const orderItem = appointment.order_item_id
            ? orderItemMap.get(appointment.order_item_id as string)
            : undefined;

          const appointmentTime = formatAppointmentTimeLabel({
            appointmentTime: appointment.appointment_time as string | null,
            slotEndTime: appointment.slot_end_time as string | null,
            timeSlot,
          });

          const pets = await fetchPetsForAppointment({
            orderItemId: appointment.order_item_id as string | null | undefined,
            orderId: appointment.order_id as string | null | undefined,
            clientId: appointment.client_id as string,
            serviceId: appointment.service_id as string,
            createdAt: appointment.created_at as string,
            totalPrice: appointment.total_price != null ? Number(appointment.total_price) : null,
          });

          const clientName = (appointment.client_name as string) || profileName || '';
          const clientPhone = (appointment.client_phone as string) || '';

          return {
            id: appointment.id as string,
            provider_id: appointment.provider_id as string,
            client_id: appointment.client_id as string,
            service_id: appointment.service_id as string,
            order_id: (appointment.order_id as string | null) ?? null,
            order_item_id: (appointment.order_item_id as string | null) ?? null,
            appointment_date: appointment.appointment_date as string,
            status: (appointment.status as ProviderAppointment['status']) || 'pending',
            notes: appointment.notes as string | undefined,
            created_at: appointment.created_at as string,
            updated_at: appointment.updated_at as string,
            total_price:
              appointment.total_price != null
                ? Number(appointment.total_price)
                : orderItem?.total_price ?? null,
            currency:
              (appointment.currency as string) ||
              orderItem?.currency ||
              svc?.currency ||
              'GTQ',
            service_variant_name: orderItem?.item_name,
            slot_end_time: (appointment.slot_end_time as string | null) ?? null,
            provider_services: svc
              ? {
                  service_name: svc.service_name,
                  service_category: svc.service_category,
                  description: svc.description,
                  detailed_description: svc.detailed_description,
                  price: svc.price,
                  currency: svc.currency,
                  duration_minutes: svc.duration_minutes,
                  preparation_instructions: svc.preparation_instructions,
                  cancellation_policy: svc.cancellation_policy,
                }
              : null,
            client_email: clientEmail,
            client_name: clientName,
            client_phone: clientPhone,
            appointment_time: appointmentTime,
            pets,
          } satisfies ProviderAppointment;
        }),
      );

      console.log('Enriched appointments:', enrichedAppointments.length);
      setAppointments(enrichedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : 'Error fetching appointments');
      setAppointments([]);
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId: string, status: ProviderAppointment['status']) => {
    try {
      console.log('Updating appointment status:', { appointmentId, status });
      
      const { data, error } = await supabase
        .from('service_appointments')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      console.log('Update appointment result:', { data, error });

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      setAppointments(prev => prev.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status, updated_at: new Date().toISOString() }
          : appointment
      ));
      return data;
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(err instanceof Error ? err.message : 'Error updating appointment status');
      throw err;
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Load services and appointments when profile is available
  useEffect(() => {
    if (profile) {
      fetchServices();
      fetchAppointments();
      fetchProducts();
    }
  }, [profile]);

  // Fetch products
  const fetchProducts = async () => {
    if (!profile) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('provider_products')
        .select('*')
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Error fetching products');
    }
  };

  // Add product
  const addProduct = async (productData: Omit<ProviderProduct, 'id' | 'provider_id' | 'created_at' | 'updated_at'>) => {
    if (!profile) throw new Error('No provider profile found');

    try {
      const { data, error } = await supabase
        .from('provider_products')
        .insert({
          ...productData,
          provider_id: profile.id
        })
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding product:', err);
      setError(err instanceof Error ? err.message : 'Error adding product');
      throw err;
    }
  };

  // Update product
  const updateProduct = async (productId: string, productData: Partial<ProviderProduct>) => {
    try {
      const { data, error } = await supabase
        .from('provider_products')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => prev.map(product => 
        product.id === productId ? data : product
      ));
      return data;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Error updating product');
      throw err;
    }
  };

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      // Get the product first to access its image URL
      const productToDelete = products.find(p => p.id === productId);
      
      // Delete the product from database
      const { error } = await supabase
        .from('provider_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // If the product had an image, delete it from storage
      if (productToDelete?.product_image_url) {
        try {
          // Extract the file path from the URL
          const url = new URL(productToDelete.product_image_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // Get last two parts: bucket/file
          
          // Delete from storage
          await supabase.storage
            .from('product-images')
            .remove([filePath]);
        } catch (storageError) {
          // Log storage deletion error but don't fail the product deletion
          console.warn('Failed to delete product image from storage:', storageError);
        }
      }

      setProducts(prev => prev.filter(product => product.id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Error deleting product');
      throw err;
    }
  };

  return {
    profile,
    services,
    products,
    appointments,
    loading,
    error,
    saveProfile,
    uploadProfilePicture,
    addService,
    updateService,
    deleteService,
    addProduct,
    updateProduct,
    deleteProduct,
    updateAppointmentStatus,
    fetchServiceAvailability,
    fetchServiceTimeSlots,
    saveServiceAvailability,
    saveServiceTimeSlots,
    fetchProviderAvailability,
    fetchProviderTimeSlots,
    saveProviderAvailability,
    saveProviderTimeSlots,
  };
};
