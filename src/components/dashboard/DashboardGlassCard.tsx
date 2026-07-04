import React from 'react';
import { LucideIcon } from 'lucide-react';
import { landingFeatureGradients, solidIconBgAt } from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

interface DashboardGlassCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  gradientIndex?: number;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'plain';
}

export const DashboardGlassCard: React.FC<DashboardGlassCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  gradientIndex = 0,
  children,
  className = '',
  headerAction,
  variant = 'default',
}) => {
  const gradient = landingFeatureGradients[gradientIndex % landingFeatureGradients.length];
  const isPlain = variant === 'plain';
  const iconSolid = solidIconBgAt(gradientIndex);

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        isPlain
          ? 'bg-white border border-gray-100 shadow-sm'
          : 'bg-white/75 backdrop-blur-md border border-white/60 shadow-lg',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-5 py-4 border-b',
          isPlain ? 'border-gray-100 bg-white' : 'border-gray-100/80 bg-gradient-to-r from-white/90 to-gray-50/50',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                isPlain ? iconSolid : iconSolid,
              )}
            >
              <Icon className={cn('w-5 h-5', isPlain && iconSolid.includes('text-gray-900') ? 'text-gray-900' : 'text-white')} />
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
