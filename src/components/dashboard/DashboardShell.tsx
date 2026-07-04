import React from 'react';
import { LandingAmbientBackground } from '@/components/landing/LandingAmbientBackground';
import { LandingPetDecorations } from '@/components/landing/LandingPetDecorations';

interface DashboardShellProps {
  children: React.ReactNode;
  variant?: 'default' | 'plain';
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children, variant = 'default' }) => {
  if (variant === 'plain') {
    return (
      <div className="relative min-h-full overflow-x-hidden bg-white">
        <div
          className="relative z-10 px-4 sm:px-6 pt-6 sm:pt-7 space-y-6 overflow-x-hidden"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-x-hidden">
      <LandingAmbientBackground variant="section" />
      <LandingPetDecorations preset="app" />
      <div
        className="relative z-10 px-4 sm:px-6 pt-6 sm:pt-7 space-y-6 overflow-x-hidden"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </div>
  );
};
