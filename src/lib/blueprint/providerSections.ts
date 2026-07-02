import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarCheck,
  Clock,
  Package,
  Scissors,
  ShoppingBag,
} from 'lucide-react';

export type ProviderBlueprintSectionCategory = 'setup' | 'catalog' | 'operations';

export interface ProviderBlueprintSectionDef {
  id: string;
  title: string;
  mapLabel: string;
  description: string;
  category: ProviderBlueprintSectionCategory;
  icon: LucideIcon;
  path: string;
  dashboardTab: string;
  dashboardSubTab?: string;
  gradientIndex: number;
  priority: number;
}

export const PROVIDER_BLUEPRINT_SECTIONS: ProviderBlueprintSectionDef[] = [
  {
    id: 'provider-profile',
    title: 'Perfil del negocio',
    mapLabel: 'Perfil',
    description: 'Nombre, tipo, contacto, ubicación y foto del negocio',
    category: 'setup',
    icon: Building2,
    path: '/provider',
    dashboardTab: 'profile',
    gradientIndex: 0,
    priority: 1,
  },
  {
    id: 'provider-availability',
    title: 'Disponibilidad',
    mapLabel: 'Horarios',
    description: 'Horarios o franjas de atención configurados',
    category: 'setup',
    icon: Clock,
    path: '/provider',
    dashboardTab: 'profile',
    gradientIndex: 3,
    priority: 2,
  },
  {
    id: 'provider-services',
    title: 'Servicios',
    mapLabel: 'Servicios',
    description: 'Al menos un servicio activo publicado',
    category: 'catalog',
    icon: Scissors,
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'services',
    gradientIndex: 1,
    priority: 3,
  },
  {
    id: 'provider-products',
    title: 'Productos',
    mapLabel: 'Productos',
    description: 'Al menos un producto activo en tu tienda',
    category: 'catalog',
    icon: Package,
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'products',
    gradientIndex: 2,
    priority: 4,
  },
  {
    id: 'provider-appointments',
    title: 'Citas',
    mapLabel: 'Citas',
    description: 'Reservas de servicios recibidas',
    category: 'operations',
    icon: CalendarCheck,
    path: '/provider',
    dashboardTab: 'orders',
    dashboardSubTab: 'appointments',
    gradientIndex: 4,
    priority: 5,
  },
  {
    id: 'provider-orders',
    title: 'Pedidos',
    mapLabel: 'Pedidos',
    description: 'Órdenes de productos recibidas',
    category: 'operations',
    icon: ShoppingBag,
    path: '/provider',
    dashboardTab: 'orders',
    dashboardSubTab: 'orders',
    gradientIndex: 5,
    priority: 6,
  },
];

export const PROVIDER_BLUEPRINT_CATEGORY_LABELS: Record<ProviderBlueprintSectionCategory, string> = {
  setup: 'Configuración',
  catalog: 'Catálogo',
  operations: 'Operaciones',
};
