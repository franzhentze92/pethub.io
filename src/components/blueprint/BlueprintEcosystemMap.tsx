import React from 'react';
import { cn } from '@/lib/utils';
import { BLUEPRINT_MASCOTS, type BlueprintDashboard } from '@/lib/blueprint/blueprintMascots';
import type { BlueprintSectionView } from '@/lib/blueprint/types';
import type { BlueprintConnectionStatus } from '@/lib/blueprint/clientSections';
import { getBlueprintMapNodePosition } from './blueprintMapLayout';
import { statusConfig } from './BlueprintWizardPanel';
import {
  blueprintNodeBorderClass,
  blueprintNodeIconClass,
  blueprintStatusStyles,
} from './blueprintStatusStyles';

interface BlueprintEcosystemMapProps {
  sections: BlueprintSectionView[];
  onSectionClick: (section: BlueprintSectionView) => void;
  summaryCategory?: string;
  summaryCategoryLabel?: string;
  mascotDashboard?: BlueprintDashboard;
}

const SPARKLE_SPOTS = [
  { left: '22%', top: '20%', delay: '0s' },
  { left: '78%', top: '24%', delay: '1.1s' },
  { left: '50%', top: '10%', delay: '2s' },
];

function categoryConnectedLabel(
  sections: BlueprintSectionView[],
  category: string,
  categoryLabel: string,
): string {
  const group = sections.filter((s) => s.category === category);
  if (!group.length) return categoryLabel;
  const connected = group.filter((s) => s.status === 'connected').length;
  const partial = group.filter((s) => s.status === 'partial').length;

  if (partial > 0) {
    return `${categoryLabel}: ${connected}/${group.length} conectados · ${partial} parcial`;
  }
  if (connected === 1) return `${categoryLabel}: ${connected}/${group.length} conectado`;
  return `${categoryLabel}: ${connected}/${group.length} conectados`;
}

function LegendItem({ status, label }: { status: BlueprintConnectionStatus; label: string }) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const styles = blueprintStatusStyles[status];

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md border',
          status === 'connected' && 'border-emerald-400 bg-emerald-50',
          status === 'partial' && 'border-amber-400 bg-amber-50',
          status === 'disconnected' && 'border-gray-300 bg-gray-100',
        )}
      >
        <StatusIcon className={cn('w-3 h-3', styles.badge)} />
      </span>
      {label}
    </span>
  );
}

export const BlueprintEcosystemMap: React.FC<BlueprintEcosystemMapProps> = ({
  sections,
  onSectionClick,
  summaryCategory = 'profile',
  summaryCategoryLabel = 'Perfil base',
  mascotDashboard = 'client',
}) => {
  const connectedCount = sections.filter((s) => s.status === 'connected').length;
  const mascot = BLUEPRINT_MASCOTS[mascotDashboard];

  return (
    <div
      data-blueprint-tour="map"
      className="relative overflow-visible rounded-2xl bg-white/85 backdrop-blur-sm border border-white/70 shadow-lg p-4 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-landing-aqua/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-landing-mint/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-4">
        <h3 className="font-bold text-gray-900">Mapa del ecosistema</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {categoryConnectedLabel(sections, summaryCategory, summaryCategoryLabel)}
        </p>
        {connectedCount > 0 && (
          <p className="text-xs font-medium text-emerald-600 mt-1">
            {connectedCount} de {sections.length} módulos activos
          </p>
        )}
      </div>

      <div className="relative mx-auto w-full max-w-md aspect-square px-3 sm:px-4 py-1">
        {SPARKLE_SPOTS.map((spot, i) => (
          <span
            key={i}
            className="pointer-events-none absolute z-10 h-1 w-1 rounded-full bg-landing-tropical/70 animate-blueprint-sparkle"
            style={{ left: spot.left, top: spot.top, animationDelay: spot.delay }}
            aria-hidden
          />
        ))}

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <linearGradient id="blueprintLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F0C8" />
              <stop offset="50%" stopColor="#38F9A0" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <radialGradient id="blueprintHubGrad">
              <stop offset="0%" stopColor="#00F0C8" />
              <stop offset="100%" stopColor="#38F9A0" />
            </radialGradient>
          </defs>

          {sections.map((section) => {
            const pos = getBlueprintMapNodePosition(section.id);
            const isActive = section.status !== 'disconnected';
            const lineColor =
              section.status === 'connected'
                ? 'url(#blueprintLineGrad)'
                : section.status === 'partial'
                  ? '#f59e0b'
                  : blueprintStatusStyles.disconnected.line;

            return (
              <line
                key={`line-${section.id}`}
                x1="50"
                y1="50"
                x2={pos.x}
                y2={pos.y}
                stroke={lineColor}
                strokeWidth={isActive ? '0.4' : '0.35'}
                strokeDasharray={section.status === 'disconnected' ? '1.5 1.5' : undefined}
                style={{
                  opacity: section.status === 'disconnected' ? 0.45 : section.status === 'connected' ? 0.65 : 0.55,
                }}
              />
            );
          })}

          <circle cx="50" cy="50" r="9" fill="url(#blueprintHubGrad)" opacity="0.55" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="#38F9A0" strokeWidth="0.2" opacity="0.25" />
        </svg>

        <div className="absolute inset-[30%] flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-landing-aqua/15 to-landing-mint/10 blur-lg" />
          <img
            src={mascot.image}
            alt={`${mascot.name} hub`}
            className="relative w-full h-full object-contain drop-shadow-lg"
          />
        </div>

        {sections.map((section, index) => {
          const pos = getBlueprintMapNodePosition(section.id);
          const config = statusConfig[section.status];
          const StatusIcon = config.icon;
          const styles = blueprintStatusStyles[section.status];

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionClick(section)}
              className="absolute z-20 opacity-0 animate-blueprint-node-in group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-aqua rounded-xl"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                animationDelay: `${0.15 + index * 0.07}s`,
              }}
              title={`${section.title} — ${config.label}`}
              aria-label={`${section.title}, ${config.label}`}
            >
              <div
                className={cn(
                  'relative flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200',
                  'group-hover:scale-105 group-active:scale-95',
                  section.status === 'connected' && 'animate-blueprint-float-soft',
                )}
                style={
                  section.status === 'connected'
                    ? { animationDelay: `${0.7 + index * 0.12}s` }
                    : undefined
                }
              >
                <div
                  className={cn(
                    'relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl',
                    blueprintNodeBorderClass(section.status),
                    section.status === 'connected' && 'animate-blueprint-connected-glow',
                    section.status === 'partial' && 'shadow-sm',
                  )}
                  style={
                    section.status === 'connected'
                      ? { animationDelay: `${index * 0.35}s` }
                      : undefined
                  }
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
                      blueprintNodeIconClass(section.status),
                    )}
                  >
                    <section.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <StatusIcon
                    className={cn(
                      'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white p-0.5 shadow-sm',
                      styles.badge,
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[8px] sm:text-[9px] font-semibold text-center leading-tight whitespace-nowrap',
                    styles.label,
                  )}
                >
                  {section.mapLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative flex flex-wrap justify-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
        <LegendItem status="connected" label="Conectado" />
        <LegendItem status="partial" label="Parcial" />
        <LegendItem status="disconnected" label="Pendiente" />
      </div>
    </div>
  );
};
