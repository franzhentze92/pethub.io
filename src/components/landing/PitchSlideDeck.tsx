import React, { useCallback, useEffect, useState } from 'react';
import { ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PitchSlide {
  id: string;
  content: React.ReactNode;
}

interface PitchSlideDeckProps {
  slides: PitchSlide[];
}

const SLIDE_HEIGHT = 'calc(100vh - 4rem)';

export const PitchSlideDeck: React.FC<PitchSlideDeckProps> = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const total = slides.length;
  const isFirst = current === 0;
  const isLast = current === total - 1;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total || index === current || isAnimating) return;
      setIsAnimating(true);
      setCurrent(index);
      window.setTimeout(() => setIsAnimating(false), 700);
    },
    [current, isAnimating, total],
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(total - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, goTo, total]);

  return (
    <div className="relative bg-gray-950 overflow-hidden" style={{ height: SLIDE_HEIGHT }}>
      {/* Slides track */}
      <div
        className="flex flex-col transition-transform duration-700 ease-in-out will-change-transform"
        style={{ transform: `translateY(-${current * 100}%)`, height: SLIDE_HEIGHT }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="w-full flex-shrink-0 overflow-hidden"
            style={{ height: SLIDE_HEIGHT }}
          >
            {slide.content}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
        <div
          className="h-full bg-gradient-to-r from-landing-aqua to-landing-mango transition-all duration-700 ease-in-out"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Slide counter */}
      <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-xs font-medium tabular-nums">
        {current + 1} / {total}
      </div>

      {/* Dot indicators */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir a slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn(
              'w-2 rounded-full transition-all duration-300',
              i === current
                ? 'h-6 bg-landing-aqua'
                : 'h-2 bg-white/30 hover:bg-white/50',
            )}
          />
        ))}
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={isFirst || isAnimating}
          className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white disabled:opacity-30 h-10 w-10"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={isLast ? () => goTo(0) : goNext}
          disabled={isAnimating}
          className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white disabled:opacity-30 h-10 w-10"
          aria-label={isLast ? 'Volver al inicio' : 'Slide siguiente'}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Scroll hint on first slide */}
      {current === 0 && !isAnimating && (
        <button
          type="button"
          onClick={goNext}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-colors animate-bounce"
          aria-label="Siguiente slide"
        >
          <span className="text-xs font-medium">Desliza o presiona</span>
          <ChevronUp className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
};
