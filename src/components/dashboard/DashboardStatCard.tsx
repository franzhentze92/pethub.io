import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import {
  landingFeatureGradients,
  solidCardThemeAt,
  solidIconBgAt,
  solidTopBarAt,
} from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  footer?: string;
  trend?: string;
  gradientIndex?: number;
  variant?: 'default' | 'plain';
}

const trendBadgeClasses = [
  'text-landing-aqua-dark bg-landing-aqua/10',
  'text-landing-mint-dark bg-landing-mint/10',
  'text-landing-mango-dark bg-landing-mango/10',
  'text-landing-mango-dark bg-landing-tropical/25',
];

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  icon: Icon,
  value,
  label,
  footer,
  trend,
  gradientIndex = 0,
  variant = 'default',
}) => {
  const idx = gradientIndex % landingFeatureGradients.length;
  const gradient = landingFeatureGradients[idx];
  const isPlain = variant === 'plain';
  const theme = solidCardThemeAt(idx);
  const iconSolid = solidIconBgAt(idx);
  const topBar = solidTopBarAt(idx);
  const trendClass = trendBadgeClasses[idx % trendBadgeClasses.length];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5',
        isPlain
          ? cn('bg-white border shadow-sm hover:shadow-md', theme.border)
          : 'bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg hover:shadow-xl duration-300',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          isPlain ? topBar : topBar,
        )}
      />
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shadow-sm',
              isPlain ? iconSolid : iconSolid,
            )}
          >
            <Icon className={cn('w-5 h-5', isPlain && iconSolid.includes('text-gray-900') ? 'text-gray-900' : 'text-white')} />
          </div>
          {trend && (
            <div className={cn('flex items-center text-xs font-medium px-2 py-1 rounded-full', trendClass)}>
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              {trend}
            </div>
          )}
        </div>
        <div className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
        <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
        {footer && <div className="text-xs text-gray-500 mt-1.5">{footer}</div>}
      </div>
    </div>
  );
};
