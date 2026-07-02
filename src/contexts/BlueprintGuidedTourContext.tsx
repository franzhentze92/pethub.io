import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useClientBlueprint } from '@/hooks/useClientBlueprint';
import { useProviderBlueprint } from '@/hooks/useProviderBlueprint';
import type { BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';
import {
  type BlueprintTourPhase,
  type BlueprintTourSectionId,
  type GuidedTourStep,
  BLUEPRINT_FULL_TOUR_COMPLETED_KEY,
  BLUEPRINT_GUIDED_TOUR_KEY,
  CLIENT_TOUR_PHASES,
  computeGlobalTourStartIndex,
  getFullClientTourSteps,
  getStepsForPhase,
  markBlueprintTourOffered,
} from '@/lib/blueprint/guidedTourSteps';
import {
  computeProviderGlobalTourStartIndex,
  getFullProviderTourSteps,
} from '@/lib/blueprint/providerGuidedTourSteps';
import {
  computeShelterGlobalTourStartIndex,
  getFullShelterTourSteps,
} from '@/lib/blueprint/shelterGuidedTourSteps';

interface PersistedTourState {
  active: boolean;
  dashboard: BlueprintDashboard;
  stepIndex: number;
}

interface LegacyPersistedTourState {
  active: boolean;
  phase?: BlueprintTourPhase;
  stepIndex: number;
  dashboard?: BlueprintDashboard;
}

interface StartTourOptions {
  dashboard?: BlueprintDashboard;
  fromBeginning?: boolean;
}

interface BlueprintGuidedTourContextValue {
  isActive: boolean;
  dashboard: BlueprintDashboard | null;
  phase: BlueprintTourPhase | null;
  currentStep: GuidedTourStep | null;
  stepIndex: number;
  totalSteps: number;
  sectionSavedFlash: BlueprintTourSectionId | null;
  startTour: (options?: StartTourOptions) => void;
  restartTour: (dashboard?: BlueprintDashboard) => void;
  stopTour: () => void;
  skipTour: () => void;
  advanceStep: () => void;
  goBackStep: () => void;
  notifySectionSaved: (sectionId: BlueprintTourSectionId) => void;
  isSectionComplete: (sectionId: BlueprintTourSectionId) => boolean;
  handlePrimaryAction: () => void;
}

const BlueprintGuidedTourContext = createContext<BlueprintGuidedTourContextValue | null>(null);

function getStepsForDashboard(dashboard: BlueprintDashboard): GuidedTourStep[] {
  if (dashboard === 'provider') return getFullProviderTourSteps();
  if (dashboard === 'shelter') return getFullShelterTourSteps();
  return getFullClientTourSteps();
}

function migratePersistedState(raw: LegacyPersistedTourState): PersistedTourState | null {
  if (!raw.active) return null;

  const dashboard: BlueprintDashboard = raw.dashboard ?? 'client';
  const steps = getStepsForDashboard(dashboard);

  if (!raw.phase || dashboard === 'provider' || dashboard === 'shelter') {
    return {
      active: true,
      dashboard,
      stepIndex: Math.min(Math.max(0, raw.stepIndex), Math.max(0, steps.length - 1)),
    };
  }

  let offset = 0;
  for (const tourPhase of CLIENT_TOUR_PHASES) {
    if (tourPhase === raw.phase) {
      return {
        active: true,
        dashboard: 'client',
        stepIndex: Math.min(offset + raw.stepIndex, Math.max(0, steps.length - 1)),
      };
    }
    offset += getStepsForPhase(tourPhase).length;
  }

  return null;
}

function loadPersistedState(): PersistedTourState | null {
  try {
    const raw = sessionStorage.getItem(BLUEPRINT_GUIDED_TOUR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyPersistedTourState;
    return migratePersistedState(parsed);
  } catch {
    return null;
  }
}

function persistState(state: PersistedTourState | null) {
  if (!state?.active) {
    sessionStorage.removeItem(BLUEPRINT_GUIDED_TOUR_KEY);
    return;
  }
  sessionStorage.setItem(BLUEPRINT_GUIDED_TOUR_KEY, JSON.stringify(state));
}

export function BlueprintGuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const persisted = useRef(loadPersistedState());

  const [isActive, setIsActive] = useState(() => persisted.current?.active ?? false);
  const [dashboard, setDashboard] = useState<BlueprintDashboard | null>(
    () => persisted.current?.dashboard ?? null,
  );
  const [stepIndex, setStepIndex] = useState(() => persisted.current?.stepIndex ?? 0);
  const [sectionSavedFlash, setSectionSavedFlash] = useState<BlueprintTourSectionId | null>(null);

  const steps = useMemo(
    () => (dashboard ? getStepsForDashboard(dashboard) : []),
    [dashboard],
  );
  const currentStep = steps[stepIndex] ?? null;
  const phase = currentStep?.phase ?? null;
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    persistState(isActive && dashboard ? { active: true, dashboard, stepIndex } : null);
  }, [isActive, dashboard, stepIndex]);

  const { data: clientBlueprintData } = useClientBlueprint(
    isActive && dashboard === 'client' ? user?.id : undefined,
  );
  const { data: providerBlueprintData } = useProviderBlueprint(
    isActive && dashboard === 'provider' ? user?.id : undefined,
  );

  const blueprintSections = useMemo(() => {
    if (dashboard === 'provider') return providerBlueprintData?.sections ?? [];
    return clientBlueprintData?.sections ?? [];
  }, [clientBlueprintData?.sections, dashboard, providerBlueprintData?.sections]);

  const blueprintQueryKey = dashboard === 'provider' ? 'providerBlueprint' : 'clientBlueprint';

  const isSectionComplete = useCallback(
    (sectionId: BlueprintTourSectionId): boolean => {
      const section = blueprintSections.find((s) => s.id === sectionId);
      return section?.status === 'connected';
    },
    [blueprintSections],
  );

  const navigateForStep = useCallback(
    (step: GuidedTourStep) => {
      if (!step.path) return;
      navigate(step.path, {
        state: {
          ...(step.ajustesTab ? { activeTab: step.ajustesTab } : {}),
          ...(step.moduleTab ? { tab: step.moduleTab } : {}),
          ...(step.dashboardTab ? { activeTab: step.dashboardTab } : {}),
          ...(step.dashboardSubTab ? { activeSubTab: step.dashboardSubTab } : {}),
          blueprintTour: true,
        },
      });
    },
    [navigate],
  );

  const finishTour = useCallback(() => {
    if (dashboard === 'client') {
      localStorage.setItem(BLUEPRINT_FULL_TOUR_COMPLETED_KEY, 'true');
    }
    setIsActive(false);
    setDashboard(null);
    setStepIndex(0);
    setSectionSavedFlash(null);
    persistState(null);
  }, [dashboard]);

  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        finishTour();
        return 0;
      }
      return next;
    });
  }, [finishTour, steps.length]);

  const goBackStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setDashboard(null);
    setStepIndex(0);
    setSectionSavedFlash(null);
    persistState(null);
  }, []);

  const skipTour = useCallback(() => {
    if (dashboard === 'client') {
      markBlueprintTourOffered();
    }
    stopTour();
  }, [dashboard, stopTour]);

  const startTour = useCallback(
    (options?: StartTourOptions) => {
      const tourDashboard = options?.dashboard ?? 'client';
      const tourSteps = getStepsForDashboard(tourDashboard);
      if (!tourSteps.length) return;

      let startIndex = 0;
      if (!options?.fromBeginning && user?.id) {
        const queryKey =
          tourDashboard === 'provider'
            ? 'providerBlueprint'
            : tourDashboard === 'shelter'
              ? 'shelterBlueprint'
              : 'clientBlueprint';
        const data = queryClient.getQueryData<{
          sections: Array<{ id: string; status: string }>;
        }>([queryKey, user.id]);

        if (data) {
          startIndex =
            tourDashboard === 'provider'
              ? computeProviderGlobalTourStartIndex(data.sections)
              : tourDashboard === 'shelter'
                ? computeShelterGlobalTourStartIndex(data.sections)
                : computeGlobalTourStartIndex(data.sections);
        }
      }

      setDashboard(tourDashboard);
      setStepIndex(startIndex);
      setIsActive(true);
      setSectionSavedFlash(null);
    },
    [queryClient, user?.id],
  );

  const restartTour = useCallback(
    (tourDashboard: BlueprintDashboard = 'client') => {
      startTour({ dashboard: tourDashboard, fromBeginning: true });
    },
    [startTour],
  );

  const notifySectionSaved = useCallback(
    async (sectionId: BlueprintTourSectionId) => {
      if (!user?.id || !isActive || !dashboard) return;

      const step = currentStepRef.current;
      if (!step?.waitForSave || step.sectionId !== sectionId) return;

      setSectionSavedFlash(sectionId);
      await queryClient.invalidateQueries({ queryKey: [blueprintQueryKey, user.id] });
      await queryClient.refetchQueries({ queryKey: [blueprintQueryKey, user.id] });

      const data = queryClient.getQueryData<{
        sections: Array<{ id: string; status: string }>;
      }>([blueprintQueryKey, user.id]);
      const section = data?.sections.find((s) => s.id === sectionId);

      if (section?.status === 'connected') {
        window.setTimeout(() => {
          setSectionSavedFlash(null);
          advanceStep();
        }, 1400);
      } else {
        setSectionSavedFlash(null);
      }
    },
    [advanceStep, blueprintQueryKey, dashboard, isActive, queryClient, user?.id],
  );

  const handlePrimaryAction = useCallback(() => {
    if (!currentStep) return;

    if (currentStep.type === 'complete') {
      if (currentStep.path) navigateForStep(currentStep);
      advanceStep();
      return;
    }

    if (currentStep.type === 'info' || currentStep.type === 'navigate') {
      if (currentStep.path) navigateForStep(currentStep);
      advanceStep();
      return;
    }

    if (currentStep.type === 'action') {
      if (currentStep.sectionId && isSectionComplete(currentStep.sectionId)) {
        advanceStep();
      }
    }
  }, [advanceStep, currentStep, isSectionComplete, navigateForStep]);

  useEffect(() => {
    if (!isActive || !currentStep?.path) return;
    if (currentStep.type !== 'action') return;

    const timer = window.setTimeout(() => {
      navigateForStep(currentStep);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [currentStep?.id, currentStep?.path, currentStep?.type, isActive, navigateForStep]);

  const value = useMemo(
    () => ({
      isActive,
      dashboard,
      phase,
      currentStep,
      stepIndex,
      totalSteps: steps.length,
      sectionSavedFlash,
      startTour,
      restartTour,
      stopTour,
      skipTour,
      advanceStep,
      goBackStep,
      notifySectionSaved,
      isSectionComplete,
      handlePrimaryAction,
    }),
    [
      isActive,
      dashboard,
      phase,
      currentStep,
      stepIndex,
      steps.length,
      sectionSavedFlash,
      startTour,
      restartTour,
      stopTour,
      skipTour,
      advanceStep,
      goBackStep,
      notifySectionSaved,
      isSectionComplete,
      handlePrimaryAction,
    ],
  );

  return (
    <BlueprintGuidedTourContext.Provider value={value}>{children}</BlueprintGuidedTourContext.Provider>
  );
}

export function useBlueprintGuidedTour() {
  const ctx = useContext(BlueprintGuidedTourContext);
  if (!ctx) {
    throw new Error('useBlueprintGuidedTour must be used within BlueprintGuidedTourProvider');
  }
  return ctx;
}

export function useBlueprintGuidedTourOptional() {
  return useContext(BlueprintGuidedTourContext);
}
