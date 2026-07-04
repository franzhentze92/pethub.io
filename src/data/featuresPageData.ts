import {
  Activity, Bell, Calendar, ClipboardList, Heart, MessageCircle,
  Package, PawPrint, ShoppingBag, Stethoscope, Store, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { PublicRoleId } from '@/data/landingPlatformData';

export type PublicFeatureRole = PublicRoleId;

export const PUBLIC_FEATURE_ROLES: PublicFeatureRole[] = ['client', 'provider', 'shelter'];

export const roleLabels: Record<PublicFeatureRole, string> = {
  client: 'Cliente',
  provider: 'Proveedor',
  shelter: 'Refugio',
};

export interface RoleOutcome {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface RoleBenefitProfile {
  id: PublicFeatureRole;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroSubtitle: string;
  sectionTitle: string;
  sectionSubtitle: string;
  outcomes: RoleOutcome[];
  scenarios: string[];
  ctaHint: string;
}

export const roleBenefitProfiles: RoleBenefitProfile[] = [
  {
    id: 'client',
    heroTitleLead: 'Cuida, compra y conecta — todo en ',
    heroTitleAccent: 'un solo lugar',
    heroSubtitle:
      'Como cliente, PetHub te da control real sobre la salud, el bienestar y la vida diaria de tus mascotas. Sin apps sueltas ni papeles perdidos.',
    sectionTitle: 'Lo que puedes hacer como cliente',
    sectionSubtitle:
      'No es una lista de módulos: son resultados concretos que obtienes desde el primer día.',
    outcomes: [
      {
        icon: PawPrint,
        title: 'Ver el historial completo de tu mascota',
        description:
          'Pet Journey une ejercicio, nutrición, visitas al vet, compras y gastos en una sola línea de tiempo por mascota.',
      },
      {
        icon: Bell,
        title: 'No olvidar citas, vacunas ni comidas',
        description:
          'Programa horarios de alimentación, activa recordatorios y lleva el historial médico siempre disponible en tu teléfono.',
      },
      {
        icon: ShoppingBag,
        title: 'Comprar lo que necesita sin salir de la app',
        description:
          'Explora productos y servicios de proveedores locales, paga en checkout y vincula cada compra al perfil de tu mascota.',
      },
      {
        icon: Heart,
        title: 'Adoptar, conectar y ayudar',
        description:
          'Encuentra mascotas en adopción, coordina con refugios por chat, busca parejas compatibles o reporta mascotas perdidas.',
      },
    ],
    scenarios: [
      'Registras a tu mascota una vez y todo queda conectado: ejercicio, comidas, gastos y visitas veterinarias.',
      'Programas la comida de las 18:30 y recibes el recordatorio antes de que lo olvides.',
      'Compras accesorios en el marketplace y el gasto aparece automáticamente en el Pet Journey.',
      'Ves un perfil en adopción, chateas con el refugio y envías tu solicitud sin salir de PetHub.',
    ],
    ctaHint: 'Crea tu cuenta como cliente y registra tu primera mascota en minutos.',
  },
  {
    id: 'provider',
    heroTitleLead: 'Vende, agenda y ',
    heroTitleAccent: 'haz crecer tu negocio pet',
    heroSubtitle:
      'Como proveedor, tienes tienda online, gestión de pedidos, citas de servicios y métricas de negocio — sin montar otra plataforma.',
    sectionTitle: 'Lo que puedes hacer como proveedor',
    sectionSubtitle:
      'PetHub trabaja para tu negocio: publicar, vender, atender y medir resultados desde un solo panel.',
    outcomes: [
      {
        icon: Store,
        title: 'Publicar productos y servicios en minutos',
        description:
          'Sube catálogo con fotos, stock, precios por talla o tamaño de mascota, y aparece en el marketplace de PetHub.',
      },
      {
        icon: Package,
        title: 'Recibir y gestionar pedidos',
        description:
          'Confirma ventas, actualiza estados del pedido y mantén a tus clientes informados desde el dashboard.',
      },
      {
        icon: Calendar,
        title: 'Agendar servicios con disponibilidad real',
        description:
          'Configura horarios, slots de tiempo y recibe reservas de grooming, vet, entrenamiento u otros servicios.',
      },
      {
        icon: TrendingUp,
        title: 'Medir ingresos y reputación',
        description:
          'Consulta analytics de ventas, productos más vendidos y las reseñas que construyen la confianza de nuevos clientes.',
      },
    ],
    scenarios: [
      'Subes croquetas con fotos y precios por talla; los clientes las encuentran en el marketplace al instante.',
      'Un cliente reserva grooming para el sábado — lo confirmas desde tu celular en segundos.',
      'Revisas cuánto vendiste este mes y qué productos necesitas reponer.',
      'Tu perfil verificado y tus reseñas te ayudan a ganar clientes nuevos en la plataforma.',
    ],
    ctaHint: 'Regístrate como proveedor y configura tu catálogo cuando estés listo.',
  },
  {
    id: 'shelter',
    heroTitleLead: 'Conecta mascotas con ',
    heroTitleAccent: 'familias responsables',
    heroSubtitle:
      'Como refugio o albergue, publicas adopciones, evalúas solicitantes y das seguimiento — todo en un flujo pensado para rescate.',
    sectionTitle: 'Lo que puedes hacer como refugio',
    sectionSubtitle:
      'Menos WhatsApps sueltos y más control sobre quién adopta, cuándo y cómo.',
    outcomes: [
      {
        icon: Heart,
        title: 'Publicar mascotas con perfil completo',
        description:
          'Galería, compatibilidad con niños u otras mascotas, necesidades especiales y tarifa de adopción en un perfil claro.',
      },
      {
        icon: ClipboardList,
        title: 'Gestionar solicitudes de adopción',
        description:
          'Recibe postulaciones, revisa información del adoptante y aprueba o rechaza con trazabilidad del proceso.',
      },
      {
        icon: MessageCircle,
        title: 'Coordinar con adoptantes en la app',
        description:
          'Chatea con interesados sin perder el historial ni depender de grupos externos de mensajería.',
      },
      {
        icon: Activity,
        title: 'Ver el impacto de tu trabajo',
        description:
          'Estadísticas de adopciones, solicitudes pendientes y mascotas disponibles para entender tu operación mes a mes.',
      },
    ],
    scenarios: [
      'Publicas a Rocky con fotos, edad, compatibilidad y lo muestras en el catálogo de adopción.',
      'Llega una solicitud: revisas al adoptante y respondes desde el panel del refugio.',
      'Coordinas la entrega por chat integrado, con todo el contexto de la mascota a mano.',
      'Ves cuántas adopciones cerraste este mes y cuántas solicitudes siguen pendientes.',
    ],
    ctaHint: 'Crea tu cuenta de refugio y publica tu primera mascota en adopción.',
  },
];

export const getRoleBenefitProfile = (id: PublicFeatureRole) =>
  roleBenefitProfiles.find((p) => p.id === id) ?? roleBenefitProfiles[0];
