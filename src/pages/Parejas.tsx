import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart, 
  PawPrint, 
  MapPin, 
  Calendar,
  Filter,
  Search,
  Star,
  MessageCircle,
  User,
  Eye,
  X,
  Check,
  Clock,
  Users,
  Send,
  RefreshCw,
  MessagesSquare,
  Inbox,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BreedingFilters from '@/components/BreedingFilters';
import BreedingChatModal from '@/components/BreedingChatModal';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from '@/components/mobile/MobileTabStrip';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { landingBtnPrimary, landingFeatureGradients } from '@/lib/landingTheme';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';
import { Skeleton } from '@/components/ui/skeleton';
import { PetPhotoCarousel, PetPhotoThumbnails } from '@/components/mobile/PetPhotoCarousel';
import { getPrimaryPetImageUrl, getPetImageUrls, type PetImageRow } from '@/utils/petImages';
import {
  formatSpeciesLabel,
  formatGenderLabel,
  formatPetAge,
  formatPetWeight,
  isMaleGender,
} from '@/utils/petLabels';
import { cn } from '@/lib/utils';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import type { CarouselApi } from '@/components/ui/carousel';
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  color: string;
  image_url?: string;
  pet_images?: PetImageRow[] | null;
  owner_id: string;
  available_for_breeding?: boolean;
  owner?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface BreedingMatch {
  id: string;
  pet_id: string;
  potential_partner_id: string;
  owner_id: string;
  partner_owner_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'matched';
  created_at: string;
  updated_at: string;
  pet?: Pet;
  potential_partner?: Pet;
  partner_owner?: {
    id: string;
    full_name: string;
    phone: string;
  };
  requester_owner?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface BreedingChatRoomSummary {
  id: string;
  breeding_match_id: string;
  updated_at: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

const Parejas: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const guidedTour = useBlueprintGuidedTourOptional();
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [myMatches, setMyMatches] = useState<BreedingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    species: 'all',
    breed: 'all',
    gender: 'all',
    age: 'all'
  });
  const [selectedPetDetails, setSelectedPetDetails] = useState<Pet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailCarouselApi, setDetailCarouselApi] = useState<CarouselApi>();
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);
  const [isViewingFromRequest, setIsViewingFromRequest] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState<BreedingMatch[]>([]);
  const [sentRequests, setSentRequests] = useState<BreedingMatch[]>([]);
  const [showPetSelectionModal, setShowPetSelectionModal] = useState(false);
  const [selectedPetForRequest, setSelectedPetForRequest] = useState<Pet | null>(null);
  const [targetPetForRequest, setTargetPetForRequest] = useState<Pet | null>(null);
  const [activeTab, setActiveTab] = useState('pet-tinder');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedMatchForChat, setSelectedMatchForChat] = useState<BreedingMatch | null>(null);
  const [sentRequestsSearch, setSentRequestsSearch] = useState('all');
  const [sentRequestsFilter, setSentRequestsFilter] = useState<string>('all');
  const [receivedRequestsSearch, setReceivedRequestsSearch] = useState('all');
  const [receivedRequestsFilter, setReceivedRequestsFilter] = useState<string>('all');
  const [matchesSearch, setMatchesSearch] = useState('all');
  const [matchesFilter, setMatchesFilter] = useState<string>('all');
  const [chatRoomsByMatchId, setChatRoomsByMatchId] = useState<Record<string, BreedingChatRoomSummary>>({});

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    if (
      tab &&
      ['pet-tinder', 'solicitudes-enviadas', 'solicitudes-recibidas', 'chats'].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, [location.state]);

  useEffect(() => {
    const state = location.state as {
      breedingMatchId?: string;
      openChat?: boolean;
      tab?: string;
    } | null;
    if (!state?.breedingMatchId || loading) return;

    const match = myMatches.find((item) => item.id === state.breedingMatchId);
    if (!match) return;

    if (state.openChat && (match.status === 'accepted' || match.status === 'matched')) {
      setSelectedMatchForChat(match);
      setShowChatModal(true);
    }

    navigate('/parejas', {
      replace: true,
      state: { tab: state.tab ?? activeTab },
    });
  }, [location.state, myMatches, loading, activeTab, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (!detailCarouselApi) return;
    const onSelect = () => setDetailPhotoIndex(detailCarouselApi.selectedScrollSnap());
    onSelect();
    detailCarouselApi.on('select', onSelect);
    return () => {
      detailCarouselApi.off('select', onSelect);
    };
  }, [detailCarouselApi]);

  useEffect(() => {
    if (showDetailsModal) setDetailPhotoIndex(0);
  }, [showDetailsModal, selectedPetDetails?.id]);

  // Subscribe to real-time updates for breeding_matches
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for breeding_matches');
    
    // Create two subscriptions - one for owner_id and one for partner_owner_id
    // (Supabase Realtime doesn't support OR in filters)
    const channel1 = supabase
      .channel('breeding_matches_owner')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'breeding_matches',
          filter: `owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Breeding match changed (owner):', payload);
          loadData();
          dispatchNotificationsUpdated();
        }
      )
      .subscribe();

    const channel2 = supabase
      .channel('breeding_matches_partner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breeding_matches',
          filter: `partner_owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Breeding match changed (partner):', payload);
          loadData();
          dispatchNotificationsUpdated();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [user]);

  // Also poll for updates every 30 seconds as a fallback
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      console.log('Polling for breeding matches updates...');
      loadData();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  // Refresh data when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Page became visible, refreshing data...');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load my pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*, pet_images(image_url, display_order)')
        .eq('owner_id', user?.id);

      if (petsError) throw petsError;
      setMyPets(petsData || []);

      // Load available pets for breeding - SIMPLIFIED: Show all pets from other users marked for breeding
      try {
        console.log('Loading available pets for breeding...');
        console.log('Current user ID:', user?.id);
        
        if (!user?.id) {
          console.log('No user ID, cannot load available pets');
          setAvailablePets([]);
        } else {
          // First, let's check ALL pets to see what we have (this might be blocked by RLS)
          const { data: allPetsCheck, error: allPetsError } = await supabase
            .from('pets')
            .select('id, name, owner_id, available_for_breeding');
          
          console.log('=== DEBUG: All pets in database (may be filtered by RLS) ===');
          console.log('Total pets visible:', allPetsCheck?.length || 0);
          console.log('All pets data:', allPetsCheck);
          console.log('All pets error:', allPetsError);
          
          // Check pets with available_for_breeding = true (all users - may be filtered by RLS)
          const { data: allBreedingPets, error: allBreedingError } = await supabase
            .from('pets')
            .select('id, name, owner_id, available_for_breeding')
            .eq('available_for_breeding', true);
          
          console.log('=== DEBUG: Pets with available_for_breeding = true ===');
          console.log('Count:', allBreedingPets?.length || 0);
          console.log('Data:', allBreedingPets);
          console.log('Error:', allBreedingError);
          
          // Check pets from other users (regardless of breeding status) - This is the key test
          const { data: otherUsersPets, error: otherUsersError } = await supabase
            .from('pets')
            .select('id, name, owner_id, available_for_breeding')
            .neq('owner_id', user.id);
          
          console.log('=== DEBUG: Pets from other users (CRITICAL TEST) ===');
          console.log('Count:', otherUsersPets?.length || 0);
          console.log('Data:', otherUsersPets);
          console.log('Error:', otherUsersError);
          
          if (otherUsersError) {
            console.error('❌ ERROR: Cannot query pets from other users. This is likely an RLS (Row Level Security) issue.');
            console.error('RLS Error details:', otherUsersError);
          }
          
          if ((otherUsersPets?.length || 0) === 0 && !otherUsersError) {
            console.warn('⚠️ WARNING: Query succeeded but returned 0 pets from other users.');
            console.warn('This could mean:');
            console.warn('1. RLS is blocking access to other users pets');
            console.warn('2. There are truly no pets from other users in the database');
            console.warn('3. All pets in the database belong to the current user');
          }
          
          // Now the actual query: Get all pets where available_for_breeding is true AND owner_id is NOT the current user
          let availableData = null;
          let availableError = null;
          
          // Try the standard query first
          const result1 = await supabase
            .from('pets')
            .select('*, pet_images(image_url, display_order)')
            .eq('available_for_breeding', true)
            .neq('owner_id', user.id);
          
          availableData = result1.data;
          availableError = result1.error;
          
          // If no results and no error, it might be RLS blocking
          if ((availableData?.length || 0) === 0 && !availableError) {
            console.log('⚠️ No pets found. Possible RLS issue. Trying alternative query...');
            
            // Try querying all pets first, then filter in JavaScript
            const allPetsResult = await supabase
              .from('pets')
              .select('*, pet_images(image_url, display_order)');
            
            console.log('All pets query result:', allPetsResult.data);
            console.log('All pets query error:', allPetsResult.error);
            
            if (allPetsResult.data) {
              // Filter in JavaScript
              const filtered = allPetsResult.data.filter(pet => 
                pet.available_for_breeding === true && 
                pet.owner_id !== user.id
              );
              console.log('Filtered in JavaScript:', filtered);
              availableData = filtered;
            }
          }

          console.log('=== Query result - Available pets ===');
          console.log('Available pets:', availableData);
          console.log('Count:', availableData?.length || 0);
          console.log('Error:', availableError);

          if (availableError) {
            // Check if it's the column doesn't exist error
            if (availableError.code === '42703') {
              console.log('available_for_breeding column does not exist yet.');
              toast.error('La columna de disponibilidad para reproducción no existe.');
              setAvailablePets([]);
            } else {
              console.error('Error loading available pets:', availableError);
              toast.error(`Error al cargar mascotas: ${availableError.message}`);
              setAvailablePets([]);
            }
          } else {
            console.log('Successfully loaded available pets:', availableData);
            // Filter out any pets that might have owner_id matching current user (double check)
            const filteredData = (availableData || []).filter(pet => pet.owner_id !== user.id);
            console.log('After filtering own pets:', filteredData);
            console.log('Final count:', filteredData.length);
            setAvailablePets(filteredData);
          }
        }
      } catch (error: any) {
        console.error('Error loading available pets:', error);
        toast.error(`Error al cargar mascotas disponibles: ${error.message}`);
        setAvailablePets([]);
      }

      // Load my breeding matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('breeding_matches')
        .select(`
          *,
          pet:pets!breeding_matches_pet_id_fkey(*, pet_images(image_url, display_order)),
          potential_partner:pets!breeding_matches_potential_partner_id_fkey(*, pet_images(image_url, display_order))
        `)
        .or(`owner_id.eq.${user?.id},partner_owner_id.eq.${user?.id}`);

      if (matchesError) {
        console.log('Matches error (table may not exist yet):', matchesError);
        setMyMatches([]);
        setReceivedRequests([]);
        setSentRequests([]);
      } else {
        const allMatches = matchesData || [];
        
        const profileUserIds = [...new Set([
          ...allMatches.map((match) => match.partner_owner_id),
          ...allMatches.map((match) => match.owner_id),
        ])].filter(Boolean);

        let profilesByUserId: Record<string, { full_name: string; phone: string | null }> = {};
        
        if (profileUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, phone')
            .in('user_id', profileUserIds);
          
          if (profilesData) {
            profilesByUserId = profilesData.reduce((acc, profile) => {
              acc[profile.user_id] = profile;
              return acc;
            }, {} as Record<string, { full_name: string; phone: string | null }>);
          }
        }
        
        const enrichedMatches = allMatches.map((match) => ({
          ...match,
          partner_owner: profilesByUserId[match.partner_owner_id]
            ? {
                id: match.partner_owner_id,
                full_name: profilesByUserId[match.partner_owner_id].full_name,
                phone: profilesByUserId[match.partner_owner_id].phone ?? '',
              }
            : undefined,
          requester_owner: profilesByUserId[match.owner_id]
            ? {
                id: match.owner_id,
                full_name: profilesByUserId[match.owner_id].full_name,
                phone: profilesByUserId[match.owner_id].phone ?? '',
              }
            : undefined,
        }));
        
        setMyMatches(enrichedMatches);
        
        // Separate received and sent requests
        const received = enrichedMatches.filter(match => match.partner_owner_id === user?.id);
        const sent = enrichedMatches.filter(match => match.owner_id === user?.id);
        
        setReceivedRequests(received);
        setSentRequests(sent);

        await loadBreedingChatRooms(enrichedMatches);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadBreedingChatRooms = async (matches: BreedingMatch[]) => {
    const chatEligible = matches.filter(
      (match) => match.status === 'accepted' || match.status === 'matched'
    );

    if (chatEligible.length === 0) {
      setChatRoomsByMatchId({});
      return;
    }

    try {
      const matchIds = chatEligible.map((match) => match.id);
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('id, breeding_match_id, updated_at')
        .in('breeding_match_id', matchIds);

      if (roomsError) {
        console.error('Error loading breeding chat rooms:', roomsError);
        setChatRoomsByMatchId({});
        return;
      }

      if (!rooms?.length) {
        setChatRoomsByMatchId({});
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

      const summaryByMatchId = rooms.reduce((acc, room) => {
        const lastMessage = lastMessageByRoomId[room.id];
        acc[room.breeding_match_id] = {
          id: room.id,
          breeding_match_id: room.breeding_match_id,
          updated_at: room.updated_at,
          lastMessage: lastMessage?.message,
          lastMessageAt: lastMessage?.created_at,
        };
        return acc;
      }, {} as Record<string, BreedingChatRoomSummary>);

      setChatRoomsByMatchId(summaryByMatchId);
    } catch (error) {
      console.error('Error loading breeding chat rooms:', error);
      setChatRoomsByMatchId({});
    }
  };

  const handleLike = async (petId: string) => {
    if (!user) {
      toast.error('Debes estar autenticado para enviar solicitudes');
      return;
    }

    const potentialPartner = availablePets.find(p => p.id === petId);
    if (!potentialPartner) {
      toast.error('No se pudo encontrar la mascota');
      return;
    }

    // Check if user has pets available for breeding
    const myBreedingPets = myPets.filter(pet => pet.available_for_breeding);
    if (myBreedingPets.length === 0) {
      toast.error('No tienes mascotas marcadas como disponibles para reproducción');
      return;
    }

    // If only one pet available, use it directly
    if (myBreedingPets.length === 1) {
      await sendLoveRequest(myBreedingPets[0], potentialPartner);
    } else {
      // Show pet selection modal
      setTargetPetForRequest(potentialPartner);
      setShowPetSelectionModal(true);
    }
  };

  const sendLoveRequest = async (myPet: Pet, targetPet: Pet) => {
    try {
      console.log('Sending love request:', { myPet: myPet.name, targetPet: targetPet.name });
      
      const { data, error } = await supabase
        .from('breeding_matches')
        .insert({
          pet_id: myPet.id,
          potential_partner_id: targetPet.id,
          owner_id: user?.id,
          partner_owner_id: targetPet.owner_id,
          status: 'pending'
        })
        .select();

      console.log('Love request insert result:', { data, error });

      if (error) {
        console.error('Error inserting love request:', error);
        if (error.code === '42P01') {
          toast.error('La tabla de parejas no existe. Por favor, ejecuta el esquema de base de datos primero.');
        } else if (error.code === '23505') {
          // Duplicate key error - request already exists
          toast.info('💕 Ya has enviado una solicitud de amor a esta mascota', {
            description: 'Espera la respuesta del dueño.',
            duration: 4000,
          });
        } else {
          throw error;
        }
      } else {
        console.log('Love request sent successfully!');
        toast.success(`💕 Solicitud de amor enviada exitosamente!`, {
          description: `${myPet.name} ha enviado una solicitud de amor a ${targetPet.name}. Espera la respuesta del dueño.`,
          duration: 5000,
        });
        // Remove from available pets to avoid duplicate requests
        setAvailablePets(prev => prev.filter(p => p.id !== targetPet.id));
        // Reload data to update requests
        await loadData();
        dispatchNotificationsUpdated();
        void guidedTour?.notifySectionSaved('breeding');
      }
    } catch (error: any) {
      console.error('Error sending love request:', error);
      toast.error('❌ Error al enviar la solicitud de amor', {
        description: error.message || 'No se pudo enviar la solicitud. Intenta nuevamente o verifica tu conexión.',
        duration: 4000,
      });
    }
  };

  const handleReject = (petId: string) => {
    setAvailablePets(prev => prev.filter(p => p.id !== petId));
    toast.info('Mascota rechazada');
  };

  const handleViewDetails = (pet: Pet) => {
    setSelectedPetDetails(pet);
    setIsViewingFromRequest(false);
    setShowDetailsModal(true);
  };

  const handleViewRequestDetails = (request: BreedingMatch, type: 'received' | 'sent' = 'received') => {
    const targetPet = type === 'received' ? request.pet : request.potential_partner;
    const ownerInfo = type === 'received' ? request.requester_owner : request.partner_owner;

    if (targetPet) {
      const petWithOwner: Pet = {
        ...targetPet,
        owner: ownerInfo
          ? {
              id: ownerInfo.id,
              full_name: ownerInfo.full_name,
              phone: ownerInfo.phone,
            }
          : targetPet.owner,
      };
      setSelectedPetDetails(petWithOwner);
      setIsViewingFromRequest(true);
      setShowDetailsModal(true);
    }
  };

  const handleViewMatchPetDetails = (
    match: BreedingMatch,
    petKey: 'pet' | 'potential_partner'
  ) => {
    const targetPet = petKey === 'pet' ? match.pet : match.potential_partner;
    const ownerInfo = petKey === 'pet' ? match.requester_owner : match.partner_owner;

    if (!targetPet) return;

    const petWithOwner: Pet = {
      ...targetPet,
      owner: ownerInfo
        ? {
            id: ownerInfo.id,
            full_name: ownerInfo.full_name,
            phone: ownerInfo.phone,
          }
        : targetPet.owner,
    };
    setSelectedPetDetails(petWithOwner);
    setIsViewingFromRequest(true);
    setShowDetailsModal(true);
  };


  const handleAcceptMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('breeding_matches')
        .update({ status: 'accepted' })
        .eq('id', matchId);

      if (error) throw error;

      toast.success('💕 Solicitud de amor aceptada!', {
        description: '¡Felicidades! Puedes chatear con el dueño en la pestaña Chats.',
        duration: 5000,
      });
      setActiveTab('chats');
      loadData();
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error accepting match:', error);
      toast.error('❌ Error al aceptar la solicitud', {
        description: 'No se pudo aceptar la solicitud. Intenta nuevamente.',
        duration: 4000,
      });
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('breeding_matches')
        .update({ status: 'rejected' })
        .eq('id', matchId);

      if (error) throw error;

      toast.info('❌ Solicitud de amor rechazada', {
        description: 'La solicitud de amor ha sido rechazada. No te preocupes, hay muchas otras mascotas disponibles.',
        duration: 4000,
      });
      loadData();
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error rejecting match:', error);
      toast.error('Error al rechazar la solicitud');
    }
  };

  const handleOpenChat = (match: BreedingMatch) => {
    setSelectedMatchForChat(match);
    setShowChatModal(true);
  };

  const getOtherOwner = (match: BreedingMatch) => {
    if (!user) return null;
    const isRequester = user.id === match.owner_id;
    return isRequester ? match.partner_owner : match.requester_owner;
  };

  const activeChatMatches = myMatches.filter(
    (match) => match.status === 'accepted' || match.status === 'matched'
  );

  const filteredAndSortedActiveChats = activeChatMatches
    .filter((match) => {
      const matchesPetFilter =
        matchesSearch === 'all' ||
        match.pet?.name === matchesSearch ||
        match.potential_partner?.name === matchesSearch;

      return matchesPetFilter;
    })
    .sort((a, b) => {
      const aRoom = chatRoomsByMatchId[a.id];
      const bRoom = chatRoomsByMatchId[b.id];
      const aDate = new Date(aRoom?.lastMessageAt ?? aRoom?.updated_at ?? a.updated_at).getTime();
      const bDate = new Date(bRoom?.lastMessageAt ?? bRoom?.updated_at ?? b.updated_at).getTime();
      return bDate - aDate;
    });

  // Filter available pets based on filters
  const filteredPets = availablePets.filter(pet => {
    // Always exclude user's own pets (double check)
    if (pet.owner_id === user?.id) {
      console.log('Filtering out own pet:', pet.name, pet.owner_id);
      return false;
    }
    
    // Apply filters
    const matchesSearch = !filters.search || 
                         pet.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         pet.breed?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesSpecies = filters.species === 'all' || pet.species === filters.species;
    const matchesBreed = filters.breed === 'all' || pet.breed === filters.breed;
    const matchesGender = filters.gender === 'all' || pet.gender === filters.gender;
    const matchesAge = filters.age === 'all' || 
                      (filters.age === 'young' && pet.age <= 2) ||
                      (filters.age === 'adult' && pet.age > 2 && pet.age <= 6) ||
                      (filters.age === 'senior' && pet.age > 6);

    return matchesSearch && matchesSpecies && matchesBreed && matchesGender && matchesAge;
  });

  const blueprintBreedingPetId = filteredPets[0]?.id;
  
  console.log('Filtered pets count:', filteredPets.length);
  console.log('Available pets count:', availablePets.length);

  const pendingMatches = myMatches.filter(match => match.status === 'pending');
  const acceptedMatches = myMatches.filter(match => match.status === 'accepted');
  const rejectedMatches = myMatches.filter(match => match.status === 'rejected');

  // Filter and sort sent requests
  const filteredAndSortedSentRequests = sentRequests
    .filter(request => {
      const matchesSearch = sentRequestsSearch === 'all' || 
        request.pet?.name === sentRequestsSearch ||
        request.potential_partner?.name === sentRequestsSearch;
      
      const matchesStatus = sentRequestsFilter === 'all' || request.status === sentRequestsFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter and sort received requests
  const filteredAndSortedReceivedRequests = receivedRequests
    .filter(request => {
      const matchesSearch = receivedRequestsSearch === 'all' || 
        request.pet?.name === receivedRequestsSearch ||
        request.potential_partner?.name === receivedRequestsSearch;
      
      const matchesStatus = receivedRequestsFilter === 'all' || request.status === receivedRequestsFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter and sort matches
  const filteredAndSortedMatches = myMatches
    .filter(match => {
      const matchesSearchFilter = matchesSearch === 'all' || 
        match.pet?.name === matchesSearch ||
        match.potential_partner?.name === matchesSearch;
      
      const matchesStatus = matchesFilter === 'all' || match.status === matchesFilter;
      
      return matchesSearchFilter && matchesStatus;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30';
      case 'accepted': return 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptado';
      case 'matched': return 'Match';
      case 'rejected': return 'Rechazado';
      default: return 'Desconocido';
    }
  };

  const parejasTabs: MobileTabItem[] = [
    { id: 'pet-tinder', label: 'Catálogo', shortLabel: 'Catálogo', icon: Heart, gradientIndex: 1 },
    { id: 'solicitudes-enviadas', label: 'Enviadas', shortLabel: 'Enviadas', icon: Send, gradientIndex: 0 },
    { id: 'solicitudes-recibidas', label: 'Recibidas', shortLabel: 'Recibidas', icon: Inbox, gradientIndex: 2 },
    { id: 'chats', label: 'Chats', shortLabel: 'Chats', icon: MessagesSquare, gradientIndex: 3 },
  ];

  const petCardClass = 'rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden';

  const renderPetInfoCell = (label: string, value: string) => (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-gray-400 leading-none">{label}</p>
      <p className="text-[11px] font-semibold text-gray-800 truncate mt-0.5">{value}</p>
    </div>
  );

  if (loading) {
    return (
      <DashboardShell>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Parejas</h1>
        <p className="text-sm text-gray-500">Encuentra la pareja perfecta para tu mascota</p>
      </div>

      <MobileTabStrip tabs={parejasTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="space-y-4">
        {activeTab === 'pet-tinder' && (
          <div className="space-y-4">
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
                {filteredPets.length} disponible{filteredPets.length !== 1 ? 's' : ''}
              </span>
            </div>

            {showFilters && (
              <BreedingFilters
                onFiltersChange={setFilters}
                availableBreeds={Array.from(new Set(availablePets.map(p => p.breed).filter(Boolean)))}
              />
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredPets.map((pet, index) => {
                const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
                return (
                  <div key={pet.id} className={petCardClass}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {getPrimaryPetImageUrl(pet) ? (
                        <img
                          src={getPrimaryPetImageUrl(pet)!}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <PawPrint className="w-10 h-10 text-white/80" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm',
                            !pet.gender
                              ? 'bg-white/95 text-gray-600'
                              : isMaleGender(pet.gender)
                                ? 'bg-sky-100/95 text-sky-800'
                                : 'bg-pink-100/95 text-pink-800',
                          )}
                        >
                          {formatGenderLabel(pet.gender)}
                        </span>
                        <span className="text-[10px] font-semibold bg-white/95 text-gray-800 px-2 py-0.5 rounded-full shadow-sm shrink-0">
                          {formatPetAge(pet.age)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{pet.name}</h3>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-xl bg-gray-50/80 border border-gray-100 p-2">
                        {renderPetInfoCell('Especie', formatSpeciesLabel(pet.species))}
                        {renderPetInfoCell('Peso', formatPetWeight(pet.weight))}
                        <div className="col-span-2">
                          {renderPetInfoCell('Raza', pet.breed || '—')}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(pet)}
                          className="w-full min-h-[36px] text-xs border-landing-aqua/30 text-landing-aqua-dark"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ver detalles
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleLike(pet.id)}
                          data-blueprint-guided={
                            pet.id === blueprintBreedingPetId ? 'send-breeding-request' : undefined
                          }
                          className={`w-full min-h-[36px] text-xs ${landingBtnPrimary}`}
                        >
                          <Heart className="w-3.5 h-3.5 mr-1" />
                          Solicitar amor
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPets.length === 0 && (
              <MobileSectionCard className="p-8 text-center">
                <Heart className="h-12 w-12 text-landing-aqua/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {availablePets.length === 0
                    ? 'No hay mascotas disponibles'
                    : 'Sin resultados'}
                </h3>
                <p className="text-sm text-gray-500">
                  {availablePets.length === 0
                    ? 'Aún no hay mascotas de otros usuarios marcadas para reproducción.'
                    : 'Prueba ajustando los filtros de búsqueda.'}
                </p>
              </MobileSectionCard>
            )}
          </div>
        )}

        {activeTab === 'solicitudes-recibidas' && (
          <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('Actualizando solicitudes...');
                loadData();
              }}
              className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{receivedRequests.length}</p>
            </MobileSectionCard>
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-xl font-bold text-landing-mango-dark">
                {receivedRequests.filter(r => r.status === 'pending').length}
              </p>
            </MobileSectionCard>
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Aceptadas</p>
              <p className="text-xl font-bold text-landing-mint-dark">
                {receivedRequests.filter(r => r.status === 'accepted').length}
              </p>
            </MobileSectionCard>
          </div>

          <MobileSectionCard className="p-4 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-landing-aqua-dark" />
              Buscar y filtrar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="received-pet-filter">Filtrar por mascota</Label>
                  <Select value={receivedRequestsSearch} onValueChange={setReceivedRequestsSearch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mascota..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las mascotas</SelectItem>
                      {Array.from(new Set([
                        ...receivedRequests.map(r => r.pet?.name).filter(Boolean),
                        ...receivedRequests.map(r => r.potential_partner?.name).filter(Boolean)
                      ])).map(petName => (
                        <SelectItem key={petName} value={petName}>{petName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="received-status-filter">Filtrar por estado</Label>
                  <Select value={receivedRequestsFilter} onValueChange={setReceivedRequestsFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="accepted">Aceptadas</SelectItem>
                      <SelectItem value="rejected">Rechazadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
          </MobileSectionCard>

          <div className="space-y-3">
            {receivedRequests.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-landing-aqua/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No hay solicitudes recibidas</h3>
                <p className="text-sm text-gray-500">
                  Las solicitudes que otros envíen para tus mascotas aparecerán aquí.
                </p>
              </MobileSectionCard>
            ) : filteredAndSortedReceivedRequests.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
                <p className="text-sm text-gray-500">No hay solicitudes que coincidan con los filtros.</p>
              </MobileSectionCard>
            ) : (
              filteredAndSortedReceivedRequests.map((request) => (
                <MobileSectionCard key={request.id}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Pet Image - Show the pet that sent the request (other user's pet) */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {request.pet?.image_url ? (
                          <img
                            src={request.pet.image_url}
                            alt={request.pet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Request Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Solicitud para {request.potential_partner?.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              De {request.pet?.name} ({request.pet?.breed})
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Enviado el {new Date(request.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          
                          <Badge className={getStatusColor(request.status)}>
                            {request.status === 'pending' && 'Pendiente'}
                            {request.status === 'accepted' && 'Aceptada'}
                            {request.status === 'rejected' && 'Rechazada'}
                          </Badge>
                        </div>

                        {/* Owner Info - show who sent the request */}
                        {request.requester_owner && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">
                              Dueño: {request.requester_owner.full_name}
                            </p>
                            {request.requester_owner.phone && (
                              <p className="text-sm text-gray-600">
                                Teléfono: {request.requester_owner.phone}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {request.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewRequestDetails(request)}
                              className="border-landing-aqua/30 text-landing-aqua-dark"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver detalles
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAcceptMatch(request.id)}
                                className={landingBtnPrimary}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Aceptar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectMatch(request.id)}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        )}

                        {request.status === 'accepted' && (
                          <div className="mt-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenChat(request)}
                              className="border-landing-aqua/30 text-landing-aqua-dark"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Contactar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileSectionCard>
              ))
            )}
          </div>
          </div>
        )}

        {activeTab === 'solicitudes-enviadas' && (
          <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('Actualizando solicitudes...');
                loadData();
              }}
              className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{sentRequests.length}</p>
            </MobileSectionCard>
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-xl font-bold text-landing-mango-dark">
                {sentRequests.filter(r => r.status === 'pending').length}
              </p>
            </MobileSectionCard>
            <MobileSectionCard className="p-3 text-center">
              <p className="text-xs text-gray-500">Aceptadas</p>
              <p className="text-xl font-bold text-landing-mint-dark">
                {sentRequests.filter(r => r.status === 'accepted').length}
              </p>
            </MobileSectionCard>
          </div>

          <MobileSectionCard className="p-4 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-landing-aqua-dark" />
              Buscar y filtrar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sent-pet-filter">Filtrar por mascota</Label>
                  <Select value={sentRequestsSearch} onValueChange={setSentRequestsSearch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mascota..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las mascotas</SelectItem>
                      {Array.from(new Set([
                        ...sentRequests.map(r => r.pet?.name).filter(Boolean),
                        ...sentRequests.map(r => r.potential_partner?.name).filter(Boolean)
                      ])).map(petName => (
                        <SelectItem key={petName} value={petName}>{petName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sent-status-filter">Filtrar por estado</Label>
                  <Select value={sentRequestsFilter} onValueChange={setSentRequestsFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="accepted">Aceptadas</SelectItem>
                      <SelectItem value="rejected">Rechazadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
          </MobileSectionCard>

          <div className="space-y-3">
            {sentRequests.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <Send className="h-12 w-12 text-landing-aqua/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No has enviado solicitudes</h3>
                <p className="text-sm text-gray-500">Las solicitudes que envíes aparecerán aquí.</p>
              </MobileSectionCard>
            ) : filteredAndSortedSentRequests.length === 0 ? (
              <MobileSectionCard className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
                <p className="text-sm text-gray-500">No hay solicitudes que coincidan con los filtros.</p>
              </MobileSectionCard>
            ) : (
              filteredAndSortedSentRequests.map((request) => (
                <MobileSectionCard key={request.id}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Target Pet Image (the pet we sent the request to) */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {request.potential_partner?.image_url ? (
                          <img
                            src={request.potential_partner.image_url}
                            alt={request.potential_partner.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Request Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Solicitud de {request.pet?.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Para {request.potential_partner?.name} ({request.potential_partner?.breed})
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Enviado el {new Date(request.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          
                          <Badge className={getStatusColor(request.status)}>
                            {request.status === 'pending' && 'Pendiente'}
                            {request.status === 'accepted' && 'Aceptada'}
                            {request.status === 'rejected' && 'Rechazada'}
                          </Badge>
                        </div>

                        {/* Partner Owner Info */}
                        {request.partner_owner && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">
                              Dueño: {request.partner_owner.full_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Teléfono: {request.partner_owner.phone}
                            </p>
                          </div>
                        )}

                        {/* Status Message */}
                        {request.status === 'pending' && (
                          <div className="mt-3 p-3 bg-landing-mango/10 border border-landing-mango/20 rounded-lg">
                            <p className="text-sm text-landing-mango-dark">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Esperando respuesta del dueño...
                            </p>
                          </div>
                        )}

                        {request.status === 'accepted' && (
                          <>
                            <div className="mt-3 p-3 bg-landing-mint/10 border border-landing-mint/20 rounded-lg">
                              <p className="text-sm text-landing-mint-dark">
                                <Check className="w-4 h-4 inline mr-1" />
                                ¡Tu solicitud fue aceptada! Puedes contactar al dueño.
                              </p>
                            </div>
                            <div className="mt-3">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenChat(request)}
                                className="border-landing-aqua/30 text-landing-aqua-dark"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Contactar
                              </Button>
                            </div>
                          </>
                        )}

                        {request.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                              <X className="w-4 h-4 inline mr-1" />
                              Tu solicitud fue rechazada.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileSectionCard>
              ))
            )}
          </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Chats abiertos</h2>
                <p className="text-sm text-gray-500">
                  Conversaciones con matches aceptados
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info('Actualizando chats...');
                  loadData();
                }}
                className="min-h-[40px] border-landing-aqua/30 text-landing-aqua-dark shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MobileSectionCard className="p-3 text-center">
                <p className="text-xs text-gray-500">Matches</p>
                <p className="text-xl font-bold text-gray-900">{activeChatMatches.length}</p>
              </MobileSectionCard>
              <MobileSectionCard className="p-3 text-center">
                <p className="text-xs text-gray-500">Con mensajes</p>
                <p className="text-xl font-bold text-landing-mint-dark">
                  {Object.keys(chatRoomsByMatchId).length}
                </p>
              </MobileSectionCard>
            </div>

            {activeChatMatches.length > 1 && (
              <MobileSectionCard className="p-4 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-landing-aqua-dark" />
                  Filtrar por mascota
                </h3>
                <Select value={matchesSearch} onValueChange={setMatchesSearch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mascota..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las mascotas</SelectItem>
                    {Array.from(
                      new Set([
                        ...activeChatMatches.map((m) => m.pet?.name).filter(Boolean),
                        ...activeChatMatches.map((m) => m.potential_partner?.name).filter(Boolean),
                      ])
                    ).map((petName) => (
                      <SelectItem key={petName} value={petName!}>
                        {petName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MobileSectionCard>
            )}

            <div className="space-y-3">
              {activeChatMatches.length === 0 ? (
                <MobileSectionCard className="p-8 text-center">
                  <MessagesSquare className="h-12 w-12 text-landing-aqua/30 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Sin chats abiertos</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Cuando aceptes o te acepten una solicitud, podrás chatear aquí para coordinar la reproducción.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('solicitudes-recibidas')}
                    className="min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark"
                  >
                    Ver solicitudes recibidas
                  </Button>
                </MobileSectionCard>
              ) : filteredAndSortedActiveChats.length === 0 ? (
                <MobileSectionCard className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
                  <p className="text-sm text-gray-500">No hay chats que coincidan con el filtro.</p>
                </MobileSectionCard>
              ) : (
                filteredAndSortedActiveChats.map((match) => {
                  const otherOwner = getOtherOwner(match);
                  const chatRoom = chatRoomsByMatchId[match.id];
                  const petImage = getPrimaryPetImageUrl(match.pet);
                  const partnerImage = getPrimaryPetImageUrl(match.potential_partner);

                  return (
                    <MobileSectionCard key={match.id}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={`Ver perfil de ${match.pet?.name}`}
                              onClick={() => handleViewMatchPetDetails(match, 'pet')}
                              className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm active:scale-95 transition-transform"
                            >
                              {petImage ? (
                                <img src={petImage} alt={match.pet?.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <PawPrint className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </button>
                            <Heart className="w-3.5 h-3.5 text-landing-mango shrink-0" />
                            <button
                              type="button"
                              aria-label={`Ver perfil de ${match.potential_partner?.name}`}
                              onClick={() => handleViewMatchPetDetails(match, 'potential_partner')}
                              className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm active:scale-95 transition-transform"
                            >
                              {partnerImage ? (
                                <img
                                  src={partnerImage}
                                  alt={match.potential_partner?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <PawPrint className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">
                                  {match.pet?.name} & {match.potential_partner?.name}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                  Con {otherOwner?.full_name ?? 'dueño'}
                                </p>
                              </div>
                              <Badge className="bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30 text-[10px] shrink-0">
                                {getStatusLabel(match.status)}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-gray-400 mt-1">
                              Match el {new Date(match.updated_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>

                        {chatRoom?.lastMessage ? (
                          <div className="p-3 rounded-xl bg-landing-aqua/5 border border-landing-aqua/10">
                            <p className="text-xs text-gray-600 line-clamp-2">{chatRoom.lastMessage}</p>
                            {chatRoom.lastMessageAt && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(chatRoom.lastMessageAt).toLocaleString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-xs text-gray-500">
                              Aún no hay mensajes. Inicia la conversación para coordinar la reproducción.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMatchPetDetails(match, 'pet')}
                            className="min-h-[40px] text-xs border-landing-aqua/30 text-landing-aqua-dark"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 shrink-0" />
                            <span className="truncate">{match.pet?.name}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMatchPetDetails(match, 'potential_partner')}
                            className="min-h-[40px] text-xs border-landing-aqua/30 text-landing-aqua-dark"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 shrink-0" />
                            <span className="truncate">{match.potential_partner?.name}</span>
                          </Button>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleOpenChat(match)}
                          className={`w-full min-h-[44px] ${landingBtnPrimary}`}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {chatRoom ? 'Continuar chat' : 'Abrir chat'}
                        </Button>
                      </div>
                    </MobileSectionCard>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* Pet Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent
          className={cn(
            'flex flex-col gap-0 p-0 overflow-hidden',
            'w-[calc(100vw-0.5rem)] max-w-lg',
            'max-h-[96dvh] sm:max-h-[92dvh]',
            'rounded-2xl border-landing-aqua/15'
          )}
        >
          <DialogHeader className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100">
            <DialogTitle className="flex items-center text-gray-900 text-lg">
              <Heart className="w-5 h-5 mr-2 text-landing-aqua-dark shrink-0" />
              Detalles de {selectedPetDetails?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedPetDetails && (() => {
            const detailImages = getPetImageUrls(selectedPetDetails);
            return (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
                  <div>
                    <PetPhotoCarousel
                      pet={selectedPetDetails}
                      alt={selectedPetDetails.name}
                      aspectClassName="aspect-[5/3] max-h-[160px]"
                      showCounter
                      showArrows={detailImages.length > 1}
                      showDots={detailImages.length > 1}
                      setApi={setDetailCarouselApi}
                      className="rounded-xl"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-xl">
                          <PawPrint className="w-10 h-10 text-gray-400" />
                        </div>
                      }
                    />
                    {detailImages.length > 1 && (
                      <div className="mt-3 space-y-2">
                        <PetPhotoThumbnails
                          images={detailImages}
                          current={detailPhotoIndex}
                          onSelect={(index) => detailCarouselApi?.scrollTo(index)}
                          alt={selectedPetDetails.name}
                        />
                        <p className="text-xs text-gray-400 text-center">
                          Toca las miniaturas o usa las flechas para cambiar de foto
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Nombre</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedPetDetails.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Edad</Label>
                      <p className="text-sm font-semibold text-gray-900">{formatPetAge(selectedPetDetails.age)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Especie</Label>
                      <p className="text-sm font-semibold text-gray-900">{formatSpeciesLabel(selectedPetDetails.species)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Peso</Label>
                      <p className="text-sm font-semibold text-gray-900">{formatPetWeight(selectedPetDetails.weight)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Raza</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedPetDetails.breed}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Género</Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-0.5',
                          isMaleGender(selectedPetDetails.gender)
                            ? 'border-sky-200 text-sky-800 bg-sky-50'
                            : selectedPetDetails.gender
                              ? 'border-pink-200 text-pink-800 bg-pink-50'
                              : '',
                        )}
                      >
                        {formatGenderLabel(selectedPetDetails.gender)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Color</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedPetDetails.color}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Reproducción</Label>
                      <Badge className={selectedPetDetails.available_for_breeding ? 'bg-landing-mint/15 text-landing-mint-dark mt-0.5' : 'bg-red-50 text-red-700 mt-0.5'}>
                        {selectedPetDetails.available_for_breeding ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                  </div>

                  {selectedPetDetails.owner && (
                    <div className="rounded-xl bg-landing-aqua/5 border border-landing-aqua/15 p-3 space-y-2">
                      <h4 className="text-sm font-bold text-gray-900">Dueño</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500">Nombre</Label>
                          <p className="text-sm">{selectedPetDetails.owner.full_name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Teléfono</Label>
                          <p className="text-sm">{selectedPetDetails.owner.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 p-4 border-t border-gray-100 bg-white/95 flex gap-2">
                  {!isViewingFromRequest && (
                    <Button
                      type="button"
                      onClick={() => handleLike(selectedPetDetails.id)}
                      className={`flex-1 min-h-[48px] ${landingBtnPrimary}`}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Solicitar amor
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setIsViewingFromRequest(false);
                    }}
                    className={cn('min-h-[48px] border-landing-aqua/30', isViewingFromRequest ? 'flex-1' : '')}
                  >
                    Cerrar
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Pet Selection Modal */}
      <Dialog open={showPetSelectionModal} onOpenChange={setShowPetSelectionModal}>
        <DialogContent className="max-w-md rounded-2xl border-landing-aqua/15">
          <DialogHeader>
            <DialogTitle className="flex items-center text-gray-900">
              <Heart className="w-5 h-5 mr-2 text-landing-aqua-dark" />
              Seleccionar tu mascota
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona cuál de tus mascotas enviará la solicitud de amor a {targetPetForRequest?.name}:
            </p>
            
            <div className="space-y-3">
              {myPets.filter(pet => pet.available_for_breeding).map((pet) => (
                <div
                  key={pet.id}
                  className={`p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedPetForRequest?.id === pet.id
                      ? 'border-landing-aqua bg-landing-aqua/10'
                      : 'border-gray-200 hover:border-landing-aqua/30'
                  }`}
                  onClick={() => setSelectedPetForRequest(pet)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {pet.image_url ? (
                        <img
                          src={pet.image_url}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{pet.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatSpeciesLabel(pet.species)} · {pet.breed || '—'} · {formatPetAge(pet.age)} · {formatPetWeight(pet.weight)} · {formatGenderLabel(pet.gender)}
                      </p>
                    </div>
                    {selectedPetForRequest?.id === pet.id && (
                      <Check className="w-5 h-5 text-landing-aqua-dark" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={async () => {
                  if (selectedPetForRequest && targetPetForRequest) {
                    await sendLoveRequest(selectedPetForRequest, targetPetForRequest);
                    setShowPetSelectionModal(false);
                    setSelectedPetForRequest(null);
                    setTargetPetForRequest(null);
                  }
                }}
                disabled={!selectedPetForRequest}
                className={`flex-1 min-h-[44px] ${landingBtnPrimary}`}
              >
                <Heart className="w-4 h-4 mr-2" />
                Enviar solicitud
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPetSelectionModal(false);
                  setSelectedPetForRequest(null);
                  setTargetPetForRequest(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breeding Chat Modal */}
      <BreedingChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setSelectedMatchForChat(null);
          loadBreedingChatRooms(myMatches);
          dispatchNotificationsUpdated();
        }}
        breedingMatch={selectedMatchForChat}
      />
    </DashboardShell>
  );
};

export default Parejas;
