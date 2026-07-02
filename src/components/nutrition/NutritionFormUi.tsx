import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { landingFeatureGradients } from '@/lib/landingTheme';

interface NutritionFormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function NutritionFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: NutritionFormSectionProps) {
  return (
    <section className={cn('rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3', className)}>
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {Icon && <Icon className="w-4 h-4 text-landing-aqua-dark shrink-0" />}
          {title}
        </h4>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface WeekDayPillsProps {
  days: { value: number; label: string }[];
  selected: number[];
  onToggle: (day: number) => void;
}

export function WeekDayPills({ days, selected, onToggle }: WeekDayPillsProps) {
  const allSelected = selected.length === days.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const active = selected.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onToggle(day.value)}
              className={cn(
                'min-h-[44px] min-w-[2.75rem] flex-1 max-w-[calc(25%-0.375rem)] rounded-xl text-xs font-semibold transition-all active:scale-95',
                active
                  ? `bg-gradient-to-r ${landingFeatureGradients[0]} text-white shadow-sm`
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-landing-aqua/40',
              )}
              aria-pressed={active}
            >
              {day.label.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        {allSelected ? 'Todos los días seleccionados' : `${selected.length} día${selected.length !== 1 ? 's' : ''} por semana`}
      </p>
    </div>
  );
}

interface SettingToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  children?: React.ReactNode;
}

export function SettingToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: SettingToggleRowProps) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label className="text-sm font-semibold text-gray-900">{label}</Label>
          {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
      </div>
      {children}
    </div>
  );
}

export const nutritionFieldClass = 'mt-1.5 min-h-[44px]';
