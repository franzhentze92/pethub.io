import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Heart, Home, Map, Sparkles } from 'lucide-react';
import { useBlueprintGuidedTour } from '@/contexts/BlueprintGuidedTourContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClientBlueprint } from '@/hooks/useClientBlueprint';
import { useProviderBlueprint } from '@/hooks/useProviderBlueprint';
import { useShelterBlueprint } from '@/hooks/useShelterBlueprint';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MobileSectionCard } from '@/components/mobile/MobileUi';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BlueprintWizardPanel, BlueprintProgressHeader } from '@/components/blueprint/BlueprintWizardPanel';
import { BlueprintEcosystemMap } from '@/components/blueprint/BlueprintEcosystemMap';
import { BlueprintSectionList } from '@/components/blueprint/BlueprintSectionList';
import {
  BlueprintOnboardingTour,
  shouldShowBlueprintTour,
} from '@/components/blueprint/BlueprintOnboardingTour';
import {
  computeGlobalTourStartIndex,
  getFullClientTourStepCount,
  markBlueprintTourOffered,
  shouldOfferBlueprintTour,
} from '@/lib/blueprint/guidedTourSteps';
import {
  computeProviderGlobalTourStartIndex,
  getFullProviderTourStepCount,
} from '@/lib/blueprint/providerGuidedTourSteps';
import {
  computeShelterGlobalTourStartIndex,
  getFullShelterTourStepCount,
} from '@/lib/blueprint/shelterGuidedTourSteps';
import {
  PROVIDER_BLUEPRINT_CATEGORY_LABELS,
  type ProviderBlueprintSectionCategory,
} from '@/lib/blueprint/providerSections';
import {
  SHELTER_BLUEPRINT_CATEGORY_LABELS,
  type ShelterBlueprintSectionCategory,
} from '@/lib/blueprint/shelterSections';
import type { BlueprintSectionView } from '@/lib/blueprint/types';
import { BLUEPRINT_MASCOTS, buildMascotIntroMessage, buildMascotIntroTitle } from '@/lib/blueprint/blueprintMascots';

const PetHubBlueprint: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: clientData, isLoading: clientLoading, isError: clientError, refetch: refetchClient } =
    useClientBlueprint(user?.id);
  const {
    data: providerData,
    isLoading: providerLoading,
    isError: providerError,
    refetch: refetchProvider,
  } = useProviderBlueprint(user?.id);
  const {
    data: shelterData,
    isLoading: shelterLoading,
    isError: shelterError,
    refetch: refetchShelter,
  } = useShelterBlueprint(user?.id);
  const { startTour: startGuidedTour, restartTour, isActive: guidedTourActive } = useBlueprintGuidedTour();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTour, setShowTour] = useState(() => shouldShowBlueprintTour());
  const [showWelcomeTourDialog, setShowWelcomeTourDialog] = useState(false);
  const welcomeOfferChecked = useRef(false);
  const [activeDashboard, setActiveDashboard] = useState<'client' | 'provider' | 'shelter'>('client');

  const totalClientTourSteps = getFullClientTourStepCount();
  const totalProviderTourSteps = getFullProviderTourStepCount();
  const totalShelterTourSteps = getFullShelterTourStepCount();
  const clientTourProgressStart = clientData
    ? computeGlobalTourStartIndex(clientData.sections) + 1
    : 1;
  const providerTourProgressStart = providerData
    ? computeProviderGlobalTourStartIndex(providerData.sections) + 1
    : 1;
  const shelterTourProgressStart = shelterData
    ? computeShelterGlobalTourStartIndex(shelterData.sections) + 1
    : 1;
  const clientTourProgressLabel = `${clientTourProgressStart}/${totalClientTourSteps}`;
  const providerTourProgressLabel = `${providerTourProgressStart}/${totalProviderTourSteps}`;
  const shelterTourProgressLabel = `${shelterTourProgressStart}/${totalShelterTourSteps}`;
  const activeTourProgressLabel =
    activeDashboard === 'provider'
      ? providerTourProgressLabel
      : activeDashboard === 'shelter'
        ? shelterTourProgressLabel
        : clientTourProgressLabel;

  useEffect(() => {
    if (!clientData || welcomeOfferChecked.current) return;

    const welcomeTour = searchParams.get('welcomeTour') === '1';
    if (welcomeTour || shouldOfferBlueprintTour()) {
      welcomeOfferChecked.current = true;
      setShowWelcomeTourDialog(true);
      if (welcomeTour) {
        const next = new URLSearchParams(searchParams);
        next.delete('welcomeTour');
        setSearchParams(next, { replace: true });
      }
    }
  }, [clientData, searchParams, setSearchParams]);

  const handleWelcomeDialogChange = useCallback((open: boolean) => {
    if (!open) {
      markBlueprintTourOffered();
    }
    setShowWelcomeTourDialog(open);
  }, []);

  const handleAcceptWelcomeTour = useCallback(() => {
    markBlueprintTourOffered();
    setShowWelcomeTourDialog(false);
    startGuidedTour({ fromBeginning: true, dashboard: 'client' });
  }, [startGuidedTour]);

  const handleDeclineWelcomeTour = useCallback(() => {
    markBlueprintTourOffered();
    setShowWelcomeTourDialog(false);
  }, []);

  const handleNavigate = useCallback(
    (section: BlueprintSectionView) => {
      if (section.ajustesTab) {
        navigate('/ajustes', { state: { activeTab: section.ajustesTab } });
        return;
      }
      if (section.dashboardTab) {
        navigate(section.path, {
          state: {
            activeTab: section.dashboardTab,
            ...(section.dashboardSubTab ? { activeSubTab: section.dashboardSubTab } : {}),
          },
        });
        return;
      }
      navigate(section.path);
    },
    [navigate],
  );

  const isLoading =
    activeDashboard === 'client'
      ? clientLoading
      : activeDashboard === 'provider'
        ? providerLoading
        : activeDashboard === 'shelter'
          ? shelterLoading
          : false;
  const isError =
    activeDashboard === 'client'
      ? clientError
      : activeDashboard === 'provider'
        ? providerError
        : activeDashboard === 'shelter'
          ? shelterError
          : false;
  const refetch =
    activeDashboard === 'client'
      ? refetchClient
      : activeDashboard === 'provider'
        ? refetchProvider
        : activeDashboard === 'shelter'
          ? refetchShelter
          : () => {};

  const providerCategoryOrder: ProviderBlueprintSectionCategory[] = ['setup', 'catalog', 'operations'];
  const shelterCategoryOrder: ShelterBlueprintSectionCategory[] = ['setup', 'catalog', 'operations'];

  return (
    <DashboardShell>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/ajustes')}
          className="inline-flex items-center gap-1 text-sm text-landing-aqua-dark font-medium hover:underline mb-2"
        >
          <ArrowLeft size={16} />
          Volver a Ajustes
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Sparkles className="w-6 h-6 text-landing-mango shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PetHub Blueprint</h1>
              <p className="text-sm text-gray-500">
                Conecta tu ecosistema para que {BLUEPRINT_MASCOTS[activeDashboard].name} acceda a toda tu información
              </p>
            </div>
          </div>
          {(activeDashboard === 'client' || activeDashboard === 'provider' || activeDashboard === 'shelter') && (
            <Button
              type="button"
              size="sm"
              className="shrink-0 min-h-[40px] bg-gradient-to-r from-landing-mango to-landing-tropical text-white hover:opacity-90 shadow-sm"
              onClick={() => startGuidedTour({ dashboard: activeDashboard })}
              disabled={guidedTourActive}
            >
              <Map size={16} className="mr-1.5" />
              Blueprint Tour · {activeTourProgressLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-white/70 border border-white/80 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveDashboard('client')}
          className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
            activeDashboard === 'client'
              ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Home size={16} />
          Cliente
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboard('provider')}
          className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
            activeDashboard === 'provider'
              ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Building2 size={16} />
          Proveedor
        </button>
        <button
          type="button"
          onClick={() => setActiveDashboard('shelter')}
          className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
            activeDashboard === 'shelter'
              ? 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Heart size={16} />
          Albergue
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <MobileSectionCard className="p-6 text-center">
          <p className="text-gray-700 font-medium">No pudimos cargar tu blueprint</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => refetch()}>
            Reintentar
          </Button>
        </MobileSectionCard>
      )}

      {clientData && activeDashboard === 'client' && (
        <div className="space-y-6">
          <MobileSectionCard className="p-4 sm:p-5">
            <BlueprintProgressHeader
              overallPercent={clientData.overallPercent}
              connectedCount={clientData.connectedCount}
              totalCount={clientData.totalCount}
            />
          </MobileSectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlueprintWizardPanel
              nextSection={clientData.nextSection}
              overallPercent={clientData.overallPercent}
              connectedCount={clientData.connectedCount}
              totalCount={clientData.totalCount}
              sections={clientData.sections}
              onNavigate={handleNavigate}
              onStartTour={() => setShowTour(true)}
              onStartGuidedTour={() => startGuidedTour({ dashboard: 'client' })}
              onRestartGuidedTour={() => restartTour('client')}
              guidedTourProgressLabel={clientTourProgressLabel}
              guidedTourActive={guidedTourActive}
            />
            <BlueprintEcosystemMap
              sections={clientData.sections}
              onSectionClick={handleNavigate}
              summaryCategory="profile"
              summaryCategoryLabel="Perfil base"
            />
          </div>

          <BlueprintSectionList sections={clientData.sections} onNavigate={handleNavigate} />
        </div>
      )}

      {providerData && activeDashboard === 'provider' && (
        <div className="space-y-6">
          <MobileSectionCard className="p-4 sm:p-5">
            <BlueprintProgressHeader
              overallPercent={providerData.overallPercent}
              connectedCount={providerData.connectedCount}
              totalCount={providerData.totalCount}
            />
          </MobileSectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlueprintWizardPanel
              nextSection={providerData.nextSection}
              overallPercent={providerData.overallPercent}
              connectedCount={providerData.connectedCount}
              totalCount={providerData.totalCount}
              sections={providerData.sections}
              onNavigate={handleNavigate}
              onStartTour={() => setShowTour(true)}
              onStartGuidedTour={() => startGuidedTour({ dashboard: 'provider' })}
              onRestartGuidedTour={() => restartTour('provider')}
              guidedTourProgressLabel={providerTourProgressLabel}
              guidedTourActive={guidedTourActive}
              mascotDashboard="provider"
              wizardTitle="Setup Wizard · Proveedor"
              wizardBadge="Dashboard Proveedor"
              wizardDescriptionConnected="¡Tu negocio está 100% conectado en PetHub! Sasha tiene acceso completo."
              wizardDescriptionPending="Completa cada sección para que Sasha pueda guiarte en tu negocio en PetHub."
            />
            <BlueprintEcosystemMap
              sections={providerData.sections}
              onSectionClick={handleNavigate}
              summaryCategory="setup"
              summaryCategoryLabel="Configuración"
              mascotDashboard="provider"
            />
          </div>

          <BlueprintSectionList
            sections={providerData.sections}
            onNavigate={handleNavigate}
            categoryOrder={providerCategoryOrder}
            categoryLabels={PROVIDER_BLUEPRINT_CATEGORY_LABELS}
          />
        </div>
      )}

      {shelterData && activeDashboard === 'shelter' && (
        <div className="space-y-6">
          <MobileSectionCard className="p-4 sm:p-5">
            <BlueprintProgressHeader
              overallPercent={shelterData.overallPercent}
              connectedCount={shelterData.connectedCount}
              totalCount={shelterData.totalCount}
            />
          </MobileSectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlueprintWizardPanel
              nextSection={shelterData.nextSection}
              overallPercent={shelterData.overallPercent}
              connectedCount={shelterData.connectedCount}
              totalCount={shelterData.totalCount}
              sections={shelterData.sections}
              onNavigate={handleNavigate}
              onStartTour={() => setShowTour(true)}
              onStartGuidedTour={() => startGuidedTour({ dashboard: 'shelter' })}
              onRestartGuidedTour={() => restartTour('shelter')}
              guidedTourProgressLabel={shelterTourProgressLabel}
              guidedTourActive={guidedTourActive}
              mascotDashboard="shelter"
              showGuidedTourButtons={true}
              wizardTitle="Setup Wizard · Albergue"
              wizardBadge="Dashboard Albergue"
              wizardDescriptionConnected="¡Tu albergue está 100% conectado en PetHub! Shaggy tiene acceso completo."
              wizardDescriptionPending="Completa cada sección para que Shaggy pueda guiarte en tu albergue."
            />
            <BlueprintEcosystemMap
              sections={shelterData.sections}
              onSectionClick={handleNavigate}
              summaryCategory="setup"
              summaryCategoryLabel="Configuración"
              mascotDashboard="shelter"
            />
          </div>

          <BlueprintSectionList
            sections={shelterData.sections}
            onNavigate={handleNavigate}
            categoryOrder={shelterCategoryOrder}
            categoryLabels={SHELTER_BLUEPRINT_CATEGORY_LABELS}
          />
        </div>
      )}

      {showTour && <BlueprintOnboardingTour onComplete={() => setShowTour(false)} />}

      <AlertDialog open={showWelcomeTourDialog} onOpenChange={handleWelcomeDialogChange}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="relative mx-auto mb-3">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-landing-aqua/25 to-landing-mint/20 blur-xl scale-125"
                aria-hidden
              />
              <img
                src={BLUEPRINT_MASCOTS.client.image}
                alt={BLUEPRINT_MASCOTS.client.name}
                className="relative w-24 h-24 object-contain drop-shadow-lg"
              />
            </div>
            <AlertDialogTitle>{buildMascotIntroTitle('client')}</AlertDialogTitle>
            <AlertDialogDescription>
              {buildMascotIntroMessage('client')} ¿Quieres que te guíe ahora con el Blueprint Tour?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="w-full bg-gradient-to-r from-landing-mango to-landing-tropical text-white hover:opacity-90"
              onClick={handleAcceptWelcomeTour}
            >
              Sí, empezar tour
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0" onClick={handleDeclineWelcomeTour}>
              Omitir por ahora
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
};

export default PetHubBlueprint;
