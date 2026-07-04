import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PhoneMockup } from '@/components/landing/PhoneMockup';
import { ROLE_VIDEO_CLIP_MS, roleVideos } from '@/data/roleVideoData';
import type { PublicRoleId } from '@/data/landingPlatformData';

interface RoleScreenshotCarouselProps {
  roleId: PublicRoleId;
  clipMs?: number;
  className?: string;
  /** Clase Tailwind del color activo en los indicadores (ej. bg-landing-aqua) */
  activeDotClass?: string;
}

export const RoleScreenshotCarousel: React.FC<RoleScreenshotCarouselProps> = ({
  roleId,
  clipMs = ROLE_VIDEO_CLIP_MS,
  className,
  activeDotClass = 'bg-landing-aqua',
}) => {
  const videos = roleVideos[roleId];
  const [current, setCurrent] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  useEffect(() => {
    setCurrent(0);
  }, [roleId]);

  useEffect(() => {
    if (videos.length === 0) return;

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i !== current) {
        video.pause();
        video.currentTime = 0;
      }
    });

    const active = videoRefs.current[current];
    if (!active) return;

    active.currentTime = 0;
    active.play().catch(() => {});

    const timer = window.setTimeout(goNext, clipMs);
    return () => window.clearTimeout(timer);
  }, [current, roleId, videos.length, clipMs, goNext]);

  if (videos.length === 0) return null;

  const roleLabel =
    roleId === 'client' ? 'Cliente' : roleId === 'provider' ? 'Proveedor' : 'Refugio';

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <PhoneMockup size="lg" aspectRatio="9/16">
        {videos.map((src, index) => (
          <video
            key={src}
            ref={(el) => { videoRefs.current[index] = el; }}
            src={src}
            muted
            playsInline
            preload={index <= current + 1 ? 'auto' : 'metadata'}
            aria-label={`PetHub ${roleLabel} — video ${index + 1}`}
            className={cn(
              'absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ease-in-out',
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0',
            )}
          />
        ))}
      </PhoneMockup>

      <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
        {videos.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Video ${index + 1} de ${videos.length}`}
            aria-current={index === current ? 'true' : undefined}
            onClick={() => goTo(index)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === current
                ? cn('w-5', activeDotClass)
                : 'w-1.5 bg-gray-300 hover:bg-gray-400',
            )}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 tabular-nums">
        {current + 1} / {videos.length}
      </p>
    </div>
  );
};
