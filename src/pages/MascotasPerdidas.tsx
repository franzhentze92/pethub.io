import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Plus, Eye, Phone, Calendar, Star, PawPrint, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ReportLostPetDialog from '@/components/ReportLostPetDialog';
import LostPetDetailsModal from '@/components/LostPetDetailsModal';
import SimpleMap from '@/components/SimpleMap';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from '@/components/mobile/MobileTabStrip';
import { MobileSectionCard, MobileFab } from '@/components/mobile/MobileUi';
import { plainPageAccentBtn, plainPageAccentOutlineBtn } from '@/lib/landingTheme';

const socialBtn = plainPageAccentBtn.mango;
const socialOutlineBtn = plainPageAccentOutlineBtn.mango;
import { Skeleton } from '@/components/ui/skeleton';
import { PetPhotoCarousel } from '@/components/mobile/PetPhotoCarousel';
import { type PetImageRow, type LostPetWithImages, getLostPetImageUrls } from '@/utils/petImages';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { dispatchNotificationsUpdated } from '@/utils/notificationEvents';
import { markLostPetNotificationsRead } from '@/utils/lostPetNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LostPet extends LostPetWithImages {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  color: string;
  last_seen: string;
  last_location: string;
  latitude: number;
  longitude: number;
  description: string;
  contact_phone: string;
  contact_email: string;
  reward?: number;
  owner_id: string;
  created_at: string;
  status: string;
  image_url?: string;
}

const viewTabs: MobileTabItem[] = [
  { id: 'list', label: 'Lista', shortLabel: 'Lista', icon: Search, gradientIndex: 0 },
  { id: 'map', label: 'Mapa', shortLabel: 'Mapa', icon: MapPin, gradientIndex: 1 },
  { id: 'mis-reportes', label: 'Mis reportes', shortLabel: 'Míos', icon: ClipboardList, gradientIndex: 2 },
];

const MascotasPerdidas: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedLostPet, setSelectedLostPet] = useState<LostPet | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'mis-reportes'>('list');
  const [loading, setLoading] = useState(true);

  const activeLostPets = useMemo(
    () => lostPets.filter((pet) => pet.status === 'lost'),
    [lostPets],
  );

  const myReports = useMemo(
    () => (user?.id ? lostPets.filter((pet) => pet.owner_id === user.id) : []),
    [lostPets, user?.id],
  );

  const refreshLostPets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lost_pets')
        .select(`
          *,
          pet_images(image_url, display_order),
          source_pet:pets!pet_id(*, pet_images(image_url, display_order))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLostPets(data || []);
    } catch (error) {
      console.error('Error fetching lost pets:', error);
      setLostPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLostPets();
  }, []);

  useEffect(() => {
    const state = location.state as { tab?: string; lostPetId?: string } | null;
    if (state?.tab && ['list', 'map', 'mis-reportes'].includes(state.tab)) {
      setViewMode(state.tab as 'list' | 'map' | 'mis-reportes');
    }
  }, [location.state]);

  useEffect(() => {
    const state = location.state as { lostPetId?: string; tab?: string } | null;
    if (!state?.lostPetId || loading) return;

    const pet = lostPets.find((item) => item.id === state.lostPetId);
    if (pet) {
      setSelectedLostPet(pet);
    }

    navigate('/mascotas-perdidas', {
      replace: true,
      state: state.tab ? { tab: state.tab } : undefined,
    });
  }, [location.state, lostPets, loading, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('lost_pets_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lost_pets' },
        () => {
          refreshLostPets();
          dispatchNotificationsUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAsFound = async (petId: string) => {
    try {
      const { error } = await supabase
        .from('lost_pets')
        .update({ status: 'found' })
        .eq('id', petId)
        .eq('owner_id', user?.id ?? '');

      if (error) throw error;

      if (user?.id) {
        await markLostPetNotificationsRead(user.id, [`lost-status-${petId}-found`]);
      }

      toast.success('Reporte marcado como encontrado');
      setSelectedLostPet(null);
      await refreshLostPets();
      dispatchNotificationsUpdated();
    } catch (error) {
      console.error('Error marking lost pet as found:', error);
      toast.error('No se pudo actualizar el reporte');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'found':
      case 'recovered':
        return 'bg-landing-mint/15 text-landing-mint-dark border-landing-mint/30';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-landing-mango/15 text-landing-mango-dark border-landing-mango/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'found':
      case 'recovered':
        return 'Encontrada';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Perdida';
    }
  };

  const renderPetCard = (pet: LostPet, showOwnerActions = false) => (
    <MobileSectionCard variant="plain" key={pet.id}>
      <PetPhotoCarousel
        pet={pet}
        images={getLostPetImageUrls(pet)}
        alt={pet.name}
        aspectClassName="aspect-square"
        imageFit="blur-fill"
        className="rounded-t-2xl"
        showCounter
        fallback={
          <div className="w-full h-full bg-landing-mango/15 flex items-center justify-center">
            <PawPrint className="w-10 h-10 text-landing-mango-dark" />
          </div>
        }
      />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{pet.name}</h4>
                <p className="text-xs text-gray-500 truncate">
                  {formatSpeciesLabel(pet.species)} · {pet.breed}
                </p>
              </div>
              <Badge className={cn('text-[10px] shrink-0 border', getStatusBadge(pet.status))}>
                {getStatusText(pet.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-600">
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-landing-mango-dark shrink-0" />
            <span className="truncate">{pet.last_location}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-landing-mango-dark shrink-0" />
            {new Date(pet.last_seen).toLocaleDateString('es-ES')}
          </p>
          {pet.reward ? (
            <p className="flex items-center gap-1.5 font-medium text-landing-mint-dark">
              <Star className="w-3.5 h-3.5 shrink-0" />
              Recompensa: Q.{pet.reward}
            </p>
          ) : null}
        </div>

        {pet.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{pet.description}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[40px] text-xs border-landing-mango/30 text-landing-mango-dark"
            onClick={() => setSelectedLostPet(pet)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Ver detalles
          </Button>
          {showOwnerActions && pet.status === 'lost' && (
            <Button
              size="sm"
              className={`flex-1 min-h-[40px] text-xs ${socialBtn}`}
              onClick={() => handleMarkAsFound(pet.id)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Encontrada
            </Button>
          )}
          {!showOwnerActions && pet.contact_phone && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] min-w-[40px] px-0 border-landing-mango/30 text-landing-mango-dark"
              onClick={() => window.open(`tel:${pet.contact_phone}`)}
              aria-label="Llamar"
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </MobileSectionCard>
  );

  return (
    <DashboardShell variant="plain">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Mascotas perdidas</h1>
          <p className="text-sm text-gray-500">Ayuda a encontrar mascotas o reporta la tuya</p>
        </div>
        <Button
          onClick={() => setShowReportDialog(true)}
          className={`hidden sm:flex shrink-0 min-h-[44px] ${socialBtn}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Reportar
        </Button>
      </div>

      <MobileTabStrip
        tabs={viewTabs}
        activeTab={viewMode}
        onChange={(id) => setViewMode(id as typeof viewMode)}
        variant="solid"
        accent="mango"
        columns={3}
      />

      <div className="space-y-4 pb-16 sm:pb-0">
        {loading ? (
          viewMode === 'map' ? (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          )
        ) : viewMode === 'mis-reportes' ? (
          !user ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <p className="text-sm text-gray-500">Inicia sesión para ver tus reportes</p>
            </MobileSectionCard>
          ) : myReports.length === 0 ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <ClipboardList className="w-14 h-14 mx-auto text-landing-mango/30 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin reportes propios</h3>
              <p className="text-sm text-gray-500 mb-4">
                Cuando reportes una mascota perdida aparecerá aquí
              </p>
              <Button onClick={() => setShowReportDialog(true)} className={`min-h-[44px] ${socialBtn}`}>
                <Plus className="w-4 h-4 mr-2" />
                Reportar mascota
              </Button>
            </MobileSectionCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myReports.map((pet) => renderPetCard(pet, true))}
            </div>
          )
        ) : viewMode === 'list' ? (
          activeLostPets.length === 0 ? (
            <MobileSectionCard variant="plain" className="p-8 text-center">
              <Search className="w-14 h-14 mx-auto text-landing-mango/30 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin reportes activos</h3>
              <p className="text-sm text-gray-500 mb-4">
                Sé el primero en reportar una mascota perdida para ayudar a otros
              </p>
              <Button onClick={() => setShowReportDialog(true)} className={`min-h-[44px] ${socialBtn}`}>
                <Plus className="w-4 h-4 mr-2" />
                Reportar mascota
              </Button>
            </MobileSectionCard>
          ) : (
            <>
              <p className="text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-full w-fit">
                {activeLostPets.length} reporte{activeLostPets.length !== 1 ? 's activos' : ' activo'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeLostPets.map((pet) => renderPetCard(pet))}
              </div>
            </>
          )
        ) : (
          <div className="h-[420px] sm:h-[520px] rounded-2xl overflow-hidden border border-landing-mango/15 shadow-lg">
            <SimpleMap
              lostPets={activeLostPets}
              viewMode="map"
              compact
              onPetClick={(pet) => setSelectedLostPet(pet as LostPet)}
            />
          </div>
        )}
      </div>

      <MobileFab
        onClick={() => setShowReportDialog(true)}
        label="Reportar"
        icon={<Plus size={20} />}
        variant="solid"
        accent="mango"
        className="sm:hidden"
      />

      <ReportLostPetDialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onSuccess={() => {
          refreshLostPets();
          dispatchNotificationsUpdated();
        }}
      />

      <LostPetDetailsModal
        pet={selectedLostPet}
        open={!!selectedLostPet}
        onClose={() => setSelectedLostPet(null)}
        isOwner={!!user && selectedLostPet?.owner_id === user.id}
        onMarkAsFound={
          selectedLostPet?.status === 'lost' ? () => handleMarkAsFound(selectedLostPet.id) : undefined
        }
      />
    </DashboardShell>
  );
};

export default MascotasPerdidas;
