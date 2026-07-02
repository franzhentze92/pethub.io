import React, { useState, useEffect } from 'react';
import { User, Dog, Edit, Plus, Trash2, Calendar, MapPin, Home, LogOut, CreditCard, Eye, Shield, Sparkles, ChevronRight, Bell } from 'lucide-react';
import { isPetHubAdminUser } from '@/lib/pethubAdminAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useUserProfile, usePets } from '@/hooks/useSettings';
import EditProfileModal from './EditProfileModal';
import PetModal from './PetModal';
import DeletePetDialog from './DeletePetDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AddressesAndCardsTab from './AddressesAndCardsTab';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip } from './mobile/MobileTabStrip';
import { MobileInfoRow, MobileSectionCard, MobileFab } from './mobile/MobileUi';
import { landingBtnPrimary, landingFeatureGradients } from '@/lib/landingTheme';
import { getPetImageUrls } from '@/utils/petImages';
import { PetAvatar } from '@/components/PetAvatar';
import { formatSpeciesLabel } from '@/utils/petLabels';
import PetDetailsModal from './PetDetailsModal';
import NotificationPreferencesSettings from './NotificationPreferencesSettings';
import { useBlueprintGuidedTourOptional } from '@/contexts/BlueprintGuidedTourContext';

const Ajustes: React.FC = () => {
  const location = useLocation();
  const initialTab = (location.state as { activeTab?: string } | null)?.activeTab;
  const [activeTab, setActiveTab] = useState(initialTab || 'perfil');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [deletePetDialog, setDeletePetDialog] = useState<{ open: boolean; pet: any }>({ open: false, pet: null });
  const [viewingPet, setViewingPet] = useState<any>(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: userProfile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: pets, isLoading: petsLoading } = usePets(user?.id);
  const guidedTour = useBlueprintGuidedTourOptional();

  useEffect(() => {
    const tab = (location.state as { activeTab?: string } | null)?.activeTab;
    if (tab) setActiveTab(tab);
  }, [location.state]);

  useEffect(() => {
    if (guidedTour?.isActive && guidedTour.currentStep?.ajustesTab) {
      setActiveTab(guidedTour.currentStep.ajustesTab);
    }
  }, [guidedTour?.isActive, guidedTour?.currentStep?.ajustesTab]);

  const tabs = [
    { id: 'perfil', label: 'Mi Perfil', shortLabel: 'Perfil', icon: User, gradientIndex: 0 },
    { id: 'perros', label: 'Mis Mascotas', shortLabel: 'Mascotas', icon: Dog, gradientIndex: 1 },
    { id: 'direcciones', label: 'Direcciones', shortLabel: 'Direcciones', icon: MapPin, gradientIndex: 2 },
    { id: 'tarjetas', label: 'Tarjetas', shortLabel: 'Tarjetas', icon: CreditCard, gradientIndex: 3 },
    { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'Avisos', icon: Bell, gradientIndex: 4 },
  ];

  const handleEditProfile = () => {
    if (userProfile) setEditProfileOpen(true);
  };

  const handleAddPet = () => {
    setEditingPet(null);
    setPetModalOpen(true);
  };

  const handleEditPet = (pet: any) => {
    setEditingPet(pet);
    setPetModalOpen(true);
  };

  const handleDeletePet = (pet: any) => {
    setDeletePetDialog({ open: true, pet });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_new_user');
      toast.success('Sesión cerrada');
    }
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const initials = (userProfile?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardShell>
      {/* Mobile-first page title */}
      <div className="space-y-1 mt-1">
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-sm text-gray-500">Perfil, mascotas, pagos y notificaciones</p>
      </div>

      <MobileTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <MobileSectionCard className="p-4">
        <button
          type="button"
          onClick={() => navigate('/pet-hub-blueprint')}
          className="w-full flex items-center gap-3 text-left group"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-landing-mango to-landing-tropical text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-landing-aqua-dark transition-colors">
              PetHub Blueprint
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Conecta tu ecosistema y guía a Atis paso a paso
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-landing-aqua-dark transition-colors" />
        </button>
      </MobileSectionCard>

      {/* ——— Perfil ——— */}
      {activeTab === 'perfil' && (
        <div className="space-y-4">
          <MobileSectionCard>
            {profileLoading ? (
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <Skeleton className="h-6 w-32 mt-3" />
                  <Skeleton className="h-4 w-40 mt-2" />
                </div>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="px-5 pt-6 pb-4 text-center bg-gradient-to-b from-landing-aqua/10 to-transparent">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt="Perfil"
                      className="w-24 h-24 mx-auto rounded-full object-cover ring-4 ring-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-landing-aqua to-landing-mango flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white">
                      {initials}
                    </div>
                  )}
                  <h2 className="mt-3 text-xl font-bold text-gray-900">
                    {userProfile?.full_name || 'Usuario'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Miembro desde {userProfile?.created_at ? formatDate(userProfile.created_at) : '—'}
                  </p>
                </div>

                <div className="px-5 pb-2">
                  <MobileInfoRow label="Email" value={user?.email || '—'} />
                  <MobileInfoRow label="Teléfono" value={userProfile?.phone || 'No especificado'} />
                  <MobileInfoRow label="Dirección" value={userProfile?.address || 'No especificada'} last />
                </div>

                <div className="p-4 pt-2 border-t border-gray-100">
                  <Button
                    data-blueprint-guided="edit-profile"
                    onClick={handleEditProfile}
                    disabled={profileLoading}
                    className={`w-full min-h-[48px] ${landingBtnPrimary}`}
                  >
                    <Edit size={18} className="mr-2" />
                    Editar perfil
                  </Button>
                </div>
              </>
            )}
          </MobileSectionCard>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <MobileSectionCard className="p-4 text-center">
              <Dog className="w-6 h-6 mx-auto text-landing-mint-dark mb-1" />
              <p className="text-2xl font-bold text-gray-900">{pets?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Mascotas</p>
            </MobileSectionCard>
            <MobileSectionCard className="p-4 text-center">
              <MapPin className="w-6 h-6 mx-auto text-landing-mango-dark mb-1" />
              <p className="text-sm font-semibold text-gray-900 mt-1">Direcciones</p>
              <button
                type="button"
                onClick={() => setActiveTab('direcciones')}
                className="text-xs text-landing-aqua-dark font-medium mt-1"
              >
                Gestionar →
              </button>
            </MobileSectionCard>
            <MobileSectionCard className="p-4 text-center">
              <CreditCard className="w-6 h-6 mx-auto text-landing-aqua-dark mb-1" />
              <p className="text-sm font-semibold text-gray-900 mt-1">Tarjetas</p>
              <button
                type="button"
                onClick={() => setActiveTab('tarjetas')}
                className="text-xs text-landing-aqua-dark font-medium mt-1"
              >
                Gestionar →
              </button>
            </MobileSectionCard>
          </div>

          {isPetHubAdminUser(user?.email) && (
            <MobileSectionCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-landing-aqua to-landing-mint text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">PetHub Admin</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Consulta datos de productos, órdenes, usuarios y más.
                  </p>
                  <Button
                    type="button"
                    onClick={() => navigate('/pethub-admin')}
                    className={`mt-3 min-h-[44px] ${landingBtnPrimary}`}
                  >
                    Abrir panel
                  </Button>
                </div>
              </div>
            </MobileSectionCard>
          )}

          <MobileSectionCard className="p-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              className="w-full min-h-[48px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={18} className="mr-2" />
              Cerrar sesión
            </Button>
          </MobileSectionCard>
        </div>
      )}

      {/* ——— Notificaciones ——— */}
      {activeTab === 'notificaciones' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Notificaciones</h2>
            <p className="text-sm text-gray-500">
              Controla qué avisos ves en la app y cuáles llegan a tu dispositivo
            </p>
          </div>
          <NotificationPreferencesSettings />
        </div>
      )}

      {/* ——— Direcciones ——— */}
      {activeTab === 'direcciones' && (
        <AddressesAndCardsTab userId={user?.id || ''} section="addresses" />
      )}

      {/* ——— Tarjetas ——— */}
      {activeTab === 'tarjetas' && (
        <AddressesAndCardsTab userId={user?.id || ''} section="cards" />
      )}

      {/* ——— Mascotas ——— */}
      {activeTab === 'perros' && (
        <div className="space-y-4 pb-16">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mis mascotas</h2>
              <p className="text-sm text-gray-500">
                {petsLoading ? '…' : `${pets?.length ?? 0} registrada${(pets?.length ?? 0) !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!petsLoading && pets && pets.length > 0 && (
              <Button
                data-blueprint-guided="add-pet"
                onClick={handleAddPet}
                className={`hidden md:flex shrink-0 min-h-[44px] ${landingBtnPrimary}`}
              >
                <Plus size={18} className="mr-2" />
                Agregar mascota
              </Button>
            )}
          </div>

          {petsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <MobileSectionCard key={i} className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </MobileSectionCard>
              ))}
            </div>
          ) : pets && pets.length > 0 ? (
            <div className="space-y-3">
              {pets.map((pet, index) => {
                const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
                const photoCount = getPetImageUrls(pet).length;
                return (
                  <MobileSectionCard key={pet.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setViewingPet(pet)}
                      className="w-full flex gap-3 text-left active:opacity-80 transition-opacity"
                    >
                      <div className="relative shrink-0">
                        <PetAvatar
                          pet={pet}
                          size="2xl"
                          rounded="2xl"
                          ring
                          className="w-[72px] h-[72px] shadow-md"
                        />
                        {photoCount > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-black/70 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                            {photoCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{pet.name}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {pet.breed || formatSpeciesLabel(pet.species)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {pet.age != null && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {pet.age} años
                            </span>
                          )}
                          {pet.weight != null && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {pet.weight} kg
                            </span>
                          )}
                          {pet.available_for_breeding && (
                            <span className="text-xs bg-landing-mint/15 text-landing-mint-dark px-2 py-0.5 rounded-full">
                              Reproducción
                            </span>
                          )}
                        </div>
                        {pet.microchip && (
                          <p className="text-xs text-gray-500 mt-1.5 truncate">
                            Microchip: <span className="text-gray-700 font-medium">{pet.microchip}</span>
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setViewingPet(pet)}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl text-landing-aqua-dark hover:bg-landing-aqua/10 active:bg-landing-aqua/15 min-h-[56px] justify-center"
                      >
                        <Eye size={20} />
                        <span className="text-[10px] font-medium">Ver</span>
                      </button>
                        <button
                          type="button"
                          onClick={() => handleEditPet(pet)}
                          className="flex flex-col items-center gap-1 py-2 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 min-h-[56px] justify-center"
                        >
                          <Edit size={20} />
                          <span className="text-[10px] font-medium">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePet(pet)}
                          className="flex flex-col items-center gap-1 py-2 rounded-xl text-red-500 hover:bg-red-50 active:bg-red-100 min-h-[56px] justify-center"
                        >
                          <Trash2 size={20} />
                          <span className="text-[10px] font-medium">Eliminar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/pet-journey/${pet.id}`)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl text-white bg-gradient-to-r ${gradient} shadow-sm min-h-[56px] justify-center`}
                        >
                          <Home size={20} />
                          <span className="text-[10px] font-medium">Journey</span>
                        </button>
                    </div>
                  </MobileSectionCard>
                );
              })}
            </div>
          ) : (
            <MobileSectionCard className="p-8 text-center">
              <div className="text-5xl mb-3">🐾</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin mascotas aún</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                Agrega tu primera mascota para gestionar su salud, nutrición y más
              </p>
              <Button data-blueprint-guided="add-pet" onClick={handleAddPet} className={`min-h-[48px] ${landingBtnPrimary}`}>
                <Plus size={18} className="mr-2" />
                Agregar mascota
              </Button>
            </MobileSectionCard>
          )}

          {pets && pets.length > 0 && (
            <MobileFab onClick={handleAddPet} label="Agregar" icon={<Plus size={20} />} className="md:hidden" data-blueprint-guided="add-pet" />
          )}
        </div>
      )}

      {userProfile && (
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          profile={userProfile}
        />
      )}

      <PetModal
        isOpen={petModalOpen}
        onClose={() => {
          setPetModalOpen(false);
          setEditingPet(null);
        }}
        pet={editingPet}
        ownerId={user?.id || ''}
      />

      <PetDetailsModal
        pet={viewingPet}
        open={!!viewingPet}
        onClose={() => setViewingPet(null)}
        onEdit={handleEditPet}
        onDelete={handleDeletePet}
        onJourney={(petId) => navigate(`/pet-journey/${petId}`)}
      />

      <DeletePetDialog
        isOpen={deletePetDialog.open}
        onClose={() => setDeletePetDialog({ open: false, pet: null })}
        petName={deletePetDialog.pet?.name || ''}
        petId={deletePetDialog.pet?.id || ''}
      />
    </DashboardShell>
  );
};

export default Ajustes;
