import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LandingSpinner } from '@/components/PageLoader';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, MapPin, Calendar, Users, ChevronLeft, ChevronRight, X, Filter, Star, PawPrint, Building2, Search, Phone, Plus, AlertTriangle, CheckCircle, Eye, MessageCircle, Send, Loader2, MessagesSquare, RefreshCw, Trash2, Megaphone, UserRound, Inbox, Mail, User } from 'lucide-react';
import AdoptionFilters from './AdoptionFilters';
import { useAdoptionPets, useMyFavorites, useToggleFavorite, useApplyToPet, useMyApplications, useHasAppliedToPet, useCancelAdoptionApplication, useMyAdoptionListings, useApplicationsForMyPets, useWithdrawAdoptionListing, useReactivateAdoptionListing, useUpdateAdoptionApplication, type AdoptionFilters as AdoptionFiltersType } from '@/hooks/useAdoption';
import { useAuth } from '@/contexts/AuthContext';
import AdoptionPetDetails from './AdoptionPetDetails';
import Shelters from './Shelters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import { cn } from '@/lib/utils';
import OfferPetForAdoptionDialog from './OfferPetForAdoptionDialog';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { markAdoptionChatRoomRead, markAdoptionNotificationsRead } from '@/utils/adoptionNotifications';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import {
  AdoptionUserProfileDialog,
  AdoptionRegisteredPetDialog,
  type AdoptionUserProfile,
  type AdoptionRegisteredPet,
} from './AdoptionProfileDialogs';

interface AdoptionChatRoomSummary {
  id: string;
  adoption_application_id: string;
  updated_at: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

const EMPTY_APPLICATIONS: any[] = [];
const EMPTY_PETS: any[] = [];
const EMPTY_FAVORITE_IDS: string[] = [];
const EMPTY_LISTINGS: any[] = [];

const AdoptionSourceBadge: React.FC<{ shelterId?: string | null }> = ({ shelterId }) =>
  shelterId ? (
    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-landing-mango to-landing-tropical text-white shadow-sm flex items-center gap-1">
      <Building2 className="w-3 h-3" />
      Albergue
    </span>
  ) : (
    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-landing-aqua-dark shadow-sm flex items-center gap-1">
      <UserRound className="w-3 h-3" />
      Particular
    </span>
  );

const ApplicantRequestCard: React.FC<{
  app: any;
  petName?: string;
  showPetLabel?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenChat: () => void;
  onViewAdoptionPet?: () => void;
  onViewApplicantProfile?: () => void;
  onViewApplicantPet?: (pet: any) => void;
  reviewPending?: boolean;
  getStatusLabel: (status: string) => string;
  getStatusClass: (status: string) => string;
}> = ({
  app,
  petName,
  showPetLabel,
  onApprove,
  onReject,
  onOpenChat,
  onViewAdoptionPet,
  onViewApplicantProfile,
  onViewApplicantPet,
  reviewPending,
  getStatusLabel,
  getStatusClass,
}) => {
  const initials = (app.applicant_name || '?')
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onViewApplicantProfile}
          className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-landing-aqua/30 to-landing-mint/30 ring-2 ring-white shadow-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          {app.applicant_avatar_url ? (
            <img
              src={app.applicant_avatar_url}
              alt={app.applicant_name || 'Solicitante'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-landing-aqua-dark">{initials}</span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onViewApplicantProfile}
            className="w-full text-left"
          >
          {showPetLabel && petName && (
            <p className="text-[11px] text-landing-aqua-dark font-medium mb-0.5">
              Interesado en {petName}
            </p>
          )}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-gray-900 truncate">
              {app.applicant_name || 'Interesado en adoptar'}
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${getStatusClass(app.status)}`}>
              {getStatusLabel(app.status)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            Solicitud del {new Date(app.created_at).toLocaleDateString('es-ES')}
          </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {onViewAdoptionPet && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px] text-[11px] border-landing-aqua/30 text-landing-aqua-dark"
            onClick={onViewAdoptionPet}
          >
            <PawPrint className="w-3.5 h-3.5 mr-1 shrink-0" />
            Mascota en adopción
          </Button>
        )}
        {onViewApplicantProfile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px] text-[11px] border-landing-mango/30 text-landing-mango-dark"
            onClick={onViewApplicantProfile}
          >
            <User className="w-3.5 h-3.5 mr-1 shrink-0" />
            Perfil solicitante
          </Button>
        )}
      </div>

      {(app.applicant_pets?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Mascotas del solicitante
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(app.applicant_pets as any[]).map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => onViewApplicantPet?.(pet)}
                className="shrink-0 w-16 text-left"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 bg-white">
                  <PetPhotoCarousel
                    pet={pet}
                    alt={pet.name}
                    aspectClassName="h-16 w-16"
                    showDots={false}
                    showCounter={false}
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-700 truncate mt-1">{pet.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5 text-xs text-gray-600">
        {app.applicant_phone && (
          <a
            href={`tel:${app.applicant_phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-landing-aqua/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3.5 h-3.5 text-landing-aqua-dark shrink-0" />
            <span className="font-medium text-gray-800">{app.applicant_phone}</span>
          </a>
        )}
        {app.applicant_email && (
          <a
            href={`mailto:${app.applicant_email}`}
            className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-landing-aqua/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3.5 h-3.5 text-landing-aqua-dark shrink-0" />
            <span className="truncate text-gray-800">{app.applicant_email}</span>
          </a>
        )}
        {app.applicant_address && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100">
            <MapPin className="w-3.5 h-3.5 text-landing-aqua-dark shrink-0 mt-0.5" />
            <span className="text-gray-800 leading-snug">{app.applicant_address}</span>
          </div>
        )}
        {!app.applicant_phone && !app.applicant_email && !app.applicant_address && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-dashed border-gray-200 text-gray-400">
            <User className="w-3.5 h-3.5 shrink-0" />
            Sin datos de contacto en el perfil
          </div>
        )}
      </div>

      {app.message && (
        <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Mensaje</p>
          <p className="text-xs text-gray-700 leading-relaxed">{app.message}</p>
        </div>
      )}

      {app.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className={`flex-1 min-h-[36px] text-xs ${landingBtnPrimary}`}
            onClick={onApprove}
            disabled={reviewPending}
          >
            Aprobar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 min-h-[36px] text-xs border-red-200 text-red-600"
            onClick={onReject}
            disabled={reviewPending}
          >
            Rechazar
          </Button>
        </div>
      )}

      {app.status === 'approved' && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full min-h-[36px] text-xs border-landing-aqua/30 text-landing-aqua-dark"
          onClick={onOpenChat}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Abrir chat
        </Button>
      )}
    </div>
  );
};

const Adopcion: React.FC = () => {
  const [activeTab, setActiveTab] = useState('catalogo');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdoptionFiltersType>({});
  const [detailsPet, setDetailsPet] = useState<any | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatRoomsByApplicationId, setChatRoomsByApplicationId] = useState<Record<string, AdoptionChatRoomSummary>>({});
  const [loadingChatList, setLoadingChatList] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState<any | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [requestsView, setRequestsView] = useState<'sent' | 'received'>('sent');
  const [userProfileDialog, setUserProfileDialog] = useState<{
    open: boolean;
    profile: AdoptionUserProfile | null;
    pets: AdoptionRegisteredPet[];
    title: string;
    subtitle?: string;
  }>({ open: false, profile: null, pets: [], title: 'Perfil' });
  const [registeredPetDialog, setRegisteredPetDialog] = useState<{
    open: boolean;
    pet: AdoptionRegisteredPet | null;
    ownerName?: string;
  }>({ open: false, pet: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSubscriptionRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const guidedTour = useBlueprintGuidedTourOptional();

  const { user } = useAuth()
  const { data: pets = EMPTY_PETS, isLoading: petsLoading } = useAdoptionPets(filters)
  const { data: favoriteIds = EMPTY_FAVORITE_IDS } = useMyFavorites(user?.id)
  const { data: myApplications = EMPTY_APPLICATIONS, isLoading: applicationsLoading } = useMyApplications(user?.id)
  const toggleFavorite = useToggleFavorite()
  const applyToPet = useApplyToPet()
  const cancelApplication = useCancelAdoptionApplication()
  const { data: myListings = EMPTY_LISTINGS, isLoading: listingsLoading } = useMyAdoptionListings(user?.id)
  const { data: incomingApplications = EMPTY_APPLICATIONS, isLoading: incomingLoading } = useApplicationsForMyPets(user?.id)
  const withdrawListing = useWithdrawAdoptionListing()
  const reactivateListing = useReactivateAdoptionListing()
  const reviewApplication = useUpdateAdoptionApplication()
  
  // Add state for application feedback
  const [applicationFeedback, setApplicationFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Check if user has already applied to the currently viewed pet
  const { data: hasApplied = false } = useHasAppliedToPet(detailsPet?.id, user?.id)

  const isFavorite = useMemo(() => new Set(favoriteIds), [favoriteIds])
  
  // Create a set of pet IDs that the user has already applied to
  const appliedPetIds = useMemo(() => {
    return new Set(myApplications.map((app: any) => app.pet_id || app.adoption_pets?.id))
  }, [myApplications])

  const blueprintAdoptionPetId = useMemo(() => {
    const eligible = pets.find(
      (pet: { id: string; owner_id?: string }) =>
        pet.owner_id !== user?.id && !appliedPetIds.has(pet.id),
    );
    return eligible?.id as string | undefined;
  }, [pets, user?.id, appliedPetIds]);

  useEffect(() => {
    const state = location.state as {
      tab?: string;
      requestsView?: 'sent' | 'received';
      applicationId?: string;
      openChat?: boolean;
    } | null;
    if (state?.tab && ['catalogo', 'albergues', 'mis-favoritos', 'mis-solicitudes', 'mis-publicaciones', 'chats'].includes(state.tab)) {
      setActiveTab(state.tab);
    }
    if (state?.requestsView) {
      setRequestsView(state.requestsView);
    }
  }, [location.state]);

  useEffect(() => {
    const state = location.state as {
      applicationId?: string;
      openChat?: boolean;
      tab?: string;
      requestsView?: 'sent' | 'received';
    } | null;
    if (!state?.applicationId || applicationsLoading || incomingLoading) return;

    const application =
      myApplications.find((app: { id: string }) => app.id === state.applicationId) ||
      incomingApplications.find((app: { id: string }) => app.id === state.applicationId);

    if (!application) return;

    if (state.openChat && application.status === 'approved') {
      setSelectedApplication(application);
      setShowChatModal(true);
    }

    navigate('/adopcion', {
      replace: true,
      state: {
        tab: state.tab ?? activeTab,
        ...(state.requestsView ? { requestsView: state.requestsView } : {}),
      },
    });
  }, [
    location.state,
    myApplications,
    incomingApplications,
    applicationsLoading,
    incomingLoading,
    activeTab,
    navigate,
  ]);

  const pendingIncomingCount = useMemo(
    () => incomingApplications.filter((app: any) => app.status === 'pending').length,
    [incomingApplications]
  );

  const allChatApplications = useMemo(() => {
    const sent = myApplications.map((app: any) => ({ ...app, chatRole: 'sent' as const }));
    const received = incomingApplications.map((app: any) => ({ ...app, chatRole: 'received' as const }));
    return [...sent, ...received];
  }, [myApplications, incomingApplications]);

  // Load or create chat room for adoption application
  useEffect(() => {
    if (showChatModal && selectedApplication) {
      loadOrCreateChatRoom();
    } else {
      // Cleanup when modal closes
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
        chatSubscriptionRef.current = null;
      }
      setChatRoom(null);
      setChatMessages([]);
      setNewMessage('');
    }
  }, [showChatModal, selectedApplication]);

  // Load messages when chat room is available
  useEffect(() => {
    if (chatRoom) {
      loadMessages();
      subscribeToMessages();
    }
    
    return () => {
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe();
        chatSubscriptionRef.current = null;
      }
    };
  }, [chatRoom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAdoptionChatRooms = async (applications: any[]) => {
    const chatEligible = applications.filter(
      (app) => app.status === 'approved' || app.status === 'pending'
    );

    if (chatEligible.length === 0) {
      setChatRoomsByApplicationId({});
      return;
    }

    try {
      setLoadingChatList(true);
      const applicationIds = chatEligible.map((app) => app.id);
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('id, adoption_application_id, updated_at')
        .in('adoption_application_id', applicationIds);

      if (roomsError) {
        console.error('Error loading adoption chat rooms:', roomsError);
        setChatRoomsByApplicationId({});
        return;
      }

      if (!rooms?.length) {
        setChatRoomsByApplicationId({});
        return;
      }

      const roomIds = rooms.map((room) => room.id);
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('chat_room_id, message, created_at')
        .in('chat_room_id', roomIds)
        .order('created_at', { ascending: false });

      const lastMessageByRoomId: Record<string, { message: string; created_at: string }> = {};
      for (const message of messages ?? []) {
        if (!lastMessageByRoomId[message.chat_room_id]) {
          lastMessageByRoomId[message.chat_room_id] = {
            message: message.message,
            created_at: message.created_at,
          };
        }
      }

      const summaryByApplicationId = rooms.reduce((acc, room) => {
        const lastMessage = lastMessageByRoomId[room.id];
        acc[room.adoption_application_id] = {
          id: room.id,
          adoption_application_id: room.adoption_application_id,
          updated_at: room.updated_at,
          lastMessage: lastMessage?.message,
          lastMessageAt: lastMessage?.created_at,
        };
        return acc;
      }, {} as Record<string, AdoptionChatRoomSummary>);

      setChatRoomsByApplicationId(summaryByApplicationId);
    } catch (error) {
      console.error('Error loading adoption chat rooms:', error);
      setChatRoomsByApplicationId({});
    } finally {
      setLoadingChatList(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setChatRoomsByApplicationId((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    if (allChatApplications.length === 0) {
      setChatRoomsByApplicationId((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    loadAdoptionChatRooms(allChatApplications);
  }, [allChatApplications, user?.id]);

  const handleOpenChat = (application: any) => {
    setSelectedApplication(application);
    setShowChatModal(true);
  };

  const canCancelApplication = (status: string) => status === 'pending' || status === 'rejected';

  const handleConfirmCancelApplication = async () => {
    if (!applicationToCancel || !user?.id) return;

    try {
      await cancelApplication.mutateAsync({
        applicationId: applicationToCancel.id,
        applicantId: user.id,
      });
      toast.success('Solicitud cancelada correctamente');
      setApplicationToCancel(null);
    } catch (error: any) {
      console.error('Error canceling application:', error);
      toast.error(error?.message || 'No se pudo cancelar la solicitud');
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  };

  const getApplicationStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-landing-tropical/30 text-landing-mango-dark';
      case 'approved': return 'bg-landing-mint/20 text-landing-mint-dark';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const activeChatApplications = useMemo(() => {
    return allChatApplications.filter(
      (app: any) => app.status === 'approved' || !!chatRoomsByApplicationId[app.id]
    );
  }, [allChatApplications, chatRoomsByApplicationId]);

  const sortedChatApplications = useMemo(() => {
    return [...activeChatApplications].sort((a: any, b: any) => {
      const aRoom = chatRoomsByApplicationId[a.id];
      const bRoom = chatRoomsByApplicationId[b.id];
      const aDate = new Date(aRoom?.lastMessageAt ?? aRoom?.updated_at ?? a.updated_at ?? a.created_at).getTime();
      const bDate = new Date(bRoom?.lastMessageAt ?? bRoom?.updated_at ?? b.updated_at ?? b.created_at).getTime();
      return bDate - aDate;
    });
  }, [activeChatApplications, chatRoomsByApplicationId]);

  const loadOrCreateChatRoom = async () => {
    if (!selectedApplication || !user) return;

    try {
      setLoadingChat(true);

      // Get pet owner information
      const { data: petData, error: petError } = await supabase
        .from('adoption_pets')
        .select('shelter_id, owner_id')
        .eq('id', selectedApplication.pet_id)
        .maybeSingle();

      if (petError && petError.code !== 'PGRST116') {
        console.error('Error fetching pet data:', petError);
      }

      const shelterOwnerId = petData?.owner_id;
      const applicantId = selectedApplication.applicant_id;

      // Ensure we have both parties
      if (!shelterOwnerId || !applicantId) {
        toast.error('No se pudo identificar a los participantes del chat');
        return;
      }

      // First, try to find existing chat room
      const { data: existingRoom, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('adoption_application_id', selectedApplication.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching chat room:', fetchError);
      }

      if (existingRoom) {
        setChatRoom(existingRoom);
        return;
      }

      // If no existing room, create a new one
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          adoption_application_id: selectedApplication.id,
          owner1_id: applicantId,
          owner2_id: shelterOwnerId
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating chat room:', createError);
        toast.error('Error al crear el chat. Asegúrate de que la tabla chat_rooms tenga el campo adoption_application_id.');
        return;
      }

      setChatRoom(newRoom);

      // Send initial welcome message from shelter if application is approved
      if (selectedApplication.status === 'approved' && user.id === shelterOwnerId) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_room_id: newRoom.id,
            sender_id: user.id,
            message: `¡Hola! Gracias por tu interés en adoptar a ${selectedApplication.adoption_pets?.name || 'nuestra mascota'}. ¿Te gustaría programar una cita para conocerla?`,
            message_type: 'system'
          });
      } else if (selectedApplication.status === 'approved' && user.id === applicantId) {
        // Also allow applicant to send first message
        await supabase
          .from('chat_messages')
          .insert({
            chat_room_id: newRoom.id,
            sender_id: user.id,
            message: `¡Hola! Me interesa adoptar a ${selectedApplication.adoption_pets?.name || 'su mascota'}. ¿Podemos coordinar una cita?`,
            message_type: 'text'
          });
      }

    } catch (error) {
      console.error('Error loading/creating chat room:', error);
      toast.error('Error al cargar el chat');
    } finally {
      setLoadingChat(false);
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

      setChatMessages(data || []);

      if (user?.id) {
        await markAdoptionChatRoomRead(chatRoom.id, user.id);
        await markAdoptionNotificationsRead(user.id, [`adoption-chat-${chatRoom.id}`]);
        dispatchNotificationsUpdated();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!chatRoom) return;

    // Unsubscribe from previous subscription if it exists
    if (chatSubscriptionRef.current) {
      chatSubscriptionRef.current.unsubscribe();
    }

    const subscription = supabase
      .channel(`adoption_chat_${chatRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_room_id=eq.${chatRoom.id}`
      }, (payload) => {
        setChatMessages(prev => {
          const messageExists = prev.some(msg => msg.id === payload.new.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, payload.new as any];
        });
        setTimeout(() => scrollToBottom(), 100);

        const incoming = payload.new as { sender_id?: string };
        if (incoming.sender_id && incoming.sender_id !== user?.id) {
          dispatchNotificationsUpdated();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to chat messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to chat messages');
        }
      });

    chatSubscriptionRef.current = subscription;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom || !user || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      chat_room_id: chatRoom.id,
      sender_id: user.id,
      message: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Add message optimistically to UI
    setChatMessages(prev => [...prev, optimisticMessage as any]);
    setNewMessage('');
    scrollToBottom();

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: chatRoom.id,
          sender_id: user.id,
          message: messageText,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Error al enviar el mensaje');
        // Remove optimistic message on error
        setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
        setNewMessage(messageText); // Restore message text
        return;
      }

      // Replace optimistic message with real one
      if (data) {
        setChatMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempId);
          // Check if message already exists (from subscription)
          const exists = filtered.some(msg => msg.id === data.id);
          if (exists) {
            return filtered;
          }
          return [...filtered, data];
        });
        setTimeout(() => scrollToBottom(), 100);
        dispatchNotificationsUpdated();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleShelterClick = (shelterId: string) => {
    navigate(`/shelter/${shelterId}`);
  };

  const handleAdoptionApplication = async (petId: string) => {
    if (!user?.id) {
      const errorMessage = 'Debes iniciar sesión para solicitar una adopción';
      setApplicationFeedback({ 
        type: 'error', 
        message: errorMessage
      });
      
      toast.error(errorMessage);
      
      setTimeout(() => {
        setApplicationFeedback(null);
      }, 5000);
      return;
    }

    const targetPet = pets.find((p: any) => p.id === petId) ?? detailsPet;
    if (targetPet?.owner_id === user.id) {
      toast.error('No puedes solicitar la adopción de tu propia mascota');
      return;
    }

    // Check if user has already applied to this pet
    const { data: existingApp } = await supabase
      .from('adoption_applications')
      .select('id')
      .eq('pet_id', petId)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (existingApp) {
      const errorMessage = 'Ya has enviado una solicitud de adopción para esta mascota';
      setApplicationFeedback({ 
        type: 'error', 
        message: errorMessage
      });
      
      toast.error(errorMessage);
      
      setTimeout(() => {
        setApplicationFeedback(null);
      }, 5000);
      return;
    }

    try {
      await applyToPet.mutateAsync({
        pet_id: petId,
        applicant_id: user.id,
        status: 'pending',
        message: 'Solicitud de adopción enviada'
      });

      const successMessage = '¡Solicitud de adopción enviada exitosamente! Te contactaremos pronto.';
      setApplicationFeedback({ 
        type: 'success', 
        message: successMessage
      });
      
      toast.success(successMessage);
      void guidedTour?.notifySectionSaved('adoption');
      
      setTimeout(() => {
        setApplicationFeedback(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error submitting adoption application:', error);
      const errorMessage = error?.message?.includes('Ya has enviado') 
        ? error.message 
        : `Error al enviar la solicitud: ${error?.message || 'Por favor intenta de nuevo.'}`;
      setApplicationFeedback({ 
        type: 'error', 
        message: errorMessage
      });
      
      toast.error(errorMessage);
      
      setTimeout(() => {
        setApplicationFeedback(null);
      }, 5000);
    }
  };

  const activeListedPetIds = useMemo(() => {
    return myListings
      .filter((listing: any) => listing.status === 'available' && listing.pet_id)
      .map((listing: any) => listing.pet_id as string);
  }, [myListings]);

  const handleReviewApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      await reviewApplication.mutateAsync({ applicationId, status });
      toast.success(status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar la solicitud');
    }
  };

  const openAdoptionPetProfile = (pet: any) => {
    if (!pet) return;
    setDetailsPet(pet);
  };

  const openApplicantProfile = (app: any) => {
    setUserProfileDialog({
      open: true,
      title: 'Perfil del solicitante',
      subtitle: app.adoption_pets?.name ? `Interesado en adoptar a ${app.adoption_pets.name}` : undefined,
      profile: {
        user_id: app.applicant_id,
        full_name: app.applicant_name,
        phone: app.applicant_phone,
        email: app.applicant_email,
        address: app.applicant_address,
        avatar_url: app.applicant_avatar_url,
      },
      pets: (app.applicant_pets as AdoptionRegisteredPet[]) || [],
    });
  };

  const openListingOwnerProfile = async (app: any) => {
    let ownerPets: AdoptionRegisteredPet[] = [];
    const petId = app.adoption_pets?.pet_id;

    if (petId) {
      const { data: sourcePet } = await supabase
        .from('pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('id', petId)
        .maybeSingle();
      if (sourcePet) ownerPets = [sourcePet as AdoptionRegisteredPet];
    }

    setUserProfileDialog({
      open: true,
      title: 'Perfil del dueño',
      subtitle: app.adoption_pets?.name ? `Dueño de ${app.adoption_pets.name}` : undefined,
      profile: {
        user_id: app.listing_owner_id,
        full_name: app.listing_owner_name,
        phone: app.listing_owner_phone,
        email: app.listing_owner_email,
        address: app.listing_owner_address,
        avatar_url: app.listing_owner_avatar_url,
      },
      pets: ownerPets,
    });
  };

  const openRegisteredPetProfile = (pet: AdoptionRegisteredPet, ownerName?: string) => {
    setRegisteredPetDialog({ open: true, pet, ownerName });
  };

  const handleWithdrawListing = async (listingId: string) => {
    try {
      await withdrawListing.mutateAsync(listingId);
      toast.success('Publicación retirada del catálogo');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo retirar la publicación');
    }
  };

  const handleReactivateListing = async (listingId: string) => {
    try {
      await reactivateListing.mutateAsync(listingId);
      toast.success('Publicación reactivada');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo reactivar la publicación');
    }
  };

  const getListingStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Activa';
      case 'removed': return 'Retirada';
      case 'adopted': return 'Adoptada';
      case 'hold': return 'Reservada';
      default: return status;
    }
  };

  const getListingStatusClass = (status: string) => {
    switch (status) {
      case 'available': return 'bg-landing-mint/20 text-landing-mint-dark';
      case 'removed': return 'bg-gray-100 text-gray-600';
      case 'adopted': return 'bg-landing-aqua/20 text-landing-aqua-dark';
      default: return 'bg-landing-tropical/30 text-landing-mango-dark';
    }
  };

  const adoptionTabs: MobileTabItem[] = [
    { id: 'catalogo', label: 'Catálogo', shortLabel: 'Catálogo', icon: Heart, gradientIndex: 1 },
    { id: 'mis-publicaciones', label: 'Mis Publicaciones', shortLabel: 'Publicar', icon: Megaphone, gradientIndex: 5 },
    { id: 'albergues', label: 'Albergues', shortLabel: 'Albergues', icon: Building2, gradientIndex: 0 },
    { id: 'mis-favoritos', label: 'Mis Favoritos', shortLabel: 'Favoritos', icon: Star, gradientIndex: 2 },
    { id: 'mis-solicitudes', label: 'Mis Solicitudes', shortLabel: 'Solicitudes', icon: CheckCircle, gradientIndex: 3 },
    { id: 'chats', label: 'Chats', shortLabel: 'Chats', icon: MessagesSquare, gradientIndex: 4 },
  ];

  const petCardClass = 'rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden active:scale-[0.99] transition-all cursor-pointer';

  return (
    <DashboardShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Adopción</h1>
        <p className="text-sm text-gray-500">Encuentra tu compañero perfecto</p>
      </div>

      <MobileTabStrip tabs={adoptionTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="space-y-4">
        {/* Application Feedback */}
        {applicationFeedback && (
          <div className={`p-4 rounded-2xl ${
            applicationFeedback.type === 'success'
              ? 'bg-landing-mint/15 border border-landing-mint/30 text-landing-mint-dark'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {applicationFeedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium">{applicationFeedback.message}</span>
              </div>
            </div>
          )}

        {/* Tab Content */}
        {activeTab === 'catalogo' && (
          <div className="space-y-4">
            <Button
              type="button"
              onClick={() => {
                if (!user?.id) {
                  toast.error('Inicia sesión para ofrecer tu mascota en adopción');
                  return;
                }
                setShowOfferDialog(true);
              }}
              className={`w-full min-h-[48px] ${landingBtnPrimary}`}
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Ofrecer mi mascota en adopción
            </Button>

            {/* Filters - Mobile Optimized */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 flex-1 sm:flex-initial min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10 ${showFilters ? 'bg-landing-aqua/10' : ''}`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filtros</span>
              </Button>
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap bg-white/60 px-3 py-2 rounded-full">
                {pets.length} disponible{pets.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Filters Panel - Full width on mobile */}
            {showFilters && (
              <div className="mb-4">
                <AdoptionFilters onFiltersChange={setFilters} />
              </div>
            )}

            {/* Pets List - Mobile First Design */}
            {petsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-40 sm:h-64 bg-gray-200 animate-pulse" />
                    <CardContent className="p-3 sm:p-4">
                      <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
                      <div className="h-3 sm:h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pets.length === 0 ? (
              <div className="text-center py-16">
                <PawPrint className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay mascotas disponibles</h3>
                <p className="text-gray-500 text-sm">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                {pets.map((pet) => (
                  <div
                    key={pet.id}
                    className={petCardClass}
                    onClick={() => setDetailsPet(pet)}
                  >
                    <div className="relative">
                      <PetPhotoCarousel
                        pet={pet}
                        alt={pet.name}
                        aspectClassName="h-40 sm:h-52"
                        showDots={false}
                        showCounter
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!user?.id) return;
                          toggleFavorite.mutate({ petId: pet.id, userId: user.id, isFavorite: isFavorite.has(pet.id) });
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/95 rounded-full shadow-md active:scale-95 transition-transform"
                      >
                        <Star className={`w-4 h-4 ${isFavorite.has(pet.id) ? 'fill-landing-mango text-landing-mango' : 'text-gray-400'}`} />
                      </button>
                      <AdoptionSourceBadge shelterId={pet.shelter_id} />
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{pet.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{pet.breed || 'Mestizo'} · {pet.age ?? 'N/A'} {pet.age === 1 ? 'año' : 'años'}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 shrink-0 text-landing-aqua-dark" />
                        <span className="truncate">{pet.location || 'Sin ubicación'}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <Button
                          size="sm"
                          className={`w-full min-h-[36px] text-xs ${landingBtnPrimary}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsPet(pet);
                          }}
                        >
                          Ver detalles
                        </Button>
                        <Button
                          size="sm"
                          className={`w-full min-h-[36px] text-xs ${
                            appliedPetIds.has(pet.id)
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200'
                              : 'bg-gradient-to-r from-landing-mango to-landing-tropical hover:from-landing-mango-dark hover:to-landing-tropical text-white'
                          }`}
                          data-blueprint-guided={
                            pet.id === blueprintAdoptionPetId ? 'apply-adoption' : undefined
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdoptionApplication(pet.id);
                          }}
                          disabled={appliedPetIds.has(pet.id) || pet.owner_id === user?.id}
                        >
                          {pet.owner_id === user?.id
                            ? 'Tu publicación'
                            : appliedPetIds.has(pet.id)
                              ? '✓ Solicitud enviada'
                              : 'Solicitar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      {activeTab === 'albergues' && <Shelters />}

        {activeTab === 'mis-publicaciones' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mis publicaciones</h2>
                <p className="text-sm text-gray-500">
                  Ofrece tu mascota en adopción si te mudas o no puedes cuidarla
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (!user?.id) {
                  toast.error('Inicia sesión para publicar');
                  return;
                }
                setShowOfferDialog(true);
              }}
              className={`w-full min-h-[48px] ${landingBtnPrimary}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva publicación
            </Button>

            {listingsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <MobileSectionCard key={i} className="p-4">
                    <div className="animate-pulse flex gap-3">
                      <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </MobileSectionCard>
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <Megaphone className="w-12 h-12 text-landing-aqua/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin publicaciones</h3>
                <p className="text-sm text-gray-500">
                  Publica una de tus mascotas para que otras personas puedan adoptarla.
                </p>
              </MobileSectionCard>
            ) : (
              <div className="space-y-3">
                {myListings.map((listing: any) => {
                  const listingApps = incomingApplications.filter((app: any) => app.pet_id === listing.id);
                  const pendingCount = listingApps.filter((app: any) => app.status === 'pending').length;

                  return (
                    <MobileSectionCard key={listing.id}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => openAdoptionPetProfile(listing)}
                            className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 active:scale-95 transition-transform"
                          >
                            <PetPhotoCarousel
                              pet={listing}
                              alt={listing.name}
                              aspectClassName="h-20 w-20"
                              showDots={false}
                              showCounter={false}
                            />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => openAdoptionPetProfile(listing)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-gray-900 truncate">{listing.name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${getListingStatusClass(listing.status)}`}>
                                  {getListingStatusLabel(listing.status)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {listing.breed || 'Mestizo'}
                                {listing.location ? ` · ${listing.location}` : ''}
                              </p>
                            </button>
                            {pendingCount > 0 && (
                              <p className="text-xs font-medium text-landing-mango-dark mt-1">
                                {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full min-h-[36px] text-xs border-landing-aqua/30 text-landing-aqua-dark"
                          onClick={() => openAdoptionPetProfile(listing)}
                        >
                          <PawPrint className="w-3.5 h-3.5 mr-1" />
                          Ver perfil de {listing.name}
                        </Button>

                        <div className="flex flex-col gap-2">
                          {listing.status === 'available' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[40px] border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleWithdrawListing(listing.id)}
                              disabled={withdrawListing.isPending}
                            >
                              Retirar del catálogo
                            </Button>
                          ) : listing.status === 'removed' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10"
                              onClick={() => handleReactivateListing(listing.id)}
                              disabled={reactivateListing.isPending}
                            >
                              Volver a publicar
                            </Button>
                          ) : null}
                        </div>

                        {listingApps.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Solicitudes recibidas
                            </p>
                            {listingApps.map((app: any) => (
                              <ApplicantRequestCard
                                key={app.id}
                                app={app}
                                petName={listing.name}
                                onViewAdoptionPet={() => openAdoptionPetProfile(app.adoption_pets || listing)}
                                onViewApplicantProfile={() => openApplicantProfile(app)}
                                onViewApplicantPet={(pet) => openRegisteredPetProfile(pet, app.applicant_name)}
                                onApprove={() => handleReviewApplication(app.id, 'approved')}
                                onReject={() => handleReviewApplication(app.id, 'rejected')}
                                onOpenChat={() => {
                                  setSelectedApplication({ ...app, applicant_id: app.applicant_id });
                                  setShowChatModal(true);
                                }}
                                reviewPending={reviewApplication.isPending}
                                getStatusLabel={getApplicationStatusLabel}
                                getStatusClass={getApplicationStatusClass}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </MobileSectionCard>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {activeTab === 'mis-favoritos' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mis favoritos</h2>
              <p className="text-sm text-gray-500">Mascotas que has marcado con estrella</p>
            </div>

            {/* Favorites Grid */}
            {petsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-40 sm:h-48 bg-gray-200 animate-pulse" />
                    <CardContent className="p-3 sm:p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    </CardContent>
                  </Card>
                ))}
                    </div>
            ) : pets.filter(pet => isFavorite.has(pet.id)).length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No tienes favoritos</h3>
                <p className="text-gray-500">Marca mascotas como favoritas para verlas aquí</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                {pets.filter(pet => isFavorite.has(pet.id)).map((pet) => (
                  <div key={pet.id} className={petCardClass} onClick={() => setDetailsPet(pet)}>
                    <div className="relative">
                      <PetPhotoCarousel
                        pet={pet}
                        alt={pet.name}
                        aspectClassName="h-40 sm:h-48"
                        showDots={false}
                        showCounter
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!user?.id) return;
                          toggleFavorite.mutate({ petId: pet.id, userId: user.id, isFavorite: true });
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/95 rounded-full shadow-md"
                      >
                        <Star className="w-4 h-4 fill-landing-mango text-landing-mango" />
                      </button>
                      <AdoptionSourceBadge shelterId={pet.shelter_id} />
                    </div>
                    <div className="p-3 space-y-2">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{pet.name}</h3>
                      <p className="text-xs text-gray-500">{pet.breed} · {pet.age} años</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{pet.location}</span>
                      </div>
                      <Button
                        size="sm"
                        className={`w-full min-h-[36px] text-xs ${landingBtnPrimary}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsPet(pet);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mis-solicitudes' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Solicitudes</h2>
              <p className="text-sm text-gray-500">
                {requestsView === 'sent'
                  ? 'Mascotas que quieres adoptar'
                  : 'Personas interesadas en tus mascotas en adopción'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/70 border border-gray-100">
              <button
                type="button"
                onClick={() => setRequestsView('sent')}
                className={cn(
                  'min-h-[44px] rounded-xl text-sm font-medium transition-all',
                  requestsView === 'sent'
                    ? 'bg-gradient-to-r from-landing-mango to-landing-tropical text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Enviadas
              </button>
              <button
                type="button"
                onClick={() => setRequestsView('received')}
                className={cn(
                  'min-h-[44px] rounded-xl text-sm font-medium transition-all relative',
                  requestsView === 'received'
                    ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Recibidas
                {pendingIncomingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingIncomingCount > 9 ? '9+' : pendingIncomingCount}
                  </span>
                )}
              </button>
            </div>

            {requestsView === 'sent' ? (
              applicationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="animate-pulse">
                        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : myApplications.length === 0 ? (
                <MobileSectionCard className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Sin solicitudes enviadas</h3>
                  <p className="text-sm text-gray-500">
                    Explora el catálogo y solicita adoptar una mascota
                  </p>
                </MobileSectionCard>
              ) : (
                <div className="space-y-3">
                  {myApplications.map((application: any) => {
                    const petImage = getPrimaryPetImageUrl(application.adoption_pets);
                    const cancellable = canCancelApplication(application.status);

                    return (
                      <MobileSectionCard key={application.id}>
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => openAdoptionPetProfile(application.adoption_pets)}
                              className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md bg-gray-100 active:scale-95 transition-transform"
                            >
                              {petImage ? (
                                <img
                                  src={petImage}
                                  alt={application.adoption_pets?.name || 'Mascota'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-landing-aqua/20 to-landing-mint/20 flex items-center justify-center text-2xl">
                                  🐾
                                </div>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 truncate">
                                  {application.adoption_pets?.name || 'Mascota'}
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${getApplicationStatusClass(application.status)}`}>
                                  {getApplicationStatusLabel(application.status)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Dueño: {application.listing_owner_name || 'No disponible'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(application.created_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] text-[11px] border-landing-aqua/30 text-landing-aqua-dark"
                              onClick={() => openAdoptionPetProfile(application.adoption_pets)}
                            >
                              <PawPrint className="w-3.5 h-3.5 mr-1 shrink-0" />
                              Mascota en adopción
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] text-[11px] border-landing-mango/30 text-landing-mango-dark"
                              onClick={() => openListingOwnerProfile(application)}
                            >
                              <User className="w-3.5 h-3.5 mr-1 shrink-0" />
                              Perfil del dueño
                            </Button>
                          </div>

                          <div className="flex flex-col gap-2">
                            {application.status === 'approved' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark hover:bg-landing-aqua/10"
                                onClick={() => setActiveTab('chats')}
                              >
                                <MessagesSquare className="w-4 h-4 mr-2" />
                                Ir a chats
                              </Button>
                            )}

                            {cancellable && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[40px] border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setApplicationToCancel(application)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancelar solicitud
                              </Button>
                            )}
                          </div>
                        </div>
                      </MobileSectionCard>
                    );
                  })}
                </div>
              )
            ) : incomingLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="animate-pulse">
                      <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : incomingApplications.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-landing-aqua/30" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Sin solicitudes recibidas</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Cuando alguien quiera adoptar una mascota que publicaste, la verás aquí
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('mis-publicaciones')}
                  className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark"
                >
                  Ir a mis publicaciones
                </Button>
              </MobileSectionCard>
            ) : (
              <div className="space-y-3">
                {incomingApplications.map((app: any) => (
                  <ApplicantRequestCard
                    key={app.id}
                    app={app}
                    petName={app.adoption_pets?.name}
                    showPetLabel
                    onViewAdoptionPet={() => openAdoptionPetProfile(app.adoption_pets)}
                    onViewApplicantProfile={() => openApplicantProfile(app)}
                    onViewApplicantPet={(pet) => openRegisteredPetProfile(pet, app.applicant_name)}
                    onApprove={() => handleReviewApplication(app.id, 'approved')}
                    onReject={() => handleReviewApplication(app.id, 'rejected')}
                    onOpenChat={() => {
                      setSelectedApplication({ ...app, applicant_id: app.applicant_id });
                      setShowChatModal(true);
                    }}
                    reviewPending={reviewApplication.isPending}
                    getStatusLabel={getApplicationStatusLabel}
                    getStatusClass={getApplicationStatusClass}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Chats abiertos</h2>
                <p className="text-sm text-gray-500">
                  Conversaciones sobre adopciones enviadas y recibidas
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info('Actualizando chats...');
                  loadAdoptionChatRooms(allChatApplications);
                }}
                disabled={loadingChatList}
                className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark shrink-0"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingChatList ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MobileSectionCard className="p-3 text-center">
                <p className="text-xs text-gray-500">Disponibles</p>
                <p className="text-xl font-bold text-gray-900">{activeChatApplications.length}</p>
              </MobileSectionCard>
              <MobileSectionCard className="p-3 text-center">
                <p className="text-xs text-gray-500">Con mensajes</p>
                <p className="text-xl font-bold text-landing-mint-dark">
                  {Object.keys(chatRoomsByApplicationId).filter((id) => chatRoomsByApplicationId[id]?.lastMessage).length}
                </p>
              </MobileSectionCard>
            </div>

            {(applicationsLoading || incomingLoading || loadingChatList) ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <MobileSectionCard key={i} className="p-4">
                    <div className="animate-pulse flex gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </MobileSectionCard>
                ))}
              </div>
            ) : sortedChatApplications.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <MessagesSquare className="h-12 w-12 text-landing-aqua/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin chats abiertos</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Cuando una solicitud sea aprobada, podrás chatear aquí para coordinar la adopción.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRequestsView('sent');
                      setActiveTab('mis-solicitudes');
                    }}
                    className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark"
                  >
                    Ver solicitudes enviadas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRequestsView('received');
                      setActiveTab('mis-solicitudes');
                    }}
                    className="min-h-[44px] border-landing-mango/30 text-landing-mango-dark"
                  >
                    Ver solicitudes recibidas
                  </Button>
                </div>
              </MobileSectionCard>
            ) : (
              <div className="space-y-3">
                {sortedChatApplications.map((application: any) => {
                  const chatRoom = chatRoomsByApplicationId[application.id];
                  const isReceived = application.chatRole === 'received';
                  const listingPet = application.adoption_pets;
                  const petImage = getPrimaryPetImageUrl(listingPet);
                  const cardTitle = listingPet?.name || 'Mascota';
                  const cardImageAlt = listingPet?.name || 'Mascota';

                  return (
                    <MobileSectionCard key={application.id}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
                            {petImage ? (
                              <img
                                src={petImage}
                                alt={cardImageAlt}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🐾
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">
                                  {cardTitle}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                  {isReceived
                                    ? `${application.applicant_name || 'Solicitante'} · quiere adoptar a ${application.adoption_pets?.name || 'tu mascota'}`
                                    : `${application.listing_owner_name || application.adoption_pets?.shelters?.name || 'Dueño'} · publicación`}
                                </p>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${getApplicationStatusClass(application.status)}`}>
                                {getApplicationStatusLabel(application.status)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Solicitud del {new Date(application.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>

                        {chatRoom?.lastMessage ? (
                          <div className="p-3 rounded-xl bg-landing-aqua/5 border border-landing-aqua/10">
                            <p className="text-xs text-gray-600 line-clamp-2">{chatRoom.lastMessage}</p>
                            {chatRoom.lastMessageAt && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatTime(chatRoom.lastMessageAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-xs text-gray-500">
                              {application.status === 'approved'
                                ? isReceived
                                  ? 'Coordina la adopción con el solicitante.'
                                  : 'Coordina la adopción con el dueño o albergue.'
                                : 'Esperando aprobación de la solicitud.'}
                            </p>
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={() => handleOpenChat(application)}
                          className={`w-full min-h-[44px] ${landingBtnPrimary}`}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {chatRoom ? 'Continuar chat' : 'Abrir chat'}
                        </Button>
                      </div>
                    </MobileSectionCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Global Pet Details Modal - Available from all tabs */}
        <AdoptionPetDetails 
          open={!!detailsPet} 
          onClose={() => {
            setDetailsPet(null)
            setApplicationFeedback(null) // Clear feedback when closing modal
          }} 
          pet={detailsPet}
          isFavorite={detailsPet ? isFavorite.has(detailsPet.id) : false}
          onToggleFavorite={() => {
            if (!user?.id || !detailsPet?.id) return
            toggleFavorite.mutate({ petId: detailsPet.id, userId: user.id, isFavorite: isFavorite.has(detailsPet.id) })
          }}
          onApply={() => handleAdoptionApplication(detailsPet?.id || '')}
          applicationFeedback={applicationFeedback}
          hasApplied={hasApplied}
          isOwnListing={!!detailsPet && !!user?.id && detailsPet.owner_id === user.id}
        />

        {/* Adoption Chat Modal */}
        <Dialog
          open={showChatModal}
          onOpenChange={(open) => {
            setShowChatModal(open);
            if (!open) {
              setSelectedApplication(null);
              loadAdoptionChatRooms(allChatApplications);
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="px-4 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-landing-aqua/5 to-landing-mint/5">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-landing-aqua-dark" />
                {selectedApplication && user?.id === selectedApplication.applicant_id
                  ? `Chat sobre ${selectedApplication.adoption_pets?.name || 'adopción'}`
                  : `Chat con ${selectedApplication?.applicant_name || 'solicitante'}`}
              </DialogTitle>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="flex-1 flex flex-col px-4 py-4 min-h-0">
                {/* Application Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    {selectedApplication.adoption_pets?.image_url ? (
                      <img 
                        src={selectedApplication.adoption_pets.image_url} 
                        alt={selectedApplication.adoption_pets.name || 'Mascota'} 
                        className="w-12 h-12 object-cover rounded-lg" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-xl">🐾</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {selectedApplication.adoption_pets?.name || 'Mascota'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Solicitud de adopción • {new Date(selectedApplication.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px]">
                  {loadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <LandingSpinner size="sm" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                      <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">No hay mensajes aún</p>
                      <p className="text-xs mt-1">Comienza la conversación</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id;
                        const isSystemMessage = message.message_type === 'system';

                        if (isSystemMessage) {
                          return (
                            <div key={message.id} className="flex justify-center px-2">
                              <div className="text-center max-w-[90%] px-3 py-2.5 rounded-xl bg-landing-mango/15 border border-landing-mango/30">
                                <p className="text-sm text-gray-800 leading-relaxed">{message.message}</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Sistema • {formatTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        const senderLabel =
                          isOwnMessage
                            ? 'Tú'
                            : selectedApplication.applicant_id === message.sender_id
                              ? selectedApplication.applicant_name || 'Solicitante'
                              : user?.id === selectedApplication.applicant_id
                                ? selectedApplication.listing_owner_name || 'Dueño'
                                : 'Dueño';

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`rounded-2xl p-3 max-w-[85%] shadow-sm ${
                                isOwnMessage
                                  ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white rounded-br-md'
                                  : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                              }`}
                            >
                              <p className={`text-sm leading-relaxed break-words ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                                {message.message}
                              </p>
                              <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-white/80' : 'text-gray-500'}`}>
                                {senderLabel} • {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="Escribe tu mensaje..." 
                    className="flex-1"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sending || loadingChat || !chatRoom}
                  />
                  <Button
                    type="button"
                    className={landingBtnPrimary}
                    onClick={sendMessage}
                    disabled={sending || loadingChat || !chatRoom || !newMessage.trim()}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!applicationToCancel}
          onOpenChange={(open) => !open && setApplicationToCancel(null)}
        >
          <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl border-landing-aqua/15 p-0 overflow-hidden">
            <AlertDialogHeader className="px-4 pt-5 pb-3 text-left bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100">
              <AlertDialogTitle className="text-lg font-bold text-gray-900">
                ¿Cancelar solicitud?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600">
                Se eliminará tu solicitud de adopción para{' '}
                <strong>{applicationToCancel?.adoption_pets?.name || 'esta mascota'}</strong>.
                Podrás volver a solicitarla después si lo deseas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <AlertDialogCancel className="w-full sm:flex-1 min-h-[48px] rounded-xl mt-0">
                Volver
              </AlertDialogCancel>
              <button
                type="button"
                onClick={handleConfirmCancelApplication}
                disabled={cancelApplication.isPending}
                className={cn(
                  'w-full sm:flex-1 min-h-[48px] rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600',
                  'inline-flex items-center justify-center disabled:opacity-60'
                )}
              >
                {cancelApplication.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancelar solicitud
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <OfferPetForAdoptionDialog
          open={showOfferDialog}
          onClose={() => setShowOfferDialog(false)}
          onSuccess={() => setActiveTab('mis-publicaciones')}
          excludedPetIds={activeListedPetIds}
        />

        <AdoptionUserProfileDialog
          open={userProfileDialog.open}
          onClose={() => setUserProfileDialog((prev) => ({ ...prev, open: false }))}
          profile={userProfileDialog.profile}
          pets={userProfileDialog.pets}
          title={userProfileDialog.title}
          subtitle={userProfileDialog.subtitle}
          onViewPet={(pet) => openRegisteredPetProfile(pet, userProfileDialog.profile?.full_name || undefined)}
        />

        <AdoptionRegisteredPetDialog
          open={registeredPetDialog.open}
          onClose={() => setRegisteredPetDialog({ open: false, pet: null })}
          pet={registeredPetDialog.pet}
          ownerName={registeredPetDialog.ownerName}
        />
      </div>
    </DashboardShell>
  );
};

export default Adopcion;
