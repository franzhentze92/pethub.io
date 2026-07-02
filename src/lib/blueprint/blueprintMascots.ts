export type BlueprintDashboard = 'client' | 'provider' | 'shelter';

/** Fixed TTS voice profile per mascot — not user-configurable. */
export type PetBuddyVoiceProfile = 'atis' | 'sasha' | 'shaggy';

export interface BlueprintMascotConfig {
  name: string;
  image: string;
  voiceProfile: PetBuddyVoiceProfile;
}

export const BLUEPRINT_MASCOTS: Record<BlueprintDashboard, BlueprintMascotConfig> = {
  client: { name: 'Atis', image: '/atis-avatar.png', voiceProfile: 'atis' },
  provider: { name: 'Sasha', image: '/sasha-avatar.png', voiceProfile: 'sasha' },
  shelter: { name: 'Shaggy', image: '/shaggy-avatar.png', voiceProfile: 'shaggy' },
};

export const BLUEPRINT_DASHBOARD_LABELS: Record<BlueprintDashboard, string> = {
  client: 'Dashboard Cliente',
  provider: 'Dashboard Proveedor',
  shelter: 'Dashboard Albergue',
};

export function getMascotGuideName(dashboard: BlueprintDashboard): string {
  return BLUEPRINT_MASCOTS[dashboard].name;
}

export function getMascotDashboardForRole(role?: string | null): BlueprintDashboard {
  if (role === 'provider') return 'provider';
  if (role === 'shelter') return 'shelter';
  return 'client';
}

export function buildChatGreeting(
  dashboard: BlueprintDashboard,
  userName?: string,
  voiceMode?: boolean,
): string {
  const firstName = userName?.split(' ')[0] ?? 'amigo';
  const guide = BLUEPRINT_MASCOTS[dashboard].name;

  if (dashboard === 'provider') {
    if (voiceMode) {
      return `¡Qué tal, ${firstName}! Soy ${guide}, tu guía en el Dashboard Proveedor. ¿En qué te ayudo con tu negocio?`;
    }
    return `¡Hola ${firstName}! Soy **${guide}**, tu asistente en el Dashboard Proveedor. Puedo ayudarte con pedidos, citas, catálogo, reservas y tu perfil de negocio. ¿Qué necesitas?`;
  }

  if (dashboard === 'shelter') {
    if (voiceMode) {
      return `¡Qué tal, ${firstName}! Soy ${guide}, tu guía en el Dashboard Albergue. ¿En qué te ayudo con tus adopciones?`;
    }
    return `¡Hola ${firstName}! Soy **${guide}**, tu asistente en el Dashboard Albergue. Puedo ayudarte con mascotas en adopción, solicitudes, el perfil de tu albergue y más. ¿Qué necesitas? 🐾`;
  }

  if (voiceMode) {
    return `¡Qué tal, ${firstName}! Soy ${guide}, tu compa de PetHub. ¿En qué te echo una pata hoy?`;
  }
  return `¡Hola ${firstName}! Soy **${guide}**, tu asistente en PetHub. Puedo ayudarte con tus mascotas, cuidado, marketplace, adopción, recordatorios y más. ¿Qué necesitas? 🐾`;
}

export function buildMascotIntroTitle(dashboard: BlueprintDashboard): string {
  return `¡Hola! Soy ${BLUEPRINT_MASCOTS[dashboard].name}`;
}

export function buildMascotIntroMessage(dashboard: BlueprintDashboard): string {
  const label = BLUEPRINT_DASHBOARD_LABELS[dashboard];
  switch (dashboard) {
    case 'client':
      return `A partir de ahora seré tu guía en el ${label}. Te acompañaré paso a paso para conectar tu perfil, el cuidado de tus mascotas, comercio y comunidad. ¡Juntos dejaremos tu ecosistema PetHub listo!`;
    case 'provider':
      return `Seré tu guía en el ${label}. Te acompañaré para configurar tu negocio: perfil, horarios, servicios, productos y operaciones. Cuando terminemos, tu blueprint se verá completo.`;
    case 'shelter':
      return `Seré tu guía en el ${label}. Te acompañaré para conectar el perfil de tu albergue, publicar mascotas en adopción y gestionar solicitudes. ¡Vamos a dejar tu albergue listo en PetHub!`;
  }
}
