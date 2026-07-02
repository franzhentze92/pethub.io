import React from 'react';
import { cn } from '@/lib/utils';

interface BrowserFrameProps {
  url: string;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  children,
  className,
  maxHeight = '420px',
}) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden shadow-2xl border border-gray-200/80 bg-white ring-1 ring-black/5',
      className,
    )}
  >
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex gap-1.5 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
      </div>
      <div className="flex-1 min-w-0 mx-1">
        <div className="bg-gray-800 rounded-md px-3 py-1 text-[10px] md:text-xs text-gray-400 text-center font-mono truncate">
          {url}
        </div>
      </div>
      <div className="w-12 shrink-0 hidden sm:block" />
    </div>
    <div
      className="relative overflow-y-auto bg-gradient-to-br from-landing-aqua/5 via-white to-landing-mint/5"
      style={{ maxHeight }}
    >
      {children}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
    </div>
  </div>
);
