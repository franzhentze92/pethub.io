import {
  Home, ShoppingBag, Package, ShoppingCart, RefreshCw,
  Heart, Utensils, Activity, Stethoscope, Bell,
  HeartHandshake, Search, Settings,
  LayoutGrid, User, Scissors, Calendar, Star,
  BarChart3, Building2, PawPrint, MessageSquare, Image,
  type LucideIcon,
} from 'lucide-react';

export interface PitchRoleModule {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
}

export interface PitchRoleSlideData {
  label: string;
  tagline: string;
  gradient: string;
  modules: PitchRoleModule[];
  highlights: string[];
}

/** Módulos reales del menú inferior del cliente (Navigation.tsx) */
export const pitchClientSlide: PitchRoleSlideData = {
  label: 'Cliente de mascota',
  tagline:
    'Cinco secciones en el menú inferior — Inicio, Tienda, Cuidado, Social y Ajustes — con sub-módulos expandibles para cubrir todo el día a día pet.',
  gradient: 'from-landing-aqua to-landing-mint',
  modules: [
    {
      icon: Home,
      title: 'Inicio',
      description: 'Dashboard con tus mascotas, actividad reciente, estadísticas y accesos rápidos.',
      tag: 'Menú',
    },
    {
      icon: Package,
      title: 'Marketplace',
      description: 'Catálogo de productos y servicios pet con carrito, checkout y reserva de citas.',
      tag: 'Tienda',
    },
    {
      icon: ShoppingCart,
      title: 'Mis Órdenes',
      description: 'Seguimiento de compras desde la confirmación hasta la entrega.',
      tag: 'Tienda',
    },
    {
      icon: RefreshCw,
      title: 'Suscripciones',
      description: 'Planes y compras recurrentes de productos o servicios para tus mascotas.',
      tag: 'Tienda',
    },
    {
      icon: Utensils,
      title: 'Nutrición',
      description: 'Horarios de alimentación automáticos, porciones y registro diario de comidas.',
      tag: 'Cuidado',
    },
    {
      icon: Activity,
      title: 'Ejercicio',
      description: 'Sesiones de actividad, calorías quemadas, metas y trazabilidad física.',
      tag: 'Cuidado',
    },
    {
      icon: Stethoscope,
      title: 'Veterinaria',
      description: 'Historial médico, vacunas, tratamientos y citas veterinarias.',
      tag: 'Cuidado',
    },
    {
      icon: Bell,
      title: 'Recordatorios',
      description: 'Alertas de medicamentos, citas, vacunas y eventos importantes.',
      tag: 'Cuidado',
    },
    {
      icon: Heart,
      title: 'Adopción',
      description: 'Explora mascotas en refugios, guarda favoritos y envía solicitudes.',
      tag: 'Social',
    },
    {
      icon: HeartHandshake,
      title: 'Parejas',
      description: 'Encuentra mascotas compatibles y coordina con otros clientes.',
      tag: 'Social',
    },
    {
      icon: Search,
      title: 'Mascotas Perdidas',
      description: 'Reporta o busca mascotas perdidas con apoyo de la comunidad.',
      tag: 'Social',
    },
    {
      icon: Settings,
      title: 'Ajustes',
      description: 'Perfil, mascotas, direcciones de entrega, tarjetas de pago y cuenta.',
      tag: 'Perfil',
    },
  ],
  highlights: [
    'Menú inferior: Tienda, Cuidado y Social con sub-módulos',
    'Salud, nutrición y ejercicio centralizados en Cuidado',
    'Compras, órdenes y comunidad pet en una sola app',
  ],
};

/** Módulos reales del menú del proveedor (ProviderDashboard.tsx) */
export const pitchProviderSlide: PitchRoleSlideData = {
  label: 'Proveedor',
  tagline:
    'Cuatro secciones en el menú — Dashboard, Perfil, Tienda y Pedidos — con sub-módulos para vender productos, agendar servicios y gestionar tu negocio.',
  gradient: 'from-landing-mango to-landing-tropical',
  modules: [
    {
      icon: LayoutGrid,
      title: 'Dashboard',
      description: 'Ingresos, órdenes, productos activos, citas y métricas clave de tu negocio.',
      tag: 'Menú',
    },
    {
      icon: User,
      title: 'Perfil',
      description: 'Datos del negocio, ubicación, foto, descripción y estado de verificación.',
      tag: 'Perfil',
    },
    {
      icon: Package,
      title: 'Productos',
      description: 'Catálogo con stock, precios por talla/tamaño, imágenes y categorías.',
      tag: 'Tienda',
    },
    {
      icon: Scissors,
      title: 'Servicios',
      description: 'Servicios pet con precios, disponibilidad, horarios y slots de reserva.',
      tag: 'Tienda',
    },
    {
      icon: ShoppingBag,
      title: 'Pedidos',
      description: 'Órdenes del marketplace: estados, detalle y gestión de entregas.',
      tag: 'Pedidos',
    },
    {
      icon: Calendar,
      title: 'Citas',
      description: 'Calendario de reservas de servicios: pendientes, confirmadas y completadas.',
      tag: 'Pedidos',
    },
    {
      icon: Star,
      title: 'Reseñas',
      description: 'Calificaciones de clientes, reputación y feedback del negocio.',
      tag: 'Pedidos',
    },
  ],
  highlights: [
    'Tienda con Productos y Servicios en sub-módulos',
    'Pedidos, Citas y Reseñas centralizados',
    'Dashboard con ingresos y métricas en tiempo real',
  ],
};

/** Módulos reales del menú del refugio (ShelterDashboard.tsx) */
export const pitchShelterSlide: PitchRoleSlideData = {
  label: 'Refugio / Albergue',
  tagline:
    'Cinco secciones en el menú — Dashboard, Perfil, Mascotas, Solicitudes y Media — para publicar adopciones y conectar con familias.',
  gradient: 'from-landing-mint to-landing-aqua',
  modules: [
    {
      icon: BarChart3,
      title: 'Dashboard',
      description: 'Estadísticas del refugio, adopciones, mascotas disponibles y solicitudes pendientes.',
      tag: 'Menú',
    },
    {
      icon: Building2,
      title: 'Perfil',
      description: 'Información del refugio, misión, contacto, ubicación y datos públicos.',
      tag: 'Perfil',
    },
    {
      icon: PawPrint,
      title: 'Mascotas',
      description: 'Publicar, editar y gestionar perfiles de mascotas en adopción con compatibilidad.',
      tag: 'Mascotas',
    },
    {
      icon: MessageSquare,
      title: 'Solicitudes',
      description: 'Revisar, aprobar o rechazar solicitudes de adopción de interesados.',
      tag: 'Adopción',
    },
    {
      icon: Image,
      title: 'Media',
      description: 'Galería de fotos y videos del refugio para mostrar a potenciales adoptantes.',
      tag: 'Media',
    },
  ],
  highlights: [
    'Flujo completo: publicar mascota → recibir solicitud → aprobar',
    'Perfil y media del refugio visible para adoptantes',
    'Dashboard con impacto y adopciones del refugio',
  ],
};
