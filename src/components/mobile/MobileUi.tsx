import React from 'react';

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
}

export const MobileSectionCard: React.FC<MobileSectionCardProps> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

interface MobileFabProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  className?: string;
  'data-blueprint-guided'?: string;
}

export const MobileFab: React.FC<MobileFabProps> = ({
  onClick,
  label,
  icon,
  className = '',
  'data-blueprint-guided': dataBlueprintGuided,
}) => (
  <button
    type="button"
    onClick={onClick}
    data-blueprint-guided={dataBlueprintGuided}
    className={`fixed right-4 z-[80] flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-landing-aqua to-landing-mint text-white font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] ${className}`}
    aria-label={label}
  >
    {icon}
    <span>{label}</span>
  </button>
);
