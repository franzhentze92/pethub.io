import type { LucideIcon } from 'lucide-react';
import { Building2, Heart, Image, MessageSquare, PawPrint } from 'lucide-react';

export type ShelterBlueprintSectionCategory = 'setup' | 'catalog' | 'operations';

export interface ShelterBlueprintSectionDef {
  id: string;
  title: string;
  mapLabel: string;
  description: string;
  category: ShelterBlueprintSectionCategory;
  icon: LucideIcon;
  path: string;
  dashboardTab: string;
  gradientIndex: number;
  priority: number;
}

export const SHELTER_BLUEPRINT_SECTIONS: ShelterBlueprintSectionDef[] = [
  {
    id: 'shelter-profile',
    title: 'Perfil del albergue',
    mapLabel: 'Perfil',
    description: 'Nombre, ubicación, contacto y misión del albergue',
    category: 'setup',
    icon: Building2,
    path: '/shelter-dashboard',
    dashboardTab: 'profile',
    gradientIndex: 0,
    priority: 1,
  },
  {
    id: 'shelter-media',
    title: 'Galería y media',
    mapLabel: 'Media',
    description: 'Fotos o videos del albergue publicados',
    category: 'setup',
    icon: Image,
    path: '/shelter-dashboard',
    dashboardTab: 'media',
    gradientIndex: 3,
    priority: 2,
  },
  {
    id: 'shelter-pets',
    title: 'Mascotas en adopción',
    mapLabel: 'Mascotas',
    description: 'Al menos una mascota publicada para adopción',
    category: 'catalog',
    icon: PawPrint,
    path: '/shelter-dashboard',
    dashboardTab: 'pets',
    gradientIndex: 2,
    priority: 3,
  },
  {
    id: 'shelter-applications',
    title: 'Solicitudes',
    mapLabel: 'Solicitudes',
    description: 'Solicitudes de adopción recibidas',
    category: 'operations',
    icon: MessageSquare,
    path: '/shelter-dashboard',
    dashboardTab: 'quotes',
    gradientIndex: 4,
    priority: 4,
  },
  {
    id: 'shelter-adoptions',
    title: 'Adopciones exitosas',
    mapLabel: 'Adopciones',
    description: 'Al menos una adopción aprobada o completada',
    category: 'operations',
    icon: Heart,
    path: '/shelter-dashboard',
    dashboardTab: 'quotes',
    gradientIndex: 1,
    priority: 5,
  },
];

export const SHELTER_BLUEPRINT_CATEGORY_LABELS: Record<ShelterBlueprintSectionCategory, string> = {
  setup: 'Configuración',
  catalog: 'Catálogo',
  operations: 'Operaciones',
};
