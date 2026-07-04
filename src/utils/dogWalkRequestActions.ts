import { supabase } from '@/lib/supabase';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';

export type DogWalkRequestStatus = 'accepted' | 'rejected' | 'cancelled';

export async function updateDogWalkRequestStatus(
  requestId: string,
  status: DogWalkRequestStatus,
  actorUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('dog_walk_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;

  const { data: chatRoom } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('dog_walk_request_id', requestId)
    .maybeSingle();

  if (chatRoom) {
    const systemMsg =
      status === 'accepted'
        ? '✅ El paseador aceptó la solicitud. El cliente puede proceder al pago.'
        : status === 'rejected'
          ? '❌ Solicitud rechazada.'
          : 'Solicitud cancelada.';

    await supabase.from('chat_messages').insert({
      chat_room_id: chatRoom.id,
      sender_id: actorUserId,
      message: systemMsg,
      message_type: 'system',
    });
  }

  dispatchNotificationsUpdated();
}
