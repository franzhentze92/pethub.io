import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';
import { formatDogWalkPetNames, getDogWalkRequestPets } from '@/utils/dogWalkPets';

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_dog_walk_notifications.includes(id);
}

export async function markDogWalkNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_dog_walk_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_dog_walk_notifications: merged });
}

export async function markDogWalkChatRoomRead(roomId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('chat_messages')
    .update({ read_at: now })
    .eq('chat_room_id', roomId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

async function profileNameMap(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return (data ?? []).reduce(
    (acc, row) => {
      if (row.full_name) acc[row.user_id] = row.full_name;
      return acc;
    },
    {} as Record<string, string>,
  );
}

export async function fetchDogWalkNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_dog_walks) return [];

  const items: AppNotification[] = [];

  const [receivedPending, sentUpdates, walkChatRooms] = await Promise.all([
    supabase
      .from('dog_walk_requests')
      .select(`
        id, client_id, created_at,
        pet:pets(name),
        request_pets:dog_walk_request_pets(pet:pets(name))
      `)
      .eq('walker_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('dog_walk_requests')
      .select(`
        id, walker_id, status, updated_at,
        pet:pets(name),
        request_pets:dog_walk_request_pets(pet:pets(name))
      `)
      .eq('client_id', userId)
      .in('status', ['accepted', 'rejected', 'paid'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('chat_rooms')
      .select('id, dog_walk_request_id, updated_at')
      .not('dog_walk_request_id', 'is', null)
      .or(`owner1_id.eq.${userId},owner2_id.eq.${userId}`),
  ]);

  const profileIds = new Set<string>();
  for (const r of receivedPending.data ?? []) profileIds.add(r.client_id);
  for (const r of sentUpdates.data ?? []) profileIds.add(r.walker_id);
  const names = await profileNameMap([...profileIds]);

  for (const request of receivedPending.data ?? []) {
    const petName = formatDogWalkPetNames(getDogWalkRequestPets(request));
    const clientName = names[request.client_id] ?? 'Un cliente';
    const notificationId = `dog-walk-received-${request.id}`;

    items.push({
      id: notificationId,
      type: 'dog_walk',
      title: 'Nueva solicitud de paseo',
      message: `${clientName} quiere que pasees a ${petName}`,
      time: new Date(request.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/paseos',
      tab: 'mis-solicitudes',
      dogWalkRequestId: request.id,
    });
  }

  for (const request of sentUpdates.data ?? []) {
    const petName = formatDogWalkPetNames(getDogWalkRequestPets(request));
    const walkerName = names[request.walker_id] ?? 'el paseador';
    const accepted = request.status === 'accepted' || request.status === 'paid';
    const notificationId =
      request.status === 'paid'
        ? `dog-walk-paid-${request.id}`
        : accepted
          ? `dog-walk-accepted-${request.id}`
          : `dog-walk-rejected-${request.id}`;

    items.push({
      id: notificationId,
      type: 'dog_walk',
      title:
        request.status === 'paid'
          ? 'Paseo pagado'
          : accepted
            ? 'Solicitud de paseo aceptada'
            : 'Solicitud de paseo rechazada',
      message:
        request.status === 'paid'
          ? `Tu paseo con ${walkerName} para ${petName} fue confirmado`
          : accepted
            ? `${walkerName} aceptó pasear a ${petName}. ¡Procede al pago!`
            : `${walkerName} no pudo aceptar el paseo de ${petName}`,
      time: new Date(request.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/paseos',
      tab: accepted || request.status === 'paid' ? 'chats' : 'mis-solicitudes',
      dogWalkRequestId: request.id,
      openChat: accepted || request.status === 'paid',
    });
  }

  const rooms = walkChatRooms.data ?? [];
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
      { id: string; chat_room_id: string; message: string; created_at: string }
    >();
    for (const message of unreadMessages ?? []) {
      if (!latestByRoom.has(message.chat_room_id)) {
        latestByRoom.set(message.chat_room_id, message);
      }
    }

    const requestIds = rooms
      .map((room) => room.dog_walk_request_id)
      .filter(Boolean) as string[];
    let requestMeta: Record<string, { petName: string }> = {};

    if (requestIds.length > 0) {
      const { data: requests } = await supabase
        .from('dog_walk_requests')
        .select(`
          id,
          pet:pets(name),
          request_pets:dog_walk_request_pets(pet:pets(name))
        `)
        .in('id', requestIds);

      requestMeta = (requests ?? []).reduce(
        (acc, req) => {
          acc[req.id] = {
            petName: formatDogWalkPetNames(getDogWalkRequestPets(req)),
          };
          return acc;
        },
        {} as Record<string, { petName: string }>,
      );
    }

    for (const room of rooms) {
      const latest = latestByRoom.get(room.id);
      if (!latest || !room.dog_walk_request_id) continue;

      const notificationId = `dog-walk-chat-${room.id}`;
      const meta = requestMeta[room.dog_walk_request_id];

      items.push({
        id: notificationId,
        type: 'dog_walk',
        title: 'Nuevo mensaje de paseo',
        message: `${meta?.petName ?? 'Paseo'}: ${latest.message.slice(0, 80)}${latest.message.length > 80 ? '…' : ''}`,
        time: new Date(latest.created_at),
        unread: !isRead(prefs, notificationId),
        href: '/paseos',
        tab: 'chats',
        dogWalkRequestId: room.dog_walk_request_id,
        openChat: true,
      });
    }
  }

  return items;
}
