import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { usePets } from '../hooks/useSettings';
import { Button } from './ui/button';
import {
  Utensils,
  Activity,
  Stethoscope,
  Heart,
  Bell,
  Plus,
  PawPrint,
  ChevronRight,
} from 'lucide-react';
import { formatSpeciesLabel } from '@/utils/petLabels';
import { DashboardShell } from './dashboard/DashboardShell';
import { MobileSectionCard } from './mobile/MobileUi';
import { landingBtnPrimary, landingFeatureGradients } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  image_url?: string;
}

const careActions = [
  {
    id: 'feeding',
    path: '/feeding-schedules',
    label: 'Nutrición',
    description: 'Programar comidas y horarios',
    icon: Utensils,
    gradientIndex: 2,
  },
  {
    id: 'exercise',
    path: '/trazabilidad',
    label: 'Ejercicio',
    description: 'Registrar actividades y paseos',
    icon: Activity,
    gradientIndex: 0,
  },
  {
    id: 'vet',
    path: '/veterinaria',
    label: 'Veterinaria',
    description: 'Citas médicas y salud',
    icon: Stethoscope,
    gradientIndex: 4,
  },
  {
    id: 'reminders',
    path: '/recordatorios',
    label: 'Recordatorios',
    description: 'Vacunas, citas y seguimientos',
    icon: Bell,
    gradientIndex: 1,
  },
] as const;

const CareHub: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pets, isLoading } = usePets(user?.id);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (pets && pets.length > 0) {
      setSelectedPet(pets[0]);
    }
  }, [pets]);

  const getPetEmoji = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return '🐕';
      case 'cat':
        return '🐱';
      case 'bird':
        return '🐦';
      case 'fish':
        return '🐠';
      default:
        return '🐾';
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <PageLoader variant="inline" message="Cargando cuidado…" />
      </DashboardShell>
    );
  }

  if (!selectedPet) {
    return (
      <DashboardShell>
        <PageHeader title="Cuidado" subtitle="Nutrición, ejercicio, salud y recordatorios para tus mascotas">
          <Heart className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
        </PageHeader>
        <MobileSectionCard>
          <div className="text-center py-10 px-4">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-800">Primero agrega una mascota</p>
            <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm mx-auto">
              Crea tu primera mascota para comenzar a cuidarla desde un solo lugar.
            </p>
            <Button className={landingBtnPrimary} onClick={() => navigate('/pet-creation')}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar mascota
            </Button>
          </div>
        </MobileSectionCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Cuidado" subtitle={`Todo lo que ${selectedPet.name} necesita, en un solo lugar`}>
        <Heart className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      </PageHeader>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {selectedPet.image_url ? (
              <img
                src={selectedPet.image_url}
                alt={selectedPet.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-white shadow-lg shrink-0"
              />
            ) : (
              <div
                className={cn(
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg shrink-0 bg-gradient-to-r',
                  landingFeatureGradients[0],
                )}
              >
                {getPetEmoji(selectedPet.species)}
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedPet.name}</h2>
              <p className="text-sm text-gray-500">{selectedPet.breed || formatSpeciesLabel(selectedPet.species)}</p>
            </div>
          </div>
        </div>
      </MobileSectionCard>

      <MobileSectionCard>
        <div className="p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
            <Heart className="w-5 h-5 text-landing-aqua-dark shrink-0" />
            ¿Qué quieres hacer hoy?
          </h3>
          <div className="space-y-3">
            {careActions.map((action) => {
              const Icon = action.icon;
              const gradient = landingFeatureGradients[action.gradientIndex % landingFeatureGradients.length];
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl text-white text-left shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 bg-gradient-to-r min-h-[72px]',
                    gradient,
                  )}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base sm:text-lg font-semibold">{action.label}</div>
                    <div className="text-sm opacity-90 truncate">{action.description}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
                </button>
              );
            })}
          </div>
        </div>
      </MobileSectionCard>
    </DashboardShell>
  );
};

export default CareHub;
