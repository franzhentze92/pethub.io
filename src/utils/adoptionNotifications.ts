import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_adoption_notifications.includes(id);
}

export async function markAdoptionNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_adoption_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_adoption_notifications: merged });
}

export async function markAdoptionChatRoomRead(roomId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('chat_messages')
    .update({ read_at: now })
    .eq('chat_room_id', roomId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

export async function fetchAdoptionNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_adoption) return [];

  const items: AppNotification[] = [];

  const [
    myStatusApps,
    myListings,
    myShelters,
    adoptionChatRooms,
  ] = await Promise.all([
    supabase
      .from('adoption_applications')
      .select('id, status, updated_at, created_at, adoption_pets(name, shelter_id)')
      .eq('applicant_id', userId)
      .in('status', ['approved', 'rejected'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('adoption_pets')
      .select('id, name, shelter_id')
      .eq('owner_id', userId)
      .is('shelter_id', null),
    supabase.from('shelters').select('id').eq('owner_id', userId),
    supabase
      .from('chat_rooms')
      .select('id, adoption_application_id, updated_at')
      .not('adoption_application_id', 'is', null)
      .or(`owner1_id.eq.${userId},owner2_id.eq.${userId}`),
  ]);

  const myListingIds = (myListings.data ?? []).map((pet) => pet.id);
  const shelterIds = (myShelters.data ?? []).map((shelter) => shelter.id);

  let incomingApps: Array<{
    id: string;
    status: string;
    created_at: string;
    adoption_pets: { name?: string; shelter_id?: string | null; owner_id?: string } | null;
  }> = [];

  if (myListingIds.length > 0) {
    const { data } = await supabase
      .from('adoption_applications')
      .select('id, status, created_at, adoption_pets(name, shelter_id, owner_id)')
      .in('pet_id', myListingIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
    incomingApps = data ?? [];
  }

  if (shelterIds.length > 0) {
    const { data: shelterPets } = await supabase
      .from('adoption_pets')
      .select('id')
      .in('shelter_id', shelterIds);

    const shelterPetIds = (shelterPets ?? []).map((pet) => pet.id);
    if (shelterPetIds.length > 0) {
      const { data } = await supabase
        .from('adoption_applications')
        .select('id, status, created_at, adoption_pets(name, shelter_id, owner_id)')
        .in('pet_id', shelterPetIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      const existingIds = new Set(incomingApps.map((app) => app.id));
      for (const app of data ?? []) {
        if (!existingIds.has(app.id)) incomingApps.push(app);
      }
    }
  }

  for (const app of myStatusApps.data ?? []) {
    const petName = (app.adoption_pets as { name?: string } | null)?.name ?? 'la mascota';
    const notificationId = `adoption-status-${app.id}-${app.status}`;
    const approved = app.status === 'approved';

    items.push({
      id: notificationId,
      type: 'adoption',
      title: approved ? 'Adopción aprobada' : 'Adopción rechazada',
      message: approved
        ? `Tu solicitud para adoptar a ${petName} fue aprobada. ¡Ya puedes chatear!`
        : `Tu solicitud para adoptar a ${petName} fue rechazada`,
      time: new Date(app.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/adopcion',
      tab: approved ? 'chats' : 'mis-solicitudes',
      requestsView: 'sent',
      adoptionApplicationId: app.id,
      openChat: approved,
    });
  }

  for (const app of incomingApps) {
    const pet = app.adoption_pets;
    const petName = pet?.name ?? 'Tu mascota';
    const isShelterListing = !!pet?.shelter_id;
    const notificationId = `adoption-incoming-${app.id}`;

    items.push({
      id: notificationId,
      type: 'adoption',
      title: 'Nueva solicitud de adopción',
      message: `Alguien quiere adoptar a ${petName}`,
      time: new Date(app.created_at),
      unread: !isRead(prefs, notificationId),
      href: isShelterListing ? '/shelter-dashboard' : '/adopcion',
      tab: isShelterListing ? undefined : 'mis-solicitudes',
      requestsView: isShelterListing ? undefined : 'received',
      activeTab: isShelterListing ? 'quotes' : undefined,
      adoptionApplicationId: app.id,
    });
  }

  const rooms = adoptionChatRooms.data ?? [];
  if (rooms.length > 0) {
    const roomIds = rooms.map((room) => room.id);
    const { data: unreadMessages } = await supabase
      .from('chat_messages')
      .select('id, chat_room_id, message, created_at, sender_id')
      .in('chat_room_id', roomIds)
      .neq('sender_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false });

    const latestByRoom = new Map<
      string,
      { id: string; chat_room_id: string; message: string; created_at: string; sender_id: string }
    >();
    for (const message of unreadMessages ?? []) {
      if (!latestByRoom.has(message.chat_room_id)) {
        latestByRoom.set(message.chat_room_id, message);
      }
    }

    const applicationIds = rooms
      .map((room) => room.adoption_application_id)
      .filter(Boolean) as string[];

    let applicationMeta: Record<string, { petName: string }> = {};
    if (applicationIds.length > 0) {
      const { data: apps } = await supabase
        .from('adoption_applications')
        .select('id, adoption_pets(name)')
        .in('id', applicationIds);

      applicationMeta = (apps ?? []).reduce(
        (acc, app) => {
          acc[app.id] = {
            petName: (app.adoption_pets as { name?: string } | null)?.name ?? 'la mascota',
          };
          return acc;
        },
        {} as Record<string, { petName: string }>,
      );
    }

    for (const room of rooms) {
      const latest = latestByRoom.get(room.id);
      if (!latest || !room.adoption_application_id) continue;

      const notificationId = `adoption-chat-${room.id}`;
      const petName = applicationMeta[room.adoption_application_id]?.petName ?? 'la mascota';

      items.push({
        id: notificationId,
        type: 'adoption',
        title: 'Nuevo mensaje de adopción',
        message: `${petName}: ${latest.message.slice(0, 80)}${latest.message.length > 80 ? '…' : ''}`,
        time: new Date(latest.created_at),
        unread: !isRead(prefs, notificationId),
        href: '/adopcion',
        tab: 'chats',
        adoptionApplicationId: room.adoption_application_id,
        openChat: true,
      });
    }
  }

  return items;
}
