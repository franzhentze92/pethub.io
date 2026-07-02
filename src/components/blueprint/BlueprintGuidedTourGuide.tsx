import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { landingBtnPrimary } from '@/lib/landingTheme';
import { BLUEPRINT_MASCOTS, BLUEPRINT_DASHBOARD_LABELS } from '@/lib/blueprint/blueprintMascots';
import { useBlueprintGuidedTour } from '@/contexts/BlueprintGuidedTourContext';
import { PHASE_LABELS } from '@/lib/blueprint/guidedTourSteps';
import {
  computeTooltipLayout,
  getSafeBottom,
  VIEWPORT_PAD,
  type TooltipLayout,
} from './blueprintTourLayout';

export const BlueprintGuidedTourGuide: React.FC = () => {
  const {
    isActive,
    dashboard,
    currentStep,
    stepIndex,
    totalSteps,
    phase,
    sectionSavedFlash,
    skipTour,
    goBackStep,
    handlePrimaryAction,
    isSectionComplete,
  } = useBlueprintGuidedTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [layout, setLayout] = useState<TooltipLayout>({ mode: 'center' });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const sectionComplete =
    currentStep?.sectionId && currentStep?.waitForSave
      ? isSectionComplete(currentStep.sectionId)
      : false;

  const showSavedFlash = Boolean(
    sectionSavedFlash && currentStep?.sectionId === sectionSavedFlash,
  );

  useEffect(() => {
    if (!isActive || !currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStep.targetSelector!);
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

    const timer = window.setTimeout(updateRect, 300);
    const retryTimer = window.setTimeout(updateRect, 900);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [currentStep?.targetSelector, currentStep?.id, isActive]);

  useLayoutEffect(() => {
    if (!isActive || !currentStep) return;

    const measure = () => {
      const el = tooltipRef.current;
      const tooltipHeight = el?.offsetHeight ?? 240;
      const tooltipWidth = el?.offsetWidth ?? Math.min(320, window.innerWidth - 24);

      setLayout(
        computeTooltipLayout(
          targetRect,
          currentStep.placement,
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
  }, [targetRect, currentStep, isActive]);

  if (!isActive || !currentStep) return null;

  const mascot = BLUEPRINT_MASCOTS[dashboard ?? 'client'];
  const dashboardLabel = BLUEPRINT_DASHBOARD_LABELS[dashboard ?? 'client'];
  const isMascotIntro = Boolean(currentStep.mascotIntro);

  /** Paso de acción: el usuario interactúa libremente con la pantalla */
  const isHandsOnStep =
    currentStep.type === 'action' &&
    currentStep.waitForSave &&
    !showSavedFlash &&
    !sectionComplete;

  /** Tras guardar: avatar vuelve con confirmación antes del siguiente paso */
  const showSuccessOverlay = showSavedFlash;

  const primaryLabel =
    currentStep.ctaLabel ??
    (currentStep.type === 'action' && sectionComplete
      ? 'Continuar'
      : currentStep.type === 'action'
        ? 'Empezar'
        : 'Continuar');

  const primaryDisabled =
    currentStep.type === 'action' &&
    currentStep.waitForSave &&
    !sectionComplete &&
    !showSavedFlash;

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

  const progressDots =
    totalSteps <= 12 ? (
      <div className="flex gap-1 justify-center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === stepIndex ? 'bg-landing-aqua' : i < stepIndex ? 'bg-landing-mint' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    ) : null;

  const phaseLabel = phase ? PHASE_LABELS[phase] : null;

  /** Modo manos libres: barra compacta, sin backdrop — permite tocar formularios y diálogos */
  if (isHandsOnStep) {
    return createPortal(
      <div
        className="fixed inset-0 z-[40] pointer-events-none"
        role="status"
        aria-live="polite"
        aria-label="Blueprint Tour en progreso"
      >
        <div
          style={{
            position: 'fixed',
            left: VIEWPORT_PAD,
            right: VIEWPORT_PAD,
            bottom: getSafeBottom(),
            zIndex: 45,
          }}
          className="pointer-events-auto rounded-2xl bg-white shadow-xl border border-landing-aqua/25 overflow-hidden"
        >
          <div className="flex items-start gap-2.5 p-3 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-landing-aqua/20">
              <img src={mascot.image} alt={mascot.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-landing-aqua-dark uppercase tracking-wide">
                Blueprint Tour · {stepIndex + 1}/{totalSteps}
                {phaseLabel ? ` · ${phaseLabel}` : ''} · Hazlo tú
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{currentStep.title}</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{currentStep.message}</p>
              <p className="text-xs text-landing-aqua-dark font-medium mt-1.5">
                Cuando guardes, volveré a guiarte al siguiente paso.
              </p>
            </div>
            <button
              type="button"
              onClick={skipTour}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
              aria-label="Omitir tour"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 border-t border-gray-100">
            {progressDots}
            <button
              type="button"
              onClick={skipTour}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 shrink-0"
            >
              Omitir tour
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  /** Confirmación tras guardar */
  if (showSuccessOverlay) {
    return createPortal(
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4"
        style={{ paddingBottom: getSafeBottom() }}
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center p-5 gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-white ring-2 ring-emerald-100">
              <img src={mascot.image} alt={mascot.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={20} />
              <span className="font-semibold">¡Guardado correctamente!</span>
            </div>
            <p className="text-sm text-gray-600">Siguiente paso en un momento…</p>
            {progressDots}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Blueprint Tour guiado"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] pointer-events-auto" />

      {targetRect && layout.mode === 'anchored' && (
        <div
          className="absolute rounded-2xl ring-4 ring-landing-aqua shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none transition-all duration-300"
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
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        />
      )}

      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className={`rounded-2xl bg-white shadow-2xl border border-landing-aqua/20 overflow-hidden flex flex-col pointer-events-auto ${
          isMascotIntro ? 'max-w-sm' : ''
        }`}
      >
        {isMascotIntro ? (
          <div className="relative flex flex-col items-center text-center px-4 pt-5 pb-2 gap-3 bg-gradient-to-b from-landing-aqua/10 via-landing-mint/5 to-white">
            <button
              type="button"
              onClick={skipTour}
              className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80"
              aria-label="Omitir tour"
            >
              <X size={18} />
            </button>
            <div className="relative mt-1 h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full bg-white ring-4 ring-white/80 shadow-lg">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-landing-aqua/25 to-landing-mint/20 blur-xl scale-125 -z-10"
                aria-hidden
              />
              <img
                src={mascot.image}
                alt={mascot.name}
                className="relative h-full w-full object-cover drop-shadow-lg"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{currentStep.title}</p>
              <p className="text-xs font-semibold text-landing-aqua-dark uppercase tracking-wide">
                Tu guía en el {dashboardLabel}
              </p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed px-1">{currentStep.message}</p>
            <p className="text-[10px] sm:text-xs font-medium text-gray-400">
              Blueprint Tour · Paso {stepIndex + 1}/{totalSteps}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-landing-aqua/10 to-landing-mint/10 border-b border-landing-aqua/15 shrink-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-white/60">
              <img src={mascot.image} alt={mascot.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-landing-aqua-dark uppercase tracking-wide">
                {mascot.name} · Blueprint Tour · {stepIndex + 1}/{totalSteps}
                {phaseLabel ? ` · ${phaseLabel}` : ''}
              </p>
              <h3 className="font-bold text-gray-900 mt-0.5 text-sm sm:text-base leading-snug">{currentStep.title}</h3>
            </div>
            <button
              type="button"
              onClick={skipTour}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
              aria-label="Omitir tour"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {!isMascotIntro && (
        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
          <p className="px-3 sm:px-4 py-3 text-sm text-gray-600 leading-relaxed">{currentStep.message}</p>

          {sectionComplete && currentStep.waitForSave && (
            <div className="mx-3 sm:mx-4 mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0" />
              Sección completada
            </div>
          )}
        </div>
        )}

        {currentStep.type === 'complete' ? (
          <div className="flex flex-col gap-2.5 px-3 sm:px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
            {progressDots}
            <Button
              type="button"
              size="sm"
              className={`w-full ${landingBtnPrimary}`}
              disabled={primaryDisabled}
              onClick={handlePrimaryAction}
            >
              {primaryLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="w-full text-gray-600"
            >
              Omitir tour
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-3 sm:px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={stepIndex === 0}
                onClick={goBackStep}
                className="text-gray-600 px-2 self-start shrink-0"
              >
                <ChevronLeft size={16} className="mr-0.5" />
                Atrás
              </Button>

              <div className="order-first sm:order-none">{progressDots}</div>

              <Button
                type="button"
                size="sm"
                className={`w-full sm:w-auto sm:shrink-0 ${landingBtnPrimary}`}
                disabled={primaryDisabled}
                onClick={handlePrimaryAction}
              >
                {primaryLabel}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="w-full text-gray-500 hover:text-gray-700"
            >
              Omitir tour
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
