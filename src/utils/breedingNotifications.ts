import { supabase } from '@/lib/supabase';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { AppNotification, UserNotificationPreferences } from '@/types/notifications';

function isRead(prefs: UserNotificationPreferences, id: string): boolean {
  return prefs.read_breeding_notifications.includes(id);
}

export async function markBreedingNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;

  const prefs = await getNotificationPreferences(userId);
  const merged = [...new Set([...prefs.read_breeding_notifications, ...notificationIds])];
  await updateNotificationPreferences(userId, { read_breeding_notifications: merged });
}

export async function markBreedingChatRoomRead(roomId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('chat_messages')
    .update({ read_at: now })
    .eq('chat_room_id', roomId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

export async function fetchBreedingNotificationsForBell(
  userId: string,
  prefs: UserNotificationPreferences,
): Promise<AppNotification[]> {
  if (!prefs.notify_breeding) return [];

  const items: AppNotification[] = [];

  const [receivedPending, sentUpdates, breedingChatRooms] = await Promise.all([
    supabase
      .from('breeding_matches')
      .select(`
        id, created_at,
        pet:pets!breeding_matches_pet_id_fkey(name),
        potential_partner:pets!breeding_matches_potential_partner_id_fkey(name)
      `)
      .eq('partner_owner_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('breeding_matches')
      .select(`
        id, status, updated_at,
        pet:pets!breeding_matches_pet_id_fkey(name),
        potential_partner:pets!breeding_matches_potential_partner_id_fkey(name)
      `)
      .eq('owner_id', userId)
      .in('status', ['accepted', 'matched', 'rejected'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('chat_rooms')
      .select('id, breeding_match_id, updated_at')
      .not('breeding_match_id', 'is', null)
      .or(`owner1_id.eq.${userId},owner2_id.eq.${userId}`),
  ]);

  for (const match of receivedPending.data ?? []) {
    const petName = (match.pet as { name?: string } | null)?.name ?? 'Una mascota';
    const partnerName =
      (match.potential_partner as { name?: string } | null)?.name ?? 'tu mascota';
    const notificationId = `breeding-received-${match.id}`;

    items.push({
      id: notificationId,
      type: 'breeding',
      title: 'Nueva solicitud de pareja',
      message: `${petName} quiere emparejarse con ${partnerName}`,
      time: new Date(match.created_at),
      unread: !isRead(prefs, notificationId),
      href: '/parejas',
      tab: 'solicitudes-recibidas',
      breedingMatchId: match.id,
    });
  }

  for (const match of sentUpdates.data ?? []) {
    const petName = (match.pet as { name?: string } | null)?.name ?? 'Tu mascota';
    const partnerName =
      (match.potential_partner as { name?: string } | null)?.name ?? 'otra mascota';
    const accepted = match.status === 'accepted' || match.status === 'matched';
    const notificationId = accepted
      ? `breeding-accepted-${match.id}`
      : `breeding-rejected-${match.id}`;

    items.push({
      id: notificationId,
      type: 'breeding',
      title: accepted ? 'Solicitud de pareja aceptada' : 'Solicitud de pareja rechazada',
      message: accepted
        ? `¡Match confirmado! ${petName} y ${partnerName} pueden chatear`
        : `Tu solicitud entre ${petName} y ${partnerName} fue rechazada`,
      time: new Date(match.updated_at),
      unread: !isRead(prefs, notificationId),
      href: '/parejas',
      tab: accepted ? 'chats' : 'solicitudes-enviadas',
      breedingMatchId: match.id,
      openChat: accepted,
    });
  }

  const rooms = breedingChatRooms.data ?? [];
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

    const matchIds = rooms.map((room) => room.breeding_match_id).filter(Boolean) as string[];
    let matchMeta: Record<string, { petName: string; partnerName: string }> = {};

    if (matchIds.length > 0) {
      const { data: matches } = await supabase
        .from('breeding_matches')
        .select(`
          id,
          pet:pets!breeding_matches_pet_id_fkey(name),
          potential_partner:pets!breeding_matches_potential_partner_id_fkey(name)
        `)
        .in('id', matchIds);

      matchMeta = (matches ?? []).reduce(
        (acc, match) => {
          acc[match.id] = {
            petName: (match.pet as { name?: string } | null)?.name ?? 'una mascota',
            partnerName:
              (match.potential_partner as { name?: string } | null)?.name ?? 'otra mascota',
          };
          return acc;
        },
        {} as Record<string, { petName: string; partnerName: string }>,
      );
    }

    for (const room of rooms) {
      const latest = latestByRoom.get(room.id);
      if (!latest || !room.breeding_match_id) continue;

      const notificationId = `breeding-chat-${room.id}`;
      const meta = matchMeta[room.breeding_match_id];
      const label = meta ? `${meta.petName} y ${meta.partnerName}` : 'Parejas';

      items.push({
        id: notificationId,
        type: 'breeding',
        title: 'Nuevo mensaje de pareja',
        message: `${label}: ${latest.message.slice(0, 80)}${latest.message.length > 80 ? '…' : ''}`,
        time: new Date(latest.created_at),
        unread: !isRead(prefs, notificationId),
        href: '/parejas',
        tab: 'chats',
        breedingMatchId: room.breeding_match_id,
        openChat: true,
      });
    }
  }

  return items;
}
