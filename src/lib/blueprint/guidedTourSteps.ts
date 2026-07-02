import { buildMascotIntroMessage, buildMascotIntroTitle } from '@/lib/blueprint/blueprintMascots';

export type BlueprintTourPhase = 'profile' | 'care' | 'commerce' | 'social' | 'provider' | 'shelter';

export type GuidedTourStepType = 'info' | 'navigate' | 'action' | 'complete';

export type BlueprintTourSectionId =
  | 'profile'
  | 'addresses'
  | 'payment-cards'
  | 'pets'
  | 'nutrition'
  | 'exercise'
  | 'veterinary'
  | 'reminders'
  | 'marketplace'
  | 'orders'
  | 'adoption'
  | 'breeding'
  | 'provider-profile'
  | 'provider-availability'
  | 'provider-services'
  | 'provider-products'
  | 'provider-appointments'
  | 'provider-orders';

export interface GuidedTourStep {
  id: string;
  phase: BlueprintTourPhase;
  type: GuidedTourStepType;
  title: string;
  message: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'center';
  path?: string;
  ajustesTab?: 'perfil' | 'direcciones' | 'tarjetas' | 'perros';
  dashboardTab?: string;
  dashboardSubTab?: string;
  /** Tab interno en módulos como nutrición, ejercicio o veterinaria */
  moduleTab?: string;
  sectionId?: BlueprintTourSectionId;
  waitForSave?: boolean;
  ctaLabel?: string;
  /** Presentación del guía con avatar grande y nombre */
  mascotIntro?: boolean;
  /** Al terminar esta fase, iniciar automáticamente el siguiente tour */
  nextPhase?: BlueprintTourPhase;
}

export const BLUEPRINT_GUIDED_TOUR_KEY = 'pethub_blueprint_guided_tour_v1';
export const BLUEPRINT_FULL_TOUR_COMPLETED_KEY = 'pethub_blueprint_full_tour_completed_v1';
export const BLUEPRINT_TOUR_OFFERED_KEY = 'pethub_blueprint_tour_offered_v1';

export const CLIENT_TOUR_PHASES: BlueprintTourPhase[] = ['profile', 'care', 'commerce', 'social'];

export const PHASE_LABELS: Record<BlueprintTourPhase, string> = {
  profile: 'Perfil base',
  care: 'Cuidado',
  commerce: 'Comercio',
  social: 'Comunidad',
  provider: 'Proveedor',
  shelter: 'Albergue',
};

export const PHASE_SECTION_ORDER: Record<BlueprintTourPhase, BlueprintTourSectionId[]> = {
  profile: ['profile', 'addresses', 'payment-cards', 'pets'],
  care: ['nutrition', 'exercise', 'veterinary', 'reminders'],
  commerce: ['marketplace', 'orders'],
  social: ['adoption', 'breeding'],
  provider: [
    'provider-profile',
    'provider-availability',
    'provider-services',
    'provider-products',
    'provider-appointments',
    'provider-orders',
  ],
  shelter: [],
};

export const PROFILE_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    phase: 'profile',
    type: 'info',
    title: buildMascotIntroTitle('client'),
    message: buildMascotIntroMessage('client'),
    mascotIntro: true,
    placement: 'center',
    ctaLabel: '¡Encantado, Atis!',
  },
  {
    id: 'profile-intro',
    phase: 'profile',
    type: 'navigate',
    title: 'Paso 1 · Mi perfil',
    message: 'Completa tu nombre, teléfono, dirección y foto de perfil. Toca el botón para ir a Ajustes.',
    path: '/ajustes',
    ajustesTab: 'perfil',
    targetSelector: '[data-blueprint-guided="edit-profile"]',
    placement: 'top',
    sectionId: 'profile',
    ctaLabel: 'Ir a mi perfil',
  },
  {
    id: 'profile-edit',
    phase: 'profile',
    type: 'action',
    title: 'Edita y guarda tu perfil',
    message: 'Toca "Editar perfil", llena todos los campos (nombre, teléfono, dirección y foto) y presiona Guardar.',
    targetSelector: '[data-blueprint-guided="edit-profile"]',
    placement: 'top',
    sectionId: 'profile',
    waitForSave: true,
  },
  {
    id: 'addresses-intro',
    phase: 'profile',
    type: 'navigate',
    title: 'Paso 2 · Direcciones',
    message: 'Agrega al menos una dirección de entrega para compras y servicios a domicilio.',
    path: '/ajustes',
    ajustesTab: 'direcciones',
    targetSelector: '[data-blueprint-guided="add-address"]',
    placement: 'top',
    sectionId: 'addresses',
    ctaLabel: 'Ir a direcciones',
  },
  {
    id: 'addresses-add',
    phase: 'profile',
    type: 'action',
    title: 'Agrega una dirección',
    message: 'Toca "Agregar", completa el formulario y guarda tu dirección.',
    targetSelector: '[data-blueprint-guided="add-address"]',
    placement: 'top',
    sectionId: 'addresses',
    waitForSave: true,
  },
  {
    id: 'cards-intro',
    phase: 'profile',
    type: 'navigate',
    title: 'Paso 3 · Tarjetas de pago',
    message: 'Registra al menos una tarjeta para pagar en el marketplace y reservar servicios.',
    path: '/ajustes',
    ajustesTab: 'tarjetas',
    targetSelector: '[data-blueprint-guided="add-card"]',
    placement: 'top',
    sectionId: 'payment-cards',
    ctaLabel: 'Ir a tarjetas',
  },
  {
    id: 'cards-add',
    phase: 'profile',
    type: 'action',
    title: 'Agrega una tarjeta',
    message: 'Toca "Agregar", ingresa los datos de tu tarjeta y guarda.',
    targetSelector: '[data-blueprint-guided="add-card"]',
    placement: 'top',
    sectionId: 'payment-cards',
    waitForSave: true,
  },
  {
    id: 'pets-intro',
    phase: 'profile',
    type: 'navigate',
    title: 'Paso 4 · Mis mascotas',
    message: 'Registra al menos una mascota con perfil completo (nombre, especie, raza, edad, peso y foto).',
    path: '/ajustes',
    ajustesTab: 'perros',
    targetSelector: '[data-blueprint-guided="add-pet"]',
    placement: 'top',
    sectionId: 'pets',
    ctaLabel: 'Ir a mascotas',
  },
  {
    id: 'pets-add',
    phase: 'profile',
    type: 'action',
    title: 'Agrega tu mascota',
    message: 'Toca "Agregar mascota", completa el perfil con foto y guarda.',
    targetSelector: '[data-blueprint-guided="add-pet"]',
    placement: 'top',
    sectionId: 'pets',
    waitForSave: true,
  },
  {
    id: 'profile-complete',
    phase: 'profile',
    type: 'complete',
    title: '¡Perfil base completado!',
    message:
      'Excelente trabajo. Tu perfil, direcciones, tarjetas y mascotas están conectados. Sigamos con el tour de Cuidado.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Continuar',
    nextPhase: 'care',
  },
];

export const CARE_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'care-welcome',
    phase: 'care',
    type: 'info',
    title: 'Fase 2 · Cuidado',
    message:
      'Ahora conectaremos nutrición, ejercicio, veterinaria y recordatorios. Con esto Atis podrá ayudarte en el día a día de tus mascotas.',
    placement: 'center',
    ctaLabel: 'Empezar tour',
  },
  {
    id: 'nutrition-intro',
    phase: 'care',
    type: 'navigate',
    title: 'Paso 1 · Nutrición',
    message: 'Configura un horario de alimentación automático para tu mascota.',
    path: '/feeding-schedules',
    moduleTab: 'create',
    targetSelector: '[data-blueprint-guided="create-feeding-schedule"]',
    placement: 'top',
    sectionId: 'nutrition',
    ctaLabel: 'Ir a nutrición',
  },
  {
    id: 'nutrition-create',
    phase: 'care',
    type: 'action',
    title: 'Crea un horario de alimentación',
    message:
      'Elige mascota, nombre del horario, horas de comida y días de la semana. Luego presiona "Crear horario".',
    targetSelector: '[data-blueprint-guided="create-feeding-schedule"]',
    placement: 'top',
    sectionId: 'nutrition',
    waitForSave: true,
  },
  {
    id: 'exercise-intro',
    phase: 'care',
    type: 'navigate',
    title: 'Paso 2 · Ejercicio',
    message: 'Registra al menos una sesión de actividad física para llevar el control del ejercicio.',
    path: '/trazabilidad',
    moduleTab: 'register',
    targetSelector: '[data-blueprint-guided="register-exercise"]',
    placement: 'top',
    sectionId: 'exercise',
    ctaLabel: 'Ir a ejercicio',
  },
  {
    id: 'exercise-register',
    phase: 'care',
    type: 'action',
    title: 'Registra una sesión de ejercicio',
    message: 'Completa tipo, duración e intensidad y presiona "Registrar sesión".',
    targetSelector: '[data-blueprint-guided="register-exercise"]',
    placement: 'top',
    sectionId: 'exercise',
    waitForSave: true,
  },
  {
    id: 'veterinary-intro',
    phase: 'care',
    type: 'navigate',
    title: 'Paso 3 · Veterinaria',
    message: 'Guarda al menos una visita o registro médico de tu mascota.',
    path: '/veterinaria',
    moduleTab: 'register',
    targetSelector: '[data-blueprint-guided="register-vet-visit"]',
    placement: 'top',
    sectionId: 'veterinary',
    ctaLabel: 'Ir a veterinaria',
  },
  {
    id: 'veterinary-register',
    phase: 'care',
    type: 'action',
    title: 'Registra una visita veterinaria',
    message: 'Completa tipo de cita, fecha, veterinario y diagnóstico. Luego presiona "Registrar Visita Veterinaria".',
    targetSelector: '[data-blueprint-guided="register-vet-visit"]',
    placement: 'top',
    sectionId: 'veterinary',
    waitForSave: true,
  },
  {
    id: 'reminders-intro',
    phase: 'care',
    type: 'navigate',
    title: 'Paso 4 · Recordatorios',
    message: 'Crea un recordatorio para vacunas, citas, medicamentos u otras alertas importantes.',
    path: '/recordatorios',
    targetSelector: '[data-blueprint-guided="create-reminder"]',
    placement: 'top',
    sectionId: 'reminders',
    ctaLabel: 'Ir a recordatorios',
  },
  {
    id: 'reminders-create',
    phase: 'care',
    type: 'action',
    title: 'Crea un recordatorio',
    message: 'Toca "Nuevo", completa el formulario y presiona "Crear recordatorio".',
    targetSelector: '[data-blueprint-guided="create-reminder"]',
    placement: 'top',
    sectionId: 'reminders',
    waitForSave: true,
  },
  {
    id: 'care-complete',
    phase: 'care',
    type: 'complete',
    title: '¡Cuidado conectado!',
    message:
      'Nutrición, ejercicio, veterinaria y recordatorios están activos. Sigamos con el tour de Comercio.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Continuar',
    nextPhase: 'commerce',
  },
];

export const COMMERCE_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'commerce-welcome',
    phase: 'commerce',
    type: 'info',
    title: 'Fase 3 · Comercio',
    message:
      'Conectemos el marketplace y tus órdenes. Guarda favoritos y conoce dónde ver tus compras y reservas.',
    placement: 'center',
    ctaLabel: 'Empezar tour',
  },
  {
    id: 'marketplace-intro',
    phase: 'commerce',
    type: 'navigate',
    title: 'Paso 1 · Marketplace',
    message: 'Explora productos o servicios y guarda al menos uno en favoritos (ícono de estrella).',
    path: '/marketplace/products',
    targetSelector: '[data-blueprint-guided="add-favorite"]',
    placement: 'top',
    sectionId: 'marketplace',
    ctaLabel: 'Ir al marketplace',
  },
  {
    id: 'marketplace-favorite',
    phase: 'commerce',
    type: 'action',
    title: 'Guarda un favorito',
    message: 'Toca la estrella en un producto o servicio para guardarlo en favoritos.',
    targetSelector: '[data-blueprint-guided="add-favorite"]',
    placement: 'top',
    sectionId: 'marketplace',
    waitForSave: true,
  },
  {
    id: 'orders-intro',
    phase: 'commerce',
    type: 'navigate',
    title: 'Paso 2 · Mis órdenes',
    message: 'Aquí verás el historial de compras y reservas de servicios cuando compres en PetHub.',
    path: '/client-orders',
    targetSelector: '[data-blueprint-guided="explore-orders"]',
    placement: 'top',
    sectionId: 'orders',
    ctaLabel: 'Ir a mis órdenes',
  },
  {
    id: 'orders-explore',
    phase: 'commerce',
    type: 'info',
    title: 'Tu historial de pedidos',
    message:
      'Revisa pedidos y reservas en las pestañas. Cuando hagas tu primera compra, esta sección se conectará automáticamente en el Blueprint.',
    targetSelector: '[data-blueprint-guided="explore-orders"]',
    placement: 'top',
    sectionId: 'orders',
    ctaLabel: 'Entendido',
  },
  {
    id: 'commerce-complete',
    phase: 'commerce',
    type: 'complete',
    title: '¡Comercio explorado!',
    message:
      'Marketplace y órdenes listos. Sigamos con el tour de Comunidad.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Continuar',
    nextPhase: 'social',
  },
];

export const SOCIAL_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'social-welcome',
    phase: 'social',
    type: 'info',
    title: 'Fase 4 · Comunidad',
    message:
      'Conectemos adopción y parejas. Explora mascotas en adopción y participa en el módulo de cruza.',
    placement: 'center',
    ctaLabel: 'Empezar tour',
  },
  {
    id: 'adoption-intro',
    phase: 'social',
    type: 'navigate',
    title: 'Paso 1 · Adopción',
    message: 'Explora el catálogo y envía una solicitud de adopción por una mascota que te interese.',
    path: '/adopcion',
    moduleTab: 'catalogo',
    targetSelector: '[data-blueprint-guided="apply-adoption"]',
    placement: 'top',
    sectionId: 'adoption',
    ctaLabel: 'Ir a adopción',
  },
  {
    id: 'adoption-apply',
    phase: 'social',
    type: 'action',
    title: 'Envía una solicitud de adopción',
    message: 'Toca "Solicitar" en una mascota del catálogo para enviar tu solicitud.',
    targetSelector: '[data-blueprint-guided="apply-adoption"]',
    placement: 'top',
    sectionId: 'adoption',
    waitForSave: true,
  },
  {
    id: 'breeding-intro',
    phase: 'social',
    type: 'navigate',
    title: 'Paso 2 · Parejas',
    message:
      'Explora mascotas disponibles para cruza y envía una solicitud de amor. Si aún no tienes una mascota activa para parejas, actívala antes en Ajustes.',
    path: '/parejas',
    moduleTab: 'pet-tinder',
    targetSelector: '[data-blueprint-guided="send-breeding-request"]',
    placement: 'top',
    sectionId: 'breeding',
    ctaLabel: 'Ir a parejas',
  },
  {
    id: 'breeding-request',
    phase: 'social',
    type: 'action',
    title: 'Envía una solicitud de pareja',
    message: 'Toca "Solicitar amor" en una mascota del catálogo, o activa "Disponible para reproducción" en una de tus mascotas en Ajustes.',
    targetSelector: '[data-blueprint-guided="send-breeding-request"]',
    placement: 'top',
    sectionId: 'breeding',
    waitForSave: true,
  },
  {
    id: 'social-complete',
    phase: 'social',
    type: 'complete',
    title: '¡Comunidad conectada!',
    message:
      'Adopción y parejas están activos. Tu ecosistema PetHub está completo — Atis puede ayudarte en todo.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Ver Blueprint',
  },
];

export function getStepsForPhase(phase: BlueprintTourPhase): GuidedTourStep[] {
  switch (phase) {
    case 'profile':
      return PROFILE_TOUR_STEPS;
    case 'care':
      return CARE_TOUR_STEPS;
    case 'commerce':
      return COMMERCE_TOUR_STEPS;
    case 'social':
      return SOCIAL_TOUR_STEPS;
    default:
      return [];
  }
}

export function getFullClientTourSteps(): GuidedTourStep[] {
  return CLIENT_TOUR_PHASES.flatMap((phase) => getStepsForPhase(phase));
}

export function getFullClientTourStepCount(): number {
  return getFullClientTourSteps().length;
}

export function computeGlobalTourStartIndex(
  sections: Array<{ id: string; status: string }>,
): number {
  let globalOffset = 0;

  for (const phase of CLIENT_TOUR_PHASES) {
    const phaseSteps = getStepsForPhase(phase);
    if (isPhaseIncomplete(sections, phase)) {
      const startInPhase = computeTourStartIndex(phase, sections, phaseSteps);
      return globalOffset + startInPhase;
    }
    globalOffset += phaseSteps.length;
  }

  return 0;
}

export function shouldOfferBlueprintTour(): boolean {
  if (localStorage.getItem(BLUEPRINT_TOUR_OFFERED_KEY) === 'true') return false;
  return localStorage.getItem('is_new_user') === 'true';
}

export function markBlueprintTourOffered() {
  localStorage.setItem(BLUEPRINT_TOUR_OFFERED_KEY, 'true');
  localStorage.removeItem('is_new_user');
}

function isPhaseIncomplete(
  sections: Array<{ id: string; status: string }>,
  phase: BlueprintTourPhase,
): boolean {
  const order = PHASE_SECTION_ORDER[phase];
  if (!order.length) return false;
  return order.some((sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.status !== 'connected';
  });
}

export function getNextIncompleteTourPhase(
  afterPhase: BlueprintTourPhase,
  sections: Array<{ id: string; status: string }>,
): BlueprintTourPhase | null {
  const idx = CLIENT_TOUR_PHASES.indexOf(afterPhase);
  if (idx < 0) return null;
  for (let i = idx + 1; i < CLIENT_TOUR_PHASES.length; i++) {
    const candidate = CLIENT_TOUR_PHASES[i];
    if (isPhaseIncomplete(sections, candidate)) return candidate;
  }
  return null;
}

export function getRecommendedTourPhase(
  sections: Array<{ id: string; status: string }>,
): BlueprintTourPhase {
  if (isPhaseIncomplete(sections, 'profile')) return 'profile';
  if (isPhaseIncomplete(sections, 'care')) return 'care';
  if (isPhaseIncomplete(sections, 'commerce')) return 'commerce';
  if (isPhaseIncomplete(sections, 'social')) return 'social';
  return 'social';
}

export function computeTourStartIndex(
  tourPhase: BlueprintTourPhase,
  sections: Array<{ id: string; status: string }>,
  tourSteps: GuidedTourStep[],
): number {
  const sectionOrder = PHASE_SECTION_ORDER[tourPhase];
  if (!sectionOrder.length) return 0;

  const allConnected = sectionOrder.every((sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.status === 'connected';
  });
  if (allConnected) return 0;

  let startIndex = 0;
  for (const sectionId of sectionOrder) {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.status !== 'connected') break;

    const lastStepForSection = tourSteps.reduce(
      (lastIdx, step, idx) => (step.sectionId === sectionId ? idx : lastIdx),
      -1,
    );
    if (lastStepForSection >= 0) {
      startIndex = lastStepForSection + 1;
    }
  }

  return Math.min(startIndex, tourSteps.length - 1);
}
