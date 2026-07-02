import { type GuidedTourStep } from '@/lib/blueprint/guidedTourSteps';
import { buildMascotIntroMessage, buildMascotIntroTitle } from '@/lib/blueprint/blueprintMascots';

export const SHELTER_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'shelter-welcome',
    phase: 'shelter',
    type: 'info',
    title: buildMascotIntroTitle('shelter'),
    message: buildMascotIntroMessage('shelter'),
    mascotIntro: true,
    placement: 'center',
    ctaLabel: '¡Encantado, Shaggy!',
  },
  {
    id: 'shelter-wizard',
    phase: 'shelter',
    type: 'navigate',
    title: 'Tu Blueprint de Albergue',
    message:
      'Usa el wizard y el mapa del ecosistema para completar el perfil de tu albergue, publicar mascotas y gestionar adopciones. Shaggy te acompañará en cada paso.',
    path: '/pet-hub-blueprint',
    placement: 'center',
    ctaLabel: 'Ver pasos recomendados',
  },
  {
    id: 'shelter-complete',
    phase: 'shelter',
    type: 'complete',
    title: '¡Listo para conectar tu albergue!',
    message:
      'Completa cada sección del wizard y el mapa se pondrá verde. Shaggy estará contigo en el Dashboard Albergue para ayudarte con adopciones y solicitudes.',
    placement: 'center',
    path: '/pet-hub-blueprint',
    ctaLabel: 'Empezar a configurar',
  },
];

export function getFullShelterTourSteps(): GuidedTourStep[] {
  return SHELTER_TOUR_STEPS;
}

export function getFullShelterTourStepCount(): number {
  return SHELTER_TOUR_STEPS.length;
}

export function computeShelterGlobalTourStartIndex(
  sections: Array<{ id: string; status: string }>,
): number {
  const allConnected = sections.length > 0 && sections.every((s) => s.status === 'connected');
  if (allConnected) return SHELTER_TOUR_STEPS.length;
  if (sections.some((s) => s.status !== 'disconnected')) return 2;
  return 0;
}
