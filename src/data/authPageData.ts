import { PawPrint, Shield, Heart, ShoppingBag, Activity, type LucideIcon } from 'lucide-react';

export interface AuthRoleOption {
  value: 'client' | 'provider' | 'shelter';
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  colorText: string;
  borderActive: string;
  bgActive: string;
  textActive: string;
}

export const authRoleOptions: AuthRoleOption[] = [
  {
    value: 'client',
    label: 'Cliente de mascota',
    shortLabel: 'Cliente',
    description: 'Cuidado, compras y adopción',
    icon: PawPrint,
    gradient: 'bg-landing-aqua',
    colorText: 'text-white',
    borderActive: 'border-landing-aqua',
    bgActive: 'bg-landing-aqua/10',
    textActive: 'text-landing-aqua-dark',
  },
  {
    value: 'provider',
    label: 'Proveedor',
    shortLabel: 'Proveedor',
    description: 'Productos y servicios',
    icon: ShoppingBag,
    gradient: 'bg-landing-mango',
    colorText: 'text-gray-900',
    borderActive: 'border-landing-mango',
    bgActive: 'bg-landing-mango/10',
    textActive: 'text-landing-mango-dark',
  },
  {
    value: 'shelter',
    label: 'Refugio',
    shortLabel: 'Refugio',
    description: 'Adopciones y rescate',
    icon: Heart,
    gradient: 'bg-landing-mint',
    colorText: 'text-gray-900',
    borderActive: 'border-landing-mint',
    bgActive: 'bg-landing-mint/10',
    textActive: 'text-landing-mint-dark',
  },
];

export const authHighlights = [
  {
    icon: Activity,
    title: 'Salud integral',
    description: 'Ejercicio, nutrición y veterinaria en un solo lugar.',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace pet',
    description: 'Productos y servicios con entrega a domicilio.',
  },
  {
    icon: Heart,
    title: 'Comunidad activa',
    description: 'Adopción, parejas y mascotas perdidas.',
  },
  {
    icon: Shield,
    title: 'Datos protegidos',
    description: 'Encriptación y privacidad para ti y tus mascotas.',
  },
];

export const authPageCopy = {
  login: {
    badge: 'Acceso seguro',
    title: 'Tu ecosistema pet',
    highlight: 'te espera',
    subtitle: 'Inicia sesión para continuar cuidando a tus mascotas, gestionar pedidos o tu negocio pet.',
  },
  register: {
    badge: 'Únete gratis',
    title: 'Empieza hoy en',
    highlight: 'PetHub',
    subtitle: 'Crea tu cuenta en minutos. Elige tu rol y accede al dashboard diseñado para ti.',
  },
} as const;
