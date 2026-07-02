import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Users, PawPrint, Calendar, Star, Building2, Image as ImageIcon, Video, ExternalLink, X, LayoutGrid } from 'lucide-react';
import { useShelterById, useAdoptionPetsByShelter, useShelterImages, useShelterVideos } from '@/hooks/useAdoption';
import { useMyFavorites, useToggleFavorite, useApplyToPet } from '@/hooks/useAdoption';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import AdoptionPetDetails from './AdoptionPetDetails';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileTabStrip, type MobileTabItem } from './mobile/MobileTabStrip';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary, landingFeatureGradients } from '@/lib/landingTheme';
import { Skeleton } from '@/components/ui/skeleton';

type GalleryImage = {
  id: string;
  url: string;
  label: string;
  pet?: { id: string; name: string; [key: string]: unknown };
};

const resolveImageUrl = (imageUrl: string) =>
  imageUrl.startsWith('http') ? imageUrl : storage.getShelterImageUrl(imageUrl);

const imageUrlKey = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname).toLowerCase();
  } catch {
    return url.split('?')[0].toLowerCase();
  }
};

const isGenericFilename = (text: string) =>
  /^[\d\-_]*(IMG_|DSC|photo|image|captura|screenshot|WhatsApp)/i.test(text) ||
  /^[\d\-_\s.]+\.(jpg|jpeg|png|webp|gif)$/i.test(text.trim());

const formatAltText = (text: string) =>
  text.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();

const ShelterDetails: React.FC = () => {
  const { shelterId } = useParams<{ shelterId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [detailsPet, setDetailsPet] = useState<any | null>(null);
  
  const { data: shelter, isLoading: shelterLoading } = useShelterById(shelterId);
  const { data: pets = [], isLoading: petsLoading } = useAdoptionPetsByShelter(shelter?.owner_id);
  const { data: shelterImages = [], isLoading: imagesLoading } = useShelterImages(shelter?.owner_id);
  const { data: shelterVideos = [], isLoading: videosLoading } = useShelterVideos(shelter?.owner_id);

  const { data: favoriteIds = [] } = useMyFavorites(user?.id);
  const toggleFavorite = useToggleFavorite();
  const applyToPet = useApplyToPet();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  // Set initial tab based on URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'pets', 'gallery', 'videos'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const isFavorite = (petId: string) => favoriteIds.includes(petId);

  const handleContactShelter = (method: 'phone' | 'email') => {
    if (method === 'phone' && shelter?.phone) {
      window.open(`tel:${shelter.phone}`, '_blank');
    } else if (method === 'email') {
      // You can implement email functionality here
      console.log('Contact shelter via email:', shelter?.name);
    }
  };

  const handleFavoritePet = (petId: string) => {
    if (!user?.id) return;
    toggleFavorite.mutate({ 
      petId, 
      userId: user.id, 
      isFavorite: isFavorite(petId) 
    });
  };

  const handleApplyToPet = (petId: string) => {
    if (!user?.id) return;
    applyToPet.mutate({ 
      pet_id: petId, 
      applicant_id: user.id, 
      message: null, 
      status: 'pending' 
    });
  };

  const shelterTabs: MobileTabItem[] = [
    { id: 'overview', label: 'Resumen', shortLabel: 'Info', icon: LayoutGrid, gradientIndex: 0 },
    { id: 'pets', label: 'Mascotas', shortLabel: 'Mascotas', icon: PawPrint, gradientIndex: 1 },
    { id: 'gallery', label: 'Galería', shortLabel: 'Fotos', icon: ImageIcon, gradientIndex: 2 },
    { id: 'videos', label: 'Videos', shortLabel: 'Videos', icon: Video, gradientIndex: 3 },
  ];

  const goBack = () => navigate('/adopcion', { state: { tab: 'albergues' } });

  if (shelterLoading) {
    return (
      <DashboardShell>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  if (!shelter) {
    return (
      <DashboardShell>
        <MobileSectionCard className="p-8 text-center">
          <Building2 className="w-14 h-14 mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Albergue no encontrado</h2>
          <p className="text-sm text-gray-500 mb-4">El albergue que buscas no existe o fue removido.</p>
          <Button onClick={goBack} variant="outline" className="min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a adopción
          </Button>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  const findPetForUrl = (url: string) => {
    const key = imageUrlKey(url);
    return pets.find((pet) => {
      if (!pet.image_url) return false;
      const petKey = imageUrlKey(pet.image_url);
      return pet.image_url === url || petKey === key || key.endsWith(petKey) || petKey.endsWith(key);
    });
  };

  const galleryImages: GalleryImage[] = [];
  const seenUrls = new Set<string>();

  const addGalleryImage = (item: GalleryImage) => {
    const key = imageUrlKey(item.url);
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    galleryImages.push(item);
  };

  for (const img of shelterImages) {
    const url = resolveImageUrl(img.image_url);
    const pet = findPetForUrl(url);
    const label =
      pet?.name ||
      (img.alt_text && !isGenericFilename(img.alt_text) ? formatAltText(img.alt_text) : 'Albergue');
    addGalleryImage({
      id: img.id,
      url,
      label,
      pet: pet ?? undefined,
    });
  }

  for (const pet of pets) {
    if (!pet.image_url) continue;
    addGalleryImage({
      id: `pet-${pet.id}`,
      url: pet.image_url,
      label: pet.name,
      pet,
    });
  }

  if (shelter.image_url) {
    const url = shelter.image_url;
    const pet = findPetForUrl(url);
    addGalleryImage({
      id: 'shelter-main',
      url,
      label: pet?.name ?? shelter.name,
      pet: pet ?? undefined,
    });
  }

  const videos = shelterVideos.map(video => ({
    id: video.id,
    title: video.title,
    url: video.youtube_url,
    thumbnail: video.thumbnail_url 
      ? (video.thumbnail_url.startsWith('http') 
          ? video.thumbnail_url 
          : storage.getShelterImageUrl(video.thumbnail_url))
      : 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&auto=format&fit=crop&ixlib=rb-4.0.3'
  }));

  const shelterStats = [
    { label: 'Rescatadas', value: `${shelter.total_rescued_pets || 0}+`, icon: PawPrint, gradientIndex: 0 },
    { label: 'Adopciones', value: `${shelter.total_successful_adoptions || 0}+`, icon: Star, gradientIndex: 1 },
    { label: 'Voluntarios', value: `${shelter.total_volunteers || 0}+`, icon: Users, gradientIndex: 2 },
    { label: 'Años', value: `${shelter.years_experience || 0}+`, icon: Calendar, gradientIndex: 3 },
  ];

  const heroImage = galleryImages[0]?.url || shelter.image_url;

  return (
    <DashboardShell>
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 text-sm font-medium text-landing-aqua-dark hover:text-landing-aqua -mt-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a albergues
      </button>

      {/* Hero */}
      <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-lg">
        {heroImage ? (
          <img src={heroImage} alt={shelter.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-landing-aqua/30 to-landing-mango/30 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-white/80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-xl font-bold truncate">{shelter.name}</h1>
          {shelter.location && (
            <p className="flex items-center gap-1 text-sm text-white/90 mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {shelter.location}
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {shelter.phone && (
          <Button
            onClick={() => handleContactShelter('phone')}
            className={`flex-1 min-h-[44px] ${landingBtnPrimary}`}
          >
            <Phone className="w-4 h-4 mr-2" />
            Llamar
          </Button>
        )}
        <Button
          onClick={() => handleContactShelter('email')}
          variant="outline"
          className="flex-1 min-h-[44px] border-landing-aqua/30 text-landing-aqua-dark"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contactar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {shelterStats.map((stat, index) => {
          const gradient = landingFeatureGradients[stat.gradientIndex % landingFeatureGradients.length];
          const Icon = stat.icon;
          return (
            <MobileSectionCard key={index} className="p-2.5 text-center">
              <div className={`w-8 h-8 mx-auto rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center mb-1`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{stat.label}</p>
            </MobileSectionCard>
          );
        })}
      </div>

      <MobileTabStrip tabs={shelterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <MobileSectionCard className="p-4 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Sobre el albergue</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {shelter.mission_statement || shelter.description || 'Este albergue rescata y cuida mascotas mientras encuentran un hogar permanente.'}
            </p>
          </div>
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Contacto</h3>
            {shelter.phone && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-landing-aqua-dark" />
                {shelter.phone}
              </p>
            )}
            {shelter.location && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-landing-aqua-dark" />
                {shelter.location}
              </p>
            )}
          </div>
        </MobileSectionCard>
      )}

      {activeTab === 'pets' && (
        <div className="space-y-3">
          {petsLoading ? (
            [1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : pets.length === 0 ? (
            <MobileSectionCard className="p-8 text-center">
              <PawPrint className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No hay mascotas disponibles ahora</p>
            </MobileSectionCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pets.map((pet, index) => {
                const gradient = landingFeatureGradients[index % landingFeatureGradients.length];
                return (
                  <div
                    key={pet.id}
                    className="rounded-2xl bg-white/80 border border-white/60 shadow-lg overflow-hidden"
                  >
                    <div className="relative h-32">
                      {pet.image_url ? (
                        <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <PawPrint className="w-10 h-10 text-white/80" />
                        </div>
                      )}
                      <button
                        type="button"
                        className={`absolute top-2 right-2 rounded-full p-1.5 shadow ${
                          isFavorite(pet.id) ? 'bg-landing-mango text-white' : 'bg-white/95 text-gray-400'
                        }`}
                        onClick={() => handleFavoritePet(pet.id)}
                      >
                        <Star size={14} className={isFavorite(pet.id) ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{pet.name}</h4>
                      <Button
                        size="sm"
                        className={`w-full min-h-[36px] text-xs ${landingBtnPrimary}`}
                        onClick={() => setDetailsPet(pet)}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'gallery' && (
        <div>
          {imagesLoading || petsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : galleryImages.length === 0 ? (
            <MobileSectionCard className="p-8 text-center text-sm text-gray-500">
              Sin imágenes en la galería
            </MobileSectionCard>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {galleryImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className="relative aspect-square rounded-xl overflow-hidden"
                  onClick={() => setSelectedImage(image)}
                >
                  <img src={image.url} alt={image.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-2 pb-2 pt-8">
                    <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {image.pet ? (
                        <PawPrint className="w-3 h-3 shrink-0" />
                      ) : (
                        <Building2 className="w-3 h-3 shrink-0" />
                      )}
                      {image.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="space-y-3">
          {videosLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : videos.length === 0 ? (
            <MobileSectionCard className="p-8 text-center text-sm text-gray-500">
              Sin videos disponibles
            </MobileSectionCard>
          ) : (
            videos.map((video) => (
              <MobileSectionCard key={video.id} className="overflow-hidden">
                <div className="relative h-40">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 mb-2">{video.title}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full min-h-[40px] border-landing-aqua/30"
                    onClick={() => window.open(video.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver en YouTube
                  </Button>
                </div>
              </MobileSectionCard>
            ))
          )}
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.url} alt={selectedImage.label} className="max-h-[80vh] object-contain rounded-lg mx-auto" />
            <p className="text-white text-center mt-3 font-semibold flex items-center justify-center gap-1.5">
              {selectedImage.pet ? <PawPrint className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              {selectedImage.label}
            </p>
            {selectedImage.pet && (
              <Button
                size="sm"
                className={`mt-3 w-full min-h-[40px] ${landingBtnPrimary}`}
                onClick={() => {
                  setSelectedImage(null);
                  setDetailsPet(selectedImage.pet);
                }}
              >
                Ver mascota
              </Button>
            )}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white/20 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <AdoptionPetDetails
        open={!!detailsPet}
        onClose={() => setDetailsPet(null)}
        pet={detailsPet}
        isFavorite={detailsPet ? favoriteIds.includes(detailsPet.id) : false}
        onToggleFavorite={() => {
          if (!user?.id || !detailsPet) return;
          toggleFavorite.mutate({
            petId: detailsPet.id,
            userId: user.id,
            isFavorite: favoriteIds.includes(detailsPet.id),
          });
        }}
        onApply={() => {
          if (!user?.id || !detailsPet) return;
          applyToPet.mutate({
            pet_id: detailsPet.id,
            applicant_id: user.id,
            message: null,
            status: 'pending',
          });
        }}
      />
    </DashboardShell>
  );
};

export default ShelterDetails;
