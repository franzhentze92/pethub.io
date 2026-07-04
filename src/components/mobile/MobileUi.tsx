import React from 'react';
import { cn } from '@/lib/utils';
import { type PlainPageAccent } from '@/lib/landingTheme';

interface MobileInfoRowProps {
  label: string;
  value: string;
  last?: boolean;
}

export const MobileInfoRow: React.FC<MobileInfoRowProps> = ({ label, value, last }) => (
  <div className={`flex flex-col gap-0.5 py-3 ${last ? '' : 'border-b border-gray-100'}`}>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-base text-gray-900 break-words">{value}</span>
  </div>
);

interface MobileSectionCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'plain';
}

export const MobileSectionCard: React.FC<MobileSectionCardProps> = ({
  children,
  className = '',
  variant = 'glass',
}) => (
  <div
    className={
      variant === 'plain'
        ? `rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden ${className}`
        : `rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden ${className}`
    }
  >
    {children}
  </div>
);

interface MobileFabProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  className?: string;
  variant?: 'gradient' | 'solid';
  accent?: PlainPageAccent;
  'data-blueprint-guided'?: string;
}

export const MobileFab: React.FC<MobileFabProps> = ({
  onClick,
  label,
  icon,
  className = '',
  variant = 'gradient',
  accent = 'aqua',
  'data-blueprint-guided': dataBlueprintGuided,
}) => {
  const solidClass =
    accent === 'tropical'
      ? 'bg-landing-tropical hover:bg-landing-tropical-dark text-gray-900'
      : accent === 'mango'
        ? 'bg-landing-mango hover:bg-landing-mango-dark text-gray-900'
        : accent === 'mint'
          ? 'bg-landing-mint hover:bg-landing-mint-dark text-gray-900'
          : 'bg-landing-aqua hover:bg-landing-aqua-dark text-white';

  return (
  <button
    type="button"
    onClick={onClick}
    data-blueprint-guided={dataBlueprintGuided}
    className={cn(
      'fixed right-4 z-[80] flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
      variant === 'solid'
        ? solidClass
        : 'bg-gradient-to-r from-landing-aqua to-landing-mint text-white',
      className,
    )}
    aria-label={label}
  >
    {icon}
    <span>{label}</span>
  </button>
  );
};
