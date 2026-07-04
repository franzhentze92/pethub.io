import React from 'react';
import { marqueeModules } from '@/data/landingPlatformData';

const titleTextColors = ['text-landing-aqua-dark', 'text-landing-mint-dark', 'text-landing-mango-dark'] as const;

export const LiveStatsMarquee: React.FC = () => {
  const items = [...marqueeModules, ...marqueeModules];

  return (
    <section className="relative py-3.5 bg-gray-900 border-y border-landing-aqua/20 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-16 md:w-24 bg-gray-900/80 z-10" />
      <div className="absolute inset-y-0 right-0 w-16 md:w-24 bg-gray-900/80 z-10" />

      <div className="flex animate-marquee whitespace-nowrap will-change-transform items-center">
        {items.map((mod, i) => (
          <div key={`${mod.title}-${i}`} className="flex items-center gap-2.5 mx-5 md:mx-8 shrink-0">
            <div className={`w-8 h-8 rounded-lg ${mod.gradient} flex items-center justify-center shadow-sm`}>
              <mod.icon className="w-4 h-4 text-white" />
            </div>
            <span className={`text-sm md:text-base font-semibold ${titleTextColors[i % titleTextColors.length]}`}>
              {mod.title}
            </span>
            {mod.tag && (
              <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium hidden sm:inline">
                {mod.tag}
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-landing-aqua/30 ml-1" />
          </div>
        ))}
      </div>
    </section>
  );
};
