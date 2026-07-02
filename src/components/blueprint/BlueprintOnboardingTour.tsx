import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { BLUEPRINT_MASCOTS, buildMascotIntroMessage, buildMascotIntroTitle } from '@/lib/blueprint/blueprintMascots';
import { CLIENT_BLUEPRINT_TOUR_KEY } from '@/lib/blueprint/clientSections';
import { markBlueprintTourOffered } from '@/lib/blueprint/guidedTourSteps';

const clientMascot = BLUEPRINT_MASCOTS.client;

export interface BlueprintTourStep {
  id: string;
  title: string;
  message: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: BlueprintTourStep[] = [
  {
    id: 'welcome',
    title: buildMascotIntroTitle('client'),
    message: `${buildMascotIntroMessage('client')} Aquí verás qué partes de tu ecosistema están conectadas.`,
    placement: 'center',
  },
  {
    id: 'progress',
    title: 'Tu progreso general',
    message:
      'Esta barra muestra qué tan completo está tu perfil cliente. Cuanto más conectado esté el mapa, más contexto tendré para asistirte.',
    targetSelector: '[data-blueprint-tour="progress"]',
    placement: 'bottom',
  },
  {
    id: 'wizard',
    title: 'Asistente paso a paso',
    message:
      'El wizard te indica el siguiente paso recomendado. Puedes ir directo a completar la sección que falte.',
    targetSelector: '[data-blueprint-tour="wizard"]',
    placement: 'bottom',
  },
  {
    id: 'map',
    title: 'Mapa del ecosistema',
    message:
      'Cada nodo es una sección de PetHub. Verde = conectado, amarillo = parcial, gris = pendiente. Toca un nodo para ir allí.',
    targetSelector: '[data-blueprint-tour="map"]',
    placement: 'top',
  },
  {
    id: 'list',
    title: 'Detalle por sección',
    message:
      'Aquí ves el estado de cada módulo con datos reales de tu cuenta — sin simulaciones.',
    targetSelector: '[data-blueprint-tour="list"]',
    placement: 'top',
  },
  {
    id: 'finish',
    title: '¡Listo para conectar!',
    message:
      'Completa las secciones pendientes y Atis podrá acceder a todo tu ecosistema. ¡Empecemos!',
    placement: 'center',
  },
];

const VIEWPORT_PAD = 12;
const BOTTOM_NAV_RESERVE = 72;

type TooltipLayout =
  | { mode: 'center' }
  | { mode: 'anchored'; top: number; left: number; width: number }
  | { mode: 'bottom-sheet'; left: number; right: number; bottom: number };

interface BlueprintOnboardingTourProps {
  onComplete: () => void;
}

function getSafeBottom(): number {
  return BOTTOM_NAV_RESERVE + VIEWPORT_PAD;
}

function computeTooltipLayout(
  targetRect: DOMRect | null,
  preferredPlacement: 'top' | 'bottom' | 'center' | undefined,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): TooltipLayout {
  const safeTop = VIEWPORT_PAD;
  const safeBottom = viewportHeight - getSafeBottom();
  const sheetInsets = { left: VIEWPORT_PAD, right: VIEWPORT_PAD, bottom: getSafeBottom() };

  if (!targetRect || preferredPlacement === 'center') {
    return { mode: 'center' };
  }

  if (viewportWidth < 640) {
    return { mode: 'bottom-sheet', ...sheetInsets };
  }

  const width = Math.min(tooltipWidth, viewportWidth - VIEWPORT_PAD * 2);
  const margin = 12;
  let left = targetRect.left + targetRect.width / 2 - width / 2;
  left = Math.max(VIEWPORT_PAD, Math.min(left, viewportWidth - width - VIEWPORT_PAD));

  const spaceBelow = safeBottom - targetRect.bottom - margin;
  const spaceAbove = targetRect.top - margin - safeTop;
  let placeBelow = preferredPlacement !== 'top';

  if (placeBelow && spaceBelow < tooltipHeight && spaceAbove >= tooltipHeight) {
    placeBelow = false;
  } else if (!placeBelow && spaceAbove < tooltipHeight && spaceBelow >= tooltipHeight) {
    placeBelow = true;
  }

  let top = placeBelow ? targetRect.bottom + margin : targetRect.top - margin - tooltipHeight;
  top = Math.max(safeTop, Math.min(safeBottom - tooltipHeight, top));

  if (top < safeTop || top + tooltipHeight > safeBottom) {
    return { mode: 'bottom-sheet', ...sheetInsets };
  }

  return { mode: 'anchored', top, left, width };
}

export const BlueprintOnboardingTour: React.FC<BlueprintOnboardingTourProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [layout, setLayout] = useState<TooltipLayout>({ mode: 'center' });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector!);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const timer = window.setTimeout(updateRect, 200);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.clearTimeout(timer);
    };
  }, [step.targetSelector, stepIndex]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tooltipRef.current;
      const tooltipHeight = el?.offsetHeight ?? 240;
      const tooltipWidth = el?.offsetWidth ?? Math.min(320, window.innerWidth - 24);

      setLayout(
        computeTooltipLayout(
          targetRect,
          step.placement,
          tooltipWidth,
          tooltipHeight,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [targetRect, step.placement, stepIndex, step.message]);

  const finish = () => {
    localStorage.setItem(CLIENT_BLUEPRINT_TOUR_KEY, 'true');
    onComplete();
  };

  const skip = () => {
    localStorage.setItem(CLIENT_BLUEPRINT_TOUR_KEY, 'true');
    markBlueprintTourOffered();
    onComplete();
  };

  const maxTooltipHeight = `calc(100dvh - ${getSafeBottom() + VIEWPORT_PAD * 2}px)`;

  const tooltipStyle: React.CSSProperties = (() => {
    if (layout.mode === 'center') {
      return {
        position: 'fixed',
        top: VIEWPORT_PAD,
        bottom: getSafeBottom(),
        left: VIEWPORT_PAD,
        right: VIEWPORT_PAD,
        width: 'auto',
        maxWidth: '22rem',
        height: 'fit-content',
        maxHeight: maxTooltipHeight,
        margin: 'auto',
        zIndex: 10002,
      };
    }

    if (layout.mode === 'bottom-sheet') {
      return {
        position: 'fixed',
        left: layout.left,
        right: layout.right,
        bottom: layout.bottom,
        width: 'auto',
        maxHeight: `min(48dvh, ${maxTooltipHeight})`,
        zIndex: 10002,
      };
    }

    return {
      position: 'fixed',
      top: layout.top,
      left: layout.left,
      width: layout.width,
      maxHeight: maxTooltipHeight,
      zIndex: 10002,
    };
  })();

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Tour PetHub Blueprint"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      {targetRect && layout.mode === 'anchored' && (
        <div
          className="absolute rounded-2xl ring-4 ring-landing-aqua shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none transition-all duration-300"
          style={{
            top: Math.max(VIEWPORT_PAD, targetRect.top - 6),
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {targetRect && layout.mode === 'bottom-sheet' && (
        <div
          className="absolute rounded-2xl ring-4 ring-landing-aqua pointer-events-none transition-all duration-300"
          style={{
            top: Math.max(VIEWPORT_PAD, targetRect.top - 4),
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: Math.min(targetRect.height + 8, window.innerHeight * 0.35),
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      )}

      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="rounded-2xl bg-white shadow-2xl border border-landing-aqua/20 overflow-hidden flex flex-col"
      >
        <div className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 border-b border-landing-aqua/15 shrink-0">
          <img src={clientMascot.image} alt={clientMascot.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-landing-aqua-dark uppercase tracking-wide">
              {clientMascot.name} · Paso {stepIndex + 1}/{TOUR_STEPS.length}
            </p>
            <h3 className="font-bold text-gray-900 mt-0.5 text-sm sm:text-base leading-snug">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={skip}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
            aria-label="Omitir tour"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
          <p className="px-3 sm:px-4 py-3 text-sm text-gray-600 leading-relaxed">{step.message}</p>
        </div>

        <div className="flex flex-col gap-2 px-3 sm:px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => i - 1)}
              className="text-gray-600 px-2"
            >
              <ChevronLeft size={16} className="mr-0.5" />
              Atrás
            </Button>

            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === stepIndex ? 'bg-landing-aqua' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <Button type="button" size="sm" className={landingBtnPrimary} onClick={finish}>
                Empezar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className={landingBtnPrimary}
                onClick={() => setStepIndex((i) => i + 1)}
              >
                Siguiente
                <ChevronRight size={16} className="ml-1" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skip}
            className="w-full text-gray-500 hover:text-gray-700"
          >
            Omitir tour
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export function shouldShowBlueprintTour(): boolean {
  return localStorage.getItem(CLIENT_BLUEPRINT_TOUR_KEY) !== 'true';
}
