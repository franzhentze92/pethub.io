import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { landingFeatureGradients } from '@/lib/landingTheme';

interface DashboardStatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  footer?: string;
  trend?: string;
  gradientIndex?: number;
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  icon: Icon,
  value,
  label,
  footer,
  trend,
  gradientIndex = 0,
}) => {
  const gradient = landingFeatureGradients[gradientIndex % landingFeatureGradients.length];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <div className="flex items-center text-landing-mint-dark text-xs font-medium bg-landing-mint/10 px-2 py-1 rounded-full">
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
