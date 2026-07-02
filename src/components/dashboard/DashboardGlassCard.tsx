import React from 'react';
import { LucideIcon } from 'lucide-react';
import { landingFeatureGradients } from '@/lib/landingTheme';

interface DashboardGlassCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  gradientIndex?: number;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const DashboardGlassCard: React.FC<DashboardGlassCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  gradientIndex = 0,
  children,
  className = '',
  headerAction,
}) => {
  const gradient = landingFeatureGradients[gradientIndex % landingFeatureGradients.length];

  return (
    <div className={`rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100/80 bg-gradient-to-r from-white/90 to-gray-50/50">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base md:text-lg truncate">{title}</h3>
            {subtitle && <p className="text-xs md:text-sm text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {headerAction}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
};
