import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, CircleDashed, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { landingBtnPrimary, landingFeatureGradients } from '@/lib/landingTheme';
import type { BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';
import { BLUEPRINT_MASCOTS } from '@/lib/blueprint/blueprintMascots';
import type { BlueprintSectionView } from '@/lib/blueprint/types';
import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';

interface BlueprintWizardPanelProps {
  nextSection: BlueprintSectionView | null;
  overallPercent: number;
  connectedCount: number;
  totalCount: number;
  sections: BlueprintSectionView[];
  onNavigate: (section: BlueprintSectionView) => void;
  onStartTour: () => void;
  onStartGuidedTour?: () => void;
  onRestartGuidedTour?: () => void;
  guidedTourProgressLabel?: string;
  wizardTitle?: string;
  wizardBadge?: string;
  wizardDescriptionConnected?: string;
  wizardDescriptionPending?: string;
  showGuidedTourButtons?: boolean;
  mascotDashboard?: BlueprintDashboard;
  guideName?: string;
}

const statusConfig: Record<
  BlueprintConnectionStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  connected: {
    label: 'Conectado',
    icon: CheckCircle2,
    className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  partial: {
    label: 'Parcial',
    icon: AlertCircle,
    className: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  disconnected: {
    label: 'Pendiente',
    icon: CircleDashed,
    className: 'text-gray-500 bg-gray-50 border-gray-200',
  },
};

export const BlueprintWizardPanel: React.FC<BlueprintWizardPanelProps> = ({
  nextSection,
  connectedCount,
  totalCount,
  sections,
  onNavigate,
  onStartTour,
  onStartGuidedTour,
  onRestartGuidedTour,
  guidedTourActive = false,
  guidedTourProgressLabel,
  wizardTitle = 'Setup Wizard · Cliente',
  wizardBadge = 'Dashboard Cliente',
  wizardDescriptionConnected = '¡Tu ecosistema cliente está 100% conectado! Atis tiene acceso completo.',
  wizardDescriptionPending = 'Completa cada sección para que Atis pueda guiarte en todo el ecosistema PetHub.',
  showGuidedTourButtons = true,
  mascotDashboard = 'client',
  guideName,
}) => {
  const allConnected = connectedCount === totalCount;
  const mascot = BLUEPRINT_MASCOTS[mascotDashboard];
  const displayGuideName = guideName ?? mascot.name;

  return (
    <div
      data-blueprint-tour="wizard"
      className="rounded-2xl bg-white/85 backdrop-blur-sm border border-white/70 shadow-lg overflow-hidden"
    >
      <div className="p-4 sm:p-5 bg-gradient-to-r from-landing-aqua/15 via-landing-mint/10 to-landing-mango/10 border-b border-landing-aqua/15">
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/80 shadow-md">
            <img
              src={mascot.image}
              alt={displayGuideName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{wizardTitle}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-landing-aqua/15 text-landing-aqua-dark">
                {wizardBadge}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {allConnected ? wizardDescriptionConnected : wizardDescriptionPending}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {nextSection ? (
          <div className="rounded-xl border border-landing-aqua/25 bg-landing-aqua/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-landing-aqua-dark uppercase tracking-wide mb-2">
              <Sparkles size={14} />
              Siguiente paso recomendado
            </div>
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
                  landingFeatureGradients[nextSection.gradientIndex % landingFeatureGradients.length]
                } text-white shadow-sm`}
              >
                <nextSection.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{nextSection.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{nextSection.description}</p>
                {nextSection.missingFields.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {nextSection.missingFields.slice(0, 4).map((field) => (
                      <li key={field} className="text-xs text-amber-700 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                        Falta: {field}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <Button
              type="button"
              className={`w-full mt-4 min-h-[44px] ${landingBtnPrimary}`}
              onClick={() => onNavigate(nextSection)}
            >
              Ir a completar
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-emerald-800">Ecosistema conectado</p>
            <p className="text-sm text-emerald-700 mt-1">Todas las secciones tienen datos activos.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onStartTour}>
            Ver guía interactiva
          </Button>
          {showGuidedTourButtons && onStartGuidedTour && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={guidedTourActive}
              onClick={onStartGuidedTour}
            >
              Blueprint Tour{guidedTourProgressLabel ? ` · ${guidedTourProgressLabel}` : ''}
            </Button>
          )}
          {showGuidedTourButtons && onRestartGuidedTour && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={guidedTourActive}
              onClick={onRestartGuidedTour}
            >
              Reiniciar tour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export function BlueprintProgressHeader({
  overallPercent,
  connectedCount,
  totalCount,
}: {
  overallPercent: number;
  connectedCount: number;
  totalCount: number;
}) {
  return (
    <div data-blueprint-tour="progress" className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">Progreso del ecosistema</p>
          <p className="text-2xl font-bold text-gray-900">{overallPercent}%</p>
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-landing-aqua-dark">{connectedCount}</span> de {totalCount} conectadas
        </p>
      </div>
      <Progress value={overallPercent} className="h-2.5" />
    </div>
  );
}

export { statusConfig };
