import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';
import {
  SHELTER_BLUEPRINT_SECTIONS,
  type ShelterBlueprintSectionDef,
} from '@/lib/blueprint/shelterSections';
import type { BlueprintDashboardData, BlueprintSectionView } from '@/lib/blueprint/types';

type ShelterRow = {
  id: string;
  name: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  mission_statement: string | null;
  image_url: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function countStatus(
  count: number,
  singularLabel: string,
): Pick<BlueprintSectionView, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  return {
    status: count > 0 ? 'connected' : 'disconnected',
    completionPercent: count > 0 ? 100 : 0,
    missingFields: count > 0 ? [] : [`Configura ${singularLabel}`],
    statLabel: 'Registros',
    statValue: count,
  };
}

function evaluateShelterProfile(
  shelter: ShelterRow | null,
): Pick<BlueprintSectionView, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  if (!shelter) {
    return {
      status: 'disconnected',
      completionPercent: 0,
      missingFields: ['Crea el perfil de tu albergue'],
      statLabel: 'Perfil',
      statValue: 'Sin configurar',
    };
  }

  const checks = [
    { label: 'Nombre del albergue', ok: hasText(shelter.name) },
    { label: 'Ubicación', ok: hasText(shelter.location) },
    { label: 'Teléfono', ok: hasText(shelter.phone) },
    { label: 'Correo electrónico', ok: hasText(shelter.email) },
    {
      label: 'Misión o descripción',
      ok: hasText(shelter.mission_statement) || hasText(shelter.description),
    },
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

function toSectionView(
  def: ShelterBlueprintSectionDef,
  evaluation: Pick<
    BlueprintSectionView,
    'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'
  >,
): BlueprintSectionView {
  return {
    id: def.id,
    title: def.title,
    mapLabel: def.mapLabel,
    description: def.description,
    category: def.category,
    icon: def.icon,
    path: def.path,
    gradientIndex: def.gradientIndex,
    priority: def.priority,
    dashboardTab: def.dashboardTab,
    ...evaluation,
  };
}

async function fetchShelterBlueprint(userId: string): Promise<BlueprintDashboardData> {
  const shelterRes = await supabase
    .from('shelters')
    .select('id, name, location, phone, email, description, mission_statement, image_url')
    .eq('owner_id', userId)
    .maybeSingle();

  const shelter = shelterRes.data as ShelterRow | null;
  const shelterId = shelter?.id;

  const [imagesRes, videosRes, petsRes, applicationsRes, approvedRes] = await Promise.all([
    shelterId
      ? supabase
          .from('shelter_images')
          .select('id', { count: 'exact', head: true })
          .eq('shelter_id', shelterId)
      : Promise.resolve({ count: 0 }),
    shelterId
      ? supabase
          .from('shelter_videos')
          .select('id', { count: 'exact', head: true })
          .eq('shelter_id', shelterId)
      : Promise.resolve({ count: 0 }),
    shelterId
      ? supabase
          .from('adoption_pets')
          .select('id', { count: 'exact', head: true })
          .eq('shelter_id', shelterId)
      : Promise.resolve({ count: 0 }),
    shelterId
      ? (async () => {
          const { data: pets } = await supabase
            .from('adoption_pets')
            .select('id')
            .eq('shelter_id', shelterId);
          const petIds = (pets ?? []).map((p) => p.id);
          if (!petIds.length) return { count: 0 };
          return supabase
            .from('adoption_applications')
            .select('id', { count: 'exact', head: true })
            .in('pet_id', petIds);
        })()
      : Promise.resolve({ count: 0 }),
    shelterId
      ? (async () => {
          const { data: pets } = await supabase
            .from('adoption_pets')
            .select('id')
            .eq('shelter_id', shelterId);
          const petIds = (pets ?? []).map((p) => p.id);
          if (!petIds.length) return { count: 0 };
          return supabase
            .from('adoption_applications')
            .select('id', { count: 'exact', head: true })
            .in('pet_id', petIds)
            .eq('status', 'approved');
        })()
      : Promise.resolve({ count: 0 }),
  ]);

  const imageCount = (imagesRes.count ?? 0) + (hasText(shelter?.image_url) ? 1 : 0);
  const videoCount = videosRes.count ?? 0;
  const mediaCount = imageCount + videoCount;
  const petCount = petsRes.count ?? 0;
  const applicationCount = applicationsRes.count ?? 0;
  const approvedCount = approvedRes.count ?? 0;

  const evaluations: Record<
    string,
    Pick<BlueprintSectionView, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'>
  > = {
    'shelter-profile': evaluateShelterProfile(shelter),
    'shelter-media': countStatus(mediaCount, 'fotos o videos del albergue'),
    'shelter-pets': countStatus(petCount, 'una mascota en adopción'),
    'shelter-applications': countStatus(applicationCount, 'una solicitud de adopción'),
    'shelter-adoptions': countStatus(approvedCount, 'una adopción aprobada'),
  };

  const sections: BlueprintSectionView[] = SHELTER_BLUEPRINT_SECTIONS.map((def) =>
    toSectionView(def, evaluations[def.id]),
  );

  const connectedCount = sections.filter((s) => s.status === 'connected').length;
  const overallPercent = Math.round(
    sections.reduce((sum, s) => sum + s.completionPercent, 0) / sections.length,
  );

  const nextSection =
    [...sections].sort((a, b) => a.priority - b.priority).find((s) => s.status !== 'connected') ?? null;

  return {
    sections,
    overallPercent,
    connectedCount,
    totalCount: sections.length,
    nextSection,
  };
}

export function useShelterBlueprint(userId?: string) {
  return useQuery({
    queryKey: ['shelterBlueprint', userId],
    queryFn: () => fetchShelterBlueprint(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
