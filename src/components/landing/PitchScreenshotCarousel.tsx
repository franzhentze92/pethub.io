import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { PhoneMockup } from '@/components/landing/PhoneMockup';

const INTERVAL_MS = 3500;

interface PitchScreenshotCarouselProps {
  images: string[];
  intervalMs?: number;
  className?: string;
}

export const PitchScreenshotCarousel: React.FC<PitchScreenshotCarouselProps> = ({
  images,
  intervalMs = INTERVAL_MS,
  className,
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <PhoneMockup size="lg">
        {images.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={`Captura ${index + 1}`}
            className={cn(
              'absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ease-in-out',
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0',
            )}
          />
        ))}

        <div className="absolute top-0 inset-x-0 z-20 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </PhoneMockup>

      <div className="flex justify-center gap-1.5">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Captura ${index + 1}`}
            onClick={() => setCurrent(index)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === current ? 'w-5 bg-landing-aqua' : 'w-1.5 bg-white/30 hover:bg-white/50',
            )}
          />
        ))}
      </div>
    </div>
  );
};
