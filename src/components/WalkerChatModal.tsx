import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, PawPrint, Check, X, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { plainPageAccentBtn } from '@/lib/landingTheme';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import { useCart } from '@/contexts/CartContext';
import { DOG_WALK_CART_PREFIX } from '@/utils/dogWalkCheckout';
import { markDogWalkChatRoomRead } from '@/utils/dogWalkNotifications';
import { updateDogWalkRequestStatus } from '@/utils/dogWalkRequestActions';
import { formatDogWalkPetNames, getDogWalkRequestPets, type DogWalkPetRef } from '@/utils/dogWalkPets';

interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
}

interface ChatRoom {
  id: string;
  dog_walk_request_id: string;
  owner1_id: string;
  owner2_id: string;
}

export interface DogWalkRequest {
  id: string;
  client_id: string;
  walker_id: string;
  pet_id: string;
  status: string;
  message?: string | null;
  requested_date: string;
  requested_time?: string | null;
  duration_minutes: number;
  price: number;
  order_id?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  pickup_address?: string | null;
  pet?: DogWalkPetRef;
  request_pets?: { pet?: DogWalkPetRef | null }[];
  client_profile?: { full_name: string; phone?: string | null; address?: string | null };
  walker_profile?: { full_name: string; phone?: string | null };
}

interface WalkerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: DogWalkRequest | null;
  onStatusChange?: () => void;
}

const socialBtn = plainPageAccentBtn.mango;

const WalkerChatModal: React.FC<WalkerChatModalProps> = ({
  isOpen,
  onClose,
  request,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isClient = user?.id === request?.client_id;
  const isWalker = user?.id === request?.walker_id;
  const otherName = isClient
    ? request?.walker_profile?.full_name
    : request?.client_profile?.full_name;

  useEffect(() => {
    if (isOpen && request) {
      void loadOrCreateChatRoom();
    } else if (!isOpen) {
      setChatRoom(null);
      setMessages([]);
      setNewMessage('');
    }
  }, [isOpen, request?.id]);

  useEffect(() => {
    if (!chatRoom) return;
    void loadMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [chatRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrCreateChatRoom = async () => {
    if (!request || !user) return;
    setLoading(true);
    try {
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('dog_walk_request_id', request.id)
        .maybeSingle();

      if (existingRoom) {
        setChatRoom(existingRoom);
        return;
      }

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          dog_walk_request_id: request.id,
          owner1_id: request.client_id,
          owner2_id: request.walker_id,
        })
        .select()
        .single();

      if (error) throw error;
      setChatRoom(newRoom);
    } catch (error) {
      console.error('Error loading chat room:', error);
      toast.error('Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom) return;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_room_id', chatRoom.id)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data ?? []);

      if (user?.id) {
        await markDogWalkChatRoomRead(chatRoom.id, user.id);
      }
  };

  const subscribeToMessages = () => {
    if (!chatRoom) return () => {};
    const channel = supabase
      .channel(`walk_chat_${chatRoom.id}`)
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
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!chatRoom || !user || !newMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        chat_room_id: chatRoom.id,
        sender_id: user.id,
        message: newMessage.trim(),
        message_type: 'text',
      });
      if (error) throw error;
      setNewMessage('');
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoom.id);
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: 'accepted' | 'rejected' | 'cancelled') => {
    if (!request || !user) return;
    setUpdating(true);
    try {
      await updateDogWalkRequestStatus(request.id, status, user.id);

      toast.success(
        status === 'accepted'
          ? 'Solicitud aceptada'
          : status === 'rejected'
            ? 'Solicitud rechazada'
            : 'Solicitud cancelada',
      );
      onStatusChange?.();
    } catch {
      toast.error('No se pudo actualizar la solicitud');
    } finally {
      setUpdating(false);
    }
  };

  const requestPets = request ? getDogWalkRequestPets(request) : [];
  const petNamesLabel = formatDogWalkPetNames(requestPets);

  const handlePayWalk = () => {
    if (!request) return;
    const walkerName = request.walker_profile?.full_name ?? 'Paseador';
    addItem({
      id: `${DOG_WALK_CART_PREFIX}${request.id}`,
      type: 'product',
      name: `Paseo - ${petNamesLabel} con ${walkerName}`,
      price: request.price,
      currency: 'GTQ',
      quantity: 1,
      provider_id: request.walker_id,
      provider_name: walkerName,
      product_id: request.id,
      description: `Paseo de ${request.duration_minutes} min el ${request.requested_date}`,
      has_delivery: false,
      has_pickup: true,
    });
    toast.success('Paseo agregado al carrito');
    onClose();
    navigate('/cart');
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    cancelled: 'Cancelada',
    paid: 'Pagada',
    completed: 'Completada',
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b bg-landing-mango/10 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-5 h-5 text-landing-mango-dark" />
            Chat con {otherName ?? 'usuario'}
          </DialogTitle>
          {requestPets.length > 0 && (
            <div className="flex items-center gap-2 mt-2 min-w-0">
              <div className="flex -space-x-2 shrink-0">
                {requestPets.slice(0, 3).map((pet) => (
                  <div
                    key={pet.id}
                    className="w-8 h-8 rounded-lg overflow-hidden bg-white ring-2 ring-white"
                  >
                    {getPrimaryPetImageUrl(pet) ? (
                      <img
                        src={getPrimaryPetImageUrl(pet)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PawPrint className="w-4 h-4 text-landing-mango-dark" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="min-w-0 text-xs flex-1">
                <p className="font-medium truncate">{petNamesLabel}</p>
                <p className="text-gray-500">
                  {request.requested_date} · Q.{request.price.toFixed(2)} ·{' '}
                  <span className="font-medium">{statusLabel[request.status] ?? request.status}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px]">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando chat...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin mensajes aún</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.message_type === 'system'
                    ? 'justify-center'
                    : msg.sender_id === user?.id
                      ? 'justify-end'
                      : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    msg.message_type === 'system'
                      ? 'bg-gray-100 text-gray-600 text-xs text-center'
                      : msg.sender_id === user?.id
                        ? 'bg-landing-mango text-gray-900 rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md',
                  )}
                >
                  {msg.message}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {request.status === 'pending' && isWalker && (
          <div className="px-4 py-2 border-t flex gap-2 shrink-0">
            <Button
              size="sm"
              className={`flex-1 ${socialBtn}`}
              disabled={updating}
              onClick={() => updateStatus('accepted')}
            >
              <Check className="w-4 h-4 mr-1" /> Aceptar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600"
              disabled={updating}
              onClick={() => updateStatus('rejected')}
            >
              <X className="w-4 h-4 mr-1" /> Rechazar
            </Button>
          </div>
        )}

        {request.status === 'pending' && isClient && (
          <div className="px-4 py-2 border-t shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-gray-600"
              disabled={updating}
              onClick={() => updateStatus('cancelled')}
            >
              Cancelar solicitud
            </Button>
          </div>
        )}

        {request.status === 'accepted' && isClient && (
          <div className="px-4 py-2 border-t shrink-0">
            <Button className={`w-full ${socialBtn}`} onClick={handlePayWalk}>
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar paseo (Q.{request.price.toFixed(2)})
            </Button>
          </div>
        )}

        {['pending', 'accepted'].includes(request.status) && (
          <div className="p-3 border-t flex gap-2 shrink-0">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sending}
            />
            <Button
              size="icon"
              className={socialBtn}
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalkerChatModal;
