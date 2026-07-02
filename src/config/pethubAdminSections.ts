import {
  ShoppingBag,
  Activity,
  Heart,
  Users,
  MapPin,
  Package,
  AlertTriangle,
  Home,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface PetHubAdminColumn {
  key: string;
  label: string;
  format?: 'date' | 'money' | 'badge';
}

export interface PetHubAdminSectionConfig {
  id: string;
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  columns: PetHubAdminColumn[];
  searchKeys: string[];
  load: () => Promise<Record<string, unknown>[]>;
}

function flattenForSearch(row: Record<string, unknown>): string {
  return JSON.stringify(row).toLowerCase();
}

export const PETHUB_ADMIN_SECTIONS: PetHubAdminSectionConfig[] = [
  {
    id: 'productos-comprados',
    path: '/pethub-admin/productos-comprados',
    title: 'Productos comprados',
    description: 'Todos los productos del marketplace incluidos en órdenes pagadas.',
    icon: ShoppingBag,
    columns: [
      { key: 'item_name', label: 'Producto' },
      { key: 'orders.order_number', label: 'Orden' },
      { key: 'provider_name', label: 'Proveedor' },
      { key: 'quantity', label: 'Cant.' },
      { key: 'total_price', label: 'Total', format: 'money' },
      { key: 'orders.payment_status', label: 'Pago', format: 'badge' },
      { key: 'created_at', label: 'Fecha', format: 'date' },
    ],
    searchKeys: ['item_name', 'provider_name', 'orders.order_number'],
    load: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            id, order_number, client_id, client_email, status, payment_status,
            payment_method, fulfillment_method, total_amount, delivery_fee,
            grand_total, currency, delivery_name, delivery_phone, delivery_address,
            delivery_city, created_at
          ),
          order_item_pets (
            pet_id,
            price_per_pet,
            quantity,
            pets ( id, name, species, breed )
          )
        `)
        .eq('item_type', 'product')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'servicios',
    path: '/pethub-admin/servicios',
    title: 'Servicios comprados',
    description: 'Servicios del marketplace reservados o comprados por clientes.',
    icon: Activity,
    columns: [
      { key: 'item_name', label: 'Servicio' },
      { key: 'orders.order_number', label: 'Orden' },
      { key: 'provider_name', label: 'Proveedor' },
      { key: 'total_price', label: 'Total', format: 'money' },
      { key: 'orders.status', label: 'Estado', format: 'badge' },
      { key: 'created_at', label: 'Fecha', format: 'date' },
    ],
    searchKeys: ['item_name', 'provider_name', 'orders.order_number'],
    load: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            id, order_number, client_id, client_email, status, payment_status,
            payment_method, total_amount, grand_total, currency, created_at
          ),
          order_item_pets (
            pet_id,
            pets ( id, name, species )
          )
        `)
        .eq('item_type', 'service')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const itemIds = (data ?? []).map((row) => row.id as string).filter(Boolean);
      let appointments: Record<string, unknown>[] = [];

      if (itemIds.length > 0) {
        const { data: apptData } = await supabase
          .from('service_appointments')
          .select(`
            *,
            provider_service_time_slots ( slot_start_time, slot_end_time )
          `)
          .in('order_item_id', itemIds);
        appointments = (apptData ?? []) as Record<string, unknown>[];
      }

      const apptByItem = new Map(
        appointments.map((a) => [a.order_item_id as string, a]),
      );

      return (data ?? []).map((row) => ({
        ...row,
        service_appointment: apptByItem.get(row.id as string) ?? null,
      })) as Record<string, unknown>[];
    },
  },
  {
    id: 'adopciones',
    path: '/pethub-admin/adopciones',
    title: 'Mascotas en adopción',
    description: 'Publicaciones de adopción con todos sus detalles.',
    icon: Home,
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'species', label: 'Especie' },
      { key: 'breed', label: 'Raza' },
      { key: 'status', label: 'Estado', format: 'badge' },
      { key: 'location', label: 'Ubicación' },
      { key: 'adoption_fee', label: 'Cuota', format: 'money' },
      { key: 'created_at', label: 'Publicado', format: 'date' },
    ],
    searchKeys: ['name', 'species', 'breed', 'location', 'status'],
    load: async () => {
      const { data, error } = await supabase
        .from('adoption_pets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'parejas',
    path: '/pethub-admin/parejas',
    title: 'Parejas',
    description: 'Solicitudes y matches de cría entre mascotas.',
    icon: Heart,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'status', label: 'Estado', format: 'badge' },
      { key: 'pet_id', label: 'Mascota' },
      { key: 'potential_partner_id', label: 'Pareja' },
      { key: 'owner_id', label: 'Dueño' },
      { key: 'partner_owner_id', label: 'Dueño pareja' },
      { key: 'created_at', label: 'Fecha', format: 'date' },
    ],
    searchKeys: ['status', 'pet_id', 'potential_partner_id'],
    load: async () => {
      const { data, error } = await supabase
        .from('breeding_matches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'mascotas-perdidas',
    path: '/pethub-admin/mascotas-perdidas',
    title: 'Mascotas perdidas',
    description: 'Reportes de mascotas perdidas y encontradas.',
    icon: AlertTriangle,
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'species', label: 'Especie' },
      { key: 'last_location', label: 'Última ubicación' },
      { key: 'status', label: 'Estado', format: 'badge' },
      { key: 'contact_phone', label: 'Teléfono' },
      { key: 'last_seen', label: 'Visto', format: 'date' },
      { key: 'created_at', label: 'Reporte', format: 'date' },
    ],
    searchKeys: ['name', 'species', 'last_location', 'contact_phone', 'status'],
    load: async () => {
      const { data, error } = await supabase
        .from('lost_pets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'mascotas',
    path: '/pethub-admin/mascotas',
    title: 'Mascotas registradas',
    description: 'Todas las mascotas registradas en la plataforma.',
    icon: Heart,
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'species', label: 'Especie' },
      { key: 'breed', label: 'Raza' },
      { key: 'owner_id', label: 'Dueño (ID)' },
      { key: 'available_for_breeding', label: 'Cría' },
      { key: 'created_at', label: 'Registro', format: 'date' },
    ],
    searchKeys: ['name', 'species', 'breed', 'owner_id'],
    load: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'direcciones',
    path: '/pethub-admin/direcciones',
    title: 'Direcciones registradas',
    description: 'Direcciones guardadas por los clientes.',
    icon: MapPin,
    columns: [
      { key: 'label', label: 'Etiqueta' },
      { key: 'full_name', label: 'Nombre' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address', label: 'Dirección' },
      { key: 'city', label: 'Ciudad' },
      { key: 'is_default', label: 'Predeterminada' },
      { key: 'created_at', label: 'Registro', format: 'date' },
    ],
    searchKeys: ['label', 'full_name', 'address', 'city', 'phone'],
    load: async () => {
      const { data, error } = await supabase
        .from('client_addresses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'usuarios',
    path: '/pethub-admin/usuarios',
    title: 'Usuarios registrados',
    description: 'Perfiles de usuarios en PetHub.',
    icon: Users,
    columns: [
      { key: 'full_name', label: 'Nombre' },
      { key: 'role', label: 'Rol', format: 'badge' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'user_id', label: 'User ID' },
      { key: 'created_at', label: 'Registro', format: 'date' },
    ],
    searchKeys: ['full_name', 'phone', 'role', 'user_id'],
    load: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    id: 'ordenes',
    path: '/pethub-admin/ordenes',
    title: 'Órdenes registradas',
    description: 'Todas las órdenes del marketplace con ítems y totales.',
    icon: Package,
    columns: [
      { key: 'order_number', label: 'Orden' },
      { key: 'client_email', label: 'Cliente' },
      { key: 'status', label: 'Estado', format: 'badge' },
      { key: 'payment_status', label: 'Pago', format: 'badge' },
      { key: 'fulfillment_method', label: 'Entrega' },
      { key: 'grand_total', label: 'Total', format: 'money' },
      { key: 'created_at', label: 'Fecha', format: 'date' },
    ],
    searchKeys: ['order_number', 'client_email', 'delivery_name', 'status'],
    load: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
];

export function getPetHubAdminSectionByPath(pathname: string): PetHubAdminSectionConfig | null {
  return PETHUB_ADMIN_SECTIONS.find((section) => section.path === pathname) ?? null;
}

export function filterPetHubAdminRows(
  rows: Record<string, unknown>[],
  query: string,
  section: PetHubAdminSectionConfig,
): Record<string, unknown>[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    const haystack = section.searchKeys.length
      ? section.searchKeys.map((key) => String(getNestedValue(row, key) ?? '')).join(' ')
      : flattenForSearch(row);
    return haystack.toLowerCase().includes(term);
  });
}

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}
