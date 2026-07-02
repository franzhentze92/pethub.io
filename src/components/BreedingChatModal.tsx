import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, PawPrint, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import {
  markBreedingChatRoomRead,
  markBreedingNotificationsRead,
} from '@/utils/breedingNotifications';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';

interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  read_at?: string;
}

interface ChatRoom {
  id: string;
  breeding_match_id: string;
  owner1_id: string;
  owner2_id: string;
  created_at: string;
  updated_at: string;
}

interface BreedingMatch {
  id: string;
  pet_id: string;
  potential_partner_id: string;
  owner_id: string;
  partner_owner_id: string;
  status: string;
  pet: any;
  potential_partner: any;
  partner_owner?: {
    full_name: string;
    phone?: string;
  };
  requester_owner?: {
    full_name: string;
    phone?: string;
  };
}

interface BreedingChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  breedingMatch: BreedingMatch | null;
}

const PetChip = ({ pet }: { pet: { name: string; breed?: string; image_url?: string; pet_images?: unknown } }) => {
  const imageUrl = getPrimaryPetImageUrl(pet);
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-landing-aqua/10 ring-2 ring-white shadow-sm">
        {imageUrl ? (
          <img src={imageUrl} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PawPrint className="w-4 h-4 text-landing-aqua-dark" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{pet.name}</p>
        {pet.breed && <p className="text-[11px] text-gray-500 truncate">{pet.breed}</p>}
      </div>
    </div>
  );
};

const BreedingChatModal: React.FC<BreedingChatModalProps> = ({
  isOpen,
  onClose,
  breedingMatch,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && breedingMatch) {
      loadOrCreateChatRoom();
    } else if (!isOpen) {
      setChatRoom(null);
      setMessages([]);
      setNewMessage('');
    }
  }, [isOpen, breedingMatch?.id]);

  useEffect(() => {
    if (!chatRoom) return;
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [chatRoom?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadOrCreateChatRoom = async () => {
    if (!breedingMatch || !user) return;

    try {
      setLoading(true);

      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('breeding_match_id', breedingMatch.id)
        .maybeSingle();

      if (existingRoom) {
        setChatRoom(existingRoom);
        return;
      }

      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          breeding_match_id: breedingMatch.id,
          owner1_id: breedingMatch.owner_id,
          owner2_id: breedingMatch.partner_owner_id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating chat room:', createError);
        toast.error('Error al crear el chat');
        return;
      }

      setChatRoom(newRoom);

      await supabase.from('chat_messages').insert({
        chat_room_id: newRoom.id,
        sender_id: user.id,
        message: `¡Hola! Me interesa la solicitud de reproducción entre ${breedingMatch.pet.name} y ${breedingMatch.potential_partner.name}. ¿Podemos coordinar?`,
        message_type: 'system',
      });
    } catch (error) {
      console.error('Error loading/creating chat room:', error);
      toast.error('Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_room_id', chatRoom.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);

      if (user?.id) {
        await markBreedingChatRoomRead(chatRoom.id, user.id);
        await markBreedingNotificationsRead(user.id, [`breeding-chat-${chatRoom.id}`]);
        dispatchNotificationsUpdated();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!chatRoom) return;

    const subscription = supabase
      .channel(`chat_room_${chatRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${chatRoom.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          const incoming = payload.new as { sender_id?: string };
          if (incoming.sender_id && incoming.sender_id !== user?.id) {
            dispatchNotificationsUpdated();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom || !user || sending) return;

    try {
      setSending(true);

      const { error } = await supabase.from('chat_messages').insert({
        chat_room_id: chatRoom.id,
        sender_id: user.id,
        message: newMessage.trim(),
        message_type: 'text',
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Error al enviar el mensaje');
        return;
      }

      setNewMessage('');
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getOtherUserName = () => {
    if (!breedingMatch || !user) return 'Dueño';
    const isRequester = user.id === breedingMatch.owner_id;
    if (isRequester) {
      return breedingMatch.partner_owner?.full_name || 'Dueño';
    }
    return breedingMatch.requester_owner?.full_name || 'Dueño';
  };

  if (!breedingMatch) return null;

  const otherUserName = getOtherUserName();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[calc(100vw-0.5rem)] max-w-lg',
          'h-[min(96dvh,640px)] max-h-[96dvh]',
          'rounded-2xl border-landing-aqua/15'
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Heart className="w-5 h-5 text-landing-aqua-dark" />
            Chat de reproducción
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1 truncate">
            Conversación con {otherUserName}
          </p>

          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-landing-aqua/10">
            <PetChip pet={breedingMatch.pet} />
            <Heart className="w-4 h-4 text-landing-mango shrink-0" />
            <PetChip pet={breedingMatch.potential_partner} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 bg-gradient-to-b from-white to-landing-aqua/[0.03]">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-landing-aqua/20 border-t-landing-aqua" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-landing-aqua/30" />
              <p className="text-sm font-medium text-gray-700">Sin mensajes aún</p>
              <p className="text-xs text-gray-500 mt-1">
                Inicia la conversación sobre la reproducción
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              const isSystemMessage = message.message_type === 'system';

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center px-2">
                    <div className="text-center max-w-[90%] px-3 py-2 rounded-xl bg-landing-mango/10 border border-landing-mango/20">
                      <p className="text-xs text-gray-700 leading-relaxed">{message.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(message.created_at)}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm',
                      isOwnMessage
                        ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
                    )}
                  >
                    {!isOwnMessage && (
                      <p className="text-[10px] font-medium text-landing-aqua-dark mb-0.5">
                        {otherUserName}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{message.message}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1 text-right',
                        isOwnMessage ? 'text-white/80' : 'text-gray-400'
                      )}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 border-t border-gray-100 bg-white/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={sending || loading}
              className="flex-1 min-h-[48px] rounded-xl border-landing-aqua/20 focus-visible:ring-landing-aqua/30"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || loading}
              className={cn('min-h-[48px] min-w-[48px] px-0 rounded-xl shrink-0', landingBtnPrimary)}
              aria-label="Enviar mensaje"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BreedingChatModal;
