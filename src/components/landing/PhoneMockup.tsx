import React from 'react';
import { cn } from '@/lib/utils';

interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-[200px]',
  md: 'w-[240px] sm:w-[260px]',
  lg: 'w-[260px] sm:w-[280px] lg:w-[300px]',
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  className,
  size = 'md',
}) => (
  <div className={cn('relative mx-auto select-none', sizeClasses[size], className)}>
    {/* Glow */}
    <div className="absolute -inset-6 bg-gradient-to-b from-landing-aqua/20 via-transparent to-landing-mango/10 rounded-full blur-3xl pointer-events-none" />

    {/* Titanium frame */}
    <div className="relative rounded-[2.75rem] p-[2px] bg-gradient-to-b from-gray-500 via-gray-700 to-gray-900 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)]">
      {/* Side buttons */}
      <div className="absolute -left-[2px] top-[22%] w-[3px] h-8 rounded-l-sm bg-gray-600" />
      <div className="absolute -left-[2px] top-[32%] w-[3px] h-12 rounded-l-sm bg-gray-600" />
      <div className="absolute -left-[2px] top-[44%] w-[3px] h-12 rounded-l-sm bg-gray-600" />
      <div className="absolute -right-[2px] top-[30%] w-[3px] h-16 rounded-r-sm bg-gray-600" />

      <div className="rounded-[2.65rem] p-[9px] bg-gradient-to-b from-gray-800 to-gray-950">
        {/* Screen bezel */}
        <div className="relative rounded-[2.1rem] overflow-hidden bg-black aspect-[9/19.5]">
          {/* Dynamic Island */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-30 w-[32%] max-w-[100px] h-[26px] bg-black rounded-full shadow-inner ring-1 ring-white/5" />

          {/* Screen content */}
          <div className="absolute inset-0">{children}</div>

          {/* Home indicator */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 z-30 w-[36%] h-[4px] bg-white/50 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);
