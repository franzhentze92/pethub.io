import React, { useState, useEffect, useCallback } from 'react';

import { Bell } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';

import { cn } from '@/lib/utils';

import { landingBtnPrimary } from '@/lib/landingTheme';

import { markNutritionNotificationsRead } from '@/utils/nutritionNotifications';

import { markAdoptionNotificationsRead } from '@/utils/adoptionNotifications';

import { markBreedingNotificationsRead } from '@/utils/breedingNotifications';

import { markLostPetNotificationsRead } from '@/utils/lostPetNotifications';
import { markMarketplaceNotificationsRead } from '@/utils/marketplaceNotifications';
import { markExerciseNotificationsRead } from '@/utils/exerciseNotifications';
import { markVeterinaryNotificationsRead } from '@/utils/veterinaryNotifications';

import { loadBellNotifications } from '@/services/notificationService';

import { getNotificationPreferences } from '@/services/notificationPreferencesService';

import { dismissAccountPrompt } from '@/services/notificationPreferencesService';

import type { AppNotification } from '@/types/notifications';



interface NotificationBellProps {

  className?: string;

  variant?: 'gradient' | 'header';

}



const NotificationList: React.FC<{

  notifications: AppNotification[];

  onMarkAllRead: () => void;

  onItemClick: (notification: AppNotification) => void;

  compact?: boolean;

}> = ({ notifications, onMarkAllRead, onItemClick, compact }) => {

  const getNotificationColor = (type: string) => {

    switch (type) {

      case 'feeding': return 'bg-landing-mango';

      case 'exercise': return 'bg-landing-mint';

      case 'vet': return 'bg-red-500';

      case 'breeding': return 'bg-pink-500';

      case 'adoption': return 'bg-purple-500';

      case 'lost_pet': return 'bg-orange-500';

      case 'orders': return 'bg-amber-500';

      case 'account': return 'bg-landing-aqua';

      case 'reminder': return 'bg-landing-aqua';

      default: return 'bg-gray-500';

    }

  };



  return (

    <>

      <div className={cn('overflow-y-auto overscroll-contain', compact ? 'max-h-[min(24rem,55dvh)]' : 'max-h-80')}>

        {notifications.length === 0 ? (

          <div className="p-8 text-center text-gray-500">

            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />

            <p className="font-medium text-gray-700">Sin notificaciones</p>

            <p className="text-sm mt-1">Cuenta, adopción, parejas y mascotas perdidas</p>

          </div>

        ) : (

          notifications.map((notification) => (

            <button

              key={notification.id}

              type="button"

              onClick={() => onItemClick(notification)}

              className={cn(

                'w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors',

                notification.unread ? 'bg-landing-aqua/5' : ''

              )}

            >

              <div className="flex items-start gap-3">

                <div

                  className={cn(

                    'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',

                    getNotificationColor(notification.type),

                    notification.unread ? '' : 'opacity-30'

                  )}

                />

                <div className="flex-1 min-w-0">

                  <div className="flex items-start justify-between gap-2">

                    <h4 className={cn('font-medium text-sm', notification.unread ? 'text-gray-900' : 'text-gray-600')}>

                      {notification.title}

                    </h4>

                    {notification.unread && (

                      <span className="w-2 h-2 bg-landing-aqua rounded-full shrink-0 mt-1.5" />

                    )}

                  </div>

                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.message}</p>

                  <p className="text-xs text-gray-400 mt-2">

                    {notification.time.toLocaleString('es-ES', {

                      hour: '2-digit',

                      minute: '2-digit',

                      day: '2-digit',

                      month: 'short',

                    })}

                  </p>

                </div>

              </div>

            </button>

          ))

        )}

      </div>



      {notifications.length > 0 && (

        <div className="p-3 border-t border-gray-100 shrink-0">

          <Button

            type="button"

            variant="outline"

            size="sm"

            className="w-full text-xs min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark"

            onClick={onMarkAllRead}

          >

            Marcar todas como leídas

          </Button>

        </div>

      )}

    </>

  );

};



const NotificationBell: React.FC<NotificationBellProps> = ({ className = '', variant = 'gradient' }) => {

  const { user } = useAuth();

  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [loading, setLoading] = useState(false);



  const loadNotifications = useCallback(async () => {

    if (!user?.id) {

      setNotifications([]);

      return;

    }



    try {

      setLoading(true);

      const prefs = await getNotificationPreferences(user.id);

      const items = await loadBellNotifications(user.id, prefs);

      setNotifications(items);

    } catch (error) {

      console.error('Error loading notifications:', error);

    } finally {

      setLoading(false);

    }

  }, [user?.id]);



  useEffect(() => {

    loadNotifications();

    const interval = setInterval(loadNotifications, 60 * 1000);

    const onUpdate = () => loadNotifications();

    window.addEventListener('feeding-notifications-updated', onUpdate);

    window.addEventListener('notifications-updated', onUpdate);

    return () => {

      clearInterval(interval);

      window.removeEventListener('feeding-notifications-updated', onUpdate);

      window.removeEventListener('notifications-updated', onUpdate);

    };

  }, [loadNotifications]);



  useEffect(() => {

    if (showNotifications) {

      loadNotifications();

    }

  }, [showNotifications, loadNotifications]);



  useEffect(() => {

    if (variant !== 'gradient') return;



    const handleClickOutside = (event: MouseEvent) => {

      const target = event.target as Element;

      if (showNotifications && !target.closest('.notification-dropdown')) {

        setShowNotifications(false);

      }

    };



    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [showNotifications, variant]);



  const unreadCount = notifications.filter((n) => n.unread).length;



  const triggerClassName =

    variant === 'header'

      ? 'relative flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border-0 p-0 transition-colors active:scale-95'

      : 'bg-white/20 text-white border-white/40 hover:bg-white/30 hover:text-white backdrop-blur-sm p-2';



  const handleNotificationClick = async (notification: AppNotification) => {

    if (notification.type === 'feeding') {
      await markNutritionNotificationsRead(user?.id ?? '', [notification.id]);
    }

    if (notification.type === 'exercise' && user?.id) {
      await markExerciseNotificationsRead(user.id, [notification.id]);
    }

    if (notification.type === 'vet' && user?.id) {
      await markVeterinaryNotificationsRead(user.id, [notification.id]);
    }

    if (notification.type === 'adoption' && user?.id) {
      await markAdoptionNotificationsRead(user.id, [notification.id]);
    }

    if (notification.type === 'breeding' && user?.id) {
      await markBreedingNotificationsRead(user.id, [notification.id]);
    }

    if (notification.type === 'lost_pet' && user?.id) {
      await markLostPetNotificationsRead(user.id, [notification.id]);
    }

    if (notification.type === 'orders' && user?.id) {
      await markMarketplaceNotificationsRead(user.id, [notification.id]);
    }

    setNotifications((prev) =>

      prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n))

    );

    setShowNotifications(false);



    if (notification.href) {

      const state: {
        tab?: string;
        activeTab?: string;
        activeSubTab?: string;
        requestsView?: 'sent' | 'received';
        applicationId?: string;
        breedingMatchId?: string;
        lostPetId?: string;
        petId?: string;
        petReminderId?: string;
        vaccinationId?: string;
        veterinarySessionId?: string;
        orderId?: string;
        appointmentId?: string;
        mealId?: string;
        openComplete?: boolean;
        openChat?: boolean;
      } = {};

      if (notification.tab) state.tab = notification.tab;
      if (notification.activeTab) state.activeTab = notification.activeTab;
      if (notification.activeSubTab) state.activeSubTab = notification.activeSubTab;
      if (notification.requestsView) state.requestsView = notification.requestsView;
      if (notification.adoptionApplicationId) state.applicationId = notification.adoptionApplicationId;
      if (notification.breedingMatchId) state.breedingMatchId = notification.breedingMatchId;
      if (notification.lostPetId) state.lostPetId = notification.lostPetId;
      if (notification.petId) state.petId = notification.petId;
      if (notification.petReminderId) state.petReminderId = notification.petReminderId;
      if (notification.vaccinationId) state.vaccinationId = notification.vaccinationId;
      if (notification.veterinarySessionId) state.veterinarySessionId = notification.veterinarySessionId;
      if (notification.orderId) state.orderId = notification.orderId;
      if (notification.appointmentId) state.appointmentId = notification.appointmentId;
      if (notification.mealId) state.mealId = notification.mealId;
      if (notification.openComplete) state.openComplete = true;
      if (notification.openChat) state.openChat = true;

      navigate(notification.href, Object.keys(state).length > 0 ? { state } : undefined);

    }

  };



  const handleMarkAllRead = async () => {

    if (!user?.id) return;



    const feedingIds = notifications.filter((n) => n.type === 'feeding' && n.unread).map((n) => n.id);

    if (feedingIds.length > 0) {

      await markNutritionNotificationsRead(user.id, feedingIds);

    }

    const exerciseIds = notifications.filter((n) => n.type === 'exercise' && n.unread).map((n) => n.id);
    if (exerciseIds.length > 0) {
      await markExerciseNotificationsRead(user.id, exerciseIds);
    }

    const vetIds = notifications.filter((n) => n.type === 'vet' && n.unread).map((n) => n.id);
    if (vetIds.length > 0) {
      await markVeterinaryNotificationsRead(user.id, vetIds);
    }



    const adoptionIds = notifications.filter((n) => n.type === 'adoption' && n.unread).map((n) => n.id);
    if (adoptionIds.length > 0) {
      await markAdoptionNotificationsRead(user.id, adoptionIds);
    }

    const breedingIds = notifications.filter((n) => n.type === 'breeding' && n.unread).map((n) => n.id);
    if (breedingIds.length > 0) {
      await markBreedingNotificationsRead(user.id, breedingIds);
    }

    const lostPetIds = notifications.filter((n) => n.type === 'lost_pet' && n.unread).map((n) => n.id);
    if (lostPetIds.length > 0) {
      await markLostPetNotificationsRead(user.id, lostPetIds);
    }

    const orderIds = notifications.filter((n) => n.type === 'orders' && n.unread).map((n) => n.id);
    if (orderIds.length > 0) {
      await markMarketplaceNotificationsRead(user.id, orderIds);
    }

    const accountPrompts = notifications

      .filter((n) => n.type === 'account' && n.unread && n.settingsPromptId)

      .map((n) => n.settingsPromptId!);



    for (const promptId of accountPrompts) {

      await dismissAccountPrompt(user.id, promptId);

    }



    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  };



  const bellButton = (

    <Button

      type="button"

      onClick={() => setShowNotifications((open) => !open)}

      variant="outline"

      size="sm"

      className={triggerClassName}

      aria-label="Notificaciones"

    >

      <Bell className="w-5 h-5" strokeWidth={2} />

      {unreadCount > 0 && (

        <span

          className={cn(

            'absolute bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white/30',

            variant === 'header' ? '-top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1' : '-top-1 -right-1 w-5 h-5 text-xs'

          )}

        >

          {unreadCount > 9 ? '9+' : unreadCount}

        </span>

      )}

    </Button>

  );



  if (variant === 'header') {

    return (

      <>

        <div className={cn('relative notification-dropdown', className)}>{bellButton}</div>



        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>

          <DialogContent

            className={cn(

              'flex flex-col gap-0 p-0 overflow-hidden',

              'w-[calc(100vw-0.5rem)] max-w-lg',

              'max-h-[min(90dvh,640px)]',

              'rounded-2xl border-landing-aqua/15'

            )}

          >

            <DialogHeader className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">

              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">

                <Bell className="w-5 h-5 text-landing-aqua-dark" />

                Notificaciones

                {unreadCount > 0 && (

                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-landing-aqua/15 text-landing-aqua-dark">

                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}

                  </span>

                )}

              </DialogTitle>

            </DialogHeader>



            <div className="flex-1 min-h-0 overflow-hidden">

              {loading ? (

                <div className="p-8 flex justify-center">

                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-landing-aqua/20 border-t-landing-aqua" />

                </div>

              ) : (

                <NotificationList

                  notifications={notifications}

                  onMarkAllRead={handleMarkAllRead}

                  onItemClick={handleNotificationClick}

                  compact

                />

              )}

            </div>



            <div className="shrink-0 p-3 border-t border-gray-100 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

              <Button

                type="button"

                className={cn('w-full min-h-[44px]', landingBtnPrimary)}

                onClick={() => setShowNotifications(false)}

              >

                Cerrar

              </Button>

            </div>

          </DialogContent>

        </Dialog>

      </>

    );

  }



  return (

    <div className={cn('relative notification-dropdown', className)}>

      {bellButton}



      {showNotifications && (

        <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-landing-aqua/15 z-[200] max-h-[min(24rem,70dvh)] overflow-hidden flex flex-col">

          <div className="p-4 border-b border-gray-100 shrink-0">

            <h3 className="font-semibold text-gray-800">Notificaciones</h3>

            <p className="text-sm text-gray-500">

              {loading ? 'Cargando...' : `${notifications.length} notificaciones`}

            </p>

          </div>

          {loading ? (

            <div className="p-8 flex justify-center">

              <div className="animate-spin rounded-full h-6 w-6 border-2 border-landing-aqua/20 border-t-landing-aqua" />

            </div>

          ) : (

            <NotificationList

              notifications={notifications}

              onMarkAllRead={handleMarkAllRead}

              onItemClick={handleNotificationClick}

            />

          )}

        </div>

      )}

    </div>

  );

};



export default NotificationBell;

