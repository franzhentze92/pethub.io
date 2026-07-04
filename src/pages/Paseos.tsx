import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Footprints,
  MapPin,
  Search,
  Plus,
  MessageCircle,
  User,
  DollarSign,
  Inbox,
  Send,
  MessagesSquare,
  Clock,
  CreditCard,
  PawPrint,
  Radius,
  Check,
  X,
  Eye,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WalkersMap, { type WalkerMapItem } from '@/components/WalkersMap';
import WalkerRegistrationDialog, { type DogWalkerProfile } from '@/components/WalkerRegistrationDialog';
import WalkerRequestDialog from '@/components/WalkerRequestDialog';
import WalkerDetailsModal from '@/components/WalkerDetailsModal';
import WalkerChatModal, { type DogWalkRequest } from '@/components/WalkerChatModal';
import WalkerRequestReviewModal from '@/components/WalkerRequestReviewModal';
import WalkPickupMap from '@/components/WalkPickupMap';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from '@/components/mobile/MobileTabStrip';
import { MobileSectionCard, MobileFab } from '@/components/mobile/MobileUi';
import { plainPageAccentBtn, plainPageAccentOutlineBtn } from '@/lib/landingTheme';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPrimaryPetImageUrl } from '@/utils/petImages';
import {
  DEFAULT_COVERAGE_RADIUS_KM,
  isWithinWalkerCoverage,
  formatWalkDistance,
  getWalkPickupPoint,
} from '@/utils/dogWalks';
import {
  formatDogWalkPetNames,
  getDogWalkRequestPets,
} from '@/utils/dogWalkPets';
import { updateDogWalkRequestStatus } from '@/utils/dogWalkRequestActions';
import {
  dogWalkSchemaErrorHint,
  isMissingDogWalkSchema,
} from '@/utils/supabaseErrors';

const socialBtn = plainPageAccentBtn.mango;
const socialOutlineBtn = plainPageAccentOutlineBtn.mango;

type ViewMode = 'mapa' | 'lista' | 'mis-solicitudes' | 'ser-paseador' | 'chats';

const viewTabs: MobileTabItem[] = [
  { id: 'mapa', label: 'Mapa', shortLabel: 'Mapa', icon: MapPin, gradientIndex: 0 },
  { id: 'lista', label: 'Lista', shortLabel: 'Lista', icon: Search, gradientIndex: 1 },
  { id: 'mis-solicitudes', label: 'Solicitudes', shortLabel: 'Solic.', icon: Inbox, gradientIndex: 2 },
  { id: 'chats', label: 'Chats', shortLabel: 'Chats', icon: MessagesSquare, gradientIndex: 3 },
  { id: 'ser-paseador', label: 'Ser paseador', shortLabel: 'Paseador', icon: User, gradientIndex: 4 },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  accepted: 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  paid: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  paid: 'Pagada',
  completed: 'Completada',
};

const Paseos: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('mapa');
  const [walkers, setWalkers] = useState<WalkerMapItem[]>([]);
  const [myProfile, setMyProfile] = useState<DogWalkerProfile | null>(null);
  const [requests, setRequests] = useState<DogWalkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedWalker, setSelectedWalker] = useState<WalkerMapItem | null>(null);
  const [showWalkerDetails, setShowWalkerDetails] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DogWalkRequest | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterNearMe, setFilterNearMe] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending'>('pending');
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [reviewRequest, setReviewRequest] = useState<DogWalkRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: walkerData, error: walkerError } = await supabase
        .from('dog_walker_profiles')
        .select('*')
        .eq('is_active', true);

      if (walkerError) throw walkerError;

      const userIds = (walkerData ?? []).map((w) => w.user_id);
      let profilesByUserId: Record<string, { full_name: string; phone: string | null; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone, avatar_url')
          .in('user_id', userIds);
        profilesByUserId = (profiles ?? []).reduce(
          (acc, p) => {
            acc[p.user_id] = p;
            return acc;
          },
          {} as Record<string, { full_name: string; phone: string | null; avatar_url: string | null }>,
        );
      }

      const enrichedWalkers: WalkerMapItem[] = (walkerData ?? [])
        .filter((w) => w.user_id !== user?.id)
        .map((w) => ({
          ...w,
          profile: profilesByUserId[w.user_id],
        }));

      setWalkers(enrichedWalkers);

      if (user?.id) {
        const { data: ownProfile } = await supabase
          .from('dog_walker_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setMyProfile(ownProfile);

        const { data: requestData, error: requestError } = await supabase
          .from('dog_walk_requests')
          .select(`
            *,
            pet:pets(id, name, breed, image_url, pet_images(image_url, display_order)),
            request_pets:dog_walk_request_pets(
              pet:pets(id, name, breed, image_url, pet_images(image_url, display_order))
            )
          `)
          .or(`client_id.eq.${user.id},walker_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (requestError) throw requestError;

        const participantIds = new Set<string>();
        for (const r of requestData ?? []) {
          participantIds.add(r.client_id);
          participantIds.add(r.walker_id);
        }

        let participantProfiles: Record<string, { full_name: string; phone: string | null; address: string | null }> = {};
        if (participantIds.size > 0) {
          const { data: pp } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, phone, address')
            .in('user_id', [...participantIds]);
          participantProfiles = (pp ?? []).reduce(
            (acc, p) => {
              acc[p.user_id] = p;
              return acc;
            },
            {} as Record<string, { full_name: string; phone: string | null; address: string | null }>,
          );
        }

        setRequests(
          (requestData ?? []).map((r) => ({
            ...r,
            client_profile: participantProfiles[r.client_id],
            walker_profile: participantProfiles[r.walker_id],
          })),
        );
      }
    } catch (error) {
      console.error('Error loading paseos data:', error);
      if (isMissingDogWalkSchema(error)) {
        toast.error(dogWalkSchemaErrorHint(), { duration: 8000 });
      } else {
        toast.error('Error al cargar paseadores');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    if (tab && viewTabs.some((t) => t.id === tab)) {
      setViewMode(tab as ViewMode);
    }
  }, [location.state]);

  useEffect(() => {
    const state = location.state as {
      dogWalkRequestId?: string;
      openChat?: boolean;
      tab?: string;
    } | null;
    if (!state?.dogWalkRequestId || loading) return;

    const request = requests.find((item) => item.id === state.dogWalkRequestId);
    if (request) {
      setSelectedRequest(request);
      if (state.openChat) setShowChatModal(true);
    }

    navigate('/paseos', {
      replace: true,
      state: state.tab ? { tab: state.tab } : undefined,
    });
  }, [location.state, requests, loading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('dog_walk_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dog_walk_requests' },
        () => void loadData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadData]);

  const filteredWalkers = useMemo(() => {
    let result = walkers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.profile?.full_name?.toLowerCase().includes(q) ||
          w.location_label.toLowerCase().includes(q) ||
          w.bio?.toLowerCase().includes(q),
      );
    }
    if (filterNearMe && clientLocation) {
      result = result.filter((w) => {
        const radius = w.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM;
        return isWithinWalkerCoverage(
          clientLocation.lat,
          clientLocation.lng,
          w.latitude,
          w.longitude,
          radius,
        );
      });
    }
    return result;
  }, [walkers, searchQuery, filterNearMe, clientLocation]);

  const isWalkerInClientRange = (walker: WalkerMapItem) => {
    if (!clientLocation) return false;
    const radius = walker.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM;
    return isWithinWalkerCoverage(
      clientLocation.lat,
      clientLocation.lng,
      walker.latitude,
      walker.longitude,
      radius,
    );
  };

  const mySentRequests = useMemo(
    () => requests.filter((r) => r.client_id === user?.id),
    [requests, user?.id],
  );

  const myReceivedRequests = useMemo(
    () => requests.filter((r) => r.walker_id === user?.id),
    [requests, user?.id],
  );

  const chatEligibleRequests = useMemo(
    () => requests.filter((r) => !['rejected', 'cancelled'].includes(r.status)),
    [requests],
  );

  const pendingReceivedCount = useMemo(
    () => myReceivedRequests.filter((r) => r.status === 'pending').length,
    [myReceivedRequests],
  );

  const displayTabs = useMemo(
    () =>
      viewTabs.map((tab) =>
        tab.id === 'mis-solicitudes' && pendingReceivedCount > 0
          ? { ...tab, shortLabel: `Solic. (${pendingReceivedCount})`, label: `Solicitudes (${pendingReceivedCount})` }
          : tab,
      ),
    [pendingReceivedCount],
  );

  const filteredReceivedRequests = useMemo(() => {
    if (requestFilter === 'pending') {
      return myReceivedRequests.filter((r) => r.status === 'pending');
    }
    return myReceivedRequests;
  }, [myReceivedRequests, requestFilter]);

  const handleQuickStatusUpdate = async (
    request: DogWalkRequest,
    status: 'accepted' | 'rejected',
  ) => {
    if (!user?.id) return;
    setUpdatingRequestId(request.id);
    try {
      await updateDogWalkRequestStatus(request.id, status, user.id);
      toast.success(status === 'accepted' ? 'Solicitud aceptada' : 'Solicitud rechazada');
      await loadData();
    } catch {
      toast.error('No se pudo actualizar la solicitud');
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const openWalkerDetails = (walker: WalkerMapItem) => {
    setSelectedWalker(walker);
    setShowWalkerDetails(true);
  };

  const openWalkerRequest = (walker: WalkerMapItem) => {
    if (!user) {
      toast.error('Inicia sesión para solicitar un paseo');
      return;
    }
    setSelectedWalker(walker);
    setShowRequestDialog(true);
  };

  const openChat = (request: DogWalkRequest) => {
    setSelectedRequest(request);
    setShowChatModal(true);
  };

  const renderWalkerCard = (walker: WalkerMapItem) => (
    <MobileSectionCard variant="plain" key={walker.id}>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 truncate">
              {walker.profile?.full_name ?? 'Paseador'}
            </h4>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{walker.location_label}</span>
            </p>
          </div>
          <Badge className="shrink-0 text-[10px] bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30">
            <DollarSign className="w-3 h-3" />
            Q.{walker.hourly_rate}/h
          </Badge>
        </div>
        {walker.bio && (
          <p className="text-xs text-gray-600 line-clamp-2">{walker.bio}</p>
        )}
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          {walker.experience_years ? (
            <span>{walker.experience_years} años exp.</span>
          ) : null}
          <span>Máx. {walker.max_dogs} perro{walker.max_dogs !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-0.5">
            <Radius className="w-3 h-3" />
            {walker.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM} km
          </span>
          {clientLocation && isWalkerInClientRange(walker) && (
            <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
              En tu zona
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className={`w-full min-h-[40px] text-xs ${socialBtn}`}
          onClick={() => openWalkerDetails(walker)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Ver perfil
        </Button>
      </div>
    </MobileSectionCard>
  );

  const openRequestReview = (request: DogWalkRequest) => {
    setReviewRequest(request);
    setShowReviewModal(true);
  };

  const walkerLocationForReview =
    myProfile != null
      ? { lat: myProfile.latitude, lng: myProfile.longitude }
      : null;

  const renderRequestCard = (request: DogWalkRequest, role: 'client' | 'walker') => {
    const otherName =
      role === 'client'
        ? request.walker_profile?.full_name?.trim()
        : request.client_profile?.full_name?.trim();
    const displayOtherName = otherName || (role === 'walker' ? 'Cliente' : 'Paseador');
    const requestPets = getDogWalkRequestPets(request);
    const petNames = formatDogWalkPetNames(requestPets);
    const primaryPet = requestPets[0];
    const petImage = primaryPet ? getPrimaryPetImageUrl(primaryPet) : null;
    const isUpdating = updatingRequestId === request.id;
    const pickup = getWalkPickupPoint(request);
    const pickupLabel =
      request.pickup_address?.trim() ||
      request.client_profile?.address?.trim() ||
      null;
    const distanceLabel =
      role === 'walker' && pickup && myProfile
        ? formatWalkDistance(myProfile.latitude, myProfile.longitude, pickup.lat, pickup.lng)
        : null;

    return (
      <MobileSectionCard variant="plain" key={request.id}>
        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex shrink-0">
              {requestPets.length > 1 ? (
                <div className="flex -space-x-2">
                  {requestPets.slice(0, 3).map((pet) => {
                    const img = getPrimaryPetImageUrl(pet);
                    return (
                      <div
                        key={pet.id}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-landing-mango/10 ring-2 ring-white"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-4 h-4 text-landing-mango-dark" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-landing-mango/10 shrink-0">
                  {petImage ? (
                    <img src={petImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-5 h-5 text-landing-mango-dark" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{petNames}</h4>
                  <p className="text-xs text-gray-500 truncate">
                    {role === 'client' ? 'Paseador' : 'Cliente'}: {displayOtherName}
                  </p>
                </div>
                <Badge className={cn('text-[10px] shrink-0 border', STATUS_BADGE[request.status])}>
                  {STATUS_LABEL[request.status] ?? request.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 shrink-0" />
                {request.requested_date}
                {request.requested_time ? ` · ${request.requested_time.slice(0, 5)}` : ''}
                {' · '}
                {request.duration_minutes} min · Q.{request.price.toFixed(2)}
              </p>
            </div>
          </div>
          {request.message && (
            <p className="text-xs text-gray-500 line-clamp-2">{request.message}</p>
          )}

          {role === 'walker' && (pickup || pickupLabel) && (
            <div className="space-y-2">
              {pickup && (
                <WalkPickupMap
                  pickup={pickup}
                  walker={
                    myProfile
                      ? { lat: myProfile.latitude, lng: myProfile.longitude }
                      : undefined
                  }
                  height={140}
                />
              )}
              {pickupLabel && (
                <p className="text-xs text-gray-600 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-landing-mango-dark" />
                  <span className="line-clamp-2">{pickupLabel}</span>
                </p>
              )}
              {distanceLabel && (
                <Badge variant="outline" className="text-[10px]">
                  ~{distanceLabel} de tu zona
                </Badge>
              )}
            </div>
          )}

          {role === 'walker' && request.status === 'pending' ? (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                className={`w-full text-xs ${socialBtn}`}
                onClick={() => openRequestReview(request)}
              >
                <Navigation className="w-3.5 h-3.5 mr-1" />
                Ver mapa y decidir
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`flex-1 text-xs ${socialBtn}`}
                  disabled={isUpdating}
                  onClick={() => handleQuickStatusUpdate(request, 'accepted')}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-red-200 text-red-600"
                  disabled={isUpdating}
                  onClick={() => handleQuickStatusUpdate(request, 'rejected')}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Rechazar
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className={`w-full text-xs ${socialOutlineBtn}`}
                onClick={() => openChat(request)}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                Chat con el cliente
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 text-xs ${socialOutlineBtn}`}
                onClick={() => openChat(request)}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                Chat
              </Button>
              {request.status === 'accepted' && role === 'client' && (
                <Button
                  size="sm"
                  className={`flex-1 text-xs ${socialBtn}`}
                  onClick={() => openChat(request)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Pagar
                </Button>
              )}
            </div>
          )}
        </div>
      </MobileSectionCard>
    );
  };

  return (
    <DashboardShell variant="plain">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Footprints className="w-7 h-7 text-landing-mango-dark" />
            Paseos
          </h1>
          <p className="text-sm text-gray-500">
            Encuentra paseadores cerca de ti o ofréte como uno
          </p>
        </div>
      </div>

      <MobileTabStrip
        tabs={displayTabs}
        activeTab={viewMode}
        onChange={(id) => setViewMode(id as ViewMode)}
        variant="solid"
        accent="mango"
        columns={5}
      />

      <div className="space-y-4 pb-16 sm:pb-0">
        {loading ? (
          viewMode === 'mapa' ? (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          )
        ) : viewMode === 'mapa' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por zona o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {clientLocation && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filterNearMe ? 'default' : 'outline'}
                  className={filterNearMe ? socialBtn : socialOutlineBtn}
                  onClick={() => setFilterNearMe((v) => !v)}
                >
                  Solo paseadores en mi zona
                </Button>
                <p className="text-xs text-gray-500">
                  Punto azul = tú · Círculos = cobertura · Verde = te cubren
                </p>
              </div>
            )}
            <WalkersMap
              walkers={filteredWalkers}
              onWalkerClick={openWalkerDetails}
              clientLocation={clientLocation}
              onClientLocationChange={(lat, lng) => {
                setClientLocation({ lat, lng });
                setFilterNearMe(false);
              }}
              className="h-[420px]"
            />
          </>
        ) : viewMode === 'lista' ? (
          <>
            <Input
              placeholder="Buscar paseadores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {filteredWalkers.length === 0 ? (
              <MobileSectionCard variant="plain" className="p-8 text-center">
                <Footprints className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No hay paseadores en tu zona aún</p>
                <Button
                  className={`mt-4 ${socialBtn}`}
                  size="sm"
                  onClick={() => setViewMode('ser-paseador')}
                >
                  Sé el primero en registrarte
                </Button>
              </MobileSectionCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredWalkers.map(renderWalkerCard)}
              </div>
            )}
          </>
        ) : viewMode === 'mis-solicitudes' ? (
          !user ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <p className="text-sm text-gray-500">Inicia sesión para ver tus solicitudes</p>
            </MobileSectionCard>
          ) : (
            <div className="space-y-6">
              {myProfile && (
                <MobileSectionCard variant="plain" className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Panel de paseador</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pendingReceivedCount > 0
                          ? `${pendingReceivedCount} solicitud${pendingReceivedCount !== 1 ? 'es' : ''} pendiente${pendingReceivedCount !== 1 ? 's' : ''}`
                          : 'Sin solicitudes pendientes'}
                      </p>
                    </div>
                    {pendingReceivedCount > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        {pendingReceivedCount}
                      </Badge>
                    )}
                  </div>
                </MobileSectionCard>
              )}

              {(myProfile || myReceivedRequests.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      Solicitudes recibidas
                      {myReceivedRequests.length > 0 && (
                        <span className="text-gray-400 font-normal">({myReceivedRequests.length})</span>
                      )}
                    </h3>
                    {myReceivedRequests.length > 0 && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={requestFilter === 'pending' ? 'default' : 'outline'}
                          className={cn(
                            'h-7 text-xs px-2',
                            requestFilter === 'pending' ? socialBtn : socialOutlineBtn,
                          )}
                          onClick={() => setRequestFilter('pending')}
                        >
                          Pendientes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={requestFilter === 'all' ? 'default' : 'outline'}
                          className={cn(
                            'h-7 text-xs px-2',
                            requestFilter === 'all' ? socialBtn : socialOutlineBtn,
                          )}
                          onClick={() => setRequestFilter('all')}
                        >
                          Todas
                        </Button>
                      </div>
                    )}
                  </div>
                  {filteredReceivedRequests.length === 0 ? (
                    <MobileSectionCard variant="plain" className="p-6 text-center">
                      <p className="text-sm text-gray-500">
                        {requestFilter === 'pending'
                          ? 'No tienes solicitudes pendientes'
                          : 'Aún no has recibido solicitudes como paseador'}
                      </p>
                    </MobileSectionCard>
                  ) : (
                    filteredReceivedRequests.map((r) => renderRequestCard(r, 'walker'))
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Mis solicitudes enviadas ({mySentRequests.length})
                </h3>
                {mySentRequests.length === 0 ? (
                  <MobileSectionCard variant="plain" className="p-6 text-center">
                    <p className="text-sm text-gray-500">Aún no has solicitado ningún paseo</p>
                    <Button
                      size="sm"
                      className={`mt-3 ${socialBtn}`}
                      onClick={() => setViewMode('mapa')}
                    >
                      Buscar paseadores
                    </Button>
                  </MobileSectionCard>
                ) : (
                  mySentRequests.map((r) => renderRequestCard(r, 'client'))
                )}
              </div>
            </div>
          )
        ) : viewMode === 'chats' ? (
          !user ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <p className="text-sm text-gray-500">Inicia sesión para ver tus chats</p>
            </MobileSectionCard>
          ) : chatEligibleRequests.length === 0 ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <MessagesSquare className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No tienes conversaciones activas</p>
            </MobileSectionCard>
          ) : (
            <div className="space-y-3">
              {chatEligibleRequests.map((request) => {
                const isClient = request.client_id === user.id;
                const otherName = isClient
                  ? request.walker_profile?.full_name
                  : request.client_profile?.full_name;
                return (
                  <MobileSectionCard
                    variant="plain"
                    key={request.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openChat(request)}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-landing-mango/15 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-landing-mango-dark" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{otherName ?? 'Chat'}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {formatDogWalkPetNames(getDogWalkRequestPets(request))} · {STATUS_LABEL[request.status]}
                        </p>
                      </div>
                      <Badge className={cn('text-[10px] shrink-0 border', STATUS_BADGE[request.status])}>
                        {STATUS_LABEL[request.status]}
                      </Badge>
                    </div>
                  </MobileSectionCard>
                );
              })}
            </div>
          )
        ) : (
          /* ser-paseador */
          <div className="space-y-4">
            <MobileSectionCard variant="plain" className="p-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-landing-mango/15 flex items-center justify-center">
                  <Footprints className="w-8 h-8 text-landing-mango-dark" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">
                  {myProfile ? 'Tu perfil de paseador' : '¿Te gustan los perros?'}
                </h3>
                <p className="text-sm text-gray-500">
                  {myProfile
                    ? 'Gestiona tu zona, tarifa y disponibilidad para recibir solicitudes.'
                    : 'Regístrate como paseador y gana dinero cuidando mascotas en tu barrio.'}
                </p>
                {myProfile && (
                  <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Zona:</span>{' '}
                      {myProfile.location_label}
                    </p>
                    <p>
                      <span className="text-gray-500">Tarifa:</span> Q.{myProfile.hourly_rate}/hora
                    </p>
                    <p>
                      <span className="text-gray-500">Cobertura:</span>{' '}
                      {myProfile.coverage_radius_km ?? DEFAULT_COVERAGE_RADIUS_KM} km
                    </p>
                    <p>
                      <span className="text-gray-500">Estado:</span>{' '}
                      {myProfile.is_active ? 'Activo en mapa' : 'Inactivo'}
                    </p>
                    {pendingReceivedCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={`mt-3 ${socialOutlineBtn}`}
                        onClick={() => setViewMode('mis-solicitudes')}
                      >
                        Ver solicitudes pendientes ({pendingReceivedCount})
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  className={socialBtn}
                  onClick={() => setShowRegisterDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {myProfile ? 'Editar perfil' : 'Registrarme como paseador'}
                </Button>
              </div>
            </MobileSectionCard>
          </div>
        )}
      </div>

      {viewMode !== 'ser-paseador' && (
        <MobileFab
          onClick={() => setShowRegisterDialog(true)}
          label={myProfile ? 'Editar perfil' : 'Ser paseador'}
          icon={<Plus className="w-5 h-5" />}
          accent="mango"
        />
      )}

      <WalkerRegistrationDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        existingProfile={myProfile}
        onSaved={() => void loadData()}
      />

      <WalkerDetailsModal
        walker={selectedWalker}
        open={showWalkerDetails}
        onClose={() => {
          setShowWalkerDetails(false);
        }}
        onRequestWalk={openWalkerRequest}
        inClientRange={selectedWalker ? isWalkerInClientRange(selectedWalker) : false}
      />

      <WalkerRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        walker={selectedWalker}
        onRequestSent={() => {
          void loadData();
          setViewMode('mis-solicitudes');
          navigate('/paseos', { state: { tab: 'mis-solicitudes' } });
        }}
      />

      <WalkerChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onStatusChange={() => void loadData()}
      />

      <WalkerRequestReviewModal
        request={reviewRequest}
        open={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewRequest(null);
        }}
        walkerLocation={walkerLocationForReview}
        updating={reviewRequest ? updatingRequestId === reviewRequest.id : false}
        onAccept={(req) => {
          void handleQuickStatusUpdate(req, 'accepted').then(() => {
            setShowReviewModal(false);
            setReviewRequest(null);
          });
        }}
        onReject={(req) => {
          void handleQuickStatusUpdate(req, 'rejected').then(() => {
            setShowReviewModal(false);
            setReviewRequest(null);
          });
        }}
        onOpenChat={(req) => openChat(req)}
      />
    </DashboardShell>
  );
};

export default Paseos;
