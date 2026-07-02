import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BlueprintSectionView } from '@/lib/blueprint/types';
import { BLUEPRINT_CATEGORY_LABELS, type BlueprintSectionCategory } from '@/lib/blueprint/clientSections';
import { statusConfig } from './BlueprintWizardPanel';
import { blueprintNodeIconClass } from './blueprintStatusStyles';

interface BlueprintSectionListProps {
  sections: BlueprintSectionView[];
  onNavigate: (section: BlueprintSectionView) => void;
  categoryOrder?: string[];
  categoryLabels?: Record<string, string>;
}

const DEFAULT_CATEGORY_ORDER: BlueprintSectionCategory[] = ['profile', 'care', 'commerce', 'social'];

export const BlueprintSectionList: React.FC<BlueprintSectionListProps> = ({
  sections,
  onNavigate,
  categoryOrder = DEFAULT_CATEGORY_ORDER,
  categoryLabels = BLUEPRINT_CATEGORY_LABELS,
}) => {
  const grouped = categoryOrder.map((category) => ({
    category,
    label: categoryLabels[category] ?? category,
    items: sections.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div data-blueprint-tour="list" className="space-y-5">
      {grouped.map(({ category, label, items }) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</h3>
          <div className="space-y-2">
            {items.map((section) => {
              const config = statusConfig[section.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={section.id}
                  className="rounded-xl bg-white/85 backdrop-blur-sm border border-white/70 shadow-sm p-3 sm:p-4 flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
                      blueprintNodeIconClass(section.status),
                    )}
                  >
                    <section.icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 text-sm">{section.title}</h4>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.className}`}
                      >
                        <StatusIcon size={11} />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{section.description}</p>
                    {section.statLabel != null && (
                      <p className="text-xs text-gray-600 mt-1">
                        {section.statLabel}: <span className="font-medium">{section.statValue}</span>
                        {section.missingFields.length > 0 && section.status !== 'connected' && (
                          <span className="text-amber-700"> · Falta: {section.missingFields.slice(0, 2).join(', ')}</span>
                        )}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-landing-aqua-dark hover:text-landing-aqua-dark hover:bg-landing-aqua/10"
                    onClick={() => onNavigate(section)}
                  >
                    {section.status === 'connected' ? 'Ver' : 'Completar'}
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
