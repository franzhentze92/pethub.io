import type { LucideIcon } from 'lucide-react';
import {
  User,
  Dog,
  MapPin,
  CreditCard,
  Utensils,
  Activity,
  Stethoscope,
  Bell,
  ShoppingBag,
  Package,
  Heart,
  HeartHandshake,
} from 'lucide-react';

export type BlueprintConnectionStatus = 'connected' | 'partial' | 'disconnected';

export type BlueprintSectionCategory = 'profile' | 'care' | 'commerce' | 'social';

export interface ClientBlueprintSectionDef {
  id: string;
  title: string;
  /** Short label for the ecosystem map node */
  mapLabel: string;
  description: string;
  category: BlueprintSectionCategory;
  icon: LucideIcon;
  path: string;
  ajustesTab?: 'perfil' | 'perros' | 'direcciones' | 'tarjetas';
  gradientIndex: number;
  /** Lower = higher wizard priority */
  priority: number;
}

export const CLIENT_BLUEPRINT_SECTIONS: ClientBlueprintSectionDef[] = [
  {
    id: 'profile',
    title: 'Mi Perfil',
    mapLabel: 'Perfil',
    description: 'Nombre, teléfono, dirección y foto de perfil',
    category: 'profile',
    icon: User,
    path: '/ajustes',
    ajustesTab: 'perfil',
    gradientIndex: 0,
    priority: 1,
  },
  {
    id: 'pets',
    title: 'Mis Mascotas',
    mapLabel: 'Mascotas',
    description: 'Al menos una mascota con perfil completo e imágenes',
    category: 'profile',
    icon: Dog,
    path: '/ajustes',
    ajustesTab: 'perros',
    gradientIndex: 1,
    priority: 2,
  },
  {
    id: 'addresses',
    title: 'Direcciones',
    mapLabel: 'Direcciones',
    description: 'Direcciones de entrega guardadas',
    category: 'profile',
    icon: MapPin,
    path: '/ajustes',
    ajustesTab: 'direcciones',
    gradientIndex: 2,
    priority: 3,
  },
  {
    id: 'payment-cards',
    title: 'Tarjetas de Pago',
    mapLabel: 'Tarjetas',
    description: 'Métodos de pago para compras y servicios',
    category: 'profile',
    icon: CreditCard,
    path: '/ajustes',
    ajustesTab: 'tarjetas',
    gradientIndex: 3,
    priority: 4,
  },
  {
    id: 'nutrition',
    title: 'Nutrición',
    mapLabel: 'Nutrición',
    description: 'Horarios de alimentación configurados',
    category: 'care',
    icon: Utensils,
    path: '/feeding-schedules',
    gradientIndex: 2,
    priority: 5,
  },
  {
    id: 'exercise',
    title: 'Ejercicio',
    mapLabel: 'Ejercicio',
    description: 'Sesiones de actividad registradas',
    category: 'care',
    icon: Activity,
    path: '/trazabilidad',
    gradientIndex: 1,
    priority: 6,
  },
  {
    id: 'veterinary',
    title: 'Veterinaria',
    mapLabel: 'Veterinaria',
    description: 'Visitas y registros médicos',
    category: 'care',
    icon: Stethoscope,
    path: '/veterinaria',
    gradientIndex: 3,
    priority: 7,
  },
  {
    id: 'reminders',
    title: 'Recordatorios',
    mapLabel: 'Record.',
    description: 'Recordatorios activos para tus mascotas',
    category: 'care',
    icon: Bell,
    path: '/recordatorios',
    gradientIndex: 5,
    priority: 8,
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    mapLabel: 'Market',
    description: 'Productos o servicios guardados en favoritos',
    category: 'commerce',
    icon: ShoppingBag,
    path: '/marketplace/products',
    gradientIndex: 1,
    priority: 9,
  },
  {
    id: 'orders',
    title: 'Mis Órdenes',
    mapLabel: 'Órdenes',
    description: 'Historial de compras y reservas',
    category: 'commerce',
    icon: Package,
    path: '/client-orders',
    gradientIndex: 0,
    priority: 10,
  },
  {
    id: 'adoption',
    title: 'Adopción',
    mapLabel: 'Adopción',
    description: 'Solicitudes de adopción enviadas',
    category: 'social',
    icon: Heart,
    path: '/adopcion',
    gradientIndex: 1,
    priority: 11,
  },
  {
    id: 'breeding',
    title: 'Parejas',
    mapLabel: 'Parejas',
    description: 'Emparejamientos o mascotas disponibles para cría',
    category: 'social',
    icon: HeartHandshake,
    path: '/parejas',
    gradientIndex: 4,
    priority: 12,
  },
];

export const BLUEPRINT_CATEGORY_LABELS: Record<BlueprintSectionCategory, string> = {
  profile: 'Perfil base',
  care: 'Cuidado',
  commerce: 'Comercio',
  social: 'Comunidad',
};

export const CLIENT_BLUEPRINT_TOUR_KEY = 'pethub_blueprint_client_tour_v1';
