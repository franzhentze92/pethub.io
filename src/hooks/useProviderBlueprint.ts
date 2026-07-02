import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';
import {
  PROVIDER_BLUEPRINT_SECTIONS,
  type ProviderBlueprintSectionDef,
} from '@/lib/blueprint/providerSections';
import type { BlueprintDashboardData, BlueprintSectionView } from '@/lib/blueprint/types';

type ProviderRow = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  profile_picture_url: string | null;
  city_id: number | null;
  municipality: string | null;
  department: string | null;
  formatted_address: string | null;
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

function evaluateProviderProfile(
  provider: ProviderRow | null,
): Pick<BlueprintSectionView, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'> {
  if (!provider) {
    return {
      status: 'disconnected',
      completionPercent: 0,
      missingFields: ['Crea tu perfil de proveedor'],
      statLabel: 'Perfil',
      statValue: 'Sin configurar',
    };
  }

  const checks = [
    { label: 'Nombre del negocio', ok: hasText(provider.business_name) },
    { label: 'Tipo de negocio', ok: hasText(provider.business_type) },
    { label: 'Teléfono', ok: hasText(provider.phone) },
    {
      label: 'Dirección',
      ok: hasText(provider.address) || hasText(provider.formatted_address),
    },
    { label: 'Descripción', ok: hasText(provider.description) },
    { label: 'Foto del negocio', ok: hasText(provider.profile_picture_url) },
    {
      label: 'Ubicación (ciudad)',
      ok: Boolean(provider.city_id) || (hasText(provider.municipality) && hasText(provider.department)),
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
  def: ProviderBlueprintSectionDef,
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
    dashboardSubTab: def.dashboardSubTab,
    ...evaluation,
  };
}

async function fetchProviderBlueprint(userId: string): Promise<BlueprintDashboardData> {
  const providerRes = await supabase
    .from('providers')
    .select(
      'id, business_name, business_type, phone, address, description, profile_picture_url, city_id, municipality, department, formatted_address',
    )
    .eq('user_id', userId)
    .maybeSingle();

  const provider = providerRes.data as ProviderRow | null;
  const providerId = provider?.id;

  const [
    servicesRes,
    productsRes,
    availabilityRes,
    slotsRes,
    appointmentsRes,
    ordersRes,
  ] = await Promise.all([
    providerId
      ? supabase
          .from('provider_services')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('is_active', true)
      : Promise.resolve({ count: 0 }),
    providerId
      ? supabase
          .from('provider_products')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('is_active', true)
      : Promise.resolve({ count: 0 }),
    providerId
      ? supabase
          .from('provider_availability')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('is_available', true)
      : Promise.resolve({ count: 0 }),
    providerId
      ? supabase
          .from('provider_time_slots')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('is_available', true)
      : Promise.resolve({ count: 0 }),
    providerId
      ? (async () => {
          const { data: services } = await supabase
            .from('provider_services')
            .select('id')
            .eq('provider_id', providerId);
          const serviceIds = (services ?? []).map((s) => s.id);
          if (!serviceIds.length) return { count: 0 };
          return supabase
            .from('service_appointments')
            .select('id', { count: 'exact', head: true })
            .in('service_id', serviceIds);
        })()
      : Promise.resolve({ count: 0 }),
    supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('provider_id', userId),
  ]);

  const serviceCount = servicesRes.count ?? 0;
  const productCount = productsRes.count ?? 0;
  const availabilityCount = (availabilityRes.count ?? 0) + (slotsRes.count ?? 0);
  const appointmentCount = appointmentsRes.count ?? 0;
  const orderCount = ordersRes.count ?? 0;

  const evaluations: Record<
    string,
    Pick<BlueprintSectionView, 'status' | 'completionPercent' | 'missingFields' | 'statLabel' | 'statValue'>
  > = {
    'provider-profile': evaluateProviderProfile(provider),
    'provider-availability': countStatus(availabilityCount, 'horarios de atención'),
    'provider-services': countStatus(serviceCount, 'un servicio activo'),
    'provider-products': countStatus(productCount, 'un producto activo'),
    'provider-appointments': countStatus(appointmentCount, 'una cita recibida'),
    'provider-orders': countStatus(orderCount, 'un pedido recibido'),
  };

  const sections: BlueprintSectionView[] = PROVIDER_BLUEPRINT_SECTIONS.map((def) =>
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

export function useProviderBlueprint(userId?: string) {
  return useQuery({
    queryKey: ['providerBlueprint', userId],
    queryFn: () => fetchProviderBlueprint(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
