import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PhoneMockup } from '@/components/landing/PhoneMockup';

const INTERVAL_MS = 3000;

export const PITCH_VIDEO_SOURCES = Array.from({ length: 8 }, (_, i) => `/videos/${i + 1}.mp4`);

interface PitchVideoCarouselProps {
  videos?: string[];
  intervalMs?: number;
  className?: string;
}

export const PitchVideoCarousel: React.FC<PitchVideoCarouselProps> = ({
  videos = PITCH_VIDEO_SOURCES,
  intervalMs = INTERVAL_MS,
  className,
}) => {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % videos.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [videos.length, intervalMs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [current]);

  if (videos.length === 0) return null;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <PhoneMockup size="lg">
        {videos.map((src, index) => (
          <video
            key={src}
            ref={index === current ? videoRef : undefined}
            src={src}
            muted
            playsInline
            preload="auto"
            className={cn(
              'absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ease-in-out',
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0',
            )}
          />
        ))}

        <div className="absolute top-0 inset-x-0 z-20 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </PhoneMockup>

      <div className="flex justify-center gap-1.5">
        {videos.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Video ${index + 1}`}
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
