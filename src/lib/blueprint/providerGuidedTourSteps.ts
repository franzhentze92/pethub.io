import {
  type GuidedTourStep,
} from '@/lib/blueprint/guidedTourSteps';
import { buildMascotIntroMessage, buildMascotIntroTitle } from '@/lib/blueprint/blueprintMascots';

export const PROVIDER_TOUR_SECTION_ORDER = [
  'provider-profile',
  'provider-availability',
  'provider-services',
  'provider-products',
  'provider-appointments',
  'provider-orders',
] as const;

export type ProviderTourSectionId = (typeof PROVIDER_TOUR_SECTION_ORDER)[number];

export const PROVIDER_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'provider-welcome',
    phase: 'provider',
    type: 'info',
    title: buildMascotIntroTitle('provider'),
    message: buildMascotIntroMessage('provider'),
    mascotIntro: true,
    placement: 'center',
    ctaLabel: '¡Encantada, Sasha!',
  },
  {
    id: 'provider-profile-intro',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 1 · Perfil del negocio',
    message: 'Completa nombre, tipo, contacto, ubicación y foto de tu negocio.',
    path: '/provider',
    dashboardTab: 'profile',
    targetSelector: '[data-blueprint-guided="edit-provider-profile"]',
    placement: 'top',
    sectionId: 'provider-profile',
    ctaLabel: 'Ir a mi perfil',
  },
  {
    id: 'provider-profile-save',
    phase: 'provider',
    type: 'action',
    title: 'Edita y guarda tu perfil',
    message: 'Toca "Editar", completa todos los campos obligatorios y presiona "Guardar Cambios".',
    path: '/provider',
    dashboardTab: 'profile',
    targetSelector: '[data-blueprint-guided="save-provider-profile"]',
    placement: 'top',
    sectionId: 'provider-profile',
    waitForSave: true,
  },
  {
    id: 'provider-availability-intro',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 2 · Disponibilidad',
    message: 'Configura al menos un horario o franja de atención para que los clientes puedan reservar.',
    path: '/provider',
    dashboardTab: 'profile',
    targetSelector: '[data-blueprint-guided="save-provider-availability"]',
    placement: 'top',
    sectionId: 'provider-availability',
    ctaLabel: 'Ir a horarios',
  },
  {
    id: 'provider-availability-save',
    phase: 'provider',
    type: 'action',
    title: 'Guarda tu horario',
    message: 'Define días y horas de atención y presiona "Guardar Horario del Negocio".',
    path: '/provider',
    dashboardTab: 'profile',
    targetSelector: '[data-blueprint-guided="save-provider-availability"]',
    placement: 'top',
    sectionId: 'provider-availability',
    waitForSave: true,
  },
  {
    id: 'provider-setup-complete',
    phase: 'provider',
    type: 'complete',
    title: '¡Configuración lista!',
    message: 'Perfil y horarios configurados. Sigamos con tu catálogo de servicios y productos.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Continuar',
  },
  {
    id: 'provider-services-intro',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 3 · Servicios',
    message: 'Publica al menos un servicio activo para que los clientes puedan reservar contigo.',
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'services',
    targetSelector: '[data-blueprint-guided="add-service"]',
    placement: 'top',
    sectionId: 'provider-services',
    ctaLabel: 'Ir a servicios',
  },
  {
    id: 'provider-services-save',
    phase: 'provider',
    type: 'action',
    title: 'Crea un servicio',
    message: 'Toca "Agregar Servicio", completa el formulario y confirma la creación.',
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'services',
    targetSelector: '[data-blueprint-guided="save-service"]',
    placement: 'top',
    sectionId: 'provider-services',
    waitForSave: true,
  },
  {
    id: 'provider-products-intro',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 4 · Productos',
    message: 'Agrega al menos un producto activo a tu tienda en PetHub.',
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'products',
    targetSelector: '[data-blueprint-guided="add-product"]',
    placement: 'top',
    sectionId: 'provider-products',
    ctaLabel: 'Ir a productos',
  },
  {
    id: 'provider-products-save',
    phase: 'provider',
    type: 'action',
    title: 'Crea un producto',
    message: 'Toca "Agregar Producto", completa precio y stock, y confirma la creación.',
    path: '/provider',
    dashboardTab: 'store',
    dashboardSubTab: 'products',
    targetSelector: '[data-blueprint-guided="save-product"]',
    placement: 'top',
    sectionId: 'provider-products',
    waitForSave: true,
  },
  {
    id: 'provider-catalog-complete',
    phase: 'provider',
    type: 'complete',
    title: '¡Catálogo publicado!',
    message: 'Servicios y productos listos. Revisemos cómo funcionan citas y pedidos.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Continuar',
  },
  {
    id: 'provider-appointments-info',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 5 · Citas',
    message:
      'Cuando un cliente reserve un servicio, aparecerá aquí. Esta sección se conecta automáticamente al recibir tu primera cita.',
    path: '/provider',
    dashboardTab: 'orders',
    dashboardSubTab: 'appointments',
    targetSelector: '[data-blueprint-guided="provider-appointments-section"]',
    placement: 'top',
    sectionId: 'provider-appointments',
    ctaLabel: 'Ver citas',
  },
  {
    id: 'provider-orders-info',
    phase: 'provider',
    type: 'navigate',
    title: 'Paso 6 · Pedidos',
    message:
      'Los pedidos de productos de tu tienda aparecerán en esta sección. Se conecta al recibir tu primer pedido.',
    path: '/provider',
    dashboardTab: 'orders',
    dashboardSubTab: 'orders',
    targetSelector: '[data-blueprint-guided="provider-orders-section"]',
    placement: 'top',
    sectionId: 'provider-orders',
    ctaLabel: 'Ver pedidos',
  },
  {
    id: 'provider-complete',
    phase: 'provider',
    type: 'complete',
    title: '¡Blueprint proveedor completado!',
    message: 'Tu negocio está configurado en PetHub. Sasha puede ayudarte a gestionar citas, pedidos y tu catálogo.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Ver Blueprint',
  },
];

export function getFullProviderTourSteps(): GuidedTourStep[] {
  return PROVIDER_TOUR_STEPS;
}

export function getFullProviderTourStepCount(): number {
  return PROVIDER_TOUR_STEPS.length;
}

export function computeProviderGlobalTourStartIndex(
  sections: Array<{ id: string; status: string }>,
): number {
  let startIndex = 0;

  for (const sectionId of PROVIDER_TOUR_SECTION_ORDER) {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.status !== 'connected') {
      return startIndex;
    }

    const lastStepForSection = PROVIDER_TOUR_STEPS.reduce(
      (lastIdx, step, idx) => (step.sectionId === sectionId ? idx : lastIdx),
      -1,
    );
    if (lastStepForSection >= 0) {
      startIndex = lastStepForSection + 1;
    }
  }

  return 0;
}
