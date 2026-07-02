import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getPetImageUrls, type PetWithImages } from '@/utils/petImages';
import {
  CLIENT_BLUEPRINT_SECTIONS,
  type BlueprintConnectionStatus,
  type ClientBlueprintSectionDef,
} from '@/lib/blueprint/clientSections';

export interface BlueprintSectionStatus extends ClientBlueprintSectionDef {
  status: BlueprintConnectionStatus;
  completionPercent: number;
  missingFields: string[];
  statLabel?: string;
  statValue?: string | number;
}

export interface ClientBlueprintData {
  sections: BlueprintSectionStatus[];
  overallPercent: number;
  connectedCount: number;
  totalCount: number;
  nextSection: BlueprintSectionStatus | null;
}

type UserProfileRow = {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function evaluateProfile(profile: UserProfileRow | null): Pick<BlueprintSectionStatus, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  const checks = [
    { key: 'full_name', label: 'Nombre completo', ok: hasText(profile?.full_name) },
    { key: 'phone', label: 'Teléfono', ok: hasText(profile?.phone) },
    { key: 'address', label: 'Dirección', ok: hasText(profile?.address) },
    { key: 'avatar_url', label: 'Foto de perfil', ok: hasText(profile?.avatar_url) },
  ];
  const completed = checks.filter((c) => c.ok).length;
  const missingFields = checks.filter((c) => !c.ok).map((c) => c.label);
  const completionPercent = Math.round((completed / checks.length) * 100);

  let status: BlueprintConnectionStatus = 'disconnected';
  if (completionPercent === 100) status = 'connected';
  else if (completionPercent > 0) status = 'partial';

  return {
    status,
    completionPercent,
    missingFields,
    statLabel: 'Campos completados',
    statValue: `${completed}/${checks.length}`,
  };
}

function getPetMissingFields(pet: PetWithImages & { name?: string; species?: string; breed?: string | null; age?: number | null; weight?: number | null }): string[] {
  const missing: string[] = [];
  if (!hasText(pet.name)) missing.push('Nombre');
  if (!hasText(pet.species)) missing.push('Especie');
  if (!hasText(pet.breed)) missing.push('Raza');
  if (pet.age == null) missing.push('Edad');
  if (pet.weight == null) missing.push('Peso');
  if (getPetImageUrls(pet).length === 0) missing.push('Foto');
  return missing;
}

function isPetComplete(pet: PetWithImages & { name?: string; species?: string; breed?: string | null; age?: number | null; weight?: number | null }): boolean {
  return getPetMissingFields(pet).length === 0;
}

function evaluatePets(pets: Array<PetWithImages & { name?: string; species?: string; breed?: string | null; age?: number | null; weight?: number | null }>): Pick<BlueprintSectionStatus, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  if (!pets.length) {
    return {
      status: 'disconnected',
      completionPercent: 0,
      missingFields: ['Agrega al menos una mascota'],
      statLabel: 'Mascotas',
      statValue: 0,
    };
  }

  const completeCount = pets.filter(isPetComplete).length;
  const bestPet = pets.reduce<(typeof pets)[0] | null>((best, pet) => {
    const missing = getPetMissingFields(pet).length;
    if (!best) return pet;
    return missing < getPetMissingFields(best).length ? pet : best;
  }, null);

  const missingFields = bestPet ? getPetMissingFields(bestPet) : ['Perfil incompleto'];
  const completionPercent = Math.round((completeCount / pets.length) * 100);

  let status: BlueprintConnectionStatus = 'disconnected';
  if (completeCount > 0) status = completeCount === pets.length ? 'connected' : 'partial';
  else if (pets.length > 0) status = 'partial';

  return {
    status,
    completionPercent,
    missingFields,
    statLabel: 'Mascotas completas',
    statValue: `${completeCount}/${pets.length}`,
  };
}

function countStatus(count: number, singularLabel: string): Pick<BlueprintSectionStatus, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  return {
    status: count > 0 ? 'connected' : 'disconnected',
    completionPercent: count > 0 ? 100 : 0,
    missingFields: count > 0 ? [] : [`Configura ${singularLabel}`],
    statLabel: 'Registros',
    statValue: count,
  };
}

async function fetchClientBlueprint(userId: string): Promise<ClientBlueprintData> {
  const [
    profileRes,
    petsRes,
    addressesRes,
    cardsRes,
    feedingRes,
    exerciseRes,
    vetRes,
    remindersRes,
    favoritesRes,
    ordersRes,
    adoptionRes,
    breedingRes,
    breedingPetsRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('full_name, phone, address, avatar_url').eq('user_id', userId).maybeSingle(),
    supabase.from('pets').select('*, pet_images(image_url, display_order)').eq('owner_id', userId),
    supabase.from('client_addresses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('payment_cards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('pet_feeding_schedules').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('exercise_sessions').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('veterinary_sessions').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('pet_reminders').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('marketplace_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('client_id', userId),
    supabase.from('adoption_applications').select('id', { count: 'exact', head: true }).eq('applicant_id', userId),
    supabase
      .from('breeding_matches')
      .select('id', { count: 'exact', head: true })
      .or(`owner_id.eq.${userId},partner_owner_id.eq.${userId}`),
    supabase.from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('available_for_breeding', true),
  ]);

  const profile = profileRes.data;
  const pets = petsRes.data ?? [];
  const addressCount = addressesRes.count ?? 0;
  const cardCount = cardsRes.count ?? 0;
  const feedingCount = feedingRes.count ?? 0;
  const exerciseCount = exerciseRes.count ?? 0;
  const vetCount = vetRes.count ?? 0;
  const reminderCount = remindersRes.count ?? 0;
  const favoriteCount = favoritesRes.count ?? 0;
  const orderCount = ordersRes.count ?? 0;
  const adoptionCount = adoptionRes.count ?? 0;
  const breedingMatchCount = breedingRes.count ?? 0;
  const breedingPetCount = breedingPetsRes.count ?? 0;

  const breedingConnected = breedingMatchCount > 0 || breedingPetCount > 0;

  const evaluations: Record<string, Pick<BlueprintSectionStatus, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'>> = {
    profile: evaluateProfile(profile),
    pets: evaluatePets(pets),
    addresses: countStatus(addressCount, 'una dirección de entrega'),
    'payment-cards': countStatus(cardCount, 'una tarjeta de pago'),
    nutrition: countStatus(feedingCount, 'un horario de alimentación'),
    exercise: countStatus(exerciseCount, 'una sesión de ejercicio'),
    veterinary: countStatus(vetCount, 'un registro veterinario'),
    reminders: countStatus(reminderCount, 'un recordatorio'),
    marketplace: countStatus(favoriteCount, 'favoritos en marketplace'),
    orders: countStatus(orderCount, 'una orden'),
    adoption: countStatus(adoptionCount, 'una solicitud de adopción'),
    breeding: {
      status: breedingConnected ? 'connected' : 'disconnected',
      completionPercent: breedingConnected ? 100 : 0,
      missingFields: breedingConnected ? [] : ['Activa cría en una mascota o crea un match'],
      statLabel: 'Actividad',
      statValue: breedingMatchCount + breedingPetCount,
    },
  };

  const sections: BlueprintSectionStatus[] = CLIENT_BLUEPRINT_SECTIONS.map((def) => ({
    ...def,
    ...evaluations[def.id],
  }));

  const connectedCount = sections.filter((s) => s.status === 'connected').length;
  const overallPercent = Math.round(
    sections.reduce((sum, s) => sum + s.completionPercent, 0) / sections.length,
  );

  const nextSection =
    [...sections]
      .sort((a, b) => a.priority - b.priority)
      .find((s) => s.status !== 'connected') ?? null;

  return {
    sections,
    overallPercent,
    connectedCount,
    totalCount: sections.length,
    nextSection,
  };
}

export function useClientBlueprint(userId?: string) {
  return useQuery({
    queryKey: ['clientBlueprint', userId],
    queryFn: () => fetchClientBlueprint(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
