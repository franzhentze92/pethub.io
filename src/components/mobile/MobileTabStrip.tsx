import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
  landingFeatureGradients,
  solidIconBgAt,
  plainPageAccentTabActive,
  plainPageAccentTabInactiveHover,
  type PlainPageAccent,
} from '@/lib/landingTheme';
import { cn } from '@/lib/utils';

export interface MobileTabItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  gradientIndex?: number;
}

interface MobileTabStripProps {
  tabs: MobileTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  columns?: 2 | 3;
  /** grid = 2–3 columnas; scroll = fila horizontal; rowSizes = filas personalizadas (ej. [3, 2]) */
  layout?: 'grid' | 'scroll';
  /** Divide tabs en filas: [3, 2] = 3 arriba y 2 abajo */
  rowSizes?: number[];
  variant?: 'gradient' | 'solid';
  accent?: PlainPageAccent;
}

const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export const MobileTabStrip: React.FC<MobileTabStripProps> = ({
  tabs,
  activeTab,
  onChange,
  columns = 2,
  layout = 'grid',
  rowSizes,
  variant = 'gradient',
  accent = 'aqua',
}) => {
  const renderTabButton = (tab: MobileTabItem, compact?: boolean) => {
    const active = activeTab === tab.id;
    const solidBg = solidIconBgAt(tab.gradientIndex ?? 0);
    const Icon = tab.icon;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-200 min-h-[44px]',
          layout === 'scroll'
            ? 'flex-shrink-0 snap-start px-3.5 text-xs sm:text-sm min-w-[max-content]'
            : cn('w-full px-2 sm:px-3', compact || columns === 3 ? 'text-xs sm:text-sm' : 'text-sm'),
          active
            ? variant === 'solid'
              ? plainPageAccentTabActive[accent]
              : `${solidBg} shadow-md`
            : cn(
                'bg-white text-gray-600 border border-gray-200',
                variant === 'solid'
                  ? plainPageAccentTabInactiveHover[accent]
                  : 'hover:border-landing-aqua/40 hover:text-landing-aqua-dark',
              ),
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="truncate">{tab.shortLabel ?? tab.label}</span>
      </button>
    );
  };

  if (rowSizes?.length) {
    const rows: MobileTabItem[][] = [];
    let offset = 0;
    for (const size of rowSizes) {
      rows.push(tabs.slice(offset, offset + size));
      offset += size;
    }
    if (offset < tabs.length) {
      rows.push(tabs.slice(offset));
    }

    return (
      <div className="space-y-2 w-full">
        {rows.map((rowTabs, rowIndex) => (
          <div
            key={rowIndex}
            className={cn('grid w-full gap-2', gridColsClass[rowTabs.length] ?? 'grid-cols-2')}
          >
            {rowTabs.map((tab) => renderTabButton(tab, rowTabs.length >= 3))}
          </div>
        ))}
      </div>
    );
  }

  const containerClass =
    layout === 'scroll'
      ? 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      : cn('grid w-full gap-2', columns === 3 ? 'grid-cols-3' : 'grid-cols-2');

  return (
    <div className={containerClass}>
      {tabs.map((tab) => renderTabButton(tab))}
    </div>
  );
};
