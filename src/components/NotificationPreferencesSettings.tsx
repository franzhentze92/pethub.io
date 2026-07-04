import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { SettingToggleRow } from '@/components/nutrition/NutritionFormUi';
import { landingBtnPrimary, plainPageAccentBtn, plainPageAccentOutlineBtn, plainPageAccentUi, type PlainPageAccent } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';
import {
  getPushPermission,
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPush,
} from '@/lib/pushNotifications';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import { hasActivePushSubscription } from '@/services/notificationPreferencesService';
import type { UserNotificationPreferences } from '@/types/notifications';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const IN_APP_CATEGORIES = [
  {
    key: 'notify_feeding' as const,
    label: 'Nutrición',
    description: 'Recordatorios de comidas programadas',
  },
  {
    key: 'notify_exercise' as const,
    label: 'Ejercicio',
    description: 'Metas semanales, inactividad y recordatorios de actividad',
  },
  {
    key: 'notify_breeding' as const,
    label: 'Parejas',
    description: 'Solicitudes y matches de reproducción',
  },
  {
    key: 'notify_adoption' as const,
    label: 'Adopción',
    description: 'Estado de solicitudes y nuevas peticiones',
  },
  {
    key: 'notify_lost_pets' as const,
    label: 'Mascotas perdidas',
    description: 'Nuevos reportes y cuando encuentran tu mascota',
  },
  {
    key: 'notify_dog_walks' as const,
    label: 'Paseos',
    description: 'Solicitudes, respuestas y mensajes de paseadores',
  },
  {
    key: 'notify_orders' as const,
    label: 'Órdenes',
    description: 'Cambios de estado en compras y entregas',
  },
  {
    key: 'notify_vet' as const,
    label: 'Veterinaria',
    description: 'Citas, vacunas y recordatorios de salud',
  },
  {
    key: 'notify_account' as const,
    label: 'Cuenta y ajustes',
    description: 'Perfil incompleto, direcciones y tarjetas',
  },
];

const PUSH_CATEGORIES = [
  {
    key: 'push_feeding' as const,
    label: 'Nutrición',
    description: 'Avisos antes de cada comida',
  },
  {
    key: 'push_exercise' as const,
    label: 'Ejercicio',
    description: 'Recordatorios de actividad y metas semanales',
  },
  {
    key: 'push_breeding' as const,
    label: 'Parejas',
    description: 'Nuevas solicitudes de emparejamiento',
  },
  {
    key: 'push_adoption' as const,
    label: 'Adopción',
    description: 'Respuestas y solicitudes nuevas',
  },
  {
    key: 'push_lost_pets' as const,
    label: 'Mascotas perdidas',
    description: 'Nuevos reportes cerca de ti',
  },
  {
    key: 'push_dog_walks' as const,
    label: 'Paseos',
    description: 'Solicitudes y mensajes de paseadores',
  },
  {
    key: 'push_vet' as const,
    label: 'Veterinaria',
    description: 'Vacunas, seguimientos y recordatorios de salud',
  },
  {
    key: 'push_orders' as const,
    label: 'Órdenes',
    description: 'Actualizaciones de pedidos y envíos',
  },
];

const NotificationPreferencesSettings: React.FC<{ plainUi?: boolean; plainAccent?: PlainPageAccent }> = ({
  plainUi = false,
  plainAccent = 'aqua',
}) => {
  const { user } = useAuth();
  const ui = plainPageAccentUi(plainAccent);
  const cardVariant = plainUi ? 'plain' as const : 'glass' as const;
  const primaryBtnClass = plainUi ? plainPageAccentBtn[plainAccent] : landingBtnPrimary;
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences(user?.id);
  const updatePrefs = useUpdateNotificationPreferences(user?.id);

  const [permission, setPermission] = useState(getPushPermission());
  const [pushLoading, setPushLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  const refreshPushState = useCallback(async () => {
    setPermission(getPushPermission());
    if (user?.id) {
      setHasSubscription(await hasActivePushSubscription(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const handleActivatePush = async () => {
    if (!user?.id) return;
    setPushLoading(true);
    try {
      const ok = await subscribeToPushNotifications(user.id);
      await refreshPushState();
      if (ok) {
        toast.success('Notificaciones push activadas en este dispositivo.');
      } else if (Notification.permission === 'denied') {
        toast.error('Bloqueaste las notificaciones. Actívalas en la configuración del navegador.');
      } else {
        toast.error('No se pudieron activar. Intenta de nuevo.');
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleDeactivatePush = async () => {
    if (!user?.id) return;
    setPushLoading(true);
    try {
      await unsubscribeFromPush(user.id);
      await refreshPushState();
      toast.success('Notificaciones push desactivadas en este dispositivo.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron desactivar las notificaciones push.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleToggle = (
    key: keyof Pick<
      UserNotificationPreferences,
      | 'notify_feeding'
      | 'notify_exercise'
      | 'notify_breeding'
      | 'notify_adoption'
      | 'notify_lost_pets'
      | 'notify_dog_walks'
      | 'notify_orders'
      | 'notify_vet'
      | 'notify_account'
      | 'push_feeding'
      | 'push_exercise'
      | 'push_orders'
      | 'push_breeding'
      | 'push_adoption'
      | 'push_lost_pets'
      | 'push_dog_walks'
      | 'push_vet'
    >,
    value: boolean,
  ) => {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: value });
  };

  if (prefsLoading || !prefs) {
    return (
      <MobileSectionCard variant={cardVariant} className="p-4 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </MobileSectionCard>
    );
  }

  const pushSupported = isPushSupported();
  const pushGranted = permission === 'granted';
  const pushActive = pushGranted && hasSubscription;

  return (
    <div className="space-y-4">
      <MobileSectionCard
        variant={cardVariant}
        className={cn(
          'p-4 border-2',
          pushActive
            ? 'border-green-200 bg-green-50/40'
            : plainUi
              ? cn('border-gray-200 bg-gray-50')
              : 'border-landing-aqua/30 bg-landing-aqua/5',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
              pushActive
                ? plainUi ? 'bg-green-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'
                : plainUi ? ui.iconBg : 'bg-gradient-to-br from-landing-aqua to-landing-mint',
            )}
          >
            {pushActive ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Smartphone className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base">Notificaciones del navegador</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {!pushSupported
                ? 'Tu navegador no soporta notificaciones push. Prueba Chrome en el celular o PC.'
                : pushActive
                  ? 'Activas en este dispositivo — recibirás avisos aunque la app esté cerrada.'
                  : pushGranted
                    ? 'Permiso concedido. Pulsa activar para registrar este dispositivo.'
                    : 'Recibe avisos en tu celular o PC aunque no tengas PetHub abierto.'}
            </p>

            {pushSupported && !pushActive && permission !== 'denied' && (
              <Button
                type="button"
                className={cn('w-full mt-4 min-h-[48px] text-base font-semibold', primaryBtnClass)}
                onClick={handleActivatePush}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Activando…
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5 mr-2" />
                    Activar en este dispositivo
                  </>
                )}
              </Button>
            )}

            {pushSupported && pushActive && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4 min-h-[44px] text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDeactivatePush}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                Desactivar en este dispositivo
              </Button>
            )}

            {permission === 'denied' && (
              <p className="text-sm text-red-600 mt-3 font-medium">
                Notificaciones bloqueadas. Ve a configuración del navegador → PetHub → Permitir.
              </p>
            )}
          </div>
        </div>
      </MobileSectionCard>

      <MobileSectionCard variant={cardVariant} className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BellRing className={cn('w-5 h-5', plainUi ? ui.text : 'text-landing-aqua-dark')} />
          <h3 className="font-bold text-gray-900">En la campana de la app</h3>
        </div>
        <p className="text-sm text-gray-500 -mt-1 mb-2">
          Elige qué avisos ves al pulsar la campana en el inicio.
        </p>
        {IN_APP_CATEGORIES.map((category) => (
          <SettingToggleRow
            key={category.key}
            label={category.label}
            description={category.description}
            checked={prefs[category.key]}
            onCheckedChange={(value) => handleToggle(category.key, value)}
          />
        ))}
      </MobileSectionCard>

      {pushSupported && (
        <MobileSectionCard variant={cardVariant} className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-landing-mango-dark" />
            <h3 className="font-bold text-gray-900">Por push (app cerrada)</h3>
          </div>
          <p className="text-sm text-gray-500 -mt-1 mb-2">
            Solo aplican si activaste las notificaciones del navegador arriba.
          </p>
          {PUSH_CATEGORIES.map((category) => (
            <SettingToggleRow
              key={category.key}
              label={category.label}
              description={category.description}
              checked={prefs[category.key]}
              onCheckedChange={(value) => handleToggle(category.key, value)}
            />
          ))}
        </MobileSectionCard>
      )}
    </div>
  );
};

export default NotificationPreferencesSettings;
