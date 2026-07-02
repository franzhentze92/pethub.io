import { supabase } from '@/lib/supabase';
import { getPushPermission, isPushSupported } from '@/lib/pushNotifications';
import type { AppNotification, SettingsPromptId, UserNotificationPreferences } from '@/types/notifications';

function isDismissed(prefs: UserNotificationPreferences, promptId: SettingsPromptId): boolean {
  return prefs.dismissed_account_prompts.includes(promptId);
}

function buildPrompt(
  promptId: SettingsPromptId,
  title: string,
  message: string,
  activeTab: string,
): AppNotification {
  return {
    id: `account-${promptId}`,
    type: 'account',
    title,
    message,
    time: new Date(),
    unread: true,
    href: '/ajustes',
    activeTab,
    settingsPromptId: promptId,
  };
}

export async function fetchSettingsNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_account) return [];

  const items: AppNotification[] = [];

  const [profileRes, petsRes, addressesRes, cardsRes, feedingSchedulesRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, phone, avatar_url')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('client_addresses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('payment_cards')
      .select('id, label, expiry_month, expiry_year')
      .eq('user_id', userId),
    supabase
      .from('pet_feeding_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('send_notifications', true)
      .eq('is_active', true),
  ]);

  const profile = profileRes.data;
  const petCount = petsRes.count ?? 0;
  const addressCount = addressesRes.count ?? 0;
  const feedingScheduleCount = feedingSchedulesRes.count ?? 0;

  if (
    !isDismissed(prefs, 'profile-incomplete') &&
    (!profile?.full_name?.trim() || !profile?.phone?.trim() || !profile?.avatar_url)
  ) {
    const missing: string[] = [];
    if (!profile?.full_name?.trim()) missing.push('nombre');
    if (!profile?.phone?.trim()) missing.push('teléfono');
    if (!profile?.avatar_url) missing.push('foto de perfil');

    items.push(
      buildPrompt(
        'profile-incomplete',
        'Completa tu perfil',
        `Agrega tu ${missing.join(', ')} en Ajustes para una mejor experiencia.`,
        'perfil',
      ),
    );
  }

  if (!isDismissed(prefs, 'no-pets') && petCount === 0) {
    items.push(
      buildPrompt(
        'no-pets',
        'Registra tu primera mascota',
        'Agrega una mascota para usar nutrición, salud, ejercicio y más.',
        'perros',
      ),
    );
  }

  if (!isDismissed(prefs, 'no-address') && addressCount === 0) {
    items.push(
      buildPrompt(
        'no-address',
        'Agrega una dirección de entrega',
        'Necesitas al menos una dirección para comprar en el marketplace.',
        'direcciones',
      ),
    );
  }

  const pushGranted = isPushSupported() && getPushPermission() === 'granted';
  if (
    !isDismissed(prefs, 'push-disabled') &&
    !pushGranted &&
    feedingScheduleCount > 0 &&
    prefs.push_feeding
  ) {
    items.push(
      buildPrompt(
        'push-disabled',
        'Activa notificaciones push',
        'Tienes horarios de comida con recordatorios. Activa las notificaciones del navegador.',
        'notificaciones',
      ),
    );
  }

  if (!isDismissed(prefs, 'card-expiring') && cardsRes.data?.length) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expiring = cardsRes.data.find((card) => {
      const monthsLeft =
        (card.expiry_year - currentYear) * 12 + (card.expiry_month - currentMonth);
      return monthsLeft >= 0 && monthsLeft <= 2;
    });

    if (expiring) {
      items.push(
        buildPrompt(
          'card-expiring',
          'Tarjeta por vencer',
          `Tu tarjeta "${expiring.label}" vence pronto. Actualízala en Ajustes.`,
          'tarjetas',
        ),
      );
    }
  }

  return items;
}
