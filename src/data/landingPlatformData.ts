import {
  Activity, Utensils, Stethoscope, Bell, ShoppingBag, Package,
  Heart, Users, MapPin, MessageCircle, Truck, Shield, BarChart3,
  Store, Home, ClipboardList, DollarSign, PawPrint, Search,
  Calendar, TrendingUp, type LucideIcon,
} from 'lucide-react';

export interface PlatformModule {
  icon: LucideIcon;
  title: string;
  description: string;
  tag?: string;
}

export interface PlatformRole {
  id: string;
  label: string;
  shortLabel: string;
  tagline: string;
  gradient: string;
  accent: string;
  dashboardTitle: string;
  dashboardStats: { label: string; value: string; trend?: string }[];
  modules: PlatformModule[];
  highlights: string[];
}

export const platformRoles: PlatformRole[] = [
  {
    id: 'client',
    label: 'Dueño de Mascota',
    shortLabel: 'Dueño',
    tagline: 'Registra, cuida y conecta con todo el ecosistema pet desde tu dashboard personal.',
    gradient: 'from-landing-aqua to-landing-mint',
    accent: 'text-landing-aqua-dark',
    dashboardTitle: 'Dashboard Cliente',
    dashboardStats: [
      { label: 'Mascotas activas', value: '3', trend: '+1 este mes' },
      { label: 'Próxima comida', value: '18:30', trend: 'Auto-programada' },
      { label: 'Órdenes activas', value: '2', trend: 'En camino' },
    ],
    modules: [
      { icon: PawPrint, title: 'Pet Room', description: 'Perfil completo de cada mascota con historial y accesos rápidos.', tag: 'Core' },
      { icon: Activity, title: 'Ejercicio', description: 'Sesiones, calorías, metas y Adventure Log con gráficos.', tag: 'Salud' },
      { icon: Utensils, title: 'Nutrición', description: 'Horarios automáticos, porciones y Meal Journal diario.', tag: 'Salud' },
      { icon: Stethoscope, title: 'Veterinaria', description: 'Historial médico, vacunas, citas y Health Journal.', tag: 'Salud' },
      { icon: Bell, title: 'Recordatorios', description: 'Alertas de medicamentos, citas y eventos importantes.', tag: 'Salud' },
      { icon: ShoppingBag, title: 'Marketplace', description: 'Productos y servicios con carrito, checkout y entrega.', tag: 'Comercio' },
      { icon: Heart, title: 'Adopción', description: 'Swipe, favoritos, solicitudes y chat con refugios.', tag: 'Social' },
      { icon: Users, title: 'Parejas / Cría', description: 'Matching de mascotas compatibles y chat de coordinación.', tag: 'Social' },
      { icon: MapPin, title: 'Mascotas Perdidas', description: 'Reportes con mapa interactivo y estado de búsqueda.', tag: 'Comunidad' },
      { icon: MessageCircle, title: 'Social Hub', description: 'Red social, mensajes y descubrimiento de mascotas.', tag: 'Social' },
      { icon: Package, title: 'Mis Órdenes', description: 'Seguimiento de compras desde pending hasta delivered.', tag: 'Comercio' },
    ],
    highlights: ['Trazabilidad 360° por mascota', 'Marketplace + checkout integrado', 'Adopción, cría y comunidad'],
  },
  {
    id: 'provider',
    label: 'Proveedor',
    shortLabel: 'Proveedor',
    tagline: 'Vende productos, agenda servicios y analiza tu negocio pet en tiempo real.',
    gradient: 'from-landing-mango to-landing-tropical',
    accent: 'text-landing-mango-dark',
    dashboardTitle: 'Dashboard Proveedor',
    dashboardStats: [
      { label: 'Ingresos mes', value: 'Q12,450', trend: '+18%' },
      { label: 'Órdenes pendientes', value: '8', trend: '3 urgentes' },
      { label: 'Calificación', value: '4.9★', trend: '127 reseñas' },
    ],
    modules: [
      { icon: Store, title: 'Catálogo Productos', description: 'Stock, precios por talla/tamaño e imágenes múltiples.', tag: 'Ventas' },
      { icon: Calendar, title: 'Servicios & Citas', description: 'Disponibilidad, slots de tiempo y calendario de reservas.', tag: 'Servicios' },
      { icon: ClipboardList, title: 'Gestión de Órdenes', description: 'Estados completos: pending → confirmed → delivered.', tag: 'Ventas' },
      { icon: BarChart3, title: 'Analytics', description: 'Ingresos mensuales, tendencias y productos top.', tag: 'Negocio' },
      { icon: TrendingUp, title: 'Reseñas', description: 'Calificaciones de clientes y reputación del negocio.', tag: 'Reputación' },
      { icon: MapPin, title: 'Perfil & Ubicación', description: 'Google Places, verificación y datos del negocio.', tag: 'Perfil' },
    ],
    highlights: ['Productos + servicios en un panel', 'Analytics financieros avanzados', 'Verificación automática'],
  },
  {
    id: 'shelter',
    label: 'Refugio / Albergue',
    shortLabel: 'Refugio',
    tagline: 'Publica mascotas, gestiona adopciones y conecta con familias responsables.',
    gradient: 'from-landing-mint to-landing-aqua',
    accent: 'text-landing-mint-dark',
    dashboardTitle: 'Dashboard Refugio',
    dashboardStats: [
      { label: 'En adopción', value: '24', trend: '6 nuevas' },
      { label: 'Solicitudes', value: '11', trend: '5 pendientes' },
      { label: 'Adopciones 2024', value: '156', trend: '+22%' },
    ],
    modules: [
      { icon: Heart, title: 'Mascotas en Adopción', description: 'Perfiles detallados con compatibilidad y galería.', tag: 'Adopción' },
      { icon: ClipboardList, title: 'Solicitudes', description: 'Aprobar, rechazar y dar seguimiento post-adopción.', tag: 'Adopción' },
      { icon: MessageCircle, title: 'Chat Adoptantes', description: 'Mensajería en tiempo real con interesados.', tag: 'Comunicación' },
      { icon: Home, title: 'Perfil del Refugio', description: 'Galería, videos YouTube y estadísticas públicas.', tag: 'Perfil' },
      { icon: BarChart3, title: 'Estadísticas', description: 'Adopciones por mes, éxito y tendencias.', tag: 'Análisis' },
    ],
    highlights: ['Flujo completo de adopción', 'Chat integrado con adoptantes', 'Estadísticas de impacto'],
  },
  {
    id: 'delivery',
    label: 'Repartidor',
    shortLabel: 'Repartidor',
    tagline: 'Gestiona entregas, rutas y gastos operativos del marketplace.',
    gradient: 'from-landing-aqua to-landing-mango',
    accent: 'text-landing-aqua-dark',
    dashboardTitle: 'Dashboard Repartidor',
    dashboardStats: [
      { label: 'Entregas hoy', value: '7', trend: '2 en curso' },
      { label: 'Completadas', value: '5', trend: '100% a tiempo' },
      { label: 'Gastos mes', value: 'Q890', trend: 'Combustible' },
    ],
    modules: [
      { icon: Package, title: 'Órdenes Asignadas', description: 'Lista de entregas con estados y detalles del pedido.', tag: 'Entregas' },
      { icon: Truck, title: 'Seguimiento', description: 'Actualización de estado en tiempo real para clientes.', tag: 'Entregas' },
      { icon: DollarSign, title: 'Gastos', description: 'Registro de gastos operativos y combustible.', tag: 'Finanzas' },
    ],
    highlights: ['Órdenes en tiempo real', 'Control de gastos', 'Integrado al marketplace'],
  },
  {
    id: 'admin',
    label: 'Administrador',
    shortLabel: 'Admin',
    tagline: 'Supervisa usuarios, operaciones, finanzas y todo el ecosistema PetHub.',
    gradient: 'from-gray-700 to-gray-900',
    accent: 'text-gray-700',
    dashboardTitle: 'Panel Admin',
    dashboardStats: [
      { label: 'Usuarios totales', value: '15.2K', trend: '+340/mes' },
      { label: 'Órdenes activas', value: '284', trend: 'Live' },
      { label: 'Ingresos plataforma', value: 'Q89K', trend: 'Este mes' },
    ],
    modules: [
      { icon: Users, title: 'Usuarios & Roles', description: 'Gestión de clientes, proveedores, refugios y repartidores.', tag: 'Gestión' },
      { icon: ShoppingBag, title: 'Productos & Servicios', description: 'Moderación del catálogo global del marketplace.', tag: 'Marketplace' },
      { icon: Package, title: 'Órdenes & Delivery', description: 'Supervisión de pedidos y operaciones logísticas.', tag: 'Operaciones' },
      { icon: Heart, title: 'Adopciones & Cría', description: 'Monitoreo de solicitudes y matches de reproducción.', tag: 'Comunidad' },
      { icon: Activity, title: 'Registros de Salud', description: 'Veterinaria, nutrición y ejercicio a nivel plataforma.', tag: 'Datos' },
      { icon: DollarSign, title: 'Análisis Financiero', description: 'Costos, ingresos y reportes operacionales.', tag: 'Finanzas' },
      { icon: Shield, title: 'Seguridad & RLS', description: 'Políticas, verificaciones y control de acceso.', tag: 'Sistema' },
    ],
    highlights: ['Vista 360° de la plataforma', 'Análisis financiero y operacional', 'Control total del ecosistema'],
  },
];

export const PUBLIC_ROLE_IDS = ['client', 'provider', 'shelter'] as const;
export type PublicRoleId = typeof PUBLIC_ROLE_IDS[number];

export const publicPlatformRoles = platformRoles.filter(
  (r): r is PlatformRole & { id: PublicRoleId } =>
    (PUBLIC_ROLE_IDS as readonly string[]).includes(r.id),
);

export const ecosystemConnections = [
  { from: 'client', to: 'provider', label: 'Compra productos & servicios' },
  { from: 'client', to: 'shelter', label: 'Solicita adopciones' },
  { from: 'provider', to: 'delivery', label: 'Asigna entregas' },
  { from: 'delivery', to: 'client', label: 'Entrega pedidos' },
  { from: 'admin', to: 'client', label: 'Supervisa operaciones' },
  { from: 'admin', to: 'provider', label: 'Modera marketplace' },
];

export const publicEcosystemConnections = [
  { from: 'client', to: 'provider', label: 'Compra productos & servicios' },
  { from: 'client', to: 'shelter', label: 'Solicita adopciones' },
  { from: 'provider', to: 'client', label: 'Vende y agenda servicios' },
  { from: 'shelter', to: 'client', label: 'Publica mascotas en adopción' },
];

export const howItWorksSteps = [
  {
    step: '01',
    title: 'Regístrate según tu rol',
    description: 'Dueño, proveedor o refugio — cada perfil accede a su experiencia especializada.',
    icon: Users,
  },
  {
    step: '02',
    title: 'Conecta tus mascotas o negocio',
    description: 'Crea perfiles de mascotas, catálogos de productos o publica adopciones en minutos.',
    icon: PawPrint,
  },
  {
    step: '03',
    title: 'Usa los módulos integrados',
    description: 'Salud, nutrición, marketplace, adopción y más — todo sincronizado en una sola plataforma.',
    icon: Activity,
  },
  {
    step: '04',
    title: 'Crece con la comunidad',
    description: 'Compra, adopta, empareja y conecta con la comunidad pet.',
    icon: TrendingUp,
  },
];

export const marqueeModules = publicPlatformRoles.flatMap((role) =>
  role.modules.map((mod) => ({
    icon: mod.icon,
    title: mod.title,
    tag: mod.tag,
    gradient: role.gradient,
  })),
);

export const floatingNotifications = [
  { icon: Utensils, text: 'Comida programada — Max 18:30', color: 'from-landing-mango to-landing-tropical', delay: '0s' },
  { icon: Stethoscope, text: 'Cita vet confirmada mañana', color: 'from-landing-aqua to-landing-mint', delay: '1s' },
  { icon: Heart, text: 'Match de adopción — Luna 🐕', color: 'from-landing-mint to-landing-aqua', delay: '2s' },
  { icon: ShoppingBag, text: 'Pedido #2847 en camino', color: 'from-landing-aqua to-landing-mango', delay: '0.5s' },
  { icon: Bell, text: 'Vacuna pendiente — Bella', color: 'from-landing-tropical to-landing-mango', delay: '1.5s' },
];

export interface PlatformHighlightCategory {
  title: string;
  gradient: string;
  items: { icon: LucideIcon; title: string; description: string }[];
}

export const platformHighlightCategories: PlatformHighlightCategory[] = [
  {
    title: 'Salud & Bienestar',
    gradient: 'from-landing-aqua to-landing-mint',
    items: [
      { icon: Stethoscope, title: 'Veterinaria', description: 'Historial médico, vacunas y citas' },
      { icon: Utensils, title: 'Nutrición', description: 'Horarios automáticos y Meal Journal' },
      { icon: Activity, title: 'Ejercicio', description: 'Sesiones, metas y Adventure Log' },
    ],
  },
  {
    title: 'Marketplace & Comercio',
    gradient: 'from-landing-mango to-landing-tropical',
    items: [
      { icon: ShoppingBag, title: 'Tienda', description: 'Productos, servicios y checkout integrado' },
      { icon: Package, title: 'Mis Órdenes', description: 'Seguimiento de compras de punta a punta' },
      { icon: Store, title: 'Panel Proveedor', description: 'Catálogo, citas y analytics' },
    ],
  },
  {
    title: 'Comunidad & Adopción',
    gradient: 'from-landing-mint to-landing-aqua',
    items: [
      { icon: Heart, title: 'Adopción', description: 'Swipe, solicitudes y chat con refugios' },
      { icon: Users, title: 'Parejas / Cría', description: 'Matching y coordinación' },
      { icon: MapPin, title: 'Mascotas Perdidas', description: 'Reportes con mapa interactivo' },
    ],
  },
  {
    title: 'Para tu negocio',
    gradient: 'from-landing-aqua to-landing-mango',
    items: [
      { icon: Store, title: 'Catálogo Proveedor', description: 'Productos, servicios y reservas' },
      { icon: Home, title: 'Panel Refugio', description: 'Publica adopciones y gestiona solicitudes' },
      { icon: MessageCircle, title: 'Chat integrado', description: 'Comunicación directa con adoptantes y clientes' },
    ],
  },
];
